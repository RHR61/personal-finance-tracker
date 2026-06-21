const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const { token, ...fetchOptions } = options;

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
      },
      ...fetchOptions,
    });
  } catch (error) {
    throw new Error("Could not reach the API server. Make sure FastAPI is running.");
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await response.json();
      if (Array.isArray(body.detail)) {
        message = body.detail.map((item) => item.msg).join(", ");
      } else if (body.detail) {
        message = body.detail;
      }
    } else {
      message = (await response.text()) || message;
    }

    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getTransactions(filters = {}) {
  const { token, ...activeFilters } = filters;
  const params = new URLSearchParams();

  if (activeFilters.category) params.set("category", activeFilters.category);
  if (activeFilters.type) params.set("type", activeFilters.type);
  if (activeFilters.startDate) params.set("start_date", activeFilters.startDate);
  if (activeFilters.endDate) params.set("end_date", activeFilters.endDate);

  const query = params.toString();
  return request(`/transactions${query ? `?${query}` : ""}`, { token });
}

export function createTransaction(transaction, token) {
  return request("/transactions", {
    method: "POST",
    token,
    body: JSON.stringify(transaction),
  });
}

export function deleteTransaction(id, token) {
  return request(`/transactions/${id}`, {
    method: "DELETE",
    token,
  });
}

export function getDashboardSummary(token) {
  return request("/dashboard/summary", { token });
}

export function registerUser(user) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(user),
  });
}

export function loginUser(credentials) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function getCurrentUser(token) {
  return request("/auth/me", { token });
}
