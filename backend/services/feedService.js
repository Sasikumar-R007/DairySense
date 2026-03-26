/**
 * Feed Service
 * Farm-level feed logging parallel to daily_lane_log.
 */

import pool from '../config/database.js';

function normalizeInputSource(inputSource) {
  if (!inputSource) {
    throw new Error('input_source is required');
  }

  const normalized = String(inputSource).trim().toLowerCase();
  if (normalized === 'purchased') {
    return 'Purchased';
  }
  if (normalized === 'farm produced') {
    return 'Farm Produced';
  }

  throw new Error('input_source must be either Purchased or Farm Produced');
}

export async function getFeedCategories() {
  const result = await pool.query(
    `SELECT id, category_name, created_at
     FROM feed_category_master
     ORDER BY category_name ASC`
  );

  return result.rows;
}

export async function getFeedItems() {
  const result = await pool.query(
    `SELECT
        i.id,
        i.category_id,
        c.category_name,
        i.item_name,
        i.default_unit,
        i.default_cost_per_unit,
        i.default_source,
        i.created_at
     FROM feed_item_master i
     JOIN feed_category_master c ON c.id = i.category_id
     ORDER BY c.category_name ASC, i.item_name ASC`
  );

  return result.rows;
}

export async function createFeedLog(date, items = []) {
  if (!date) {
    throw new Error('date is required');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('items array is required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertedRows = [];

    for (const item of items) {
      const {
        feed_item_id,
        quantity_kg,
        cost_per_unit,
        input_source
      } = item;

      if (!feed_item_id || quantity_kg === undefined) {
        throw new Error('Each item requires feed_item_id and quantity_kg');
      }

      const quantity = parseFloat(quantity_kg);
      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new Error('quantity_kg must be a valid non-negative number');
      }

      const feedItemResult = await client.query(
        `SELECT id, default_cost_per_unit, default_source FROM feed_item_master WHERE id = $1`,
        [feed_item_id]
      );

      if (feedItemResult.rows.length === 0) {
        throw new Error(`Feed item ${feed_item_id} not found`);
      }

      const dbItem = feedItemResult.rows[0];
      const finalCost = cost_per_unit !== undefined ? parseFloat(cost_per_unit) : parseFloat(dbItem.default_cost_per_unit || 0);
      const rawSource = input_source || dbItem.default_source || 'Purchased';
      const normalizedSource = normalizeInputSource(rawSource);

      const totalAmount = parseFloat((quantity * finalCost).toFixed(2));

      const insertResult = await client.query(
        `INSERT INTO feed_log (
          date, feed_item_id, quantity_kg, cost_per_unit, total_amount, input_source
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [date, feed_item_id, quantity, finalCost, totalAmount, normalizedSource]
      );

      insertedRows.push(insertResult.rows[0]);
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

export async function getFeedLogByDate(date) {
  if (!date) {
    throw new Error('date is required');
  }

  const result = await pool.query(
    `SELECT
        l.id,
        l.date,
        l.feed_item_id,
        c.id as category_id,
        c.category_name,
        i.item_name,
        i.default_unit,
        l.quantity_kg,
        l.cost_per_unit,
        l.total_amount,
        l.input_source,
        l.created_at
     FROM feed_log l
     JOIN feed_item_master i ON i.id = l.feed_item_id
     JOIN feed_category_master c ON c.id = i.category_id
     WHERE l.date = $1
     ORDER BY c.category_name ASC, i.item_name ASC, l.id ASC`,
    [date]
  );

  return result.rows;
}

export async function getAllFeedLogs(startDate, endDate) {
  let queryStr = `
    SELECT
        l.id,
        l.date,
        l.feed_item_id,
        c.id as category_id,
        c.category_name,
        i.item_name,
        i.default_unit,
        l.quantity_kg,
        l.cost_per_unit,
        l.total_amount,
        l.input_source,
        l.created_at
     FROM feed_log l
     JOIN feed_item_master i ON i.id = l.feed_item_id
     JOIN feed_category_master c ON c.id = i.category_id
  `;

  const queryParams = [];
  const conditions = [];

  if (startDate) {
    queryParams.push(startDate);
    conditions.push(`l.date >= $${queryParams.length}`);
  }

  if (endDate) {
    queryParams.push(endDate);
    conditions.push(`l.date <= $${queryParams.length}`);
  }

  if (conditions.length > 0) {
    queryStr += ` WHERE ` + conditions.join(' AND ');
  }

  queryStr += ` ORDER BY l.date DESC, c.category_name ASC, i.item_name ASC, l.id DESC`;

  const result = await pool.query(queryStr, queryParams);
  return result.rows;
}
