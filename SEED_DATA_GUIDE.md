# How to Add Dummy Data to Performance Page

This guide explains how to add 5 days of dummy data for the performance/monitoring page, both locally and on a hosted website.

---

## Quick Start (Local Development)

### Step 1: Navigate to Backend Directory

```powershell
cd backend
```

### Step 2: Run the Seed Script

```powershell
npm run seed:5days
```

Or directly:

```powershell
node scripts/seed5DaysData.js
```

### Step 3: Verify Data

1. Start your backend server: `npm run dev`
2. Start your frontend: `cd ../frontend && npm run dev`
3. Login and navigate to **Monitoring Dashboard** or **Cow Performance**
4. You should see 5 days of data for 5 sample cows

---

## What the Script Does

The script creates:

1. **5 Sample Cows** (if they don't exist):
   - COW001 - Bella (Holstein)
   - COW002 - Daisy (Jersey)
   - COW003 - Molly (Holstein)
   - COW004 - Luna (Jersey)
   - COW005 - Rosie (Holstein)

2. **5 Days of Data** for each cow:
   - Feed given (6-10 kg per day)
   - Morning milk yield (60% of total)
   - Evening milk yield (40% of total)
   - Total milk yield (12-25L per day)
   - Lane assignments (rotating 1-5)

3. **Realistic Variations**:
   - Day-to-day variations in milk and feed
   - Different lane assignments per day
   - Realistic feed-to-milk ratios

---

## For Hosted Website (Production)

### Option 1: Using SSH/Command Line Access

If you have SSH access to your hosting server:

1. **Connect to your server:**
   ```bash
   ssh user@your-server.com
   ```

2. **Navigate to your project:**
   ```bash
   cd /path/to/your/project/backend
   ```

3. **Set environment variables** (if not already set):
   ```bash
   export DATABASE_URL="your-database-connection-string"
   ```

4. **Run the seed script:**
   ```bash
   npm run seed:5days
   ```

### Option 2: Using Hosting Platform Console

#### For Render.com:

1. Go to your backend service dashboard
2. Open **Shell** or **Console** tab
3. Run:
   ```bash
   cd backend
   npm run seed:5days
   ```

#### For Railway:

1. Go to your backend service
2. Open **Deployments** → **View Logs**
3. Or use **Settings** → **Generate Shell Command**
4. Run:
   ```bash
   npm run seed:5days
   ```

#### For Heroku:

1. Install Heroku CLI
2. Run:
   ```bash
   heroku run npm run seed:5days --app your-app-name
   ```

#### For Vercel/Netlify (Serverless):

These platforms don't support long-running scripts. You'll need to:

1. **Create an API endpoint** to trigger seeding:
   ```javascript
   // backend/routes/admin.js
   router.post('/seed-data', async (req, res) => {
     // Run seed script logic here
   });
   ```

2. **Call the endpoint** from your browser or Postman:
   ```
   POST https://your-api.vercel.app/api/admin/seed-data
   ```

### Option 3: Using Database Direct Access

If you have direct database access (Supabase, PostgreSQL, etc.):

1. **Connect to your database** using a client (pgAdmin, DBeaver, etc.)
2. **Run SQL queries** to insert data manually
3. Or use the **SQL Editor** in Supabase dashboard

---

## Manual SQL Insert (Alternative)

If you prefer to insert data directly via SQL:

```sql
-- Insert sample cows (if they don't exist)
INSERT INTO cows (cow_id, name, breed, cow_type)
VALUES 
  ('COW001', 'Bella', 'Holstein', 'normal'),
  ('COW002', 'Daisy', 'Jersey', 'normal'),
  ('COW003', 'Molly', 'Holstein', 'normal'),
  ('COW004', 'Luna', 'Jersey', 'normal'),
  ('COW005', 'Rosie', 'Holstein', 'normal')
ON CONFLICT (cow_id) DO NOTHING;

-- Insert 5 days of data for each cow
-- (Replace dates with actual dates - last 5 days)
INSERT INTO daily_lane_log 
  (date, lane_no, cow_id, cow_type, feed_given_kg, morning_yield_l, evening_yield_l, total_yield_l)
VALUES
  -- Day 1 (5 days ago)
  ('2025-01-10', 1, 'COW001', 'normal', 8.5, 12.0, 8.0, 20.0),
  ('2025-01-10', 2, 'COW002', 'normal', 7.8, 11.5, 7.5, 19.0),
  -- ... (add more entries)
  -- Day 5 (today)
  ('2025-01-14', 1, 'COW001', 'normal', 8.2, 12.5, 8.5, 21.0),
  ('2025-01-14', 2, 'COW002', 'normal', 7.9, 11.8, 7.8, 19.6)
ON CONFLICT (date, lane_no, cow_id) DO UPDATE SET
  feed_given_kg = EXCLUDED.feed_given_kg,
  morning_yield_l = EXCLUDED.morning_yield_l,
  evening_yield_l = EXCLUDED.evening_yield_l,
  total_yield_l = EXCLUDED.total_yield_l;
```

---

## Troubleshooting

### Error: "Cannot find module"

**Solution:** Make sure you're in the `backend` directory and dependencies are installed:
```bash
cd backend
npm install
npm run seed:5days
```

### Error: "Database connection failed"

**Solution:** Check your `.env` file has correct `DATABASE_URL`:
```env
DATABASE_URL=postgresql://user:password@host:port/database
```

### Error: "Table does not exist"

**Solution:** Make sure database schema is initialized:
```bash
# Start server once to initialize schema
npm run dev
# Then stop and run seed script
npm run seed:5days
```

### Data not showing in frontend

**Solution:**
1. Check backend is running
2. Check frontend API URL is correct
3. Verify you're logged in
4. Check browser console for errors
5. Verify data exists in database:
   ```sql
   SELECT COUNT(*) FROM daily_lane_log;
   SELECT * FROM daily_lane_log ORDER BY date DESC LIMIT 10;
   ```

---

## Removing Dummy Data

To remove the dummy data:

```bash
# Option 1: Use existing remove script (removes all sample data)
npm run seed:remove

# Option 2: Manual SQL
DELETE FROM daily_lane_log WHERE cow_id IN ('COW001', 'COW002', 'COW003', 'COW004', 'COW005');
DELETE FROM cows WHERE cow_id IN ('COW001', 'COW002', 'COW003', 'COW004', 'COW005');
```

---

## Customizing the Data

To modify the dummy data:

1. **Edit `backend/scripts/seed5DaysData.js`**
2. **Change number of days:**
   ```javascript
   // Change from 5 days to 7 days
   for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
   ```

3. **Change number of cows:**
   ```javascript
   // Add more cows to sampleCows array
   const sampleCows = [
     // ... existing cows
     { cow_id: 'COW006', name: 'Maggie', breed: 'Holstein', cow_type: 'normal' },
   ];
   ```

4. **Change data ranges:**
   ```javascript
   // Modify milk and feed ranges in generateDailyData()
   const baseMilk = 15 + Math.random() * 5; // 15-20L
   const baseFeed = 6 + Math.random() * 2; // 6-8kg
   ```

---

## Summary

✅ **Local:** `cd backend && npm run seed:5days`  
✅ **Hosted:** Use SSH/Console or create API endpoint  
✅ **Database:** Direct SQL insert if needed  

The script is safe to run multiple times - it uses `ON CONFLICT` to update existing data instead of creating duplicates.

---

## Next Steps

After seeding data:
1. ✅ View Monitoring Dashboard: `/monitoring`
2. ✅ View Cow Performance: `/monitoring/cows`
3. ✅ Click on any cow to see detailed analytics
4. ✅ Check date filters to see different days

Enjoy your dummy data! 🐄📊



