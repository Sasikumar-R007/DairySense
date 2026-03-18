/**
 * Activity Service
 * Independent V2 stage-based activity and alert scheduling.
 */

import pool from '../config/database.js';

const ALLOWED_STATUS = ['Pending', 'Completed', 'Skipped'];

function normalizeStatus(status) {
  const match = ALLOWED_STATUS.find(
    (allowed) => allowed.toLowerCase() === String(status || '').trim().toLowerCase()
  );

  if (!match) {
    throw new Error(`status must be one of: ${ALLOWED_STATUS.join(', ')}`);
  }

  return match;
}

function calculatePregnancyMonth(cow) {
  const referenceDate = cow.purchase_date || cow.updated_at || cow.created_at || null;
  if (!referenceDate) {
    return 1;
  }

  const start = new Date(referenceDate);
  const today = new Date();
  const monthDiff = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth()) + 1;
  return Math.max(1, monthDiff);
}

async function resolveCowStage(cow) {
  if (cow.cow_type === 'calf') {
    const result = await pool.query(
      `SELECT * FROM cow_stage_master WHERE stage_name = 'Calf' LIMIT 1`
    );
    return result.rows[0] || null;
  }

  if (cow.cow_type === 'milking') {
    const result = await pool.query(
      `SELECT * FROM cow_stage_master WHERE stage_name = 'Lactation' LIMIT 1`
    );
    return result.rows[0] || null;
  }

  if (cow.cow_type === 'pregnant') {
    const pregnancyMonth = calculatePregnancyMonth(cow);
    const exactStage = await pool.query(
      `SELECT * FROM cow_stage_master
       WHERE stage_type = 'Pregnancy'
         AND stage_name = $1
       LIMIT 1`,
      [`Pregnant Month ${pregnancyMonth}`]
    );

    if (exactStage.rows.length > 0) {
      return exactStage.rows[0];
    }

    const fallbackStage = await pool.query(
      `SELECT *
       FROM cow_stage_master
       WHERE stage_type = 'Pregnancy'
       ORDER BY
         COALESCE(NULLIF(regexp_replace(stage_name, '[^0-9]', '', 'g'), ''), '0')::INTEGER DESC
       LIMIT 1`
    );

    return fallbackStage.rows[0] || null;
  }

  const genericStage = await pool.query(
    `SELECT *
     FROM cow_stage_master
     WHERE LOWER(stage_name) = LOWER($1)
        OR LOWER(stage_type) = LOWER($1)
     LIMIT 1`,
    [cow.cow_type]
  );

  return genericStage.rows[0] || null;
}

async function getCowOrThrow(cowId) {
  const result = await pool.query(
    `SELECT cow_id, cow_type, purchase_date, created_at, updated_at, is_active, status
     FROM cows
     WHERE cow_id = $1`,
    [cowId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Cow ${cowId} not found`);
  }

  return result.rows[0];
}

export async function getActivitiesByStage(stageId) {
  const result = await pool.query(
    `SELECT
        a.id,
        a.activity_name,
        a.stage_id,
        a.description,
        a.frequency,
        a.created_at,
        s.stage_name,
        s.stage_type
     FROM activity_master a
     JOIN cow_stage_master s ON s.id = a.stage_id
     WHERE a.stage_id = $1
     ORDER BY a.activity_name ASC`,
    [stageId]
  );

  return result.rows;
}

export async function generateCowActivities(cowId) {
  const cow = await getCowOrThrow(cowId);
  const stage = await resolveCowStage(cow);

  if (!stage) {
    throw new Error(`No stage mapping found for cow ${cowId}`);
  }

  const activities = await getActivitiesByStage(stage.id);
  const dueDate = new Date().toISOString().split('T')[0];
  const createdEntries = [];

  for (const activity of activities) {
    const existing = await pool.query(
      `SELECT *
       FROM cow_activity_schedule
       WHERE cow_id = $1
         AND activity_id = $2
         AND due_date = $3
       LIMIT 1`,
      [cowId, activity.id, dueDate]
    );

    if (existing.rows.length > 0) {
      createdEntries.push(existing.rows[0]);
      continue;
    }

    const inserted = await pool.query(
      `INSERT INTO cow_activity_schedule (cow_id, activity_id, due_date, status, notes)
       VALUES ($1, $2, $3, 'Pending', $4)
       RETURNING *`,
      [cowId, activity.id, dueDate, null]
    );

    createdEntries.push(inserted.rows[0]);
  }

  return {
    cow_id: cowId,
    stage: {
      id: stage.id,
      stage_name: stage.stage_name,
      stage_type: stage.stage_type
    },
    schedules: createdEntries
  };
}

export async function getPendingActivities(cowId = null) {
  const values = [];
  let whereClause = `WHERE sch.status = 'Pending'`;

  if (cowId) {
    values.push(cowId);
    whereClause += ` AND sch.cow_id = $1`;
  }

  const result = await pool.query(
    `SELECT
        sch.id,
        sch.cow_id,
        sch.activity_id,
        sch.due_date,
        sch.status,
        sch.notes,
        sch.created_at,
        act.activity_name,
        act.description AS activity_description,
        act.frequency,
        stage.stage_name,
        stage.stage_type
     FROM cow_activity_schedule sch
     JOIN activity_master act ON act.id = sch.activity_id
     JOIN cow_stage_master stage ON stage.id = act.stage_id
     ${whereClause}
     ORDER BY sch.due_date ASC, sch.cow_id ASC, act.activity_name ASC`,
    values
  );

  return result.rows;
}

export async function getCowActivities(cowId) {
  await getCowOrThrow(cowId);

  const result = await pool.query(
    `SELECT
        sch.id,
        sch.cow_id,
        sch.activity_id,
        sch.due_date,
        sch.status,
        sch.notes,
        sch.created_at,
        act.activity_name,
        act.description AS activity_description,
        act.frequency,
        stage.stage_name,
        stage.stage_type
     FROM cow_activity_schedule sch
     JOIN activity_master act ON act.id = sch.activity_id
     JOIN cow_stage_master stage ON stage.id = act.stage_id
     WHERE sch.cow_id = $1
     ORDER BY sch.due_date DESC, sch.created_at DESC`,
    [cowId]
  );

  return result.rows;
}

export async function updateActivityStatus(scheduleId, status, notes = null) {
  const normalizedStatus = normalizeStatus(status);

  const result = await pool.query(
    `UPDATE cow_activity_schedule
     SET status = $1,
         notes = COALESCE($2, notes)
     WHERE id = $3
     RETURNING *`,
    [normalizedStatus, notes, scheduleId]
  );

  if (result.rows.length === 0) {
    throw new Error(`Activity schedule ${scheduleId} not found`);
  }

  return result.rows[0];
}
