// Authentication middleware
import { verifyAccessToken } from '../utils/jwt.js';
import { User, Caregiver } from '../models/index.js';

export default async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    let user;
    if (payload.role === 'caregiver') {
      user = await Caregiver.findById(payload.sub);
    } else {
      user = await User.findById(payload.sub);
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: payload.role,
      tier: payload.tier
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (payload) {
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tier: payload.tier
    };
  } else {
    req.user = null;
  }

  next();
}
