# How to Create Your First User

## Step 1: Make Sure Backend is Running

**First, check if backend is running:**

Open a new terminal and check:

```powershell
# Test if backend is responding
Invoke-RestMethod -Uri "http://localhost:3001/health"
```

**If you get an error**, the backend is NOT running. Start it:

```powershell
cd backend
npm run dev
```

You should see:

```
✅ Connected to PostgreSQL database
✅ Database schema initialized
🚀 Server running on http://localhost:3001
```

**Wait for these messages before proceeding!**

## Step 2: Create User (Multiple Methods)

### Method 1: PowerShell (Recommended)

**Open a NEW PowerShell window** (keep backend running in the first one):

```powershell
$body = @{
    email = "admin@dairy.com"
    password = "admin123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

**Expected response:**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "admin@dairy.com",
    "created_at": "..."
  }
}
```

### Method 2: Browser Console (Easiest)

1. Open http://localhost:3001/health in browser (should show: `{"status":"ok","message":"DairySense API is running"}`)
2. Open Browser Developer Tools (Press F12)
3. Go to Console tab
4. Paste this code:

```javascript
fetch("http://localhost:3001/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@dairy.com", password: "admin123" }),
})
  .then((r) => r.json())
  .then((data) => {
    console.log("Success:", data);
    alert("User created! You can now login.");
  })
  .catch((err) => {
    console.error("Error:", err);
    alert("Error: " + err.message);
  });
```

5. Press Enter

### Method 3: Using curl (if installed)

```bash
curl -X POST http://localhost:3001/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@dairy.com\",\"password\":\"admin123\"}"
```

### Method 4: Using Postman/Thunder Client (VS Code Extension)

1. **Postman:**

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

2. **Thunder Client (VS Code Extension):**
   - New Request → POST
   - URL: `http://localhost:3001/api/auth/register`
   - Body → JSON:
     ```json
     {
       "email": "admin@dairy.com",
       "password": "admin123"
     }
     ```

## Troubleshooting

### Error: "Connection terminated due to connection timeout"

**Cause:** Backend is not running or database connection is failing

**Solutions:**

1. ✅ Check if backend is running:

   ```powershell
   # Should return: {"status":"ok","message":"DairySense API is running"}
   Invoke-RestMethod -Uri "http://localhost:3001/health"
   ```

2. ✅ If backend is not running:

   ```powershell
   cd backend
   npm run dev
   ```

   Wait for: `🚀 Server running on http://localhost:3001`

3. ✅ If backend fails to start, check database connection:
   - Verify `.env` file exists in `backend/` folder
   - Check `DATABASE_URL` is correct
   - Make sure Supabase project is active

### Error: "User with this email already exists"

**Solution:** User already exists. Just login with those credentials!

### Error: "Email and password are required"

**Solution:** Make sure your JSON body has both `email` and `password` fields.

## After Creating User

1. Go to http://localhost:5173 (frontend)
2. Login with:
   - Email: `admin@dairy.com`
   - Password: `admin123`

## Quick Test Script

Save this as `create-user.ps1` and run it:

```powershell
# Test backend health
Write-Host "Testing backend..."
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health"
    Write-Host "✅ Backend is running: $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is NOT running. Please start it first:" -ForegroundColor Red
    Write-Host "   cd backend" -ForegroundColor Yellow
    Write-Host "   npm run dev" -ForegroundColor Yellow
    exit
}

# Create user
Write-Host "`nCreating user..."
$body = @{
    email = "admin@dairy.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    Write-Host "✅ User created successfully!" -ForegroundColor Green
    Write-Host "   Email: $($result.user.email)" -ForegroundColor Cyan
    Write-Host "`nYou can now login at http://localhost:5173" -ForegroundColor Yellow
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "❌ Error: $($errorDetails.error)" -ForegroundColor Red
    if ($errorDetails.error -like "*already exists*") {
        Write-Host "   User already exists. You can login directly!" -ForegroundColor Yellow
    }
}
```

Run it:

```powershell
.\create-user.ps1
```
