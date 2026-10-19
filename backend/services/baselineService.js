// Personal baseline: "what is normal for THIS person", computed on the fly
// from their own history, instead of a fixed threshold applied to everyone.
//
// Deliberately additive, never a replacement for absolute safety thresholds:
// a personal baseline can make the system MORE sensitive to a change for one
// person, but must never make it LESS sensitive to a genuinely dangerous
// absolute value (e.g. someone whose resting oxygen runs low still needs the
// hard floor in webhooks.js to fire).
import pool from '../db/pool.js';
import { parseVitalsFromPayload } from './vitalsParser.js';

const MIN_SAMPLES = 7;
const LOOKBACK_DAYS = 14;
const Z_THRESHOLD = 2.5;

// Floor on stddev per metric so a handful of near-identical readings can't
// make the z-score hypersensitive to tiny, clinically meaningless wobble.
const MIN_STDDEV = {
  resting_heart_rate: 2,
  oxygen_saturation: 1
};

const METRIC_EXTRACTORS = {
  resting_heart_rate: payload => parseVitalsFromPayload(payload).heartRateResting,
  oxygen_saturation: payload => parseVitalsFromPayload(payload).oxygenSaturation
};

function mean(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stddev(values, avg) {
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export async function computeBaseline(userId, metricKey) {
  const extractor = METRIC_EXTRACTORS[metricKey];
  if (!extractor) throw new Error(`Unknown baseline metric: ${metricKey}`);

  const result = await pool.query(
    `SELECT payload FROM health_events
     WHERE user_id = $1 AND received_at >= NOW() - make_interval(days => $2)
     ORDER BY received_at DESC`,
    [userId, LOOKBACK_DAYS]
  );

  const values = [];
  for (const row of result.rows) {
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    const value = extractor(payload);
    if (typeof value === 'number' && !Number.isNaN(value)) values.push(value);
  }

  if (values.length < MIN_SAMPLES) {
    return { hasEnoughData: false, sampleCount: values.length };
  }

  const avg = mean(values);
  const floor = MIN_STDDEV[metricKey] ?? 0;

  return {
    hasEnoughData: true,
    sampleCount: values.length,
    mean: avg,
    stddev: Math.max(stddev(values, avg), floor)
  };
}

// Returns null when there isn't enough history yet, or the value is within
// normal variation for this person — a null here means "say nothing",
// not "this is safe" (the absolute thresholds are the safety check).
export function deviationSeverity(value, baseline, zThreshold = Z_THRESHOLD) {
  if (!baseline?.hasEnoughData) return null;
  const z = (value - baseline.mean) / baseline.stddev;
  if (Math.abs(z) < zThreshold) return null;
  return { z, direction: z > 0 ? 'high' : 'low' };
}
