require('dotenv').config();

module.exports = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: './src/migrations',
  },
  pool: { min: 2, max: 10 },
};
