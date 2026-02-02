# Complete Deployment Guide - DairySense
## Deploy to Vercel (Frontend), Render (Backend), and Supabase (Database)

This guide provides step-by-step instructions with all commands needed to deploy your DairySense application.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Setup Supabase Database](#step-1-setup-supabase-database)
3. [Step 2: Prepare Your Code](#step-2-prepare-your-code)
4. [Step 3: Deploy Backend to Render](#step-3-deploy-backend-to-render)
5. [Step 4: Deploy Frontend to Vercel](#step-4-deploy-frontend-to-vercel)
6. [Step 5: Configure Environment Variables](#step-5-configure-environment-variables)
7. [Step 6: Create First User](#step-6-create-first-user)
8. [Step 7: Testing & Verification](#step-7-testing--verification)
9. [Troubleshooting](#troubleshooting)
10. [Quick Reference Commands](#quick-reference-commands)

---

## Prerequisites

Before starting, ensure you have:

- ✅ **GitHub Account** - Your code must be in a GitHub repository
- ✅ **Vercel Account** - Sign up at https://vercel.com (free tier available)
- ✅ **Render Account** - Sign up at https://render.com (free tier available)
- ✅ **Supabase Account** - Sign up at https://supabase.com (free tier available)
- ✅ **Git installed** on your local machine
- ✅ **Node.js installed** (for local testing)

---

## Step 1: Setup Supabase Database

### 1.1 Create Supabase Project

1. Go to https://app.supabase.com/
2. Click **"New Project"**
3. Fill in the details:
   - **Organization**: Select or create one
   - **Name**: `dairysense-db` (or your preferred name)
   - **Database Password**: Create a strong password (⚠️ **SAVE THIS PASSWORD!**)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for starting
4. Click **"Create new project"** (takes 1-2 minutes)

### 1.2 Get Database Connection String

1. Once project is ready, go to **Settings → Database**
2. Scroll to **Connection string** section
3. Select **URI** tab
4. **For Render deployment**, use **Connection Pooling** (recommended):
   - Go to **Connection Pooling** section
   - Select **Transaction mode** or **Session mode**
   - Copy the connection string (format):
     ```
     postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
     ```
   - **OR** use **Direct connection** (port 5432):
     ```
     postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
     ```

### 1.3 URL Encode Password (If Needed)

If your password contains special characters, URL-encode them:

| Character | Encoded |
|-----------|---------|
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `=` | `%3D` |
| `?` | `%3F` |
| `/` | `%2F` |
| ` ` (space) | `%20` |

**Example:**
- Password: `MyP@ss#123`
- Encoded: `MyP%40ss%23123`

**PowerShell Command to Encode:**
```powershell
[System.Web.HttpUtility]::UrlEncode("YourPasswordHere")
```

**Save your connection string** - you'll need it for Render deployment!

---

## Step 2: Prepare Your Code

### 2.1 Ensure Code is Committed to GitHub

```powershell
# Navigate to project root
cd "C:\Users\sasir\OneDrive\Documents\Sasikumar R\Dairy Sense NEW"

# Check git status
git status

# Add all files
git add .

# Commit changes
git commit -m "Prepare for production deployment"

# Push to GitHub
git push origin main
```

**Note:** If you haven't initialized git yet:
```powershell
git init
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 2.2 Generate JWT Secret (For Backend)

You'll need a secure JWT secret for production. Generate one:

**PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Or use online generator:**
- Visit: https://generate-secret.vercel.app/32
- Copy the generated secret

**Save this JWT secret** - you'll add it to Render environment variables!

---

## Step 3: Deploy Backend to Render

### 3.1 Create Web Service on Render

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account (if not connected):
   - Click **"Connect account"**
   - Authorize Render to access your repositories
4. Select your repository from the list
5. Click **"Connect"**

### 3.2 Configure Service Settings

Fill in the configuration:

| Setting | Value |
|---------|-------|
| **Name** | `dairysense-api` (or your choice) |
| **Region** | Choose closest to your users |
| **Branch** | `main` (or your default branch) |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | **Free** (to start) |

### 3.3 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add these:

```bash
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend.vercel.app
DATABASE_URL=postgresql://postgres.xxxxx:YOUR_ENCODED_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
JWT_SECRET=your-generated-jwt-secret-here
DB_SSL=true
```

**Important Notes:**
- Replace `YOUR_ENCODED_PASSWORD` with your URL-encoded Supabase password
- Replace `xxxxx` with your actual Supabase project details
- Replace `your-generated-jwt-secret-here` with the JWT secret you generated
- Replace `your-frontend.vercel.app` with your Vercel URL (you'll update this after frontend deployment)
- For now, use a placeholder like `https://placeholder.vercel.app` and update it later

### 3.4 Create and Deploy

1. Click **"Create Web Service"**
2. Render will start building and deploying (takes 2-5 minutes)
3. Watch the build logs for any errors
4. Wait for status to show **"Live"** ✅
5. Copy your backend URL (e.g., `https://dairysense-api.onrender.com`)

### 3.5 Verify Backend Deployment

Test the health endpoint:

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "https://your-backend-url.onrender.com/health"
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "DairySense API is running"
}
```

**If you get errors:**
- Check Render logs: Dashboard → Your service → Logs
- Verify all environment variables are set correctly
- Check database connection string format

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Import Project to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository:
   - If not connected, click **"Connect GitHub"** and authorize
   - Select your repository
   - Click **"Import"**

### 4.2 Configure Project Settings

Fill in the configuration:

| Setting | Value |
|---------|-------|
| **Framework Preset** | `Vite` (auto-detected) |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 4.3 Add Environment Variables

Click **"Environment Variables"** and add:

```bash
VITE_API_URL=https://your-backend-url.onrender.com/api
```

**Replace `your-backend-url.onrender.com`** with your actual Render backend URL from Step 3.

### 4.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (1-3 minutes)
3. Once deployed, Vercel will give you a URL like: `https://your-project.vercel.app`
4. **Copy this URL** - you'll need it to update backend CORS settings

### 4.5 Update Backend CORS (Important!)

Now that you have your Vercel URL, update the backend:

1. Go back to Render dashboard
2. Select your backend service (`dairysense-api`)
3. Go to **"Environment"** tab
4. Find `FRONTEND_URL` variable
5. Update it to your Vercel URL:
   ```
   FRONTEND_URL=https://your-project.vercel.app
   ```
6. Click **"Save Changes"**
7. Render will automatically redeploy (wait 1-2 minutes)

### 4.6 Verify Frontend Deployment

1. Visit your Vercel URL in a browser
2. You should see the DairySense landing page
3. Open browser DevTools (F12) → Network tab
4. Try navigating - check that API calls go to your Render backend

---

## Step 5: Configure Environment Variables

### Summary of All Environment Variables

#### Render (Backend) - Required Variables:

```bash
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-project.vercel.app
DATABASE_URL=postgresql://postgres.xxxxx:ENCODED_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
JWT_SECRET=your-secure-random-jwt-secret-here
DB_SSL=true
```

#### Vercel (Frontend) - Required Variables:

```bash
VITE_API_URL=https://your-backend-url.onrender.com/api
```

**Note:** Vercel environment variables starting with `VITE_` are exposed to the frontend code.

---

## Step 6: Create First User

Since your database is empty, create the first admin user:

### Option A: Using PowerShell (Recommended)

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

**Expected Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "admin@example.com"
  }
}
```

### Option B: Using curl (if available)

```bash
curl -X POST https://your-backend-url.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"YourSecurePassword123\"}"
```

### Option C: Using Postman/Thunder Client

1. Method: `POST`
2. URL: `https://your-backend-url.onrender.com/api/auth/register`
3. Headers: `Content-Type: application/json`
4. Body (JSON):
   ```json
   {
     "email": "admin@example.com",
     "password": "YourSecurePassword123"
   }
   ```

**After creating the user, you can login with these credentials in your frontend!**

---

## Step 7: Testing & Verification

### 7.1 Test Health Endpoints

**Backend Health Check:**
```powershell
Invoke-RestMethod -Uri "https://your-backend-url.onrender.com/health"
```

**Expected:** `{"status":"ok","message":"DairySense API is running"}`

### 7.2 Test Authentication

**Login Test:**
```powershell
$loginBody = @{
    email = "admin@example.com"
    password = "YourSecurePassword123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://your-backend-url.onrender.com/api/auth/login" `
    -Method POST `
    -Body $loginBody `
    -ContentType "application/json"

# Response should contain a token
$response.token
```

### 7.3 Test Frontend-Backend Connection

1. Open your Vercel URL in browser
2. Open DevTools (F12) → Network tab
3. Try logging in with your created user
4. Check that:
   - API calls go to `https://your-backend-url.onrender.com/api`
   - No CORS errors appear
   - Login succeeds and redirects to dashboard

### 7.4 Full Workflow Test

1. ✅ Login with created user
2. ✅ Navigate to different pages
3. ✅ Test feed recording (if implemented)
4. ✅ Test milk yield recording (if implemented)
5. ✅ Check dashboard displays data correctly

---

## Troubleshooting

### Backend Issues

#### Backend won't start
- **Check Render logs:** Dashboard → Service → Logs
- **Verify environment variables:** All required variables must be set
- **Check database connection:** Verify `DATABASE_URL` is correct
- **Check password encoding:** Special characters must be URL-encoded

#### Database connection errors
- **Verify Supabase project is active:** Check Supabase dashboard
- **Check connection string format:** Must be valid PostgreSQL URI
- **Try connection pooling:** Use port 6543 instead of 5432
- **Verify SSL:** Ensure `DB_SSL=true` is set
- **Check password:** Ensure it's URL-encoded if it has special characters

#### CORS errors
- **Verify FRONTEND_URL:** Must match Vercel URL exactly (no trailing slash)
- **Check protocol:** Must use `https://` not `http://`
- **Verify backend redeployed:** After changing FRONTEND_URL, wait for redeploy

### Frontend Issues

#### Frontend build fails
- **Check Vercel logs:** Dashboard → Project → Deployments → Click deployment → Logs
- **Verify build command:** Should be `npm run build`
- **Check output directory:** Should be `dist`
- **Verify dependencies:** All packages in `package.json` should be installable

#### Frontend can't connect to backend
- **Verify VITE_API_URL:** Must be `https://your-backend-url.onrender.com/api`
- **Check backend is running:** Test health endpoint
- **Check CORS:** Verify backend allows your Vercel URL
- **Check browser console:** Look for specific error messages

#### 404 errors on frontend routes
- **Check vercel.json:** Should have rewrite rules for SPA routing
- **Verify output directory:** Should be `dist`
- **Check build output:** Ensure `index.html` is in `dist` folder

### Database Issues

#### Tables not created
- **Check backend logs:** Should show "Database schema initialized"
- **Verify database connection:** Test connection string
- **Check Supabase project:** Ensure project is active and not paused
- **Verify permissions:** Database user should have CREATE TABLE permissions

#### Connection timeout
- **Use connection pooling:** Port 6543 is more reliable for Render
- **Check Supabase status:** Project might be paused (free tier)
- **Verify network:** Render should be able to reach Supabase

---

## Quick Reference Commands

### Git Commands

```powershell
# Check status
git status

# Add all files
git add .

# Commit
git commit -m "Your commit message"

# Push to GitHub
git push origin main
```

### Generate JWT Secret

```powershell
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### URL Encode Password

```powershell
# PowerShell
[System.Web.HttpUtility]::UrlEncode("YourPassword")
```

### Test Backend Health

```powershell
Invoke-RestMethod -Uri "https://your-backend-url.onrender.com/health"
```

### Create User

```powershell
$body = @{
    email = "admin@example.com"
    password = "YourPassword"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://your-backend-url.onrender.com/api/auth/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### Login Test

```powershell
$body = @{
    email = "admin@example.com"
    password = "YourPassword"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://your-backend-url.onrender.com/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### Build Commands Reference

**Backend (Render):**
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Root Directory:** `backend`

**Frontend (Vercel):**
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Root Directory:** `frontend`

---

## Deployment Checklist

Use this checklist to ensure everything is set up correctly:

### Pre-Deployment
- [ ] Code is committed and pushed to GitHub
- [ ] Supabase project created
- [ ] Database connection string obtained
- [ ] Password URL-encoded (if needed)
- [ ] JWT secret generated

### Backend (Render)
- [ ] Web service created on Render
- [ ] Root directory set to `backend`
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] All environment variables added:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=10000`
  - [ ] `FRONTEND_URL` (placeholder initially)
  - [ ] `DATABASE_URL` (with encoded password)
  - [ ] `JWT_SECRET`
  - [ ] `DB_SSL=true`
- [ ] Backend deployed and showing "Live"
- [ ] Health check endpoint working

### Frontend (Vercel)
- [ ] Project imported to Vercel
- [ ] Root directory set to `frontend`
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variable added: `VITE_API_URL`
- [ ] Frontend deployed successfully
- [ ] Vercel URL obtained

### Post-Deployment
- [ ] Backend `FRONTEND_URL` updated with Vercel URL
- [ ] Backend redeployed after CORS update
- [ ] First user created
- [ ] Login tested successfully
- [ ] Frontend-backend connection verified
- [ ] All features tested

---

## Important Notes

1. **Free Tier Limitations:**
   - **Render:** Free tier services spin down after 15 minutes of inactivity
   - **Supabase:** Free tier projects may pause after inactivity
   - **Vercel:** Free tier is generous but has bandwidth limits

2. **Security:**
   - Never commit `.env` files to GitHub
   - Use strong passwords for database
   - Generate secure JWT secrets
   - Keep environment variables private

3. **Monitoring:**
   - Check Render logs regularly for errors
   - Monitor Supabase database usage
   - Watch Vercel deployment status

4. **Updates:**
   - After code changes, push to GitHub
   - Render and Vercel auto-deploy on push (if configured)
   - Update environment variables as needed

---

## Support & Resources

- **Render Documentation:** https://render.com/docs
- **Vercel Documentation:** https://vercel.com/docs
- **Supabase Documentation:** https://supabase.com/docs
- **Project Issues:** Check logs in respective dashboards

---

**🎉 Congratulations! Your DairySense application should now be live!**

If you encounter any issues, refer to the Troubleshooting section or check the logs in your respective dashboards.

