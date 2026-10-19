// HealthScore model
import { query } from '../db/pool.js';

export default {
  async findByUserAndDate(userId, date) {
    const result = await query(
      'SELECT * FROM health_scores WHERE user_id = $1 AND score_date = $2',
      [userId, date]
    );
    return result.rows[0] || null;
  },

  async findLatestByUser(userId) {
    const result = await query(
      'SELECT * FROM health_scores WHERE user_id = $1 ORDER BY score_date DESC LIMIT 1',
      [userId]
    );
    return result.rows[0] || null;
  },

  async findHistory(userId, days = 7) {
    const result = await query(`
      SELECT * FROM health_scores
      WHERE user_id = $1 AND score_date > CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY score_date DESC`,
      [userId]
    );
    return result.rows;
  },

  async create(data) {
    const {
      user_id, score_date, score, score_trend,
      hrv_score, heart_rate_score, sleep_score, activity_score, anomaly_penalty,
      hrv_baseline, resting_hr_baseline, data_completeness, data_sources_used
    } = data;

    const result = await query(`
      INSERT INTO health_scores (
        user_id, score_date, score, score_trend,
        hrv_score, heart_rate_score, sleep_score, activity_score, anomaly_penalty,
        hrv_baseline, resting_hr_baseline, data_completeness, data_sources_used
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id, score_date) DO UPDATE SET
        score = EXCLUDED.score,
        score_trend = EXCLUDED.score_trend,
        hrv_score = EXCLUDED.hrv_score,
        heart_rate_score = EXCLUDED.heart_rate_score,
        sleep_score = EXCLUDED.sleep_score,
        activity_score = EXCLUDED.activity_score,
        anomaly_penalty = EXCLUDED.anomaly_penalty,
        calculated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [user_id, score_date, score, score_trend,
       hrv_score, heart_rate_score, sleep_score, activity_score, anomaly_penalty,
       hrv_baseline, resting_hr_baseline, data_completeness, JSON.stringify(data_sources_used)]
    );
    return result.rows[0];
  },

  async getAverageScore(userId, days = 7) {
    const result = await query(`
      SELECT AVG(score) as average_score
      FROM health_scores
      WHERE user_id = $1 AND score_date > CURRENT_DATE - INTERVAL '${days} days'`,
      [userId]
    );
    return parseFloat(result.rows[0]?.average_score || 0);
  }
};
