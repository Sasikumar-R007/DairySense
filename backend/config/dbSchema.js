/**
 * Database Schema Setup
 * Creates tables if they don't exist
 */

import pool from './database.js';

/**
 * Initialize database schema
 */
/**
 * Retry connection with exponential backoff
 */
async function connectWithRetry(maxRetries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      return client;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error; // Re-throw on final attempt
      }
      console.log(`⏳ Connection attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

export async function initializeSchema() {
  let client;
  try {
    console.log('🔄 Attempting to connect to database...');
    client = await connectWithRetry(3, 2000);
    console.log('✅ Database connection established');
  } catch (error) {
    const errorMessage = error.message || '';
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('terminated');
    
    if (error.code === 'ENOTFOUND') {
      console.error('\n❌ Cannot resolve database hostname. Please check:');
      console.error('1. Your DATABASE_URL in .env file is correct');
      console.error('2. The PostgreSQL host is valid and reachable');
      console.error('3. For local setup, confirm PostgreSQL is running on localhost');
      console.error('\nExample DATABASE_URL format:');
      console.error('postgresql://postgres:YOUR_PASSWORD@localhost:5432/dairysense_db\n');
    } else if (isTimeout || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error('\n❌ Connection timeout or refused. Possible issues:');
      console.error('1. PostgreSQL might not be running');
      console.error('2. The host or port in DATABASE_URL might be wrong');
      console.error('3. Check firewall settings');
      console.error('4. For local setup, verify localhost:5432 is accepting connections\n');
    } else if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.error('\n❌ SSL certificate error detected.');
      console.error('The SSL configuration may not match the current database.');
      console.error('If this error persists, try:');
      console.error('1. Restart the server (the SSL config has been updated)');
      console.error('2. Set DB_SSL=false for local PostgreSQL');
      console.error('3. Verify the connection string is correct\n');
    } else {
      console.error('\n❌ Database connection error:', error.message);
      console.error('Error code:', error.code);
      if (error.cause) {
        console.error('Underlying error:', error.cause.message);
      }
    }
    throw error;
  }
  
  try {
    // Create users table for authentication
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create cows table (master data)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cows (
        id SERIAL PRIMARY KEY,
        cow_id VARCHAR(255) UNIQUE NOT NULL,
        rfid_uid VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        cow_type VARCHAR(50) CHECK (cow_type IN ('normal', 'pregnant', 'dry')) DEFAULT 'normal',
        breed VARCHAR(255),
        date_of_birth DATE,
        purchase_date DATE,
        last_vaccination_date DATE,
        next_vaccination_date DATE,
        number_of_calves INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add rfid_uid column if it doesn't exist (for existing databases)
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'cows' AND column_name = 'rfid_uid'
        ) THEN
          ALTER TABLE cows ADD COLUMN rfid_uid VARCHAR(255) UNIQUE;
        END IF;
      END $$;
    `);

    // Create index for RFID lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cows_rfid_uid 
      ON cows(rfid_uid) WHERE rfid_uid IS NOT NULL
    `);

    // Create daily_lane_log table (core table)
    // Note: Foreign key constraint is commented out to allow existing data
    // We'll add it later after ensuring all cow_ids exist in cows table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_lane_log (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        lane_no INTEGER NOT NULL,
        cow_id VARCHAR(255) NOT NULL,
        cow_type VARCHAR(50) CHECK (cow_type IN ('normal', 'pregnant', 'dry')),
        feed_given_kg DECIMAL(10, 2),
        morning_yield_l DECIMAL(10, 2),
        evening_yield_l DECIMAL(10, 2),
        total_yield_l DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, lane_no, cow_id)
      )
    `);

    // Create cow_medications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cow_medications (
        id SERIAL PRIMARY KEY,
        cow_id VARCHAR(255) NOT NULL,
        medication_name VARCHAR(255) NOT NULL,
        date_given DATE NOT NULL,
        dosage VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_lane_log_date 
      ON daily_lane_log(date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_lane_log_cow_date 
      ON daily_lane_log(cow_id, date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_lane_log_lane_date 
      ON daily_lane_log(lane_no, date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cows_cow_id 
      ON cows(cow_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cow_medications_cow_id 
      ON cow_medications(cow_id)
    `);

    // ===== MONITORING MODULE TABLES (ADDITIVE ONLY) =====
    
    // Create daily_cow_metrics table (for aggregated metrics per cow per day)
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_cow_metrics (
        id SERIAL PRIMARY KEY,
        cow_id VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        feed_given_kg DECIMAL(10, 2),
        milk_yield_litre DECIMAL(10, 2),
        lane_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cow_id, date)
      )
    `);

    // Create cow_daily_status table (for status tracking)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cow_daily_status (
        id SERIAL PRIMARY KEY,
        cow_id VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        status VARCHAR(20) CHECK (status IN ('NORMAL', 'SLIGHT_DROP', 'ATTENTION')) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(cow_id, date)
      )
    `);

    // Create daily_farm_summary table (for farm-wide daily summaries)
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_farm_summary (
        id SERIAL PRIMARY KEY,
        date DATE UNIQUE NOT NULL,
        total_feed_kg DECIMAL(10, 2),
        total_milk_litre DECIMAL(10, 2),
        best_cow_id VARCHAR(255),
        lowest_cow_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for monitoring tables
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_cow_metrics_cow_id 
      ON daily_cow_metrics(cow_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_cow_metrics_date 
      ON daily_cow_metrics(date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cow_daily_status_cow_id 
      ON cow_daily_status(cow_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cow_daily_status_date 
      ON cow_daily_status(date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_farm_summary_date 
      ON daily_farm_summary(date)
    `);

    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Error initializing schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

