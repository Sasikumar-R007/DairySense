# Fix Render Database Connection Issue

## Problem

Render is trying to connect to Supabase using IPv6 address and getting `ENETUNREACH` error.

## Solution

### Option 1: Use Supabase Connection Pooling (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Settings → Database**
3. Scroll to **Connection Pooling** section
4. Select **"Transaction" mode** (recommended for Render)
5. Copy the connection string from the **"Connection string"** section
6. The URL should look like:

   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

   - Notice it uses `.pooler.supabase.com` and port `6543` (not 5432)
   - This uses connection pooling which is more reliable for Render

7. Update the `DATABASE_URL` in Render dashboard:

   - Go to Render → Your Service → Environment
   - Update `DATABASE_URL` with the pooled connection string
   - **IMPORTANT**: URL encode your password if it has special characters

8. Redeploy your service

### Option 2: Use Direct IPv4 Connection

1. In Supabase dashboard, go to **Settings → Database**
2. Under **Connection string**, use **"Direct connection"**
3. Make sure the hostname doesn't have IPv6 brackets `[...]`
4. The connection string should be:

   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

   - Use the domain name (db.xxxxx.supabase.co), not IP address
   - This will resolve to IPv4 automatically

5. URL encode special characters in password:

   - Use an online URL encoder: https://www.urlencoder.org/
   - Or use this PowerShell command:
     ```powershell
     [System.Web.HttpUtility]::UrlEncode("your-password-here")
     ```

6. Update `DATABASE_URL` in Render with the encoded password

### Option 3: Use Individual Connection Parameters

Instead of `DATABASE_URL`, use separate environment variables:

```
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-url-encoded-password
DB_SSL=true
```

This avoids connection string parsing issues.

## Password URL Encoding

If your password contains special characters, you MUST encode them:

| Character | Encoded |
| --------- | ------- |
| @         | %40     |
| #         | %23     |
| $         | %24     |
| %         | %25     |
| &         | %26     |
| +         | %2B     |
| =         | %3D     |
| ?         | %3F     |
| /         | %2F     |
| :         | %3A     |

### Quick Encode (PowerShell):

```powershell
[System.Web.HttpUtility]::UrlEncode("your-password-with-@special#chars")
```

### Quick Encode (Online):

Visit: https://www.urlencoder.org/

## Verify Connection String Format

Correct format:

```
postgresql://postgres:ENCODED_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

Or for connection pooling:

```
postgresql://postgres.xxxxx:ENCODED_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
```

## After Updating

1. Save the environment variable in Render
2. Render will automatically redeploy
3. Check the logs to see if connection succeeds
4. The health check endpoint should work: `https://your-backend.onrender.com/health`

## Still Having Issues?

1. **Check Supabase Project Status**: Make sure your Supabase project is active
2. **Verify Database Password**: Reset it in Supabase if needed
3. **Check Render Logs**: Look for more detailed error messages
4. **Test Connection Locally**: Try connecting with `psql` or a database client first
5. **Contact Support**: If using connection pooling and still failing, there might be a network issue

## Recommended Settings for Render

- **Connection Pooling**: Use Transaction mode (port 6543)
- **SSL**: Always enabled (`sslmode=require`)
- **Timeout**: Connection timeout set to 20 seconds (already configured in code)
- **Max Connections**: Set to 10 (already configured for free tier)

---

**Most Common Solution**: Use Supabase Connection Pooling with Transaction mode. This is designed for serverless/cloud environments like Render.
