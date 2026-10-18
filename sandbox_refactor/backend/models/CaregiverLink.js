// CaregiverLink model
import { query } from '../db/pool.js';

export default {
  async findById(id) {
    const result = await query('SELECT * FROM caregiver_links WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByUser(userId) {
    const result = await query(`
      SELECT cl.*, c.name as caregiver_name, c.email as caregiver_email, c.phone as caregiver_phone
      FROM caregiver_links cl
      JOIN caregivers c ON cl.caregiver_id = c.id
      WHERE cl.user_id = $1 AND cl.status = 'active'
    `, [userId]);
    return result.rows;
  },

  async findByCaregiver(caregiverId) {
    const result = await query(`
      SELECT cl.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM caregiver_links cl
      JOIN users u ON cl.user_id = u.id
      WHERE cl.caregiver_id = $1 AND cl.status = 'active' AND u.deleted_at IS NULL
    `, [caregiverId]);
    return result.rows;
  },

  async findByPair(userId, caregiverId) {
    const result = await query(
      'SELECT * FROM caregiver_links WHERE user_id = $1 AND caregiver_id = $2',
      [userId, caregiverId]
    );
    return result.rows[0] || null;
  },

  async countByUser(userId) {
    const result = await query(
      "SELECT COUNT(*) FROM caregiver_links WHERE user_id = $1 AND status = 'active'",
      [userId]
    );
    return parseInt(result.rows[0].count, 10);
  },

  async create(data) {
    const {
      user_id, caregiver_id, relationship,
      can_view_vitals = true, can_view_location = true,
      can_receive_alerts = true, can_receive_critical_only = false,
      can_contact_dispatch = false
    } = data;

    const result = await query(`
      INSERT INTO caregiver_links
      (user_id, caregiver_id, relationship, can_view_vitals, can_view_location,
       can_receive_alerts, can_receive_critical_only, can_contact_dispatch)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [user_id, caregiver_id, relationship, can_view_vitals, can_view_location,
       can_receive_alerts, can_receive_critical_only, can_contact_dispatch]
    );
    return result.rows[0];
  },

  async updatePermissions(id, permissions) {
    const fields = Object.keys(permissions);
    const values = Object.values(permissions);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    const result = await query(
      `UPDATE caregiver_links SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  },

  async remove(id) {
    await query("UPDATE caregiver_links SET status = 'removed' WHERE id = $1", [id]);
  }
};
