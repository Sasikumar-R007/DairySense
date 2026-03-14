/**
 * Daily Lane Log Service
 * 
 * All business logic for managing daily_lane_log table.
 * Lane is the primary anchor - one row per cow per lane per day.
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
 * Finds an existing row for today + lane + cow
 * Returns row data if found, null otherwise
 */
async function findExistingRow(date, laneNo, cowId) {
  const result = await pool.query(
    `SELECT * FROM daily_lane_log 
     WHERE date = $1 AND lane_no = $2 AND cow_id = $3`,
    [date, laneNo, cowId]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Creates or updates a daily lane log entry (UPSERT)
 * Prevents duplicate rows for same cow + lane + day
 * Auto-calculates total_yield_l
 */
export async function upsertDailyLaneLog(date, laneNo, cowId, cowType, updates = {}) {
  const existing = await findExistingRow(date, laneNo, cowId);
  
  // Calculate total yield if morning or evening yield is being updated
  let totalYieldL = updates.total_yield_l !== undefined ? updates.total_yield_l : null;
  if (updates.morning_yield_l !== undefined || updates.evening_yield_l !== undefined) {
    const existingMorning = existing?.morning_yield_l || null;
    const existingEvening = existing?.evening_yield_l || null;
    
    const morningYield = updates.morning_yield_l !== undefined 
      ? updates.morning_yield_l 
      : existingMorning;
    
    const eveningYield = updates.evening_yield_l !== undefined 
      ? updates.evening_yield_l 
      : existingEvening;
    
    if (morningYield !== null || eveningYield !== null) {
      totalYieldL = (parseFloat(morningYield) || 0) + (parseFloat(eveningYield) || 0);
    }
  }
  
  if (existing) {
    // Update existing row
    const setClauses = [];
    const values = [];
    let paramCount = 1;
    
    if (updates.feed_given_kg !== undefined) {
      setClauses.push(`feed_given_kg = $${paramCount++}`);
      values.push(updates.feed_given_kg);
    }
    if (updates.morning_yield_l !== undefined) {
      setClauses.push(`morning_yield_l = $${paramCount++}`);
      values.push(updates.morning_yield_l);
    }
    if (updates.evening_yield_l !== undefined) {
      setClauses.push(`evening_yield_l = $${paramCount++}`);
      values.push(updates.evening_yield_l);
    }
    if (updates.total_yield_l !== undefined || totalYieldL !== null) {
      setClauses.push(`total_yield_l = $${paramCount++}`);
      values.push(totalYieldL);
    }
    
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    
    values.push(existing.id);
    
    const result = await pool.query(
      `UPDATE daily_lane_log 
       SET ${setClauses.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    
    return result.rows[0];
  } else {
    // Create new row
    const result = await pool.query(
      `INSERT INTO daily_lane_log 
       (date, lane_no, cow_id, cow_type, feed_given_kg, morning_yield_l, evening_yield_l, total_yield_l)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        date,
        laneNo,
        cowId,
        cowType,
        updates.feed_given_kg || null,
        updates.morning_yield_l || null,
        updates.evening_yield_l || null,
        updates.total_yield_l !== undefined ? updates.total_yield_l : totalYieldL
      ]
    );
    
    return result.rows[0];
  }
}

/**
 * Records feed for a cow in a lane
 * Flow A: Feed Distribution
 * Gets cow_type from cows table if not provided
 */
export async function recordFeed(laneNo, cowId, feedKg, cowType = null) {
  const today = getTodayDateString();
  const existing = await findExistingRow(today, laneNo, cowId);
  
  // If cow_type not provided, get it from cows table
  if (!cowType) {
    const cowResult = await pool.query(
      'SELECT cow_type FROM cows WHERE cow_id = $1',
      [cowId]
    );
    if (cowResult.rows.length > 0) {
      cowType = cowResult.rows[0].cow_type || 'normal';
    } else {
      cowType = 'normal'; // Default if cow not found
    }
  }

  const updatedFeedKg = (parseFloat(existing?.feed_given_kg) || 0) + (parseFloat(feedKg) || 0);
  
  return await upsertDailyLaneLog(today, laneNo, cowId, cowType, {
    feed_given_kg: updatedFeedKg
  });
}

/**
 * Records feed and milk yield together for demo mode
 * Creates or updates today's row for date + lane + cow
 */
export async function recordDailyCowData(laneNo, cowId, feedKg, milkYieldL) {
  const today = getTodayDateString();

  const cowResult = await pool.query(
    'SELECT cow_type FROM cows WHERE cow_id = $1',
    [cowId]
  );

  if (cowResult.rows.length === 0) {
    throw new Error(`Cow ${cowId} not found`);
  }

  const cowType = cowResult.rows[0].cow_type || 'normal';

  return await upsertDailyLaneLog(today, laneNo, cowId, cowType, {
    feed_given_kg: feedKg,
    total_yield_l: milkYieldL
  });
}

/**
 * Records milk yield for a cow
 * Flow B: Milk Yield Monitoring
 * Updates all today's entries for that cow (in case cow was moved between lanes)
 */
export async function recordMilkYield(cowId, session, yieldL) {
  const today = getTodayDateString();

  const cowResult = await pool.query(
    'SELECT cow_type FROM cows WHERE cow_id = $1',
    [cowId]
  );

  if (cowResult.rows.length === 0) {
    throw new Error(`Cow ${cowId} not found`);
  }

  if (cowResult.rows[0].cow_type === 'calf') {
    throw new Error(`Milk yield cannot be recorded for calf ${cowId}`);
  }
  
  // Find all today's rows for this cow
  const result = await pool.query(
    `SELECT * FROM daily_lane_log 
     WHERE date = $1 AND cow_id = $2`,
    [today, cowId]
  );
  
  if (result.rows.length === 0) {
    throw new Error(`No entry found for cow ${cowId} today. Please record feed first.`);
  }
  
  // Update all today's entries for this cow
  const updatePromises = result.rows.map(async (row) => {
    const updates = {};
    if (session === 'morning') {
      updates.morning_yield_l = yieldL;
    } else if (session === 'evening') {
      updates.evening_yield_l = yieldL;
    }
    
    // Calculate total yield
    const existingMorning = row.morning_yield_l || null;
    const existingEvening = row.evening_yield_l || null;
    
    const morningYield = session === 'morning' ? yieldL : existingMorning;
    const eveningYield = session === 'evening' ? yieldL : existingEvening;
    
    let totalYieldL = null;
    if (morningYield !== null || eveningYield !== null) {
      totalYieldL = (parseFloat(morningYield) || 0) + (parseFloat(eveningYield) || 0);
    }
    
    updates.total_yield_l = totalYieldL;
    
    return await upsertDailyLaneLog(
      today,
      row.lane_no,
      cowId,
      row.cow_type,
      updates
    );
  });
  
  await Promise.all(updatePromises);
  return result.rows;
}

/**
 * Gets existing entry for a cow in a lane today (if exists)
 */
export async function getTodayEntryForCowLane(laneNo, cowId) {
  const today = getTodayDateString();
  return await findExistingRow(today, laneNo, cowId);
}

/**
 * Gets today's daily lane log entries
 */
export async function getTodayLogs() {
  const today = getTodayDateString();
  
  const result = await pool.query(
    `SELECT * FROM daily_lane_log 
     WHERE date = $1 
     ORDER BY lane_no ASC`,
    [today]
  );
  
  return result.rows;
}

/**
 * Gets the next available lane number for today
 * Returns the lowest lane number that doesn't have a cow assigned today
 * If all lanes 1-50 are used, returns the next sequential number
 */
export async function getNextAvailableLane() {
  const today = getTodayDateString();
  
  // Get all lanes used today, ordered by lane number
  const result = await pool.query(
    `SELECT DISTINCT lane_no 
     FROM daily_lane_log 
     WHERE date = $1 
     ORDER BY lane_no ASC`,
    [today]
  );
  
  const usedLanes = result.rows.map(row => row.lane_no);
  
  // Find first available lane (1-50)
  for (let i = 1; i <= 50; i++) {
    if (!usedLanes.includes(i)) {
      return i;
    }
  }
  
  // If all lanes 1-50 are used, return next sequential
  if (usedLanes.length > 0) {
    return Math.max(...usedLanes) + 1;
  }
  
  // Default to lane 1 if no lanes used today
  return 1;
}

/**
 * Handles ESP32 scan - auto-assigns lane and returns cow details
 * Used for morning feed distribution
 */
export async function handleEsp32Scan(rfidUid, operation = 'feed') {
  const today = getTodayDateString();
  
  // Get cow by RFID UID
  const cowResult = await pool.query(
    'SELECT * FROM cows WHERE rfid_uid = $1',
    [rfidUid]
  );
  
  if (cowResult.rows.length === 0) {
    throw new Error('Cow not found for this RFID UID');
  }
  
  const cow = cowResult.rows[0];
  
  // Check if cow already has an entry today
  const existingEntries = await pool.query(
    `SELECT * FROM daily_lane_log 
     WHERE date = $1 AND cow_id = $2 
     ORDER BY lane_no ASC 
     LIMIT 1`,
    [today, cow.cow_id]
  );
  
  let laneNo;
  let existingEntry = null;
  
  if (existingEntries.rows.length > 0) {
    // Cow already assigned to a lane today
    existingEntry = existingEntries.rows[0];
    laneNo = existingEntry.lane_no;
  } else {
    // Auto-assign next available lane
    laneNo = await getNextAvailableLane();
    
    // Create entry with auto-assigned lane (no feed yet)
    await upsertDailyLaneLog(
      today,
      laneNo,
      cow.cow_id,
      cow.cow_type || 'normal',
      {} // No feed/milk data yet
    );
    
    // Fetch the created entry
    const newEntry = await findExistingRow(today, laneNo, cow.cow_id);
    existingEntry = newEntry;
  }
  
  // Calculate feed suggestion based on cow type
  const feedSuggestions = {
    normal: 4.5,
    pregnant: 2.5,
    dry: 3.0
  };
  const feedSuggestion = feedSuggestions[cow.cow_type] || 4.5;
  
  return {
    cow: {
      cow_id: cow.cow_id,
      name: cow.name,
      cow_type: cow.cow_type || 'normal',
      breed: cow.breed
    },
    lane_no: laneNo,
    feed_suggestion_kg: feedSuggestion,
    existing_entry: existingEntry ? {
      feed_given_kg: existingEntry.feed_given_kg,
      morning_yield_l: existingEntry.morning_yield_l,
      evening_yield_l: existingEntry.evening_yield_l,
      total_yield_l: existingEntry.total_yield_l
    } : null
  };
}
