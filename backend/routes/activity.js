/**
 * Activity Routes
 * Independent V2 stage-based activity and alert API.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  generateCowActivities,
  getPendingActivities,
  getCowActivities,
  updateActivityStatus
} from '../services/activityService.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/pending', async (req, res) => {
  try {
    const cowId = req.query.cowId || null;
    const activities = await getPendingActivities(cowId);
    res.json({ data: activities });
  } catch (error) {
    console.error('Error fetching pending activities:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/cow/:cowId', async (req, res) => {
  try {
    const { cowId } = req.params;
    const activities = await getCowActivities(cowId);
    res.json({ data: activities });
  } catch (error) {
    console.error('Error fetching cow activities:', error);
    const statusCode = error.message.includes('not found') ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.post('/complete', async (req, res) => {
  try {
    const { schedule_id, status, notes } = req.body;
    if (!schedule_id || !status) {
      return res.status(400).json({ error: 'schedule_id and status are required' });
    }

    const updated = await updateActivityStatus(parseInt(schedule_id, 10), status, notes || null);
    res.json({ message: 'Activity status updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating activity status:', error);
    const statusCode = error.message.includes('required') || error.message.includes('not found') || error.message.includes('status')
      ? 400
      : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { cow_id } = req.body;
    if (!cow_id) {
      return res.status(400).json({ error: 'cow_id is required' });
    }

    const generated = await generateCowActivities(cow_id);
    res.status(201).json({ message: 'Activities generated successfully', data: generated });
  } catch (error) {
    console.error('Error generating cow activities:', error);
    const statusCode = error.message.includes('required') || error.message.includes('not found') || error.message.includes('stage')
      ? 400
      : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
