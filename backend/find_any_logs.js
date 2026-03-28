import pkg from 'pg';
import dns from 'dns';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (hostname && hostname.includes('neon.tech')) {
    return callback(null, '13.228.184.177', 4);
  }
  return originalLookup(hostname, options, callback);
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findData() {
  try {
    const milkRes = await pool.query("SELECT DISTINCT cow_id, date, milk_qty_kg FROM milk_yield_log ORDER BY date DESC LIMIT 50");
    console.log('Recent 50 entries in milk_yield_log:');
    console.table(milkRes.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

findData();
