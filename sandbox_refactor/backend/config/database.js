// Database configuration
export default {
  connectionString: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  }
};
