/**
 * Feed Allocation Service
 * Advisory-only weight-based feed recommendations.
 */

import pool from '../config/database.js';

export async function getCowWeightGroup(cowWeight) {
  const weight = parseInt(cowWeight, 10);
  if (!Number.isInteger(weight) || weight <= 0) {
    throw new Error('Valid cow weight is required');
  }

  const result = await pool.query(
    `SELECT id, group_name, min_weight, max_weight, created_at
     FROM cow_weight_groups
     WHERE $1 >= min_weight AND $1 < max_weight
     ORDER BY min_weight ASC
     LIMIT 1`,
    [weight]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  const fallback = await pool.query(
    `SELECT id, group_name, min_weight, max_weight, created_at
     FROM cow_weight_groups
     WHERE $1 = max_weight
     ORDER BY max_weight DESC
     LIMIT 1`,
    [weight]
  );

  return fallback.rows[0] || null;
}

export async function getFeedRequirement(weightGroupId) {
  const result = await pool.query(
    `SELECT
        r.id,
        r.weight_group_id,
        r.feed_item_id,
        r.required_qty_kg,
        r.created_at,
        i.item_name,
        i.default_unit,
        c.category_name
     FROM feed_requirement_rules r
     JOIN feed_item_master i ON i.id = r.feed_item_id
     JOIN feed_category_master c ON c.id = i.category_id
     WHERE r.weight_group_id = $1
     ORDER BY c.category_name ASC, i.item_name ASC`,
    [weightGroupId]
  );

  return result.rows;
}

export async function calculateDailyFeedRecommendation(cowId) {
  const cowResult = await pool.query(
    `SELECT cow_id, cow_tag, breed, weight_kg, is_active, status
     FROM cows
     WHERE cow_id = $1`,
    [cowId]
  );

  if (cowResult.rows.length === 0) {
    throw new Error(`Cow ${cowId} not found`);
  }

  const cow = cowResult.rows[0];
  if (cow.is_active === false || cow.status === 'inactive') {
    throw new Error(`Cow ${cowId} is inactive`);
  }

  if (!cow.weight_kg) {
    throw new Error(`Cow ${cowId} does not have weight_kg set`);
  }

  const weightGroup = await getCowWeightGroup(cow.weight_kg);
  if (!weightGroup) {
    throw new Error(`No weight group configured for cow ${cowId} with weight ${cow.weight_kg}`);
  }

  const requirements = await getFeedRequirement(weightGroup.id);

  return {
    cow_id: cow.cow_id,
    cow_tag: cow.cow_tag || null,
    weight: cow.weight_kg,
    group: `${weightGroup.min_weight}-${weightGroup.max_weight}`,
    group_name: weightGroup.group_name,
    recommendations: requirements.map((item) => ({
      feed: item.item_name,
      qty_kg: parseFloat(Number(item.required_qty_kg).toFixed(2)),
      category: item.category_name
    }))
  };
}

export async function getWeightGroups() {
  const result = await pool.query(
    `SELECT id, group_name, min_weight, max_weight, created_at
     FROM cow_weight_groups
     ORDER BY min_weight ASC`
  );

  return result.rows;
}
