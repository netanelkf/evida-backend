import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import { requireOperator } from '../middleware/auth.js';

const router = Router();
const SESSION_TTL_HOURS = 12;

router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, fullName, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, name, phone, role)
       VALUES ($1, $2, $3, $4, $5, 'user')
       RETURNING id, username, email, name, phone, created_at`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash, fullName || username, phone || null]
    );

    const user = result.rows[0];

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await pool.query(
      `SELECT id, username, email, password_hash, name, phone, role
       FROM users
       WHERE username = $1 OR email = $1`,
      [username.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `INSERT INTO sessions (token, user_id, role, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '${SESSION_TTL_HOURS} hours')`,
      [token, user.id, user.role]
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me - validate an operator session token
router.get('/me', requireOperator, async (req, res) => {
  const result = await pool.query(
    'SELECT id, username, email, name, role FROM users WHERE id = $1',
    [req.operator.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: result.rows[0] });
});

// POST /api/auth/logout - invalidate the session token
router.post('/logout', async (req, res) => {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
  }
  res.json({ success: true });
});

router.get('/users', requireOperator, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, name, phone, role, created_at, last_login_at
       FROM users
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`
    );

    res.json({ users: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

router.get('/users/:id', requireOperator, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, username, email, name, phone, role, created_at, last_login_at,
              last_lat, last_lng, last_location_update
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
