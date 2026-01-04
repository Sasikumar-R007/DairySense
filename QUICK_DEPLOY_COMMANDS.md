# Quick Deployment Commands Reference

## Environment Variables Setup

### For Render (Backend) - Add these in Render Dashboard → Environment:

```bash
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend.vercel.app  # Update after frontend deploy

# IMPORTANT: Use Supabase Connection Pooling (recommended for Render)
# Get this from: Supabase Dashboard → Settings → Database → Connection Pooling → Transaction mode
DATABASE_URL=postgresql://postgres.xxxxx:URL_ENCODED_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres

# OR use direct connection (ensure IPv4, not IPv6)
# DATABASE_URL=postgresql://postgres:URL_ENCODED_PASSWORD@db.xxxxx.supabase.co:5432/postgres

JWT_SECRET=your-random-secret-here
DB_SSL=true
```

**⚠️ IMPORTANT**: 
- URL encode your password if it has special characters (@, #, $, %, etc.)
- Use Connection Pooling (port 6543) for better Render compatibility
- See `FIX_RENDER_CONNECTION.md` if you get connection errors

### For Vercel (Frontend) - Add these in Vercel Dashboard → Environment Variables:

```bash
VITE_API_URL=https://your-backend.onrender.com/api
```

## Generate JWT Secret (Run locally)

```bash
# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# On Mac/Linux:
openssl rand -base64 32

# Or use online generator:
# https://generate-secret.vercel.app/32
```

## Test Backend Health Check

```bash
# After deploying to Render
curl https://your-backend.onrender.com/health

# Should return:
# {"status":"ok","message":"DairySense API is running"}
```

## Create First User (After Deployment)

```bash
# Using curl (Windows PowerShell):
$body = @{
    email = "admin@example.com"
    password = "your-password"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://your-backend.onrender.com/api/auth/register" -Method POST -Body $body -ContentType "application/json"

# Using curl (Mac/Linux):
curl -X POST https://your-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'
```

## Git Commands (Before Deployment)

```bash
# Make sure all changes are committed
git status

# Add all files
git add .

# Commit
git commit -m "Prepare for deployment"

# Push to GitHub
git push origin main
```

## Deployment Order

1. **Supabase** - Setup database first
2. **Render** - Deploy backend (needs database)
3. **Vercel** - Deploy frontend (needs backend URL)
4. **Update Render** - Update FRONTEND_URL after Vercel deploy

## Quick Troubleshooting

### Backend not starting?
```bash
# Check Render logs:
# Dashboard → Service → Logs
```

### Frontend build failing?
```bash
# Check Vercel logs:
# Dashboard → Project → Deployments → Click deployment → Logs
```

### CORS errors?
- Verify FRONTEND_URL in Render matches Vercel URL exactly
- No trailing slashes
- Use https:// not http://

### Database connection errors?
- Verify DATABASE_URL format is correct
- Check password doesn't need URL encoding
- Ensure DB_SSL=true is set

