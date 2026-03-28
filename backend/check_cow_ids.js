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

async function checkCows() {
  try {
    const result = await pool.query("SELECT cow_id, cow_tag, status FROM cows WHERE cow_id LIKE '%0226%' OR cow_id LIKE '%P00%'");
    console.log('Cows matching pattern:');
    console.table(result.rows);
    
    const allCows = await pool.query("SELECT cow_id FROM cows LIMIT 10");
    console.log('Sample Cow IDs in DB:');
    console.table(allCows.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkCows();
