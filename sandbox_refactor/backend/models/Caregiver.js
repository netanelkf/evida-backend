// Caregiver model
import { query } from '../db/pool.js';

export default {
  async findById(id) {
    const result = await query('SELECT * FROM caregivers WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByEmail(email) {
    const result = await query('SELECT * FROM caregivers WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async create(data) {
    const { email, password_hash, name, phone } = data;
    const result = await query(
      `INSERT INTO caregivers (email, password_hash, name, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email, password_hash, name, phone]
    );
    return result.rows[0];
  },

  async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    const result = await query(
      `UPDATE caregivers SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  },

  async updateLastLogin(id) {
    await query('UPDATE caregivers SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  }
};
