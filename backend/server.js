/**
 * Express Server
 * Main entry point for the backend API server
 */

import express from 'express'; // Force Render redeployment trigger
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeSchema } from './config/dbSchema.js';
import authRoutes from './routes/auth.js';
import dailyLaneLogRoutes from './routes/dailyLaneLog.js';
import cowsRoutes from './routes/cows.js';
import monitoringRoutes from './routes/monitoring.js';
import feedRoutes from './routes/feed.js';
import milkRoutes from './routes/milk.js';
import medicineRoutes from './routes/medicine.js';
import activityRoutes from './routes/activity.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/report.js';
import usersRoutes from './routes/users.js';
import settingsRoutes from './routes/settings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [FRONTEND_URL, FRONTEND_URL.replace(/\/$/, ''), 'https://dairysense.vercel.app']
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'DairySense API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/daily-lane-log', dailyLaneLogRoutes);
app.use('/api/cows', cowsRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/milk', milkRoutes);
app.use('/api/medicine', medicineRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database schema and start server
async function startServer() {
  try {
    await initializeSchema();
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on all interfaces (port ${PORT})`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

