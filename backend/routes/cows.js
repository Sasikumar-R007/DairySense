/**
 * Cows Routes
 * All endpoints for managing cows
 */

import express from 'express';
import {
  generateCowId,
  generateQRCode,
  createCow,
  getCowById,
  getCowByRfidUid,
  getAllCows,
  updateCow,
  getCowFeedHistory,
  getCowMilkHistory,
  getCowMedications,
  addMedication,
  getCowReadOnlyProfile
} from '../services/cowService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public read-only endpoint for QR code access (no authentication required)
// This must be defined BEFORE the authentication middleware
router.get('/public/:cowId/profile', async (req, res) => {
  try {
    const { cowId } = req.params;
    const profile = await getCowReadOnlyProfile(cowId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Cow profile not found' });
    }
    
    res.json({ data: profile });
  } catch (error) {
    console.error('Error fetching cow profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY: RFID endpoint without authentication (for ESP hardware testing)
// TODO: Re-enable authentication after ESP JWT implementation
router.get('/rfid/:rfidUid', async (req, res) => {
  try {
    const { rfidUid } = req.params;
    const cow = await getCowByRfidUid(rfidUid);
    
    if (!cow) {
      return res.status(404).json({ error: 'Cow not found for this RFID UID' });
    }
    
    // Generate QR code for display on hardware device
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const qrDataUrl = await generateQRCode(cow.cow_id, frontendUrl);
    
    res.json({ 
      data: cow,
      qr_code: qrDataUrl  // QR code to display on RFID reader device
    });
  } catch (error) {
    console.error('Error fetching cow by RFID:', error);
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY: Endpoint for hardware to register pending RFID scan (for linking)
// Hardware sends RFID UID here, frontend polls for it
import { 
  storePendingRfidScan, 
  getPendingRfidScan, 
  getAllPendingRfidScans,
  removePendingRfidScan 
} from '../services/rfidLinkService.js';

// Hardware endpoint: Register pending RFID scan
router.post('/rfid/pending', async (req, res) => {
  try {
    const { rfid_uid } = req.body;
    
    if (!rfid_uid) {
      return res.status(400).json({ error: 'rfid_uid is required' });
    }
    
    // Check if RFID is already linked to a cow
    const existingCow = await getCowByRfidUid(rfid_uid);
    if (existingCow) {
      return res.status(400).json({ 
        error: 'RFID UID is already linked to a cow',
        cow_id: existingCow.cow_id 
      });
    }
    
    // Store as pending scan
    const pendingScan = storePendingRfidScan(rfid_uid, 10); // 10 minute TTL
    
    res.json({ 
      message: 'RFID scan registered for linking',
      data: pendingScan
    });
  } catch (error) {
    console.error('Error registering pending RFID scan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Frontend endpoint: Get pending RFID scans (for polling)
router.get('/rfid/pending', async (req, res) => {
  try {
    const pendingScans = getAllPendingRfidScans();
    res.json({ data: pendingScans });
  } catch (error) {
    console.error('Error fetching pending RFID scans:', error);
    res.status(500).json({ error: error.message });
  }
});

// Frontend endpoint: Get specific pending RFID scan
router.get('/rfid/pending/:rfidUid', async (req, res) => {
  try {
    const { rfidUid } = req.params;
    const pendingScan = getPendingRfidScan(rfidUid);
    
    if (!pendingScan) {
      return res.status(404).json({ error: 'Pending RFID scan not found or expired' });
    }
    
    res.json({ data: pendingScan });
  } catch (error) {
    console.error('Error fetching pending RFID scan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Frontend endpoint: Remove pending RFID scan (after successful linking)
router.delete('/rfid/pending/:rfidUid', async (req, res) => {
  try {
    const { rfidUid } = req.params;
    removePendingRfidScan(rfidUid);
    res.json({ message: 'Pending RFID scan removed' });
  } catch (error) {
    console.error('Error removing pending RFID scan:', error);
    res.status(500).json({ error: error.message });
  }
});

// All other routes require authentication
router.use(authenticateToken);

// Generate new cow ID
router.get('/generate-id', async (req, res) => {
  try {
    const cowId = await generateCowId();
    res.json({ cow_id: cowId });
  } catch (error) {
    console.error('Error generating cow ID:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate QR code for cow
router.get('/:cowId/qr', async (req, res) => {
  try {
    const { cowId } = req.params;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const qrDataUrl = await generateQRCode(cowId, frontendUrl);
    res.json({ qr_code: qrDataUrl });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all cows
router.get('/', async (req, res) => {
  try {
    const cows = await getAllCows();
    res.json({ data: cows });
  } catch (error) {
    console.error('Error fetching cows:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get cow by ID
router.get('/:cowId', async (req, res) => {
  try {
    const { cowId } = req.params;
    const cow = await getCowById(cowId);
    
    if (!cow) {
      return res.status(404).json({ error: 'Cow not found' });
    }
    
    res.json({ data: cow });
  } catch (error) {
    console.error('Error fetching cow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new cow
router.post('/', async (req, res) => {
  try {
    const cowData = req.body;
    
    // Generate cow ID if not provided
    if (!cowData.cow_id) {
      cowData.cow_id = await generateCowId();
    }
    
    const cow = await createCow(cowData);
    
    // Generate QR code with frontend URL for public access
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const qrDataUrl = await generateQRCode(cow.cow_id, frontendUrl);
    
    res.status(201).json({ 
      message: 'Cow created successfully',
      data: cow,
      qr_code: qrDataUrl
    });
  } catch (error) {
    console.error('Error creating cow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update cow
router.put('/:cowId', async (req, res) => {
  try {
    const { cowId } = req.params;
    const cowData = req.body;
    
    const cow = await updateCow(cowId, cowData);
    
    if (!cow) {
      return res.status(404).json({ error: 'Cow not found' });
    }
    
    res.json({ message: 'Cow updated successfully', data: cow });
  } catch (error) {
    console.error('Error updating cow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get cow feed history
router.get('/:cowId/feed-history', async (req, res) => {
  try {
    const { cowId } = req.params;
    const days = parseInt(req.query.days) || 30;
    
    const history = await getCowFeedHistory(cowId, days);
    res.json({ data: history });
  } catch (error) {
    console.error('Error fetching feed history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get cow milk history
router.get('/:cowId/milk-history', async (req, res) => {
  try {
    const { cowId } = req.params;
    const days = parseInt(req.query.days) || 30;
    
    const history = await getCowMilkHistory(cowId, days);
    res.json({ data: history });
  } catch (error) {
    console.error('Error fetching milk history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get cow medications
router.get('/:cowId/medications', async (req, res) => {
  try {
    const { cowId } = req.params;
    const medications = await getCowMedications(cowId);
    res.json({ data: medications });
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add medication
router.post('/:cowId/medications', async (req, res) => {
  try {
    const { cowId } = req.params;
    const medicationData = req.body;
    
    if (!medicationData.medication_name || !medicationData.date_given) {
      return res.status(400).json({ error: 'medication_name and date_given are required' });
    }
    
    const medication = await addMedication(cowId, medicationData);
    res.status(201).json({ message: 'Medication added successfully', data: medication });
  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

