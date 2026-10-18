// eVida Medical Emergency Platform - Backend Server
// Serves both the Wearable App and Dispatch Center

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { deviceRegistry } from './adapters/index.js';
import RookAdapter from './adapters/RookAdapter.js';
import { initIncidentDatabase } from './db/init.js';
import incidentRoutes from './routes/incidents.js';
import authRoutes from './routes/auth.js';
import webhookRoutes, { initHealthEventsTable } from './routes/webhooks.js';
import { startWorker as startActionWorker } from './services/actionWorker.js';

// PostgreSQL connection for persistent storage
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// Fitbit OAuth Configuration (kept for backward compatibility)
const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
// FITBIT_REDIRECT_URI is defined after BASE_URL below

// ============================================
// UNIVERSAL DEVICE TOKEN STORAGE
// ============================================

async function saveDeviceTokens(userId, deviceType, tokens) {
  const query = `
    INSERT INTO device_tokens (user_id, device_type, access_token, refresh_token, expires_at, device_user_id, last_sync, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    ON CONFLICT (user_id, device_type) 
    DO UPDATE SET 
      access_token = $3,
      refresh_token = $4,
      expires_at = $5,
      device_user_id = $6,
      last_sync = NOW(),
      updated_at = NOW()
  `;
  await pool.query(query, [
    userId,
    deviceType,
    tokens.accessToken,
    tokens.refreshToken,
    tokens.expiresAt,
    tokens.deviceUserId || tokens.fitbitUserId || tokens.garminUserId || null
  ]);
}

async function getDeviceTokens(userId, deviceType) {
  const result = await pool.query(
    'SELECT * FROM device_tokens WHERE user_id = $1 AND device_type = $2',
    [userId, deviceType]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: parseInt(row.expires_at),
    deviceUserId: row.device_user_id,
    lastSync: row.last_sync
  };
}

async function deleteDeviceTokens(userId, deviceType) {
  await pool.query('DELETE FROM device_tokens WHERE user_id = $1 AND device_type = $2', [userId, deviceType]);
}

async function getAllUserDevices(userId) {
  const result = await pool.query(
    'SELECT device_type, last_sync FROM device_tokens WHERE user_id = $1',
    [userId]
  );
  return result.rows.map(row => ({
    deviceType: row.device_type,
    lastSync: row.last_sync
  }));
}

// Backward compatibility: Legacy Fitbit token functions
async function saveFitbitTokens(userId, tokens) {
  return saveDeviceTokens(userId, 'fitbit', tokens);
}

async function getFitbitTokens(userId) {
  return getDeviceTokens(userId, 'fitbit');
}

async function deleteFitbitTokens(userId) {
  return deleteDeviceTokens(userId, 'fitbit');
}
import {
  mockUsers,
  mockDispatchUsers,
  mockDevices,
  mockShareSettings,
  generateMetrics,
  generateAlerts,
  generateHistory,
  generateDispatchDevices,
  generateUserProfile
} from './mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;

// Public base URL — used for OAuth callbacks and webhook registration.
// Set PUBLIC_BASE_URL (e.g. https://api.evida.net) in production so the value
// is stable across restarts. Falls back to the Replit dev-tunnel domain in dev.
const BASE_URL = process.env.PUBLIC_BASE_URL ||
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:3001');

const FITBIT_REDIRECT_URI = `${BASE_URL}/api/fitbit/callback`;

// Middleware
app.use(cors());
// Capture raw body bytes so webhook routes can verify HMAC signatures.
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));
app.use(express.urlencoded({ extended: true }));

// Serve static files for wearable app
app.use(express.static(path.join(__dirname, '../apps/wearable/dist')));

// Store for session data (in-memory for demo)
let currentUser = null;
let shareSettings = { ...mockShareSettings };
let connectedDevices = [...mockDevices];

// Default alert settings
let alertSettings = {
  heartRate: { enabled: true, minBpm: 50, maxBpm: 120 },
  oxygenLevel: { enabled: true, minPercent: 92 },
  inactivity: { enabled: true, durationMinutes: 60 },
  fallDetection: { enabled: true, sensitivity: 'medium' },
  temperature: { enabled: false, minTemp: 35.5, maxTemp: 38.5 },
  geofencing: { enabled: false, zones: [] }
};

// Mock family members (linked to trusted contacts)
const mockFamilyUsers = [
  { id: 1, email: 'family@example.com', accessCode: 'family123', name: 'Sarah Johnson', linkedUserId: 1 }
];

// ============================================
// WEARABLE APP AUTHENTICATION ENDPOINTS
// ============================================
// Login/Signup handled by authRoutes (routes/auth.js) with bcrypt authentication

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  currentUser = null;
  res.json({ success: true });
});

// ============================================
// HEALTH METRICS ENDPOINTS
// ============================================

