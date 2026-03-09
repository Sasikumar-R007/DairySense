# Register Mode Workflow - Complete Guide

## Overview

When ESP32 is in **Register Mode** and scans an RFID tag, it sends the RFID UID to the backend. The frontend (Add Cow form) automatically detects it and allows you to link it to the newly created cow.

---

## Complete Workflow

### Step 1: User Creates Cow in Frontend
1. User fills out "Add Cow" form (name, breed, etc.)
2. User clicks **"Create Cow & Generate QR Code"**
3. Cow is created in database (without RFID UID yet)
4. QR code is generated and displayed
5. **Frontend automatically starts polling** for pending RFID scans

### Step 2: ESP32 Scans RFID in Register Mode
1. User switches ESP32 to **Register Mode** (toggle switch)
2. User scans RFID tag on ESP32
3. ESP32 reads RFID UID (e.g., `C3E91F1E`)
4. ESP32 sends to backend:
   ```
   POST http://10.215.216.156:3001/api/cows/rfid/pending
   Body: { "rfid_uid": "C3E91F1E" }
   ```
5. Backend stores RFID UID in temporary memory (10 minute TTL)
6. ESP32 shows on OLED: **"Fill the form..."** or **"Ready to Register"**
7. ESP32: Green LED + Long beep (success)

### Step 3: Frontend Detects RFID (Automatic)
1. Frontend polls backend every **2 seconds**:
   ```
   GET http://10.215.216.156:3001/api/cows/rfid/pending
   ```
2. When ESP32 sends RFID, frontend detects it within 2 seconds
3. Frontend shows: **"✅ RFID Tag Detected: C3E91F1E"**
4. User clicks **"Link RFID Tag"** button

### Step 4: RFID Linked to Cow
1. Frontend sends:
   ```
   PUT /api/cows/{cowId}
   Body: { "rfid_uid": "C3E91F1E" }
   ```
2. Backend links RFID UID to cow in database
3. Frontend removes pending scan
4. Frontend shows: **"✅ RFID Tag Successfully Linked!"**

---

## What ESP32 Should Do in Register Mode

### When RFID Tag is Scanned:

```cpp
void handleRegisterMode(String rfidUid) {
  // 1. Show "Checking..." on OLED
  displayOLED("Checking...");
  
  // 2. Call API to register pending RFID
  bool isNew = registerPendingRfid(rfidUid);
  
  if (isNew) {
    // 3. New tag - ready to register
    displayOLED("Fill the form...");  // or "Ready to Register"
    greenLED_ON();
    longBeep();  // Long beep = registration ready
  } else {
    // 4. Tag already exists
    displayOLED("Already Registered");
    redLED_ON();
    doubleBeep();  // Error beep
  }
}
```

### API Function:

```cpp
bool registerPendingRfid(String rfidUid) {
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/cows/rfid/pending";
  
  http.begin(url);
  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");
  
  String jsonBody = "{\"rfid_uid\":\"" + rfidUid + "\"}";
  int httpCode = http.POST(jsonBody);
  
  http.end();
  
  if (httpCode == HTTP_CODE_OK) {
    return true;  // New tag - ready to register
  } else {
    return false; // Already exists or error
  }
}
```

---

## What Frontend Checks (Automatic)

### Frontend Polling Logic:

1. **After cow creation**, frontend automatically starts polling:
   - Polls every **2 seconds**
   - Calls: `GET /api/cows/rfid/pending`
   - Continues for **10 minutes** max

2. **When pending RFID detected**:
   - Frontend receives array of pending scans
   - Takes the **most recent** scan
   - Shows: "✅ RFID Tag Detected: {rfid_uid}"
   - Stops polling
   - Waits for user to click "Link RFID Tag"

3. **User clicks "Link RFID Tag"**:
   - Frontend links RFID to cow
   - Removes pending scan from backend
   - Shows success message

---

## Critical Checks & Validation

### ✅ ESP32 Must Check:

1. **WiFi Connected**: `WiFi.status() == WL_CONNECTED`
2. **HTTP Response Code**:
   - `200 OK` = New tag (ready to register) → Show "Fill the form..."
   - `400 Bad Request` = Already exists → Show "Already Registered"
   - `500/Timeout` = Server error → Show error, don't crash
3. **RFID UID Format**: Uppercase HEX, no spaces (e.g., `C3E91F1E`)

### ✅ Backend Validates:

1. **RFID UID not empty**: Returns 400 if missing
2. **RFID not already linked**: Checks database, returns 400 if exists
3. **Stores in memory**: 10 minute TTL, auto-expires
4. **Returns pending scan data**: Includes timestamp and expiry

