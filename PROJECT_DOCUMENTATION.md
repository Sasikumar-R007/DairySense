# DairySense - Smart Dairy Monitoring System
## Complete Project Documentation

---

## 1. Project Overview

### Project Name
**DairySense** - Smart Dairy Monitoring System

### Core Problem Being Solved
Traditional dairy farm record-keeping relies on:
- Paper registers
- Memory-based tracking
- Manual calculations
- No real-time visibility
- Error-prone data entry
- Difficulty tracking individual cow performance over time

### High-Level Solution
A software-first dairy monitoring system that:
- Digitizes daily farm operations (feed distribution, milk yield)
- Uses QR codes on cow ear tags for identification
- Anchors operations to fixed lanes/poles in the dairy shed
- Provides real-time dashboard visibility
- Enables historical tracking and analytics per cow
- Works correctly regardless of operation order
- Requires minimal hardware (mobile device + weighing equipment)

---

## 2. Core Principles & Constraints

### Non-Negotiable Design Rules

1. **Lane is the Primary Anchor**
   - Lanes (fixed poles) never change
   - Cows can be tied to any lane on any day
   - No permanent cow-to-lane mapping
   - One row per cow per lane per day

2. **Daily Fresh Start**
   - Every day starts with a new table (log)
   - No assumptions about yesterday's cow-lane assignments
   - System only cares about TODAY's state
   - Historical data preserved but not assumed

3. **Order Independence**
   - Operations can be performed in any sequence
   - Lane 5 → Lane 2 → Lane 9 → Lane 1 (any order)
   - Feed first, milk later OR milk first, feed later
   - System handles partial data gracefully

4. **No Duplicate Rows**
   - Database constraint: UNIQUE(date, lane_no, cow_id)
   - Upsert logic prevents duplicates
   - Same cow + lane + day = one row (updated, not duplicated)

### Constraints

- **Cost**: Minimize hardware requirements (no electronics on baskets/lanes)
- **Simplicity**: Must be usable by farmers with minimal training
- **Scalability**: Works for 10 cows or 1000 cows
- **Reliability**: Data integrity even with partial operations

### Intentionally NOT Included (Current Version)

- ❌ Analytics dashboards (basic stats only)
- ❌ Charts/visualizations (except cow details graphs)
- ❌ Fixed cow-lane mapping
- ❌ Hardware integration code (abstracted for future)
- ❌ Multi-farm support
- ❌ User roles/permissions (single user authentication)
- ❌ Reports generation
- ❌ Mobile app (web-based only)

---

## 3. System Architecture

### Hardware Components (Conceptual - Not Implemented)

```
Dairy Shed:
├── Fixed Lanes/Poles (50+ lanes)
├── Feed Baskets (normal plastic baskets, no electronics)
├── Cow Ear Tags (QR code stickers)
├── Mobile Device/Scanner (for QR scanning)
├── Load Cell Weighing Unit (for feed measurement)
└── Milk Weighing Machine (for milk yield)
```

**Important**: Hardware is abstracted. Current implementation uses:
- QR scan → Text input (simulated)
- Load cell → Number input (simulated)
- Milk weighing → Number input (simulated)

### Software Components

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Landing  │  │Dashboard │  │  Pages   │             │
│  │   Page   │  │          │  │          │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│       │             │             │                    │
│  ┌──────────────────────────────────────┐             │
│  │     Components & Services             │             │
│  │  - QRScannerModal                     │             │
│  │  - ScanCow, RecordMilkYield           │             │
│  │  - LiveTable, CowsList                │             │
│  │  - API Service Layer                  │             │
│  └──────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘
                       │ HTTP REST API
                       │ JWT Authentication
┌─────────────────────────────────────────────────────────┐
│               BACKEND (Node.js/Express)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Routes  │  │ Services │  │Middleware│             │
│  │          │  │          │  │          │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│       │             │             │                    │
│  ┌──────────────────────────────────────┐             │
│  │   Business Logic Layer                │             │
│  │  - Cow Management                     │             │
│  │  - Daily Lane Log Operations          │             │
│  │  - Feed/Milk Recording                │             │
│  │  - History & Statistics               │             │
│  └──────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘
                       │
                       │ SQL Queries
