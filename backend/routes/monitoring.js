/**
 * Monitoring Routes
 * 
 * API endpoints for the Farmer Monitoring & Analysis module.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as monitoringService from '../services/monitoringService.js';

const router = express.Router();

/**
 * GET /api/monitoring/dashboard
 * Get dashboard summary data for a specific date
 * Query params: date (optional, defaults to today)
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const data = await monitoringService.getDashboardData(date || null);
    res.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/monitoring/cows
 * Get list of cows with today's metrics and status
 * Query params: date (optional, defaults to today)
 */
router.get('/cows', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const cows = await monitoringService.getCowsList(date || null);
    res.json(cows);
  } catch (error) {
    console.error('Error fetching cows list:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/monitoring/cows/:cowId
 * Get detailed information for a specific cow
 * Query params: date (optional, defaults to today)
 */
router.get('/cows/:cowId', authenticateToken, async (req, res) => {
  try {
    const { cowId } = req.params;
    const { date } = req.query;
    const data = await monitoringService.getCowDetail(cowId, date || null);
    res.json(data);
  } catch (error) {
    console.error('Error fetching cow detail:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/monitoring/summary
 * Get daily summary for a specific date
 * Query params: date (required)
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    const data = await monitoringService.getDailySummary(date);
    res.json(data);
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/monitoring/history
 * Get history log within date range
 * Query params: from (required), to (required)
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'From and to date parameters are required' });
    }
    const data = await monitoringService.getHistoryLog(from, to);
    res.json(data);
  } catch (error) {
    console.error('Error fetching history log:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