// Helper to extract metrics from ROOK webhook payloads
function extractMetricsFromRookData(events) {
  const metrics = {
    heartRate: { current: null, trend: 'stable', history: [] },
    oxygenLevel: { current: null, trend: 'stable' },
    bloodPressure: { systolic: null, diastolic: null },
    temperature: { current: null, unit: 'C' },
    steps: { today: null, goal: 10000 },
    sleep: { hours: null, quality: null },
    weight: { current: null, unit: 'kg' },
    bmi: null,
    calories: { consumed: null, burned: null },
    lastSync: null,
    dataSource: null
  };

  for (const event of events) {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
    metrics.lastSync = event.received_at;
    
    // Extract from body_summary
    if (payload.body_health?.summary?.body_summary) {
      const body = payload.body_health.summary.body_summary;
      
      // Heart rate
      if (body.heart_rate?.hr_avg_bpm_int) {
        metrics.heartRate.current = body.heart_rate.hr_avg_bpm_int;
      }
      if (body.heart_rate?.hr_resting_bpm_int) {
        metrics.heartRate.resting = body.heart_rate.hr_resting_bpm_int;
      }
      
      // Oxygen
      if (body.oxygenation?.saturation_avg_percentage_int) {
        metrics.oxygenLevel.current = body.oxygenation.saturation_avg_percentage_int;
      }
      
      // Body metrics
      if (body.body_metrics) {
        if (body.body_metrics.weight_kg_float) metrics.weight.current = body.body_metrics.weight_kg_float;
        if (body.body_metrics.bmi_float) metrics.bmi = body.body_metrics.bmi_float;
        if (body.body_metrics.height_cm_int) metrics.height = body.body_metrics.height_cm_int;
      }
      
      // Nutrition
      if (body.nutrition?.calories_intake_kcal_float) {
        metrics.calories.consumed = body.nutrition.calories_intake_kcal_float;
      }
      
      // Blood pressure
      if (body.blood_pressure?.blood_pressure_avg_object) {
        const bp = body.blood_pressure.blood_pressure_avg_object;
        if (bp.systolic) metrics.bloodPressure.systolic = bp.systolic;
        if (bp.diastolic) metrics.bloodPressure.diastolic = bp.diastolic;
      }
      
      // Temperature
      if (body.temperature?.temperature_avg_object?.celsius) {
        metrics.temperature.current = body.temperature.temperature_avg_object.celsius;
      }
      
      // Extract from non_structured_data (Fitbit specific)
      if (body.non_structured_data_array && Array.isArray(body.non_structured_data_array)) {
        for (const item of body.non_structured_data_array) {
          if (item && item.averageDailySteps) metrics.steps.today = item.averageDailySteps;
          if (item && item.source_of_data_string) metrics.dataSource = item.source_of_data_string;
        }
      }
    }
    
    // Extract from physical_summary (activity data)
    if (payload.physical_health?.summary?.physical_summary) {
      const physical = payload.physical_health.summary.physical_summary;
      if (physical.steps_int) metrics.steps.today = physical.steps_int;
      if (physical.calories_burned_kcal_int) metrics.calories.burned = physical.calories_burned_kcal_int;
    }
    
    // Extract from physical_health EVENTS (real-time step events from Fitbit)
    if (payload.physical_health?.events) {
      const physEvents = payload.physical_health.events;
      
      // Heart rate events
      if (physEvents.heart_rate_event && Array.isArray(physEvents.heart_rate_event)) {
        const hrEvent = physEvents.heart_rate_event[0];
        if (hrEvent?.heart_rate?.hr_bpm_int) {
          metrics.heartRate.current = hrEvent.heart_rate.hr_bpm_int;
        }
        if (hrEvent?.metadata?.sources_of_data_array?.[0]) {
          metrics.dataSource = hrEvent.metadata.sources_of_data_array[0];
        }
      }
      
      // Step events
      if (physEvents.steps_event && Array.isArray(physEvents.steps_event)) {
        for (const stepEvent of physEvents.steps_event) {
          if (stepEvent?.steps?.accumulated_steps_int) {
            metrics.steps.today = (metrics.steps.today || 0) + stepEvent.steps.accumulated_steps_int;
          }
          if (stepEvent?.metadata?.sources_of_data_array?.[0]) {
            metrics.dataSource = stepEvent.metadata.sources_of_data_array[0];
          }
          // Also check non_structured_data for step counts
          if (stepEvent?.non_structured_data_array) {
            for (const item of stepEvent.non_structured_data_array) {
              if (item.value && parseInt(item.value) > 0) {
                metrics.steps.today = Math.max(metrics.steps.today || 0, parseInt(item.value));
              }
            }
          }
        }
      }
      
      // Oxygenation events
      if (physEvents.oxygenation_event && Array.isArray(physEvents.oxygenation_event)) {
        const oxEvent = physEvents.oxygenation_event[0];
        if (oxEvent?.oxygenation?.saturation_percentage_int) {
          metrics.oxygenLevel.current = oxEvent.oxygenation.saturation_percentage_int;
        }
      }
    }
    
    // Extract from body_health EVENTS (real-time body events)
    if (payload.body_health?.events) {
      const bodyEvents = payload.body_health.events;
      
      // Heart rate events in body health
      if (bodyEvents.heart_rate_event && Array.isArray(bodyEvents.heart_rate_event)) {
        const hrEvent = bodyEvents.heart_rate_event[0];
        if (hrEvent?.heart_rate?.hr_bpm_int) {
          metrics.heartRate.current = hrEvent.heart_rate.hr_bpm_int;
        }
      }
    }
    
    // Extract from sleep_summary
    if (payload.sleep_health?.summary?.sleep_summary) {
      const sleep = payload.sleep_health.summary.sleep_summary;
      if (sleep.sleep_duration_seconds_int) {
        metrics.sleep.hours = Math.round(sleep.sleep_duration_seconds_int / 3600 * 10) / 10;
      }
      if (sleep.sleep_score_int) metrics.sleep.quality = sleep.sleep_score_int;
    }
  }
  
  return metrics;
}

// GET /api/metrics - Current health metrics (now uses real ROOK data)
app.get('/api/metrics', async (req, res) => {
  try {
    // Get the most recent health events from ROOK webhooks
    const result = await pool.query(
      `SELECT * FROM health_events ORDER BY received_at DESC LIMIT 10`
    );
    
    if (result.rows.length > 0) {
      const metrics = extractMetricsFromRookData(result.rows);
      // Fill in missing values with reasonable defaults for display
      // Match field names expected by the frontend
      res.json({
        heartRate: metrics.heartRate.current || null,
        oxygenLevel: metrics.oxygenLevel.current || null,
        bloodPressure: {
          systolic: metrics.bloodPressure.systolic || null,
          diastolic: metrics.bloodPressure.diastolic || null
        },
        temperature: metrics.temperature.current || null,
        steps: metrics.steps.today || 0,
        stepsGoal: metrics.steps.goal,
        sleepHours: metrics.sleep.hours || null,
        sleepQuality: metrics.sleep.quality || null,
        weight: metrics.weight.current,
        bmi: metrics.bmi,
        calories: metrics.calories.consumed || metrics.calories.burned || 0,
        activeMinutes: 0,
        lastUpdated: metrics.lastSync,
        source: metrics.dataSource || 'Fitbit',
        dataSource: metrics.dataSource || 'ROOK',
        isRealData: true
      });
    } else {
      // No webhook data yet, return mock data with flag
      const mockData = generateMetrics();
      res.json({ ...mockData, isRealData: false, message: 'No device data yet - connect a wearable to see real metrics' });
    }
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.json(generateMetrics());
  }
});

// ============================================
// ALERTS ENDPOINTS
// ============================================

// GET /api/alerts - Get all alerts
app.get('/api/alerts', (req, res) => {
  res.json(generateAlerts());
});

// POST /api/alerts/:id/acknowledge - Acknowledge an alert
app.post('/api/alerts/:id/acknowledge', (req, res) => {
  const alertId = parseInt(req.params.id);
  res.json({ success: true, alertId, acknowledged: true });
});

// ============================================
// HISTORY ENDPOINTS
// ============================================

// GET /api/history - Historical health data
app.get('/api/history', async (req, res) => {
  try {
    // Get all health events (we'll filter by data date, not received date)
    const result = await pool.query(
      `SELECT * FROM health_events ORDER BY received_at DESC LIMIT 100`
    );
    
    if (result.rows.length > 0) {
      // Group events by the date inside the data, not when received
      const dailyData = {};
      
      for (const event of result.rows) {
        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
        
        // Get the data date from metadata, fallback to received_at
        let dateStr = new Date(event.received_at).toISOString().split('T')[0];
        if (payload.body_health?.summary?.body_summary?.metadata?.datetime_string) {
          dateStr = payload.body_health.summary.body_summary.metadata.datetime_string.split('T')[0];
        }
        
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = { date: dateStr, steps: 0, calories: 0, activeMinutes: 0, sleep: 0 };
        }
        
        // Extract steps from non_structured_data_array (Fitbit specific)
        if (payload.body_health?.summary?.body_summary?.non_structured_data_array) {
          for (const item of payload.body_health.summary.body_summary.non_structured_data_array) {
            if (item.averageDailySteps) {
              dailyData[dateStr].steps = Math.max(dailyData[dateStr].steps, item.averageDailySteps);
            }
          }
        }
        
        // Extract from physical_summary
        if (payload.physical_health?.summary?.physical_summary) {
          const physical = payload.physical_health.summary.physical_summary;
          if (physical.steps_int) dailyData[dateStr].steps = Math.max(dailyData[dateStr].steps, physical.steps_int);
          if (physical.calories_burned_kcal_int) dailyData[dateStr].calories = physical.calories_burned_kcal_int;
          if (physical.active_duration_seconds_int) {
            dailyData[dateStr].activeMinutes = Math.round(physical.active_duration_seconds_int / 60);
          }
        }
        
        // Extract calories from nutrition
        if (payload.body_health?.summary?.body_summary?.nutrition?.calories_intake_kcal_float) {
          dailyData[dateStr].calories = Math.round(payload.body_health.summary.body_summary.nutrition.calories_intake_kcal_float);
        }
        
        // Extract sleep
        if (payload.sleep_health?.summary?.sleep_summary?.sleep_duration_seconds_int) {
          const sleepHours = payload.sleep_health.summary.sleep_summary.sleep_duration_seconds_int / 3600;
          dailyData[dateStr].sleep = Math.round(sleepHours * 10) / 10;
        }
      }
      
      // Convert to array sorted by date (most recent last)
      const sortedDates = Object.keys(dailyData).sort();
      const history = sortedDates.map(date => dailyData[date]);
      
      // If we have data, return it; otherwise fill with empty days
      if (history.length > 0) {
        res.json({ days: history.slice(-7), isRealData: true, allDays: history });
      } else {
        res.json(generateHistory());
      }
    } else {
      // No webhook data, return mock
      res.json(generateHistory());
    }
  } catch (error) {
    console.error('Error fetching history:', error);
    res.json(generateHistory());
  }
});

