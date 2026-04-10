const db = require('../config/db');

const TABLE = 'users';

const User = {
  findById: (id) => db(TABLE).where({ id }).first(),

  findByEmail: (email) => db(TABLE).where({ email }).first(),

  findByRookId: (rook_user_id) => db(TABLE).where({ rook_user_id }).first(),

  create: (data) => db(TABLE).insert(data).returning('*').then((rows) => rows[0]),

  update: (id, data) => db(TABLE).where({ id }).update(data).returning('*').then((rows) => rows[0]),
};

module.exports = User;
