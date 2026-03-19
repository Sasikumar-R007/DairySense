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

    // Aggregating data per cow
    const result = await pool.query(`
      WITH cow_milk AS (
        SELECT cow_id, SUM(milk_qty_litre) as total_milk, COUNT(DISTINCT date) as milking_days
        FROM (
          SELECT date, cow_id, session, milk_qty_litre,
                 ROW_NUMBER() OVER(PARTITION BY date, cow_id, session ORDER BY recorded_at DESC) as rn
          FROM milk_yield_log
          WHERE date BETWEEN $1 AND $2
        ) x WHERE rn = 1
        GROUP BY cow_id
      ),
      cow_feed AS (
        SELECT cow_id, SUM(feed_given_kg) as total_feed
        FROM daily_lane_log
        WHERE date BETWEEN $1 AND $2
        GROUP BY cow_id
      )
      SELECT 
        c.cow_id,
        c.name,
        c.cow_type,
        c.status,
        COALESCE(m.total_milk, 0) as total_milk,
        COALESCE(m.milking_days, 0) as milking_days,
        COALESCE(f.total_feed, 0) as total_feed,
        CASE 
          WHEN COALESCE(m.milking_days, 0) > 0 
           THEN ROUND((COALESCE(m.total_milk, 0) / m.milking_days), 2)
          ELSE 0 
        END as avg_milk_per_day
      FROM cows c
      LEFT JOIN cow_milk m ON c.cow_id = m.cow_id
      LEFT JOIN cow_feed f ON c.cow_id = f.cow_id
      WHERE (COALESCE(m.total_milk, 0) > 0 OR COALESCE(f.total_feed, 0) > 0 OR c.status = 'active')
      ORDER BY m.total_milk DESC NULLS LAST
    `, [from, to]);

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching master report:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
