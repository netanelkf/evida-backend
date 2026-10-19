// AlertRule model
import { query } from '../db/pool.js';

export default {
  async findById(id) {
    const result = await query('SELECT * FROM alert_rules WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByUser(userId) {
    const result = await query(
      'SELECT * FROM alert_rules WHERE user_id = $1 ORDER BY rule_type',
      [userId]
    );
    return result.rows;
  },

  async findActiveByUser(userId) {
    const result = await query(
      'SELECT * FROM alert_rules WHERE user_id = $1 AND is_enabled = true',
      [userId]
    );
    return result.rows;
  },

  async create(data) {
    const {
      user_id, rule_type, threshold_min, threshold_max, threshold_percent,
      duration_minutes, severity, notify_user, notify_caregivers,
      notify_dispatch, create_incident
    } = data;

    const result = await query(`
      INSERT INTO alert_rules (
        user_id, rule_type, threshold_min, threshold_max, threshold_percent,
        duration_minutes, severity, notify_user, notify_caregivers,
        notify_dispatch, create_incident
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [user_id, rule_type, threshold_min, threshold_max, threshold_percent,
       duration_minutes, severity, notify_user, notify_caregivers,
       notify_dispatch, create_incident]
    );
    return result.rows[0];
  },

  async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    const result = await query(
      `UPDATE alert_rules SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  },

  async toggleEnabled(id, isEnabled) {
    const result = await query(
      'UPDATE alert_rules SET is_enabled = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id, isEnabled]
    );
    return result.rows[0];
  },

  async delete(id) {
    await query('DELETE FROM alert_rules WHERE id = $1', [id]);
  },

  async createDefaultsForUser(userId, defaultRules) {
    for (const rule of defaultRules) {
      await this.create({ user_id: userId, ...rule });
    }
  }
};
