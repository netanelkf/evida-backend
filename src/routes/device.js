const router = require('express').Router();
const rookWebhookVerify = require('../middleware/rookWebhookVerify');
const { parseRookPayload } = require('../services/rookParser');
const { checkVitals } = require('../services/alertEngine');
const User = require('../models/User');
const HealthData = require('../models/HealthData');
const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');

// POST /device/data
// Uses express.raw() to preserve raw body for HMAC verification.
// rookWebhookVerify middleware then parses JSON after signature check.
router.post(
  '/data',
  require('express').raw({ type: 'application/json' }),
  rookWebhookVerify,
  asyncHandler(async (req, res) => {
    const payload = req.body;

    if (!payload || !payload.rook_user_id) {
      return res.status(400).json({ error: 'Missing rook_user_id in payload' });
    }

    const user = await User.findByRookId(payload.rook_user_id);
    if (!user) {
      logger.warn('Received data for unknown rook_user_id:', payload.rook_user_id);
      // Return 200 so Rook doesn't keep retrying for unmapped users
      return res.json({ received: true, stored: false, reason: 'user_not_found' });
    }

    const rows = parseRookPayload(payload);
    const saved = [];

    for (const row of rows) {
      const { rook_user_id, ...data } = row;
      const record = await HealthData.insert({ user_id: user.id, ...data });
      saved.push(record);
      await checkVitals(user.id, record);
    }

    logger.info(`Stored ${saved.length} health_data rows for user ${user.id}`);
    return res.json({ received: true, stored: saved.length });
  })
);

module.exports = router;
