import BaseAdapter from './BaseAdapter.js';

const ROOK_SUPPORTED_DEVICES = [
  { category: 'smartwatches', name: 'Apple Watch', icon: 'watch', source: 'apple_health' },
  { category: 'smartwatches', name: 'Garmin', icon: 'watch', source: 'garmin' },
  { category: 'smartwatches', name: 'Fitbit', icon: 'watch', source: 'fitbit' },
  { category: 'smartwatches', name: 'Samsung Galaxy Watch', icon: 'watch', source: 'samsung_health' },
  { category: 'smartwatches', name: 'WHOOP', icon: 'watch', source: 'whoop' },
  { category: 'smartwatches', name: 'Oura Ring', icon: 'ring', source: 'oura' },
  { category: 'smartwatches', name: 'Polar', icon: 'watch', source: 'polar' },
  { category: 'smartwatches', name: 'Suunto', icon: 'watch', source: 'suunto' },
  { category: 'smartwatches', name: 'Coros', icon: 'watch', source: 'coros' },
  { category: 'smartwatches', name: 'Withings', icon: 'watch', source: 'withings' },
  { category: 'smartwatches', name: 'Amazfit', icon: 'watch', source: 'amazfit' },
  { category: 'smartwatches', name: 'Xiaomi', icon: 'watch', source: 'xiaomi' },
  { category: 'smartwatches', name: 'Huawei Watch', icon: 'watch', source: 'huawei' },
  { category: 'smartwatches', name: 'Google Pixel Watch', icon: 'watch', source: 'health_connect' },
  { category: 'smartwatches', name: 'Wear OS Devices', icon: 'watch', source: 'health_connect' },
  { category: 'fitness_trackers', name: 'Fitbit Bands', icon: 'band', source: 'fitbit' },
  { category: 'fitness_trackers', name: 'Xiaomi Mi Band', icon: 'band', source: 'xiaomi' },
  { category: 'fitness_trackers', name: 'Garmin Vivosmart', icon: 'band', source: 'garmin' },
  { category: 'fitness_trackers', name: 'Honor Band', icon: 'band', source: 'honor' },
  { category: 'cgm', name: 'Dexcom G7', icon: 'cgm', source: 'dexcom', realTime: true },
  { category: 'cgm', name: 'Dexcom G6', icon: 'cgm', source: 'dexcom', realTime: true },
  { category: 'cgm', name: 'FreeStyle Libre 3', icon: 'cgm', source: 'libre', realTime: true },
  { category: 'cgm', name: 'FreeStyle Libre 2', icon: 'cgm', source: 'libre', realTime: true },
  { category: 'blood_pressure', name: 'Withings BPM', icon: 'bp', source: 'withings' },
  { category: 'blood_pressure', name: 'Omron HeartGuide', icon: 'bp', source: 'omron' },
  { category: 'blood_pressure', name: 'iHealth Clear', icon: 'bp', source: 'ihealth' },
  { category: 'health_platforms', name: 'Apple Health', icon: 'platform', source: 'apple_health' },
  { category: 'health_platforms', name: 'Health Connect (Android)', icon: 'platform', source: 'health_connect' },
  { category: 'health_platforms', name: 'Samsung Health', icon: 'platform', source: 'samsung_health' },
  { category: 'health_platforms', name: 'Google Fit', icon: 'platform', source: 'google_fit' }
];

const DEVICE_CATEGORIES = {
  smartwatches: { name: 'Smartwatches', icon: 'watch', description: 'Apple Watch, Garmin, Samsung, etc.' },
  fitness_trackers: { name: 'Fitness Trackers', icon: 'band', description: 'Mi Band, Fitbit bands, etc.' },
  cgm: { name: 'Glucose Monitors (CGM)', icon: 'cgm', description: 'Dexcom, FreeStyle Libre' },
  blood_pressure: { name: 'Blood Pressure', icon: 'bp', description: 'Smart BP monitors' },
  health_platforms: { name: 'Health Platforms', icon: 'platform', description: 'Apple Health, Health Connect' }
};

export class RookAdapter extends BaseAdapter {
  constructor(config = {}) {
    super(config);
    this.deviceType = 'rook';
    this.displayName = 'ROOK (400+ Devices)';
    this.supportsRealTime = true;
    this.syncMethod = 'webhook-push';
    this.minSyncInterval = 60;
    this.dataCategories = [
      'heartRate', 'steps', 'calories', 'distance', 'sleep', 'oxygen',
      'glucose', 'bloodPressure', 'temperature', 'hrv', 'stress', 'respiration'
    ];

    this.clientUuid = process.env.ROOK_CLIENT_UUID;
    this.clientSecret = process.env.ROOK_CLIENT_SECRET;
    // Use sandbox URL for development, production URL for live
    this.baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.rook-connect.com'
      : 'https://api.rook-connect.review';
  }

