// Authentication service
import { User, Caregiver, AlertRule } from '../models/index.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import alertsConfig from '../config/alerts.js';

export async function register(data) {
  const { email, password, name, phone, role = 'customer' } = data;

  const existing = await User.findByEmail(email);
  if (existing) {
    throw new Error('Email already registered');
  }

  const password_hash = await hashPassword(password);

  const user = await User.create({
    email,
    password_hash,
    name,
    phone,
    role
  });

  if (role === 'customer') {
    await AlertRule.createDefaultsForUser(user.id, alertsConfig.defaultRules);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken
  };
}

export async function login(email, password) {
  const user = await User.findByEmail(email);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  await User.updateLastLogin(user.id);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken
  };
}

export async function loginCaregiver(email, password) {
  const caregiver = await Caregiver.findByEmail(email);

  if (!caregiver) {
    throw new Error('Invalid email or password');
  }

  const valid = await verifyPassword(password, caregiver.password_hash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  await Caregiver.updateLastLogin(caregiver.id);

  const accessToken = generateAccessToken({ ...caregiver, role: 'caregiver' });
  const refreshToken = generateRefreshToken(caregiver);

  return {
    caregiver: sanitizeCaregiver(caregiver),
    accessToken,
    refreshToken
  };
}

export async function refreshAccessToken(token) {
  const payload = verifyRefreshToken(token);
  if (!payload) {
    throw new Error('Invalid refresh token');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new Error('User not found');
  }

  const accessToken = generateAccessToken(user);

  return { accessToken };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) {
    throw new Error('Current password is incorrect');
  }

  const password_hash = await hashPassword(newPassword);
  await User.update(userId, { password_hash });

  return { success: true };
}

function sanitizeUser(user) {
  const { password_hash, access_token, refresh_token, ...safe } = user;
  return safe;
}

function sanitizeCaregiver(caregiver) {
  const { password_hash, ...safe } = caregiver;
  return safe;
}

export default {
  register,
  login,
  loginCaregiver,
  refreshAccessToken,
  changePassword
};
