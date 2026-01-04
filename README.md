# DairySense - Smart Dairy Monitoring System

A software-first Smart Dairy Monitoring System built around lanes as the primary anchor. Tracks feed distribution and milk yield with order-independent operations.

## Architecture

- **Frontend**: React 18 + Vite (calls REST API)
- **Backend**: Node.js + Express (all business logic)
- **Database**: PostgreSQL (managed by Supabase)
- **Authentication**: JWT tokens

## Project Structure

```
.
├── backend/                 # Express backend server
│   ├── config/             # Database config & schema
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── middleware/         # Auth middleware
│   └── server.js           # Entry point
├── frontend/               # React frontend
│   ├── src/                # Source code
│   ├── index.html
│   └── vite.config.js
└── README.md
```

## Quick Start

### 1. Database Setup (Supabase)

**Step 1:** Go to https://app.supabase.com/ and create a new project

**Step 2:** Get your database connection string:
- Go to **Settings → Database**
- Under **Connection string**, select **URI**
- Copy the connection string (format: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)
- **Replace `[YOUR-PASSWORD]` with your actual database password**

**Step 3:** That's it! No manual table creation needed - the backend will create tables automatically on first run.

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` file:
```env
PORT=3001
NODE_ENV=development

# Use the connection string from Supabase (replace [YOUR-PASSWORD])
DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.xxxxx.supabase.co:5432/postgres

# JWT Secret (use a random string for production)
JWT_SECRET=your-secret-key-change-this-in-production

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Important:** Make sure to:
- Replace `[YOUR-PASSWORD]` in the connection string with your actual password
- If your password contains special characters, URL-encode them (e.g., `@` becomes `%40`)

Start backend:
```bash
npm run dev
```

You should see:
```
✅ Connected to PostgreSQL database
✅ Database schema initialized
🚀 Server running on http://localhost:3001
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

(Optional) Create `frontend/.env` file:
```env
VITE_API_URL=http://localhost:3001/api
```

Start frontend:
```bash
npm run dev
```

### 4. Create First User

The backend doesn't have a default user. Create one using curl or Postman:

**Using curl:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"admin123\"}"
```

**Using Postman/Thunder Client:**
- Method: `POST`
- URL: `http://localhost:3001/api/auth/register`
- Headers: `Content-Type: application/json`
- Body:
  ```json
  {
    "email": "admin@example.com",
    "password": "admin123"
  }
  ```

Then login with these credentials in the frontend!

## Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user (returns JWT token)

### Daily Lane Log (requires authentication)
- `POST /api/daily-lane-log/feed` - Record feed
  ```json
  {
    "laneNo": 3,
    "cowId": "COW001",
    "cowType": "normal",
    "feedKg": 4.5
  }
  ```
- `POST /api/daily-lane-log/milk-yield` - Record milk yield
  ```json
  {
    "cowId": "COW001",
    "session": "morning",
    "yieldL": 6.2
  }
  ```
- `GET /api/daily-lane-log/today` - Get today's logs
- `GET /api/daily-lane-log/entry?laneNo=3&cowId=COW001` - Get specific entry

## Features

- **Lane-based Tracking**: Uses fixed lanes/poles as the anchor point
- **Feed Distribution**: Record feed given to cows by lane
- **Milk Yield Monitoring**: Track morning and evening milk yields
- **Dashboard**: View all daily activities
- **Order Independence**: Operations can be performed in any sequence
- **JWT Authentication**: Secure API access

## Core Workflows

### Flow A: Feed Distribution
1. Scan cow's ear tag (enter Cow ID)
2. Select lane number
3. Select cow type (normal/pregnant/dry)
4. System shows suggested feed amount
5. Enter feed weight (kg)
6. Record feed via API

### Flow B: Milk Yield Monitoring
1. Scan cow's ear tag
2. Select session (morning/evening)
3. Enter milk yield (liters)
4. System auto-calculates total yield

## Database Schema

Tables are created automatically on first run:

**Table: `daily_lane_log`**
- `id` (SERIAL PRIMARY KEY)
- `date` (DATE)
- `lane_no` (INTEGER)
- `cow_id` (VARCHAR)
- `cow_type` (normal | pregnant | dry)
- `feed_given_kg` (DECIMAL)
- `morning_yield_l` (DECIMAL)
- `evening_yield_l` (DECIMAL)
- `total_yield_l` (DECIMAL, auto-calculated)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- UNIQUE constraint: (date, lane_no, cow_id)

**Table: `users`**
- `id` (SERIAL PRIMARY KEY)
- `email` (VARCHAR, UNIQUE)
- `password_hash` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Important Notes

- ✅ All business logic lives in the backend
- ✅ Frontend never directly accesses the database
- ✅ Operations can be performed in any order
- ✅ No duplicate rows for same cow + lane + day (enforced by database constraint)
- ✅ JWT tokens are stored in localStorage
- ✅ Database tables are created automatically - no manual setup needed

## Troubleshooting

**Backend won't connect to database:**
- ✅ Check your `DATABASE_URL` is correct in `backend/.env`
- ✅ Make sure you replaced `[YOUR-PASSWORD]` with actual password
- ✅ URL-encode special characters in password (e.g., `@` → `%40`)
- ✅ Make sure Supabase project is active
- ✅ Verify the connection string format is correct

**Frontend can't connect to backend:**
- ✅ Make sure backend is running on port 3001
- ✅ Check `VITE_API_URL` in frontend `.env` (default is `http://localhost:3001/api`)
- ✅ Check browser console for CORS errors
- ✅ Verify backend is running: http://localhost:3001/health

**Authentication errors:**
- ✅ Make sure JWT_SECRET is set in backend `.env`
- ✅ Clear browser localStorage and login again
- ✅ Check that token is being sent in Authorization header
