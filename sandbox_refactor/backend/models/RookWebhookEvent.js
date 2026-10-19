// RookWebhookEvent model
import { query } from '../db/pool.js';

export default {
  async findById(id) {
    const result = await query('SELECT * FROM rook_webhook_events WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findRecent(limit = 50) {
    const result = await query(`
      SELECT * FROM rook_webhook_events
      ORDER BY received_at DESC
      LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async findUnprocessed(limit = 100) {
    const result = await query(`
      SELECT * FROM rook_webhook_events
      WHERE processed = false
      ORDER BY received_at ASC
      LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  async create(data) {
    const { event_type, rook_user_id, user_id, payload } = data;

    const result = await query(`
      INSERT INTO rook_webhook_events (event_type, rook_user_id, user_id, payload)
      VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [event_type, rook_user_id, user_id, JSON.stringify(payload)]
    );
    return result.rows[0];
  },

  async markProcessed(id) {
    await query(`
      UPDATE rook_webhook_events
      SET processed = true, processed_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
      [id]
    );
  },

  async markFailed(id, errorMessage) {
    await query(`
      UPDATE rook_webhook_events
      SET error_message = $2
      WHERE id = $1`,
      [id, errorMessage]
    );
  }
};
