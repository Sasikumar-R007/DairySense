import pool from '../config/database.js';

async function migrate() {
  try {
    console.log('Adding is_active column to feed_item_master...');
    await pool.query(`
      ALTER TABLE feed_item_master 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);

    console.log('Adding is_active column to medicine_master...');
    await pool.query(`
      ALTER TABLE medicine_master 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);

    console.log('Migration complete. Columns verified.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
