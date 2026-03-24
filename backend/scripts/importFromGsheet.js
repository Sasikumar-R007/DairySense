/**
 * Import Historical Data from Google Sheets
 * 
 * This script connects to the mapped Google Spreadsheet and imports 
 * the old 2-3 months records into the local PostgreSQL database.
 * 
 * Usage: node backend/scripts/importFromGsheet.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup env variables so we can access GOOGLE_SPREADSHEET_ID
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { readRows } from '../services/gsheetService.js';
import pool from '../config/database.js';

async function importHistoricalData() {
  console.log('🚀 Starting Historical Data Import from Google Sheets...');
  
  // Note: 'HistoricalLogs' needs to be the actual name of your sheet tab.
  // We read from A2 down to avoid headers. Make sure you adjust the range as needed!
  const SHEET_RANGE = 'HistoricalLogs!A2:H1000'; 
  
  const rows = await readRows(SHEET_RANGE);
  
  if (!rows || rows.length === 0) {
    console.log('⚠️ No data found or fails to connect. Ensure you setup credentials.json & the Sheet ID in .env');
    return;
  }
  
  console.log(`📊 Found ${rows.length} rows to import. Processing...`);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let imported = 0;
    
    for (const row of rows) {
      if (!row[0]) continue; // Skip empty rows
      
      // We assume your GSheet columns are ordered like this:
      // [Date, LaneNo, CowID, CowType, FeedGiven, MorningYield, EveningYield, TotalYield]
      // Adjust these indices according to the REAL layout of the client's Google Sheet!
      const date = row[0]; // Format: YYYY-MM-DD
      const laneNo = parseInt(row[1]) || 1;
      const cowId = row[2];
      const cowType = row[3] || 'normal';
      const feedGiven = parseFloat(row[4]) || 0;
      const morningYield = parseFloat(row[5]) || 0;
      const eveningYield = parseFloat(row[6]) || 0;
      const totalYield = parseFloat(row[7]) || (morningYield + eveningYield);
      
      if (!cowId) continue; // Skip if no cow ID

      // Validate cowType matches allowed enums
      const validTypes = ['normal', 'pregnant', 'dry', 'calf', 'milking'];
      const normalizedCowType = validTypes.includes(cowType.toLowerCase()) ? cowType.toLowerCase() : 'normal';

      await client.query(
        `INSERT INTO daily_lane_log 
         (date, lane_no, cow_id, cow_type, feed_given_kg, morning_yield_l, evening_yield_l, total_yield_l)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (date, lane_no, cow_id) 
         DO UPDATE SET 
           feed_given_kg = EXCLUDED.feed_given_kg,
           morning_yield_l = EXCLUDED.morning_yield_l,
           evening_yield_l = EXCLUDED.evening_yield_l,
           total_yield_l = EXCLUDED.total_yield_l`,
        [date, laneNo, cowId, normalizedCowType, feedGiven, morningYield, eveningYield, totalYield]
      );
      
      imported++;
    }
    
    await client.query('COMMIT');
    console.log(`✅ Successfully imported ${imported} historical records into PostgreSQL.`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error importing data:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

importHistoricalData();
