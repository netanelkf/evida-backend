// Default safe vital ranges. Applied to every new user on registration.
const DEFAULT_THRESHOLDS = [
  { metric: 'heart_rate',   min_value: 40,  max_value: 180 },
  { metric: 'spo2',         min_value: 90,  max_value: 100 },
  { metric: 'systolic_bp',  min_value: 70,  max_value: 180 },
  { metric: 'diastolic_bp', min_value: 40,  max_value: 120 },
  { metric: 'blood_glucose',min_value: 54,  max_value: 400 },
  { metric: 'temperature',  min_value: 35,  max_value: 39.5 },
];

// If a value deviates more than this percentage beyond the threshold, it's "critical"
const CRITICAL_DEVIATION_PERCENT = 20;

// Don't fire a new alert for the same user+metric within this window (ms)
const ALERT_DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

module.exports = { DEFAULT_THRESHOLDS, CRITICAL_DEVIATION_PERCENT, ALERT_DEDUP_WINDOW_MS };
