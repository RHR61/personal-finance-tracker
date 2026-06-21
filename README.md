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

## Plaid Sandbox Testing

Plaid Sandbox requires real Sandbox API keys in `backend/.env`, but the bank login inside Plaid Link uses fake test credentials.

After logging into the app, click **Connect bank** and choose **Continue without phone number** if Plaid asks for a phone number.

Use this test login for a basic sandbox bank connection:

```text
Username: user_good
Password: pass_good
```

Use this test login for richer transaction data:

```text
Username: user_transactions_dynamic
Password: any non-empty password
```

Expected behavior after linking:

- The bank connection panel shows the connected institution.
- Imported transactions appear in transaction history.
- The dashboard source selector can switch between all accounts, standalone transactions, and individual Plaid accounts.
- **Sync now** imports new Plaid transaction updates.
- **Disconnect** removes imported transactions for that bank while keeping standalone transactions.
- **Reset standalone** removes manually added standalone transactions while keeping connected bank data.

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

## Deployment

Recommended deployment split:

- Backend API: Render Web Service
- Database: Render PostgreSQL
- Frontend: Vercel

### Render Backend

Create a PostgreSQL database on Render first, then create a Render Web Service from this GitHub repo.

Use these settings:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: bash start.sh
```

Render provides a `PORT` environment variable automatically. The `backend/start.sh` script runs Alembic migrations and then starts Uvicorn on that port.

Add these environment variables to the Render backend service:

```text
DATABASE_URL=<Render PostgreSQL internal database URL>
SECRET_KEY=<long random secret string>
FRONTEND_ORIGINS=<your Vercel frontend URL>
PLAID_ENV=sandbox
PLAID_CLIENT_ID=<Plaid client ID>
PLAID_SECRET=<Plaid sandbox secret>
```

For local development, `FRONTEND_ORIGINS` can include multiple comma-separated URLs:

```text
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

For deployment, use the deployed frontend origin, for example:

```text
FRONTEND_ORIGINS=https://your-app.vercel.app
```

### Vercel Frontend

Create a Vercel project from this GitHub repo.

Use these settings:

```text
Root Directory: frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Add this environment variable to the Vercel project:

```text
VITE_API_BASE_URL=<your Render backend URL>
```

Example:

```text
VITE_API_BASE_URL=https://your-api.onrender.com
```

After Vercel deploys, copy the Vercel URL into the Render backend `FRONTEND_ORIGINS` environment variable and redeploy the backend.

### Deployment Order

1. Push the latest code to GitHub.
2. Create the Render PostgreSQL database.
3. Create and deploy the Render backend.
4. Create and deploy the Vercel frontend.
5. Update Render `FRONTEND_ORIGINS` with the Vercel URL.
6. Update Vercel `VITE_API_BASE_URL` with the Render backend URL.
7. Test register, login, manual transactions, dashboard loading, and Plaid Sandbox linking.

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
