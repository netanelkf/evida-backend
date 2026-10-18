// JWT utilities
import jwt from 'jsonwebtoken';
import jwtConfig from '../config/jwt.js';

export function generateAccessToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role || 'customer',
    tier: user.subscription_tier || 'free'
  };

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.accessTokenExpiry,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience
  });
}

export function generateRefreshToken(user) {
  const payload = {
    sub: user.id,
    type: 'refresh'
  };

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.refreshTokenExpiry,
    issuer: jwtConfig.issuer
  });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer
    });
    if (payload.type !== 'refresh') {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

export function decodeToken(token) {
  return jwt.decode(token);
}
