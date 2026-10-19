// Alert model
import { query } from '../db/pool.js';

export default {
  async findById(id) {
    const result = await query('SELECT * FROM alerts WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByUser(userId, status = null) {
    let sql = 'SELECT * FROM alerts WHERE user_id = $1';
    const params = [userId];

    if (status) {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ' ORDER BY triggered_at DESC';

    const result = await query(sql, params);
    return result.rows;
  },

  async findActiveByUser(userId) {
    const result = await query(`
      SELECT * FROM alerts
      WHERE user_id = $1 AND status = 'active'
      ORDER BY severity DESC, triggered_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async countByUserAndDate(userId, date) {
    const result = await query(`
      SELECT COUNT(*) FROM alerts
      WHERE user_id = $1 AND DATE(triggered_at) = $2`,
      [userId, date]
    );
    return parseInt(result.rows[0].count, 10);
  },

  async create(data) {
    const {
      user_id, rule_id, alert_type, severity, title, message,
      triggered_value, threshold_value, vitals_snapshot_id, expires_at
    } = data;

    const result = await query(`
      INSERT INTO alerts (
        user_id, rule_id, alert_type, severity, title, message,
        triggered_value, threshold_value, vitals_snapshot_id, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [user_id, rule_id, alert_type, severity, title, message,
       triggered_value, threshold_value, vitals_snapshot_id, expires_at]
    );
    return result.rows[0];
  },

  async acknowledge(id, acknowledgedBy, acknowledgedByType) {
    const result = await query(`
      UPDATE alerts
      SET status = 'acknowledged',
          acknowledged_at = CURRENT_TIMESTAMP,
          acknowledged_by = $2,
          acknowledged_by_type = $3
      WHERE id = $1
      RETURNING *`,
      [id, acknowledgedBy, acknowledgedByType]
    );
    return result.rows[0];
  },

  async resolve(id) {
    const result = await query(`
      UPDATE alerts
      SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  async escalateToIncident(id, incidentId) {
    await query(`
      UPDATE alerts
      SET escalated_to_incident = true, incident_id = $2
      WHERE id = $1`,
      [id, incidentId]
    );
  },

  async expireOld() {
    await query(`
      UPDATE alerts
      SET status = 'expired'
      WHERE status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at < CURRENT_TIMESTAMP`
    );
  }
};
