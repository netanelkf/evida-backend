import pool from '../db/pool.js';

// Validates the Authorization: Bearer <token> header against the sessions
// table and requires an operator or admin role. Attaches req.operator.
export async function requireOperator(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing operator session token' });
  }

  try {
    const result = await pool.query(
      `SELECT s.user_id, s.role FROM sessions s
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const { user_id, role } = result.rows[0];
    if (role !== 'operator' && role !== 'admin') {
      return res.status(403).json({ error: 'This account does not have operator access' });
    }

    req.operator = { id: user_id, role };
    next();
  } catch (error) {
    console.error('Error validating operator session:', error);
    res.status(500).json({ error: 'Failed to validate session' });
  }
}
