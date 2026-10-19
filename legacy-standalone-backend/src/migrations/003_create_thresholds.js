exports.up = (knex) =>
  knex.schema.createTable('thresholds', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('metric', 50).notNullable();
    t.decimal('min_value', 10, 2);
    t.decimal('max_value', 10, 2);
    t.boolean('enabled').defaultTo(true);
    t.unique(['user_id', 'metric']);
  });

exports.down = (knex) => knex.schema.dropTable('thresholds');
