const db = require('../config/db');

const TABLE = 'health_data';

const HealthData = {
  insert: (data) => db(TABLE).insert(data).returning('*').then((rows) => rows[0]),

  findByUser: ({ user_id, from, to, metric, limit = 50, offset = 0 }) => {
    let q = db(TABLE).where({ user_id }).orderBy('recorded_at', 'desc').limit(limit).offset(offset);
    if (from) q = q.where('recorded_at', '>=', from);
    if (to)   q = q.where('recorded_at', '<=', to);
    if (metric) q = q.whereNotNull(metric);
    return q;
  },

  getLatest: (user_id) =>
    db(TABLE).where({ user_id }).orderBy('recorded_at', 'desc').first(),

  getSummary: ({ user_id, from, to }) => {
    let q = db(TABLE).where({ user_id });
    if (from) q = q.where('recorded_at', '>=', from);
    if (to)   q = q.where('recorded_at', '<=', to);
    return q.select(
      db.raw('MIN(heart_rate) as heart_rate_min, MAX(heart_rate) as heart_rate_max, AVG(heart_rate) as heart_rate_avg'),
      db.raw('MIN(spo2) as spo2_min, MAX(spo2) as spo2_max, AVG(spo2) as spo2_avg'),
      db.raw('MIN(systolic_bp) as systolic_bp_min, MAX(systolic_bp) as systolic_bp_max, AVG(systolic_bp) as systolic_bp_avg'),
      db.raw('MIN(diastolic_bp) as diastolic_bp_min, MAX(diastolic_bp) as diastolic_bp_max, AVG(diastolic_bp) as diastolic_bp_avg'),
      db.raw('MIN(blood_glucose) as blood_glucose_min, MAX(blood_glucose) as blood_glucose_max, AVG(blood_glucose) as blood_glucose_avg'),
      db.raw('MIN(temperature) as temperature_min, MAX(temperature) as temperature_max, AVG(temperature) as temperature_avg'),
      db.raw('SUM(steps) as total_steps'),
      db.raw('COUNT(*) as reading_count')
    ).first();
  },
};

module.exports = HealthData;
