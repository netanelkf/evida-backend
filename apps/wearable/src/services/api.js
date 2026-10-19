// API Service - Handles all API calls to the backend

export const API_BASE = '';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('evida_token');

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    }
  };

  try {
    const response = await fetch(`/api${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    // Check if response is JSON or text (for CSV downloads)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      return await response.text();
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Authentication
export async function login(username, password) {
  return apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function signup(username, email, password, fullName, phone) {
  return apiCall('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, fullName, phone })
  });
}

export async function logout() {
  return apiCall('/auth/logout', { method: 'POST' });
}

export async function getUsers() {
  return apiCall('/auth/users');
}

// Health Metrics
export async function getMetrics() {
  return apiCall(`/metrics?userId=${currentUserId()}`);
}

// Alerts
export async function getAlerts() {
  return apiCall(`/alerts?userId=${currentUserId()}`);
}

export async function acknowledgeAlert(alertId) {
  return apiCall(`/alerts/${alertId}/acknowledge`, { method: 'POST' });
}

// History
export async function getHistory() {
  return apiCall(`/history?userId=${currentUserId()}`);
}

// Sharing Settings
function currentUserId() {
  try {
    return JSON.parse(localStorage.getItem('evida_user') || '{}').id;
  } catch {
    return null;
  }
}

export async function getShareSettings() {
  return apiCall(`/share-settings?userId=${currentUserId()}`);
}

export async function updateShareSettings(settings) {
  return apiCall('/share-settings', {
    method: 'POST',
    body: JSON.stringify({ userId: currentUserId(), ...settings })
  });
}

export async function addTrustedContact(contact) {
  return apiCall('/share-settings/contacts', {
    method: 'POST',
    body: JSON.stringify({ userId: currentUserId(), ...contact })
  });
}

export async function removeTrustedContact(contactId) {
  return apiCall(`/share-settings/contacts/${contactId}?userId=${currentUserId()}`, {
    method: 'DELETE'
  });
}

// Devices
export async function getDevices() {
  return apiCall('/devices');
}

export async function connectDevice(deviceType) {
  return apiCall('/devices/connect', {
    method: 'POST',
    body: JSON.stringify({ deviceType })
  });
}

export async function disconnectDevice(deviceType) {
  return apiCall('/devices/disconnect', {
    method: 'POST',
    body: JSON.stringify({ deviceType })
  });
}

// Reports
export async function downloadReport(format = 'csv') {
  return apiCall(`/reports?format=${format}`);
}

// Alert Settings
export async function getAlertSettings() {
  return apiCall('/alert-settings');
}

export async function saveAlertSettings(settings) {
  return apiCall('/alert-settings', {
    method: 'POST',
    body: JSON.stringify(settings)
  });
}

// Family Member Portal
export async function familyLogin(email, accessCode) {
  return apiCall('/family/login', {
    method: 'POST',
    body: JSON.stringify({ email, accessCode })
  });
}

export async function getFamilyDashboard() {
  return apiCall('/family/dashboard');
}

// Fitbit Integration
export async function getFitbitStatus() {
  return apiCall('/fitbit/status');
}

export async function getFitbitAuthUrl() {
  return apiCall('/fitbit/authorize');
}

export async function getFitbitMetrics() {
  return apiCall('/fitbit/metrics');
}

export async function getFitbitIntradayHeart() {
  return apiCall('/fitbit/intraday-heart');
}

export async function disconnectFitbit() {
  return apiCall('/fitbit/disconnect', { method: 'POST' });
}

export async function refreshFitbitToken() {
  return apiCall('/fitbit/refresh', { method: 'POST' });
}

// ROOK Integration (Real Device Data)
export async function getRookStatus() {
  try {
    const response = await fetch('/api/rook/users/default/sources');
    if (!response.ok) return { connected: false, sources: [] };
    const data = await response.json();
    const connectedSources = (data.sources || []).filter(s => s.authorized);
    return {
      connected: connectedSources.length > 0,
      sources: connectedSources.map(s => s.data_source)
    };
  } catch (error) {
    return { connected: false, sources: [] };
  }
}

export async function getRookMetrics() {
  const response = await fetch('/api/rook/users/default/metrics');
  if (!response.ok) {
    throw new Error('Failed to fetch ROOK metrics');
  }
  return response.json();
}

export async function getRookHistory(days = 7) {
  const response = await fetch(`/api/rook/users/default/history?days=${days}`);
  if (!response.ok) {
    throw new Error('Failed to fetch ROOK history');
  }
  return response.json();
}

export default {
  login,
  logout,
  getMetrics,
  getAlerts,
  acknowledgeAlert,
  getHistory,
  getShareSettings,
  updateShareSettings,
  addTrustedContact,
  removeTrustedContact,
  getDevices,
  connectDevice,
  disconnectDevice,
  downloadReport,
  getAlertSettings,
  saveAlertSettings,
  familyLogin,
  getFamilyDashboard,
  getFitbitStatus,
  getFitbitAuthUrl,
  getFitbitMetrics,
  getFitbitIntradayHeart,
  disconnectFitbit,
  refreshFitbitToken
};