// ============================================
// SHARE SETTINGS ENDPOINTS
// ============================================

// GET /api/share-settings - Get sharing settings
app.get('/api/share-settings', (req, res) => {
  res.json(shareSettings);
});

// POST /api/share-settings - Update sharing settings
app.post('/api/share-settings', (req, res) => {
  const updates = req.body;
  shareSettings = { ...shareSettings, ...updates };
  res.json({ success: true, settings: shareSettings });
});

// POST /api/share-settings/contacts - Add trusted contact
app.post('/api/share-settings/contacts', (req, res) => {
  const { name, relationship, phone, email, canReceiveAlerts } = req.body;
  const newContact = {
    id: shareSettings.trustedContacts.length + 1,
    name,
    relationship,
    phone,
    email,
    canReceiveAlerts: canReceiveAlerts !== false
  };
  shareSettings.trustedContacts.push(newContact);
  res.json({ success: true, contact: newContact });
});

// DELETE /api/share-settings/contacts/:id - Remove trusted contact
app.delete('/api/share-settings/contacts/:id', (req, res) => {
  const contactId = parseInt(req.params.id);
  shareSettings.trustedContacts = shareSettings.trustedContacts.filter(c => c.id !== contactId);
  res.json({ success: true });
});

// ============================================
// ALERT SETTINGS ENDPOINTS
// ============================================

// GET /api/alert-settings - Get alert threshold settings
app.get('/api/alert-settings', (req, res) => {
  res.json(alertSettings);
});

// POST /api/alert-settings - Save alert threshold settings
app.post('/api/alert-settings', (req, res) => {
  const updates = req.body;
  alertSettings = { ...alertSettings, ...updates };
  res.json({ success: true, settings: alertSettings });
});

// ============================================
// FAMILY MEMBER PORTAL ENDPOINTS
// ============================================

