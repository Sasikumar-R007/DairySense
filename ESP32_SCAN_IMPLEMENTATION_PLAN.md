# ESP32 Scan Mode Implementation Plan

## Overview

Implement automatic lane assignment and feed/milking recording when ESP32 scans RFID tags in Scan Mode.

---

## Workflow

### Morning Scan (Feed Distribution)
1. ESP32 scans RFID tag (Scan Mode)
2. ESP32 sends RFID UID to backend
3. Backend:
   - Looks up cow by RFID
   - Auto-assigns next available lane (1, 2, 3... in order)
   - Returns cow details + assigned lane + feed suggestion
4. ESP32 displays: Cow name, Lane number, Feed suggestion
5. Frontend (optional): Shows scan event, allows confirmation/editing

### Milking Scan
1. ESP32 scans RFID tag (Scan Mode)
2. ESP32 sends RFID UID to backend
3. Backend:
   - Looks up cow by RFID
   - Returns cow details + existing lane (if assigned today)
4. ESP32 displays: Cow name, Lane number
5. User records milking yield via frontend or ESP32

---

## Implementation Steps

### Step 1: Backend - Auto Lane Assignment Service
- Function to get next available lane for today
- Function to handle ESP32 scan with auto-assignment

### Step 2: Backend - ESP32 Scan Endpoint
- `POST /api/daily-lane-log/esp32-scan` (no auth for ESP32)
- Takes RFID UID
- Returns: cow details, assigned lane, feed suggestion

### Step 3: ESP32 Firmware Update
- Update Scan Mode handler to call new endpoint
- Display cow info, lane, feed suggestion on OLED

### Step 4: Frontend - Scan Event Handler (Optional)
- Component to show ESP32 scan events
- Allow editing/confirmation of feed/milking

---

## API Contracts

### ESP32 Scan Endpoint

**Endpoint:**
```
POST /api/daily-lane-log/esp32-scan
Content-Type: application/json
```

**Request:**
```json
{
  "rfid_uid": "C3E91F1E",
  "operation": "feed"  // or "milking"
}
```

**Response (200):**
```json
{
  "data": {
    "cow": {
      "cow_id": "COW-20251225-001",
      "name": "Bella",
      "cow_type": "normal",
      "breed": "Holstein"
    },
    "lane_no": 3,
    "feed_suggestion_kg": 4.5,
    "existing_entry": {
      "feed_given_kg": null,
      "morning_yield_l": null,
      "evening_yield_l": null
    }
  }
}
```

**Response (404):**
```json
{
  "error": "Cow not found for this RFID UID"
}
```

---

## Next Steps

1. Implement backend service for auto lane assignment
2. Create ESP32 scan endpoint
3. Update ESP32 firmware
4. Test end-to-end flow



