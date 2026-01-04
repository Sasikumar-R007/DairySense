/**
 * PostgreSQL Database Connection
 * Uses Supabase as managed PostgreSQL
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Helper function to convert IPv6 connection string to IPv4 if needed
function normalizeConnectionString(connectionString) {
  // If connection string contains IPv6, try to convert to use IPv4
  // Supabase provides both options, but we need IPv4 for Render compatibility
  if (connectionString.includes('[') && connectionString.includes(']')) {
    // IPv6 format: postgresql://user:pass@[ipv6]:5432/db
    // We'll keep it as is for now, but add ?pgbouncer=true to use connection pooling
    // Or parse and reconstruct with IPv4 if available
    console.log('⚠️  IPv6 connection string detected. Ensure Supabase connection uses IPv4 or pooling.');
  }
  
  // Add connection pooling parameters for better compatibility
  // Supabase recommends using transaction mode for connection pooling
  if (!connectionString.includes('?')) {
    connectionString += '?sslmode=require';
  } else if (!connectionString.includes('sslmode')) {
    connectionString += '&sslmode=require';
  }
  
  return connectionString;
}

// Create connection pool configuration
let poolConfig;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
  // Normalize connection string (handle IPv6, add SSL params)
  const normalizedUrl = normalizeConnectionString(process.env.DATABASE_URL);
  
  // Use connection string if provided
  poolConfig = {
    connectionString: normalizedUrl,
    // Supabase requires SSL - always enable it
    ssl: {
      rejectUnauthorized: false // Required for Supabase's SSL certificate
    }
  };
} else if (process.env.DB_HOST) {
  // Use individual config variables
  poolConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false // Required for Supabase
    }
  };
} else {
  console.error('❌ Database configuration error: DATABASE_URL or DB_HOST must be set in .env file');
  throw new Error('Database configuration missing. Please check your .env file.');
}

const pool = new Pool({
  ...poolConfig,
  max: 10, // Reduced for Render free tier
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000, // Increased to 20 seconds for Supabase
  // Add retry logic
  allowExitOnIdle: false,
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

