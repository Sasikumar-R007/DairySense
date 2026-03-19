/**
 * Dashboard Routes
 * Provides aggregated metrics for Phase 7 Smart Dashboard.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getTodayMilkSummary,
  getTodayFeedSummary,
  getCowStatusSummary,
  getActivitySummary,
  getPerformanceMetrics
} from '../services/dashboardService.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const requestedDate = req.query.date;
    const dateStr = requestedDate ? String(requestedDate) : new Date().toISOString().split('T')[0];

    const [
      milkSummary,
      feedSummary,
      cowSummary,
      activitySummary,
      performanceMetrics
    ] = await Promise.all([
      getTodayMilkSummary(dateStr),
      getTodayFeedSummary(dateStr),
      getCowStatusSummary(),
      getActivitySummary(),
      getPerformanceMetrics(dateStr)
    ]);

    res.json({
      milk: milkSummary,
      feed: feedSummary,
      cows: cowSummary,
      activities: activitySummary,
      performance: performanceMetrics
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
