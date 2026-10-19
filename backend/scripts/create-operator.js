// One-time setup script: create a real operator/admin account.
//
// Usage:
//   node backend/scripts/create-operator.js <username> <email> <password> [role]
//
// role defaults to "operator". Use "admin" for a full admin account.
// Requires DATABASE_URL to be set in the environment (same as the server).

import pg from 'pg';
import bcrypt from 'bcryptjs';

const [, , username, email, password, role = 'operator'] = process.argv;

if (!username || !email || !password) {
  console.error('Usage: node backend/scripts/create-operator.js <username> <email> <password> [role]');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

if (!['operator', 'admin'].includes(role)) {
  console.error('role must be "operator" or "admin"');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await pool.query(
    'SELECT id FROM users WHERE username = $1 OR email = $2',
    [username.toLowerCase(), email.toLowerCase()]
  );

  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE users SET password_hash = $1, role = $2 WHERE id = $3',
      [passwordHash, role, existing.rows[0].id]
    );
    console.log(`Updated existing user "${username}" to role "${role}" with the new password.`);
  } else {
    await pool.query(
      `INSERT INTO users (username, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash, username, role]
    );
    console.log(`Created operator account "${username}" with role "${role}".`);
  }
} catch (error) {
  console.error('Failed to create operator account:', error.message);
  process.exit(1);
} finally {
  await pool.end();
}
