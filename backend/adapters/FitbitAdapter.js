import BaseAdapter from './BaseAdapter.js';

export class FitbitAdapter extends BaseAdapter {
  constructor(config = {}) {
    super(config);
    this.deviceType = 'fitbit';
    this.displayName = 'Fitbit';
    this.supportsRealTime = false;
    this.syncMethod = 'phone-sync';
    this.minSyncInterval = 900;
    this.dataCategories = ['heartRate', 'steps', 'calories', 'distance', 'floors', 'activeMinutes', 'sleep'];

    this.clientId = process.env.FITBIT_CLIENT_ID;
    this.clientSecret = process.env.FITBIT_CLIENT_SECRET;
    this.baseUrl = 'https://api.fitbit.com';
  }

  getReliabilityNote() {
    return 'Data syncs from watch to phone app, then to cloud. Updates depend on user opening Fitbit app. NOT suitable for real-time emergency monitoring.';
  }

  getAuthorizationUrl(redirectUri, state) {
    const scope = 'activity heartrate sleep profile settings';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: scope,
      state: state || 'fitbit-oauth'
    });
    return `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
  }

  async handleCallback(code, redirectUri) {
    const response = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code
      })
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      fitbitUserId: data.user_id,
      lastSync: new Date().toISOString()
    };
  }

  async getMetrics(tokens) {
    const today = new Date().toISOString().split('T')[0];
    const headers = { 'Authorization': `Bearer ${tokens.accessToken}` };

    try {
      const [activityRes, heartRes, sleepRes, devicesRes] = await Promise.all([
        fetch(`${this.baseUrl}/1/user/-/activities/date/${today}.json`, { headers }),
        fetch(`${this.baseUrl}/1/user/-/activities/heart/date/${today}/1d.json`, { headers }),
        fetch(`${this.baseUrl}/1.2/user/-/sleep/date/${today}.json`, { headers }),
        fetch(`${this.baseUrl}/1/user/-/devices.json`, { headers })
      ]);

      const [activityData, heartData, sleepData, devicesData] = await Promise.all([
        activityRes.json(),
        heartRes.json(),
        sleepRes.json(),
        devicesRes.json()
      ]);

      if (activityData.errors || heartData.errors) {
        const error = activityData.errors?.[0] || heartData.errors?.[0];
        throw new Error(error.message);
      }

      const device = Array.isArray(devicesData) && devicesData.length > 0 ? devicesData[0] : null;
      const deviceLastSync = device?.lastSyncTime;
      const freshness = this.calculateFreshness(deviceLastSync);

      const restingHR = heartData['activities-heart']?.[0]?.value?.restingHeartRate;
      const heartRateZones = heartData['activities-heart']?.[0]?.value?.heartRateZones || [];

      const sleepSummary = sleepData.summary || {};

      return this.normalizeMetrics({
        activity: activityData,
        heart: heartData,
        sleep: sleepData,
        device: device,
        freshness: freshness,
        restingHeartRate: restingHR,
        heartRateZones: heartRateZones,
        sleepSummary: sleepSummary
      });
    } catch (error) {
      console.error('Fitbit getMetrics error:', error);
      throw error;
    }
  }

  async getDevices(tokens) {
    const headers = { 'Authorization': `Bearer ${tokens.accessToken}` };
    const response = await fetch(`${this.baseUrl}/1/user/-/devices.json`, { headers });
    const devices = await response.json();

    if (devices.errors) {
      throw new Error(devices.errors[0].message);
    }

    return devices.map(device => ({
      id: device.id,
      type: device.type,
      deviceVersion: device.deviceVersion,
      battery: device.battery,
      batteryLevel: device.batteryLevel,
      lastSyncTime: device.lastSyncTime,
      mac: device.mac,
      features: device.features || []
    }));
  }

  async refreshToken(tokens) {
    const response = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken
      })
    });

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    return {
      ...tokens,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      lastSync: new Date().toISOString()
    };
  }

  async disconnect(tokens) {
    try {
      await fetch(`${this.baseUrl}/oauth2/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ token: tokens.accessToken })
      });
    } catch (error) {
      console.error('Fitbit disconnect error:', error);
    }
  }

  normalizeMetrics(rawData) {
    const { activity, heart, sleep, device, freshness, restingHeartRate, sleepSummary } = rawData;
    const summary = activity.summary || {};

    return {
      source: this.deviceType,
      timestamp: new Date().toISOString(),
      lastSync: freshness.lastSyncTime,
      dataAge: freshness.dataAge,
      isFresh: freshness.isFresh,
      freshnessLevel: freshness.freshnessLevel,
      ageMinutes: freshness.ageMinutes,
      reliabilityWarning: !freshness.isFresh ? this.getStaleDataWarning(freshness) : null,

      heartRate: restingHeartRate || 72,
      restingHeartRate: restingHeartRate,
      steps: summary.steps || 0,
      calories: summary.caloriesOut || 0,
      distance: summary.distances?.find(d => d.activity === 'total')?.distance || 0,
      floors: summary.floors || 0,
      activeMinutes: (summary.fairlyActiveMinutes || 0) + (summary.veryActiveMinutes || 0),

      sleep: sleepSummary.totalMinutesAsleep ? {
        duration: sleepSummary.totalMinutesAsleep,
        efficiency: sleepSummary.efficiency || null
      } : null,

      oxygen: null,

      device: device ? {
        id: device.id,
        type: device.type,
        name: device.deviceVersion,
        battery: device.battery,
        batteryLevel: device.batteryLevel
      } : null
    };
  }

  getStaleDataWarning(freshness) {
    if (freshness.ageDays >= 1) {
      return `Data is ${freshness.dataAge} old. Ask user to open Fitbit app to sync watch.`;
    } else if (freshness.ageHours >= 6) {
      return `Data is ${freshness.dataAge} old. May not reflect current status.`;
    } else {
      return `Data last updated ${freshness.dataAge}.`;
    }
  }
}

export default FitbitAdapter;
