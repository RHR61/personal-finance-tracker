# Personal Finance Tracker

Full-stack personal finance tracker built with React, FastAPI, PostgreSQL, and Chart.js.

## Current Phase

Phase 2 adds PostgreSQL through Docker Compose and Alembic migrations for the users and transactions tables.

## Backend Setup

Start the PostgreSQL database:

```bash
docker compose up -d
```

Copy `backend/.env.example` to `backend/.env` and adjust the connection string if needed.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`.

Interactive API docs are available at `http://127.0.0.1:8000/docs`.

## Database

The local database runs in Docker with these defaults:

- Database: `finance_tracker`
- User: `postgres`
- Password: `postgres`
- Port: `5432`
- URL: `postgresql+psycopg://postgres:postgres@localhost:5432/finance_tracker`

Alembic manages database tables. Use this command after model or migration changes:

```bash
cd backend
alembic upgrade head
```

## API Endpoints

- `GET /health`
- `POST /transactions`
- `GET /transactions`
- `GET /transactions/{transaction_id}`
- `PATCH /transactions/{transaction_id}`
- `DELETE /transactions/{transaction_id}`
- `GET /dashboard/summary`

## Example Transaction

```json
{
  "user_id": 1,
  "amount": 15,
  "category": "Food",
  "description": "Lunch",
  "date": "2026-06-15",
  "type": "expense"
}
```

## Roadmap

1. FastAPI backend
2. PostgreSQL database
3. React frontend
4. Charts and dashboard
5. Authentication
6. Deployment
