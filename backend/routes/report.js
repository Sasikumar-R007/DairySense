import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getDailyReportData, generatePDFReport } from '../services/reportService.js';
import pool from '../config/database.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/daily', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const data = await getDailyReportData(dateStr);
    res.json({ data });
  } catch (error) {
    console.error('Error fetching daily report logic:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

router.get('/daily/pdf', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const data = await getDailyReportData(dateStr);
    const pdfBuffer = await generatePDFReport(data);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="DairySense_Report_${dateStr}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

router.get('/master', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'Missing from and to dates' });
    }

    // CTE to get one row per date combining milk sum, feed sum, and distinct cows
    const result = await pool.query(`
      WITH dates AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date as rep_date
      ),
      milk_stats AS (
        SELECT date, SUM(milk_qty_litre) as total_milk 
        FROM (
          SELECT date, cow_id, session, milk_qty_litre,
                 ROW_NUMBER() OVER(PARTITION BY date, cow_id, session ORDER BY recorded_at DESC) as rn
          FROM milk_yield_log
          WHERE date BETWEEN $1 AND $2
        ) x WHERE rn = 1
        GROUP BY date
      ),
      feed_stats AS (
        SELECT date, SUM(quantity_kg) as total_feed, SUM(total_amount) as feed_cost
        FROM feed_log
        WHERE date BETWEEN $1 AND $2
        GROUP BY date
      ),
      cow_stats AS (
        SELECT COUNT(*) as active_cows
        FROM cows WHERE status = 'Active' OR is_active = true
      )
      SELECT 
        TO_CHAR(d.rep_date, 'YYYY-MM-DD') as date,
        COALESCE(m.total_milk, 0) as total_milk,
        COALESCE(f.total_feed, 0) as total_feed,
        COALESCE(f.feed_cost, 0) as feed_cost,
        (SELECT active_cows FROM cow_stats) as active_cows
      FROM dates d
      LEFT JOIN milk_stats m ON d.rep_date = m.date
      LEFT JOIN feed_stats f ON d.rep_date = f.date
      ORDER BY d.rep_date DESC
    `, [from, to]);

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching master report:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
