/**
 * Cow Service
 * Business logic for managing cows
 */

import pool from '../config/database.js';
import QRCode from 'qrcode';

function parseChildSequence(parentId, childId) {
  if (!childId.startsWith(`${parentId}.`)) {
    return null;
  }

  const suffix = childId.slice(parentId.length + 1);
  if (!/^\d+$/.test(suffix)) {
    return null;
  }

  return parseInt(suffix, 10);
}

function normalizeSourceType(sourceType) {
  if (!sourceType) {
    return null;
  }

  const normalized = String(sourceType).trim().toLowerCase();
  if (normalized === 'purchased') {
    return 'Purchased';
  }
  if (normalized === 'delivered') {
    return 'Delivered';
  }

  throw new Error('source_type must be either Purchased or Delivered');
}

function getBreedCode(breed) {
  if (!breed || !breed.trim()) {
    throw new Error('breed is required to generate cow ID');
  }

  const words = breed
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean);

  if (words.length === 0) {
    throw new Error('breed must contain alphabetic characters');
  }

  return words
    .map((word) => word[0].toUpperCase())
    .join('')
    .slice(0, 4);
}

function getMonthYearCode(purchaseDate) {
  if (!purchaseDate) {
    throw new Error('purchase_date is required to generate cow ID');
  }

  const date = new Date(purchaseDate);
  if (Number.isNaN(date.getTime())) {
    throw new Error('purchase_date is invalid');
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}${year}`;
}

function getSourceCode(sourceType) {
  const normalized = normalizeSourceType(sourceType);
  if (!normalized) {
    throw new Error('source_type is required to generate cow ID');
  }

  return normalized === 'Purchased' ? 'P' : 'D';
}

function extractSequenceNumber(cowId, prefix) {
  if (!cowId.startsWith(prefix)) {
    return null;
  }

  const suffix = cowId.slice(prefix.length);
  if (!/^\d{3}$/.test(suffix)) {
    return null;
  }

  return parseInt(suffix, 10);
}

async function generateLegacyCowId(motherId = null) {
  if (motherId) {
    const mother = await getCowById(motherId);
    if (!mother) {
      throw new Error(`Mother cow ${motherId} not found`);
    }

    const result = await pool.query(
      `SELECT cow_id FROM cows
       WHERE cow_id LIKE $1`,
      [`${motherId}.%`]
    );

    let maxChildSequence = 0;
    for (const row of result.rows) {
      const sequence = parseChildSequence(motherId, row.cow_id);
      if (sequence !== null && sequence > maxChildSequence) {
        maxChildSequence = sequence;
      }
    }

    return `${motherId}.${maxChildSequence + 1}`;
  }

  const result = await pool.query(
    `SELECT cow_id FROM cows
     WHERE cow_id ~ '^COW-[0-9]{3}$'
     ORDER BY cow_id DESC
     LIMIT 1`
  );

  let sequence = 1;
  if (result.rows.length > 0) {
    const lastId = result.rows[0].cow_id;
    const lastSeq = parseInt(lastId.split('-')[1], 10);
    sequence = lastSeq + 1;
  }

  return `COW-${sequence.toString().padStart(3, '0')}`;
}

async function generateNextCowTag() {
  const result = await pool.query(
    `SELECT cow_tag
     FROM cows
     WHERE is_active = true
       AND cow_tag IS NOT NULL
       AND cow_tag ~ '^[0-9]{3}$'
     ORDER BY cow_tag ASC`
  );

  const usedTags = result.rows
    .map((row) => parseInt(row.cow_tag, 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  let next = 1;
  for (const value of usedTags) {
    if (value === next) {
      next += 1;
    } else if (value > next) {
      break;
    }
  }

  return String(next).padStart(3, '0');
}

async function validateParentId(parentId) {
  if (!parentId) {
    return null;
  }

  const parent = await getCowById(parentId);
  if (!parent) {
    throw new Error(`Parent cow ${parentId} not found`);
  }

  return parent;
}

async function updateParentCalfCount(parentId) {
  if (!parentId) {
    return;
  }

  await pool.query(
    `UPDATE cows
     SET number_of_calves = (
       SELECT COUNT(*) FROM cows WHERE COALESCE(parent_id, mother_id) = $1
     ),
     updated_at = CURRENT_TIMESTAMP
     WHERE cow_id = $1`,
    [parentId]
  );
}

/**
 * Generate unique cow ID
 * V2 format: BREED-MMYY-TYPESEQ, e.g. HF-1125-P002
 * Legacy format is preserved as fallback for older flows.
 */
export async function generateCowId(input = null) {
  if (typeof input === 'string') {
    return generateLegacyCowId(input);
  }

  const options = input || {};
  const { breed, purchaseDate, sourceType, motherId = null } = options;

  if (!breed || !purchaseDate || !sourceType) {
    return generateLegacyCowId(motherId);
  }

  const breedCode = getBreedCode(breed);
  const monthYearCode = getMonthYearCode(purchaseDate);
  const sourceCode = getSourceCode(sourceType);
  const prefix = `${breedCode}-${monthYearCode}-${sourceCode}`;

  const result = await pool.query(
    `SELECT cow_id
     FROM cows
     WHERE cow_id LIKE $1`,
    [`${prefix}%`]
  );

  let maxSequence = 0;
  for (const row of result.rows) {
    const sequence = extractSequenceNumber(row.cow_id, prefix);
    if (sequence !== null && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  return `${prefix}${String(maxSequence + 1).padStart(3, '0')}`;
}

/**
 * Generate QR code data URL for a cow ID
 * QR code contains URL to public profile page for read-only access
 */
export async function generateQRCode(cowId, frontendUrl = null) {
  try {
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
    mother_id,
    parent_id,
    cow_tag,
    rfid_uid,
    name,
    cow_type = 'normal',
    breed,
    weight_kg,
    source_type,
    date_of_birth,
    purchase_date,
    last_vaccination_date,
    next_vaccination_date,
    number_of_calves = 0,
    status,
    is_active,
    notes
  } = cowData;

  const normalizedSourceType = normalizeSourceType(source_type);
  const resolvedParentId = parent_id || mother_id || null;
  const activeFlag = is_active === undefined ? true : Boolean(is_active);

  if (normalizedSourceType === 'Delivered' && !resolvedParentId) {
    throw new Error('parent_id is required when source_type is Delivered');
  }

  if (resolvedParentId) {
    await validateParentId(resolvedParentId);
  }

  if (!cow_id) {
    throw new Error('cow_id is required');
  }

  if (rfid_uid) {
    const existingRfid = await pool.query(
      'SELECT cow_id FROM cows WHERE rfid_uid = $1',
      [rfid_uid]
    );
    if (existingRfid.rows.length > 0) {
      throw new Error(`RFID UID ${rfid_uid} is already registered to cow ${existingRfid.rows[0].cow_id}`);
    }
  }

  const resolvedCowTag = (cow_tag && cow_tag.trim()) ? cow_tag.trim() : await generateNextCowTag();

  if (activeFlag) {
    const activeTagConflict = await pool.query(
      `SELECT cow_id FROM cows
       WHERE cow_tag = $1
         AND is_active = true`,
      [resolvedCowTag]
    );
    if (activeTagConflict.rows.length > 0) {
      throw new Error(`Cow tag ${resolvedCowTag} is already used by active cow ${activeTagConflict.rows[0].cow_id}`);
    }
  }

  const result = await pool.query(
    `INSERT INTO cows (
      cow_id, mother_id, parent_id, cow_tag, rfid_uid, name, cow_type, breed, weight_kg, source_type,
      date_of_birth, purchase_date, last_vaccination_date, next_vaccination_date,
      number_of_calves, status, is_active, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *`,
    [
      cow_id,
      resolvedParentId,
      resolvedParentId,
      resolvedCowTag,
      rfid_uid || null,
      name || cow_id,
      cow_type,
      breed || null,
      weight_kg !== undefined && weight_kg !== null && weight_kg !== '' ? parseInt(weight_kg, 10) : null,
      normalizedSourceType,
      date_of_birth || null,
      purchase_date || null,
      last_vaccination_date || null,
      next_vaccination_date || null,
      number_of_calves,
      status || 'active',
      activeFlag,
      notes || null
    ]
  );

  await updateParentCalfCount(resolvedParentId);

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
    mother_id,
    parent_id,
    cow_tag,
    rfid_uid,
    name,
    cow_type,
    breed,
    weight_kg,
    source_type,
    date_of_birth,
    purchase_date,
    last_vaccination_date,
    next_vaccination_date,
    number_of_calves,
    status,
    is_active,
    notes
  } = cowData;

  const currentCow = await getCowById(cowId);
  if (!currentCow) {
    return null;
  }

  if (rfid_uid !== undefined) {
    if (rfid_uid && rfid_uid !== currentCow.rfid_uid) {
      const existingRfid = await pool.query(
        'SELECT cow_id FROM cows WHERE rfid_uid = $1 AND cow_id != $2',
        [rfid_uid, cowId]
      );
      if (existingRfid.rows.length > 0) {
        throw new Error(`RFID UID ${rfid_uid} is already registered to another cow`);
      }
    }
  }

  const requestedParentId =
    parent_id !== undefined
      ? (parent_id || null)
      : mother_id !== undefined
        ? (mother_id || null)
        : undefined;

  if (requestedParentId) {
    await validateParentId(requestedParentId);
  }

  const normalizedSourceType = source_type !== undefined
    ? normalizeSourceType(source_type)
    : undefined;

  const effectiveSourceType = normalizedSourceType !== undefined
    ? normalizedSourceType
    : currentCow.source_type;

  const effectiveParentId = requestedParentId !== undefined
    ? requestedParentId
    : (currentCow.parent_id || currentCow.mother_id || null);

  if (effectiveSourceType === 'Delivered' && !effectiveParentId) {
    throw new Error('parent_id is required when source_type is Delivered');
  }

  const effectiveIsActive = is_active !== undefined ? Boolean(is_active) : currentCow.is_active;
  if (cow_tag !== undefined && cow_tag) {
    const activeTagConflict = await pool.query(
      `SELECT cow_id FROM cows
       WHERE cow_tag = $1
         AND is_active = true
         AND cow_id != $2`,
      [cow_tag, cowId]
    );
    if (effectiveIsActive && activeTagConflict.rows.length > 0) {
      throw new Error(`Cow tag ${cow_tag} is already used by active cow ${activeTagConflict.rows[0].cow_id}`);
    }
  }

  const setClauses = [];
  const values = [];
  let paramCount = 1;

  if (rfid_uid !== undefined) {
    setClauses.push(`rfid_uid = $${paramCount++}`);
    values.push(rfid_uid || null);
  }
  if (requestedParentId !== undefined) {
    setClauses.push(`parent_id = $${paramCount++}`);
    values.push(requestedParentId);
    setClauses.push(`mother_id = $${paramCount++}`);
    values.push(requestedParentId);
  }
  if (cow_tag !== undefined) {
    setClauses.push(`cow_tag = $${paramCount++}`);
    values.push(cow_tag || null);
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
  if (weight_kg !== undefined) {
    setClauses.push(`weight_kg = $${paramCount++}`);
    values.push(weight_kg === '' || weight_kg === null ? null : parseInt(weight_kg, 10));
  }
  if (normalizedSourceType !== undefined) {
    setClauses.push(`source_type = $${paramCount++}`);
    values.push(normalizedSourceType);
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
  if (is_active !== undefined) {
    setClauses.push(`is_active = $${paramCount++}`);
    values.push(Boolean(is_active));
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

  const updatedCow = result.rows.length > 0 ? result.rows[0] : null;

  if (updatedCow) {
    const previousParentId = currentCow.parent_id || currentCow.mother_id || null;
    if (previousParentId !== effectiveParentId) {
      await updateParentCalfCount(previousParentId);
    }
    await updateParentCalfCount(effectiveParentId);
  }

  return updatedCow;
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

  const feedHistory = await getCowFeedHistory(cowId, 7);
  const totalFeed = feedHistory.reduce((sum, entry) => sum + parseFloat(entry.total_feed || 0), 0);
  const avgFeed = feedHistory.length > 0 ? totalFeed / feedHistory.length : 0;

  const milkHistory = await getCowMilkHistory(cowId, 7);
  const totalMilk = milkHistory.reduce((sum, entry) => sum + parseFloat(entry.total_yield || 0), 0);
  const avgMilk = milkHistory.length > 0 ? totalMilk / milkHistory.length : 0;

  return {
    cow_id: cow.cow_id,
    cow_tag: cow.cow_tag,
    name: cow.name,
    breed: cow.breed,
    cow_type: cow.cow_type,
    date_of_birth: cow.date_of_birth,
    purchase_date: cow.purchase_date,
    source_type: cow.source_type,
    weight_kg: cow.weight_kg,
    parent_id: cow.parent_id || cow.mother_id || null,
    last_vaccination_date: cow.last_vaccination_date,
    next_vaccination_date: cow.next_vaccination_date,
    number_of_calves: cow.number_of_calves,
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
