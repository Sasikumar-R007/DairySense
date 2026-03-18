/**
 * Medicine Routes
 * Independent V2 medicine and supplement logging API.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getMedicines,
  addMedicine,
  logCowMedicine,
  getCowMedicineHistory
} from '../services/medicineService.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const medicines = await getMedicines();
    res.json({ data: medicines });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const medicine = await addMedicine(req.body);
    res.status(201).json({ message: 'Medicine added successfully', data: medicine });
  } catch (error) {
    console.error('Error adding medicine:', error);
    const statusCode = error.message.includes('required') || error.message.includes('category')
      ? 400
      : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.post('/log', async (req, res) => {
  try {
    const log = await logCowMedicine(req.body);
    res.status(201).json({ message: 'Medicine log saved successfully', data: log });
  } catch (error) {
    console.error('Error logging cow medicine:', error);
    const statusCode = error.message.includes('required') || error.message.includes('not found')
      ? 400
      : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.get('/cow/:cowId', async (req, res) => {
  try {
    const { cowId } = req.params;
    const history = await getCowMedicineHistory(cowId);
    res.json({ data: history });
  } catch (error) {
    console.error('Error fetching cow medicine history:', error);
    const statusCode = error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

export default router;
