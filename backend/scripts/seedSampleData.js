import dns from 'dns';
const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname && hostname.includes('neon.tech')) {
    console.log(`[DNS Patch] Resolving ${hostname} to 13.228.184.177`);
    if (options && options.all) {
      return callback(null, [{ address: '13.228.184.177', family: 4 }]);
    }
    return callback(null, '13.228.184.177', 4);
  }
  return originalLookup(hostname, options, callback);
};

import pool from '../config/database.js';

function getPastDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

async function seedData() {
  try {
    console.log('🚀 Connecting to database to seed sample data...');
    
    // 1. Insert Sample Cows
    console.log('🐄 Inserting Cows...');
    const cows = [
      { cow_id: 'COW001', name: 'Bessie', cow_type: 'milking', breed: 'Holstein', weight_kg: 550 },
      { cow_id: 'COW002', name: 'Daisy', cow_type: 'milking', breed: 'Jersey', weight_kg: 480 },
      { cow_id: 'COW003', name: 'Rosie', cow_type: 'milking', breed: 'Guernsey', weight_kg: 420 },
      { cow_id: 'COW004', name: 'Clara', cow_type: 'dry', breed: 'Holstein', weight_kg: 600 },
      { cow_id: 'COW005', name: 'Bella', cow_type: 'pregnant', breed: 'Jersey', weight_kg: 510 },
    ];
    
    for (const cow of cows) {
      await pool.query(`
        INSERT INTO cows (cow_id, name, cow_type, breed, weight_kg, status, is_active)
        VALUES ($1, $2, $3, $4, $5, 'active', true)
        ON CONFLICT (cow_id) DO NOTHING
      `, [cow.cow_id, cow.name, cow.cow_type, cow.breed, cow.weight_kg]);
    }

    // 2. Get some feed item IDs
    const feedRes = await pool.query(`SELECT id, item_name FROM feed_item_master LIMIT 3`);
    const feedItems = feedRes.rows;
    if (feedItems.length > 0) {
      console.log('🌾 Inserting Farm Feed Logs...');
      // 3. Insert Farm Feed Logs for past 3 days (today=0, yesterday=1, day before=2)
      for (let i = 2; i >= 0; i--) {
        const date = getPastDate(i);
        for (const item of feedItems) {
          await pool.query(`
            INSERT INTO feed_log (date, feed_item_id, quantity_kg, cost_per_unit, total_amount, input_source)
            VALUES ($1, $2, $3, $4, $5, 'Purchased')
          `, [date, item.id, Math.floor(Math.random() * 50) + 20, 25.50, 1500]);
        }
      }
    }

    console.log('🥛 Inserting Daily Lane Logs & Milk Yields...');
    const dates = [getPastDate(2), getPastDate(1), getPastDate(0)];
    
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const isToday = (i === 2);
      
      // For each milking cow
      const milkingCows = ['COW001', 'COW002', 'COW003'];
      let totalMilkDay = 0;
      let totalFeedDay = 0;

      for (let lane = 1; lane <= milkingCows.length; lane++) {
        const cowId = milkingCows[lane - 1];
        const morningYield = Math.floor(Math.random() * 5) + 12; // 12-16 liters
        const eveningYield = isToday ? null : Math.floor(Math.random() * 5) + 10; // 10-14 liters
        const totalYield = isToday ? morningYield : morningYield + eveningYield;
        const feedGiven = Math.floor(Math.random() * 3) + 7; // 7-9 kg
        
        totalMilkDay += totalYield;
        totalFeedDay += feedGiven;

        // Insert into daily_lane_log
        await pool.query(`
          INSERT INTO daily_lane_log (date, lane_no, cow_id, cow_type, feed_given_kg, morning_yield_l, evening_yield_l, total_yield_l)
          VALUES ($1, $2, $3, 'milking', $4, $5, $6, $7)
          ON CONFLICT (date, lane_no, cow_id) DO UPDATE SET 
            feed_given_kg = EXCLUDED.feed_given_kg,
            morning_yield_l = EXCLUDED.morning_yield_l,
            evening_yield_l = EXCLUDED.evening_yield_l,
            total_yield_l = EXCLUDED.total_yield_l
        `, [date, lane, cowId, feedGiven, morningYield, eveningYield, totalYield]);

        // Insert into milk_yield_log
        await pool.query(`
          INSERT INTO milk_yield_log (date, cow_id, session, milk_qty_kg, milk_qty_litre, recorded_at)
          VALUES ($1, $2, 'Morning', $3, $4, CURRENT_TIMESTAMP)
        `, [date, cowId, morningYield * 1.03, morningYield]);

        if (!isToday) {
          await pool.query(`
            INSERT INTO milk_yield_log (date, cow_id, session, milk_qty_kg, milk_qty_litre, recorded_at)
            VALUES ($1, $2, 'Evening', $3, $4, CURRENT_TIMESTAMP)
          `, [date, cowId, eveningYield * 1.03, eveningYield]);
        }
      }

      // Insert daily farm summary
      await pool.query(`
        INSERT INTO daily_farm_summary (date, total_feed_kg, total_milk_litre, best_cow_id, lowest_cow_id)
        VALUES ($1, $2, $3, 'COW001', 'COW003')
        ON CONFLICT (date) DO UPDATE SET
          total_feed_kg = EXCLUDED.total_feed_kg,
          total_milk_litre = EXCLUDED.total_milk_litre
      `, [date, totalFeedDay * 5, totalMilkDay]);
    }

    console.log('✅ Sample data successfully seeded!');
    
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seedData();
