# ESP32 Hardware-Software Integration Plan

## Overview

This document provides a **minimal, stable integration plan** to connect your ESP32 hardware with the DairySense backend. The goal is to enable real-time RFID tag lookups and registration without modifying existing hardware logic or UX.

---

## Current Status Summary

### ✅ Hardware (ESP32)
- **Framework**: Arduino (C++)
- **RFID Reader**: RC522 (13.56 MHz, SPI)
- **Tag Format**: UID string (HEX, uppercase, variable length like `C3E91F1E`)
- **Modes**: 
  - **Scan Mode** (default): Daily operations, checks if tag is registered
  - **Register Mode**: One-time registration, blocks further scans until switched back
- **UX**: OLED display, LEDs (green/red), buzzer (beep patterns)
- **Status**: Fully working in offline mode

### ✅ Backend (Node.js + Express)
- **Port**: 3001
- **Binding**: `0.0.0.0` (accessible from network)
- **Database**: PostgreSQL (Supabase)
- **RFID Column**: `rfid_uid` (VARCHAR, UNIQUE)

### ✅ Existing APIs
- `GET /api/cows/rfid/:rfidUid` - Check if cow exists (no auth required)
- `POST /api/cows/rfid/pending` - Register pending RFID scan (no auth required)

---

## API Contracts

### 1. Scan Mode: Check if Cow Exists

**Endpoint:**
```
GET http://YOUR_COMPUTER_IP:3001/api/cows/rfid/{rfidUid}
```

**Example:**
```
GET http://10.215.216.156:3001/api/cows/rfid/C3E91F1E
```

**Success Response (200):**
```json
{
  "data": {
    "cow_id": "COW-20251225-001",
    "rfid_uid": "C3E91F1E",
    "name": "Bella",
    "breed": "Holstein",
    ...
  },
  "qr_code": "data:image/png;base64,..."
}
```

**Not Found Response (404):**
```json
{
  "error": "Cow not found for this RFID UID"
}
```

**Error Response (500):**
```json
{
  "error": "Error message here"
}
```

**ESP32 Behavior:**
- **200 (exists)**: Show success on OLED, green LED, short beep
- **404 (not found)**: Show "Not Registered" on OLED, red LED, double beep
- **500/Network Error**: Show "Server Error" on OLED, red LED, double beep, **do not crash**

---

### 2. Register Mode: Check if New Tag

**Endpoint:**
```
POST http://YOUR_COMPUTER_IP:3001/api/cows/rfid/pending
Content-Type: application/json
```

**Request Body:**
```json
{
  "rfid_uid": "C3E91F1E"
}
```

**Success Response (200) - New Tag:**
```json
{
  "message": "RFID scan registered for linking",
  "data": {
    "rfid_uid": "C3E91F1E",
    "timestamp": 1234567890,
    "expiresAt": 1234567890
  }
}
```

**Error Response (400) - Already Exists:**
```json
{
  "error": "RFID UID is already linked to a cow",
  "cow_id": "COW-20251225-001"
}
```

**Error Response (500):**
```json
{
  "error": "Error message here"
}
```

**ESP32 Behavior:**
- **200 (new tag)**: Show "Ready to Register" on OLED, green LED, long beep → User completes form on frontend
- **400 (already exists)**: Show "Already Registered" on OLED, red LED, double beep
- **500/Network Error**: Show "Server Error" on OLED, red LED, double beep, **do not crash**

---

## Step-by-Step Integration Plan

### Step 1: Find Your Computer's IP Address

**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" under your WiFi adapter
# Example: 192.168.1.100
```

**Mac/Linux:**
```bash
ifconfig
# or
ip addr
```

**Note:** Use this IP address in ESP32 code (replace `YOUR_COMPUTER_IP`)

---

### Step 2: Verify Backend is Running

1. Start backend server:
   ```powershell
   cd backend
   npm run dev
   ```

2. Verify server is accessible:
   - Open browser: `http://YOUR_COMPUTER_IP:3001/health`
   - Should return: `{"status":"ok","message":"DairySense API is running"}`

3. Test RFID endpoint manually:
   - `http://YOUR_COMPUTER_IP:3001/api/cows/rfid/TEST123`
   - Should return 404 (unless TEST123 exists in database)

---

### Step 3: ESP32 Firmware Changes

**Minimal changes required:**

