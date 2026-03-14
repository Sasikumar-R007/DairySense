/**
 * PostgreSQL Database Connection
 * Supports local PostgreSQL, Render Postgres, and other managed providers.
 */

import dns from 'dns';
import dotenv from 'dotenv';
import pkg from 'pg';

const { Pool } = pkg;

dotenv.config();

if (typeof process.setDefaultResultOrder === 'function') {
  process.setDefaultResultOrder('ipv4first');
} else if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

function isConfigured(value, placeholder = '') {
  return Boolean(value && value.trim() !== '' && value !== placeholder);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function buildSslConfig() {
  const sslEnabled = parseBoolean(process.env.DB_SSL, false);

  if (!sslEnabled) {
    return false;
  }

  return {
    rejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, false),
  };
}

function sanitizeConnectionString(connectionString) {
  const normalized = new URL(connectionString);

  normalized.searchParams.delete('ssl');
  normalized.searchParams.delete('sslmode');

  return normalized.toString();
}

function describeConnectionTarget(connectionString) {
  try {
    const parsed = new URL(connectionString);
    const databaseName = parsed.pathname.replace(/^\//, '') || '(default)';
    const user = parsed.username ? decodeURIComponent(parsed.username) : '(default-user)';
    const port = parsed.port || '5432';
    return `${user}@${parsed.hostname}:${port}/${databaseName}`;
  } catch {
    return 'connection string';
  }
}

let poolConfig;

const hasDatabaseUrl = isConfigured(
  process.env.DATABASE_URL,
  'postgresql://user:password@host:port/database'
);
const hasDbHost = isConfigured(process.env.DB_HOST, 'your-postgres-host');

if (hasDatabaseUrl) {
  poolConfig = {
    connectionString: sanitizeConnectionString(process.env.DATABASE_URL),
  };

  console.log(`Database config: ${describeConnectionTarget(process.env.DATABASE_URL)}`);
} else if (hasDbHost) {
  if (
    !isConfigured(process.env.DB_USER, 'your-postgres-user') ||
    !isConfigured(process.env.DB_PASSWORD, 'your-postgres-password')
  ) {
    console.error('Database configuration error: DB_USER and DB_PASSWORD must be set when using DB_HOST');
    throw new Error('Database configuration incomplete. Please set DB_USER and DB_PASSWORD in backend/.env.');
  }

  poolConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };

  console.log(
    `Database config: ${process.env.DB_USER}@${process.env.DB_HOST}:${poolConfig.port}/${poolConfig.database}`
  );
} else {
  console.error('\nDatabase configuration error: DATABASE_URL or DB_HOST must be set in backend/.env');
  console.error('\nTo fix this:');
  console.error('1. Create backend/.env from backend/env.example');
  console.error('2. Set DATABASE_URL from your PostgreSQL provider');
  console.error('3. Or set DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD');
  console.error('4. Set DB_SSL=true when your provider requires SSL');
  throw new Error('Database configuration missing. Please configure PostgreSQL connection settings.');
}

const pool = new Pool({
  ...poolConfig,
  ssl: buildSslConfig(),
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 60000,
  allowExitOnIdle: false,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);

  if (err.code === 'ENOTFOUND') {
    console.error('\nDNS resolution failed. Check your database host and provider status.\n');
  } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
    console.error('\nConnection timeout/refused. Check host, port, firewall, and database availability.\n');
  } else if (err.code === 'ENETUNREACH') {
    console.error('\nNetwork unreachable. Check that the database host is reachable from this environment.\n');
  } else if (err.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
    console.error('\nSSL certificate error. Try DB_SSL=true and DB_SSL_REJECT_UNAUTHORIZED=false.\n');
  }

  process.exit(-1);
});

export default pool;
