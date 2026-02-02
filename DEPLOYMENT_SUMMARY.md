# Deployment Summary - Quick Start

This is a quick overview. For detailed instructions, see the full guides below.

---

## 📚 Documentation Files

1. **`COMPLETE_DEPLOYMENT_GUIDE.md`** - Full step-by-step guide with explanations
2. **`DEPLOYMENT_COMMANDS_QUICK_REFERENCE.md`** - Quick copy-paste commands
3. **`DEPLOYMENT_CHECKLIST.md`** - Checklist to track your progress

---

## 🚀 Quick Deployment Steps

### 1. Supabase (Database)
- Create project at https://app.supabase.com/
- Get connection string from Settings → Database
- Use Connection Pooling (port 6543) for Render

### 2. Render (Backend)
- Create Web Service
- Root: `backend`
- Build: `npm install`
- Start: `npm start`
- Add environment variables (see guide)

### 3. Vercel (Frontend)
- Import project from GitHub
- Root: `frontend`
- Build: `npm run build`
- Output: `dist`
- Add `VITE_API_URL` environment variable

### 4. Update CORS
- Update `FRONTEND_URL` in Render with Vercel URL

### 5. Create User
- Use API to register first admin user

---

## 🔑 Key Environment Variables

### Render (Backend)
```bash
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-project.vercel.app
DATABASE_URL=postgresql://postgres.xxxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
JWT_SECRET=your-secret-here
DB_SSL=true
```

### Vercel (Frontend)
```bash
VITE_API_URL=https://your-backend.onrender.com/api
```

---

## 📋 Build Commands

**Backend (Render):**
- Build: `npm install`
- Start: `npm start`

**Frontend (Vercel):**
- Build: `npm run build`
- Output: `dist`

---

## ✅ Quick Test Commands

**Health Check:**
```powershell
Invoke-RestMethod -Uri "https://your-backend.onrender.com/health"
```

**Create User:**
```powershell
$body = @{email="admin@example.com";password="YourPassword"} | ConvertTo-Json
Invoke-RestMethod -Uri "https://your-backend.onrender.com/api/auth/register" -Method POST -Body $body -ContentType "application/json"
```

---

## 🆘 Need Help?

1. Check `COMPLETE_DEPLOYMENT_GUIDE.md` for detailed steps
2. Check `DEPLOYMENT_COMMANDS_QUICK_REFERENCE.md` for commands
3. Use `DEPLOYMENT_CHECKLIST.md` to track progress
4. Check logs in Render/Vercel dashboards
5. Verify all environment variables are set correctly

---

**Start with:** `COMPLETE_DEPLOYMENT_GUIDE.md` for full instructions.
