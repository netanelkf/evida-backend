// CaregiverInvitation model
import { query } from '../db/pool.js';

export default {
  async findById(id) {
    const result = await query('SELECT * FROM caregiver_invitations WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByToken(token) {
    const result = await query('SELECT * FROM caregiver_invitations WHERE token = $1', [token]);
    return result.rows[0] || null;
  },

  async findPendingByEmail(userId, email) {
    const result = await query(
      `SELECT * FROM caregiver_invitations
       WHERE user_id = $1 AND email = $2 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP`,
      [userId, email]
    );
    return result.rows[0] || null;
  },

  async findByUser(userId) {
    const result = await query(
      'SELECT * FROM caregiver_invitations WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  },

  async create(data) {
    const { user_id, email, token, relationship, expires_at } = data;
    const result = await query(`
      INSERT INTO caregiver_invitations (user_id, email, token, relationship, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [user_id, email, token, relationship, expires_at]
    );
    return result.rows[0];
  },

  async updateStatus(id, status) {
    await query(
      'UPDATE caregiver_invitations SET status = $2 WHERE id = $1',
      [id, status]
    );
  },

  async markAccepted(id) {
    await query(
      `UPDATE caregiver_invitations
       SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  }
};
