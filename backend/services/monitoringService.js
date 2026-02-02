/**
 * Monitoring Service
 * 
 * Business logic for the Farmer Monitoring & Analysis module.
 * Calculates cow status, aggregates metrics, and generates insights.
 * 
 * IMPORTANT: This module is standalone and does NOT modify existing core tables.
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
 * Calculates 7-day average milk yield for a cow
 */
async function calculateSevenDayAverage(cowId, targetDate) {
  const sevenDaysAgo = new Date(targetDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Include today + 6 previous days
  
  const result = await pool.query(`
    SELECT AVG(COALESCE(total_yield_l, 0)) as avg_yield
    FROM daily_lane_log
    WHERE cow_id = $1 
      AND date >= $2 
      AND date <= $3
      AND total_yield_l IS NOT NULL
  `, [cowId, sevenDaysAgo.toISOString().split('T')[0], targetDate]);
  
  const avg = result.rows[0]?.avg_yield;
  return avg ? parseFloat(avg) : 0;
}

/**
 * Calculates and stores cow status based on yield rules
 */
async function calculateCowStatus(cowId, targetDate) {
  // Get today's milk yield from daily_lane_log
  const todayResult = await pool.query(`
    SELECT 
      COALESCE(SUM(total_yield_l), 0) as today_milk,
      MAX(lane_no) as lane_id
    FROM daily_lane_log
    WHERE cow_id = $1 AND date = $2
    GROUP BY cow_id
  `, [cowId, targetDate]);
  
  const todayMilk = parseFloat(todayResult.rows[0]?.today_milk || 0);
  const laneId = todayResult.rows[0]?.lane_id?.toString() || null;
  
  // Calculate 7-day average
  const sevenDayAvg = await calculateSevenDayAverage(cowId, targetDate);
  
  let status = 'NORMAL';
  let reason = null;
  
  // Status calculation rules
  if (sevenDayAvg === 0) {
    // No historical data - check if today has entry
    if (todayMilk === 0) {
      status = 'ATTENTION';
      reason = 'No yield recorded';
    } else {
      status = 'NORMAL'; // First day with yield
    }
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
    reason = null;
  }
  
  // Upsert status
  await pool.query(`
    INSERT INTO cow_daily_status (cow_id, date, status, reason)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (cow_id, date)
    DO UPDATE SET status = $3, reason = $4, created_at = CURRENT_TIMESTAMP
  `, [cowId, targetDate, status, reason]);
  
  return { status, reason, todayMilk, sevenDayAvg, laneId };
}

/**
 * Syncs daily_cow_metrics from daily_lane_log for a specific date
 */
async function syncDailyMetrics(targetDate) {
  // Aggregate daily_lane_log data per cow per day
  const result = await pool.query(`
    SELECT 
      cow_id,
      date,
      SUM(feed_given_kg) as total_feed,
      SUM(total_yield_l) as total_milk,
      MAX(lane_no)::VARCHAR as lane_id
    FROM daily_lane_log
    WHERE date = $1
    GROUP BY cow_id, date
  `, [targetDate]);
  
  // Insert/update daily_cow_metrics
  for (const row of result.rows) {
    await pool.query(`
      INSERT INTO daily_cow_metrics (cow_id, date, feed_given_kg, milk_yield_litre, lane_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (cow_id, date)
      DO UPDATE SET 
        feed_given_kg = $3,
        milk_yield_litre = $4,
        lane_id = $5
    `, [
      row.cow_id,
      row.date,
      row.total_feed,
      row.total_milk,
      row.lane_id
    ]);
  }
}

/**
 * Calculates and stores daily farm summary
 */
async function calculateDailyFarmSummary(targetDate) {
  // Sync metrics first
  await syncDailyMetrics(targetDate);
  
  // Get aggregated totals
  const totalsResult = await pool.query(`
    SELECT 
      SUM(feed_given_kg) as total_feed,
      SUM(total_yield_l) as total_milk
    FROM daily_lane_log
    WHERE date = $1
  `, [targetDate]);
  
  const totalFeed = parseFloat(totalsResult.rows[0]?.total_feed || 0);
  const totalMilk = parseFloat(totalsResult.rows[0]?.total_milk || 0);
  
  // Find best and lowest yielding cows
  const bestCowResult = await pool.query(`
    SELECT cow_id, SUM(total_yield_l) as total_milk
    FROM daily_lane_log
    WHERE date = $1 AND total_yield_l IS NOT NULL
    GROUP BY cow_id
    ORDER BY SUM(total_yield_l) DESC
    LIMIT 1
  `, [targetDate]);
  
  const lowestCowResult = await pool.query(`
    SELECT cow_id, SUM(total_yield_l) as total_milk
    FROM daily_lane_log
    WHERE date = $1 AND total_yield_l IS NOT NULL
    GROUP BY cow_id
    ORDER BY SUM(total_yield_l) ASC
    LIMIT 1
  `, [targetDate]);
  
  const bestCowId = bestCowResult.rows[0]?.cow_id || null;
  const lowestCowId = lowestCowResult.rows[0]?.cow_id || null;
  
  // Upsert summary
  await pool.query(`
    INSERT INTO daily_farm_summary (date, total_feed_kg, total_milk_litre, best_cow_id, lowest_cow_id)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (date)
    DO UPDATE SET 
      total_feed_kg = $2,
      total_milk_litre = $3,
      best_cow_id = $4,
      lowest_cow_id = $5
  `, [targetDate, totalFeed, totalMilk, bestCowId, lowestCowId]);
  
  return { totalFeed, totalMilk, bestCowId, lowestCowId };
}

/**
 * Gets dashboard data for a specific date
 */
export async function getDashboardData(date = null) {
  const targetDate = date || getTodayDateString();
  
  // Calculate summary (ensures data is synced)
  const summary = await calculateDailyFarmSummary(targetDate);
  
  // Get total cows count (active cows in cows table)
  const cowsCountResult = await pool.query(`
    SELECT COUNT(*) as count
    FROM cows
    WHERE status = 'active'
  `);
  
  const totalCows = parseInt(cowsCountResult.rows[0]?.count || 0);
  
  // Calculate yield-to-feed ratio
  const yieldFeedRatio = summary.totalFeed > 0 
    ? (summary.totalMilk / summary.totalFeed).toFixed(2)
    : 0;
  
  // Count low-yield cows (ATTENTION status)
  const lowYieldResult = await pool.query(`
    SELECT COUNT(DISTINCT cow_id) as count
    FROM cow_daily_status
    WHERE date = $1 AND status = 'ATTENTION'
  `, [targetDate]);
  
  const lowYieldCount = parseInt(lowYieldResult.rows[0]?.count || 0);
  
  // Calculate statuses for all cows today
  const allCowsResult = await pool.query(`
    SELECT cow_id FROM cows WHERE status = 'active'
  `);
  
  // Ensure all active cows have status calculated
  for (const cow of allCowsResult.rows) {
    await calculateCowStatus(cow.cow_id, targetDate);
  }
  
  return {
    totalCows,
    totalMilk: parseFloat(summary.totalMilk.toFixed(2)),
    totalFeed: parseFloat(summary.totalFeed.toFixed(2)),
    yieldFeedRatio: parseFloat(yieldFeedRatio),
    lowYieldCount
  };
}

/**
 * Gets cow list with today's metrics and status
 */
export async function getCowsList(date = null) {
  const targetDate = date || getTodayDateString();
  
  // Ensure metrics are synced
  await syncDailyMetrics(targetDate);
  
  // Get all active cows with their today's metrics and status
  const result = await pool.query(`
    SELECT 
      c.cow_id,
      COALESCE(m.milk_yield_litre, 0) as today_milk,
      COALESCE(m.feed_given_kg, 0) as today_feed,
      COALESCE(s.status, 'ATTENTION') as status
    FROM cows c
    LEFT JOIN daily_cow_metrics m ON c.cow_id = m.cow_id AND m.date = $1
    LEFT JOIN cow_daily_status s ON c.cow_id = s.cow_id AND s.date = $1
    WHERE c.status = 'active'
    ORDER BY c.cow_id
  `, [targetDate]);
  
  // Calculate status for cows that don't have one yet
  const cowsList = [];
  for (const row of result.rows) {
    if (!row.status || row.status === 'ATTENTION' && row.today_milk === 0) {
      const statusInfo = await calculateCowStatus(row.cow_id, targetDate);
      row.status = statusInfo.status;
    }
    
    cowsList.push({
      cowId: row.cow_id,
      todayMilk: parseFloat(row.today_milk) || 0,
      todayFeed: parseFloat(row.today_feed) || 0,
      status: row.status
    });
  }
  
  return cowsList;
}

/**
 * Calculates 7-day average feed intake for a cow
 */
async function calculateSevenDayFeedAverage(cowId, targetDate) {
  const sevenDaysAgo = new Date(targetDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Include today + 6 previous days
  
  const result = await pool.query(`
    SELECT AVG(COALESCE(feed_given_kg, 0)) as avg_feed
    FROM daily_lane_log
    WHERE cow_id = $1 
      AND date >= $2 
      AND date <= $3
  `, [cowId, sevenDaysAgo.toISOString().split('T')[0], targetDate]);
  
  const avg = result.rows[0]?.avg_feed;
  return avg ? parseFloat(avg) : 0;
}

/**
 * Gets detailed cow information with trend data
 */
export async function getCowDetail(cowId, date = null) {
  const targetDate = date || getTodayDateString();
  
  // Get cow basic info
  const cowResult = await pool.query(`
    SELECT cow_id, rfid_uid, name
    FROM cows
    WHERE cow_id = $1
  `, [cowId]);
  
  if (cowResult.rows.length === 0) {
    throw new Error('Cow not found');
  }
  
  const cow = cowResult.rows[0];
  
  // Get today's metrics
  const todayResult = await pool.query(`
    SELECT 
      COALESCE(SUM(feed_given_kg), 0) as feed,
      COALESCE(SUM(total_yield_l), 0) as milk
    FROM daily_lane_log
    WHERE cow_id = $1 AND date = $2
  `, [cowId, targetDate]);
  
  const today = {
    milk: parseFloat(todayResult.rows[0]?.milk || 0),
    feed: parseFloat(todayResult.rows[0]?.feed || 0)
  };
  
  // Calculate 7-day averages
  const sevenDayAvgMilk = await calculateSevenDayAverage(cowId, targetDate);
  const sevenDayAvgFeed = await calculateSevenDayFeedAverage(cowId, targetDate);
  
  // Get last 7 days historical data for analytics calculations
  const sevenDaysAgo = new Date(targetDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  
  const sevenDayHistoryResult = await pool.query(`
    SELECT 
      date,
      COALESCE(SUM(feed_given_kg), 0) as feed,
      COALESCE(SUM(total_yield_l), 0) as milk
    FROM daily_lane_log
    WHERE cow_id = $1 
      AND date >= $2
      AND date <= $3
    GROUP BY date
    ORDER BY date ASC
  `, [cowId, sevenDaysAgo.toISOString().split('T')[0], targetDate]);
  
  const sevenDayHistory = sevenDayHistoryResult.rows.map(row => ({
    date: row.date.toISOString().split('T')[0],
    milk: parseFloat(row.milk || 0),
    feed: parseFloat(row.feed || 0)
  }));
  
  // Get yield trend (last 14 days)
  const fourteenDaysAgo = new Date(targetDate);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  
  const trendResult = await pool.query(`
    SELECT 
      date,
      SUM(total_yield_l) as milk
    FROM daily_lane_log
    WHERE cow_id = $1 
      AND date >= $2
      AND date <= $3
      AND total_yield_l IS NOT NULL
    GROUP BY date
    ORDER BY date ASC
  `, [cowId, fourteenDaysAgo.toISOString().split('T')[0], targetDate]);
  
  const yieldTrend = trendResult.rows.map(row => ({
    date: row.date.toISOString().split('T')[0],
    milk: parseFloat(row.milk || 0)
  }));
  
  return {
    cowId: cow.cow_id,
    tagId: cow.rfid_uid || cow.cow_id,
    today,
    sevenDayAverage: parseFloat(sevenDayAvgMilk.toFixed(2)),
    sevenDayAverageFeed: parseFloat(sevenDayAvgFeed.toFixed(2)),
    sevenDayHistory,
    yieldTrend
  };
}

/**
 * Gets daily summary for a specific date
 */
export async function getDailySummary(date) {
  const summaryResult = await pool.query(`
    SELECT * FROM daily_farm_summary
    WHERE date = $1
  `, [date]);
  
  if (summaryResult.rows.length === 0) {
    // Calculate if not exists
    await calculateDailyFarmSummary(date);
    return await getDailySummary(date); // Recursive call
  }
  
  const summary = summaryResult.rows[0];
  
  return {
    date: summary.date.toISOString().split('T')[0],
    totalFeed: parseFloat(summary.total_feed_kg || 0),
    totalMilk: parseFloat(summary.total_milk_litre || 0),
    bestCowId: summary.best_cow_id,
    lowestCowId: summary.lowest_cow_id
  };
}

/**
 * Gets history log within date range
 */
export async function getHistoryLog(fromDate, toDate) {
  const result = await pool.query(`
    SELECT 
      date,
      cow_id,
      SUM(feed_given_kg) as feed,
      SUM(total_yield_l) as milk,
      MAX(lane_no)::VARCHAR as lane
    FROM daily_lane_log
    WHERE date >= $1 AND date <= $2
    GROUP BY date, cow_id
    ORDER BY date DESC, cow_id ASC
  `, [fromDate, toDate]);
  
  return result.rows.map(row => ({
    date: row.date.toISOString().split('T')[0],
    cowId: row.cow_id,
    feed: parseFloat(row.feed || 0),
    milk: parseFloat(row.milk || 0),
    lane: row.lane || '-'
  }));
}

