exports.up = (knex) =>
  knex.schema.createTable('emergency_contacts', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.string('phone', 50);
    t.string('email', 255);
    t.string('relationship', 100);
    t.boolean('notify_email').defaultTo(true);
    t.integer('priority').defaultTo(1);
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('emergency_contacts');
