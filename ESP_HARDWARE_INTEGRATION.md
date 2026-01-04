# ESP Hardware Integration Guide

## Backend URL Configuration

### Localhost (Development)
```
http://localhost:3001/api/cows/rfid/{rfidUid}
```

### Network IP (ESP on same network)
If your ESP and computer are on the same WiFi network:
```
http://192.168.1.XXX:3001/api/cows/rfid/{rfidUid}
```
Replace `192.168.1.XXX` with your computer's local IP address.

**To find your computer's IP:**
- Windows: `ipconfig` (look for IPv4 Address)
- Mac/Linux: `ifconfig` or `ip addr`

### Example
If your computer's IP is `192.168.1.100`:
```
http://192.168.1.100:3001/api/cows/rfid/{rfidUid}
```

## API Endpoints

### 1. Register Pending RFID Scan (For Linking)

**Endpoint:**
```
POST /api/cows/rfid/pending
```

**Request:**
```json
{
  "rfid_uid": "A1B2C3D4E5F6"
}
```

**Response 200:**
```json
{
  "message": "RFID scan registered for linking",
  "data": {
    "rfid_uid": "A1B2C3D4E5F6",
    "timestamp": 1234567890,
    "expiresAt": 1234567890
  }
}
```

**Response 400 (Already Linked):**
```json
{
  "error": "RFID UID is already linked to a cow",
  "cow_id": "COW-20251225-001"
}
```

**Use Case:** When hardware scans RFID during cow registration, send it here. Frontend will detect it and allow linking.

### 2. Lookup Cow by RFID (For Daily Operations)

**Endpoint:**
```
GET /api/cows/rfid/:rfidUid
```

### Request Format
```
GET http://localhost:3001/api/cows/rfid/A1B2C3D4E5F6
```

### Response Format
```json
{
  "data": {
    "id": 1,
    "cow_id": "COW-20251225-001",
    "rfid_uid": "A1B2C3D4E5F6",
    "name": "Bella",
    "cow_type": "normal",
    "breed": "Holstein",
    "date_of_birth": "2020-01-15",
    ...
  },
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### Error Response (404)
```json
{
  "error": "Cow not found for this RFID UID"
}
```

## ESP Code Example

### Arduino/ESP8266 Example

#### For RFID Linking (Registration Mode)
```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* backendUrl = "http://192.168.1.100:3001";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
}

void registerPendingRfid(String rfidUid) {
  WiFiClient client;
  HTTPClient http;
  
  String url = String(backendUrl) + "/api/cows/rfid/pending";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  
  String jsonBody = "{\"rfid_uid\":\"" + rfidUid + "\"}";
  int httpCode = http.POST(jsonBody);
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("RFID registered for linking: " + payload);
    // Display on screen: "RFID registered - waiting for link"
  } else if (httpCode == HTTP_CODE_BAD_REQUEST) {
    String payload = http.getString();
    Serial.println("Error: " + payload);
    // Display: "RFID already linked to a cow"
  } else {
    Serial.println("Error code: " + String(httpCode));
  }
  
  http.end();
}

void loop() {
  // When RFID tag is scanned in registration mode
  String rfidUid = "A1B2C3D4E5F6";  // From RFID reader
  registerPendingRfid(rfidUid);
  delay(5000);
}
```

#### For Daily Operations (Lookup Mode)
```cpp
void lookupCowByRfid(String rfidUid) {
  WiFiClient client;
  HTTPClient http;
  
  String url = String(backendUrl) + "/api/cows/rfid/" + rfidUid;
  http.begin(client, url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("Cow found:");
    Serial.println(payload);
    // Parse JSON and display cow info + QR code
  } else if (httpCode == HTTP_CODE_NOT_FOUND) {
    Serial.println("Cow not found for RFID: " + rfidUid);
  }
  
  http.end();
}
```

### ESP32 Example
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Backend URL - UPDATE THIS
const char* backendUrl = "http://192.168.1.100:3001";  // Change to your computer's IP

void setup() {
  Serial.begin(115200);
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
}

void fetchCowByRFID(String rfidUid) {
  HTTPClient http;
  
  String url = String(backendUrl) + "/api/cows/rfid/" + rfidUid;
  Serial.println("Requesting: " + url);
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("Response:");
    Serial.println(payload);
    
    // TODO: Parse JSON and display on screen
  } else if (httpCode == HTTP_CODE_NOT_FOUND) {
    Serial.println("Cow not found!");
  } else {
    Serial.println("Error code: " + String(httpCode));
  }
  
  http.end();
}

void loop() {
  // Your RFID scanning logic here
  // When tag is detected:
  String scannedRfid = "A1B2C3D4E5F6";  // Get from RFID reader
  fetchCowByRFID(scannedRfid);
  delay(5000);
}
```

## Testing Without ESP

### Using cURL
```bash
# Test the endpoint
curl http://localhost:3001/api/cows/rfid/TEST123456

# With a real RFID UID (replace with actual UID)
curl http://localhost:3001/api/cows/rfid/A1B2C3D4E5F6
```

### Using Postman/Browser
1. Open browser or Postman
2. Navigate to: `http://localhost:3001/api/cows/rfid/TEST123456`
3. Should return JSON response

## Important Notes

### ⚠️ Authentication Temporarily Disabled
- The RFID endpoint is **currently open** (no JWT required)
- This is for testing only
- **Re-enable authentication** after ESP JWT implementation

### Network Configuration
- **Same Network**: ESP and computer must be on same WiFi network
- **Firewall**: Ensure port 3001 is not blocked
- **CORS**: Backend allows all origins in development mode

### Finding Your Computer's IP
**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter

**Mac/Linux:**
```bash
ifconfig | grep "inet "
# OR
ip addr show
```

### Port Forwarding (Alternative)
If localhost doesn't work, you can use tools like:
- **ngrok**: `ngrok http 3001` (creates public URL)
- **localtunnel**: `lt --port 3001`

## Next Steps

1. ✅ Test endpoint with cURL/Postman
2. ✅ Update ESP code with correct backend URL
3. ✅ Test RFID scanning from ESP
4. ✅ Parse JSON response on ESP
5. ⏳ Implement JWT authentication (later)
6. ⏳ Re-enable authentication on backend

## Troubleshooting

### Connection Refused
- Check if backend server is running
- Verify port 3001 is correct
- Check firewall settings

### 404 Not Found
- Verify RFID UID exists in database
- Check endpoint URL format
- Ensure cow is registered with RFID

### Network Error
- Verify WiFi connection
- Check IP address is correct
- Ensure ESP and computer on same network

---

**Status**: Authentication temporarily disabled for testing  
**Backend Port**: 3001  
**Endpoint**: `/api/cows/rfid/:rfidUid`

