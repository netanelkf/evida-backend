const db = require('../config/db');
const { DEFAULT_THRESHOLDS } = require('../utils/constants');

const TABLE = 'thresholds';

const Threshold = {
  findByUser: (user_id) => db(TABLE).where({ user_id }),

  findByUserAndMetric: (user_id, metric) => db(TABLE).where({ user_id, metric }).first(),

  createDefaults: (user_id) => {
    const rows = DEFAULT_THRESHOLDS.map((t) => ({ ...t, user_id }));
    return db(TABLE).insert(rows).returning('*');
  },

  upsert: (user_id, metric, data) =>
    db(TABLE)
      .insert({ user_id, metric, ...data })
      .onConflict(['user_id', 'metric'])
      .merge()
      .returning('*')
      .then((rows) => rows[0]),

  resetToDefaults: async (user_id) => {
    await db(TABLE).where({ user_id }).delete();
    const rows = DEFAULT_THRESHOLDS.map((t) => ({ ...t, user_id }));
    return db(TABLE).insert(rows).returning('*');
  },
};

module.exports = Threshold;
