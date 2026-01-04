# Complete Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account (free tier is fine)

## Step-by-Step Setup

### Step 1: Database Setup (Supabase)

1. **Create Supabase Account & Project**
   - Go to https://app.supabase.com/
   - Sign up (free)
   - Click "New Project"
   - Fill in:
     - Project name: `dairy-sense` (or any name)
     - Database password: **Choose a strong password and save it!**
     - Region: Choose closest to you
   - Wait ~2 minutes for project to be created

2. **Get Connection String**
   - Once project is ready, go to **Settings** (gear icon) → **Database**
   - Scroll down to **Connection string**
   - Select **URI** tab
   - You'll see: `postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - **Important:** Replace `[YOUR-PASSWORD]` with the password you set during project creation
   - Copy the full connection string

3. **Password URL Encoding** (if password has special characters)
   - If your password contains special characters, URL-encode them:
     - `@` → `%40`
     - `#` → `%23`
     - `$` → `%24`
     - `%` → `%25`
     - `&` → `%26`
     - `+` → `%2B`
     - `=` → `%3D`
   - Example: Password `MyP@ss#123` becomes `MyP%40ss%23123` in URL

4. **That's it!** The backend will automatically create all tables on first run.

### Step 2: Backend Setup

1. **Navigate to backend folder**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create .env file**
   - Copy `env.example` to `.env`:
     ```bash
     # On Windows (PowerShell)
     Copy-Item env.example .env
     
     # On Mac/Linux
     cp env.example .env
     ```
   - Or create `.env` file manually in `backend/` folder

4. **Edit .env file**
   ```env
   PORT=3001
   NODE_ENV=development
   
   # Paste your Supabase connection string here (with actual password)
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   
   # Generate a random secret (for production, use a strong random string)
   JWT_SECRET=my-secret-key-change-in-production-12345
   
   # Frontend URL
   FRONTEND_URL=http://localhost:5173
   ```

5. **Start backend**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   ✅ Connected to PostgreSQL database
   ✅ Database schema initialized
   🚀 Server running on http://localhost:3001
   📊 Health check: http://localhost:3001/health
   ```

6. **Test backend** (optional)
   - Open browser: http://localhost:3001/health
   - Should see: `{"status":"ok","message":"DairySense API is running"}`

### Step 3: Frontend Setup

1. **Navigate to frontend folder**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create .env file** (optional, has defaults)
   - Create `.env` file in `frontend/` folder:
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

4. **Start frontend**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   VITE v5.x.x  ready in xxx ms

   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ```

### Step 4: Create First User

The app needs at least one user to login. Create one via API:

**Option A: Using curl**
```bash
curl -X POST http://localhost:3001/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@dairy.com\",\"password\":\"admin123\"}"
```

**Option B: Using PowerShell**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"admin@dairy.com","password":"admin123"}'
```

**Option C: Using Postman/Thunder Client**
- Method: `POST`
- URL: `http://localhost:3001/api/auth/register`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
  ```json
  {
    "email": "admin@dairy.com",
    "password": "admin123"
  }
  ```

**Option D: Using Browser Console**
```javascript
fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@dairy.com', password: 'admin123' })
})
.then(r => r.json())
.then(console.log)
```

### Step 5: Login and Use

1. Open http://localhost:5173
2. Login with the credentials you just created
3. Start using the system!

## Running Both Services

You need **two terminals**:

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

## Common Issues

### Issue: "client password must be a string"
**Solution:** Your `.env` file is missing or `DATABASE_URL` is incorrect. Make sure:
- `.env` file exists in `backend/` folder
- `DATABASE_URL` has the correct format with actual password
- No quotes around the connection string in `.env`

### Issue: "Connection refused" or can't connect to database
**Solution:**
- Verify Supabase project is active
- Check connection string is correct
- Make sure password is URL-encoded if it has special characters
- Try using the "Connection pooling" connection string from Supabase (port 6543)

### Issue: Frontend shows "Failed to fetch"
**Solution:**
- Make sure backend is running
- Check backend URL in frontend `.env` file
- Open browser console to see exact error
- Check CORS settings in backend

### Issue: "Database schema initialization failed"
**Solution:**
- Check database permissions
- Verify connection string has correct password
- Check Supabase project status

## Next Steps

Once everything is running:
1. Create more users via API
2. Start recording feed and milk data
3. Explore the dashboard
4. Customize as needed!

