require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const db = require('./config/db');
const logger = require('./utils/logger');

const app = express();

// CORS: restrict to ALLOWED_ORIGINS (comma-separated) when set. Falls back to
// allowing all origins, which is fine for local dev but should be configured
// before deploying to production.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
  logger.warn('ALLOWED_ORIGINS is not set in production — CORS will allow all origins');
}

const corsOptions =
  allowedOrigins.length > 0
    ? {
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
          return callback(new Error('Not allowed by CORS'));
        },
      }
    : {};

// Security & logging middleware
app.use(helmet());
app.use(cors(corsOptions));
if (process.env.NODE_ENV !== 'test') app.use(morgan('combined'));

// Rate limit auth routes to slow down credential-stuffing / brute force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

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
