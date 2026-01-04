# Hybrid RFID + QR Code System Documentation

## Overview

DairySense has evolved from a QR-code-only system to a **hybrid RFID + QR system** that provides both operational efficiency and flexible access control.

## System Evolution

### Previous System (QR-Only)

- **Primary Identification**: QR codes on cow ear tags
- **Access Method**: Camera-based QR scanning via mobile app
- **Use Case**: Feed and milk entry by authenticated farmers

### Current System (Hybrid RFID + QR)

- **Primary Identification**: RFID tags (via handheld reader hardware)
- **Secondary Access**: QR codes (view-only, public access)
- **Use Cases**:
  - **RFID**: Daily operations (feed entry, milk recording) by farmers
  - **QR**: Read-only access for vets, inspectors, owners, demo viewers

## Architecture

### Hardware Components

```
┌─────────────────────────────────────────────────────────┐
│              Handheld RFID Reader Device                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ ESP8266/ESP32│  │ RFID Reader  │  │ Display      │  │
│  │              │  │ Module       │  │ (OLED/LCD)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │ Mode Switch  │  │ LED          │                   │
│  │ (Reg/Scan)   │  │ Indicators   │                   │
│  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

**Hardware Capabilities:**

- Register new cows by binding RFID tag UID
- Identify cows using RFID during daily operations
- Display cow information on device screen
- Display QR code on device screen (for sharing)

### Software Integration

```
┌─────────────────────────────────────────────────────────┐
│                    Software System                        │
│                                                           │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │  RFID Workflow   │      │  QR Workflow     │         │
│  │  (Primary)       │      │  (Secondary)     │         │
│  │                  │      │                  │         │
│  │ 1. Scan RFID     │      │ 1. Scan QR Code │         │
│  │ 2. Lookup Cow    │      │ 2. View Profile  │         │
│  │ 3. Record Data   │      │ 3. Read-Only     │         │
│  │ 4. Display QR    │      │    Access        │         │
│  └──────────────────┘      └──────────────────┘         │
│                                                           │
│  ┌──────────────────────────────────────────┐           │
│  │         Backend API (Node.js/Express)     │           │
│  │  - RFID UID lookup                       │           │
│  │  - Cow management                         │           │
│  │  - Public read-only endpoints             │           │
│  └──────────────────────────────────────────┘           │
│                                                           │
│  ┌──────────────────────────────────────────┐           │
│  │      Database (PostgreSQL)                │           │
│  │  - cows.rfid_uid (unique)                 │           │
│  │  - cows.cow_id (for QR)                   │           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

## Data Model

### Database Schema Changes

**cows table:**

```sql
ALTER TABLE cows ADD COLUMN rfid_uid VARCHAR(255) UNIQUE;
CREATE INDEX idx_cows_rfid_uid ON cows(rfid_uid) WHERE rfid_uid IS NOT NULL;
```

**Key Fields:**

- `cow_id`: Internal cow identifier (used in QR codes)
- `rfid_uid`: RFID tag UID (primary identification, unique)
- All other fields remain unchanged

## Workflows

### 1. Cow Registration (Add New Cow)

**Flow:**

```
1. Farmer opens "Add Cow" page in dashboard
2. System auto-generates cow_id (e.g., COW-20251225-001)
3. Farmer scans RFID tag using hardware reader
   - Hardware sends RFID UID to software
   - Software validates UID is unique
4. Farmer enters cow details (name, breed, etc.)
5. System creates cow record with:
   - cow_id (for QR code)
   - rfid_uid (for RFID operations)
6. System generates QR code containing URL: /cow/{cow_id}
7. QR code can be printed and attached to ear tag
```

**API Endpoint:**

```
POST /api/cows
Body: {
  cow_id: "COW-20251225-001",
  rfid_uid: "A1B2C3D4E5F6",
  name: "Bella",
  breed: "Holstein",
  ...
}
Response: {
  data: { cow object },
  qr_code: "data:image/png;base64,..."
}
```

### 2. Daily Operations (Feed & Milk Entry)

