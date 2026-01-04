# Deployment Checklist

Use this checklist to ensure everything is set up correctly before and after deployment.

## Pre-Deployment

### Code Preparation
- [ ] All code committed to GitHub
- [ ] No `.env` files committed (check `.gitignore`)
- [ ] All dependencies listed in `package.json`
- [ ] Build commands tested locally
- [ ] No hardcoded localhost URLs in production code

### Supabase Setup
- [ ] Supabase project created
- [ ] Database password saved securely
- [ ] Connection string copied
- [ ] SSL connection verified
- [ ] Database accessible from external IPs

### Configuration Files
- [ ] `backend/render.yaml` created (optional but helpful)
- [ ] `frontend/vercel.json` created
- [ ] Environment variable templates ready
- [ ] `.gitignore` includes `.env` files

## Deployment Steps

### Step 1: Backend (Render)
- [ ] Render account created
- [ ] GitHub repository connected
- [ ] Web service created
- [ ] Root directory set to `backend`
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] Environment variables added:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=10000`
  - [ ] `DATABASE_URL` (with Supabase connection string)
  - [ ] `JWT_SECRET` (secure random string)
  - [ ] `DB_SSL=true`
  - [ ] `FRONTEND_URL` (will update after frontend deployment)
- [ ] Service deployed and shows "Live"
- [ ] Health check working: `/health` endpoint returns success

### Step 2: Frontend (Vercel)
- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Project imported
- [ ] Framework preset: Vite
- [ ] Root directory: `frontend`
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variable added:
  - [ ] `VITE_API_URL` (with Render backend URL + `/api`)
- [ ] Project deployed successfully
- [ ] Frontend URL copied

### Step 3: Final Configuration
- [ ] Updated `FRONTEND_URL` in Render with Vercel URL
- [ ] Render service redeployed (automatic)
- [ ] CORS verified working

### Step 4: Database Setup
- [ ] Backend successfully connected to Supabase
- [ ] Database tables created automatically
- [ ] First user account created (via API or script)

## Post-Deployment Testing

### Backend Testing
- [ ] Health endpoint: `GET /health` returns 200
- [ ] Register endpoint: `POST /api/auth/register` works
- [ ] Login endpoint: `POST /api/auth/login` works
- [ ] Protected routes require authentication
- [ ] CORS allows requests from Vercel domain

### Frontend Testing
- [ ] Landing page loads
- [ ] Images load correctly
- [ ] Login form works
- [ ] API calls go to Render backend (check Network tab)
- [ ] Authentication flow works
- [ ] Dashboard loads after login
- [ ] All pages navigate correctly
- [ ] No console errors

### Integration Testing
- [ ] User can register
- [ ] User can login
- [ ] Dashboard data loads
- [ ] All API endpoints work from frontend
- [ ] Token authentication works
- [ ] Logout works correctly

## Security Checks

- [ ] JWT_SECRET is strong and unique
- [ ] Database password is strong
- [ ] Environment variables not exposed in code
- [ ] HTTPS enabled (automatic on Vercel/Render)
- [ ] CORS only allows your frontend domain
- [ ] No sensitive data in client-side code

## Performance Checks

- [ ] Frontend build size reasonable (< 5MB)
- [ ] API response times acceptable
- [ ] Database queries optimized
- [ ] Images optimized/compressed
- [ ] Lazy loading where appropriate

## Documentation

- [ ] Deployment guide documented
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Troubleshooting guide available

## Monitoring Setup

- [ ] Error tracking configured (optional)
- [ ] Logs accessible
- [ ] Database monitoring enabled
- [ ] Uptime monitoring (optional)

## Final Verification

- [ ] Application fully functional
- [ ] All features working
- [ ] Mobile responsive (test on phone)
- [ ] Cross-browser tested
- [ ] No critical bugs

## Rollback Plan

- [ ] Previous deployment versions saved
- [ ] Know how to rollback on Vercel
- [ ] Know how to rollback on Render
- [ ] Database backup strategy (Supabase auto-backups)

---

**Status:** 
- Backend: ⬜ Not Started / 🟡 In Progress / ✅ Complete
- Frontend: ⬜ Not Started / 🟡 In Progress / ✅ Complete
- Database: ⬜ Not Started / 🟡 In Progress / ✅ Complete
- Testing: ⬜ Not Started / 🟡 In Progress / ✅ Complete

**Date Completed:** _______________

**Notes:**
_________________________________________________________________
_________________________________________________________________

