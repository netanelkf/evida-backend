const db = require('../config/db');

const TABLE = 'alerts';

const Alert = {
  insert: (data) => db(TABLE).insert(data).returning('*').then((rows) => rows[0]),

  findByUser: ({ user_id, status, limit = 20, offset = 0 }) => {
    let q = db(TABLE).where({ user_id }).orderBy('created_at', 'desc').limit(limit).offset(offset);
    if (status) q = q.where({ status });
    return q;
  },

  findById: (id) => db(TABLE).where({ id }).first(),

  // Find most recent active alert for a given user+metric (for deduplication)
  findRecentActive: (user_id, metric, windowMs) => {
    const since = new Date(Date.now() - windowMs);
    return db(TABLE)
      .where({ user_id, metric, status: 'active' })
      .where('created_at', '>=', since)
      .first();
  },

  acknowledge: (id, acknowledged_by) =>
    db(TABLE)
      .where({ id })
      .update({ status: 'acknowledged', acknowledged_at: new Date(), acknowledged_by })
      .returning('*')
      .then((rows) => rows[0]),

  markNotified: (id) =>
    db(TABLE).where({ id }).update({ notified_at: new Date() }),

  getStats: (user_id) =>
    db(TABLE)
      .where({ user_id })
      .select(
        db.raw("COUNT(*) FILTER (WHERE status = 'active') as active_count"),
        db.raw("COUNT(*) FILTER (WHERE severity = 'critical') as critical_count"),
        db.raw("COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days"),
        db.raw("COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days")
      )
      .first(),
};

module.exports = Alert;
