# Verify Your Supabase Connection String

## Current Error
"Tenant or user not found" (XX000) - This means the username/project reference in your connection string is incorrect.

## Steps to Fix

### Step 1: Get the Correct Connection String from Supabase

1. Go to https://app.supabase.com/
2. Select your project
3. Go to **Settings → Database**
4. Scroll to **Connection Pooling** section
5. Select **Transaction mode** (recommended for Render)
6. **Copy the connection string exactly as shown**

### Step 2: Verify the Format

The connection string should look like:
```
postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Example:**
```
postgresql://postgres.kdlaylbtvvaoutdcekhr:YOUR_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

### Step 3: Check Your Current Connection String

In Render Dashboard:
1. Go to your service
2. Click **Environment** tab
3. Find `DATABASE_URL`
4. Verify it matches the format above

**Common Issues:**
- ❌ Missing `postgres.` prefix before project reference
- ❌ Wrong project reference (the `xxxxx` part)
- ❌ Password not URL-encoded (if it has special characters)
- ❌ Wrong region in hostname
- ❌ Using port 5432 instead of 6543

### Step 4: URL Encode Your Password

If your password has special characters, encode them:

**PowerShell:**
```powershell
[System.Web.HttpUtility]::UrlEncode("YourPasswordHere")
```

**Special Characters:**
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`
- `/` → `%2F`

### Step 5: Update in Render

1. Copy the **exact** connection string from Supabase
2. Replace `[YOUR-PASSWORD]` with your actual password (URL-encoded)
3. Go to Render → Your Service → Environment
4. Update `DATABASE_URL` with the corrected string
5. **Remove any quotes** around the value
6. Save (will auto-redeploy)

### Step 6: Alternative - Use Direct Connection

If connection pooling still doesn't work, try direct connection:

1. In Supabase: **Settings → Database → Connection string**
2. Select **Direct connection** (not pooling)
3. Copy the connection string
4. Format: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
5. Update `DATABASE_URL` in Render

**Note:** Direct connection uses port 5432, not 6543.

## Verify Project Reference

The project reference (the `xxxxx` part in `postgres.xxxxx`) should match:
- Your Supabase project's reference ID
- Found in: Supabase Dashboard → Settings → General → Reference ID

## Test Connection String Format

Your connection string should have this structure:

```
postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

For pooling:
- Username: `postgres.xxxxx` (where xxxxx is your project ref)
- Host: `aws-0-[region].pooler.supabase.com`
- Port: `6543`
- Database: `postgres`

## Quick Checklist

- [ ] Connection string copied directly from Supabase dashboard
- [ ] Project reference (`xxxxx`) matches your Supabase project
- [ ] Password is URL-encoded (if it has special characters)
- [ ] Using port 6543 for pooling (or 5432 for direct)
- [ ] No extra spaces or quotes in Render environment variable
- [ ] Region in hostname matches your Supabase project region
- [ ] Supabase project is active (not paused)

## Still Not Working?

1. **Try Direct Connection:**
   - Use port 5432 instead of 6543
   - Username is just `postgres` (not `postgres.xxxxx`)
   - Host: `db.xxxxx.supabase.co`

2. **Verify Supabase Project:**
   - Ensure project is active
   - Check if project was paused (free tier)
   - Verify database password is correct

3. **Check Render Logs:**
   - Look for the exact connection string being used
   - Check for any parsing errors

4. **Reset Database Password:**
   - In Supabase: Settings → Database → Reset database password
   - Get new connection string
   - Update in Render

## Example: Correct Connection String

**For Connection Pooling:**
```
postgresql://postgres.kdlaylbtvvaoutdcekhr:Sasi%400208dairysense@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

**For Direct Connection:**
```
postgresql://postgres:Sasi%400208dairysense@db.kdlaylbtvvaoutdcekhr.supabase.co:5432/postgres
```

**Key Differences:**
- Pooling: `postgres.xxxxx` as username, `.pooler.supabase.com` host, port 6543
- Direct: `postgres` as username, `db.xxxxx.supabase.co` host, port 5432

