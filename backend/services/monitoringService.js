/**
 * Monitoring Service
 * 
 * Unified business logic for the Farmer Monitoring & Analysis module.
 * Aggregates data from both legacy (daily_lane_log) and V2 (milk_yield_log, feed_log) tables.
 */

import pool from '../config/database.js';

/**
 * Gets today's date in YYYY-MM-DD format
 */
function getTodayDateString() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Calculates 7-day average milk yield for a cow (Unified)
 */
async function calculateSevenDayAverage(cowId, targetDate) {
  const sevenDaysAgo = new Date(targetDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const start = sevenDaysAgo.toISOString().split('T')[0];
  
  // Combine milk from both legacy and V2 tables
  const result = await pool.query(`
    WITH UnifiedMilk AS (
      SELECT cow_id, date, total_yield_l as yield
      FROM daily_lane_log
      WHERE cow_id = $1 AND date >= $2 AND date <= $3
      UNION ALL
      SELECT cow_id, date, milk_qty_litre as yield
      FROM milk_yield_log
      WHERE cow_id = $1 AND date >= $2 AND date <= $3
    )
    SELECT AVG(COALESCE(yield, 0)) as avg_yield
    FROM UnifiedMilk
  `, [cowId, start, targetDate]);
  
  const avg = result.rows[0]?.avg_yield;
  return avg ? parseFloat(avg) : 0;
}

/**
 * Calculates and stores cow status based on yield rules (Unified)
 */
async function calculateCowStatus(cowId, targetDate) {
  // Get today's milk yield from both sources
  const todayResult = await pool.query(`
    WITH TodayMilk AS (
      SELECT cow_id, total_yield_l as yield
      FROM daily_lane_log
      WHERE cow_id = $1 AND date = $2
      UNION ALL
      SELECT cow_id, milk_qty_litre as yield
      FROM milk_yield_log
      WHERE cow_id = $1 AND date = $2
    )
    SELECT COALESCE(SUM(yield), 0) as today_total
    FROM TodayMilk
  `, [cowId, targetDate]);
  
  const todayMilk = parseFloat(todayResult.rows[0]?.today_total || 0);
  const sevenDayAvg = await calculateSevenDayAverage(cowId, targetDate);
  
  let status = 'NORMAL';
  let reason = null;
  
  if (sevenDayAvg === 0) {
    status = todayMilk === 0 ? 'ATTENTION' : 'NORMAL';
    if (todayMilk === 0) reason = 'No yield recorded';
  } else if (todayMilk === 0) {
    status = 'ATTENTION';
    reason = 'No yield recorded';
  } else if (todayMilk < (0.8 * sevenDayAvg)) {
    status = 'ATTENTION';
    reason = 'Yield dropped below 80%';
  } else if (todayMilk < (0.9 * sevenDayAvg)) {
    status = 'SLIGHT_DROP';
    reason = 'Minor yield drop';
  } else {
    status = 'NORMAL';
  }
  
  await pool.query(`
    INSERT INTO cow_daily_status (cow_id, date, status, reason)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (cow_id, date)
    DO UPDATE SET status = $3, reason = $4, created_at = CURRENT_TIMESTAMP
  `, [cowId, targetDate, status, reason]);
  
  return { status, reason, todayMilk, sevenDayAvg };
}

/**
 * Syncs daily_cow_metrics reporting table from all sources
 */
async function syncDailyMetrics(targetDate) {
  // Aggregate data per cow from both legacy and V2
  const result = await pool.query(`
    WITH UnifiedDaily AS (
      SELECT cow_id, date, feed_given_kg as feed, total_yield_l as milk
      FROM daily_lane_log
      WHERE date = $1
      UNION ALL
      SELECT cow_id, date, 0 as feed, milk_qty_litre as milk
      FROM milk_yield_log
      WHERE date = $1
    )
    SELECT 
      cow_id,
      date,
      SUM(feed) as total_feed,
      SUM(milk) as total_milk
    FROM UnifiedDaily
    GROUP BY cow_id, date
  `, [targetDate]);
  
  for (const row of result.rows) {
    await pool.query(`
      INSERT INTO daily_cow_metrics (cow_id, date, feed_given_kg, milk_yield_litre)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (cow_id, date)
      DO UPDATE SET 
        feed_given_kg = $3,
        milk_yield_litre = $4
    `, [row.cow_id, row.date, row.total_feed, row.total_milk]);
  }
}

/**
 * Calculates and stores daily farm summary
 */
async function calculateDailyFarmSummary(targetDate) {
  await syncDailyMetrics(targetDate);
  
  // Aggregate farm totals
  const totalsResult = await pool.query(`
    WITH UnifiedSummary AS (
      SELECT feed_given_kg as feed, total_yield_l as milk
      FROM daily_lane_log
      WHERE date = $1
      UNION ALL
      SELECT 0 as feed, milk_qty_litre as milk
      FROM milk_yield_log
      WHERE date = $1
      UNION ALL
      SELECT quantity_kg as feed, 0 as milk
      FROM feed_log
      WHERE date = $1
    )
    SELECT 
      COALESCE(SUM(feed), 0) as total_feed,
      COALESCE(SUM(milk), 0) as total_milk
    FROM UnifiedSummary
  `, [targetDate]);
  
  const totalFeed = parseFloat(totalsResult.rows[0]?.total_feed || 0);
  const totalMilk = parseFloat(totalsResult.rows[0]?.total_milk || 0);
  
  // Best/Lowest yielding cow (from unified metrics)
  const bestCowRes = await pool.query(`
    SELECT cow_id FROM daily_cow_metrics 
    WHERE date = $1 AND milk_yield_litre > 0
    ORDER BY milk_yield_litre DESC LIMIT 1
  `, [targetDate]);
  
  const bestCowId = bestCowRes.rows[0]?.cow_id || null;
  
  await pool.query(`
    INSERT INTO daily_farm_summary (date, total_feed_kg, total_milk_litre, best_cow_id)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (date)
    DO UPDATE SET total_feed_kg = $2, total_milk_litre = $3, best_cow_id = $4
  `, [targetDate, totalFeed, totalMilk, bestCowId]);
  
  return { totalFeed, totalMilk, bestCowId };
}

/**
 * Gets dashboard data (Unified)
 */
export async function getDashboardData(date = null, scope = 'daily') {
  if (scope === 'overall') {
    const cowsCountResult = await pool.query("SELECT COUNT(*) as count FROM cows WHERE status = 'active' AND is_active = true");
    const totalCows = parseInt(cowsCountResult.rows[0]?.count || 0);

    const totalsResult = await pool.query(`
      WITH CombinedData AS (
        SELECT feed_given_kg as feed, total_yield_l as milk, date FROM daily_lane_log
        UNION ALL
        SELECT 0 as feed, milk_qty_litre as milk, date FROM milk_yield_log
        UNION ALL
        SELECT quantity_kg as feed, 0 as milk, date FROM feed_log
      )
      SELECT 
        COALESCE(SUM(feed), 0) as total_feed,
        COALESCE(SUM(milk), 0) as total_milk,
        COUNT(DISTINCT date) as total_days
      FROM CombinedData
    `);

    const totalFeed = parseFloat(totalsResult.rows[0]?.total_feed || 0);
    const totalMilk = parseFloat(totalsResult.rows[0]?.total_milk || 0);

    return {
      scope: 'overall',
      totalCows,
      totalMilk: parseFloat(totalMilk.toFixed(2)),
      totalFeed: parseFloat(totalFeed.toFixed(2)),
      yieldFeedRatio: totalFeed > 0 ? parseFloat((totalMilk / totalFeed).toFixed(2)) : 0,
      lowYieldCount: 0,
      totalRecordedDays: parseInt(totalsResult.rows[0]?.total_days || 0)
    };
  }

  const targetDate = date || getTodayDateString();
  const summary = await calculateDailyFarmSummary(targetDate);
  
  const cowsCountResult = await pool.query("SELECT COUNT(*) as count FROM cows WHERE status = 'active' AND is_active = true");
  const totalCows = parseInt(cowsCountResult.rows[0]?.count || 0);

  // Ensure all active cows have statuses calculated for today
  const activeCows = await pool.query("SELECT cow_id FROM cows WHERE status = 'active' AND is_active = true");
  for (const cow of activeCows.rows) {
    await calculateCowStatus(cow.cow_id, targetDate);
  }

  const attentionCount = await pool.query(`
    SELECT COUNT(*) as count FROM cow_daily_status 
    WHERE date = $1 AND status = 'ATTENTION'
  `, [targetDate]);

  return {
    scope: 'daily',
    totalCows,
    totalMilk: summary.totalMilk,
    totalFeed: summary.totalFeed,
    yieldFeedRatio: summary.totalFeed > 0 ? parseFloat((summary.totalMilk / summary.totalFeed).toFixed(2)) : 0,
    lowYieldCount: parseInt(attentionCount.rows[0]?.count || 0),
    totalRecordedDays: 1,
    firstRecordedDate: targetDate,
    lastRecordedDate: targetDate
  };
}

export async function getCowsList(date = null) {
  const targetDate = date || getTodayDateString();
  
  // Sync metrics for the list
  await syncDailyMetrics(targetDate);

  const result = await pool.query(`
    SELECT 
      c.cow_id, 
      COALESCE(m.milk_yield_litre, 0) as today_milk, 
      COALESCE(m.feed_given_kg, 0) as today_feed,
      COALESCE(s.status, 'NORMAL') as status
    FROM cows c
    LEFT JOIN daily_cow_metrics m ON c.cow_id = m.cow_id AND m.date = $1
    LEFT JOIN cow_daily_status s ON c.cow_id = s.cow_id AND s.date = $1
    WHERE c.status = 'active' AND c.is_active = true
    ORDER BY c.cow_id
  `, [targetDate]);
  
  return result.rows.map(row => ({
    cowId: row.cow_id,
    todayMilk: parseFloat(row.today_milk),
    todayFeed: parseFloat(row.today_feed),
    status: row.status
  }));
}

export async function getCowDetail(cowId, date = null) {
  const targetDate = date || getTodayDateString();
  const cowResult = await pool.query("SELECT * FROM cows WHERE cow_id = $1", [cowId]);
  if (cowResult.rows.length === 0) throw new Error('Cow not found');
  const cow = cowResult.rows[0];

  const metrics = await pool.query(`
    SELECT milk_yield_litre as milk, feed_given_kg as feed 
    FROM daily_cow_metrics WHERE cow_id = $1 AND date = $2
  `, [cowId, targetDate]);

  return {
    ...cow,
    today: {
      milk: parseFloat(metrics.rows[0]?.milk || 0),
      feed: parseFloat(metrics.rows[0]?.feed || 0)
    }
  };
}

export async function getDailySummary(date) {
  return calculateDailyFarmSummary(date);
}

export async function getHistoryLog(fromDate, toDate) {
  const result = await pool.query(`
    SELECT date, cow_id, feed_given_kg as feed, milk_yield_litre as milk
    FROM daily_cow_metrics 
    WHERE date >= $1 AND date <= $2
    ORDER BY date DESC, cow_id ASC
  `, [fromDate, toDate]);
  return result.rows;
}

export async function getRatioHistory(days = 30) {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  
  const result = await pool.query(`
    SELECT date, SUM(feed_given_kg) as total_feed, SUM(milk_yield_litre) as total_milk
    FROM daily_cow_metrics 
    WHERE date >= $1
    GROUP BY date ORDER BY date ASC
  `, [fromDate.toISOString().split('T')[0]]);
  
  return result.rows.map(row => ({
    date: row.date.toISOString().split('T')[0],
    ratio: row.total_feed > 0 ? parseFloat((row.total_milk / row.total_feed).toFixed(2)) : 0
  }));
}
