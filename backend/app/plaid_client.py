import os
from typing import Any

import httpx
from fastapi import HTTPException, status


PLAID_BASE_URLS = {
    "sandbox": "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production": "https://production.plaid.com",
}


def get_plaid_base_url() -> str:
    environment = os.getenv("PLAID_ENV", "sandbox").lower()
    return PLAID_BASE_URLS.get(environment, PLAID_BASE_URLS["sandbox"])


def get_plaid_credentials() -> tuple[str, str]:
    client_id = os.getenv("PLAID_CLIENT_ID")
    secret = os.getenv("PLAID_SECRET")

    if not client_id or not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Plaid is not configured yet. Add PLAID_CLIENT_ID and PLAID_SECRET to backend/.env.",
        )

    return client_id, secret


def plaid_request(endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
    client_id, secret = get_plaid_credentials()
    request_payload = {
        "client_id": client_id,
        "secret": secret,
        **payload,
    }

    try:
        response = httpx.post(
            f"{get_plaid_base_url()}{endpoint}",
            json=request_payload,
            timeout=30,
        )
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not reach Plaid: {error}",
        ) from error

    if response.status_code >= 400:
        try:
            error_body = response.json()
        except ValueError:
            error_body = {}

        message = error_body.get("error_message") or error_body.get("display_message")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=message or "Plaid rejected the request.",
        )

    return response.json()