**RFID-Based Workflow:**

```
1. Farmer approaches cow with handheld RFID reader
2. Reader scans RFID tag → Gets UID
3. Reader sends UID to backend API:
   GET /api/cows/rfid/{rfidUid}
4. Backend returns:
   - Cow details
   - QR code image (for display)
5. Reader displays:
   - Cow name/ID
   - Cow type
   - QR code (for sharing/viewing)
6. Farmer uses software dashboard to:
   - Record feed (with lane number)
   - Record milk yield
```

**Alternative (QR-Based - Fallback):**

```
1. If RFID unavailable, use QR scanner in app
2. Scan QR code → Extract cow_id
3. Lookup cow by cow_id
4. Proceed with feed/milk entry
```

**API Endpoints:**

```
GET /api/cows/rfid/{rfidUid}
Response: {
  data: { cow object },
  qr_code: "data:image/png;base64,..."
}

POST /api/daily-lane-log/feed
Body: {
  laneNo: 5,
  cowId: "COW-20251225-001",
  feedKg: 4.5
}
```

### 3. Public Read-Only Access (QR Code Scanning)

**Flow:**

```
1. Vet/Inspector/Owner scans QR code with phone camera
2. QR code contains URL: https://app.dairysense.com/cow/{cow_id}
3. Browser opens public profile page (no login required)
4. System fetches read-only profile:
   GET /api/cows/public/{cowId}/profile
5. Displays:
   - Cow ID, Name, Breed
   - Age, Health status
   - Recent feed summary (7 days)
   - Recent milk summary (7 days)
   - Vaccination dates
6. NO data entry capabilities
```

**API Endpoint:**

```
GET /api/cows/public/{cowId}/profile
(No authentication required)

Response: {
  data: {
    cow_id: "COW-20251225-001",
    name: "Bella",
    breed: "Holstein",
    cow_type: "normal",
    date_of_birth: "2020-01-15",
    last_vaccination_date: "2024-12-01",
    next_vaccination_date: "2025-03-01",
    number_of_calves: 2,
    recent_feed_summary: {
      days_tracked: 7,
      average_daily_feed_kg: 4.3
    },
    recent_milk_summary: {
      days_tracked: 7,
      average_daily_yield_l: 18.5
    }
  }
}
```

## Access Control

### Authentication Levels

| Access Type    | Method           | Authentication | Permissions                     |
| -------------- | ---------------- | -------------- | ------------------------------- |
| **Data Entry** | RFID + Dashboard | Required (JWT) | Full CRUD operations            |
| **Data Entry** | QR + Dashboard   | Required (JWT) | Full CRUD operations (fallback) |
| **View Only**  | QR Code Scan     | None           | Read-only profile               |

### Security Considerations

1. **RFID Endpoints**: Protected by JWT authentication
2. **Public Profile Endpoint**: No authentication, but:
   - Returns limited data only
   - No sensitive information
   - No data modification capabilities
   - Rate limiting recommended for production

## Hardware Integration

### RFID Reader Communication

**Expected Hardware Behavior:**

1. Hardware scans RFID tag → Gets UID
2. Hardware sends HTTP request to backend:
   ```
   GET /api/cows/rfid/{rfidUid}
   Headers: Authorization: Bearer {jwt_token}
   ```
3. Backend responds with cow data + QR code
4. Hardware displays:
   - Cow information on screen
   - QR code image (for sharing)

**Hardware API Requirements:**

- Must store JWT token (obtained via login)
- Must handle network errors gracefully
- Should cache cow data for offline use (optional)

### Mode Selection

**Hardware Modes:**

- **Register Mode**: Bind new RFID tag to new cow
- **Scan Mode**: Identify existing cow for daily operations

**Software Support:**

- Both modes use same API endpoints
- Register mode: Create cow with RFID UID
- Scan mode: Lookup cow by RFID UID

## QR Code Format

### Current Implementation

**QR Code Content:**

```
URL Format: {FRONTEND_URL}/cow/{cow_id}
Example: https://app.dairysense.com/cow/COW-20251225-001
```

