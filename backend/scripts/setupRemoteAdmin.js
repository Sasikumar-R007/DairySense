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

import { initializeSchema } from '../config/dbSchema.js';
import { registerUser } from '../services/authService.js';
import pool from '../config/database.js';

async function setup() {
  try {
    console.log('🚀 Connecting to remote database to initialize schema...');
    await initializeSchema();
    console.log('✅ Remote database schema successfully initialized!');

    console.log('\nCreating initial admin user...');
    const email = 'admin@dairysense.com';
    const password = 'admin';

    try {
      const user = await registerUser(email, password);
      console.log('✅ Admin user created successfully!');
      console.log('-----------------------------------');
      console.log(`Email:    ${email}`);
      console.log(`Password: ${password}`);
      console.log('-----------------------------------');
      console.log('You can use these credentials to log in to your hosted URL.');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('⚠️ Admin user already exists. You can log in using your existing credentials.');
      } else {
        console.error('❌ Failed to create admin user:', e.message);
      }
    }
    
  } catch (err) {
    console.error('❌ Setup failed:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

setup();
