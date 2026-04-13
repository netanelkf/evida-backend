exports.up = (knex) =>
  knex.schema.createTable('alerts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('health_data_id').references('id').inTable('health_data');
    t.string('metric', 50).notNullable();
    t.decimal('value', 10, 2).notNullable();
    t.decimal('threshold_min', 10, 2);
    t.decimal('threshold_max', 10, 2);
    t.string('severity', 20).defaultTo('warning'); // 'warning' | 'critical'
    t.string('status', 20).defaultTo('active');    // 'active' | 'acknowledged' | 'resolved'
    t.timestamp('notified_at');
    t.timestamp('acknowledged_at');
    t.uuid('acknowledged_by').references('id').inTable('users');
    t.timestamps(true, true);
    t.index(['user_id', 'status', 'created_at']);
  });

exports.down = (knex) => knex.schema.dropTable('alerts');
