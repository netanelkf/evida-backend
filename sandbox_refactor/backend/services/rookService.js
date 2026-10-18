// ROOK service
import { User, RookWebhookEvent, DeviceProfile } from '../models/index.js';
import vitalsService from './vitalsService.js';
import alertEngine from './alertEngine.js';
import rookConfig from '../config/rook.js';

const ROOK_DEVICE_CATEGORIES = {
  smartwatches: {
    name: 'Smartwatches',
    icon: 'watch',
    devices: [
      { id: 'apple_watch', name: 'Apple Watch', brand: 'Apple' },
      { id: 'garmin', name: 'Garmin Watch', brand: 'Garmin' },
      { id: 'samsung_watch', name: 'Samsung Galaxy Watch', brand: 'Samsung' },
      { id: 'whoop', name: 'WHOOP Strap', brand: 'WHOOP' },
      { id: 'oura', name: 'Oura Ring', brand: 'Oura' },
      { id: 'polar', name: 'Polar Watch', brand: 'Polar' },
      { id: 'withings_scanwatch', name: 'Withings ScanWatch', brand: 'Withings' },
      { id: 'amazfit', name: 'Amazfit Watch', brand: 'Amazfit' },
      { id: 'xiaomi_watch', name: 'Xiaomi Watch', brand: 'Xiaomi' }
    ]
  },
  fitness_trackers: {
    name: 'Fitness Trackers',
    icon: 'activity',
    devices: [
      { id: 'fitbit', name: 'Fitbit', brand: 'Fitbit' },
      { id: 'mi_band', name: 'Mi Band', brand: 'Xiaomi' },
      { id: 'garmin_vivosmart', name: 'Garmin Vivosmart', brand: 'Garmin' },
      { id: 'honor_band', name: 'Honor Band', brand: 'Honor' },
      { id: 'realme_band', name: 'Realme Band', brand: 'Realme' }
    ]
  },
  cgm: {
    name: 'Glucose Monitors (CGM)',
    icon: 'droplet',
    devices: [
      { id: 'dexcom_g7', name: 'Dexcom G7', brand: 'Dexcom' },
      { id: 'dexcom_g6', name: 'Dexcom G6', brand: 'Dexcom' },
      { id: 'freestyle_libre_3', name: 'FreeStyle Libre 3', brand: 'Abbott' },
      { id: 'freestyle_libre_2', name: 'FreeStyle Libre 2', brand: 'Abbott' }
    ]
  },
  blood_pressure: {
    name: 'Blood Pressure Monitors',
    icon: 'heart',
    devices: [
      { id: 'withings_bpm', name: 'Withings BPM Connect', brand: 'Withings' },
      { id: 'omron_heartguide', name: 'Omron HeartGuide', brand: 'Omron' },
      { id: 'ihealth_clear', name: 'iHealth Clear', brand: 'iHealth' }
    ]
  },
  health_platforms: {
    name: 'Health Platforms',
    icon: 'smartphone',
    devices: [
      { id: 'apple_health', name: 'Apple Health', brand: 'Apple' },
      { id: 'health_connect', name: 'Health Connect (Android)', brand: 'Google' },
      { id: 'samsung_health', name: 'Samsung Health', brand: 'Samsung' },
      { id: 'google_fit', name: 'Google Fit', brand: 'Google' }
    ]
  }
};

export async function getDeviceCategories() {
  return ROOK_DEVICE_CATEGORIES;
}

export async function registerUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.rook_user_id) {
    return { rook_user_id: user.rook_user_id };
  }

  const rookUserId = `evida_${userId}`;

  await User.update(userId, { rook_user_id: rookUserId });

  return { rook_user_id: rookUserId };
}

export async function getAuthorizationUrl(userId, dataSource) {
  const user = await User.findById(userId);
  if (!user?.rook_user_id) {
    await registerUser(userId);
  }

  const callbackUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/rook/callback`;

  return {
    authorization_url: `https://rook-connect.review/authorize?client_id=${rookConfig.clientUuid}&user_id=${user.rook_user_id}&source=${dataSource}&redirect_uri=${encodeURIComponent(callbackUrl)}`,
    expires_in: 3600
  };
}

