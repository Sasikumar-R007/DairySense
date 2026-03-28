import pkg from 'pg';
import dns from 'dns';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname && hostname.includes('neon.tech')) {
    if (options && options.all) {
      return callback(null, [{ address: '13.228.184.177', family: 4 }]);
    }
    return callback(null, '13.228.184.177', 4);
  }
  return originalLookup(hostname, options, callback);
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function listCows() {
  try {
    const result = await pool.query("SELECT cow_id, status, is_active FROM cows LIMIT 20");
    console.log('Cows in DB:');
    console.table(result.rows);
    
    const statusCounts = await pool.query("SELECT status, count(*) FROM cows GROUP BY status");
    console.log('Status Counts:');
    console.table(statusCounts.rows);
    
    const activeFlagCounts = await pool.query("SELECT is_active, count(*) FROM cows GROUP BY is_active");
    console.log('Is Active Counts:');
    console.table(activeFlagCounts.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

listCows();
