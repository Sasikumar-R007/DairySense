/**
 * Daily Lane Log Routes
 * All endpoints for managing daily lane logs
 */

import express from 'express';
import {
  recordFeed,
  recordMilkYield,
  getTodayLogs,
  getTodayEntryForCowLane
} from '../services/dailyLaneLogService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Record feed (Flow A)
router.post('/feed', async (req, res) => {
  try {
    const { laneNo, cowId, feedKg, cowType } = req.body;
    
    if (!laneNo || !cowId || feedKg === undefined) {
      return res.status(400).json({ 
        error: 'laneNo, cowId, and feedKg are required' 
      });
    }
    
    const result = await recordFeed(
      parseInt(laneNo),
      cowId,
      parseFloat(feedKg),
      cowType // Optional, will be fetched from cows table if not provided
    );
    
    res.json({ message: 'Feed recorded successfully', data: result });
  } catch (error) {
    console.error('Error recording feed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record milk yield (Flow B)
router.post('/milk-yield', async (req, res) => {
  try {
    const { cowId, session, yieldL } = req.body;
    
    if (!cowId || !session || yieldL === undefined) {
      return res.status(400).json({ 
        error: 'cowId, session (morning/evening), and yieldL are required' 
      });
    }
    
    if (session !== 'morning' && session !== 'evening') {
      return res.status(400).json({ 
        error: 'session must be either "morning" or "evening"' 
      });
    }
    
    await recordMilkYield(cowId, session, parseFloat(yieldL));
    
    res.json({ message: `${session} yield recorded successfully` });
  } catch (error) {
    console.error('Error recording milk yield:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get today's logs
router.get('/today', async (req, res) => {
  try {
    const logs = await getTodayLogs();
    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching today logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get entry for specific cow and lane today
router.get('/entry', async (req, res) => {
  try {
    const { laneNo, cowId } = req.query;
    
    if (!laneNo || !cowId) {
      return res.status(400).json({ 
        error: 'laneNo and cowId query parameters are required' 
      });
    }
    
    const entry = await getTodayEntryForCowLane(
      parseInt(laneNo),
      cowId
    );
    
    res.json({ data: entry || null });
  } catch (error) {
    console.error('Error fetching entry:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

