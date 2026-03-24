import pool from '../config/database.js';

async function wipeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Initiating database wipe...');
    await client.query('BEGIN');

    // Erase all transactional log tables ensuring cascading deletes drop interconnected records
    console.log('Erasing transaction logs (Milk, Feed, Medicine, Daily Summaries)...');
    await client.query('TRUNCATE TABLE daily_lane_log CASCADE');
    await client.query('TRUNCATE TABLE cow_medications CASCADE');
    await client.query('TRUNCATE TABLE feed_log CASCADE');
    await client.query('TRUNCATE TABLE milk_yield_log CASCADE');
    await client.query('TRUNCATE TABLE cow_medicine_log CASCADE');
    await client.query('TRUNCATE TABLE cow_activity_schedule CASCADE');
    await client.query('TRUNCATE TABLE daily_cow_metrics CASCADE');
    await client.query('TRUNCATE TABLE cow_daily_status CASCADE');
    await client.query('TRUNCATE TABLE daily_farm_summary CASCADE');

    // Erase Cows Master Table
    console.log('Erasing Cow registry...');
    await client.query('TRUNCATE TABLE cows CASCADE');

    // Erase all users EXCEPT admins
    console.log('Erasing staff accounts (Admin preservation active)...');
    const deleteUsersQuery = `DELETE FROM users WHERE role != 'admin'`;
    const userResult = await client.query(deleteUsersQuery);
    console.log(`Deleted ${userResult.rowCount} non-admin user accounts.`);

    await client.query('COMMIT');
    console.log('✅ Database successfully purged of all testing/dummy data!');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to wipe database:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

wipeDatabase();
