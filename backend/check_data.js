import pkg from 'pg';
import dns from 'dns';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

// Bypass local DNS blocking of Neon domains
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
  connectionString: process.env.DATABASE_URL.replace('sslmode=require', 'sslmode=disable'), // Testing with simpler string if needed, but keeping SSL for Neon
  ssl: { rejectUnauthorized: false }
});

async function checkData() {
  try {
    const cows = await pool.query("SELECT COUNT(*) FROM cows WHERE status = 'active'");
    const logs = await pool.query("SELECT COUNT(*) FROM daily_lane_log WHERE date = '2026-03-26'");
    const anyLogs = await pool.query("SELECT COUNT(*) FROM daily_lane_log");
    const feedMaster = await pool.query("SELECT COUNT(*) FROM feed_item_master");
    
    console.log('Active Cows:', cows.rows[0].count);
    console.log('Logs for 2026-03-26:', logs.rows[0].count);
    console.log('Total Logs:', anyLogs.rows[0].count);
    console.log('Feed Master Items:', feedMaster.rows[0].count);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkData();
