# Troubleshooting: Frontend Not Detecting RFID Scan

## Problem
- ✅ ESP32 shows "Ready to Register Fill the form" (ESP32 successfully sent RFID)
- ✅ Frontend shows "Waiting for RFID scan..." (Frontend is polling)
- ❌ Frontend never detects the RFID scan

## Debug Steps

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for `[RFID Polling]` logs
4. Check for errors

**Expected logs:**
```
[RFID Polling] Fetching: http://localhost:3001/api/cows/rfid/pending
[RFID Polling] Response: {data: Array(0)}
[RFID Polling] Pending scans count: 0
```

**If you see errors:**
- CORS error → Backend CORS not configured correctly
- Network error → Backend not accessible
- 404 error → Wrong URL

### Step 2: Test Backend Endpoint Manually

**Test 1: Check if pending scans endpoint works**
```powershell
# In PowerShell
curl http://localhost:3001/api/cows/rfid/pending
```

**Expected response:**
```json
{"data":[]}
```

**Test 2: Send RFID from ESP32, then immediately check**
1. Scan RFID on ESP32 (Register Mode)
2. ESP32 shows "Ready to Register"
3. Immediately run:
```powershell
curl http://localhost:3001/api/cows/rfid/pending
```

**Expected response (if RFID was sent):**
```json
{
  "data": [
    {
      "rfid_uid": "C3E91F1E",
      "timestamp": 1234567890,
      "expiresAt": 1234567890
    }
  ]
}
```

### Step 3: Check Timing Issue

**Problem:** ESP32 sends RFID BEFORE frontend starts polling

**Solution:** 
1. **Option A:** Scan RFID AFTER frontend shows "Waiting for RFID scan..."
2. **Option B:** Frontend should start polling BEFORE showing the waiting message

**Current flow:**
```
1. User creates cow
2. Frontend shows QR code
3. Frontend starts polling ← RFID might be sent before this
4. ESP32 scans RFID ← Too early!
```

**Correct flow:**
```
1. User creates cow
2. Frontend shows QR code
3. Frontend starts polling ← Start immediately
4. User scans RFID on ESP32 ← After polling starts
5. Frontend detects within 2 seconds
```

### Step 4: Check API URL Mismatch

**Frontend uses:**
```
http://localhost:3001/api/cows/rfid/pending
```

**ESP32 sends to:**
```
http://10.215.216.156:3001/api/cows/rfid/pending
```

**Both should work** if backend is on same machine, but verify:
- Backend is accessible from both URLs
- No firewall blocking localhost
- Backend is actually running

### Step 5: Verify Backend is Receiving ESP32 Requests

**Check backend console/logs:**
- When ESP32 sends RFID, backend should log:
  - `POST /api/cows/rfid/pending` request
  - Response sent

**If no logs:**
- ESP32 is not reaching backend
- Check ESP32 Serial monitor for errors
- Verify ESP32 WiFi connection
- Verify backend URL in ESP32 code

### Step 6: Check CORS

**If browser console shows CORS error:**
- Backend CORS might not allow frontend origin
- Check `backend/server.js` CORS configuration

**Current CORS config:**
```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? FRONTEND_URL 
    : true, // Allow all origins in development
  ...
}));
```

This should allow all origins in development, so CORS shouldn't be the issue.

---

## Quick Fix: Test End-to-End

### Manual Test Sequence:

1. **Start backend:**
   ```powershell
   cd backend
   npm run dev
   ```

2. **Open frontend in browser**

3. **Open browser DevTools (F12) → Console tab**

4. **Create a new cow:**
   - Fill form
   - Click "Create Cow"
   - Should see "Waiting for RFID scan..."

5. **Check console logs:**
   - Should see `[RFID Polling] Fetching: ...` every 2 seconds
   - Should see `[RFID Polling] Response: ...`

6. **Scan RFID on ESP32 (Register Mode):**
   - ESP32 should show "Ready to Register"
   - Check ESP32 Serial monitor for HTTP response

7. **Immediately check browser console:**
   - Should see `[RFID Polling] Latest scan detected: ...`
   - Frontend should show "✅ RFID Tag Detected"

8. **If still not working:**
   - Check backend logs for POST request
   - Test endpoint manually with curl
   - Verify timing (scan AFTER frontend starts polling)

---

## Common Issues & Solutions

### Issue 1: Timing Problem
**Symptom:** ESP32 sends RFID before frontend starts polling

**Solution:** 
- Scan RFID AFTER frontend shows "Waiting for RFID scan..."
- Or: Start polling immediately when cow is created (before showing QR)

### Issue 2: API URL Mismatch
**Symptom:** Frontend uses localhost, ESP32 uses network IP

**Solution:**
- Both should work if backend is on same machine
- But verify backend is accessible from both URLs
- Test: `curl http://localhost:3001/api/cows/rfid/pending`

### Issue 3: Backend Not Receiving ESP32 Request
**Symptom:** ESP32 shows success but backend has no logs

**Solution:**
- Check ESP32 Serial monitor for HTTP errors
- Verify ESP32 WiFi connection
- Verify backend URL in ESP32 code matches your IP
- Test: `curl http://10.215.216.156:3001/health`

### Issue 4: Backend Not Returning Data
**Symptom:** Frontend polls but gets empty array

**Solution:**
- Check backend logs when ESP32 sends RFID
- Verify `storePendingRfidScan()` is called
- Test endpoint manually after ESP32 sends RFID
- Check if pending scan expired (10 min TTL)

### Issue 5: Frontend Polling Not Starting
**Symptom:** No console logs, frontend not polling

**Solution:**
- Check if `startRfidPolling()` is called after cow creation
- Check browser console for JavaScript errors
- Verify `rfidLinkingState.step === 'waiting'`

---

## Debug Checklist

- [ ] Browser console shows `[RFID Polling]` logs every 2 seconds
- [ ] Backend logs show POST request when ESP32 sends RFID
- [ ] Manual curl test returns pending scans after ESP32 sends
- [ ] ESP32 Serial monitor shows HTTP 200 response
- [ ] Timing: RFID scanned AFTER frontend starts polling
- [ ] No CORS errors in browser console
- [ ] Backend is running and accessible
- [ ] Frontend API URL is correct (check environment variable)

---

## Next Steps

1. **Add debug logging** (already added to frontend)
2. **Test manually** with curl to verify backend endpoint
3. **Check browser console** for polling logs
4. **Verify timing** - scan RFID AFTER frontend shows waiting message
5. **Check backend logs** when ESP32 sends RFID

If still not working after these checks, share:
- Browser console logs
- Backend console logs
- ESP32 Serial monitor output
- Result of manual curl test

