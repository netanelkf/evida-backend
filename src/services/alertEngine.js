const Threshold = require('../models/Threshold');
const Alert = require('../models/Alert');
const { sendAlerts } = require('./notifications');
const { CRITICAL_DEVIATION_PERCENT, ALERT_DEDUP_WINDOW_MS } = require('../utils/constants');
const logger = require('../utils/logger');

// Simple in-memory cache: { userId: { thresholds: [], fetchedAt: Date } }
const thresholdCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getUserThresholds(userId) {
  const cached = thresholdCache.get(userId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.thresholds;
  }
  const thresholds = await Threshold.findByUser(userId);
  thresholdCache.set(userId, { thresholds, fetchedAt: Date.now() });
  return thresholds;
}

function classifySeverity(value, min, max) {
  const range = (max || 0) - (min || 0);
  if (range <= 0) return 'warning';
  const deviation = Math.max(
    min != null ? Math.max(0, min - value) : 0,
    max != null ? Math.max(0, value - max) : 0
  );
  return deviation / range > CRITICAL_DEVIATION_PERCENT / 100 ? 'critical' : 'warning';
}

// Metrics that are present in a health_data row and need threshold checking
const CHECKABLE_METRICS = [
  'heart_rate', 'spo2', 'systolic_bp', 'diastolic_bp', 'blood_glucose', 'temperature',
];

async function checkVitals(userId, healthDataRow) {
  const thresholds = await getUserThresholds(userId);
  const thresholdMap = Object.fromEntries(thresholds.map((t) => [t.metric, t]));
  const firedAlerts = [];

  for (const metric of CHECKABLE_METRICS) {
    const value = healthDataRow[metric];
    if (value == null) continue;

    const threshold = thresholdMap[metric];
    if (!threshold || !threshold.enabled) continue;

    const { min_value, max_value } = threshold;
    const outOfRange =
      (min_value != null && value < min_value) ||
      (max_value != null && value > max_value);

    if (!outOfRange) continue;

    // Deduplication: skip if a recent active alert already exists
    const existing = await Alert.findRecentActive(userId, metric, ALERT_DEDUP_WINDOW_MS);
    if (existing) {
      logger.info(`Dedup: skipping alert for ${metric} (alert ${existing.id} still active)`);
      continue;
    }

    const severity = classifySeverity(value, min_value, max_value);
    const alert = await Alert.insert({
      user_id: userId,
      health_data_id: healthDataRow.id,
      metric,
      value,
      threshold_min: min_value,
      threshold_max: max_value,
      severity,
    });

    logger.warn(`Alert created: ${severity} for ${metric}=${value} (user ${userId})`);
    firedAlerts.push(alert);

    // Send notifications asynchronously — don't block the webhook response
    sendAlerts(userId, alert).catch((err) =>
      logger.error('Notification error for alert', alert.id, err.message)
    );
  }

  return firedAlerts;
}

module.exports = { checkVitals };
