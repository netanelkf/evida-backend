const db = require('../config/db');

const TABLE = 'emergency_contacts';

const EmergencyContact = {
  findByUser: (user_id) => db(TABLE).where({ user_id }).orderBy('priority'),

  findById: (id) => db(TABLE).where({ id }).first(),

  create: (data) => db(TABLE).insert(data).returning('*').then((rows) => rows[0]),

  update: (id, data) => db(TABLE).where({ id }).update(data).returning('*').then((rows) => rows[0]),

  delete: (id) => db(TABLE).where({ id }).delete(),
};

module.exports = EmergencyContact;
