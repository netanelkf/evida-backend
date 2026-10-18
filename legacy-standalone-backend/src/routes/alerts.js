const router = require('express').Router();
const auth = require('../middleware/auth');
const Alert = require('../models/Alert');

// GET /alerts
router.get('/', auth, async (req, res) => {
  const { status, limit = 20, offset = 0 } = req.query;
  const alerts = await Alert.findByUser({
    user_id: req.user.userId,
    status,
    limit: Number(limit),
    offset: Number(offset),
  });
  return res.json(alerts);
});

// GET /alerts/stats
router.get('/stats', auth, async (req, res) => {
  const stats = await Alert.getStats(req.user.userId);
  return res.json(stats);
});

// POST /alerts/:id/acknowledge
router.post('/:id/acknowledge', auth, async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  if (alert.user_id !== req.user.userId && req.user.role !== 'caregiver' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const updated = await Alert.acknowledge(req.params.id, req.user.userId);
  return res.json(updated);
});

module.exports = router;
