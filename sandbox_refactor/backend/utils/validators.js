// Input validators

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  return { valid: true };
}

export function validatePhone(phone) {
  if (!phone) return true;
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  return phoneRegex.test(phone);
}

export function validateUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim();
}

export function validateRegisterInput(data) {
  const errors = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Valid email is required');
  }

  const passwordCheck = validatePassword(data.password);
  if (!passwordCheck.valid) {
    errors.push(passwordCheck.message);
  }

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name is required (at least 2 characters)');
  }

  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Invalid phone number format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateLoginInput(data) {
  const errors = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password) {
    errors.push('Password is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
