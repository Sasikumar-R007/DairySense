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

async function checkV2Logs() {
  try {
    const milkLogs = await pool.query("SELECT * FROM milk_yield_log WHERE date IN ('2026-03-23', '2026-03-24')");
    console.log('V2 Milk Logs (23rd-24th):');
    console.table(milkLogs.rows);
    
    const feedLogs = await pool.query("SELECT * FROM feed_log WHERE date IN ('2026-03-23', '2026-03-24')");
    console.log('V2 Feed Logs:');
    console.table(feedLogs.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkV2Logs();
