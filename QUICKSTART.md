# Quick Start Guide

## Step 1: Set Up Supabase Database

1. Go to https://app.supabase.com/
2. Create a new project
3. Go to **Settings → Database**
4. Copy the **Connection string** (URI format)
   - Example: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

## Step 2: Set Up Backend

```bash
cd backend
npm install
```

Create `backend/.env` file:
```env
PORT=3001
DATABASE_URL=postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres
JWT_SECRET=your-secret-key-change-this-in-production
FRONTEND_URL=http://localhost:5173
```

Start backend:
```bash
npm run dev
```

You should see: `✅ Connected to PostgreSQL database` and `🚀 Server running on http://localhost:3001`

## Step 3: Create First User

Open a new terminal and run:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"admin123\"}"
```

Or use Postman/Thunder Client:
- POST `http://localhost:3001/api/auth/register`
- Body: `{ "email": "admin@example.com", "password": "admin123" }`

## Step 4: Set Up Frontend

```bash
# From project root (not backend folder)
npm install
```

(Optional) Create `.env` file in project root:
```env
VITE_API_URL=http://localhost:3001/api
```

Start frontend:
```bash
npm run dev
```

## Step 5: Login and Use

1. Open http://localhost:5173
2. Login with the credentials you created
3. Start using the system!

## Troubleshooting

**Backend won't connect to database:**
- Check your `DATABASE_URL` is correct
- Make sure Supabase project is active
- Verify password is URL-encoded if it contains special characters

**Frontend can't connect to backend:**
- Make sure backend is running on port 3001
- Check `VITE_API_URL` in frontend `.env` (or default is `http://localhost:3001/api`)
- Check browser console for CORS errors

**Authentication errors:**
- Make sure JWT_SECRET is set in backend `.env`
- Clear browser localStorage and login again

