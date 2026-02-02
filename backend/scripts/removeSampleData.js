/**
 * Remove Sample Data Script
 * 
 * This script removes all sample data created by seedSampleData.js
 * 
 * Usage: node scripts/removeSampleData.js
 */

import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const sampleCowIds = ['COW001', 'COW002', 'COW003', 'COW004', 'COW005', 'COW006'];

async function removeSampleData() {
  console.log('\n🗑️  Removing sample data...\n');

  try {
    // Remove daily logs
    console.log('📊 Removing daily lane logs...');
    const deleteLogsResult = await pool.query(`
      DELETE FROM daily_lane_log 
      WHERE cow_id = ANY($1)
    `, [sampleCowIds]);
    console.log(`  ✅ Removed ${deleteLogsResult.rowCount} daily log entries`);

    // Remove cow daily status
    console.log('📈 Removing cow daily status records...');
    const deleteStatusResult = await pool.query(`
      DELETE FROM cow_daily_status 
      WHERE cow_id = ANY($1)
    `, [sampleCowIds]);
    console.log(`  ✅ Removed ${deleteStatusResult.rowCount} status records`);

    // Remove daily cow metrics
    console.log('📉 Removing daily cow metrics...');
    const deleteMetricsResult = await pool.query(`
      DELETE FROM daily_cow_metrics 
      WHERE cow_id = ANY($1)
    `, [sampleCowIds]);
    console.log(`  ✅ Removed ${deleteMetricsResult.rowCount} metric records`);

    // Remove cows (optional - comment out if you want to keep cow records)
    console.log('🐄 Removing sample cows...');
    const deleteCowsResult = await pool.query(`
      DELETE FROM cows 
      WHERE cow_id = ANY($1)
    `, [sampleCowIds]);
    console.log(`  ✅ Removed ${deleteCowsResult.rowCount} cow records`);

    console.log('\n✅ Sample data removal completed!\n');

  } catch (error) {
    console.error('\n❌ Error removing sample data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the cleanup
removeSampleData();