// POST /api/family/login - Family member login
app.post('/api/family/login', (req, res) => {
  const { email, accessCode } = req.body;
  
  const familyUser = mockFamilyUsers.find(
    u => u.email === email && u.accessCode === accessCode
  );
  
  if (familyUser) {
    res.json({
      success: true,
      user: { id: familyUser.id, name: familyUser.name, email: familyUser.email },
      token: `family-token-${familyUser.id}-${Date.now()}`
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid email or access code' });
  }
});

// GET /api/family/dashboard - Get family dashboard data
app.get('/api/family/dashboard', (req, res) => {
  const metrics = generateMetrics();
  const alerts = generateAlerts();
  
  res.json({
    lovedOne: {
      id: 1,
      name: 'John Doe',
      relationship: 'Father'
    },
    metrics: {
      heartRate: metrics.heartRate,
      oxygenLevel: metrics.oxygenLevel,
      bloodPressure: metrics.bloodPressure,
      temperature: metrics.temperature,
      steps: metrics.steps,
      battery: 78
    },
    location: {
      address: '123 Oak Street',
      city: 'Springfield, IL',
      lat: 39.7817,
      lng: -89.6501,
      inSafeZone: true,
      lastMovement: '5 minutes ago'
    },
    alerts: alerts.slice(0, 5).map(a => ({
      ...a,
      time: 'Today ' + new Date(a.timestamp).toLocaleTimeString()
    }))
  });
});

// ============================================
// DEVICE CONNECTION ENDPOINTS
// ============================================

// GET /api/devices - Get connected devices
app.get('/api/devices', (req, res) => {
  res.json(connectedDevices);
});

// POST /api/devices/connect - Connect a device
app.post('/api/devices/connect', (req, res) => {
  const { deviceType } = req.body;
  const device = connectedDevices.find(d => d.type === deviceType);
  
  if (device) {
    device.connected = true;
    device.lastSync = new Date().toISOString();
    res.json({ success: true, device });
  } else {
    res.status(404).json({ success: false, error: 'Device type not found' });
  }
});

// POST /api/devices/disconnect - Disconnect a device
app.post('/api/devices/disconnect', (req, res) => {
  const { deviceType } = req.body;
  const device = connectedDevices.find(d => d.type === deviceType);
  
  if (device) {
    device.connected = false;
    res.json({ success: true, device });
  } else {
    res.status(404).json({ success: false, error: 'Device type not found' });
  }
});

// ============================================
// UNIVERSAL DEVICE API ENDPOINTS
// ============================================

// GET /api/devices/supported - Get all supported device types
app.get('/api/devices/supported', (req, res) => {
  try {
    const devices = deviceRegistry.getSupportedDevices();
    const aggregators = deviceRegistry.getAggregatorServices();
    const integrationOptions = deviceRegistry.getIntegrationOptions();
    
    res.json({ 
      devices,
      aggregators,
      integrationOptions,
      summary: {
        totalBrands: devices.length,
        available: devices.filter(d => d.status === 'available').length,
        comingSoon: devices.filter(d => d.status === 'coming-soon').length,
        realTimeCapable: devices.filter(d => d.supportsRealTime && d.emergencySuitable).length
      }
    });
  } catch (error) {
    console.error('Error getting supported devices:', error);
    res.status(500).json({ error: 'Failed to get supported devices' });
  }
});

// GET /api/devices/brands - Get all wearable brands (simplified list)
app.get('/api/devices/brands', (req, res) => {
  try {
    const devices = deviceRegistry.getAllBrands();
    res.json({ 
      brands: devices.map(d => ({
        type: d.type,
        name: d.displayName,
        brand: d.brand,
        logo: d.logo,
        status: d.status,
        realTime: d.supportsRealTime,
        emergencySafe: d.emergencySuitable,
        models: d.popularModels
      }))
    });
  } catch (error) {
    console.error('Error getting brands:', error);
    res.status(500).json({ error: 'Failed to get brands' });
  }
});

// GET /api/devices/aggregators - Get third-party aggregator options
app.get('/api/devices/aggregators', (req, res) => {
  try {
    const aggregators = deviceRegistry.getAggregatorServices();
    res.json({ aggregators });
  } catch (error) {
    console.error('Error getting aggregators:', error);
    res.status(500).json({ error: 'Failed to get aggregators' });
  }
});

// GET /api/devices/:type/status - Get connection status for a device type
app.get('/api/devices/:type/status', async (req, res) => {
  const { type } = req.params;
  const userId = req.query.userId || 'default';
  
  try {
    const adapter = deviceRegistry.getAdapter(type);
    const tokens = await getDeviceTokens(userId, type);
    const isConnected = !!tokens;
    
    const deviceInfo = adapter.getDeviceInfo();
    
    res.json({
      type: type,
      connected: isConnected,
      configured: deviceRegistry.isConfigured(type),
      lastSync: isConnected ? tokens.lastSync : null,
      ...deviceInfo
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/devices/:type/authorize - Start OAuth flow for device type
app.get('/api/devices/:type/authorize', (req, res) => {
  const { type } = req.params;
  
  try {
    if (!deviceRegistry.isConfigured(type)) {
      const secrets = deviceRegistry.getConfigurationStatus()[type]?.requiredSecrets || [];
      return res.status(500).json({ 
        error: `${type} API not configured`,
        requiredSecrets: secrets,
        message: `Please add ${secrets.join(' and ')} to enable this integration.`
      });
    }
    
    const adapter = deviceRegistry.getAdapter(type);
    const redirectUri = `${BASE_URL}/api/devices/${type}/callback`;
    const authUrl = adapter.getAuthorizationUrl(redirectUri, `${type}-oauth`);
    
    if (!authUrl) {
      return res.status(400).json({ 
        error: 'OAuth not available for this device type',
        requirements: adapter.getIntegrationRequirements ? adapter.getIntegrationRequirements() : null
      });
    }
    
    res.json({ authUrl });
  } catch (error) {
    console.error(`${type} authorize error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/devices/:type/callback - OAuth callback handler
app.get('/api/devices/:type/callback', async (req, res) => {
  const { type } = req.params;
  const { code, error } = req.query;
  const userId = 'default';
  
  const sendHtmlResponse = (message, success = false) => {
    const bgColor = success ? '#10B981' : '#EF4444';
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${type} Connection</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); }
          .card { background: white; padding: 40px; border-radius: 16px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
          .icon { width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; background: ${bgColor}; }
          .icon svg { width: 32px; height: 32px; fill: white; }
          h2 { color: #1a1a2e; margin: 0 0 10px; }
          p { color: #64748b; margin: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">
            <svg viewBox="0 0 24 24">${success ? '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>' : '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>'}</svg>
          </div>
          <h2>${success ? 'Connected!' : 'Connection Failed'}</h2>
          <p>${message}</p>
          <script>setTimeout(() => { window.close(); }, 2000);</script>
        </div>
      </body>
      </html>
    `);
  };
  
  if (error) {
    return sendHtmlResponse(`Authorization was denied: ${error}`, false);
  }
  
  if (!code) {
    return sendHtmlResponse('No authorization code received', false);
  }
  
  try {
    const adapter = deviceRegistry.getAdapter(type);
    const redirectUri = `${BASE_URL}/api/devices/${type}/callback`;
    const tokens = await adapter.handleCallback(code, redirectUri);
    
    await saveDeviceTokens(userId, type, tokens);
    
    sendHtmlResponse(`Your ${adapter.displayName} is now connected to eVida`, true);
  } catch (err) {
    console.error(`${type} callback error:`, err);
    sendHtmlResponse(err.message || 'Failed to complete connection', false);
  }
});

// GET /api/devices/:type/metrics - Get health data from device
app.get('/api/devices/:type/metrics', async (req, res) => {
  const { type } = req.params;
  const userId = req.query.userId || 'default';
  
  try {
    const tokens = await getDeviceTokens(userId, type);
    
    if (!tokens) {
      return res.status(401).json({ error: `${type} not connected` });
    }
    
    const adapter = deviceRegistry.getAdapter(type);
    const metrics = await adapter.getMetrics(tokens);
    
    res.json(metrics);
  } catch (error) {
    console.error(`${type} metrics error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/devices/:type/disconnect - Disconnect device
app.post('/api/devices/:type/disconnect', async (req, res) => {
  const { type } = req.params;
  const userId = req.body.userId || 'default';
  
  try {
    const tokens = await getDeviceTokens(userId, type);
    
    if (tokens) {
      const adapter = deviceRegistry.getAdapter(type);
      await adapter.disconnect(tokens);
    }
    
    await deleteDeviceTokens(userId, type);
    
    res.json({ success: true });
  } catch (error) {
    console.error(`${type} disconnect error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/devices/connected - Get all connected devices for user
app.get('/api/devices/connected', async (req, res) => {
  const userId = req.query.userId || 'default';
  
  try {
    const userDevices = await getAllUserDevices(userId);
    const connectedDevicesInfo = [];
    
    for (const device of userDevices) {
      try {
        const adapter = deviceRegistry.getAdapter(device.deviceType);
        const info = adapter.getDeviceInfo();
        const tokens = await getDeviceTokens(userId, device.deviceType);
        
        connectedDevicesInfo.push({
          type: device.deviceType,
          ...info,
          connected: true,
          lastSync: device.lastSync,
          tokens: !!tokens
        });
      } catch (e) {
        // Device type may no longer be supported
      }
    }
    
    res.json({ devices: connectedDevicesInfo });
  } catch (error) {
    console.error('Error getting connected devices:', error);
    res.status(500).json({ error: 'Failed to get connected devices' });
  }
});

// ============================================
// FITBIT INTEGRATION ENDPOINTS (Legacy - kept for backward compatibility)
// ============================================

// In-memory cache (populated from database on startup)
let fitbitTokensCache = {};

// Load tokens from database on startup
async function loadFitbitTokensFromDB() {
  try {
    const result = await pool.query('SELECT * FROM fitbit_tokens');
    for (const row of result.rows) {
      fitbitTokensCache[row.user_id] = {
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        expiresAt: parseInt(row.expires_at),
        fitbitUserId: row.fitbit_user_id,
        lastSync: row.last_sync
      };
    }
    console.log(`Loaded ${result.rows.length} Fitbit tokens from database`);
  } catch (err) {
    console.error('Error loading Fitbit tokens:', err);
  }
}

// GET /api/fitbit/status - Check Fitbit connection status
app.get('/api/fitbit/status', async (req, res) => {
  const userId = req.query.userId || 'default';
  
  // Check cache first, then database
  let tokens = fitbitTokensCache[userId];
  if (!tokens) {
    tokens = await getFitbitTokens(userId);
    if (tokens) fitbitTokensCache[userId] = tokens;
  }
  
  const isConnected = !!tokens;
  
  res.json({
    connected: isConnected,
    configured: !!(FITBIT_CLIENT_ID && FITBIT_CLIENT_SECRET),
    lastSync: isConnected ? tokens.lastSync : null
  });
});

// GET /api/fitbit/authorize - Start OAuth flow
app.get('/api/fitbit/authorize', (req, res) => {
  if (!FITBIT_CLIENT_ID || !FITBIT_CLIENT_SECRET) {
    return res.status(500).json({ 
      error: 'Fitbit API not configured. Please add FITBIT_CLIENT_ID and FITBIT_CLIENT_SECRET.' 
    });
  }
  
  const scopes = [
    'activity',
    'heartrate',
    'sleep',
    'weight',
    'oxygen_saturation',
    'respiratory_rate',
    'temperature'
  ].join('%20');
  
  const authUrl = `https://www.fitbit.com/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${FITBIT_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(FITBIT_REDIRECT_URI)}&` +
    `scope=${scopes}&` +
    `expires_in=604800`;
  
  res.json({ authUrl });
});

// GET /api/fitbit/callback - OAuth callback handler
app.get('/api/fitbit/callback', async (req, res) => {
  const { code, error } = req.query;
  
  // Helper to send HTML response for popup window
  const sendPopupResponse = (success, message) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fitbit Connection</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 400px;
          }
          .icon { font-size: 64px; margin-bottom: 20px; }
          h1 { color: ${success ? '#10b981' : '#ef4444'}; margin: 0 0 10px 0; }
          p { color: #666; margin: 0 0 20px 0; }
          .countdown { color: #999; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">${success ? '✅' : '❌'}</div>
          <h1>${success ? 'Connected!' : 'Connection Failed'}</h1>
          <p>${message}</p>
          <p class="countdown">This window will close automatically...</p>
        </div>
        <script>
          setTimeout(function() { window.close(); }, 2000);
        </script>
      </body>
      </html>
    `;
    res.send(html);
  };
  
  if (error) {
    return sendPopupResponse(false, error);
  }
  
  if (!code) {
    return sendPopupResponse(false, 'No authorization code received');
  }
  
  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: FITBIT_REDIRECT_URI
      })
    });
    
    const tokens = await tokenResponse.json();
    
    if (tokens.errors) {
      console.error('Fitbit token error:', tokens.errors);
      return sendPopupResponse(false, tokens.errors[0].message);
    }
    
    // Store tokens in database for persistence
    const tokenData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      fitbitUserId: tokens.user_id,
      lastSync: new Date().toISOString()
    };
    
    await saveFitbitTokens('default', tokenData);
    fitbitTokensCache['default'] = tokenData;
    
    // Update connected devices
    const fitbitDevice = connectedDevices.find(d => d.type === 'fitbit');
    if (fitbitDevice) {
      fitbitDevice.connected = true;
      fitbitDevice.lastSync = new Date().toISOString();
    }
    
    sendPopupResponse(true, 'Your Fitbit account is now connected. Your health data will sync automatically.');
  } catch (err) {
    console.error('Fitbit OAuth error:', err);
    sendPopupResponse(false, 'Failed to connect Fitbit. Please try again.');
  }
});

// POST /api/fitbit/refresh - Refresh access token
app.post('/api/fitbit/refresh', async (req, res) => {
  const userId = 'default';
  let tokens = fitbitTokensCache[userId];
  if (!tokens) {
    tokens = await getFitbitTokens(userId);
  }
  
  if (!tokens || !tokens.refreshToken) {
    return res.status(401).json({ error: 'No Fitbit connection found' });
  }
  
  try {
    const response = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken
      })
    });
    
    const newTokens = await response.json();
    
    if (newTokens.errors) {
      return res.status(401).json({ error: newTokens.errors[0].message });
    }
    
    const updatedTokens = {
      ...tokens,
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: Date.now() + (newTokens.expires_in * 1000),
      lastSync: new Date().toISOString()
    };
    
    await saveFitbitTokens(userId, updatedTokens);
    fitbitTokensCache[userId] = updatedTokens;
    
    res.json({ success: true });
  } catch (err) {
    console.error('Fitbit refresh error:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// GET /api/fitbit/devices - Get connected Fitbit devices info
app.get('/api/fitbit/devices', async (req, res) => {
  const userId = 'default';
  let tokens = fitbitTokensCache[userId];
  if (!tokens) {
    tokens = await getFitbitTokens(userId);
    if (tokens) fitbitTokensCache[userId] = tokens;
  }
  
  if (!tokens || !tokens.accessToken) {
    return res.status(401).json({ error: 'Fitbit not connected' });
  }
  
  try {
    const response = await fetch('https://api.fitbit.com/1/user/-/devices.json', {
      headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
    });
    
    const devices = await response.json();
    
    if (devices.errors) {
      return res.status(400).json({ error: devices.errors[0].message });
    }
    
    res.json({ devices });
  } catch (err) {
    console.error('Fitbit devices error:', err);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// GET /api/fitbit/metrics - Get real Fitbit health data
app.get('/api/fitbit/metrics', async (req, res) => {
  const userId = 'default';
  let tokens = fitbitTokensCache[userId];
  if (!tokens) {
    tokens = await getFitbitTokens(userId);
    if (tokens) fitbitTokensCache[userId] = tokens;
  }
  
  if (!tokens || !tokens.accessToken) {
    return res.status(401).json({ error: 'Fitbit not connected' });
  }
  
  // Check if token needs refresh
  if (Date.now() > tokens.expiresAt - 300000) { // 5 min buffer
    try {
      await refreshFitbitToken(userId);
      tokens = fitbitTokensCache[userId];
    } catch (err) {
      return res.status(401).json({ error: 'Token expired, please reconnect' });
    }
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Fetch multiple metrics in parallel including devices and intraday heart rate
    const [heartRateRes, activityRes, sleepRes, devicesRes, intradayRes] = await Promise.all([
      fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d.json`, {
        headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
      }),
      fetch(`https://api.fitbit.com/1/user/-/activities/date/${today}.json`, {
        headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
      }),
      fetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${today}.json`, {
        headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
      }),
      fetch('https://api.fitbit.com/1/user/-/devices.json', {
        headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
      }),
      fetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d/1min.json`, {
        headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
      })
    ]);
    
    const [heartRateData, activityData, sleepData, devicesData, intradayData] = await Promise.all([
      heartRateRes.json(),
      activityRes.json(),
      sleepRes.json(),
      devicesRes.json(),
      intradayRes.json()
    ]);
    
    // Extract relevant metrics
    const heartRateZones = heartRateData['activities-heart']?.[0]?.value?.heartRateZones || [];
    const restingHR = heartRateData['activities-heart']?.[0]?.value?.restingHeartRate || null;
    
    // Get the most recent heart rate from intraday data
    const intradayHeartRate = intradayData['activities-heart-intraday']?.dataset || [];
    const latestHeartRate = intradayHeartRate.length > 0 
      ? intradayHeartRate[intradayHeartRate.length - 1].value 
      : null;
    
    // Get device info
    const device = Array.isArray(devicesData) && devicesData.length > 0 ? devicesData[0] : null;
    
    res.json({
      source: 'fitbit',
      lastSync: tokens.lastSync || new Date().toISOString(),
      heartRate: latestHeartRate || restingHR || 72,
      restingHeartRate: restingHR,
      steps: activityData.summary?.steps || 0,
      calories: activityData.summary?.caloriesOut || 0,
      distance: activityData.summary?.distances?.find(d => d.activity === 'total')?.distance || 0,
      floors: activityData.summary?.floors || 0,
      activeMinutes: (activityData.summary?.fairlyActiveMinutes || 0) + (activityData.summary?.veryActiveMinutes || 0),
      sleepHours: sleepData.summary?.totalMinutesAsleep ? (sleepData.summary.totalMinutesAsleep / 60).toFixed(1) : null,
      sleepEfficiency: sleepData.sleep?.[0]?.efficiency || null,
      heartRateZones,
      device: device ? {
        name: device.deviceVersion,
        type: device.type,
        battery: device.batteryLevel,
        lastSyncTime: device.lastSyncTime
      } : null
    });
    
  } catch (err) {
    console.error('Fitbit API error:', err);
    res.status(500).json({ error: 'Failed to fetch Fitbit data' });
  }
});

// GET /api/fitbit/intraday-heart - Get detailed heart rate data
app.get('/api/fitbit/intraday-heart', async (req, res) => {
  const userId = 'default';
  let tokens = fitbitTokensCache[userId];
  if (!tokens) {
    tokens = await getFitbitTokens(userId);
    if (tokens) fitbitTokensCache[userId] = tokens;
  }
  
  if (!tokens || !tokens.accessToken) {
    return res.status(401).json({ error: 'Fitbit not connected' });
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const response = await fetch(
      `https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d/1min.json`,
      {
        headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
      }
    );
    
    const data = await response.json();
    
    if (data.errors) {
      return res.status(403).json({ 
        error: 'Intraday data requires personal app type or approved access',
        details: data.errors 
      });
    }
    
    res.json({
      date: today,
      restingHeartRate: data['activities-heart']?.[0]?.value?.restingHeartRate,
      intradayData: data['activities-heart-intraday']?.dataset || []
    });
    
  } catch (err) {
    console.error('Fitbit intraday error:', err);
    res.status(500).json({ error: 'Failed to fetch intraday data' });
  }
});

// POST /api/fitbit/disconnect - Disconnect Fitbit
app.post('/api/fitbit/disconnect', async (req, res) => {
  const userId = 'default';
  
  // Revoke token with Fitbit (optional but good practice)
  const tokens = fitbitTokensCache[userId];
  if (tokens && tokens.accessToken) {
    try {
      await fetch('https://api.fitbit.com/oauth2/revoke', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ token: tokens.accessToken })
      });
    } catch (err) {
      console.error('Token revocation failed:', err);
    }
  }
  
  // Clear tokens from database and cache
  await deleteFitbitTokens(userId);
  delete fitbitTokensCache[userId];
  
  // Update device status
  const fitbitDevice = connectedDevices.find(d => d.type === 'fitbit');
  if (fitbitDevice) {
    fitbitDevice.connected = false;
  }
  
  res.json({ success: true });
});

// Helper function to refresh Fitbit tokens
async function refreshFitbitToken(userId) {
  let tokens = fitbitTokensCache[userId];
  if (!tokens) {
    tokens = await getFitbitTokens(userId);
  }
  if (!tokens) throw new Error('No tokens found');
  
  const response = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken
    })
  });
  
  const newTokens = await response.json();
  
  if (newTokens.errors) throw new Error(newTokens.errors[0].message);
  
  const updatedTokens = {
    ...tokens,
    accessToken: newTokens.access_token,
    refreshToken: newTokens.refresh_token,
    expiresAt: Date.now() + (newTokens.expires_in * 1000),
    lastSync: new Date().toISOString()
  };
  
  await saveFitbitTokens(userId, updatedTokens);
  fitbitTokensCache[userId] = updatedTokens;
}

