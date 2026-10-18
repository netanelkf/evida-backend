// Incident model
import { query } from '../db/pool.js';

export default {
  async findById(id) {
    const result = await query('SELECT * FROM incidents WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByUser(userId) {
    const result = await query(
      'SELECT * FROM incidents WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  },

  async findActive() {
    const result = await query(`
      SELECT i.*, u.name as user_name, u.phone as user_phone, u.email as user_email
      FROM incidents i
      JOIN users u ON i.user_id = u.id
      WHERE i.status IN ('new', 'assigned', 'in_progress', 'pending_response')
      ORDER BY
        CASE i.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        i.created_at ASC`
    );
    return result.rows;
  },

  async findAssignedTo(operatorId) {
    const result = await query(`
      SELECT * FROM incidents
      WHERE assigned_to = $1 AND status != 'resolved' AND status != 'cancelled'
      ORDER BY created_at DESC`,
      [operatorId]
    );
    return result.rows;
  },

  async create(data) {
    const {
      user_id, source_type, source_alert_id, priority, title, description,
      lat, lng, address, vitals_at_incident
    } = data;

    const result = await query(`
      INSERT INTO incidents (
        user_id, source_type, source_alert_id, priority, title, description,
        lat, lng, address, vitals_at_incident
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [user_id, source_type, source_alert_id, priority, title, description,
       lat, lng, address, JSON.stringify(vitals_at_incident)]
    );
    return result.rows[0];
  },

  async assign(id, operatorId) {
    const result = await query(`
      UPDATE incidents
      SET assigned_to = $2, assigned_at = CURRENT_TIMESTAMP, status = 'assigned', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [id, operatorId]
    );
    return result.rows[0];
  },

  async updateStatus(id, status) {
    const result = await query(`
      UPDATE incidents
      SET status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [id, status]
    );
    return result.rows[0];
  },

  async resolve(id, resolvedBy, resolutionType, resolutionNotes) {
    const result = await query(`
      UPDATE incidents
      SET status = 'resolved',
          resolved_by = $2,
          resolution_type = $3,
          resolution_notes = $4,
          resolved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [id, resolvedBy, resolutionType, resolutionNotes]
    );
    return result.rows[0];
  },

  async cancel(id) {
    const result = await query(`
      UPDATE incidents
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  async getStats() {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'new') as new_count,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'resolved' AND DATE(resolved_at) = CURRENT_DATE) as resolved_today,
        COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('resolved', 'cancelled')) as critical_active
      FROM incidents`
    );
    return result.rows[0];
  }
};
