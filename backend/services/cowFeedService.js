import pool from '../config/database.js';

export const cowFeedService = {
  /**
   * Log feed for a single cow
   */
  logSingleCowFeed: async (feedData) => {
    const { cowId, date, session, category, type, quantity_kg } = feedData;
    const result = await pool.query(`
      INSERT INTO cow_feed_log (cow_id, date, session, feed_category, feed_type, quantity_kg)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [cowId, date, session, category, type, quantity_kg]);
    return result.rows[0];
  },

  /**
   * Log feed for multiple cows (Bulk)
   */
  logBulkCowFeed: async (bulkData) => {
    const { cows, date, session, category, type, quantity_per_cow } = bulkData;
    const bulkId = `bulk_${Date.now()}`;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      
      for (const cowId of cows) {
        const res = await client.query(`
          INSERT INTO cow_feed_log (cow_id, date, session, feed_category, feed_type, quantity_kg, is_bulk, bulk_id)
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
          RETURNING *
        `, [cowId, date, session, category, type, quantity_per_cow, bulkId]);
        results.push(res.rows[0]);
      }
      
      await client.query('COMMIT');
      return { bulkId, count: results.length, data: results };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Get cows by weight group for targeting
   */
  getCowsInWeightRange: async (min, max) => {
    let query = "SELECT cow_id, weight_kg, breed, cow_type FROM cows WHERE status = 'active' AND is_active = true";
    const params = [];
    
    if (min !== null && max !== null) {
      query += " AND weight_kg >= $1 AND weight_kg <= $2";
      params.push(min, max);
    } else if (min !== null) {
      query += " AND weight_kg >= $1";
      params.push(min);
    } else if (max !== null) {
      query += " AND weight_kg <= $1";
      params.push(max);
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  }
};
