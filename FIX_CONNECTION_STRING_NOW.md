# 🔧 Fix Your Connection String - URGENT

## ❌ The Problem

Your Supabase connection string shows:
```
aws-1-ap-south-1.pooler.supabase.com
```

But you're probably using in Render:
```
aws-0-ap-south-1.pooler.supabase.com
```

**The `aws-0` vs `aws-1` difference is causing the "Tenant or user not found" error!**

## ✅ The Fix

### Step 1: Get Your Correct Connection String

From Supabase, you have:
```
postgresql://postgres.kdlaylbtvvaoutdcekhr:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

### Step 2: Replace [YOUR-PASSWORD]

Your password is: `Sasi@0208dairysense`

URL-encoded it becomes: `Sasi%400208dairysense`

### Step 3: Final Connection String

```
postgresql://postgres.kdlaylbtvvaoutdcekhr:Sasi%400208dairysense@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

**Key Points:**
- ✅ Use `aws-1` (NOT `aws-0`)
- ✅ Password URL-encoded: `Sasi%400208dairysense`
- ✅ Port: `6543`
- ✅ Username: `postgres.kdlaylbtvvaoutdcekhr`

## 🚀 Update in Render NOW

1. Go to **Render Dashboard**
2. Select your backend service
3. Click **Environment** tab
4. Find `DATABASE_URL`
5. **Replace the entire value with:**
   ```
   postgresql://postgres.kdlaylbtvvaoutdcekhr:Sasi%400208dairysense@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
   ```
6. **IMPORTANT:** 
   - Use `aws-1` (not `aws-0`)
   - No quotes around the value
   - No extra spaces
7. Click **Save Changes**
8. Render will auto-redeploy

## ✅ What to Expect

After redeploy, you should see in logs:

```
✅ Database config: Connection pooling (aws-1-ap-south-1.pooler.supabase.com:6543)
   Using IPv4 preference (Render compatibility)
✅ Connected to PostgreSQL database
✅ Database schema initialized
🚀 Server running on http://localhost:10000
```

## 🔍 Verify Your Current Render Setting

Check what you currently have in Render:

**Wrong (what you probably have):**
```
postgresql://postgres.kdlaylbtvvaoutdcekhr:Sasi%400208dairysense@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
                                                                  ^^^^
                                                                  WRONG!
```

**Correct (what you need):**
```
postgresql://postgres.kdlaylbtvvaoutdcekhr:Sasi%400208dairysense@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
                                                                  ^^^^
                                                                  CORRECT!
```

## 📋 Quick Checklist

- [ ] Connection string uses `aws-1` (not `aws-0`)
- [ ] Password is URL-encoded: `Sasi%400208dairysense`
- [ ] No quotes around the value in Render
- [ ] No extra spaces
- [ ] Saved and redeployed

## 🎯 This Should Fix It!

The `aws-0` vs `aws-1` mismatch is definitely the issue. Once you update it to `aws-1`, the connection should work!

