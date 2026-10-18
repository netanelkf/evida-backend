// DeviceProfile model
import { query } from '../db/pool.js';

export default {
  async findById(id) {
    const result = await query('SELECT * FROM device_profiles WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByUser(userId) {
    const result = await query(
      'SELECT * FROM device_profiles WHERE user_id = $1 ORDER BY device_type',
      [userId]
    );
    return result.rows;
  },

  async findByUserAndType(userId, deviceType) {
    const result = await query(
      'SELECT * FROM device_profiles WHERE user_id = $1 AND device_type = $2',
      [userId, deviceType]
    );
    return result.rows[0] || null;
  },

  async findConnectedByUser(userId) {
    const result = await query(
      'SELECT * FROM device_profiles WHERE user_id = $1 AND is_connected = true',
      [userId]
    );
    return result.rows;
  },

  async create(data) {
    const {
      user_id, device_type, device_source, device_name, device_model,
      is_connected, connection_method, access_token, refresh_token, token_expires_at
    } = data;

    const result = await query(`
      INSERT INTO device_profiles (
        user_id, device_type, device_source, device_name, device_model,
        is_connected, connection_method, access_token, refresh_token, token_expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [user_id, device_type, device_source, device_name, device_model,
       is_connected, connection_method, access_token, refresh_token, token_expires_at]
    );
    return result.rows[0];
  },

  async upsert(userId, deviceType, data) {
    const existing = await this.findByUserAndType(userId, deviceType);
    if (existing) {
      return this.update(existing.id, data);
    }
    return this.create({ user_id: userId, device_type: deviceType, ...data });
  },

  async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    const result = await query(
      `UPDATE device_profiles SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0];
  },

  async updateSyncStatus(id, status, error = null) {
    const result = await query(`
      UPDATE device_profiles
      SET sync_status = $2, sync_error = $3, last_sync_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [id, status, error]
    );
    return result.rows[0];
  },

  async disconnect(id) {
    const result = await query(`
      UPDATE device_profiles
      SET is_connected = false, access_token = NULL, refresh_token = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await query('DELETE FROM device_profiles WHERE id = $1', [id]);
  }
};
