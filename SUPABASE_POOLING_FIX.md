# Supabase Connection Pooling Fix

## Problem

Error: `Tenant or user not found` (code: XX000)

This error occurs when using Supabase connection pooling because the username format `postgres.xxxxx` (where xxxxx is the project reference) is special and must be used in the connection string directly, not parsed into separate components.

## Solution

The database configuration has been updated to:
- **Detect connection pooling** - Checks for port 6543 or `.pooler.supabase.com`
- **Use connection string directly** - For pooling connections, uses the full connection string as-is
- **Parse only for direct connections** - Direct connections (port 5432) are still parsed

## Connection String Format

### ✅ Connection Pooling (Port 6543)

```
postgresql://postgres.xxxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
```

**Important:**
- Username is `postgres.xxxxx` (NOT just `postgres`)
- The `xxxxx` part is your Supabase project reference
- Must use the connection string directly (not parsed)
- Port must be `6543`

### ✅ Direct Connection (Port 5432)

```
postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

**Important:**
- Username is just `postgres`
- Can be parsed or used as connection string
- Port is `5432`

## Your Current Connection String

```
postgresql://postgres.kdlaylbtvvaoutdcekhr:Sasi%400208dairysense@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

**Status:** ✅ Correct format for connection pooling
- Uses `.pooler.supabase.com` ✓
- Port 6543 ✓
- Username: `postgres.kdlaylbtvvaoutdcekhr` ✓
- Password URL-encoded ✓

## What Changed

The code now:
1. Detects if you're using connection pooling (port 6543)
2. Uses the connection string directly (not parsed) for pooling
3. Only parses direct connections (port 5432)

This ensures the special `postgres.xxxxx` username format is preserved correctly.

## Verification

After deploying, you should see in logs:

```
✅ Database config: Connection pooling (aws-0-ap-south-1.pooler.supabase.com:6543)
   Using IPv4 preference (Render compatibility)
✅ Connected to PostgreSQL database
✅ Database schema initialized
```

## If Still Getting Errors

1. **Verify connection string in Render:**
   - Go to Render Dashboard → Your Service → Environment
   - Check `DATABASE_URL` value
   - Ensure it matches the format above exactly
   - No extra spaces or quotes

2. **Check Supabase project:**
   - Ensure project is active (not paused)
   - Verify project reference in connection string matches your project

3. **Password encoding:**
   - Ensure password is URL-encoded
   - `@` → `%40`
   - `#` → `%23`
   - etc.

4. **Test connection string:**
   - The connection string should work as-is
   - Supabase connection pooling requires the full string format

## Summary

✅ **Connection pooling** uses connection string directly
✅ **Direct connections** can be parsed
✅ **IPv4 preference** still enforced
✅ **SSL** configured correctly

The fix ensures Supabase connection pooling works correctly with the special username format.

