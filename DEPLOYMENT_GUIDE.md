# Deployment Guide - DairySense

Complete guide to deploy DairySense to Vercel (Frontend), Render (Backend), and Supabase (Database).

---

## Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Vercel Account** - Sign up at https://vercel.com
3. **Render Account** - Sign up at https://render.com
4. **Supabase Account** - Sign up at https://supabase.com

---

## Step 1: Setup Supabase Database

### 1.1 Create Supabase Project

1. Go to https://app.supabase.com/
2. Click **"New Project"**
3. Fill in:
   - **Organization**: Select or create one
   - **Name**: `dairysense-db` (or your choice)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for starting

4. Click **"Create new project"** (takes 1-2 minutes)

### 1.2 Get Database Connection String

1. Once project is ready, go to **Settings → Database**
2. Scroll to **Connection string** section
3. Select **URI** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. **Replace `[YOUR-PASSWORD]`** with the actual password you created
6. Save this for later (you'll need it for Render)

### 1.3 Enable SSL (Important!)

- Supabase requires SSL connections
- The connection string should include SSL parameters
- The backend code already handles SSL configuration

---

## Step 2: Deploy Backend to Render

### 2.1 Prepare Backend Code

Make sure your backend code is committed to GitHub:

```bash
cd backend
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2.2 Create Web Service on Render

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository:
   - Click **"Connect account"** if not connected
   - Select your repository
   - Click **"Connect"**

### 2.3 Configure Service

Fill in the configuration:

- **Name**: `dairysense-api` (or your choice)
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: **Free** (to start)

### 2.4 Add Environment Variables

Click **"Advanced"** and add these environment variables:

```
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend-url.vercel.app
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
DB_SSL=true
```

**Important Notes:**
- Replace `YOUR_PASSWORD` with your actual Supabase password
- Replace `xxxxx` with your Supabase project details
- Replace `your-frontend-url.vercel.app` with your Vercel URL (you'll update this after deploying frontend)
- Generate a secure `JWT_SECRET` (you can use: `openssl rand -base64 32`)

### 2.5 Create Service

1. Click **"Create Web Service"**
2. Render will start building and deploying (takes 2-5 minutes)
3. Wait for status to show **"Live"** ✅
4. Copy your backend URL (e.g., `https://dairysense-api.onrender.com`)

### 2.6 Verify Backend

1. Visit: `https://your-backend-url.onrender.com/health`
2. You should see: `{"status":"ok","message":"DairySense API is running"}`

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Prepare Frontend Code

Make sure your frontend code is committed:

```bash
cd frontend
git add .
git commit -m "Prepare frontend for deployment"
git push origin main
```

### 3.2 Import Project to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Click **"Import"**

### 3.3 Configure Project

Fill in:

- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3.4 Add Environment Variables

Click **"Environment Variables"** and add:

```
VITE_API_URL=https://your-backend-url.onrender.com/api
```

**Replace `your-backend-url.onrender.com`** with your actual Render backend URL.

### 3.5 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (1-3 minutes)
3. Once deployed, Vercel will give you a URL like: `https://your-project.vercel.app`

### 3.6 Update Backend CORS

1. Go back to Render dashboard
2. Select your backend service
3. Go to **"Environment"** tab
4. Update `FRONTEND_URL` to your Vercel URL:
   ```
   FRONTEND_URL=https://your-project.vercel.app
   ```
5. Click **"Save Changes"**
6. Render will automatically redeploy

### 3.7 Verify Frontend

1. Visit your Vercel URL
2. You should see the DairySense landing page
3. Try logging in (you'll need to create a user first - see below)

---

## Step 4: Create First User

Since your database is empty, you need to create the first user. You have two options:

### Option A: Using Backend API Directly

```bash
# Using curl
curl -X POST https://your-backend-url.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'
```

### Option B: Create User Script (Local)

1. Set up local environment variables:
   ```bash
   cd backend
   cp env.example .env
   # Edit .env with your Render backend URL for testing
   ```

2. Run the create user script (if you have one) or use the API

---

## Step 5: Testing the Deployment

### 5.1 Test Health Check

- Backend: `https://your-backend-url.onrender.com/health`
- Should return: `{"status":"ok","message":"DairySense API is running"}`

### 5.2 Test Frontend-Backend Connection

1. Open browser DevTools (F12)
2. Go to Network tab
3. Visit your Vercel URL
4. Try logging in
5. Check that API calls go to your Render backend

### 5.3 Common Issues

**CORS Errors:**
- Verify `FRONTEND_URL` in Render matches your Vercel URL exactly
- Check for trailing slashes

**Database Connection Errors:**
- Verify `DATABASE_URL` is correct in Render
- Make sure password doesn't have special characters that need URL encoding
- Check Supabase project is active

**404 Errors on Frontend:**
- Vercel should handle routing automatically with the config
- If not, check `vercel.json` is in the frontend directory

---

## Environment Variables Summary

### Render (Backend) - Required:
```
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://your-frontend.vercel.app
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres
JWT_SECRET=your-random-secret-key-here
DB_SSL=true
```

### Vercel (Frontend) - Required:
```
VITE_API_URL=https://your-backend.onrender.com/api
```

---

## Useful Commands

### Check Backend Logs (Render)
- Go to Render dashboard → Your service → Logs

### Check Frontend Logs (Vercel)
- Go to Vercel dashboard → Your project → Deployments → Click deployment → Logs

### Update Environment Variables

**Render:**
1. Dashboard → Service → Environment
2. Update variable
3. Save (auto-redeploys)

**Vercel:**
1. Dashboard → Project → Settings → Environment Variables
2. Update variable
3. Redeploy (automatic or manual)

---

## Monitoring & Maintenance

### Database Monitoring (Supabase)
- Go to Supabase dashboard → Your project → Database
- Check connection pool usage
- Monitor query performance

### Backend Monitoring (Render)
- Free tier: Limited logs
- Upgrade for better monitoring

### Frontend Monitoring (Vercel)
- Check deployment status
- View analytics (if enabled)

---

## Troubleshooting

### Backend won't start
- Check Render logs for errors
- Verify all environment variables are set
- Check database connection string

### Frontend can't connect to backend
- Verify `VITE_API_URL` is correct
- Check CORS settings in backend
- Verify backend is running (health check)

### Database connection fails
- Verify Supabase project is active
- Check connection string format
- Ensure SSL is enabled (`DB_SSL=true`)

---

## Next Steps

1. ✅ Set up custom domains (optional)
2. ✅ Enable HTTPS (automatic on Vercel & Render)
3. ✅ Set up database backups (Supabase)
4. ✅ Configure error tracking (e.g., Sentry)
5. ✅ Set up CI/CD pipelines (optional)

---

## Support

If you encounter issues:
1. Check logs in Render/Vercel dashboards
2. Verify all environment variables
3. Test API endpoints directly with Postman/curl
4. Check Supabase database is accessible

---

**Happy Deploying! 🚀**

