# RFID Linking Workflow Documentation

## Overview

The RFID linking system allows farmers to link RFID tags to cows after cow creation. The dashboard remains the source of truth for cow creation - hardware only sends RFID UID for linking.

## Workflow

### 1. Cow Creation (Dashboard)

1. Farmer fills out cow details in "Add Cow" form
2. **RFID UID is NOT entered during creation** (removed from form)
3. Farmer clicks "Create Cow & Generate QR Code"
4. Cow is created in database
5. QR code is generated and displayed

### 2. RFID Linking Step

After cow creation, a "Link RFID Tag" step appears:

#### Step States:

**a) Waiting for RFID Scan**
- UI shows: "Waiting for RFID scan..." with spinner
- System polls backend every 2 seconds for pending RFID scans
- Hardware can send RFID UID to register it as pending
- Options:
  - Wait for automatic detection
  - Switch to manual entry
  - Skip RFID linking

**b) RFID Found**
- When hardware sends RFID UID, it appears in UI
- Shows: "✅ RFID Tag Detected: {rfid_uid}"
- Button: "Link RFID Tag" to confirm linking
- Option: "Use Different RFID" to enter manually

**c) Manual Entry**
- User can manually enter RFID UID (from hardware display)
- Input field + "Link" button
- Option to skip

**d) Linked**
- Shows: "✅ RFID Tag Successfully Linked!"
- RFID UID is now stored in cow record

## API Endpoints

### Hardware Endpoint: Register Pending RFID Scan

```
POST /api/cows/rfid/pending
Body: {
  "rfid_uid": "A1B2C3D4E5F6"
}

Response 200:
{
  "message": "RFID scan registered for linking",
  "data": {
    "rfid_uid": "A1B2C3D4E5F6",
    "timestamp": 1234567890,
    "expiresAt": 1234567890
  }
}

Response 400:
{
  "error": "RFID UID is already linked to a cow",
  "cow_id": "COW-20251225-001"
}
```

### Frontend Endpoint: Get Pending RFID Scans

```
GET /api/cows/rfid/pending

Response 200:
{
  "data": [
    {
      "rfid_uid": "A1B2C3D4E5F6",
      "timestamp": 1234567890,
      "expiresAt": 1234567890
    }
  ]
}
```

### Frontend Endpoint: Link RFID to Cow

```
PUT /api/cows/:cowId
Headers: Authorization: Bearer {token}
Body: {
  "rfid_uid": "A1B2C3D4E5F6"
}

Response 200:
{
  "message": "Cow updated successfully",
  "data": { cow object with rfid_uid }
}

Response 400:
{
  "error": "RFID UID is already registered to another cow"
}
```

### Frontend Endpoint: Remove Pending Scan

```
DELETE /api/cows/rfid/pending/:rfidUid

Response 200:
{
  "message": "Pending RFID scan removed"
}
```

## Hardware Integration

### ESP Code Example

```cpp
// When RFID tag is scanned
String rfidUid = "A1B2C3D4E5F6";  // From RFID reader

// Register as pending for linking
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
  Serial.println("RFID already linked to a cow");
} else {
  Serial.println("Error: " + String(httpCode));
}

http.end();
```

## Data Flow

```
1. Hardware scans RFID tag
   ↓
2. ESP sends POST /api/cows/rfid/pending
   ↓
3. Backend stores in temporary memory (10 min TTL)
   ↓
4. Frontend polls GET /api/cows/rfid/pending (every 2 sec)
   ↓
5. Frontend detects pending RFID
   ↓
6. User clicks "Link RFID Tag"
   ↓
7. Frontend sends PUT /api/cows/:cowId with rfid_uid
   ↓
8. Backend validates and links RFID
   ↓
9. Frontend removes pending scan
   ↓
10. UI shows "Successfully Linked"
```

## Validation Rules

1. **RFID UID must be unique** - Cannot link same RFID to multiple cows
2. **Pending scans expire** - After 10 minutes, pending scans are removed
3. **Already linked check** - If RFID is already linked, hardware gets error
4. **Manual entry validation** - Same validation applies for manual entry

## Error Handling

### RFID Already Linked
- Hardware receives 400 error with existing cow_id
- Frontend shows error: "RFID UID is already registered to another cow"
- User must use different RFID or unlink existing one first

### Pending Scan Expired
- After 10 minutes, pending scans are automatically removed
- Frontend switches to manual entry mode
- User can re-scan or enter manually

### Network Errors
- Frontend polling continues (handles errors gracefully)
- Manual entry always available as fallback
- User can skip RFID linking if needed

## UI States

### Waiting State
```
🔗 Link RFID Tag
⏳ Waiting for RFID scan...
[Scan the RFID tag using your hardware reader...]
[Enter Manually Instead] [Skip RFID Linking]
```

### Found State
```
🔗 Link RFID Tag
✅ RFID Tag Detected: A1B2C3D4E5F6
[Link RFID Tag] [Use Different RFID]
```

### Manual State
```
🔗 Link RFID Tag
Enter the RFID UID manually:
[Input field] [Link]
[Skip RFID Linking]
```

### Linked State
```
🔗 Link RFID Tag
✅ RFID Tag Successfully Linked!
```

## Important Notes

1. **Dashboard is source of truth** - Cows are always created via dashboard
2. **Hardware only sends RFID UID** - No cow creation from hardware
3. **QR codes unchanged** - Existing QR code logic remains intact
4. **Optional RFID** - RFID linking can be skipped
5. **Temporary storage** - Pending scans stored in memory (not database)

## Testing

### Test Hardware Registration
```bash
curl -X POST http://localhost:3001/api/cows/rfid/pending \
  -H "Content-Type: application/json" \
  -d '{"rfid_uid":"TEST123456"}'
```

### Test Get Pending
```bash
curl http://localhost:3001/api/cows/rfid/pending
```

### Test Link RFID
```bash
curl -X PUT http://localhost:3001/api/cows/COW-20251225-001 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"rfid_uid":"TEST123456"}'
```

---

**Status**: ✅ Implemented  
**Last Updated**: 2024-12-25

