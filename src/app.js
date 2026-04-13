require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/db');
const logger = require('./utils/logger');

const app = express();

// Security & logging middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));

// JSON body parsing for all routes EXCEPT /device/data
// (that route uses express.raw() for HMAC verification)
app.use((req, res, next) => {
  if (req.path === '/device/data') return next();
  express.json()(req, res, next);
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/device', require('./routes/device'));
app.use('/health-data', require('./routes/health-data'));
app.use('/contacts', require('./routes/contacts'));
app.use('/thresholds', require('./routes/thresholds'));
app.use('/alerts', require('./routes/alerts'));
app.use('/caregiver', require('./routes/caregiver'));

// Root
app.get('/', (req, res) => res.send('eVida backend running'));

// Health check (also pings the DB)
app.get('/health', async (req, res) => {
  let dbStatus = 'ok';
  try {
    await db.raw('SELECT 1');
  } catch {
    dbStatus = 'error';
  }
  return res.json({ status: 'ok', db: dbStatus, timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message);
  return res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
