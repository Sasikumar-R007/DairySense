/**
 * Feed Routes
 * Farm-level feed logging API.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createFeedLog,
  getFeedLogByDate,
  getFeedItems,
  getFeedCategories,
  getAllFeedLogs
} from '../services/feedService.js';
import {
  getWeightGroups,
  getFeedRequirement,
  calculateDailyFeedRecommendation
} from '../services/feedAllocationService.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/categories', async (req, res) => {
  try {
    const categories = await getFeedCategories();
    res.json({ data: categories });
  } catch (error) {
    console.error('Error fetching feed categories:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/items', async (req, res) => {
  try {
    const items = await getFeedItems();
    res.json({ data: items });
  } catch (error) {
    console.error('Error fetching feed items:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/weight-groups', async (req, res) => {
  try {
    const groups = await getWeightGroups();
    res.json({ data: groups });
  } catch (error) {
    console.error('Error fetching weight groups:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/requirements/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const requirements = await getFeedRequirement(parseInt(groupId, 10));
    res.json({ data: requirements });
  } catch (error) {
    console.error('Error fetching feed requirements:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/recommendation/:cowId', async (req, res) => {
  try {
    const { cowId } = req.params;
    const recommendation = await calculateDailyFeedRecommendation(cowId);
    res.json({ data: recommendation });
  } catch (error) {
    console.error('Error calculating feed recommendation:', error);
    const statusCode = error.message.includes('not found') || error.message.includes('inactive') || error.message.includes('weight')
      ? 400
      : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.post('/log', async (req, res) => {
  try {
    const { date, items } = req.body;
    const createdLogs = await createFeedLog(date, items);
    res.status(201).json({
      message: 'Feed log saved successfully',
      data: createdLogs
    });
  } catch (error) {
    console.error('Error saving feed log:', error);
    const statusCode = error.message.includes('required') || error.message.includes('not found') || error.message.includes('must be')
      ? 400
      : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.get('/log', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required' });
    }

    const logs = await getFeedLogByDate(date);
    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching feed log:', error);
    const statusCode = error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.get('/all-logs', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const logs = await getAllFeedLogs(startDate, endDate);
    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching all feed logs:', error);
    res.status(500).json({ error: 'Failed to fetch feed records' });
  }
});

export default router;
