/**
 * Sample Data Seeder
 * 
 * This script inserts sample data for testing the Cow Performance analytics.
 * Run this script to populate the database with test data.
 * 
 * Usage: node scripts/seedSampleData.js
 */

import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

// Sample cows data
const sampleCows = [
  { cow_id: 'COW001', name: 'Bella', breed: 'Holstein', cow_type: 'normal', status: 'active' },
  { cow_id: 'COW002', name: 'Daisy', breed: 'Jersey', cow_type: 'normal', status: 'active' },
  { cow_id: 'COW003', name: 'Molly', breed: 'Holstein', cow_type: 'normal', status: 'active' },
  { cow_id: 'COW004', name: 'Luna', breed: 'Jersey', cow_type: 'normal', status: 'active' },
  { cow_id: 'COW005', name: 'Rosie', breed: 'Holstein', cow_type: 'normal', status: 'active' },
  { cow_id: 'COW006', name: 'Maggie', breed: 'Holstein', cow_type: 'normal', status: 'active' },
];

/**
 * Generate sample data for a cow based on scenario
 */
function generateCowData(cowId, scenario, baseDate, dayOffset) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() - dayOffset);
  const dateStr = date.toISOString().split('T')[0];

  let milk, feed;

  switch (scenario) {
    case 'normal':
      // Normal performance: ~20L milk, ~8kg feed (FCE ~2.5)
      milk = 18 + Math.random() * 4; // 18-22L
      feed = 7.5 + Math.random() * 1.5; // 7.5-9kg
      break;

    case 'attention_required':
      // Milk dropped but feed normal (health issue)
      if (dayOffset === 0) {
        milk = 12; // Today: dropped to 12L (60% of normal)
        feed = 8.5; // Feed still normal
      } else {
        milk = 18 + Math.random() * 4; // Previous days normal
        feed = 7.5 + Math.random() * 1.5;
      }
      break;

    case 'observation_needed':
      // Both feed and milk dropped
      if (dayOffset === 0) {
        milk = 14; // Today: dropped
        feed = 5.5; // Today: dropped
      } else {
        milk = 18 + Math.random() * 4;
        feed = 7.5 + Math.random() * 1.5;
      }
      break;

    case 'poor_fce':
      // Poor feed conversion efficiency
      milk = 12 + Math.random() * 2; // Lower milk
      feed = 9 + Math.random() * 1.5; // Higher feed (FCE ~1.3-1.5)
      break;

    case 'good_fce':
      // Good feed conversion efficiency
      milk = 22 + Math.random() * 3; // Higher milk
      feed = 7 + Math.random() * 1; // Lower feed (FCE ~3.0-3.5)
      break;

    case 'heat_pattern':
      // Heat pattern: dips in milk and feed
      if (dayOffset === 0 || dayOffset === 2) {
        // Today and 2 days ago: dips
        milk = 13 + Math.random() * 2; // 13-15L (dip)
        feed = 6 + Math.random() * 1; // 6-7kg (dip)
      } else {
        milk = 18 + Math.random() * 4; // Normal
        feed = 7.5 + Math.random() * 1.5;
      }
      break;

    default:
      milk = 18 + Math.random() * 4;
      feed = 7.5 + Math.random() * 1.5;
  }

  // Split milk into morning and evening (60% morning, 40% evening)
  const morningYield = milk * 0.6;
  const eveningYield = milk * 0.4;

  return {
    date: dateStr,
    lane_no: Math.floor(Math.random() * 5) + 1, // Lane 1-5
    cow_id: cowId,
    cow_type: 'normal',
    feed_given_kg: parseFloat(feed.toFixed(2)),
    morning_yield_l: parseFloat(morningYield.toFixed(2)),
    evening_yield_l: parseFloat(eveningYield.toFixed(2)),
    total_yield_l: parseFloat(milk.toFixed(2))
  };
}

/**
 * Insert or update cow in database
 */
async function ensureCow(cow) {
  try {
    await pool.query(`
      INSERT INTO cows (cow_id, name, breed, cow_type, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (cow_id) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        breed = EXCLUDED.breed,
        cow_type = EXCLUDED.cow_type,
        status = EXCLUDED.status
    `, [cow.cow_id, cow.name, cow.breed, cow.cow_type, cow.status]);
    console.log(`✅ Cow ${cow.cow_id} (${cow.name}) ensured`);
  } catch (error) {
    console.error(`❌ Error ensuring cow ${cow.cow_id}:`, error.message);
  }
}

/**
 * Insert sample daily lane log data
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
    console.error(`❌ Error inserting log for ${data.cow_id} on ${data.date}:`, error.message);
  }
}

/**
 * Main seeding function
 */
async function seedSampleData() {
  console.log('\n🌱 Starting sample data seeding...\n');

  try {
    // Ensure all sample cows exist
    console.log('📝 Ensuring sample cows exist...');
    for (const cow of sampleCows) {
      await ensureCow(cow);
    }

    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Generate data for last 14 days for each cow
    console.log('\n📊 Generating sample data for last 14 days...\n');

    const scenarios = [
      { cow_id: 'COW001', scenario: 'normal' },
      { cow_id: 'COW002', scenario: 'attention_required' },
      { cow_id: 'COW003', scenario: 'observation_needed' },
      { cow_id: 'COW004', scenario: 'good_fce' },
      { cow_id: 'COW005', scenario: 'heat_pattern' },
      { cow_id: 'COW006', scenario: 'poor_fce' },
    ];

    for (const { cow_id, scenario } of scenarios) {
      console.log(`  Generating data for ${cow_id} (${scenario})...`);
      
      for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
        const data = generateCowData(cow_id, scenario, today, dayOffset);
        await insertDailyLog(data);
      }
      
      console.log(`  ✅ ${cow_id} data generated`);
    }

    console.log('\n✅ Sample data seeding completed!\n');
    console.log('📋 Summary:');
    console.log('  - COW001: Normal performance (baseline)');
    console.log('  - COW002: Attention Required (milk drop, feed normal)');
    console.log('  - COW003: Observation Needed (both milk and feed dropped)');
    console.log('  - COW004: Good FCE (high efficiency - 22-25L milk, 7-8kg feed)');
    console.log('  - COW005: Heat Pattern (dips detected in last 3 days)');
    console.log('  - COW006: Poor FCE (low efficiency - 12-14L milk, 9-10.5kg feed)\n');
    console.log('💡 You can now test the analytics features in the Cow Performance page!');
    console.log('   Navigate to: /monitoring/cows and click on any cow to see details.\n');

  } catch (error) {
    console.error('\n❌ Error seeding sample data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the seeder
seedSampleData();

