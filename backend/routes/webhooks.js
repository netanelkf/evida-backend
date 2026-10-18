import { Router } from 'express';
import crypto from 'crypto';
import pool from '../db/pool.js';
import * as incidentService from '../services/incidentService.js';
import * as baselineService from '../services/baselineService.js';
import { parseVitalsFromPayload } from '../services/vitalsParser.js';

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

// Check if vitals exceed thresholds and create real, operator-visible incidents.
//
// Two layers, both checked every time, never one instead of the other:
//   1. Absolute safety thresholds (below) — a hard floor that applies to
//      everyone, regardless of what is "normal" for them. This is what
//      catches a genuinely dangerous value.
//   2. Personal deviation (baselineService) — flags a meaningful change
//      from THIS person's own history, even when the value is still inside
//      the population-wide safe range. This is additive: it can only make
//      the system notice MORE, never suppress an absolute-threshold alert.
//
// Previously this read payload.heart_rate.avg / payload.oxygen_saturation —
// fields real ROOK payloads never send (the real data lives nested under
// body_health.summary.body_summary, see vitalsParser.js) — and was gated
// behind eventType.includes('heart_rate'/'oxygen'), which 'body_summary'
// events (the ones that actually carry these values) never match. Both
// bugs meant these alerts effectively never fired. Fixed here.
async function checkVitalAlerts(userId, eventType, payload) {
  const alerts = [];
  const vitals = parseVitalsFromPayload(payload);

  if (typeof vitals.heartRateAvg === 'number') {
    if (vitals.heartRateAvg < ALERT_THRESHOLDS.heart_rate.min)
      alerts.push({ type: 'LOW_HEART_RATE', value: vitals.heartRateAvg, threshold: ALERT_THRESHOLDS.heart_rate.min, priority: 'HIGH' });
    if (vitals.heartRateAvg > ALERT_THRESHOLDS.heart_rate.max)
      alerts.push({ type: 'HIGH_HEART_RATE', value: vitals.heartRateAvg, threshold: ALERT_THRESHOLDS.heart_rate.max, priority: 'HIGH' });
  }

  if (typeof vitals.oxygenSaturation === 'number' && vitals.oxygenSaturation < ALERT_THRESHOLDS.oxygen_saturation.min) {
    alerts.push({ type: 'LOW_OXYGEN', value: vitals.oxygenSaturation, threshold: ALERT_THRESHOLDS.oxygen_saturation.min, priority: 'HIGH' });
  }

  if (typeof vitals.heartRateResting === 'number') {
    const baseline = await baselineService.computeBaseline(userId, 'resting_heart_rate');
    const deviation = baselineService.deviationSeverity(vitals.heartRateResting, baseline);
    if (deviation) {
      alerts.push({
        type: deviation.direction === 'high' ? 'PERSONAL_HR_DEVIATION_HIGH' : 'PERSONAL_HR_DEVIATION_LOW',
        value: vitals.heartRateResting,
        baseline: { mean: Math.round(baseline.mean), stddev: Math.round(baseline.stddev * 10) / 10 },
        priority: 'MED'
      });
    }
  }

  if (typeof vitals.oxygenSaturation === 'number') {
    const baseline = await baselineService.computeBaseline(userId, 'oxygen_saturation');
    const deviation = baselineService.deviationSeverity(vitals.oxygenSaturation, baseline);
    if (deviation && deviation.direction === 'low') {
      alerts.push({
        type: 'PERSONAL_OXYGEN_DEVIATION_LOW',
        value: vitals.oxygenSaturation,
        baseline: { mean: Math.round(baseline.mean), stddev: Math.round(baseline.stddev * 10) / 10 },
        priority: 'MED'
      });
    }
  }

  for (const alert of alerts) {
    console.warn(`[ALERT] User ${userId}: ${alert.type} — value: ${alert.value}`);
    const summary = alert.baseline
      ? `${alert.type} — valor ${alert.value}, tu normal ${alert.baseline.mean} (±${alert.baseline.stddev})`
      : `${alert.type} — valor ${alert.value}, umbral ${alert.threshold}`;
    try {
      await incidentService.createIncidentFromAlert(userId, {
        type: alert.type,
        priority: alert.priority,
        summary
      });
    } catch (err) {
      console.error('[ALERT] Failed to create incident:', err.message);
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

    // Check alerts BEFORE inserting this event: computeBaseline looks at
    // the user's last 14 days of health_events, and must compare the new
    // reading against history that does not include itself — otherwise an
    // outlier pulls its own baseline toward it and can hide the deviation.
    if (eVidaUserId) {
      await checkVitalAlerts(eVidaUserId, eventType, payload);
    }

    await pool.query(
      `INSERT INTO health_events (rook_user_id, user_id, event_type, data_source, payload, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [rookUserId, eVidaUserId, eventType, dataSource, JSON.stringify(payload), recordedAt]
    );

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
