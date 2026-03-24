/**
 * Milk Service
 * Parallel V2 milk logging independent of daily_lane_log.
 */

import pool from '../config/database.js';

const LITRE_CONVERSION_FACTOR = 1.03;

function normalizeSession(session) {
  if (!session) {
    throw new Error('session is required');
  }

  const normalized = String(session).trim().toLowerCase();
  if (normalized === 'morning') {
    return 'Morning';
  }
  if (normalized === 'evening') {
    return 'Evening';
  }

  throw new Error('session must be either Morning or Evening');
}

function convertKgToLitre(kg) {
  return parseFloat((kg / LITRE_CONVERSION_FACTOR).toFixed(2));
}

async function validateCowForMilk(client, cowId) {
  const result = await client.query(
    `SELECT cow_id, is_active, status
     FROM cows
     WHERE cow_id = $1`,
    [cowId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Cow ${cowId} not found`);
  }

  const cow = result.rows[0];
  if (cow.is_active === false || cow.status === 'inactive') {
    throw new Error(`Cow ${cowId} is inactive and cannot be logged`);
  }

  return cow;
}

export async function createMilkLog(date, entries = []) {
  if (!date) {
    throw new Error('date is required');
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('entries array is required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertedRows = [];

    for (const entry of entries) {
      const {
        cow_id,
        session,
        milk_qty_kg,
        notes
      } = entry;

      if (!cow_id || !session || milk_qty_kg === undefined) {
        throw new Error('Each entry requires cow_id, session, and milk_qty_kg');
      }

      const milkKg = parseFloat(milk_qty_kg);
      if (!Number.isFinite(milkKg) || milkKg < 0) {
        throw new Error('milk_qty_kg must be a valid non-negative number');
      }

      const normalizedSession = normalizeSession(session);
      await validateCowForMilk(client, cow_id);

      const milkLitre = convertKgToLitre(milkKg);
      const recordedAt = new Date();

      const checkRes = await client.query(
        `SELECT id FROM milk_yield_log WHERE cow_id = $1 AND date = $2 AND session = $3`,
        [cow_id, date, normalizedSession]
      );

      let result;
      if (checkRes.rows.length > 0) {
        result = await client.query(
          `UPDATE milk_yield_log 
           SET milk_qty_kg = $1, milk_qty_litre = $2, recorded_at = $3, notes = COALESCE($4, notes)
           WHERE id = $5 RETURNING *`,
          [milkKg, milkLitre, recordedAt, notes || null, checkRes.rows[0].id]
        );
      } else {
        result = await client.query(
          `INSERT INTO milk_yield_log (
            date, cow_id, session, milk_qty_kg, milk_qty_litre, recorded_at, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            date,
            cow_id,
            normalizedSession,
            milkKg,
            milkLitre,
            recordedAt,
            notes || null
          ]
        );
      }

      insertedRows.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return insertedRows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getMilkLogByDate(date) {
  if (!date) {
    throw new Error('date is required');
  }

  const result = await pool.query(
    `SELECT
        m.id,
        m.date,
        m.cow_id,
        m.session,
        m.milk_qty_kg,
        m.milk_qty_litre,
        m.recorded_at,
        m.notes,
        m.created_at,
        c.cow_tag,
        c.breed
     FROM milk_yield_log m
     LEFT JOIN cows c ON c.cow_id = m.cow_id
     WHERE m.date = $1
     ORDER BY m.cow_id ASC, m.session ASC, m.id ASC`,
    [date]
  );

  return result.rows;
}

export async function getMilkLogByCow(cowId) {
  if (!cowId) {
    throw new Error('cowId is required');
  }

  const result = await pool.query(
    `SELECT
        id,
        date,
        cow_id,
        session,
        milk_qty_kg,
        milk_qty_litre,
        recorded_at,
        notes,
        created_at
     FROM milk_yield_log
     WHERE cow_id = $1
     ORDER BY date DESC, recorded_at DESC, id DESC`,
    [cowId]
  );

  return result.rows;
}

export async function getAllMilkLogs(startDate, endDate) {
  let queryStr = `
    SELECT
        m.id,
        m.date,
        m.cow_id,
        m.session,
        m.milk_qty_kg,
        m.milk_qty_litre,
        m.recorded_at,
        m.notes,
        m.created_at,
        c.cow_tag,
        c.name,
        c.breed
     FROM milk_yield_log m
     LEFT JOIN cows c ON c.cow_id = m.cow_id
  `;

  const queryParams = [];
  const conditions = [];

  if (startDate) {
    queryParams.push(startDate);
    conditions.push(`m.date >= $${queryParams.length}`);
  }

  if (endDate) {
    queryParams.push(endDate);
    conditions.push(`m.date <= $${queryParams.length}`);
  }

  if (conditions.length > 0) {
    queryStr += ` WHERE ` + conditions.join(' AND ');
  }

  queryStr += ` ORDER BY m.date DESC, m.recorded_at DESC, m.session ASC, m.id DESC`;

  const result = await pool.query(queryStr, queryParams);
  return result.rows;
}
