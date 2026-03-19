/**
 * Dashboard Service
 * Aggregates data from milk, feed, activity, and cows tables.
 */

import pool from '../config/database.js';

export async function getTodayMilkSummary(dateStr) {
  const result = await pool.query(
    `WITH RankedLogs AS (
       SELECT 
         cow_id, 
         session, 
         milk_qty_litre,
         ROW_NUMBER() OVER(PARTITION BY cow_id, session ORDER BY recorded_at DESC) as rn
       FROM milk_yield_log
       WHERE date = $1
     )
     SELECT cow_id, SUM(milk_qty_litre) as total_yield
     FROM RankedLogs
     WHERE rn = 1
     GROUP BY cow_id
     ORDER BY total_yield DESC`,
    [dateStr]
  );
  
  const cowsWithYield = result.rows;
  const total = cowsWithYield.reduce((acc, row) => acc + parseFloat(row.total_yield), 0);
  const average = cowsWithYield.length > 0 ? total / cowsWithYield.length : 0;
  const topCow = cowsWithYield.length > 0 ? cowsWithYield[0].cow_id : null;
  const lowCow = cowsWithYield.length > 0 ? cowsWithYield[cowsWithYield.length - 1].cow_id : null;
  
  return {
    total: parseFloat(total.toFixed(2)),
    average: parseFloat(average.toFixed(2)),
    top_cow: topCow,
    low_cow: lowCow
  };
}

export async function getTodayFeedSummary(dateStr) {
  const result = await pool.query(
    `SELECT SUM(quantity_kg) as total_kg, SUM(total_amount) as total_cost
     FROM feed_log
     WHERE date = $1`,
    [dateStr]
  );
  
  return {
    total_kg: parseFloat(result.rows[0].total_kg || 0),
    total_cost: parseFloat(result.rows[0].total_cost || 0)
  };
}

export async function getCowStatusSummary() {
  const result = await pool.query(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_count,
      SUM(CASE WHEN cow_type = 'milking' THEN 1 ELSE 0 END) as milking,
      SUM(CASE WHEN cow_type = 'pregnant' THEN 1 ELSE 0 END) as pregnant,
      SUM(CASE WHEN status = 'sick' THEN 1 ELSE 0 END) as sick
     FROM cows`
  );
  
  const row = result.rows[0];
  return {
    total: parseInt(row.total || 0),
    active: parseInt(row.active_count || 0),
    milking: parseInt(row.milking || 0),
    pregnant: parseInt(row.pregnant || 0),
    sick: parseInt(row.sick || 0)
  };
}

export async function getActivitySummary() {
  const result = await pool.query(
    `SELECT 
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
     FROM cow_activity_schedule`
  );
  
  const row = result.rows[0];
  return {
    pending: parseInt(row.pending || 0),
    completed: parseInt(row.completed || 0)
  };
}

export async function getPerformanceMetrics(todayStr) {
  // Compare today's vs yesterday's completely across all cows who have logs today
  const todayDate = new Date(todayStr);
  const yestDate = new Date(todayDate);
  yestDate.setDate(todayDate.getDate() - 1);
  const yesterdayStr = yestDate.toISOString().split('T')[0];

  const result = await pool.query(
    `WITH today_ranked AS (
       SELECT cow_id, session, milk_qty_litre,
              ROW_NUMBER() OVER(PARTITION BY cow_id, session ORDER BY recorded_at DESC) as rn
       FROM milk_yield_log
       WHERE date = $1
     ),
     yesterday_ranked AS (
       SELECT cow_id, session, milk_qty_litre,
              ROW_NUMBER() OVER(PARTITION BY cow_id, session ORDER BY recorded_at DESC) as rn
       FROM milk_yield_log
       WHERE date = $2
     ),
     today_yield AS (
       SELECT cow_id, SUM(milk_qty_litre) as qty
       FROM today_ranked
       WHERE rn = 1
       GROUP BY cow_id
     ),
     yesterday_yield AS (
       SELECT cow_id, SUM(milk_qty_litre) as qty
       FROM yesterday_ranked
       WHERE rn = 1
       GROUP BY cow_id
     )
     SELECT 
       t.cow_id, 
       t.qty as today_qty, 
       COALESCE(y.qty, 0) as yesterday_qty
     FROM today_yield t
     LEFT JOIN yesterday_yield y ON t.cow_id = y.cow_id`,
    [todayStr, yesterdayStr]
  );

  let improved = 0;
  let reduced = 0;
  const total = result.rows.length;

  for (const row of result.rows) {
    if (parseFloat(row.today_qty) > parseFloat(row.yesterday_qty)) {
      improved++;
    } else if (parseFloat(row.today_qty) < parseFloat(row.yesterday_qty)) {
      reduced++;
    }
  }

  return {
    improved: total > 0 ? parseFloat(((improved / total) * 100).toFixed(1)) : 0,
    reduced: total > 0 ? parseFloat(((reduced / total) * 100).toFixed(1)) : 0
  };
}
