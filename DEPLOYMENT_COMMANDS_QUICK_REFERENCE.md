# Deployment Commands - Quick Reference

Quick copy-paste commands for deploying DairySense to Vercel, Render, and Supabase.

---

## 🔧 Pre-Deployment Setup

### 1. Generate JWT Secret

**PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Output:** Copy the generated string for `JWT_SECRET` environment variable.

---

### 2. URL Encode Database Password

**PowerShell:**
```powershell
[System.Web.HttpUtility]::UrlEncode("YourPasswordHere")
```

**Or manually encode:**
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`
- `/` → `%2F`
- Space → `%20`

---

### 3. Prepare Git Repository

```powershell
# Navigate to project
cd "C:\Users\sasir\OneDrive\Documents\Sasikumar R\Dairy Sense NEW"

# Check status
git status

# Add all files
git add .

# Commit
git commit -m "Prepare for production deployment"

# Push to GitHub
git push origin main
```

---

## 🗄️ Supabase Setup

### Get Connection String

1. Go to: https://app.supabase.com/
2. Your Project → Settings → Database
3. Connection Pooling → Transaction mode
4. Copy connection string (port 6543)

**Format:**
```
postgresql://postgres.xxxxx:ENCODED_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
```

---

## 🚀 Render (Backend) Deployment

### Environment Variables (Add in Render Dashboard)

```bash
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-project.vercel.app
DATABASE_URL=postgresql://postgres.xxxxx:ENCODED_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
JWT_SECRET=your-generated-jwt-secret-here
DB_SSL=true
```

### Render Configuration

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Runtime** | `Node` |

### Test Backend Health

```powershell
Invoke-RestMethod -Uri "https://your-backend-url.onrender.com/health"
```

**Expected:**
```json
{"status":"ok","message":"DairySense API is running"}
```

---

## 🎨 Vercel (Frontend) Deployment

### Environment Variables (Add in Vercel Dashboard)

```bash
VITE_API_URL=https://your-backend-url.onrender.com/api
```

### Vercel Configuration

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Framework Preset** | `Vite` |

---

## 👤 Create First User

### PowerShell

```powershell
$body = @{
    email = "admin@example.com"
    password = "YourSecurePassword123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://your-backend-url.onrender.com/api/auth/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### curl (if available)

```bash
curl -X POST https://your-backend-url.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"YourSecurePassword123\"}"
```

---

## ✅ Testing Commands

### Test Login

```powershell
$body = @{
    email = "admin@example.com"
    password = "YourSecurePassword123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://your-backend-url.onrender.com/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

**Expected:** Response with `token` field.

---

## 📝 Build Commands Summary

### Backend (Render)
- **Build:** `npm install`
- **Start:** `npm start`
- **Root:** `backend/`

### Frontend (Vercel)
- **Build:** `npm run build`
- **Output:** `dist/`
- **Root:** `frontend/`

---

## 🔄 Update CORS After Frontend Deploy

1. Get Vercel URL: `https://your-project.vercel.app`
2. Go to Render Dashboard → Your Service → Environment
3. Update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://your-project.vercel.app
   ```
4. Save (auto-redeploys)

---

## 🐛 Quick Troubleshooting

### Backend not starting?
```powershell
# Check Render logs in dashboard
# Verify all environment variables are set
```

### Frontend build failing?
```powershell
# Check Vercel logs in dashboard
# Verify VITE_API_URL is correct
```

### CORS errors?
- Verify `FRONTEND_URL` in Render matches Vercel URL exactly
- No trailing slashes
- Use `https://` not `http://`

### Database connection errors?
- Verify `DATABASE_URL` format
- Check password is URL-encoded
- Ensure `DB_SSL=true` is set
- Try connection pooling (port 6543)

---

## 📋 Deployment Order

1. ✅ **Supabase** - Create project, get connection string
2. ✅ **Render** - Deploy backend with database URL
3. ✅ **Vercel** - Deploy frontend with backend URL
4. ✅ **Update Render** - Update `FRONTEND_URL` with Vercel URL
5. ✅ **Create User** - Register first admin user
6. ✅ **Test** - Verify everything works

---

## 🔗 Useful Links

- **Render Dashboard:** https://dashboard.render.com/
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://app.supabase.com/
- **Full Guide:** See `COMPLETE_DEPLOYMENT_GUIDE.md`

---

**💡 Tip:** Keep this file open while deploying for quick command reference!

