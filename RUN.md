# How to Run the Project

## Quick Start (3 Steps)

### Step 1: Database Setup (One-time)

1. Go to https://app.supabase.com/ and create a free account
2. Create a new project (note down the database password you choose!)
3. Go to **Settings → Database → Connection string**
4. Copy the **URI** connection string (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@...`)
5. Replace `[YOUR-PASSWORD]` with your actual password

### Step 2: Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` file:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
JWT_SECRET=any-random-string-here
FRONTEND_URL=http://localhost:5173
```

**Important:** 
- Replace `YOUR_PASSWORD` with your actual Supabase password
- If password has special characters, URL-encode them (`@` → `%40`, `#` → `%23`, etc.)

Start backend:
```bash
npm run dev
```

You should see:
```
✅ Connected to PostgreSQL database
✅ Database schema initialized
🚀 Server running on http://localhost:3001
```

### Step 3: Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Step 4: Create User (One-time)

You need to create your first user. Use any method:

**Method 1: PowerShell**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"admin@dairy.com","password":"admin123"}'
```

**Method 2: Browser Console**
Open browser console (F12) and run:
```javascript
fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@dairy.com', password: 'admin123' })
}).then(r => r.json()).then(console.log)
```

**Method 3: Postman/Thunder Client**
- POST `http://localhost:3001/api/auth/register`
- Body: `{ "email": "admin@dairy.com", "password": "admin123" }`

Then login with those credentials!

## Daily Usage

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Troubleshooting

**"client password must be a string" error:**
- Check your `.env` file exists in `backend/` folder
- Make sure `DATABASE_URL` has actual password (not `[YOUR-PASSWORD]`)
- No quotes around the connection string

**Database connection fails:**
- Verify Supabase project is active
- Check connection string format
- URL-encode special characters in password

**Frontend can't connect:**
- Make sure backend is running on port 3001
- Check browser console for errors
- Verify backend is accessible: http://localhost:3001/health

