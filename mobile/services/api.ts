import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://evida-backend-production.up.railway.app';

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Auth ---
export const register = (data: { email: string; password: string; name: string; phone?: string }) =>
  api.post('/auth/register', data).then((r) => r.data);

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const getMe = () => api.get('/auth/me').then((r) => r.data);

export const updateMe = (data: { name?: string; phone?: string; expo_push_token?: string }) =>
  api.patch('/auth/me', data).then((r) => r.data);

// --- Health Data ---
export const getLatestVitals = () => api.get('/health-data/latest').then((r) => r.data);
export const getVitalsSummary = (from?: string, to?: string) =>
  api.get('/health-data/summary', { params: { from, to } }).then((r) => r.data);

// --- Alerts ---
export const getAlerts = (status?: string, limit = 20) =>
  api.get('/alerts', { params: { status, limit } }).then((r) => r.data);

export const acknowledgeAlert = (id: string) =>
  api.post(`/alerts/${id}/acknowledge`).then((r) => r.data);

export const getAlertStats = () => api.get('/alerts/stats').then((r) => r.data);

// --- Contacts ---
export const getContacts = () => api.get('/contacts').then((r) => r.data);

export const createContact = (data: {
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
}) => api.post('/contacts', data).then((r) => r.data);

export const deleteContact = (id: string) => api.delete(`/contacts/${id}`);

// --- Thresholds ---
export const getThresholds = () => api.get('/thresholds').then((r) => r.data);

export const updateThreshold = (metric: string, data: { min_value?: number; max_value?: number; enabled?: boolean }) =>
  api.put(`/thresholds/${metric}`, data).then((r) => r.data);

export const resetThresholds = () => api.post('/thresholds/reset').then((r) => r.data);

export default api;