┌─────────────────────────────────────────────────────────┐
│         DATABASE (PostgreSQL - Supabase Managed)         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │     cows     │  │daily_lane_log│  │cow_medications│ │
│  │              │  │              │  │              │ │
│  │ Master Data  │  │  Daily Ops   │  │   Health     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐                                      │
│  │    users     │                                      │
│  │ (Auth Only)  │                                      │
│  └──────────────┘                                      │
└─────────────────────────────────────────────────────────┘
```

### Data Flow - Daily Workflow

```
Day Starts (Fresh Log Table)
    │
    ├─→ Farmer goes to Lane 3
    │   ├─→ Scans cow ear tag QR code
    │   ├─→ System extracts Cow ID from QR
    │   ├─→ System fetches cow details (type, breed, etc.)
    │   ├─→ Shows suggested feed amount based on cow type
    │   ├─→ Farmer weighs feed (simulated: enters kg)
    │   └─→ System creates/updates row: (date, lane_3, cow_id, feed_kg)
    │
    ├─→ Farmer goes to Lane 8
    │   ├─→ Scans different cow
    │   └─→ Same process → New row or update
    │
    ├─→ Morning Milking
    │   ├─→ Farmer scans cow QR code
    │   ├─→ System finds today's row(s) for that cow
    │   ├─→ Farmer enters milk yield (liters)
    │   └─→ System updates: morning_yield_l, calculates total_yield_l
    │
    ├─→ Evening Milking
    │   └─→ Same process → Updates evening_yield_l, recalculates total
    │
    └─→ End of Day
        └─→ Dashboard shows complete daily log for all operations
```

---

## 4. Key Concepts & Terminology

### Lanes
- **Definition**: Fixed poles/structures in dairy shed where cows are tied
- **Properties**: Permanent, numbered (1, 2, 3...), never change
- **Role**: Primary anchor for data organization
- **Example**: "Lane 3", "Lane 15"

### Cow ID
- **Format**: `COW-YYYYMMDD-XXX` (e.g., `COW-20251225-001`)
- **Generation**: Auto-generated when adding new cow
- **Storage**: QR code contains this ID
- **Uniqueness**: Must be unique across all cows

### Daily Lane Log
- **Definition**: Core data table tracking all daily operations
- **Structure**: One row = one cow tied to one lane on one day
- **Key Fields**:
  - `date` (YYYY-MM-DD)
  - `lane_no` (integer)
  - `cow_id` (string)
  - `cow_type` (normal | pregnant | dry)
  - `feed_given_kg` (decimal, nullable)
  - `morning_yield_l` (decimal, nullable)
  - `evening_yield_l` (decimal, nullable)
  - `total_yield_l` (auto-calculated)
- **Constraint**: UNIQUE(date, lane_no, cow_id)

### Cow Type
- **Normal**: Standard lactating cow → Suggested feed: 4.5 kg
- **Pregnant**: Pregnant cow → Suggested feed: 2.5 kg
- **Dry**: Not lactating → Suggested feed: 3.0 kg

### QR Code Workflow
1. **Generation**: Backend generates QR code image (base64) containing cow ID
2. **Printing**: QR code printed as sticker, placed on ear tag
3. **Scanning**: Frontend uses `html5-qrcode` library to scan QR code
4. **Extraction**: Library extracts cow ID from QR code
5. **Mapping**: System fetches cow details using cow ID

### Upsert Logic
- **Definition**: "Update if exists, Insert if not"
- **Purpose**: Prevents duplicate rows
- **Implementation**: Check if row exists → Update OR Create
- **Used in**: Feed recording, milk yield recording

---

## 5. Daily Operational Workflow

### Morning Start (Fresh Day)

1. **System Behavior**:
   - New date = new log entries
   - No assumptions about previous day
   - Empty dashboard initially

2. **Farmer Actions** (in any order):
   ```
   Option A: Feed First
   ├─→ Scan cow QR at Lane 5
   ├─→ See suggested feed (based on cow type)
   ├─→ Weigh and enter feed amount
   └─→ System creates row: (today, lane_5, cow_id, feed_kg, null, null)

   Option B: Milk First (if cow already tied from yesterday)
   ├─→ Scan cow QR
   ├─→ System finds today's row (if feed already recorded) OR creates new
   ├─→ Enter morning milk yield
   └─→ System updates: morning_yield_l, calculates total_yield_l
   ```

### Feed Distribution Workflow (Flow A)

```
1. Farmer approaches lane with cow tied
2. Opens app → "Scan Cow & Feed" tab
3. Clicks "Scan QR Code" button
4. Camera opens (or manual input)
5. Scans QR code on ear tag
   ├─→ html5-qrcode extracts cow ID
   ├─→ System fetches cow details (API call)
   └─→ Modal shows: Cow ID, Name, Type, Suggested Feed
