exports.up = (knex) =>
  knex.schema.createTable('caregiver_patients', (t) => {
    t.uuid('caregiver_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.uuid('patient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.primary(['caregiver_id', 'patient_id']);
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('caregiver_patients');
