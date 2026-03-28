/**
 * Milk Routes
 * Parallel V2 milk yield logging API.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createMilkLog,
  getMilkLogByDate,
  getMilkLogByCow,
  getAllMilkLogs,
  deleteMilkLog
} from '../services/milkService.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/log', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required' });
    }

    const logs = await getMilkLogByDate(date);
    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching milk logs by date:', error);
    const statusCode = error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.get('/all-logs', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const logs = await getAllMilkLogs(startDate, endDate);
    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching all milk logs:', error);
    res.status(500).json({ error: 'Failed to fetch milk records' });
  }
});

router.post('/log', async (req, res) => {
  try {
    const { date, entries } = req.body;
    const createdLogs = await createMilkLog(date, entries);
    res.status(201).json({
      message: 'Milk log saved successfully',
      data: createdLogs
    });
  } catch (error) {
    console.error('Error saving milk log:', error);
    const statusCode = error.message.includes('required') || error.message.includes('not found') || error.message.includes('must be') || error.message.includes('inactive')
      ? 400
      : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.get('/cow/:cowId', async (req, res) => {
  try {
    const { cowId } = req.params;
    const logs = await getMilkLogByCow(cowId);
    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching milk logs by cow:', error);
    const statusCode = error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.delete('/log/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedLog = await deleteMilkLog(id);
    if (!deletedLog) return res.status(404).json({ error: 'Log not found' });
    res.json({ message: 'Milk log deleted successfully', data: deletedLog });
  } catch (error) {
    console.error('Error deleting milk log:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
