// User model
import { query } from '../db/pool.js';

export default {
  async findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);
    return result.rows[0] || null;
  },

  async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
    return result.rows[0] || null;
  },

  async findByRookUserId(rookUserId) {
    const result = await query('SELECT * FROM users WHERE rook_user_id = $1 AND deleted_at IS NULL', [rookUserId]);
    return result.rows[0] || null;
  },

  async create(userData) {
    const { email, password_hash, name, phone, role = 'customer' } = userData;
    const result = await query(
      `INSERT INTO users (email, password_hash, name, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email, password_hash, name, phone, role]
    );
    return result.rows[0];
  },

  async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    const result = await query(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  },

  async updateLocation(id, lat, lng) {
    const result = await query(
      `UPDATE users SET last_lat = $2, last_lng = $3, last_location_update = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, lat, lng]
    );
    return result.rowCount > 0;
  },

  async updateLastLogin(id) {
    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  },

  async setSubscriptionTier(id, tier) {
    await query('UPDATE users SET subscription_tier = $2 WHERE id = $1', [id, tier]);
  },

  async findWithConnectedDevices() {
    const result = await query(`
      SELECT u.* FROM users u
      INNER JOIN device_profiles d ON u.id = d.user_id
      WHERE d.is_connected = true AND u.deleted_at IS NULL
    `);
    return result.rows;
  },

  async findOperators() {
    const result = await query("SELECT * FROM users WHERE role = 'operator' AND deleted_at IS NULL");
    return result.rows;
  },

  async softDelete(id) {
    await query('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  }
};
