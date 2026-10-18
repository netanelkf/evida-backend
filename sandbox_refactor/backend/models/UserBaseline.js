// UserBaseline model
import { query } from '../db/pool.js';

export default {
  async findByUser(userId) {
    const result = await query(
      'SELECT * FROM user_baselines WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  },

  async findByUserAndType(userId, metricType) {
    const result = await query(
      'SELECT * FROM user_baselines WHERE user_id = $1 AND metric_type = $2',
      [userId, metricType]
    );
    return result.rows[0] || null;
  },

  async upsert(data) {
    const {
      user_id, metric_type, baseline_value, baseline_stddev,
      sample_count, period_start, period_end
    } = data;

    const result = await query(`
      INSERT INTO user_baselines (
        user_id, metric_type, baseline_value, baseline_stddev,
        sample_count, period_start, period_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, metric_type) DO UPDATE SET
        baseline_value = EXCLUDED.baseline_value,
        baseline_stddev = EXCLUDED.baseline_stddev,
        sample_count = EXCLUDED.sample_count,
        period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        calculated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [user_id, metric_type, baseline_value, baseline_stddev,
       sample_count, period_start, period_end]
    );
    return result.rows[0];
  }
};
