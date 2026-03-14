# How to Run the Project

## Quick Start

### Step 1: Create a PostgreSQL database

Use any PostgreSQL database:

- local PostgreSQL
- Render Postgres
- Neon / Supabase / RDS / other managed PostgreSQL

You need either:

```env
DATABASE_URL=postgresql://user:password@host:port/database
```

or:

```env
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=dairysense
DB_USER=your-postgres-user
DB_PASSWORD=your-postgres-password
```

If your provider requires SSL, also set:

```env
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

### Step 2: Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/dairysense
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=any-random-string-here
FRONTEND_URL=http://localhost:5173
```

Start backend:

```bash
npm run dev
```

Verify:

- API: `http://localhost:3001/health`

### Step 3: Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Optional `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

Open `http://localhost:5173`

### Step 4: Create First User

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"admin@dairy.com","password":"admin123"}'
```

## Daily Usage

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

## Render Postgres

If you want Render to create the database and connect the backend automatically, use the repo-root [render.yaml](C:/Users/sasir/OneDrive/Documents/Sasikumar%20R/Dairy%20Sense%20NEW/render.yaml) blueprint and follow [RENDER_POSTGRES_SETUP.md](C:/Users/sasir/OneDrive/Documents/Sasikumar%20R/Dairy%20Sense%20NEW/RENDER_POSTGRES_SETUP.md).

## Troubleshooting

**Database connection fails**

- Check `DATABASE_URL` or the separate `DB_*` variables
- URL-encode special characters in the password when using `DATABASE_URL`
- Set `DB_SSL=true` for providers that require SSL

**Frontend can't connect**

- Make sure backend is running on port `3001`
- Check `VITE_API_URL`
- Verify `http://localhost:3001/health`
