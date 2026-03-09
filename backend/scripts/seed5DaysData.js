/**
 * 5 Days Dummy Data Seeder
 * 
 * This script creates 5 days of sample data for the performance/monitoring page.
 * It works with existing cows or creates sample cows if needed.
 * 
 * Usage: 
 *   Local: node scripts/seed5DaysData.js
 *   Or: npm run seed:5days
 */

import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

// Sample cows (will be created if they don't exist)
const sampleCows = [
  { cow_id: 'COW001', name: 'Bella', breed: 'Holstein', cow_type: 'normal' },
  { cow_id: 'COW002', name: 'Daisy', breed: 'Jersey', cow_type: 'normal' },
  { cow_id: 'COW003', name: 'Molly', breed: 'Holstein', cow_type: 'normal' },
  { cow_id: 'COW004', name: 'Luna', breed: 'Jersey', cow_type: 'normal' },
  { cow_id: 'COW005', name: 'Rosie', breed: 'Holstein', cow_type: 'normal' },
];

/**
 * Generate realistic daily data for a cow
 */
function generateDailyData(cowId, dayOffset) {
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  const dateStr = date.toISOString().split('T')[0];

  // Generate realistic milk and feed values with some variation
  const baseMilk = 18 + Math.random() * 4; // 18-22L
  const baseFeed = 7.5 + Math.random() * 1.5; // 7.5-9kg
  
  // Add some day-to-day variation
  const milkVariation = (Math.random() - 0.5) * 2; // -1 to +1
  const feedVariation = (Math.random() - 0.5) * 1; // -0.5 to +0.5
  
  const milk = Math.max(12, Math.min(25, baseMilk + milkVariation)); // Clamp between 12-25L
  const feed = Math.max(6, Math.min(10, baseFeed + feedVariation)); // Clamp between 6-10kg

  // Split milk into morning (60%) and evening (40%)
  const morningYield = milk * 0.6;
  const eveningYield = milk * 0.4;

  return {
    date: dateStr,
    lane_no: (dayOffset % 5) + 1, // Rotate lanes 1-5
    cow_id: cowId,
    cow_type: 'normal',
    feed_given_kg: parseFloat(feed.toFixed(2)),
    morning_yield_l: parseFloat(morningYield.toFixed(2)),
    evening_yield_l: parseFloat(eveningYield.toFixed(2)),
    total_yield_l: parseFloat(milk.toFixed(2))
  };
}

/**
 * Ensure cow exists in database
 */
async function ensureCow(cow) {
  try {
    await pool.query(`
      INSERT INTO cows (cow_id, name, breed, cow_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (cow_id) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        breed = EXCLUDED.breed,
        cow_type = EXCLUDED.cow_type
    `, [cow.cow_id, cow.name, cow.breed, cow.cow_type]);
    console.log(`  ✓ Cow ${cow.cow_id} (${cow.name})`);
  } catch (error) {
    console.error(`  ✗ Error ensuring cow ${cow.cow_id}:`, error.message);
  }
}

/**
 * Insert daily log entry
 */
async function insertDailyLog(data) {
  try {
    await pool.query(`
      INSERT INTO daily_lane_log 
        (date, lane_no, cow_id, cow_type, feed_given_kg, morning_yield_l, evening_yield_l, total_yield_l)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (date, lane_no, cow_id)
      DO UPDATE SET
        feed_given_kg = EXCLUDED.feed_given_kg,
        morning_yield_l = EXCLUDED.morning_yield_l,
        evening_yield_l = EXCLUDED.evening_yield_l,
        total_yield_l = EXCLUDED.total_yield_l,
        updated_at = CURRENT_TIMESTAMP
    `, [
      data.date,
      data.lane_no,
      data.cow_id,
      data.cow_type,
      data.feed_given_kg,
      data.morning_yield_l,
      data.evening_yield_l,
      data.total_yield_l
    ]);
  } catch (error) {
    console.error(`  ✗ Error inserting log for ${data.cow_id} on ${data.date}:`, error.message);
  }
}

/**
 * Main seeding function
 */
async function seed5DaysData() {
  console.log('\n🌱 Seeding 5 Days of Dummy Data...\n');

  try {
    // Step 1: Ensure sample cows exist
    console.log('📝 Step 1: Creating/updating sample cows...');
    for (const cow of sampleCows) {
      await ensureCow(cow);
    }

    // Step 2: Generate 5 days of data for each cow
    console.log('\n📊 Step 2: Generating 5 days of data...\n');
    
    let totalEntries = 0;
    for (const cow of sampleCows) {
      console.log(`  Generating data for ${cow.cow_id} (${cow.name})...`);
      
      // Generate data for last 5 days (including today)
      for (let dayOffset = 4; dayOffset >= 0; dayOffset--) {
        const data = generateDailyData(cow.cow_id, dayOffset);
        await insertDailyLog(data);
        totalEntries++;
      }
      
      console.log(`    ✓ 5 days of data created`);
    }

    console.log('\n✅ Seeding completed!\n');
    console.log('📋 Summary:');
    console.log(`  - ${sampleCows.length} cows processed`);
    console.log(`  - ${totalEntries} daily log entries created`);
    console.log(`  - Data range: Last 5 days (including today)\n`);
    console.log('💡 You can now view the data in:');
    console.log('   - Monitoring Dashboard: /monitoring');
    console.log('   - Cow Performance: /monitoring/cows\n');

  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the seeder
seed5DaysData();



