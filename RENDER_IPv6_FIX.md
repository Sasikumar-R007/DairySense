# Render IPv6 Connection Fix

## Problem

Render's free tier does not support IPv6 connections. When deploying to Render, you may see errors like:

```
Error: connect ENETUNREACH 2406:da1a:6b0:f602:604d:14a2:3cf2:3679:5432
Error code: ENETUNREACH
```

This happens when Node.js resolves the Supabase hostname to an IPv6 address.

## Solution

The database configuration has been updated to:
1. **Force IPv4 preference** - Node.js will prefer IPv4 addresses
2. **Parse connection string** - Better control over connection parameters
3. **Improved error handling** - Better error messages for IPv6 issues

## Connection String Format

### ✅ Correct Format (Connection Pooling - Recommended for Render)

```
postgresql://postgres.xxxxx:YOUR_ENCODED_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
```

**Example:**
```
postgresql://postgres.kdlaylbtvvaoutdcekhr:Sasi%400208dairysense@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

**Key Points:**
- Uses `.pooler.supabase.com` hostname
- Port: `6543` (connection pooling)
- Password must be URL-encoded if it contains special characters

### ❌ Incorrect Format (Direct Connection - May cause IPv6 issues)

```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

**Why it's problematic:**
- Direct connection may resolve to IPv6
- Port 5432 doesn't use connection pooling
- Less reliable on Render free tier

## Password Encoding

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
| Space | `%20` |

**Example:**
- Password: `Sasi@0208dairysense`
- Encoded: `Sasi%400208dairysense`

**PowerShell to encode:**
```powershell
[System.Web.HttpUtility]::UrlEncode("YourPassword")
```

## How to Get the Correct Connection String

1. Go to https://app.supabase.com/
2. Select your project
3. Go to **Settings → Database**
4. Scroll to **Connection Pooling** section
5. Select **Transaction mode** or **Session mode**
6. Copy the connection string
7. Replace `[YOUR-PASSWORD]` with your actual password (URL-encoded)
8. The format should be:
   ```
   postgresql://postgres.xxxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
   ```

## Environment Variable in Render

In your Render dashboard, set:

```bash
DATABASE_URL=postgresql://postgres.xxxxx:YOUR_ENCODED_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
DB_SSL=true
```

**Important:**
- Use the **pooler** hostname (`.pooler.supabase.com`)
- Use port **6543** (not 5432)
- URL-encode special characters in password
- No trailing slashes or extra parameters

## Verification

After deploying, check the logs. You should see:

```
✅ Database config: postgres@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   Using IPv4 preference (Render compatibility)
✅ Connected to PostgreSQL database
✅ Database schema initialized
🚀 Server running on http://localhost:10000
```

## Troubleshooting

### Still getting IPv6 errors?

1. **Verify connection string format:**
   - Must use `.pooler.supabase.com`
   - Must use port `6543`
   - Password must be URL-encoded

2. **Check Supabase project status:**
   - Ensure project is active (not paused)
   - Free tier projects may pause after inactivity

3. **Verify environment variable:**
   - In Render dashboard → Environment
   - Check `DATABASE_URL` is set correctly
   - No extra spaces or quotes

4. **Test connection string locally:**
   ```powershell
   # Test if connection string is valid
   # Create a test .env file and try connecting
   ```

### Connection timeout errors?

- Supabase free tier may take 1-2 minutes to wake up
- Wait and retry
- Check Supabase dashboard for project status

### SSL certificate errors?

- Should be handled automatically
- Ensure `DB_SSL=true` is set
- The code sets `rejectUnauthorized: false` for Supabase

## What Changed in the Code

1. **Added IPv4 preference:**
   ```javascript
   process.setDefaultResultOrder('ipv4first');
   ```

2. **Parse connection string:**
   - Extracts host, port, user, password, database
   - Uses individual parameters instead of connection string
   - Better control over connection

3. **Improved error messages:**
   - Specific error for IPv6 issues
   - Helpful troubleshooting tips

## Testing Locally

Before deploying to Render, test locally:

1. Set up `.env` file in `backend/` directory:
   ```env
   DATABASE_URL=postgresql://postgres.xxxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
   DB_SSL=true
   PORT=3001
   NODE_ENV=development
   JWT_SECRET=your-secret-here
   ```

2. Run backend:
   ```powershell
   cd backend
   npm start
   ```

3. Check for connection success:
   ```
   ✅ Database config: postgres@aws-0-region.pooler.supabase.com:6543/postgres
   ✅ Connected to PostgreSQL database
   ```

## Summary

✅ **Use connection pooling** (port 6543, `.pooler.supabase.com`)
✅ **URL-encode password** if it has special characters
✅ **Set `DB_SSL=true`** in environment variables
✅ **Verify connection string format** before deploying

The code now automatically prefers IPv4, which should resolve the IPv6 connection issues on Render.

