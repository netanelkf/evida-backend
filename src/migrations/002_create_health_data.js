exports.up = (knex) =>
  knex.schema.createTable('health_data', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('source', 50); // 'fitbit' | 'apple_watch' | 'garmin' etc.
    t.timestamp('recorded_at').notNullable();
    t.timestamp('received_at').defaultTo(knex.fn.now());
    t.integer('heart_rate');
    t.decimal('spo2', 5, 2);
    t.integer('systolic_bp');
    t.integer('diastolic_bp');
    t.decimal('blood_glucose', 6, 2);
    t.integer('steps');
    t.integer('sleep_minutes');
    t.decimal('temperature', 5, 2);
    t.jsonb('raw_payload');
    t.index(['user_id', 'recorded_at']);
  });

exports.down = (knex) => knex.schema.dropTable('health_data');