**QR Code Generation:**

- Generated by backend when cow is created
- Contains URL pointing to public profile page
- Can be scanned by any QR code reader
- Opens in web browser (mobile or desktop)

## API Reference

### RFID Endpoints

#### Get Cow by RFID UID

```
GET /api/cows/rfid/:rfidUid
Headers: Authorization: Bearer {token}

Response 200:
{
  data: {
    cow_id: "COW-20251225-001",
    rfid_uid: "A1B2C3D4E5F6",
    name: "Bella",
    ...
  },
  qr_code: "data:image/png;base64,..."
}

Response 404:
{
  error: "Cow not found for this RFID UID"
}
```

### Public Endpoints

#### Get Public Cow Profile

```
GET /api/cows/public/:cowId/profile
(No authentication required)

Response 200:
{
  data: {
    cow_id: "COW-20251225-001",
    name: "Bella",
    breed: "Holstein",
    cow_type: "normal",
    recent_feed_summary: {...},
    recent_milk_summary: {...}
  }
}

Response 404:
{
  error: "Cow profile not found"
}
```

## Frontend Components

### 1. AddCow Component

- **New Field**: RFID UID input
- **Purpose**: Capture RFID tag during registration
- **Location**: `/add-cow` (protected route)

### 2. ScanCow Component

- **Primary Method**: RFID UID input (for hardware integration)
- **Secondary Method**: QR code scanning (fallback)
- **Purpose**: Identify cow for feed/milk entry
- **Location**: Dashboard → "Scan Cow & Record Feed"

### 3. CowPublicProfile Component

- **Access**: Public (no authentication)
- **Purpose**: Read-only cow profile viewing
- **Access Methods**:
  - QR code scanning
  - Direct URL: `/cow/{cow_id}`
  - Manual cow ID entry
- **Location**: `/cow` or `/cow/:cowId`

## Migration Guide

### For Existing Cows

1. **Existing cows without RFID:**

   - `rfid_uid` field is nullable
   - Can continue using QR codes
   - Can add RFID later via update

2. **Adding RFID to existing cows:**

   ```
   PUT /api/cows/:cowId
   Body: { rfid_uid: "A1B2C3D4E5F6" }
   ```

3. **Backward Compatibility:**
   - All existing QR codes still work
   - QR codes now point to public profile
   - No breaking changes to existing workflows

## Benefits of Hybrid System

1. **Operational Efficiency**

   - RFID: Faster, more reliable for daily operations
   - No need to position camera for scanning
   - Works in various lighting conditions

2. **Flexible Access**

   - QR: Easy sharing with vets, inspectors
   - No special hardware needed for viewing
   - Works on any smartphone

3. **Cost Effective**

   - RFID: One-time hardware investment
   - QR: No additional cost (printed stickers)
   - Both methods complement each other

4. **User Experience**
   - Farmers: Fast RFID scanning
   - Visitors: Simple QR code access
   - No login required for viewing

## Future Enhancements

1. **Hardware Integration**

   - Direct API integration with RFID reader
   - Real-time data sync
   - Offline mode support

2. **Enhanced QR Features**

   - QR code with embedded data (offline viewing)
   - Multiple QR formats (NFC, etc.)

3. **Analytics**
   - Track RFID vs QR usage
   - Monitor access patterns
   - Performance metrics

## Troubleshooting

### RFID Not Found

- **Issue**: RFID UID not registered
- **Solution**: Register cow with RFID UID first

### QR Code Not Working

- **Issue**: QR code URL incorrect
- **Solution**: Check FRONTEND_URL environment variable

### Public Profile Not Loading

- **Issue**: CORS or network error
- **Solution**: Verify public endpoint is accessible without auth

## Support

For hardware integration questions or API issues, refer to:

- `PROJECT_DOCUMENTATION.md` - Full system documentation
- `README.md` - Setup and quick start guide
- Backend API logs for debugging

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-25  
**System**: DairySense Hybrid RFID + QR