  getReliabilityNote() {
    return 'ROOK provides unified access to 400+ devices with real-time webhooks. Data freshness depends on connected device type.';
  }

  getSupportedDevices() {
    return ROOK_SUPPORTED_DEVICES;
  }

  getDeviceCategories() {
    return DEVICE_CATEGORIES;
  }

  getDevicesByCategory(category) {
    return ROOK_SUPPORTED_DEVICES.filter(d => d.category === category);
  }

  getBasicAuthHeader() {
    if (!this.clientUuid || !this.clientSecret) {
      throw new Error('ROOK credentials not configured. Set ROOK_CLIENT_UUID and ROOK_CLIENT_SECRET.');
    }
    const credentials = Buffer.from(`${this.clientUuid}:${this.clientSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async registerUser(userId, userEmail = null) {
    // ROOK creates users implicitly when you use the authorization endpoints
    // We just store them locally and return success
    return { userId, status: 'created' };
  }

  async getAuthorizationUrl(userId, redirectUri, dataSource = null) {
    const authHeader = this.getBasicAuthHeader();

    // If a specific data source is requested, use the per-source authorizer endpoint
    if (dataSource) {
      const response = await fetch(
        `${this.baseUrl}/api/v1/user_id/${userId}/data_source/${dataSource}/authorizer?redirect_url=${encodeURIComponent(redirectUri)}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get authorization URL: ${error || response.statusText}`);
      }

      const data = await response.json();
      return data.authorization_url;
    }

    // Use the deprecated but comprehensive authorizers endpoint to get all sources
    const response = await fetch(
      `${this.baseUrl}/api/v1/client_uuid/${this.clientUuid}/user_id/${userId}/data_sources/authorizers?redirect_url=${encodeURIComponent(redirectUri)}`,
      {
        headers: {
          'Authorization': authHeader
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get authorization URL: ${error || response.statusText}`);
    }

    const data = await response.json();

    // Return the ROOK connection page URL or first available data source
    if (data.data_sources && data.data_sources.length > 0) {
      // Find the first source with an authorization URL
      const availableSource = data.data_sources.find(s => s.authorization_url);
      if (availableSource) {
        return availableSource.authorization_url;
      }
    }

