import { Router } from 'express';
import crypto from 'crypto';
import pool from '../db/pool.js';

const router = Router();

// health_events table is now defined in db/schema.sql and initialised by db/init.js.
// This function is kept as a no-op shim so existing import sites don't break.
async function initHealthEventsTable() {
  console.log('[Webhooks] Health events table managed by schema.sql');
}

// ============================================================
// ROOK WEBHOOK SIGNATURE VERIFICATION
// ============================================================
// Behaviour by environment:
//   production  — signature is REQUIRED. Missing secret or header → 401.
//   development — signature is checked when both secret and header are present;
//                 skipped (with warning) only when ROOK_CLIENT_SECRET is not set.
//
// Fixes the previous "skip if not configured" bypass that allowed any caller to
// inject arbitrary health data in production.

function verifyRookSignature(rawBody, signature, secret) {
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // In production, a missing secret is a server misconfiguration — reject.
      return { ok: false, reason: 'ROOK_CLIENT_SECRET not configured on server' };
    }
    // Dev/staging: warn but allow so local testing is not blocked.
    console.warn('[Webhooks] ROOK_CLIENT_SECRET not set — skipping signature check (dev only)');
    return { ok: true };
  }

  if (!signature) {
    return { ok: false, reason: 'Missing x-rook-signature header' };
  }

  // ROOK sends the hex-encoded HMAC-SHA256 of the raw request body.
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');

  // timingSafeEqual requires equal-length buffers — compare hex strings, not raw.
  const sigBuf      = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expected,  'hex');

  if (sigBuf.length !== expectedBuf.length) {
    return { ok: false, reason: 'Signature length mismatch' };
  }

  const valid = crypto.timingSafeEqual(sigBuf, expectedBuf);
  return valid ? { ok: true } : { ok: false, reason: 'Signature mismatch' };
}

// Alert thresholds for vitals
const ALERT_THRESHOLDS = {
  heart_rate:               { min: 50,   max: 120 },
  oxygen_saturation:        { min: 92 },
  temperature:              { min: 35.5, max: 38.5 },
  blood_pressure_systolic:  { max: 180 },
  blood_pressure_diastolic: { max: 120 }
};

// Check if vitals exceed thresholds and log / create SOS events
async function checkVitalAlerts(userId, eventType, payload) {
  const alerts = [];

  if (eventType.includes('heart_rate') && payload.heart_rate) {
    const hr = payload.heart_rate.avg ?? payload.heart_rate.value ?? payload.heart_rate;
    if (typeof hr === 'number') {
      if (hr < ALERT_THRESHOLDS.heart_rate.min)
        alerts.push({ type: 'LOW_HEART_RATE',  value: hr, threshold: ALERT_THRESHOLDS.heart_rate.min });
      if (hr > ALERT_THRESHOLDS.heart_rate.max)
        alerts.push({ type: 'HIGH_HEART_RATE', value: hr, threshold: ALERT_THRESHOLDS.heart_rate.max });
    }
  }

  if (eventType.includes('oxygen') && payload.oxygen_saturation) {
    const o2 = payload.oxygen_saturation.avg ?? payload.oxygen_saturation.value ?? payload.oxygen_saturation;
    if (typeof o2 === 'number' && o2 < ALERT_THRESHOLDS.oxygen_saturation.min)
      alerts.push({ type: 'LOW_OXYGEN', value: o2, threshold: ALERT_THRESHOLDS.oxygen_saturation.min });
  }

  for (const alert of alerts) {
    console.warn(`[ALERT] User ${userId}: ${alert.type} — value: ${alert.value}, threshold: ${alert.threshold}`);
    try {
      await pool.query(
        `INSERT INTO sos_events (user_id, source, type, payload_json) VALUES ($1, $2, $3, $4)`,
        [userId, 'ROOK_WEBHOOK', alert.type, JSON.stringify({ ...alert, original_payload: payload })]
      );
    } catch (err) {
      console.error('[ALERT] Failed to create SOS event:', err.message);
    }
  }

  return alerts;
}

// ============================================================
// POST /api/webhooks/rook — receive health data from ROOK
// ============================================================
// express.json() is mounted globally in index.js, so req.body is already parsed.
// To verify the signature we need the raw bytes; index.js must pass rawBody via
// express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } })
// until that is done we fall back to re-serialising the parsed body.

router.post('/rook', async (req, res) => {
  try {
    const signature  = req.headers['x-rook-signature'];
    const rookSecret = process.env.ROOK_CLIENT_SECRET;

    // Use the raw body buffer when available (set by express.json verify option).
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

    const sigResult = verifyRookSignature(rawBody, signature, rookSecret);
    if (!sigResult.ok) {
      console.warn(`[Webhooks] Rejected webhook — ${sigResult.reason}`);
      return res.status(401).json({ error: 'Unauthorized', reason: sigResult.reason });
    }

    const payload    = req.body;
    const rookUserId = payload.user_id || payload.rook_user_id;
    const eventType  = payload.type    || payload.data_type || 'unknown';
    const dataSource = payload.data_source || payload.source || 'rook';
    const recordedAt = payload.datetime   || payload.recorded_at || new Date().toISOString();

    console.log(`[Webhooks] Received ROOK webhook: ${eventType} for user ${rookUserId}`);

    if (!rookUserId) {
      return res.status(400).json({ error: 'Missing user_id in payload' });
    }

    // Resolve to internal user id
    let eVidaUserId = null;
    const userResult = await pool.query(
      'SELECT id FROM users WHERE rook_user_id = $1',
      [rookUserId]
    );
    if (userResult.rows.length > 0) {
      eVidaUserId = userResult.rows[0].id;
    }

    await pool.query(
      `INSERT INTO health_events (rook_user_id, user_id, event_type, data_source, payload, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [rookUserId, eVidaUserId, eventType, dataSource, JSON.stringify(payload), recordedAt]
    );

    if (eVidaUserId) {
      await checkVitalAlerts(eVidaUserId, eventType, payload);
    }

    res.status(200).json({ status: 'success', received: true });
  } catch (error) {
    console.error('[Webhooks] Error processing ROOK webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/webhooks/rook/status — liveness check for ROOK portal
router.get('/rook/status', (req, res) => {
  const sigMode = process.env.NODE_ENV === 'production'
    ? (process.env.ROOK_CLIENT_SECRET ? 'enforced' : 'MISCONFIGURED — secret missing')
    : (process.env.ROOK_CLIENT_SECRET ? 'enforced' : 'skipped (dev, no secret)');

  res.json({
    status:            'active',
    endpoint:          '/api/webhooks/rook',
    signatureVerification: sigMode,
    supported_events: [
      'sleep_summary', 'activity_summary', 'body_summary',
      'heart_rate_event', 'oxygen_event', 'stress_event',
      'physical_event', 'blood_glucose_event', 'blood_pressure_event'
    ]
  });
});

// GET /api/webhooks/health-events/:userId — latest events for a user
router.get('/health-events/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const result = await pool.query(
      `SELECT * FROM health_events
       WHERE user_id::text = $1 OR rook_user_id = $1
       ORDER BY received_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('[Webhooks] Error fetching health events:', error);
    res.status(500).json({ error: 'Failed to fetch health events' });
  }
});

export { initHealthEventsTable };
export default router;