1. **Add WiFi libraries** (if not already included)
2. **Add HTTP client** (ESP32 HTTPClient or WiFiClient)
3. **Add WiFi connection function** (connect to same network as computer)
4. **Add API call functions** (one for Scan mode, one for Register mode)
5. **Integrate API calls** into existing RFID read logic

**Key Points:**
- ✅ Keep all existing hardware logic (OLED, LEDs, buzzer)
- ✅ Keep mode switching logic
- ✅ Keep RFID reading logic
- ✅ Only add WiFi connection and HTTP calls
- ✅ Add error handling (don't crash on network errors)

---

### Step 4: ESP32 Code Structure

```cpp
// Configuration (update these)
const char* WIFI_SSID = "YourWiFiNetwork";
const char* WIFI_PASSWORD = "YourWiFiPassword";
const char* BACKEND_URL = "http://192.168.1.100:3001";  // Your computer's IP

// Functions to add:
void connectWiFi() {
  // Connect to WiFi
}

bool checkCowExists(String rfidUid) {
  // GET /api/cows/rfid/{rfidUid}
  // Returns: true if exists, false if not found, false on error
}

bool registerPendingRfid(String rfidUid) {
  // POST /api/cows/rfid/pending
  // Returns: true if new tag, false if exists/error
}

// Integration points:
void handleScanMode(String rfidUid) {
  // Existing OLED/LED/buzzer logic
  bool exists = checkCowExists(rfidUid);
  if (exists) {
    // Show success
  } else {
    // Show not found
  }
}

void handleRegisterMode(String rfidUid) {
  // Existing OLED/LED/buzzer logic
  bool isNew = registerPendingRfid(rfidUid);
  if (isNew) {
    // Show ready to register
  } else {
    // Show already exists
  }
}
```

---

### Step 5: Testing Checklist

- [ ] ESP32 connects to WiFi
- [ ] ESP32 can reach backend (test with `/health` endpoint)
- [ ] Scan mode: Registered cow → Success (green LED, beep)
- [ ] Scan mode: Unregistered cow → Not Found (red LED, double beep)
- [ ] Scan mode: Network error → Error message (no crash)
- [ ] Register mode: New tag → Ready to Register (green LED, long beep)
- [ ] Register mode: Existing tag → Already Registered (red LED, double beep)
- [ ] Register mode: Network error → Error message (no crash)
- [ ] Frontend can complete registration after ESP32 sends pending RFID

---

## Backend Status: ✅ Ready

**No backend changes needed!** The existing endpoints are already configured:
- ✅ `GET /api/cows/rfid/:rfidUid` - No authentication required
- ✅ `POST /api/cows/rfid/pending` - No authentication required
- ✅ Server binds to `0.0.0.0` (network accessible)
- ✅ CORS allows all origins in development

---

## ESP32 Firmware Template

See `ESP32_FIRMWARE_TEMPLATE.ino` for a complete Arduino sketch template that you can integrate into your existing code.

---

## Network Requirements

1. **ESP32 and computer must be on the same WiFi network**
2. **Computer's firewall must allow incoming connections on port 3001**
3. **Backend server must be running before ESP32 tries to connect**

---

## Troubleshooting

### ESP32 can't connect to WiFi
- Check SSID and password
- Check WiFi signal strength
- Verify network allows new devices

### ESP32 can't reach backend
- Verify backend is running: `http://YOUR_IP:3001/health`
- Check computer's firewall settings
- Verify ESP32 and computer are on same network
- Try pinging computer's IP from another device

### Backend returns 404 for valid RFID
- Check database: Does cow with this `rfid_uid` exist?
- Verify RFID UID format matches (uppercase HEX, no spaces)
- Check backend logs for errors

### Network errors on ESP32
- Add retry logic (max 2-3 retries)
- Add timeout (5-10 seconds)
- Show error on OLED, don't crash
- Fall back to offline mode if needed

---

## Next Steps

1. **Review this plan** - Confirm it matches your requirements
2. **Get computer's IP address** - Note it down
3. **Test backend accessibility** - Verify from browser
4. **Integrate ESP32 firmware** - Use template as reference
5. **Test end-to-end** - Follow testing checklist
6. **Demo ready!** - All systems connected

---

## Questions?

If anything is unclear or needs adjustment, let me know before implementing!

