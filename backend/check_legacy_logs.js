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

async function checkLegacyLogs() {
  try {
    const cowIds = ['H-0226-P006', 'H-0226-P007', 'H-0226-P005'];
    const logs = await pool.query(
      "SELECT * FROM daily_lane_log WHERE cow_id = ANY($1) AND date IN ('2026-03-23', '2026-03-24', '2026-03-26')", 
      [cowIds]
    );
    console.log('Legacy Daily Lane Logs:');
    console.table(logs.rows);
    
    const milkV2 = await pool.query(
      "SELECT * FROM milk_yield_log WHERE cow_id = ANY($1)", 
      [cowIds]
    );
    console.log('V2 Milk Logs (Any Date):');
    console.table(milkV2.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkLegacyLogs();
