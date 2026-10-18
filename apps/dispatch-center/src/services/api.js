// Dispatch Center API Service

const API_BASE = '/api';

async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('dispatch_token');

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    }
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Dispatch Authentication
export async function dispatchLogin(username, password) {
  return apiCall('/dispatch/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

// Get all devices with locations
export async function getDevices() {
  return apiCall('/dispatch/devices');
}

// Get user profile details
export async function getUserProfile(userId) {
  return apiCall(`/dispatch/users/${userId}`);
}

// Get dispatch statistics
export async function getStats() {
  return apiCall('/dispatch/stats');
}

export default {
  dispatchLogin,
  getDevices,
  getUserProfile,
  getStats
};
