/**
 * PostgreSQL Database Connection
 * Uses Supabase as managed PostgreSQL
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool configuration
let poolConfig;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
  // Use connection string if provided
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : { rejectUnauthorized: false } // Supabase requires SSL
  };
} else if (process.env.DB_HOST) {
  // Use individual config variables
  poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : { rejectUnauthorized: false }
  };
} else {
  console.error('❌ Database configuration error: DATABASE_URL or DB_HOST must be set in .env file');
  throw new Error('Database configuration missing. Please check your .env file.');
}

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased to 10 seconds for Supabase
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

