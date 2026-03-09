# ESP32 API Reference - Quick Guide

## Base URL
```
http://YOUR_COMPUTER_IP:3001
```
Replace `YOUR_COMPUTER_IP` with your computer's local IP address (e.g., `10.215.216.156`)

---

## Endpoint 1: Check if Cow Exists (Scan Mode)

**Method:** `GET`  
**URL:** `/api/cows/rfid/{rfidUid}`  
**Authentication:** None required

### Request
```
GET http://10.215.216.156:3001/api/cows/rfid/C3E91F1E
```

### Success Response (200)
```json
{
  "data": {
    "cow_id": "COW-20251225-001",
    "rfid_uid": "C3E91F1E",
    "name": "Bella",
    "breed": "Holstein",
    "cow_type": "normal",
    "date_of_birth": "2020-01-15",
    ...
  },
  "qr_code": "data:image/png;base64,..."
}
```

### Not Found Response (404)
```json
{
  "error": "Cow not found for this RFID UID"
}
```

### Error Response (500)
```json
{
  "error": "Error message here"
}
```

### ESP32 Implementation
```cpp
bool checkCowExists(String rfidUid) {
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/cows/rfid/" + rfidUid;
  
  http.begin(url);
  http.setTimeout(10000);
  
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    http.end();
    return true;  // Cow exists
  } else {
    http.end();
    return false; // Not found or error
  }
}
```

---

## Endpoint 2: Register Pending RFID (Register Mode)

**Method:** `POST`  
**URL:** `/api/cows/rfid/pending`  
**Authentication:** None required  
**Content-Type:** `application/json`

### Request
```
POST http://10.215.216.156:3001/api/cows/rfid/pending
Content-Type: application/json

{
  "rfid_uid": "C3E91F1E"
}
```

### Success Response (200) - New Tag
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

### Error Response (400) - Already Exists
```json
{
  "error": "RFID UID is already linked to a cow",
  "cow_id": "COW-20251225-001"
}
```

### Error Response (500)
```json
{
  "error": "Error message here"
}
```

### ESP32 Implementation
```cpp
bool registerPendingRfid(String rfidUid) {
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/cows/rfid/pending";
  
  http.begin(url);
  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");
  
  String jsonBody = "{\"rfid_uid\":\"" + rfidUid + "\"}";
  
  int httpCode = http.POST(jsonBody);
  
  if (httpCode == HTTP_CODE_OK) {
    http.end();
    return true;  // New tag - ready to register
  } else {
    http.end();
    return false; // Already exists or error
  }
}
```

---

## Health Check Endpoint (Testing)

**Method:** `GET`  
**URL:** `/health`  
**Authentication:** None required

### Request
```
GET http://10.215.216.156:3001/health
```

### Success Response (200)
```json
{
  "status": "ok",
  "message": "DairySense API is running"
}
```

### ESP32 Test Implementation
```cpp
bool testBackendConnection() {
  HTTPClient http;
  String url = String(BACKEND_URL) + "/health";
  
  http.begin(url);
  http.setTimeout(5000);
  
  int httpCode = http.GET();
  http.end();
  
  return (httpCode == HTTP_CODE_OK);
}
```

---

## RFID UID Format

- **Format:** HEX string, uppercase
- **Example:** `C3E91F1E`
- **Length:** Variable (typically 4-8 bytes = 8-16 hex characters)
- **No spaces, no dashes, no colons**

### ESP32 Conversion
```cpp
// Convert byte array to HEX string (uppercase)
String bytesToHex(byte* bytes, int len) {
  String hex = "";
  for (int i = 0; i < len; i++) {
    if (bytes[i] < 0x10) hex += "0";
    hex += String(bytes[i], HEX);
  }
  hex.toUpperCase();
  return hex;
}
```

---

## Error Handling Best Practices

1. **Network Timeout:** Set timeout to 10 seconds max
2. **WiFi Disconnected:** Check `WiFi.status() == WL_CONNECTED` before API calls
3. **HTTP Errors:** Handle 404, 400, 500 separately if needed
4. **No Crash:** Always return gracefully, show error on OLED
5. **Retry Logic:** Optional - retry once on timeout (not required for demo)

---

## Testing Checklist

- [ ] Backend running: `http://YOUR_IP:3001/health` returns OK
- [ ] ESP32 connects to WiFi
- [ ] ESP32 can reach backend (test with `/health`)
- [ ] Scan mode with registered cow → 200 OK
- [ ] Scan mode with unregistered cow → 404 Not Found
- [ ] Register mode with new tag → 200 OK
- [ ] Register mode with existing tag → 400 Bad Request
- [ ] Network error handling → Shows error, doesn't crash

---

## Common Issues

### ESP32 can't connect to backend
- **Check:** Backend is running and accessible from browser
- **Check:** ESP32 and computer on same WiFi network
- **Check:** Firewall allows port 3001
- **Check:** IP address is correct in ESP32 code

### Backend returns 404 for valid RFID
- **Check:** RFID UID format matches database (uppercase HEX)
- **Check:** Cow exists in database with matching `rfid_uid`
- **Check:** Backend logs for errors

### Network timeout
- **Solution:** Increase timeout to 10 seconds
- **Solution:** Check WiFi signal strength
- **Solution:** Verify backend is responding (test in browser)

