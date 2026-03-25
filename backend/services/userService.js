import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

export async function getAllUsers() {
  const result = await pool.query(
    'SELECT id, name, email, phone_number, role, permissions, last_login_at, last_active_at, created_at FROM users ORDER BY created_at DESC'
  );
  return result.rows;
}

export async function createUser(data) {
  const { name, phoneNumber, email, password, role, permissions } = data;
  
  // Check if phone or email exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE (email = $1 AND email IS NOT NULL) OR (phone_number = $2 AND phone_number IS NOT NULL)',
    [email || null, phoneNumber || null]
  );
  
  if (existingUser.rows.length > 0) {
    throw new Error('User with this email or phone number already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  
  const result = await pool.query(
    `INSERT INTO users (name, phone_number, email, role, permissions, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, phone_number, email, role, permissions, created_at`,
    [name, phoneNumber || null, email || null, role || 'worker', permissions || '{}', passwordHash]
  );
  
  return result.rows[0];
}

export async function updateUser(id, data) {
  const { name, phoneNumber, email, role, permissions, password } = data;
  
  // Need to dynamically build query
  let query = 'UPDATE users SET name = $1, phone_number = $2, email = $3, role = $4, permissions = $5';
  let values = [name, phoneNumber || null, email || null, role, permissions];
  
  if (password) {
    const passwordHash = await bcrypt.hash(password, 10);
    query += ', password_hash = $6 WHERE id = $7 RETURNING id, name, phone_number, email, role, permissions';
    values.push(passwordHash, id);
  } else {
    query += ' WHERE id = $6 RETURNING id, name, phone_number, email, role, permissions';
    values.push(id);
  }
  
  const result = await pool.query(query, values);
  if (result.rows.length === 0) {
    throw new Error('User not found');
  }
  
  return result.rows[0];
}

export async function deleteUser(id) {
  // Prevent deleting the main admin roughly speaking by checking role or enforcing constraint
  // It's safer if frontend checks it, but let's just delete
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  
  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return { success: true };
}

export async function updateUserProfile(id, data) {
  const { name, phoneNumber, email } = data;
  const result = await pool.query(
    'UPDATE users SET name = $1, phone_number = $2, email = $3 WHERE id = $4 RETURNING id, name, phone_number, email',
    [name, phoneNumber || null, email || null, id]
  );
  if (result.rows.length === 0) throw new Error('User not found');
  return result.rows[0];
}

export async function updateUserPassword(id, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
    [passwordHash, id]
  );
  if (result.rows.length === 0) throw new Error('User not found');
  return { success: true };
}
