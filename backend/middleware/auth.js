/**
 * Authentication Middleware
 * Verifies JWT token on protected routes
 */

import pool from '../config/database.js';
import { verifyToken } from '../services/authService.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    
    // Asynchronously update last active timestamp
    pool.query('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1', [decoded.userId])
      .catch(err => console.error('Error updating last_active_at:', err));

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function authorizeAdmin(req, res, next) {
  if (req.user && req.user.role !== 'worker') {
    next();
  } else {
    return res.status(403).json({ error: 'Admin access required' });
  }
}