// ============================================
// REPORTS ENDPOINTS
// ============================================

// GET /api/reports - Generate downloadable report (PDF, CSV, or JSON)
app.get('/api/reports', (req, res) => {
  const format = req.query.format || 'csv';
  const history = generateHistory();
  const metrics = generateMetrics();
  const alerts = generateAlerts();
  
  if (format === 'pdf') {
    // Generate PDF report
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=evida-health-report.pdf');
    
    doc.pipe(res);
    
    // Title
    doc.fontSize(24).fillColor('#2c5282').text('eVida Health Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('#718096').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);
    
    // Current Metrics Section
    doc.fontSize(16).fillColor('#2d3748').text('Current Health Metrics', { underline: true });
    doc.moveDown();
    doc.fontSize(12).fillColor('#4a5568');
    doc.text(`Heart Rate: ${metrics.heartRate} bpm`);
    doc.text(`Oxygen Level: ${metrics.oxygenLevel}%`);
    doc.text(`Steps: ${metrics.steps}`);
    doc.text(`Blood Pressure: ${metrics.bloodPressure.systolic}/${metrics.bloodPressure.diastolic} mmHg`);
    doc.text(`Temperature: ${metrics.temperature}°C`);
    doc.text(`Calories Burned: ${metrics.calories}`);
    doc.text(`Sleep Duration: ${metrics.sleepHours} hours`);
    doc.moveDown(2);
    
    // Alerts Section
    doc.fontSize(16).fillColor('#2d3748').text('Recent Alerts', { underline: true });
    doc.moveDown();
    doc.fontSize(11).fillColor('#4a5568');
    alerts.slice(0, 5).forEach(alert => {
      const color = alert.severity === 'critical' ? '#c53030' : alert.severity === 'warning' ? '#c05621' : '#2b6cb0';
      doc.fillColor(color).text(`[${alert.severity.toUpperCase()}] ${alert.message}`);
      doc.fillColor('#718096').text(`   ${new Date(alert.timestamp).toLocaleString()}`);
      doc.moveDown(0.5);
    });
    doc.moveDown();
    
    // Historical Data Section
    doc.fontSize(16).fillColor('#2d3748').text('Historical Data (Last 7 Days)', { underline: true });
    doc.moveDown();
    doc.fontSize(10).fillColor('#4a5568');
    
    // Table header
    let tableY = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Date/Time', 50, tableY);
    doc.text('HR', 180, tableY);
    doc.text('O2', 230, tableY);
    doc.text('Steps', 280, tableY);
    doc.text('BP', 340, tableY);
    tableY += 18;
    
    // Draw header underline
    doc.moveTo(50, tableY - 3).lineTo(420, tableY - 3).stroke('#e2e8f0');
    
    doc.font('Helvetica');
    history.slice(0, 12).forEach((record, index) => {
      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(45, tableY - 2, 380, 16).fill('#f7fafc');
        doc.fillColor('#4a5568');
      }
      
      doc.text(`${record.date} ${record.time}`, 50, tableY);
      doc.text(`${record.heartRate}`, 180, tableY);
      doc.text(`${record.oxygenLevel}%`, 230, tableY);
      doc.text(`${record.steps}`, 280, tableY);
      doc.text(`${record.bloodPressure}`, 340, tableY);
      tableY += 16;
    });
    
    doc.y = tableY + 10;
    
    // Footer
    doc.moveDown(2);
    doc.fontSize(10).fillColor('#a0aec0').text('This report was generated by eVida Medical Emergency Platform', { align: 'center' });
    doc.text('For medical emergencies, please contact your healthcare provider or call 911.', { align: 'center' });
    
    doc.end();
    
  } else if (format === 'csv') {
    // Generate CSV report
    let csv = 'eVida Health Report\n';
    csv += `Generated: ${new Date().toISOString()}\n\n`;
    csv += 'Current Metrics\n';
    csv += `Heart Rate,${metrics.heartRate} bpm\n`;
    csv += `Oxygen Level,${metrics.oxygenLevel}%\n`;
    csv += `Steps,${metrics.steps}\n`;
    csv += `Blood Pressure,${metrics.bloodPressure.systolic}/${metrics.bloodPressure.diastolic}\n`;
    csv += `Temperature,${metrics.temperature}°C\n\n`;
    csv += 'Historical Data\n';
    csv += 'Timestamp,Heart Rate,Oxygen Level,Steps,Blood Pressure\n';
    
    history.slice(0, 20).forEach(h => {
      csv += `${h.timestamp},${h.heartRate},${h.oxygenLevel},${h.steps},${h.bloodPressure}\n`;
    });
    
    csv += '\nAlerts\n';
    csv += 'Timestamp,Type,Message,Severity\n';
    alerts.forEach(a => {
      csv += `${a.timestamp},${a.type},${a.message},${a.severity}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=evida-health-report.csv');
    res.send(csv);
    
  } else {
    // Return JSON for other formats
    res.json({
      reportDate: new Date().toISOString(),
      currentMetrics: metrics,
      history: history.slice(0, 20),
      alerts
    });
  }
});

// ============================================
// DISPATCH CENTER ENDPOINTS
// ============================================

// Login for dispatch center
app.post('/api/dispatch/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = mockDispatchUsers.find(u => u.username === username && u.password === password);
  
  if (user) {
    res.json({ 
      success: true, 
      user: { id: user.id, name: user.name, center: user.center },
      token: `dispatch-token-${user.id}-${Date.now()}`
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// GET /api/dispatch/devices - Get all devices with locations for map
app.get('/api/dispatch/devices', (req, res) => {
  res.json(generateDispatchDevices());
});

// GET /api/dispatch/users/:id - Get detailed user profile
app.get('/api/dispatch/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  res.json(generateUserProfile(userId));
});

// GET /api/dispatch/stats - Get dispatch statistics
app.get('/api/dispatch/stats', (req, res) => {
  const devices = generateDispatchDevices();
  res.json({
    totalDevices: devices.length,
    normalCount: devices.filter(d => d.status === 'normal').length,
    warningCount: devices.filter(d => d.status === 'warning').length,
    criticalCount: devices.filter(d => d.status === 'critical').length,
    activeAlerts: generateAlerts().filter(a => !a.acknowledged).length,
    lastUpdate: new Date().toISOString()
  });
});

// ============================================
// ROOK INTEGRATION ENDPOINTS (400+ Devices)
// ============================================

const rookAdapter = new RookAdapter();

// In-memory storage for ROOK users and webhook events
const rookUserStore = new Map();
const rookWebhookEvents = [];

// GET /api/rook/status - Check ROOK integration status
app.get('/api/rook/status', (req, res) => {
  const configured = !!(process.env.ROOK_CLIENT_UUID && process.env.ROOK_CLIENT_SECRET);
  res.json({
    configured,
    provider: 'ROOK',
    supportedDevices: 400,
    features: ['webhooks', 'real-time', 'glucose', 'blood-pressure', 'temperature'],
    message: configured ? 'ROOK is configured and ready' : 'Please add ROOK_CLIENT_UUID and ROOK_CLIENT_SECRET to enable ROOK integration'
  });
});

// GET /api/rook/devices - Get all ROOK-supported devices by category
app.get('/api/rook/devices', (req, res) => {
  try {
    const devices = rookAdapter.getSupportedDevices();
    const categories = rookAdapter.getDeviceCategories();
    
    const devicesByCategory = {};
    for (const [key, category] of Object.entries(categories)) {
      devicesByCategory[key] = {
        ...category,
        devices: devices.filter(d => d.category === key)
      };
    }
    
    res.json({
      totalDevices: devices.length,
      categories: devicesByCategory,
      allDevices: devices
    });
  } catch (error) {
    console.error('ROOK devices error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rook/users - Register a user with ROOK
app.post('/api/rook/users', async (req, res) => {
  const { userId, email } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  try {
    const result = await rookAdapter.registerUser(userId, email);
    rookUserStore.set(userId, { registered: true, email, createdAt: new Date() });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('ROOK register user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rook/users/:userId/authorize - Get authorization URL for user
app.get('/api/rook/users/:userId/authorize', async (req, res) => {
  const { userId } = req.params;
  const { dataSource, redirectUri } = req.query;
  
  try {
    const redirect = redirectUri || `${BASE_URL}/devices`;
    const authUrl = await rookAdapter.getAuthorizationUrl(userId, redirect, dataSource);
    res.json({ authUrl });
  } catch (error) {
    console.error('ROOK authorize error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rook/users/:userId/sources - Get connected data sources for user
app.get('/api/rook/users/:userId/sources', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const sources = await rookAdapter.getConnectedSources(userId);
    res.json({ sources });
  } catch (error) {
    console.error('ROOK sources error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/rook/users/:userId/sources/:source - Disconnect a data source
app.delete('/api/rook/users/:userId/sources/:source', async (req, res) => {
  const { userId, source } = req.params;
  
  try {
    const success = await rookAdapter.disconnectSource(userId, source);
    res.json({ success });
  } catch (error) {
    console.error('ROOK disconnect error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rook/users/:userId/metrics - Get all health metrics from ROOK
app.get('/api/rook/users/:userId/metrics', async (req, res) => {
  const { userId } = req.params;
  const { date } = req.query;
  
  try {
    const metrics = await rookAdapter.getAllMetrics(userId, date);
    const alerts = rookAdapter.checkForAlerts(metrics);
    res.json({ ...metrics, alerts });
  } catch (error) {
    console.error('ROOK metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rook/users/:userId/history - Get historical data (last 7 days)
app.get('/api/rook/users/:userId/history', async (req, res) => {
  const { userId } = req.params;
  const { days = 7 } = req.query;
  
  try {
    const history = [];
    const numDays = Math.min(parseInt(days) || 7, 30);
    
    for (let i = 1; i <= numDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      try {
        const physical = await rookAdapter.getPhysicalHealthSummary(userId, dateStr);
        const sleep = await rookAdapter.getSleepHealthSummary(userId, dateStr);
        
        const physicalData = rookAdapter.extractPhysicalData(physical);
        const sleepData = rookAdapter.extractSleepData(sleep);
        
        history.push({
          date: dateStr,
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
          steps: physicalData?.steps || 0,
          calories: physicalData?.calories || 0,
          distance: physicalData?.distance_meters ? (physicalData.distance_meters / 1000).toFixed(2) : 0,
          activeMinutes: physicalData?.active_minutes || 0,
          heartRate: physicalData?.heart_rate_avg || null,
          sleepHours: sleepData?.duration_minutes ? (sleepData.duration_minutes / 60).toFixed(1) : null,
          sleepEfficiency: sleepData?.efficiency || null,
          hasData: !!(physicalData || sleepData)
        });
      } catch (e) {
        history.push({
          date: dateStr,
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
          steps: 0,
          calories: 0,
          distance: 0,
          activeMinutes: 0,
          heartRate: null,
          sleepHours: null,
          sleepEfficiency: null,
          hasData: false
        });
      }
    }
    
    res.json({ 
      source: 'rook',
      days: numDays,
      history: history.reverse() // Oldest first for charts
    });
  } catch (error) {
    console.error('ROOK history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rook/users/:userId/physical - Get physical health summary
app.get('/api/rook/users/:userId/physical', async (req, res) => {
  const { userId } = req.params;
  const { date } = req.query;
  
  try {
    const data = await rookAdapter.getPhysicalHealthSummary(userId, date);
    res.json(data || { message: 'No physical health data available' });
  } catch (error) {
    console.error('ROOK physical error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rook/users/:userId/sleep - Get sleep health summary
app.get('/api/rook/users/:userId/sleep', async (req, res) => {
  const { userId } = req.params;
  const { date } = req.query;
  
  try {
    const data = await rookAdapter.getSleepHealthSummary(userId, date);
    res.json(data || { message: 'No sleep data available' });
  } catch (error) {
    console.error('ROOK sleep error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rook/users/:userId/body - Get body health summary
app.get('/api/rook/users/:userId/body', async (req, res) => {
  const { userId } = req.params;
  const { date } = req.query;
  
  try {
    const data = await rookAdapter.getBodyHealthSummary(userId, date);
    res.json(data || { message: 'No body health data available' });
  } catch (error) {
    console.error('ROOK body error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rook/users/:userId/events/heart-rate - Get heart rate events
app.get('/api/rook/users/:userId/events/heart-rate', async (req, res) => {
  const { userId } = req.params;
  const { date } = req.query;
  
  try {
    const events = await rookAdapter.getHeartRateEvents(userId, date);
    res.json({ events });
  } catch (error) {
    console.error('ROOK heart rate events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rook/users/:userId/events/glucose - Get glucose events
app.get('/api/rook/users/:userId/events/glucose', async (req, res) => {
  const { userId } = req.params;
  const { date } = req.query;
  
  try {
    const events = await rookAdapter.getGlucoseEvents(userId, date);
    res.json({ events });
  } catch (error) {
    console.error('ROOK glucose events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rook/users/:userId/events/blood-pressure - Get blood pressure events
app.get('/api/rook/users/:userId/events/blood-pressure', async (req, res) => {
  const { userId } = req.params;
  const { date } = req.query;
  
  try {
    const events = await rookAdapter.getBloodPressureEvents(userId, date);
    res.json({ events });
  } catch (error) {
    console.error('ROOK blood pressure events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rook/users/:userId/events/temperature - Get temperature events
app.get('/api/rook/users/:userId/events/temperature', async (req, res) => {
  const { userId } = req.params;
  const { date } = req.query;
  
  try {
    const events = await rookAdapter.getTemperatureEvents(userId, date);
    res.json({ events });
  } catch (error) {
    console.error('ROOK temperature events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rook/webhooks - ROOK webhook receiver for real-time events
app.post('/api/rook/webhooks', (req, res) => {
  const event = req.body;
  
  try {
    const processedEvent = rookAdapter.processWebhookEvent(event);
    
    rookWebhookEvents.push({
      ...processedEvent,
      receivedAt: new Date().toISOString()
    });
    
    if (rookWebhookEvents.length > 1000) {
      rookWebhookEvents.splice(0, rookWebhookEvents.length - 1000);
    }
    
    if (processedEvent.isAlert) {
      console.log(`[ROOK ALERT] ${processedEvent.type} for user ${processedEvent.userId}:`, processedEvent.data);
    }
    
    res.json({ success: true, processed: processedEvent });
  } catch (error) {
    console.error('ROOK webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rook/webhooks/recent - Get recent webhook events (for monitoring)
app.get('/api/rook/webhooks/recent', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const events = rookWebhookEvents.slice(-limit).reverse();
  
  res.json({
    events,
    total: rookWebhookEvents.length,
    alerts: events.filter(e => e.isAlert)
  });
});

// ============================================
// INCIDENT MANAGEMENT ENDPOINTS
// ============================================

app.use('/api', incidentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);

// ============================================
// HEALTH CHECK
// ============================================

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'eVida Medical Emergency Platform API',
    version: '1.0.0',
    baseUrl: BASE_URL,
    endpoints: {
      wearableApp: {
        'POST /api/auth/login':    'User login',
        'POST /api/auth/signup':   'User registration',
        'POST /api/auth/logout':   'User logout',
        'GET  /api/metrics':       'Current health metrics',
        'GET  /api/alerts':        'All alerts',
        'GET  /api/history':       'Historical health data',
        'GET  /api/share-settings':'Sharing settings',
        'GET  /api/devices':       'Connected devices',
        'GET  /api/reports':       'Download health report (format: pdf, csv, json)'
      },
      dispatchCenter: {
        'POST /api/dispatch/login':     'Dispatch login',
        'GET  /api/dispatch/devices':   'All devices with locations',
        'GET  /api/dispatch/stats':     'Dispatch statistics'
      },
      incidents: {
        'POST /api/sos':                'Trigger SOS event',
        'GET  /api/incidents':          'List incidents',
        'GET  /api/incidents/:id':      'Incident detail',
        'PATCH /api/incidents/:id':     'Update incident status',
        'POST /api/incidents/:id/notes':'Add note to incident'
      },
      webhooks: {
        'POST /api/webhooks/rook':      'ROOK health data push',
        'GET  /api/webhooks/rook/status':'Webhook status'
      }
    }
  });
});

// ============================================================
// HEALTH CHECK — used by load balancers, uptime monitors, CI
// ============================================================
app.get('/health', async (req, res) => {
  const start = Date.now();
  let dbStatus = 'ok';
  let dbLatencyMs = null;

  try {
    const t0 = Date.now();
    await pool.query('SELECT 1');
    dbLatencyMs = Date.now() - t0;
  } catch (err) {
    dbStatus = 'error';
    console.error('[Health] DB check failed:', err.message);
  }

  const status = dbStatus === 'ok' ? 'ok' : 'degraded';
  res.status(dbStatus === 'ok' ? 200 : 503).json({
    status,
    timestamp:    new Date().toISOString(),
    uptime:       Math.floor(process.uptime()),
    environment:  process.env.NODE_ENV || 'development',
    baseUrl:      BASE_URL,
    db:           { status: dbStatus, latencyMs: dbLatencyMs },
    responseMs:   Date.now() - start
  });
});

// Catch-all: return 404 JSON for unmatched /api/* routes;
// serve the wearable React app for everything else (only when built).
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found', path: req.path });
  }
  const indexPath = path.join(__dirname, '../apps/wearable/dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({
        error: 'Frontend not built',
        hint: 'Run `npm run build` inside apps/wearable/ and redeploy'
      });
    }
  });
});

// Seed demo users on startup
async function seedDemoUsers() {
  const demoUsers = [
    { username: 'demo', email: 'demo@evida.app', password: 'demo', name: 'Demo User', role: 'user' },
    { username: 'admin', email: 'admin@evida.app', password: 'admin123', name: 'Admin Operator', role: 'operator' }
  ];
  
  for (const user of demoUsers) {
    try {
      const existing = await pool.query('SELECT id FROM users WHERE username = $1', [user.username]);
      if (existing.rows.length === 0) {
        const passwordHash = await bcrypt.hash(user.password, 10);
        await pool.query(
          `INSERT INTO users (username, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
          [user.username, user.email, passwordHash, user.name, user.role]
        );
        console.log(`[Seed] Created demo user: ${user.username}`);
      }
    } catch (err) {
      console.log(`[Seed] User ${user.username} already exists or error:`, err.message);
    }
  }
}

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  // Load Fitbit tokens from database on startup
  await loadFitbitTokensFromDB();
  
  // Initialize incident management database tables
  await initIncidentDatabase();
  
  // Initialize health events table for ROOK webhooks
  await initHealthEventsTable();
  
  // Add rook_user_id column to users if not exists
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS rook_user_id VARCHAR(255);
    CREATE INDEX IF NOT EXISTS idx_users_rook ON users(rook_user_id);
  `).catch(err => console.log('[DB] rook_user_id column may already exist'));
  
  // Seed demo users for testing
  await seedDemoUsers();
  
  // Start the action worker for processing notifications
  startActionWorker(5000);
  
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║           eVida Medical Emergency Platform                ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  🏥 Server running on port ${PORT}                           ║
  ║  📱 Wearable App: http://localhost:${PORT}                   ║
  ║  🚑 API Documentation: http://localhost:${PORT}/api          ║
  ║  🆘 Incident API: POST /api/sos, GET /api/incidents       ║
  ╠═══════════════════════════════════════════════════════════╣
  ║  Demo Credentials:                                        ║
  ║  • Wearable App: demo / demo                              ║
  ║  • Dispatch Center: admin / admin123                      ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
