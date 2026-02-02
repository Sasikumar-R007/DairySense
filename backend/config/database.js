/**
 * PostgreSQL Database Connection
 * Uses Supabase as managed PostgreSQL
 * Configured for Render deployment with IPv4 support
 */

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Force Node.js to prefer IPv4 over IPv6
// This is critical for Render free tier which doesn't support IPv6
import dns from 'dns';

if (typeof process.setDefaultResultOrder === 'function') {
  // Node.js 17.0.0+
  process.setDefaultResultOrder('ipv4first');
} else if (typeof dns.setDefaultResultOrder === 'function') {
  // Node.js 17.0.0+ (alternative method)
  dns.setDefaultResultOrder('ipv4first');
}

// Helper function to normalize connection string and parse it
function parseConnectionString(connectionString) {
  // Remove any existing sslmode or ssl parameters from connection string
  // We'll handle SSL through the Pool's ssl option instead
  connectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, '');
  connectionString = connectionString.replace(/[?&]ssl=[^&]*/g, '');
  connectionString = connectionString.replace(/[?&]+$/, '');
  
  // Parse the connection string
  // Format: postgresql://user:password@host:port/database
  const urlPattern = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
  const match = connectionString.match(urlPattern);
  
  if (match) {
    const [, user, password, hostname, port, database] = match;
    return {
      user: decodeURIComponent(user),
      password: decodeURIComponent(password),
      host: hostname,
      port: parseInt(port),
      database: database
    };
  }
  
  // If parsing fails, return null to use connection string directly
  return null;
}

// Create connection pool configuration
let poolConfig;

// Check if .env file exists and has database configuration
const hasDatabaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '' && process.env.DATABASE_URL !== 'postgresql://user:password@host:port/database';
const hasDbHost = process.env.DB_HOST && process.env.DB_HOST.trim() !== '' && process.env.DB_HOST !== 'your-supabase-host';

if (hasDatabaseUrl) {
  // Check if this is a Supabase connection pooling connection (port 6543)
  // For connection pooling, we should use the connection string directly
  // as Supabase handles authentication differently with the postgres.xxxxx format
  const isPoolingConnection = process.env.DATABASE_URL.includes(':6543') || 
                                process.env.DATABASE_URL.includes('.pooler.supabase.com');
  
  if (isPoolingConnection) {
    // For Supabase connection pooling, use connection string directly
    // The format postgres.xxxxx is the correct username format for pooling
    let normalizedUrl = process.env.DATABASE_URL
      .replace(/[?&]sslmode=[^&]*/g, '')
      .replace(/[?&]ssl=[^&]*/g, '')
      .replace(/[?&]+$/, '');
    
    poolConfig = {
      connectionString: normalizedUrl,
      ssl: {
        rejectUnauthorized: false // Required for Supabase's SSL certificate chain
      }
    };
    
    // Extract hostname for logging
    const hostMatch = normalizedUrl.match(/@([^:]+):(\d+)\//);
    const hostname = hostMatch ? hostMatch[1] : 'unknown';
    const port = hostMatch ? hostMatch[2] : 'unknown';
    
    console.log(`✅ Database config: Connection pooling (${hostname}:${port})`);
    console.log(`   Using IPv4 preference (Render compatibility)`);
  } else {
    // For direct connections, parse the connection string
    const parsed = parseConnectionString(process.env.DATABASE_URL);
    
    if (parsed) {
      poolConfig = {
        host: parsed.host,
        port: parsed.port,
        database: parsed.database,
        user: parsed.user,
        password: parsed.password,
        ssl: {
          rejectUnauthorized: false
        }
      };
      
      console.log(`✅ Database config: ${parsed.user}@${parsed.host}:${parsed.port}/${parsed.database}`);
      console.log(`   Using IPv4 preference (Render compatibility)`);
    } else {
      // Fallback to connection string if parsing fails
      let normalizedUrl = process.env.DATABASE_URL
        .replace(/[?&]sslmode=[^&]*/g, '')
        .replace(/[?&]ssl=[^&]*/g, '')
        .replace(/[?&]+$/, '');
      
      poolConfig = {
        connectionString: normalizedUrl,
        ssl: {
          rejectUnauthorized: false
        }
      };
      
      console.log(`✅ Using connection string directly`);
    }
  }
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
  
  console.log(`✅ Database config: ${process.env.DB_USER}@${process.env.DB_HOST}:${poolConfig.port}`);
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
  } else if (err.code === 'ENETUNREACH') {
    console.error('\n⚠️  Network unreachable (IPv6 detected).');
    console.error('Render free tier does not support IPv6 connections.');
    console.error('Solution: Ensure your DATABASE_URL uses connection pooling (port 6543)');
    console.error('Format: postgresql://postgres.xxxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres');
    console.error('Current connection: Check your DATABASE_URL environment variable\n');
  } else if (err.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
    console.error('\n⚠️  SSL certificate error. This should be handled automatically.');
    console.error('If you see this, the SSL configuration may need adjustment.\n');
  }
  process.exit(-1);
});

export default pool;
