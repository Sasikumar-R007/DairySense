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
export async function registerUser(email, password) {
  // Check if user already exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  
  if (existingUser.rows.length > 0) {
    throw new Error('User with this email already exists');
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Create user
  const result = await pool.query(
    `INSERT INTO users (email, password_hash) 
     VALUES ($1, $2) 
     RETURNING id, email, created_at`,
    [email, passwordHash]
  );
  
  return result.rows[0];
}

/**
 * Authenticate user and return JWT token
 */
export async function loginUser(email, password) {
  // Find user
  const result = await pool.query(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    [email]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }
  
  const user = result.rows[0];
  
  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  
  if (!isValid) {
    throw new Error('Invalid email or password');
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return {
    token,
    user: {
      id: user.id,
      email: user.email
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

