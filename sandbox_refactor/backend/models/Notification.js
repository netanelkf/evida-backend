// Notification model
import { query } from '../db/pool.js';

export default {
  async findById(id) {
    const result = await query('SELECT * FROM notifications WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByRecipient(recipientId, recipientType, unreadOnly = false) {
    let sql = 'SELECT * FROM notifications WHERE recipient_id = $1 AND recipient_type = $2';
    if (unreadOnly) {
      sql += ' AND is_read = false';
    }
    sql += ' ORDER BY created_at DESC LIMIT 50';

    const result = await query(sql, [recipientId, recipientType]);
    return result.rows;
  },

  async create(data) {
    const { recipient_id, recipient_type, type, title, body, data: notifData, channel } = data;

    const result = await query(`
      INSERT INTO notifications (recipient_id, recipient_type, type, title, body, data, channel)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [recipient_id, recipient_type, type, title, body, JSON.stringify(notifData), channel]
    );
    return result.rows[0];
  },

  async bulkInsert(notifications) {
    const results = [];
    for (const notif of notifications) {
      const result = await this.create(notif);
      results.push(result);
    }
    return results;
  },

  async markAsRead(id) {
    const result = await query(`
      UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  },

  async markAllRead(recipientId, recipientType) {
    await query(`
      UPDATE notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE recipient_id = $1 AND recipient_type = $2 AND is_read = false`,
      [recipientId, recipientType]
    );
  },

  async markSent(id) {
    await query(`
      UPDATE notifications SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  },

  async markDelivered(id) {
    await query(`
      UPDATE notifications SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  },

  async markFailed(id, errorMessage) {
    await query(`
      UPDATE notifications SET status = 'failed', error_message = $2 WHERE id = $1`,
      [id, errorMessage]
    );
  },

  async countUnread(recipientId, recipientType) {
    const result = await query(`
      SELECT COUNT(*) FROM notifications
      WHERE recipient_id = $1 AND recipient_type = $2 AND is_read = false`,
      [recipientId, recipientType]
    );
    return parseInt(result.rows[0].count, 10);
  }
};