    // Fallback: return the whole response for the frontend to handle
    return data;
  }

  async getConnectedSources(userId) {
    const authHeader = this.getBasicAuthHeader();

    const response = await fetch(
      `${this.baseUrl}/api/v2/user_id/${userId}/data_sources/authorized`,
      {
        headers: {
          'Authorization': authHeader
        }
      }
    );

    if (!response.ok) {
      // Try v1 endpoint as fallback
      const v1Response = await fetch(
        `${this.baseUrl}/api/v1/user_id/${userId}/data_sources/authorized`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      if (!v1Response.ok) {
        return [];
      }

      const v1Data = await v1Response.json();
      // v1 returns { sources: { garmin: true, fitbit: false, ... } }
      if (v1Data.sources) {
        return Object.entries(v1Data.sources)
          .filter(([_, authorized]) => authorized)
          .map(([source]) => ({ data_source: source, authorized: true }));
      }
      return [];
    }

    const data = await response.json();
    return data.data_sources || [];
  }

  async disconnectSource(userId, dataSource) {
    const authHeader = this.getBasicAuthHeader();

    const response = await fetch(
      `${this.baseUrl}/api/v1/user_id/${userId}/data_sources/revoke_auth`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data_source: dataSource
        })
      }
    );

    return response.ok;
  }

  async getPhysicalHealthSummary(userId, date = null) {
    const authHeader = this.getBasicAuthHeader();
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/processed_data/physical_health/summary?user_id=${userId}&date=${targetDate}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      if (!response.ok) return null;
      return await this.safeJsonParse(response);
    } catch (e) {
      return null;
    }
  }

  async getSleepHealthSummary(userId, date = null) {
    const authHeader = this.getBasicAuthHeader();
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/processed_data/sleep_health/summary?user_id=${userId}&date=${targetDate}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      if (!response.ok) return null;
      return await this.safeJsonParse(response);
    } catch (e) {
      return null;
    }
  }

  async getBodyHealthSummary(userId, date = null) {
    const authHeader = this.getBasicAuthHeader();
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/processed_data/body_health/summary?user_id=${userId}&date=${targetDate}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      if (!response.ok) return null;
      return await this.safeJsonParse(response);
    } catch (e) {
      return null;
    }
  }

  async safeJsonParse(response) {
    try {
      const text = await response.text();
      if (!text || text.trim() === '') return null;
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  async getHeartRateEvents(userId, date = null) {
    const authHeader = this.getBasicAuthHeader();
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/processed_data/physical_health/events/heart_rate?user_id=${userId}&date=${targetDate}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      if (!response.ok) return [];
      const data = await this.safeJsonParse(response);
      return data?.events || [];
    } catch (e) {
      return [];
    }
  }

  async getOxygenEvents(userId, date = null) {
    const authHeader = this.getBasicAuthHeader();
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/processed_data/physical_health/events/oxygenation?user_id=${userId}&date=${targetDate}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      if (!response.ok) return [];
      const data = await this.safeJsonParse(response);
      return data?.events || [];
    } catch (e) {
      return [];
    }
  }

  async getGlucoseEvents(userId, date = null) {
    const authHeader = this.getBasicAuthHeader();
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/processed_data/body_health/events/blood_glucose?user_id=${userId}&date=${targetDate}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      if (!response.ok) return [];
      const data = await this.safeJsonParse(response);
      return data?.events || [];
    } catch (e) {
      return [];
    }
  }

  async getBloodPressureEvents(userId, date = null) {
    const authHeader = this.getBasicAuthHeader();
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/processed_data/body_health/events/blood_pressure?user_id=${userId}&date=${targetDate}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      if (!response.ok) return [];
      const data = await this.safeJsonParse(response);
      return data?.events || [];
    } catch (e) {
      return [];
    }
  }

  async getTemperatureEvents(userId, date = null) {
    const authHeader = this.getBasicAuthHeader();
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/processed_data/body_health/events/temperature?user_id=${userId}&date=${targetDate}`,
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );

      if (!response.ok) return [];
      const data = await this.safeJsonParse(response);
      return data?.events || [];
    } catch (e) {
      return [];
    }
  }

  async getAllMetrics(userId, date = null) {
    // Try today first, then check up to 7 days back to find the most recent data
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    let physical = null;
    let sleep = null;
    let body = null;
    let dataDate = null;

    // Find the most recent day with data
    for (const checkDate of dates) {
      const [p, s, b] = await Promise.all([
        this.getPhysicalHealthSummary(userId, checkDate),
        this.getSleepHealthSummary(userId, checkDate),
        this.getBodyHealthSummary(userId, checkDate)
      ]);

      if (p || s || b) {
        physical = p;
        sleep = s;
        body = b;
        dataDate = checkDate;
        break;
      }
    }

    // Get events for the date we found data, or today
    const targetDate = dataDate || date;
    const [heartRateEvents, oxygenEvents, glucoseEvents, bpEvents, tempEvents] =
      await Promise.all([
        this.getHeartRateEvents(userId, targetDate),
        this.getOxygenEvents(userId, targetDate),
        this.getGlucoseEvents(userId, targetDate),
        this.getBloodPressureEvents(userId, targetDate),
        this.getTemperatureEvents(userId, targetDate)
      ]);

    return this.normalizeAllMetrics({
      physical,
      sleep,
      body,
      heartRateEvents,
      oxygenEvents,
      glucoseEvents,
      bpEvents,
      tempEvents,
      dataDate
    });
  }

  extractPhysicalData(physicalResponse) {
    if (!physicalResponse) return null;

    const summary = physicalResponse?.physical_health?.summary?.physical_summary;
    if (!summary) return null;

    const distance = summary.distance || {};
    const calories = summary.calories || {};
    const heartRate = summary.heart_rate || {};
    const activity = summary.activity || {};

    return {
      steps: distance.steps_int || 0,
      distance_meters: distance.traveled_distance_meters_float || 0,
      calories: calories.net_active_calories_kcal_int || calories.total_calories_kcal_int || 0,
      heart_rate_avg: heartRate.hr_avg_bpm_int || null,
      resting_heart_rate: heartRate.resting_hr_bpm_int || null,
      hrv: heartRate.hrv_avg_sdnn_ms_int || null,
      active_minutes: activity.active_seconds_int ? Math.round(activity.active_seconds_int / 60) : 0,
      floors: distance.floors_climbed_int || 0
    };
  }

  extractSleepData(sleepResponse) {
    if (!sleepResponse) return null;

    const summary = sleepResponse?.sleep_health?.summary?.sleep_summary;
    if (!summary) return null;

    return {
      duration_minutes: summary.sleep_duration_seconds_int ? Math.round(summary.sleep_duration_seconds_int / 60) : null,
      efficiency: summary.sleep_efficiency_percentage_float || null,
      deep_minutes: summary.deep_sleep_seconds_int ? Math.round(summary.deep_sleep_seconds_int / 60) : null,
      rem_minutes: summary.rem_sleep_seconds_int ? Math.round(summary.rem_sleep_seconds_int / 60) : null,
      light_minutes: summary.light_sleep_seconds_int ? Math.round(summary.light_sleep_seconds_int / 60) : null,
      awake_minutes: summary.time_awake_during_sleep_seconds_int ? Math.round(summary.time_awake_during_sleep_seconds_int / 60) : null
    };
  }

  extractBodyData(bodyResponse) {
    if (!bodyResponse) return null;

    const summary = bodyResponse?.body_health?.summary?.body_summary;
    if (!summary) return null;

    return {
      blood_oxygen: summary.blood_oxygen_saturation_percentage_float || null,
      rook_score: summary.rook_score || null
    };
  }

  normalizeAllMetrics(rawData) {
    const { physical, sleep, body, heartRateEvents, oxygenEvents, glucoseEvents, bpEvents, tempEvents, dataDate } = rawData;

    const physicalData = this.extractPhysicalData(physical);
    const sleepData = this.extractSleepData(sleep);
    const bodyData = this.extractBodyData(body);

    const lastHeartRate = heartRateEvents.length > 0 ? heartRateEvents[heartRateEvents.length - 1] : null;
    const lastOxygen = oxygenEvents.length > 0 ? oxygenEvents[oxygenEvents.length - 1] : null;
    const lastGlucose = glucoseEvents.length > 0 ? glucoseEvents[glucoseEvents.length - 1] : null;
    const lastBP = bpEvents.length > 0 ? bpEvents[bpEvents.length - 1] : null;
    const lastTemp = tempEvents.length > 0 ? tempEvents[tempEvents.length - 1] : null;

    const lastEventTime = [
      lastHeartRate?.timestamp,
      lastOxygen?.timestamp,
      lastGlucose?.timestamp,
      lastBP?.timestamp,
      lastTemp?.timestamp
    ].filter(Boolean).sort().pop();

    const freshness = this.calculateFreshness(lastEventTime);

    const hasData = !!(physicalData || sleepData || bodyData || lastHeartRate || lastOxygen);

    return {
      source: 'rook',
      timestamp: new Date().toISOString(),
      dataDate: dataDate || null,
      hasData,
      lastSync: freshness.lastSyncTime,
      dataAge: freshness.dataAge,
      isFresh: freshness.isFresh,
      freshnessLevel: freshness.freshnessLevel,
      ageMinutes: freshness.ageMinutes,

      heartRate: lastHeartRate?.hr_avg_bpm || physicalData?.heart_rate_avg || null,
      restingHeartRate: physicalData?.resting_heart_rate || null,
      hrv: physicalData?.hrv || null,

      steps: physicalData?.steps || 0,
      calories: physicalData?.calories || 0,
      distance: physicalData?.distance_meters ? (physicalData.distance_meters / 1000).toFixed(2) : 0,
      activeMinutes: physicalData?.active_minutes || 0,
      floors: physicalData?.floors || 0,

      oxygen: lastOxygen?.saturation_percentage || bodyData?.blood_oxygen || null,

      glucose: lastGlucose ? {
        value: lastGlucose.blood_glucose_mg_dl,
        timestamp: lastGlucose.timestamp,
        trend: lastGlucose.trend || null
      } : null,

      bloodPressure: lastBP ? {
        systolic: lastBP.systolic_mmhg,
        diastolic: lastBP.diastolic_mmhg,
        timestamp: lastBP.timestamp
      } : null,

      temperature: lastTemp ? {
        value: lastTemp.body_temperature_celsius,
        timestamp: lastTemp.timestamp
      } : null,

      sleep: sleepData ? {
        duration: sleepData.duration_minutes,
        efficiency: sleepData.efficiency,
        deepSleep: sleepData.deep_minutes,
        remSleep: sleepData.rem_minutes,
        lightSleep: sleepData.light_minutes,
        awake: sleepData.awake_minutes
      } : null,

      stress: null,
      respiration: null,

      rookScore: bodyData?.rook_score || null,

      events: {
        heartRate: heartRateEvents,
        oxygen: oxygenEvents,
        glucose: glucoseEvents,
        bloodPressure: bpEvents,
        temperature: tempEvents
      }
    };
  }

  processWebhookEvent(event) {
    const { event_type, user_id, data, timestamp } = event;

    switch (event_type) {
      case 'PHYSICAL_HEALTH_SUMMARY':
        return {
          type: 'physical_summary',
          userId: user_id,
          data: {
            heartRate: data.heart_rate_avg_bpm,
            steps: data.steps,
            calories: data.active_calories_kcal,
            distance: data.distance_meters
          },
          timestamp
        };

      case 'HEART_RATE_EVENT':
        return {
          type: 'heart_rate',
          userId: user_id,
          data: {
            value: data.hr_avg_bpm,
            min: data.hr_min_bpm,
            max: data.hr_max_bpm
          },
          timestamp: data.timestamp,
          isAlert: data.hr_avg_bpm > 120 || data.hr_avg_bpm < 50
        };

      case 'OXYGENATION_EVENT':
        return {
          type: 'oxygen',
          userId: user_id,
          data: {
            value: data.saturation_percentage
          },
          timestamp: data.timestamp,
          isAlert: data.saturation_percentage < 90
        };

      case 'BLOOD_GLUCOSE_EVENT':
        return {
          type: 'glucose',
          userId: user_id,
          data: {
            value: data.blood_glucose_mg_dl,
            trend: data.trend
          },
          timestamp: data.timestamp,
          isAlert: data.blood_glucose_mg_dl < 70 || data.blood_glucose_mg_dl > 250
        };

      case 'BLOOD_PRESSURE_EVENT':
        return {
          type: 'blood_pressure',
          userId: user_id,
          data: {
            systolic: data.systolic_mmhg,
            diastolic: data.diastolic_mmhg
          },
          timestamp: data.timestamp,
          isAlert: data.systolic_mmhg > 180 || data.diastolic_mmhg > 120
        };

      case 'BODY_TEMPERATURE_EVENT':
        return {
          type: 'temperature',
          userId: user_id,
          data: {
            value: data.body_temperature_celsius
          },
          timestamp: data.timestamp,
          isAlert: data.body_temperature_celsius > 38.5 || data.body_temperature_celsius < 35
        };

      default:
        return {
          type: 'unknown',
          userId: user_id,
          data,
          timestamp
        };
    }
  }

  checkForAlerts(metrics) {
    const alerts = [];

    if (metrics.heartRate) {
      if (metrics.heartRate > 120) {
        alerts.push({
          type: 'heart_rate_high',
          severity: 'warning',
          message: `Heart rate elevated: ${metrics.heartRate} bpm`,
          value: metrics.heartRate,
          threshold: 120
        });
      }
      if (metrics.heartRate > 150) {
        alerts.push({
          type: 'heart_rate_critical',
          severity: 'critical',
          message: `Heart rate critically high: ${metrics.heartRate} bpm`,
          value: metrics.heartRate,
          threshold: 150
        });
      }
      if (metrics.heartRate < 50) {
        alerts.push({
          type: 'heart_rate_low',
          severity: 'warning',
          message: `Heart rate low: ${metrics.heartRate} bpm`,
          value: metrics.heartRate,
          threshold: 50
        });
      }
    }

    if (metrics.oxygen && metrics.oxygen < 90) {
      alerts.push({
        type: 'oxygen_low',
        severity: 'critical',
        message: `Blood oxygen critically low: ${metrics.oxygen}%`,
        value: metrics.oxygen,
        threshold: 90
      });
    }

    if (metrics.glucose) {
      if (metrics.glucose.value < 70) {
        alerts.push({
          type: 'glucose_low',
          severity: 'critical',
          message: `Blood glucose critically low: ${metrics.glucose.value} mg/dL`,
          value: metrics.glucose.value,
          threshold: 70
        });
      }
      if (metrics.glucose.value > 250) {
        alerts.push({
          type: 'glucose_high',
          severity: 'warning',
          message: `Blood glucose high: ${metrics.glucose.value} mg/dL`,
          value: metrics.glucose.value,
          threshold: 250
        });
      }
    }

    if (metrics.bloodPressure) {
      if (metrics.bloodPressure.systolic > 180 || metrics.bloodPressure.diastolic > 120) {
        alerts.push({
          type: 'blood_pressure_critical',
          severity: 'critical',
          message: `Blood pressure critically high: ${metrics.bloodPressure.systolic}/${metrics.bloodPressure.diastolic} mmHg`,
          value: metrics.bloodPressure,
          threshold: { systolic: 180, diastolic: 120 }
        });
      }
    }

    if (metrics.temperature) {
      if (metrics.temperature.value > 38.5) {
        alerts.push({
          type: 'temperature_high',
          severity: 'warning',
          message: `Body temperature elevated: ${metrics.temperature.value}°C`,
          value: metrics.temperature.value,
          threshold: 38.5
        });
      }
    }

    return alerts;
  }
}

export default RookAdapter;
