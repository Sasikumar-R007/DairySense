import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting migration: cow_feed_log');
    
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS cow_feed_log (
          id SERIAL PRIMARY KEY,
          cow_id TEXT REFERENCES cows(cow_id),
          date DATE NOT NULL,
          session TEXT,
          feed_category TEXT,
          feed_type TEXT,
          quantity_kg DECIMAL(10,2),
          is_bulk BOOLEAN DEFAULT FALSE,
          bulk_id TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cow_feed_date ON cow_feed_log(date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cow_feed_cow ON cow_feed_log(cow_id);`);

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
