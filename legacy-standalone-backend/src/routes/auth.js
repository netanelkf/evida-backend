const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Threshold = require('../models/Threshold');
const authMiddleware = require('../middleware/auth');

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// POST /auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    body('role').optional().isIn(['user', 'caregiver']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, name, phone, role } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password_hash, name, phone, role: role || 'user' });

    // Seed default alert thresholds for this user
    await Threshold.createDefaults(user.id);

    const token = signToken(user);
    return res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }
);

// POST /auth/login
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }
);

// GET /auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password_hash, ...safe } = user;
  return res.json(safe);
});

// PATCH /auth/me — update push token, name, phone
router.patch('/me', authMiddleware, async (req, res) => {
  const { name, phone, expo_push_token } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (expo_push_token !== undefined) updates.expo_push_token = expo_push_token;

  const user = await User.update(req.user.userId, updates);
  const { password_hash, ...safe } = user;
  return res.json(safe);
});

module.exports = router;
