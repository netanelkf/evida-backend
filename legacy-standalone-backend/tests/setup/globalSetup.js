const { Client } = require('pg');
const knexLib = require('knex');
const { TEST_DATABASE_URL } = require('./testDbUrl');

module.exports = async () => {
  const url = new URL(TEST_DATABASE_URL);
  const dbName = url.pathname.replace(/^\//, '');

  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = '/postgres';

  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (rows.length === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  }
  await admin.end();

  const knex = knexLib({
    client: 'pg',
    connection: TEST_DATABASE_URL,
    migrations: { directory: `${__dirname}/../../src/migrations` },
  });
  await knex.migrate.latest();
  await knex.destroy();
};
