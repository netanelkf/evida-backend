// User service
import { User } from '../models/index.js';

export async function getById(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return sanitizeUser(user);
}

export async function getByEmail(email) {
  const user = await User.findByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }
  return sanitizeUser(user);
}

export async function updateProfile(userId, updates) {
  const allowedFields = ['name', 'phone', 'date_of_birth', 'gender',
    'blood_type', 'allergies', 'medications', 'medical_conditions', 'emergency_notes'];

  const filteredUpdates = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      filteredUpdates[field] = updates[field];
    }
  }

  const user = await User.update(userId, filteredUpdates);
  return sanitizeUser(user);
}

export async function updateLocation(userId, lat, lng) {
  await User.updateLocation(userId, lat, lng);
  return { success: true };
}

export async function getMedicalInfo(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return {
    blood_type: user.blood_type,
    allergies: user.allergies,
    medications: user.medications,
    medical_conditions: user.medical_conditions,
    emergency_notes: user.emergency_notes,
    date_of_birth: user.date_of_birth,
    gender: user.gender
  };
}

export async function setRookUserId(userId, rookUserId) {
  await User.update(userId, { rook_user_id: rookUserId });
}

function sanitizeUser(user) {
  const { password_hash, access_token, refresh_token, ...safe } = user;
  return safe;
}

export default {
  getById,
  getByEmail,
  updateProfile,
  updateLocation,
  getMedicalInfo,
  setRookUserId
};
