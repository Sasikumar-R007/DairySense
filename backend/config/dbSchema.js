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
        mother_id VARCHAR(255),
        parent_id VARCHAR(255),
        cow_tag VARCHAR(50),
        rfid_uid VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        cow_type VARCHAR(50) CHECK (cow_type IN ('normal', 'pregnant', 'dry', 'calf', 'milking')) DEFAULT 'normal',
        breed VARCHAR(255),
        weight_kg INTEGER,
        source_type VARCHAR(50),
        date_of_birth DATE,
        purchase_date DATE,
        last_vaccination_date DATE,
        next_vaccination_date DATE,
        number_of_calves INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add mother_id column if it doesn't exist (for existing databases)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cows' AND column_name = 'mother_id'
        ) THEN
          ALTER TABLE cows ADD COLUMN mother_id VARCHAR(255);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cows' AND column_name = 'parent_id'
        ) THEN
          ALTER TABLE cows ADD COLUMN parent_id VARCHAR(255);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cows' AND column_name = 'cow_tag'
        ) THEN
          ALTER TABLE cows ADD COLUMN cow_tag VARCHAR(50);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cows' AND column_name = 'weight_kg'
        ) THEN
          ALTER TABLE cows ADD COLUMN weight_kg INTEGER;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cows' AND column_name = 'source_type'
        ) THEN
          ALTER TABLE cows ADD COLUMN source_type VARCHAR(50);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'cows' AND column_name = 'is_active'
        ) THEN
          ALTER TABLE cows ADD COLUMN is_active BOOLEAN DEFAULT true;
          UPDATE cows SET is_active = true WHERE is_active IS NULL;
        END IF;
      END $$;
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
        cow_type VARCHAR(50) CHECK (cow_type IN ('normal', 'pregnant', 'dry', 'calf', 'milking')),
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

    // Create farm-level feed category master
    await client.query(`
      CREATE TABLE IF NOT EXISTS feed_category_master (
        id SERIAL PRIMARY KEY,
        category_name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create farm-level feed item master
    await client.query(`
      CREATE TABLE IF NOT EXISTS feed_item_master (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES feed_category_master(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        default_unit VARCHAR(50) DEFAULT 'kg',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category_id, item_name)
      )
    `);

    // Create farm-level feed log
    await client.query(`
      CREATE TABLE IF NOT EXISTS feed_log (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        feed_item_id INTEGER NOT NULL REFERENCES feed_item_master(id) ON DELETE RESTRICT,
        quantity_kg DECIMAL(10, 2) NOT NULL,
        cost_per_unit DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        input_source VARCHAR(50) CHECK (input_source IN ('Purchased', 'Farm Produced')) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create parallel milk yield log for V2
    await client.query(`
      CREATE TABLE IF NOT EXISTS milk_yield_log (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        cow_id VARCHAR(255) NOT NULL,
        session VARCHAR(50) CHECK (session IN ('Morning', 'Evening')) NOT NULL,
        milk_qty_kg DECIMAL(10, 2) NOT NULL,
        milk_qty_litre DECIMAL(10, 2) NOT NULL,
        recorded_at TIMESTAMP NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create cow weight groups for advisory feed allocation
    await client.query(`
      CREATE TABLE IF NOT EXISTS cow_weight_groups (
        id SERIAL PRIMARY KEY,
        group_name VARCHAR(255) UNIQUE NOT NULL,
        min_weight INTEGER NOT NULL,
        max_weight INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create feed requirement rules per weight group
    await client.query(`
      CREATE TABLE IF NOT EXISTS feed_requirement_rules (
        id SERIAL PRIMARY KEY,
        weight_group_id INTEGER NOT NULL REFERENCES cow_weight_groups(id) ON DELETE CASCADE,
        feed_item_id INTEGER NOT NULL REFERENCES feed_item_master(id) ON DELETE CASCADE,
        required_qty_kg DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(weight_group_id, feed_item_id)
      )
    `);

    // Create V2 medicine master
    await client.query(`
      CREATE TABLE IF NOT EXISTS medicine_master (
        id SERIAL PRIMARY KEY,
        medicine_name VARCHAR(255) UNIQUE NOT NULL,
        category VARCHAR(50) CHECK (category IN ('Medicine', 'Supplement', 'Multivitamin', 'Treatment')) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create V2 cow medicine log
    await client.query(`
      CREATE TABLE IF NOT EXISTS cow_medicine_log (
        id SERIAL PRIMARY KEY,
        cow_id VARCHAR(255) NOT NULL,
        medicine_id INTEGER NOT NULL REFERENCES medicine_master(id) ON DELETE RESTRICT,
        administered_by VARCHAR(255) NOT NULL,
        date_given DATE NOT NULL,
        dosage VARCHAR(255) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create stage master for routine livestock activities
    await client.query(`
      CREATE TABLE IF NOT EXISTS cow_stage_master (
        id SERIAL PRIMARY KEY,
        stage_name VARCHAR(255) UNIQUE NOT NULL,
        stage_type VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create activity master mapped to stages
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_master (
        id SERIAL PRIMARY KEY,
        activity_name VARCHAR(255) NOT NULL,
        stage_id INTEGER NOT NULL REFERENCES cow_stage_master(id) ON DELETE CASCADE,
        description TEXT,
        frequency VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(activity_name, stage_id)
      )
    `);

    // Create cow activity schedule
    await client.query(`
      CREATE TABLE IF NOT EXISTS cow_activity_schedule (
        id SERIAL PRIMARY KEY,
        cow_id VARCHAR(255) NOT NULL,
        activity_id INTEGER NOT NULL REFERENCES activity_master(id) ON DELETE CASCADE,
        due_date DATE NOT NULL,
        status VARCHAR(50) CHECK (status IN ('Pending', 'Completed', 'Skipped')) NOT NULL DEFAULT 'Pending',
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
      CREATE INDEX IF NOT EXISTS idx_cows_mother_id
      ON cows(mother_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cows_parent_id
      ON cows(parent_id)
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cows_active_cow_tag_unique
      ON cows(cow_tag)
      WHERE is_active = true AND cow_tag IS NOT NULL
    `);

    // Expand cow_type checks for existing databases
    await client.query(`
      ALTER TABLE cows
      DROP CONSTRAINT IF EXISTS cows_cow_type_check
    `);

    await client.query(`
      ALTER TABLE cows
      ADD CONSTRAINT cows_cow_type_check
      CHECK (cow_type IN ('normal', 'pregnant', 'dry', 'calf', 'milking'))
    `);

    await client.query(`
      ALTER TABLE daily_lane_log
      DROP CONSTRAINT IF EXISTS daily_lane_log_cow_type_check
    `);

    await client.query(`
      ALTER TABLE daily_lane_log
      ADD CONSTRAINT daily_lane_log_cow_type_check
      CHECK (cow_type IN ('normal', 'pregnant', 'dry', 'calf', 'milking'))
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cow_medications_cow_id 
      ON cow_medications(cow_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feed_item_master_category_id
      ON feed_item_master(category_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feed_log_date
      ON feed_log(date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feed_log_feed_item_id
      ON feed_log(feed_item_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_milk_yield_log_date
      ON milk_yield_log(date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_milk_yield_log_cow_id
      ON milk_yield_log(cow_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feed_requirement_rules_weight_group_id
      ON feed_requirement_rules(weight_group_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_feed_requirement_rules_feed_item_id
      ON feed_requirement_rules(feed_item_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cow_medicine_log_cow_id
      ON cow_medicine_log(cow_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cow_medicine_log_date_given
      ON cow_medicine_log(date_given)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_master_stage_id
      ON activity_master(stage_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cow_activity_schedule_cow_id
      ON cow_activity_schedule(cow_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cow_activity_schedule_due_date
      ON cow_activity_schedule(due_date)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cow_activity_schedule_status
      ON cow_activity_schedule(status)
    `);

    // Seed feed categories
    await client.query(`
      INSERT INTO feed_category_master (category_name)
      VALUES
        ('Concentrated Feed'),
        ('Dry Fodder'),
        ('Green Fodder'),
        ('Supplements')
      ON CONFLICT (category_name) DO NOTHING
    `);

    // Seed feed items
    await client.query(`
      INSERT INTO feed_item_master (category_id, item_name, default_unit)
      SELECT c.id, seed.item_name, seed.default_unit
      FROM (
        VALUES
          ('Concentrated Feed', 'Husk (Channa)', 'kg'),
          ('Concentrated Feed', 'Orid Husk', 'kg'),
          ('Concentrated Feed', 'Groundnut Cake', 'kg'),
          ('Concentrated Feed', 'Corn Flour', 'kg'),
          ('Concentrated Feed', 'Rice Bran', 'kg'),
          ('Dry Fodder', 'Hay Stack', 'kg'),
          ('Concentrated Feed', 'SKM Cattle Feed', 'kg')
      ) AS seed(category_name, item_name, default_unit)
      JOIN feed_category_master c ON c.category_name = seed.category_name
      ON CONFLICT (category_id, item_name) DO NOTHING
    `);

    // Seed weight groups
    await client.query(`
      INSERT INTO cow_weight_groups (group_name, min_weight, max_weight)
      VALUES
        ('Group A', 200, 300),
        ('Group B', 300, 400),
        ('Group C', 400, 500),
        ('Group D', 500, 800)
      ON CONFLICT (group_name) DO NOTHING
    `);

    // Seed advisory feed requirement rules
    await client.query(`
      INSERT INTO feed_requirement_rules (weight_group_id, feed_item_id, required_qty_kg)
      SELECT g.id, i.id, seed.required_qty_kg
      FROM (
        VALUES
          ('Group A', 'Hay Stack', 6.00),
          ('Group A', 'Rice Bran', 1.50),
          ('Group B', 'Hay Stack', 8.00),
          ('Group B', 'Rice Bran', 2.00),
          ('Group C', 'Hay Stack', 10.00),
          ('Group C', 'Groundnut Cake', 2.50),
          ('Group D', 'Hay Stack', 12.00),
          ('Group D', 'SKM Cattle Feed', 3.00)
      ) AS seed(group_name, item_name, required_qty_kg)
      JOIN cow_weight_groups g ON g.group_name = seed.group_name
      JOIN feed_item_master i ON i.item_name = seed.item_name
      ON CONFLICT (weight_group_id, feed_item_id) DO NOTHING
    `);

    // Seed medicine master
    await client.query(`
      INSERT INTO medicine_master (medicine_name, category, description)
      VALUES
        ('Multivitamin', 'Multivitamin', 'General vitamin support'),
        ('Calcium Supplement', 'Supplement', 'Calcium support for dairy cows'),
        ('Deworming Treatment', 'Treatment', 'Routine deworming treatment'),
        ('Antibiotic Course', 'Medicine', 'Veterinary antibiotic medication')
      ON CONFLICT (medicine_name) DO NOTHING
    `);

    // Seed stage master
    await client.query(`
      INSERT INTO cow_stage_master (stage_name, stage_type, description)
      VALUES
        ('Pregnant Month 1', 'Pregnancy', 'Early pregnancy monitoring'),
        ('Pregnant Month 2', 'Pregnancy', 'Second month pregnancy care'),
        ('Pregnant Month 7', 'Pregnancy', 'Late pregnancy preparation'),
        ('Lactation', 'Production', 'Cow is in active milk production'),
        ('Calf', 'Growth', 'Calf growth and development stage')
      ON CONFLICT (stage_name) DO NOTHING
    `);

    // Seed stage activities
    await client.query(`
      INSERT INTO activity_master (activity_name, stage_id, description, frequency)
      SELECT seed.activity_name, s.id, seed.description, seed.frequency
      FROM (
        VALUES
          ('Vaccination', 'Pregnant Month 1', 'Routine pregnancy vaccination check', 'Once'),
          ('Supplement Feeding', 'Pregnant Month 2', 'Provide stage-specific supplements', 'Daily'),
          ('Delivery Preparation', 'Pregnant Month 7', 'Prepare for calving and observation', 'Weekly'),
          ('Stop Milking', 'Pregnant Month 7', 'Reduce and stop milking before delivery', 'Once'),
          ('Supplement Feeding', 'Lactation', 'Support milk production with supplements', 'Daily'),
          ('Vaccination', 'Calf', 'Routine calf vaccination reminder', 'As scheduled')
      ) AS seed(activity_name, stage_name, description, frequency)
      JOIN cow_stage_master s ON s.stage_name = seed.stage_name
      ON CONFLICT (activity_name, stage_id) DO NOTHING
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

