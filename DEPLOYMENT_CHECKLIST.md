# Deployment Checklist - DairySense

Use this checklist to ensure a smooth deployment process.

---

## ✅ Pre-Deployment

- [ ] Code is committed to Git
- [ ] Code is pushed to GitHub repository
- [ ] All local changes are saved
- [ ] No `.env` files are committed (check `.gitignore`)
- [ ] Tested locally and working

---

## 🗄️ Supabase Setup

- [ ] Created Supabase account
- [ ] Created new project in Supabase
- [ ] Saved database password securely
- [ ] Got connection string from Supabase
- [ ] URL-encoded password (if contains special characters)
- [ ] Tested connection string format

**Connection String Format:**
```
postgresql://postgres.xxxxx:ENCODED_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
```

---

## 🔑 Security Setup

- [ ] Generated JWT secret (32+ characters)
- [ ] Saved JWT secret securely
- [ ] Database password saved securely
- [ ] All secrets ready for environment variables

---

## 🚀 Render (Backend) Deployment

### Account & Service
- [ ] Created Render account
- [ ] Connected GitHub account to Render
- [ ] Created new Web Service
- [ ] Selected correct repository
- [ ] Set root directory to `backend`

### Configuration
- [ ] **Name:** `dairysense-api` (or your choice)
- [ ] **Region:** Selected appropriate region
- [ ] **Branch:** `main` (or your default)
- [ ] **Runtime:** `Node`
- [ ] **Build Command:** `npm install`
- [ ] **Start Command:** `npm start`
- [ ] **Plan:** Free (or selected plan)

### Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `PORT=10000`
- [ ] `FRONTEND_URL=https://placeholder.vercel.app` (update later)
- [ ] `DATABASE_URL=postgresql://...` (with encoded password)
- [ ] `JWT_SECRET=your-secret-here`
- [ ] `DB_SSL=true`

### Deployment
- [ ] Service created successfully
- [ ] Build completed without errors
- [ ] Service status shows "Live"
- [ ] Backend URL copied (e.g., `https://dairysense-api.onrender.com`)

### Verification
- [ ] Health check works: `/health` endpoint returns OK
- [ ] No errors in Render logs

---

## 🎨 Vercel (Frontend) Deployment

### Account & Project
- [ ] Created Vercel account
- [ ] Connected GitHub account to Vercel
- [ ] Imported project from GitHub
- [ ] Selected correct repository

### Configuration
- [ ] **Framework Preset:** `Vite` (auto-detected)
- [ ] **Root Directory:** `frontend`
- [ ] **Build Command:** `npm run build`
- [ ] **Output Directory:** `dist`
- [ ] **Install Command:** `npm install`

### Environment Variables
- [ ] `VITE_API_URL=https://your-backend-url.onrender.com/api`

### Deployment
- [ ] Project deployed successfully
- [ ] Build completed without errors
- [ ] Vercel URL obtained (e.g., `https://your-project.vercel.app`)

### Verification
- [ ] Frontend loads in browser
- [ ] No console errors
- [ ] API calls point to Render backend

---

## 🔄 Post-Deployment Configuration

### Update Backend CORS
- [ ] Went to Render dashboard
- [ ] Selected backend service
- [ ] Updated `FRONTEND_URL` with actual Vercel URL
- [ ] Saved changes
- [ ] Waited for redeploy (1-2 minutes)
- [ ] Verified redeploy completed

**Updated Value:**
```
FRONTEND_URL=https://your-project.vercel.app
```

---

## 👤 User Setup

### Create First User
- [ ] Created admin user via API
- [ ] Saved credentials securely
- [ ] Tested login with created user
- [ ] Login successful

**User Creation Method:**
- [ ] PowerShell command
- [ ] curl command
- [ ] Postman/Thunder Client
- [ ] Other method

---

## ✅ Final Testing

### Backend Tests
- [ ] Health endpoint: `/health` ✓
- [ ] Register endpoint: `/api/auth/register` ✓
- [ ] Login endpoint: `/api/auth/login` ✓
- [ ] Protected endpoints require authentication ✓

### Frontend Tests
- [ ] Landing page loads ✓
- [ ] Login page accessible ✓
- [ ] Can login with created user ✓
- [ ] Dashboard loads after login ✓
- [ ] Navigation works ✓
- [ ] API calls succeed ✓
- [ ] No CORS errors ✓

### Integration Tests
- [ ] Frontend connects to backend ✓
- [ ] Authentication flow works ✓
- [ ] Data flows correctly ✓
- [ ] All features functional ✓

---

## 📊 Monitoring Setup

### Logs Access
- [ ] Know how to access Render logs
- [ ] Know how to access Vercel logs
- [ ] Know how to access Supabase logs

### Monitoring
- [ ] Checked Render service status
- [ ] Checked Vercel deployment status
- [ ] Checked Supabase project status
- [ ] All services showing healthy

---

## 🔒 Security Checklist

- [ ] No `.env` files in repository
- [ ] All secrets in environment variables (not in code)
- [ ] Strong database password used
- [ ] Secure JWT secret generated
- [ ] HTTPS enabled (automatic on Vercel/Render)
- [ ] CORS configured correctly

---

## 📝 Documentation

- [ ] Deployment URLs saved:
  - [ ] Backend URL: `________________________`
  - [ ] Frontend URL: `________________________`
  - [ ] Supabase URL: `________________________`
- [ ] Credentials saved securely:
  - [ ] Database password
  - [ ] JWT secret
  - [ ] Admin user credentials

---

## 🎯 Post-Deployment Tasks

- [ ] Test all major features
- [ ] Monitor for errors (first 24 hours)
- [ ] Set up custom domain (optional)
- [ ] Configure backups (Supabase)
- [ ] Set up error tracking (optional)
- [ ] Document any issues encountered

---

## 🆘 If Something Goes Wrong

### Backend Issues
- [ ] Checked Render logs
- [ ] Verified environment variables
- [ ] Tested database connection
- [ ] Checked Supabase project status

### Frontend Issues
- [ ] Checked Vercel logs
- [ ] Verified build output
- [ ] Checked environment variables
- [ ] Tested API URL

### Database Issues
- [ ] Verified Supabase project is active
- [ ] Checked connection string format
- [ ] Verified password encoding
- [ ] Tested connection pooling

---

## ✨ Success Criteria

Your deployment is successful when:

- ✅ Backend health check returns OK
- ✅ Frontend loads without errors
- ✅ Can login with created user
- ✅ All features work as expected
- ✅ No CORS errors
- ✅ No console errors
- ✅ API calls succeed

---

**🎉 Deployment Complete!**

If all items are checked, your DairySense application is live and ready to use!

---

**Last Updated:** Check off items as you complete them during deployment.
