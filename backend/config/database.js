/**
 * PostgreSQL Database Connection
 * Uses Supabase as managed PostgreSQL
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Helper function to normalize connection string and handle SSL
function normalizeConnectionString(connectionString) {
  // If connection string contains IPv6, try to convert to use IPv4
  // Supabase provides both options, but we need IPv4 for Render compatibility
  if (connectionString.includes('[') && connectionString.includes(']')) {
    // IPv6 format: postgresql://user:pass@[ipv6]:5432/db
    // We'll keep it as is for now, but add ?pgbouncer=true to use connection pooling
    // Or parse and reconstruct with IPv4 if available
    console.log('⚠️  IPv6 connection string detected. Ensure Supabase connection uses IPv4 or pooling.');
  }
  
  // Remove any existing sslmode or ssl parameters from connection string
  // We'll handle SSL through the Pool's ssl option instead
  // This prevents conflicts and ensures rejectUnauthorized: false works
  connectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, '');
  connectionString = connectionString.replace(/[?&]ssl=[^&]*/g, '');
  
  // Clean up any double ? or & at the end
  connectionString = connectionString.replace(/[?&]+$/, '');
  
  return connectionString;
}

// Create connection pool configuration
let poolConfig;

// Check if .env file exists and has database configuration
const hasDatabaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '' && process.env.DATABASE_URL !== 'postgresql://user:password@host:port/database';
const hasDbHost = process.env.DB_HOST && process.env.DB_HOST.trim() !== '' && process.env.DB_HOST !== 'your-supabase-host';

if (hasDatabaseUrl) {
  // Normalize connection string (handle IPv6, remove conflicting SSL params)
  let normalizedUrl = normalizeConnectionString(process.env.DATABASE_URL);
  
  // Use connection string if provided
  // Important: For Supabase connection pooling, SSL is required
  // We set rejectUnauthorized: false to handle certificate chain issues
  poolConfig = {
    connectionString: normalizedUrl,
    // Supabase requires SSL - always enable it
    // rejectUnauthorized: false allows self-signed certificates in chain
    // This is needed for Supabase's SSL certificate setup, especially with pooling
    ssl: {
      rejectUnauthorized: false // Required for Supabase's SSL certificate chain
    }
  };
} else if (hasDbHost) {
  // Use individual config variables
  if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('❌ Database configuration error: DB_USER and DB_PASSWORD must be set when using DB_HOST');
    throw new Error('Database configuration incomplete. Please set DB_USER and DB_PASSWORD in .env file.');
  }
  
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
  console.error('\n❌ Database configuration error: DATABASE_URL or DB_HOST must be set in .env file');
  console.error('\n📝 To fix this:');
  console.error('1. Create a .env file in the backend/ directory');
  console.error('2. Copy env.example to .env: cp env.example .env');
  console.error('3. Get your Supabase connection string from: https://app.supabase.com/');
  console.error('   → Your Project → Settings → Database → Connection string');
  console.error('4. Update DATABASE_URL in .env with your actual connection string');
  console.error('   Format: postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres');
  console.error('   Note: URL-encode special characters in password (@ → %40, # → %23, etc.)\n');
  throw new Error('Database configuration missing. Please create .env file with DATABASE_URL or DB_HOST.');
}

const pool = new Pool({
  ...poolConfig,
  max: 10, // Reduced for Render free tier
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000, // Increased to 60 seconds for Supabase (especially after resume)
  // Add retry logic
  allowExitOnIdle: false,
  // Additional options for better connection handling
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  if (err.code === 'ENOTFOUND') {
    console.error('\n⚠️  DNS resolution failed. Possible issues:');
    console.error('1. Check your DATABASE_URL hostname is correct');
    console.error('2. Verify your Supabase project is active');
    console.error('3. Check your internet connection');
    console.error('4. Try using connection pooling: Use port 6543 with .pooler.supabase.com\n');
  } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
    console.error('\n⚠️  Connection timeout/refused. Possible issues:');
    console.error('1. Check your database host and port are correct');
    console.error('2. Verify firewall settings');
    console.error('3. Ensure Supabase project is not paused\n');
  } else if (err.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
    console.error('\n⚠️  SSL certificate error. This should be handled automatically.');
    console.error('If you see this, the SSL configuration may need adjustment.\n');
  }
  process.exit(-1);
});

export default pool;

