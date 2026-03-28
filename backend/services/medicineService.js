/**
 * Medicine Service
 * Independent V2 medicine and supplement logging.
 */

import pool from '../config/database.js';

const ALLOWED_CATEGORIES = ['Medicine', 'Supplement', 'Multivitamin', 'Treatment'];

function normalizeCategory(category) {
  const match = ALLOWED_CATEGORIES.find(
    (allowed) => allowed.toLowerCase() === String(category || '').trim().toLowerCase()
  );

  if (!match) {
    throw new Error(`category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
  }

  return match;
}

async function ensureCowExists(cowId) {
  const result = await pool.query(
    'SELECT cow_id FROM cows WHERE cow_id = $1',
    [cowId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Cow ${cowId} not found`);
  }
}

async function ensureMedicineExists(medicineId) {
  const result = await pool.query(
    'SELECT id FROM medicine_master WHERE id = $1',
    [medicineId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Medicine ${medicineId} not found`);
  }
}

export async function getMedicines() {
  const result = await pool.query(
    `SELECT id, medicine_name, category, description, created_at
     FROM medicine_master
     ORDER BY category ASC, medicine_name ASC`
  );

  return result.rows;
}

export async function addMedicine({ medicine_name, category, description }) {
  if (!medicine_name || !medicine_name.trim()) {
    throw new Error('medicine_name is required');
  }

  const normalizedCategory = normalizeCategory(category);

  const result = await pool.query(
    `INSERT INTO medicine_master (medicine_name, category, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [medicine_name.trim(), normalizedCategory, description || null]
  );

  return result.rows[0];
}

export async function updateMedicine(id, { medicine_name, category, description }) {
  const normalizedCategory = category ? normalizeCategory(category) : null;

  const result = await pool.query(
    `UPDATE medicine_master
     SET medicine_name = COALESCE($1, medicine_name),
         category = COALESCE($2, category),
         description = COALESCE($3, description),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [medicine_name ? medicine_name.trim() : null, normalizedCategory, description, id]
  );

  if (result.rows.length === 0) {
    throw new Error('Medicine not found');
  }

  return result.rows[0];
}

export async function logCowMedicine({
  cow_id,
  medicine_id,
  administered_by,
  date_given,
  dosage,
  notes
}) {
  if (!cow_id || !medicine_id || !administered_by || !date_given || !dosage) {
    throw new Error('cow_id, medicine_id, administered_by, date_given, and dosage are required');
  }

  await ensureCowExists(cow_id);
  await ensureMedicineExists(medicine_id);

  const result = await pool.query(
    `INSERT INTO cow_medicine_log (
      cow_id, medicine_id, administered_by, date_given, dosage, notes
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [cow_id, medicine_id, administered_by.trim(), date_given, dosage.trim(), notes || null]
  );

  return result.rows[0];
}

export async function getCowMedicineHistory(cowId) {
  if (!cowId) {
    throw new Error('cowId is required');
  }

  const result = await pool.query(
    `SELECT
        l.id,
        l.cow_id,
        l.medicine_id,
        m.medicine_name,
        m.category,
        l.administered_by,
        l.date_given,
        l.dosage,
        l.notes,
        l.created_at
     FROM cow_medicine_log l
     JOIN medicine_master m ON m.id = l.medicine_id
     WHERE l.cow_id = $1
     ORDER BY l.date_given DESC, l.created_at DESC`,
    [cowId]
  );

  return result.rows;
}
