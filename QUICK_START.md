# Quick Start Guide - Create User

## The Problem: Connection Timeout

If you're getting "Connection terminated due to connection timeout", it means:

1. **Backend is NOT running** - OR -
2. **Database connection is slow/failing**

## Quick Fix Steps

### Step 1: Verify Backend is Running

Open PowerShell and run:
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/health"
```

**Expected:** `{"status":"ok","message":"DairySense API is running"}`

**If you get an error:**
```powershell
# Start backend in a NEW terminal
cd backend
npm run dev
```

**Wait until you see:**
```
✅ Connected to PostgreSQL database
✅ Database schema initialized
🚀 Server running on http://localhost:3001
```

### Step 2: Create User (Easiest Method - Browser)

1. Open browser
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Paste this code and press Enter:

```javascript
fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@dairy.com', password: 'admin123' })
})
.then(r => r.json())
.then(data => console.log('✅ Success:', data))
.catch(err => console.error('❌ Error:', err));
```

5. You should see: `✅ Success: {message: "User registered successfully", user: {...}}`

### Step 3: Alternative - Use the Script

I've created a script for you. Run:

```powershell
.\create-user.ps1
```

It will:
- Check if backend is running
- Ask for email and password
- Create the user
- Show success/error messages

### Step 4: Login

1. Go to http://localhost:5173
2. Login with the email and password you just created

## Still Getting Timeout?

If backend is running but still timing out:

1. **Check database connection:**
   - Open `backend/.env`
   - Verify `DATABASE_URL` is correct
   - Make sure password doesn't have unencoded special characters

2. **Check Supabase:**
   - Go to https://app.supabase.com/
   - Make sure your project is active
   - Check if database is accessible

3. **Try health check:**
   ```powershell
   # Should work instantly
   Invoke-RestMethod -Uri "http://localhost:3001/health"
   ```

4. **Check backend logs** for database connection errors

## Common Errors & Solutions

| Error | Solution |
|-------|----------|
| "Connection terminated due to connection timeout" | Backend not running - start it with `npm run dev` in backend folder |
| "User with this email already exists" | User already created - just login! |
| "Database configuration missing" | Create `backend/.env` file with `DATABASE_URL` |
| "Failed to start server" | Check database connection string in `.env` |

