# Personal Finance Tracker

Full-stack personal finance tracker built with React, FastAPI, PostgreSQL, and Chart.js.

## Current Phase

Phase 5.5 adds account registration, login, JWT authentication, user-scoped transactions, and Plaid Sandbox bank connections.

## Backend Setup

Start the PostgreSQL database:

```bash
docker compose up -d
```

Copy `backend/.env.example` to `backend/.env` and adjust the connection string if needed.

For Plaid Sandbox bank connections, add your Plaid Sandbox keys to `backend/.env`:

```bash
PLAID_ENV=sandbox
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-sandbox-secret
```

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
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /bank/link-token`
- `POST /bank/exchange`
- `POST /bank/sync`
- `GET /bank/connections`
- `POST /transactions`
- `GET /transactions`
- `GET /transactions/{transaction_id}`
- `PATCH /transactions/{transaction_id}`
- `DELETE /transactions/{transaction_id}`
- `GET /dashboard/summary`

Transaction and dashboard endpoints require a bearer token after login.
Bank endpoints also require a bearer token and use Plaid Sandbox credentials.

## Frontend Setup

Install Node.js LTS if `node` or `npm` is not recognized in PowerShell.

Keep the backend running at `http://127.0.0.1:8000`, then start the React app in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

To point the frontend at a different API URL, create `frontend/.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

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
6. Bank connections
7. Deployment
