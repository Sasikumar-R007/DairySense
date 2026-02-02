# Sample Data Seeder

This script populates the database with sample data for testing the Cow Performance analytics features.

## Usage

From the `backend` directory, run:

```bash
npm run seed
```

Or directly:

```bash
node scripts/seedSampleData.js
```

## What It Does

The script creates:

1. **6 Sample Cows** (if they don't exist):
   - COW001 - Bella (Normal performance)
   - COW002 - Daisy (Attention Required scenario)
   - COW003 - Molly (Observation Needed scenario)
   - COW004 - Luna (Good FCE scenario)
   - COW005 - Rosie (Heat Pattern scenario)
   - COW006 - Maggie (Poor FCE scenario)

2. **14 Days of Sample Data** for each cow with different scenarios:
   - **Normal**: Consistent milk (~18-22L) and feed (~7.5-9kg)
   - **Attention Required**: Today's milk dropped to 12L but feed remains normal (8.5kg)
   - **Observation Needed**: Both milk (14L) and feed (5.5kg) dropped today
   - **Poor FCE**: Lower milk (12-14L) with higher feed (9-10.5kg) = poor efficiency
   - **Good FCE**: Higher milk (22-25L) with lower feed (7-8kg) = good efficiency
   - **Heat Pattern**: Dips in milk and feed on today and 2 days ago

## Testing Scenarios

After running the seed script, you can test:

1. **Health Monitoring**:
   - COW002: Should show "Attention Required" (milk drop, feed normal)
   - COW003: Should show "Observation Needed" (both dropped)

2. **Digestive Efficiency**:
   - COW004: Should show "Good" FCE (~3.0-3.5 L/kg)
   - COW006: Should show "Poor" FCE (~1.3-1.5 L/kg)

3. **Heat Pattern Detection**:
   - COW005: Should detect "Possible Heat Pattern" (dips in last 3 days)

4. **Normal Performance**:
   - COW001: Should show "Normal" health status and baseline FCE (~2.0-2.5 L/kg)

## Removing Sample Data

To remove sample data, you can use the cleanup script:

```bash
npm run seed:remove
```

Or manually:

1. Delete specific cows:
   ```sql
   DELETE FROM cows WHERE cow_id IN ('COW001', 'COW002', 'COW003', 'COW004', 'COW005', 'COW006');
   ```

2. Delete their daily logs:
   ```sql
   DELETE FROM daily_lane_log WHERE cow_id IN ('COW001', 'COW002', 'COW003', 'COW004', 'COW005', 'COW006');
   ```

## Notes

- The script uses `ON CONFLICT` clauses, so it's safe to run multiple times
- Data is generated for the last 14 days from today
- Milk yields are split 60% morning / 40% evening
- All data is realistic but randomized within ranges

