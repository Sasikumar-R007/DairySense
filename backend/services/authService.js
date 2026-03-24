/**
 * Authentication Service
 * Handles user registration and authentication
 */

import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

/**
 * Register a new user
 */
export async function registerUser(email, password, name = null, phoneNumber = null, role = 'admin', permissions = '{}') {
  // Check if user already exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE (email = $1 AND email IS NOT NULL) OR (phone_number = $2 AND phone_number IS NOT NULL)',
    [email, phoneNumber]
  );
  
  if (existingUser.rows.length > 0) {
    throw new Error('User with this email or phone number already exists');
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Create user
  const result = await pool.query(
    `INSERT INTO users (email, phone_number, name, role, permissions, password_hash) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING id, email, phone_number, name, role, permissions, created_at`,
    [email, phoneNumber, name, role, permissions, passwordHash]
  );
  
  return result.rows[0];
}

/**
 * Authenticate user and return JWT token
 */
export async function loginUser(emailOrPhone, password) {
  // Find user
  const result = await pool.query(
    'SELECT id, email, phone_number, name, role, permissions, password_hash FROM users WHERE email = $1 OR phone_number = $1',
    [emailOrPhone]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Invalid mobile number, email, or password');
  }
  
  const user = result.rows[0];
  
  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  
  if (!isValid) {
    throw new Error('Invalid mobile number, email, or password');
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { 
      userId: user.id, 
      email: user.email,
      phoneNumber: user.phone_number,
      role: user.role,
      permissions: user.permissions
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  // Track last login
  await pool.query(
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );
  
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      phoneNumber: user.phone_number,
      name: user.name,
      role: user.role,
      permissions: user.permissions
    }
  };
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