### ✅ Frontend Validates:

1. **Polling active**: Only when `rfidLinkingState.step === 'waiting'`
2. **Most recent scan**: Takes first item from array (sorted newest first)
3. **Cow exists**: Must have `createdCowId` before linking
4. **RFID unique**: Backend validates when linking

---

## Testing Checklist

### Test ESP32 Register Mode:

- [ ] ESP32 connects to WiFi
- [ ] ESP32 scans RFID tag in Register Mode
- [ ] ESP32 sends `POST /api/cows/rfid/pending` successfully
- [ ] ESP32 receives `200 OK` response
- [ ] ESP32 shows "Fill the form..." on OLED
- [ ] ESP32: Green LED + Long beep

### Test Frontend Detection:

- [ ] Create cow in frontend (Add Cow form)
- [ ] Frontend shows "Waiting for RFID scan..." with spinner
- [ ] Scan RFID on ESP32 (Register Mode)
- [ ] Frontend detects RFID within 2 seconds
- [ ] Frontend shows "✅ RFID Tag Detected: {rfid_uid}"
- [ ] User clicks "Link RFID Tag"
- [ ] Frontend shows "✅ RFID Tag Successfully Linked!"

### Test Error Cases:

- [ ] ESP32 scans already-registered RFID → Shows "Already Registered"
- [ ] ESP32 network error → Shows error, doesn't crash
- [ ] Frontend timeout (10 min) → Switches to manual entry
- [ ] Multiple pending scans → Frontend takes most recent

---

## API Endpoints Summary

### ESP32 → Backend (Register Mode):
```
POST http://10.215.216.156:3001/api/cows/rfid/pending
Content-Type: application/json

{
  "rfid_uid": "C3E91F1E"
}

Response 200 (New):
{
  "message": "RFID scan registered for linking",
  "data": {
    "rfid_uid": "C3E91F1E",
    "timestamp": 1234567890,
    "expiresAt": 1234567890
  }
}

Response 400 (Exists):
{
  "error": "RFID UID is already linked to a cow",
  "cow_id": "COW-20251225-001"
}
```

### Frontend → Backend (Polling):
```
GET http://10.215.216.156:3001/api/cows/rfid/pending

Response 200:
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

### Frontend → Backend (Link RFID):
```
PUT http://10.215.216.156:3001/api/cows/{cowId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "rfid_uid": "C3E91F1E"
}
```

---

## Common Issues & Solutions

### Issue: ESP32 shows "Fill the form..." but frontend doesn't detect

**Check:**
1. Is frontend on "Add Cow" page after creating cow?
2. Is frontend polling active? (Check browser console for errors)
3. Is backend running? Test: `http://10.215.216.156:3001/health`
4. Did ESP32 receive `200 OK`? Check Serial monitor

**Solution:**
- Verify ESP32 successfully sent `POST /api/cows/rfid/pending`
- Check backend logs for errors
- Verify frontend polling is running (check Network tab in browser DevTools)

### Issue: Frontend shows "Already Registered" but tag is new

**Check:**
1. Is RFID UID already in database? Check: `GET /api/cows/rfid/{rfidUid}`
2. Is RFID format correct? (uppercase HEX, no spaces)

**Solution:**
- Check database for existing `rfid_uid` matching the scanned tag
- Verify RFID UID format matches exactly

### Issue: Pending scan expires before linking

**Check:**
1. Did user wait more than 10 minutes?
2. Is frontend polling still active?

**Solution:**
- Frontend automatically switches to manual entry after 10 minutes
- User can enter RFID UID manually or re-scan on ESP32

---

## Quick Reference

**ESP32 Register Mode Flow:**
```
Scan RFID → POST /api/cows/rfid/pending → 200 OK → Show "Fill the form..."
```

**Frontend Detection Flow:**
```
Create Cow → Start Polling → GET /api/cows/rfid/pending → Detect RFID → Link
```

**Complete End-to-End:**
```
1. User creates cow (frontend)
2. ESP32 scans RFID (Register Mode)
3. ESP32 sends to backend
4. Frontend detects (auto-polling)
5. User links RFID (frontend)
6. Done! ✅
```

---

## Next Steps

1. **Test ESP32**: Verify register mode sends RFID correctly
2. **Test Frontend**: Create cow and verify polling works
3. **Test End-to-End**: Complete full workflow
4. **Check Errors**: Test error cases (already exists, network error, etc.)

If everything works, you should see:
- ESP32: "Fill the form..." after scanning
- Frontend: "✅ RFID Tag Detected" within 2 seconds
- User: Click "Link RFID Tag" → Success!