export async function handleOAuthCallback(code, state, rookUserId) {
  const user = await User.findByRookUserId(rookUserId);
  if (!user) {
    throw new Error('User not found for ROOK user ID');
  }

  await DeviceProfile.upsert(user.id, state, {
    device_source: state,
    is_connected: true,
    connection_method: 'rook',
    last_sync_at: new Date()
  });

  return { success: true, user_id: user.id };
}

export async function handleWebhook(payload) {
  const { event_type, user_id: rookUserId, data, timestamp } = payload;

  const user = await User.findByRookUserId(rookUserId);

  const webhookEvent = await RookWebhookEvent.create({
    event_type,
    rook_user_id: rookUserId,
    user_id: user?.id,
    payload
  });

  if (!user) {
    console.warn('Webhook received for unknown ROOK user:', rookUserId);
    return { processed: false, reason: 'unknown_user' };
  }

  try {
    await processWebhookData(user.id, event_type, data);
    await RookWebhookEvent.markProcessed(webhookEvent.id);
    return { processed: true };
  } catch (error) {
    await RookWebhookEvent.markFailed(webhookEvent.id, error.message);
    throw error;
  }
}

async function processWebhookData(userId, eventType, data) {
  switch (eventType) {
    case 'PHYSICAL_HEALTH_SUMMARY':
    case 'physical_health_summary': {
      const vitals = await vitalsService.normalizeRookData({ physical_health: data });
      await vitalsService.store(userId, { ...vitals, data_type: 'daily_summary' });
      await alertEngine.evaluate(userId, vitals);
      break;
    }

    case 'SLEEP_HEALTH_SUMMARY':
    case 'sleep_health_summary': {
      const vitals = await vitalsService.normalizeRookData({ sleep_health: data });
      await vitalsService.store(userId, { ...vitals, data_type: 'daily_summary' });
      break;
    }

    case 'BODY_HEALTH_SUMMARY':
    case 'body_health_summary': {
      const vitals = await vitalsService.normalizeRookData({ body_health: data });
      await vitalsService.store(userId, vitals);
      break;
    }

    case 'HEART_RATE_EVENT':
    case 'heart_rate_event': {
      const vitals = {
        heart_rate: data.hr_avg_bpm || data.hr_bpm,
        source: 'rook',
        data_type: 'realtime',
        recorded_at: new Date(data.timestamp || Date.now())
      };
      await vitalsService.store(userId, vitals);
      await alertEngine.evaluate(userId, vitals);
      break;
    }

    case 'BLOOD_GLUCOSE_EVENT':
    case 'blood_glucose_event': {
      const vitals = {
        glucose_mg_dl: data.blood_glucose_mg_dl,
        glucose_trend: data.trend,
        source: 'rook',
        data_type: 'realtime',
        recorded_at: new Date(data.timestamp || Date.now())
      };
      await vitalsService.store(userId, vitals);
      await alertEngine.evaluate(userId, vitals);
      break;
    }

    case 'BLOOD_PRESSURE_EVENT':
    case 'blood_pressure_event': {
      const vitals = {
        blood_pressure_systolic: data.systolic_bp_mmhg,
        blood_pressure_diastolic: data.diastolic_bp_mmhg,
        source: 'rook',
        data_type: 'realtime',
        recorded_at: new Date(data.timestamp || Date.now())
      };
      await vitalsService.store(userId, vitals);
      await alertEngine.evaluate(userId, vitals);
      break;
    }

    default:
      console.log('Unhandled webhook event type:', eventType);
  }
}

export async function getRecentWebhooks(limit = 50) {
  return RookWebhookEvent.findRecent(limit);
}

export async function getConnectedSources(userId) {
  const devices = await DeviceProfile.findConnectedByUser(userId);
  return devices.filter(d => d.connection_method === 'rook');
}

export async function disconnectSource(userId, deviceType) {
  const device = await DeviceProfile.findByUserAndType(userId, deviceType);
  if (device) {
    await DeviceProfile.disconnect(device.id);
  }
  return { success: true };
}

export default {
  getDeviceCategories,
  registerUser,
  getAuthorizationUrl,
  handleOAuthCallback,
  handleWebhook,
  getRecentWebhooks,
  getConnectedSources,
  disconnectSource
};
