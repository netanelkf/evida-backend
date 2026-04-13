const router = require('express').Router();
const auth = require('../middleware/auth');
const HealthData = require('../models/HealthData');
const asyncHandler = require('../utils/asyncHandler');

// GET /health-data
router.get('/', auth, asyncHandler(async (req, res) => {
  const { from, to, metric, limit = 50, offset = 0 } = req.query;
  const data = await HealthData.findByUser({
    user_id: req.user.userId,
    from, to, metric,
    limit: Number(limit),
    offset: Number(offset),
  });
  return res.json(data);
}));

// GET /health-data/latest
router.get('/latest', auth, asyncHandler(async (req, res) => {
  const data = await HealthData.getLatest(req.user.userId);
  if (!data) return res.status(404).json({ error: 'No data found' });
  return res.json(data);
}));

// GET /health-data/summary
router.get('/summary', auth, asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const summary = await HealthData.getSummary({ user_id: req.user.userId, from, to });
  return res.json(summary);
}));

module.exports = router;
