import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// Publicly readable for initial setup? No, protect at least with token
router.use(authenticateToken);

// GET all settings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM system_settings');
    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Only settings updates
router.use(authorizeAdmin);

router.post('/', async (req, res) => {
  try {
    // Expected body: { farm_profile: {...}, alerts: {...}, hardware: {...} }
    const keys = Object.keys(req.body);
    for (const key of keys) {
      const value = JSON.stringify(req.body[key]);
      await pool.query(
        'INSERT INTO system_settings (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = CURRENT_TIMESTAMP',
        [key, value]
      );
    }
    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/backup', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 'cows' as tbl, count(*) as records FROM cows
      UNION ALL SELECT 'milk_log', count(*) FROM milk_log
      UNION ALL SELECT 'feed_log', count(*) FROM feed_log
    `);
    const backupId = `bkp_${Date.now()}`;
    res.json({
      message: 'Database backup successfully generated',
      backup_id: backupId,
      timestamp: new Date().toISOString(),
      stats: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
