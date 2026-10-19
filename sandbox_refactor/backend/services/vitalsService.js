// Vitals service
import { VitalsSnapshot, UserBaseline } from '../models/index.js';
import { formatDate, getDateRange } from '../utils/dateHelpers.js';

export async function store(userId, vitals) {
  const data = {
    user_id: userId,
    recorded_at: vitals.recorded_at || new Date(),
    heart_rate: vitals.heart_rate,
    resting_heart_rate: vitals.resting_heart_rate,
    hrv_sdnn: vitals.hrv_sdnn,
    hrv_rmssd: vitals.hrv_rmssd,
    steps: vitals.steps,
    calories: vitals.calories,
    active_minutes: vitals.active_minutes,
    distance_meters: vitals.distance_meters,
    floors_climbed: vitals.floors_climbed,
    oxygen_saturation: vitals.oxygen_saturation,
    blood_pressure_systolic: vitals.blood_pressure_systolic,
    blood_pressure_diastolic: vitals.blood_pressure_diastolic,
    temperature: vitals.temperature,
    glucose_mg_dl: vitals.glucose_mg_dl,
    glucose_trend: vitals.glucose_trend,
    sleep_duration_minutes: vitals.sleep_duration_minutes,
    sleep_efficiency: vitals.sleep_efficiency,
    deep_sleep_minutes: vitals.deep_sleep_minutes,
    rem_sleep_minutes: vitals.rem_sleep_minutes,
    light_sleep_minutes: vitals.light_sleep_minutes,
    stress_level: vitals.stress_level,
    recovery_score: vitals.recovery_score,
    source: vitals.source || 'unknown',
    data_type: vitals.data_type || 'realtime',
    raw_data: vitals.raw_data
  };

  const snapshot = await VitalsSnapshot.create(data);
  return snapshot;
}

export async function getLatest(userId) {
  const latest = await VitalsSnapshot.findLatestByUser(userId);
  return latest;
}

export async function getHistory(userId, days = 7) {
  const history = await VitalsSnapshot.findHistory(userId, days);
  return history;
}

export async function getDailySummaries(userId, days = 7) {
  const { start, end } = getDateRange(days);
  const snapshots = await VitalsSnapshot.findByDateRange(userId, start, end);

  const dailyMap = new Map();

  for (const snapshot of snapshots) {
    const date = formatDate(snapshot.recorded_at);
    if (!dailyMap.has(date)) {
      dailyMap.set(date, snapshot);
    }
  }

  return Array.from(dailyMap.values());
}

export async function getAggregatedStats(userId, days = 7) {
  return VitalsSnapshot.getAggregatedStats(userId, days);
}

export async function normalizeRookData(rookData) {
  const physical = rookData.physical_health?.summary?.physical_summary;
  const sleep = rookData.sleep_health?.summary?.sleep_summary;
  const body = rookData.body_health?.summary?.body_summary;

  return {
    heart_rate: physical?.heart_rate?.hr_avg_bpm_int || null,
    resting_heart_rate: physical?.heart_rate?.resting_hr_bpm_int || null,
    hrv_sdnn: physical?.heart_rate?.hrv_avg_sdnn_ms_int || null,

    steps: physical?.distance?.steps_int || 0,
    calories: physical?.calories?.net_active_calories_kcal_int || 0,
    active_minutes: physical?.activity?.active_seconds_int
      ? Math.round(physical.activity.active_seconds_int / 60)
      : 0,
    distance_meters: physical?.distance?.traveled_distance_meters_float || 0,

    oxygen_saturation: body?.blood_oxygen_saturation_percentage_float || null,

    sleep_duration_minutes: sleep?.sleep_duration_seconds_int
      ? Math.round(sleep.sleep_duration_seconds_int / 60)
      : null,
    sleep_efficiency: sleep?.sleep_efficiency_percentage_float || null,
    deep_sleep_minutes: sleep?.deep_sleep_seconds_int
      ? Math.round(sleep.deep_sleep_seconds_int / 60)
      : null,
    rem_sleep_minutes: sleep?.rem_sleep_seconds_int
      ? Math.round(sleep.rem_sleep_seconds_int / 60)
      : null,
    light_sleep_minutes: sleep?.light_sleep_seconds_int
      ? Math.round(sleep.light_sleep_seconds_int / 60)
      : null,

    source: 'rook',
    data_type: 'daily_summary',
    recorded_at: new Date()
  };
}

export async function calculateBaselines(userId) {
  const history = await VitalsSnapshot.findHistory(userId, 14);

  if (history.length < 7) {
    return null;
  }

  const hrvValues = history.filter(h => h.hrv_sdnn).map(h => h.hrv_sdnn);
  const hrValues = history.filter(h => h.resting_heart_rate).map(h => h.resting_heart_rate);
  const sleepValues = history.filter(h => h.sleep_duration_minutes).map(h => h.sleep_duration_minutes);
  const stepsValues = history.filter(h => h.steps).map(h => h.steps);

  const baselines = [];

  if (hrvValues.length >= 7) {
    const avg = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;
    const stddev = Math.sqrt(hrvValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / hrvValues.length);
    baselines.push(await UserBaseline.upsert({
      user_id: userId,
      metric_type: 'hrv_sdnn',
      baseline_value: avg,
      baseline_stddev: stddev,
      sample_count: hrvValues.length,
      period_start: formatDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
      period_end: formatDate(new Date())
    }));
  }

  if (hrValues.length >= 7) {
    const avg = hrValues.reduce((a, b) => a + b, 0) / hrValues.length;
    const stddev = Math.sqrt(hrValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / hrValues.length);
    baselines.push(await UserBaseline.upsert({
      user_id: userId,
      metric_type: 'resting_hr',
      baseline_value: avg,
      baseline_stddev: stddev,
      sample_count: hrValues.length,
      period_start: formatDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
      period_end: formatDate(new Date())
    }));
  }

  return baselines;
}

export default {
  store,
  getLatest,
  getHistory,
  getDailySummaries,
  getAggregatedStats,
  normalizeRookData,
  calculateBaselines
};
