# Fix Login 404 Error - Quick Guide

## Problem
Getting 404 error when trying to login because frontend can't find the backend API.

## Root Cause
The `VITE_API_URL` environment variable is not set in Vercel, so the frontend is trying to connect to `http://localhost:3001/api` instead of your Render backend.

## Solution

### Step 1: Set Environment Variable in Vercel

1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Select your **DairySense frontend project**
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add this variable:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://dairysense-backend.onrender.com/api`
   - **Environment:** Production, Preview, Development (select all)
6. Click **Save**

### Step 2: Redeploy Frontend

After adding the environment variable:

1. Go to **Deployments** tab in Vercel
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger auto-deploy

### Step 3: Verify

1. Wait for deployment to complete
2. Visit your Vercel URL
3. Try logging in with:
   - **Email:** `admin@dairysense.com`
   - **Password:** `Admin123`

## Your Credentials

Based on your successful registration:
- **Email:** `admin@dairysense.com`
- **Password:** `Admin123`

## Supabase Configuration

**Good news:** You don't need to do anything else in Supabase! 

The backend automatically:
- ✅ Creates all required tables on first run
- ✅ Handles all database operations
- ✅ Manages connections

**What Supabase provides:**
- Database hosting (PostgreSQL)
- Connection string (already configured in Render)
- Automatic backups (on paid plans)

**No additional setup needed in Supabase dashboard!**

## Verify Backend is Working

Test your backend directly:

```powershell
# Test health endpoint
Invoke-RestMethod -Uri "https://dairysense-backend.onrender.com/health"

# Should return: {"status":"ok","message":"DairySense API is running"}
```

## Common Issues

### Still getting 404?
1. **Check Vercel environment variable:**
   - Make sure `VITE_API_URL` is set correctly
   - Value should be: `https://dairysense-backend.onrender.com/api`
   - No trailing slash!

2. **Check backend is running:**
   - Go to Render dashboard
   - Verify service status is "Live"
   - Check logs for any errors

3. **Clear browser cache:**
   - Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - Or clear browser cache

### CORS errors?
- Verify `FRONTEND_URL` in Render matches your Vercel URL exactly
- No trailing slashes
- Use `https://` not `http://`

## Quick Checklist

- [ ] `VITE_API_URL` set in Vercel: `https://dairysense-backend.onrender.com/api`
- [ ] Frontend redeployed after setting environment variable
- [ ] Backend is "Live" in Render dashboard
- [ ] User created successfully (✅ Done - you already did this!)
- [ ] Try logging in with created credentials

---

**After setting the environment variable and redeploying, your login should work!** 🚀

