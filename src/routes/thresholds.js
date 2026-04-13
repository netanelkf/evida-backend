const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Threshold = require('../models/Threshold');
const asyncHandler = require('../utils/asyncHandler');

// GET /thresholds
router.get('/', auth, asyncHandler(async (req, res) => {
  const thresholds = await Threshold.findByUser(req.user.userId);
  return res.json(thresholds);
}));

// PUT /thresholds/:metric
router.put(
  '/:metric',
  auth,
  [
    body('min_value').optional().isNumeric(),
    body('max_value').optional().isNumeric(),
    body('enabled').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { min_value, max_value, enabled } = req.body;
    const threshold = await Threshold.upsert(req.user.userId, req.params.metric, {
      min_value, max_value, enabled,
    });
    return res.json(threshold);
  })
);

// POST /thresholds/reset
router.post('/reset', auth, asyncHandler(async (req, res) => {
  const thresholds = await Threshold.resetToDefaults(req.user.userId);
  return res.json(thresholds);
}));

module.exports = router;