6. Selects lane number
7. System checks if row exists for (today, lane, cow)
   ├─→ If exists: Pre-fills feed amount (if already recorded)
   └─→ If not: Shows suggested feed based on cow type
8. Farmer weighs feed, enters amount (kg)
9. Clicks "Record Feed"
10. System upserts: Creates or updates row with feed_given_kg
```

### Milk Yield Recording Workflow (Flow B)

```
1. Farmer brings cow to milking area
2. Opens app → "Record Milk Yield" tab
3. Clicks "Scan QR Code" button
4. Scans cow QR code
   └─→ Extracts cow ID
5. Selects session: Morning OR Evening
6. Enters milk yield (liters)
7. Clicks "Record [Session] Yield"
8. System finds all today's rows for that cow
   └─→ Updates all rows (in case cow moved between lanes)
9. Updates morning_yield_l OR evening_yield_l
10. Auto-calculates total_yield_l = morning + evening
```

### End of Day

- Dashboard shows complete daily log
- All lanes with cows
- Feed given, milk yields, totals
- Real-time updates (polling every 5 seconds)

---

## 6. Decisions Already Made

### Technology Stack

**Backend**:
- ✅ Node.js + Express.js
- ✅ PostgreSQL (managed by Supabase)
- ✅ JWT authentication
- ✅ REST API architecture
- ✅ Business logic MUST live in backend (not frontend)

**Frontend**:
- ✅ React 18
- ✅ Vite (build tool)
- ✅ React Router DOM (routing)
- ✅ Recharts (for graphs/charts)
- ✅ html5-qrcode (for QR code scanning)

**Database**:
- ✅ PostgreSQL (via Supabase)
- ✅ No ORM (raw SQL queries)
- ✅ Connection pooling
- ✅ Automatic schema initialization

### Architecture Decisions

1. **Backend-First Design**
   - All business logic in backend services
   - Frontend is thin client (API calls only)
   - Never direct database access from frontend

2. **Table-Driven Data Model**
   - `daily_lane_log` as core operational table
   - `cows` as master data table
   - Foreign key relationships (soft - no hard constraints to allow existing data)

3. **Authentication**
   - JWT tokens
   - Email/password login
   - Tokens stored in localStorage
   - Protected routes require authentication

4. **QR Code Strategy**
   - Backend generates QR codes (base64 images)
   - Frontend displays images (no generation library needed)
   - Frontend scans QR codes (html5-qrcode library)

### Design Decisions

1. **No Hardware Integration Yet**
   - All inputs simulated (text/number inputs)
   - Hardware abstraction layer ready for future
   - No hard-coded hardware dependencies

2. **Real-time Updates**
   - Frontend polls backend every 5 seconds
   - Could upgrade to WebSockets later
   - Live table updates automatically

3. **Feed Suggestions**
   - Based on cow type only (simple logic)
   - Can be enhanced with more factors later
   - Currently: Normal=4.5kg, Pregnant=2.5kg, Dry=3.0kg

---

## 7. Known Problems / Old Flaws This Solves

### Traditional System Problems

1. **Paper Registers**
   - ❌ Easy to lose
   - ❌ Hard to search
   - ❌ No calculations/analytics
   - ✅ **Solution**: Digital records, searchable, auto-calculated

2. **Memory-Based Tracking**
   - ❌ Human error
   - ❌ Forgetting cow details
   - ❌ No history
   - ✅ **Solution**: System remembers everything, shows history

3. **Fixed Cow-Lane Mapping**
   - ❌ Assumes cows stay in same lane
   - ❌ Breaks when cow moves
   - ❌ No flexibility
   - ✅ **Solution**: Dynamic mapping, any cow to any lane

4. **Order-Dependent Operations**
   - ❌ Must follow specific sequence
   - ❌ Errors if order changes
   - ❌ Confusing for farmers
   - ✅ **Solution**: Works in any order, robust against partial data

5. **No Individual Cow Tracking**
   - ❌ Can't track individual performance
   - ❌ No health history
   - ❌ Hard to identify problem cows
   - ✅ **Solution**: Full history per cow, graphs, medication tracking

---

## 8. Current Status

### ✅ Completed

**Backend**:
- ✅ Database schema (cows, daily_lane_log, cow_medications, users)
- ✅ PostgreSQL connection and initialization
- ✅ JWT authentication system
- ✅ Cow CRUD API endpoints
- ✅ Daily lane log operations (feed, milk yield)
- ✅ QR code generation service
- ✅ Feed/milk history APIs
- ✅ Medication tracking APIs
- ✅ Upsert logic for preventing duplicates
- ✅ Auto-fetch cow type from cows table

**Frontend**:
- ✅ Landing page with login
- ✅ Protected routes
- ✅ Dashboard with navigation
- ✅ Add New Cow page (with QR generation)
- ✅ QR Scanner Modal component (with html5-qrcode)
- ✅ Scan Cow & Feed component (with QR scanning)
- ✅ Record Milk Yield component (with QR scanning)
- ✅ Live Table View (real-time updates)
- ✅ Cows List page (search, filter, view)
- ✅ Full Cow Details page (with graphs, history, edit)
- ✅ API service layer
- ✅ Authentication context

**Features**:
- ✅ QR code generation and display
- ✅ QR code scanning (camera-based)
- ✅ Feed recording workflow
- ✅ Milk yield recording workflow
- ✅ Cow management (CRUD)
- ✅ Historical data (feed/milk graphs)
- ✅ Statistics and analytics
- ✅ Medication tracking
- ✅ Vaccination date tracking

### 🚧 Pending / Planned

- ⏳ Camera QR scanning enhancement (currently basic implementation)
- ⏳ Hardware integration (when hardware is available)
- ⏳ Real-time updates via WebSockets (currently polling)
- ⏳ Advanced analytics/reports
- ⏳ Export functionality
- ⏳ Mobile app (PWA consideration)

### 🎯 Not Planned (Intentional)

- ❌ Multi-farm support
- ❌ Complex user roles
- ❌ Advanced reporting
- ❌ Hardware integration (until hardware is available)

---

## 9. Future Scope (Logical Extensions Only)

### Short-term (Realistic)

1. **Hardware Integration**
   - Replace simulated inputs with actual hardware
   - QR scanner device integration
   - Load cell integration
   - Milk weighing machine integration
   - **Keep**: Hardware abstraction layer intact

2. **Enhanced QR Scanning**
   - File upload QR scanning (scan from photo)
   - Better camera handling
   - Multiple QR format support

3. **Real-time Updates**
   - WebSocket implementation
   - Push notifications for updates

### Medium-term (If Needed)

1. **Advanced Analytics**
   - Performance trends
   - Feed efficiency metrics
   - Milk yield predictions
   - Health alerts

2. **Mobile App**
   - PWA (Progressive Web App)
   - Native mobile app
   - Offline support

3. **Export/Reporting**
   - PDF reports
   - Excel export
   - Email reports

### NOT in Scope (Keep Simple)

- ❌ Multi-tenant (multi-farm)
- ❌ Complex permission system
- ❌ Integration with other farm management systems
- ❌ IoT sensor integration (unless specifically requested)

---

## 10. How a New Agent Should Continue

### Expected Mindset

1. **Preserve Core Principles**
   - Lane is anchor - don't break this
   - Order independence - maintain this
   - Daily fresh start - keep this
   - No duplicate rows - enforce this

2. **Backend-First Thinking**
   - Business logic belongs in backend
   - Frontend is presentation layer
   - Never add database logic to frontend

3. **Simplicity First**
   - Don't over-engineer
   - Keep it farmer-friendly
   - Avoid unnecessary complexity

### What to Focus On Next

1. **Testing & Bug Fixes**
   - Test complete workflows
   - Fix any edge cases
   - Handle error scenarios

2. **Hardware Integration** (when ready)
   - Keep abstraction layer
   - Add hardware drivers
   - Don't change business logic

3. **Performance Optimization**
   - Database query optimization
   - Frontend performance
   - Real-time update efficiency

### What NOT to Break or Redesign

**DO NOT**:
- ❌ Change the daily_lane_log table structure without careful consideration
- ❌ Remove upsert logic (duplicate prevention)
- ❌ Add permanent cow-lane mapping
- ❌ Make operations order-dependent
- ❌ Move business logic to frontend
- ❌ Change authentication system without migration plan
- ❌ Break the QR code workflow
- ❌ Remove lane-based anchoring

**DO**:
- ✅ Follow existing code patterns
- ✅ Maintain separation of concerns (backend/frontend)
- ✅ Keep API consistent
- ✅ Add proper error handling
- ✅ Maintain code comments explaining logic
- ✅ Test changes thoroughly

### Key Files to Understand

**Backend**:
- `backend/services/dailyLaneLogService.js` - Core business logic
- `backend/services/cowService.js` - Cow management logic
- `backend/config/dbSchema.js` - Database structure
- `backend/routes/dailyLaneLog.js` - API endpoints

**Frontend**:
- `frontend/src/components/QRScannerModal.jsx` - QR scanning implementation
- `frontend/src/services/api.js` - API client layer
- `frontend/src/services/cowsAPI.js` - Cow API client
- `frontend/src/pages/Dashboard.jsx` - Main navigation

### Testing the System

1. **Create a cow** → Verify QR code generation
2. **Scan QR code** → Verify cow details appear
3. **Record feed** → Verify row created/updated
4. **Record milk yield** → Verify yield updated, total calculated
5. **View cow details** → Verify graphs and history
6. **Test order independence** → Feed → Milk OR Milk → Feed (both should work)

---

## Additional Notes

### Database Schema Details

**cows** table:
- Master cow data
- Stores: ID, name, type, breed, dates, calves, vaccinations
- Referenced by daily_lane_log

**daily_lane_log** table:
- Core operational table
- One row per cow per lane per day
- Tracks: feed, morning yield, evening yield, total yield
- Auto-calculates total_yield_l

**cow_medications** table:
- Medication history per cow
- Stores: medication name, date, dosage, notes

### API Endpoints Reference

**Authentication**:
- `POST /api/auth/register` - Create user
- `POST /api/auth/login` - Login (returns JWT)

**Cows**:
- `GET /api/cows` - List all cows
- `GET /api/cows/:cowId` - Get cow details
- `POST /api/cows` - Create cow (returns QR code)
- `PUT /api/cows/:cowId` - Update cow
- `GET /api/cows/:cowId/qr` - Get QR code image
- `GET /api/cows/:cowId/feed-history` - Feed history
- `GET /api/cows/:cowId/milk-history` - Milk history
- `GET /api/cows/:cowId/medications` - Medications
- `POST /api/cows/:cowId/medications` - Add medication

**Daily Operations**:
- `POST /api/daily-lane-log/feed` - Record feed
- `POST /api/daily-lane-log/milk-yield` - Record milk yield
- `GET /api/daily-lane-log/today` - Get today's logs
- `GET /api/daily-lane-log/entry?laneNo=X&cowId=Y` - Get specific entry

### Environment Setup

**Backend** (`.env`):
```
PORT=3001
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`.env` - optional):
```
VITE_API_URL=http://localhost:3001/api
```

---

## Quick Start for New Developer

1. **Clone/Open project**
2. **Backend**: `cd backend && npm install && npm run dev`
3. **Frontend**: `cd frontend && npm install && npm run dev`
4. **Database**: Configure Supabase connection in backend `.env`
5. **Create user**: Use `/api/auth/register` endpoint
6. **Login**: Use frontend login page
7. **Test workflow**: Add cow → Scan QR → Record feed → Record milk → View dashboard

---

**Document Version**: 1.0  
**Last Updated**: Based on current implementation state  
**Maintained By**: Development Team

