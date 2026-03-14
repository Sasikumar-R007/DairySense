# Render PostgreSQL Setup

This project is now configured to use standard PostgreSQL instead of a Supabase-specific setup.

## What changed

- The backend accepts generic `DATABASE_URL` or `DB_*` settings.
- SSL is controlled explicitly with `DB_SSL` and `DB_SSL_REJECT_UNAUTHORIZED`.
- A repo-root [render.yaml](C:/Users/sasir/OneDrive/Documents/Sasikumar%20R/Dairy%20Sense%20NEW/render.yaml) blueprint can create:
  - a Render Postgres database
  - a Render web service for the backend

## Recommended deployment path

### 1. Push this repository to GitHub

Render needs the code in a Git repository.

### 2. Create the backend and database from the blueprint

In Render:

1. Open the dashboard
2. Click `New +`
3. Click `Blueprint`
4. Select this repository
5. Render will detect [render.yaml](C:/Users/sasir/OneDrive/Documents/Sasikumar%20R/Dairy%20Sense%20NEW/render.yaml)

The blueprint provisions:

- Postgres database: `dairysense-db`
- Web service: `dairysense-api`

### 3. Set the remaining backend environment variables

The blueprint already wires `DATABASE_URL` from the Render Postgres instance and generates `JWT_SECRET`.

Add or confirm these in the Render web service:

```env
NODE_ENV=production
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=false
FRONTEND_URL=https://your-frontend-url.vercel.app
```

Notes:

- `DB_SSL=false` is correct for Render internal Postgres connections.
- If you later connect from outside Render using an external Postgres URL, you may need `DB_SSL=true`.

### 4. Deploy the frontend

Deploy the `frontend` folder to Vercel and set:

```env
VITE_API_URL=https://your-backend-url.onrender.com/api
```

Then update backend `FRONTEND_URL` in Render to your real Vercel domain.

### 5. Verify backend startup

Open:

```text
https://your-backend-url.onrender.com/health
```

Expected response:

```json
{"status":"ok","message":"DairySense API is running"}
```

### 6. Create the first user

```powershell
$body = @{
  email = "admin@example.com"
  password = "ChangeThisPassword123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://your-backend-url.onrender.com/api/auth/register" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

## Local development against Render Postgres

If you want to run locally while using the Render Postgres database, set `backend/.env` like this:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://...your-render-external-database-url...
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=local-dev-secret
FRONTEND_URL=http://localhost:5173
```

Then run:

```bash
cd backend
npm install
npm run dev
```

and in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

## Manual Render setup without blueprint

If you do not want to use the blueprint:

1. Create a new `PostgreSQL` service in Render
2. Create a new `Web Service`
3. Set the web service root directory to `backend`
4. Use:
   - Build command: `npm install`
   - Start command: `npm start`
5. Add env vars:

```env
NODE_ENV=production
DATABASE_URL=<Render database connection string>
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=<generate a strong random value>
FRONTEND_URL=https://your-frontend-url.vercel.app
```
