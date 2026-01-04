/**
 * Cow Service
 * Business logic for managing cows
 */

import pool from '../config/database.js';
import QRCode from 'qrcode';

/**
 * Generate unique cow ID
 * Format: COW-YYYYMMDD-XXX (e.g., COW-20251225-001)
 */
export async function generateCowId() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
  
  // Find the last cow ID with today's date
  const result = await pool.query(
    `SELECT cow_id FROM cows 
     WHERE cow_id LIKE $1 
     ORDER BY cow_id DESC 
     LIMIT 1`,
    [`COW-${dateStr}-%`]
  );
  
  let sequence = 1;
  if (result.rows.length > 0) {
    const lastId = result.rows[0].cow_id;
    const lastSeq = parseInt(lastId.split('-')[2]);
    sequence = lastSeq + 1;
  }
  
  const seqStr = sequence.toString().padStart(3, '0');
  return `COW-${dateStr}-${seqStr}`;
}

/**
 * Generate QR code data URL for a cow ID
 * QR code contains URL to public profile page for read-only access
 */
export async function generateQRCode(cowId, frontendUrl = null) {
  try {
    // Generate URL for public profile access
    // If frontendUrl is provided (from env), use it; otherwise use relative path
    const qrContent = frontendUrl 
      ? `${frontendUrl}/cow/${cowId}`
      : `/cow/${cowId}`;
    
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (error) {
    throw new Error('Failed to generate QR code: ' + error.message);
  }
}

/**
 * Create a new cow
 */
export async function createCow(cowData) {
  const {
    cow_id,
    rfid_uid,
    name,
    cow_type = 'normal',
    breed,
    date_of_birth,
    purchase_date,
    last_vaccination_date,
    next_vaccination_date,
    number_of_calves = 0,
    notes
  } = cowData;

  // Check if RFID UID already exists (if provided)
  if (rfid_uid) {
    const existingRfid = await pool.query(
      'SELECT cow_id FROM cows WHERE rfid_uid = $1',
      [rfid_uid]
    );
    if (existingRfid.rows.length > 0) {
      throw new Error(`RFID UID ${rfid_uid} is already registered to cow ${existingRfid.rows[0].cow_id}`);
    }
  }

  const result = await pool.query(
    `INSERT INTO cows (
      cow_id, rfid_uid, name, cow_type, breed, date_of_birth, purchase_date,
      last_vaccination_date, next_vaccination_date, number_of_calves, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      cow_id,
      rfid_uid || null,
      name,
      cow_type,
      breed,
      date_of_birth || null,
      purchase_date || null,
      last_vaccination_date || null,
      next_vaccination_date || null,
      number_of_calves,
      notes || null
    ]
  );

  return result.rows[0];
}

/**
 * Get cow by ID
 */
export async function getCowById(cowId) {
  const result = await pool.query(
    'SELECT * FROM cows WHERE cow_id = $1',
    [cowId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get cow by RFID UID
 */
export async function getCowByRfidUid(rfidUid) {
  const result = await pool.query(
    'SELECT * FROM cows WHERE rfid_uid = $1',
    [rfidUid]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get all cows
 */
export async function getAllCows() {
  const result = await pool.query(
    'SELECT * FROM cows ORDER BY created_at DESC'
  );

  return result.rows;
}

/**
 * Update cow
 */
export async function updateCow(cowId, cowData) {
  const {
    rfid_uid,
    name,
    cow_type,
    breed,
    date_of_birth,
    purchase_date,
    last_vaccination_date,
    next_vaccination_date,
    number_of_calves,
    status,
    notes
  } = cowData;

  // Check if RFID UID already exists (if provided and different from current)
  if (rfid_uid !== undefined) {
    const currentCow = await getCowById(cowId);
    if (rfid_uid && rfid_uid !== currentCow?.rfid_uid) {
      const existingRfid = await pool.query(
        'SELECT cow_id FROM cows WHERE rfid_uid = $1 AND cow_id != $2',
        [rfid_uid, cowId]
      );
      if (existingRfid.rows.length > 0) {
        throw new Error(`RFID UID ${rfid_uid} is already registered to another cow`);
      }
    }
  }

  const setClauses = [];
  const values = [];
  let paramCount = 1;

  if (rfid_uid !== undefined) {
    setClauses.push(`rfid_uid = $${paramCount++}`);
    values.push(rfid_uid || null);
  }
  if (name !== undefined) {
    setClauses.push(`name = $${paramCount++}`);
    values.push(name);
  }
  if (cow_type !== undefined) {
    setClauses.push(`cow_type = $${paramCount++}`);
    values.push(cow_type);
  }
  if (breed !== undefined) {
    setClauses.push(`breed = $${paramCount++}`);
    values.push(breed);
  }
  if (date_of_birth !== undefined) {
    setClauses.push(`date_of_birth = $${paramCount++}`);
    values.push(date_of_birth);
  }
  if (purchase_date !== undefined) {
    setClauses.push(`purchase_date = $${paramCount++}`);
    values.push(purchase_date);
  }
  if (last_vaccination_date !== undefined) {
    setClauses.push(`last_vaccination_date = $${paramCount++}`);
    values.push(last_vaccination_date);
  }
  if (next_vaccination_date !== undefined) {
    setClauses.push(`next_vaccination_date = $${paramCount++}`);
    values.push(next_vaccination_date);
  }
  if (number_of_calves !== undefined) {
    setClauses.push(`number_of_calves = $${paramCount++}`);
    values.push(number_of_calves);
  }
  if (status !== undefined) {
    setClauses.push(`status = $${paramCount++}`);
    values.push(status);
  }
  if (notes !== undefined) {
    setClauses.push(`notes = $${paramCount++}`);
    values.push(notes);
  }

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(cowId);

  const result = await pool.query(
    `UPDATE cows 
     SET ${setClauses.join(', ')}
     WHERE cow_id = $${paramCount}
     RETURNING *`,
    values
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get cow feed history
 */
export async function getCowFeedHistory(cowId, days = 30) {
  const result = await pool.query(
    `SELECT date, SUM(feed_given_kg) as total_feed
     FROM daily_lane_log
     WHERE cow_id = $1 
       AND feed_given_kg IS NOT NULL
       AND date >= CURRENT_DATE - INTERVAL '${days} days'
     GROUP BY date
     ORDER BY date DESC`,
    [cowId]
  );

  return result.rows;
}

/**
 * Get cow milk yield history
 */
export async function getCowMilkHistory(cowId, days = 30) {
  const result = await pool.query(
    `SELECT date, 
            SUM(morning_yield_l) as morning_yield,
            SUM(evening_yield_l) as evening_yield,
            SUM(total_yield_l) as total_yield
     FROM daily_lane_log
     WHERE cow_id = $1 
       AND total_yield_l IS NOT NULL
       AND date >= CURRENT_DATE - INTERVAL '${days} days'
     GROUP BY date
     ORDER BY date DESC`,
    [cowId]
  );

  return result.rows;
}

/**
 * Get cow medications
 */
export async function getCowMedications(cowId) {
  const result = await pool.query(
    'SELECT * FROM cow_medications WHERE cow_id = $1 ORDER BY date_given DESC',
    [cowId]
  );

  return result.rows;
}

/**
 * Add medication for a cow
 */
export async function addMedication(cowId, medicationData) {
  const { medication_name, date_given, dosage, notes } = medicationData;

  const result = await pool.query(
    `INSERT INTO cow_medications (cow_id, medication_name, date_given, dosage, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [cowId, medication_name, date_given, dosage || null, notes || null]
  );

  return result.rows[0];
}

/**
 * Get read-only cow profile (for QR code access)
 * Returns limited information suitable for public viewing
 */
export async function getCowReadOnlyProfile(cowId) {
  const cow = await getCowById(cowId);
  
  if (!cow) {
    return null;
  }

  // Get recent feed summary (last 7 days)
  const feedHistory = await getCowFeedHistory(cowId, 7);
  const totalFeed = feedHistory.reduce((sum, entry) => sum + parseFloat(entry.total_feed || 0), 0);
  const avgFeed = feedHistory.length > 0 ? totalFeed / feedHistory.length : 0;

  // Get recent milk summary (last 7 days)
  const milkHistory = await getCowMilkHistory(cowId, 7);
  const totalMilk = milkHistory.reduce((sum, entry) => sum + parseFloat(entry.total_yield || 0), 0);
  const avgMilk = milkHistory.length > 0 ? totalMilk / milkHistory.length : 0;

  // Return read-only profile
  return {
    cow_id: cow.cow_id,
    name: cow.name,
    breed: cow.breed,
    cow_type: cow.cow_type,
    date_of_birth: cow.date_of_birth,
    // Health status indicators
    last_vaccination_date: cow.last_vaccination_date,
    next_vaccination_date: cow.next_vaccination_date,
    number_of_calves: cow.number_of_calves,
    // Recent summaries (non-editable)
    recent_feed_summary: {
      days_tracked: feedHistory.length,
      average_daily_feed_kg: parseFloat(avgFeed.toFixed(2))
    },
    recent_milk_summary: {
      days_tracked: milkHistory.length,
      average_daily_yield_l: parseFloat(avgMilk.toFixed(2))
    }
  };
}

