// PostgreSQL connection pool
import pg from 'pg';
import databaseConfig from '../config/database.js';

const pool = new pg.Pool({
  connectionString: databaseConfig.connectionString,
  ...databaseConfig.pool
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
  }

  return result;
}

export async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  let lastQuery = null;

  client.query = (...args) => {
    lastQuery = args;
    return originalQuery(...args);
  };

  client.release = () => {
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease();
  };

  return client;
}

export default pool;
