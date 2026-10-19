// Truncates all app tables between integration tests, keeping the schema
// created by migrations in globalSetup.
async function truncateAll(db) {
  await db.raw(
    'TRUNCATE TABLE caregiver_patients, alerts, emergency_contacts, thresholds, health_data, users RESTART IDENTITY CASCADE'
  );
}

module.exports = { truncateAll };
