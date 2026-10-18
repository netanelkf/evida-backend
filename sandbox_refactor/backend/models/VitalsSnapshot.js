// VitalsSnapshot model
import { query } from '../db/pool.js';

export default {
  async findById(id) {
    const result = await query('SELECT * FROM vitals_snapshots WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findLatestByUser(userId) {
    const result = await query(`
      SELECT * FROM vitals_snapshots
      WHERE user_id = $1
      ORDER BY recorded_at DESC
      LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  },

  async findDailySummary(userId, date) {
    const result = await query(`
      SELECT * FROM vitals_snapshots
      WHERE user_id = $1
        AND DATE(recorded_at) = $2
        AND data_type = 'daily_summary'
      ORDER BY recorded_at DESC
      LIMIT 1`,
      [userId, date]
    );
    return result.rows[0] || null;
  },

  async findHistory(userId, days = 7) {
    const result = await query(`
      SELECT * FROM vitals_snapshots
      WHERE user_id = $1 AND recorded_at > NOW() - INTERVAL '${days} days'
      ORDER BY recorded_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findByDateRange(userId, startDate, endDate) {
    const result = await query(`
      SELECT * FROM vitals_snapshots
      WHERE user_id = $1
        AND recorded_at >= $2
        AND recorded_at <= $3
      ORDER BY recorded_at DESC`,
      [userId, startDate, endDate]
    );
    return result.rows;
  },

  async create(data) {
    const {
      user_id, recorded_at, heart_rate, resting_heart_rate, hrv_sdnn, hrv_rmssd,
      steps, calories, active_minutes, distance_meters, floors_climbed,
      oxygen_saturation, blood_pressure_systolic, blood_pressure_diastolic,
      temperature, glucose_mg_dl, glucose_trend,
      sleep_duration_minutes, sleep_efficiency, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes,
      stress_level, recovery_score, source, data_type, raw_data
    } = data;

    const result = await query(`
      INSERT INTO vitals_snapshots (
        user_id, recorded_at, heart_rate, resting_heart_rate, hrv_sdnn, hrv_rmssd,
        steps, calories, active_minutes, distance_meters, floors_climbed,
        oxygen_saturation, blood_pressure_systolic, blood_pressure_diastolic,
        temperature, glucose_mg_dl, glucose_trend,
        sleep_duration_minutes, sleep_efficiency, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes,
        stress_level, recovery_score, source, data_type, raw_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      ) RETURNING *`,
      [
        user_id, recorded_at, heart_rate, resting_heart_rate, hrv_sdnn, hrv_rmssd,
        steps, calories, active_minutes, distance_meters, floors_climbed,
        oxygen_saturation, blood_pressure_systolic, blood_pressure_diastolic,
        temperature, glucose_mg_dl, glucose_trend,
        sleep_duration_minutes, sleep_efficiency, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes,
        stress_level, recovery_score, source, data_type, JSON.stringify(raw_data)
      ]
    );
    return result.rows[0];
  },

  async getAggregatedStats(userId, days = 7) {
    const result = await query(`
      SELECT
        AVG(heart_rate) as avg_heart_rate,
        AVG(resting_heart_rate) as avg_resting_hr,
        AVG(hrv_sdnn) as avg_hrv,
        SUM(steps) as total_steps,
        AVG(steps) as avg_daily_steps,
        SUM(calories) as total_calories,
        AVG(sleep_duration_minutes) as avg_sleep_minutes,
        AVG(sleep_efficiency) as avg_sleep_efficiency,
        COUNT(*) as data_points
      FROM vitals_snapshots
      WHERE user_id = $1
        AND recorded_at > NOW() - INTERVAL '${days} days'
        AND data_type = 'daily_summary'`,
      [userId]
    );
    return result.rows[0];
  }
};
