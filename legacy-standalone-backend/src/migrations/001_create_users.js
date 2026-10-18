exports.up = (knex) =>
  knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.string('name', 255);
    t.string('phone', 50);
    t.string('rook_user_id', 255).unique();
    t.string('role', 20).defaultTo('user'); // 'user' | 'caregiver' | 'admin'
    t.string('expo_push_token', 255); // Expo push notification token
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('users');
