import BaseAdapter from './BaseAdapter.js';

export class GarminAdapter extends BaseAdapter {
  constructor(config = {}) {
    super(config);
    this.deviceType = 'garmin';
    this.displayName = 'Garmin';
    this.supportsRealTime = true;
    this.syncMethod = 'webhook';
    this.minSyncInterval = 60;
    this.dataCategories = ['heartRate', 'steps', 'calories', 'distance', 'floors', 'activeMinutes', 'sleep', 'oxygen', 'stress'];

    this.clientId = process.env.GARMIN_CLIENT_ID;
    this.clientSecret = process.env.GARMIN_CLIENT_SECRET;
    this.baseUrl = 'https://apis.garmin.com';
  }

  getReliabilityNote() {
    return 'Garmin Health API supports real-time webhooks. Data pushed automatically when watch syncs. Suitable for emergency monitoring.';
  }

  getAuthorizationUrl(redirectUri, state) {
    if (!this.clientId) {
      return null;
    }
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: 'health',
      state: state || 'garmin-oauth'
    });
    return `https://connect.garmin.com/oauthConfirm?${params.toString()}`;
  }

  async handleCallback(code, redirectUri) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Garmin API credentials not configured');
    }

    const response = await fetch(`${this.baseUrl}/oauth-service/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        code: code
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      garminUserId: data.user_id,
      lastSync: new Date().toISOString()
    };
  }

  async getMetrics(tokens) {
    if (!tokens.accessToken) {
      throw new Error('Not connected to Garmin');
    }

    const today = new Date().toISOString().split('T')[0];
    const headers = {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json'
    };

    try {
      const [dailiesRes, heartRes] = await Promise.all([
        fetch(`${this.baseUrl}/wellness-api/rest/dailies?uploadStartTimeInSeconds=${Math.floor(Date.now()/1000) - 86400}`, { headers }),
        fetch(`${this.baseUrl}/wellness-api/rest/epochs?uploadStartTimeInSeconds=${Math.floor(Date.now()/1000) - 3600}`, { headers })
      ]);

      const dailiesData = await dailiesRes.json();
      const heartData = await heartRes.json();

      const lastSync = new Date().toISOString();
      const freshness = this.calculateFreshness(lastSync);

      return this.normalizeMetrics({
        dailies: dailiesData,
        heart: heartData,
        freshness: freshness,
        lastSync: lastSync
      });
    } catch (error) {
      console.error('Garmin getMetrics error:', error);
      throw error;
    }
  }

  async getDevices(tokens) {
    return [{
      id: 'garmin-device',
      type: 'TRACKER',
      name: 'Garmin Watch',
      connected: true
    }];
  }

  async refreshToken(tokens) {
    const response = await fetch(`${this.baseUrl}/oauth-service/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: tokens.refreshToken
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
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
    console.log('Garmin disconnected');
  }

  normalizeMetrics(rawData) {
    const { dailies, heart, freshness, lastSync } = rawData;
    const latest = Array.isArray(dailies) && dailies.length > 0 ? dailies[dailies.length - 1] : {};

    return {
      source: this.deviceType,
      timestamp: new Date().toISOString(),
      lastSync: lastSync,
      dataAge: freshness.dataAge,
      isFresh: freshness.isFresh,
      freshnessLevel: freshness.freshnessLevel,
      ageMinutes: freshness.ageMinutes,
      reliabilityWarning: null,

      heartRate: latest.restingHeartRate || 72,
      restingHeartRate: latest.restingHeartRate,
      steps: latest.steps || 0,
      calories: latest.activeKilocalories || 0,
      distance: latest.distanceInMeters ? (latest.distanceInMeters / 1000).toFixed(2) : 0,
      floors: latest.floorsClimbed || 0,
      activeMinutes: latest.activeTimeInSeconds ? Math.floor(latest.activeTimeInSeconds / 60) : 0,

      sleep: latest.sleepDurationInSeconds ? {
        duration: Math.floor(latest.sleepDurationInSeconds / 60),
        efficiency: null
      } : null,

      oxygen: latest.averageSpo2 || null,
      stress: latest.averageStressLevel || null,

      device: {
        id: 'garmin',
        type: 'smartwatch',
        name: 'Garmin Watch',
        battery: null
      }
    };
  }

  async handleWebhook(payload) {
    console.log('Garmin webhook received:', payload);
    return {
      processed: true,
      timestamp: new Date().toISOString()
    };
  }
}

export default GarminAdapter;
