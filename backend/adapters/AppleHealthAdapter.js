import BaseAdapter from './BaseAdapter.js';

export class AppleHealthAdapter extends BaseAdapter {
  constructor(config = {}) {
    super(config);
    this.deviceType = 'apple';
    this.displayName = 'Apple Watch';
    this.supportsRealTime = true;
    this.syncMethod = 'push';
    this.minSyncInterval = 60;
    this.dataCategories = ['heartRate', 'steps', 'calories', 'distance', 'floors', 'activeMinutes', 'sleep', 'oxygen', 'ecg'];
  }

  getReliabilityNote() {
    return 'Apple Watch streams health data to iPhone in real-time. Requires companion iOS app for integration. Suitable for emergency monitoring.';
  }

  getAuthorizationUrl(redirectUri, state) {
    return null;
  }

  async handleCallback(code, redirectUri) {
    throw new Error('Apple Health requires native iOS app integration. Web OAuth not available.');
  }

  async getMetrics(tokens) {
    throw new Error('Apple Health requires native iOS app to access HealthKit data.');
  }

  async getDevices(tokens) {
    throw new Error('Apple Health requires native iOS app integration.');
  }

  async refreshToken(tokens) {
    throw new Error('Apple Health uses HealthKit permissions, not OAuth tokens.');
  }

  async disconnect(tokens) {
    console.log('Apple Health disconnected');
  }

  normalizeMetrics(rawData) {
    return {
      source: this.deviceType,
      timestamp: new Date().toISOString(),
      lastSync: null,
      dataAge: null,
      isFresh: false,
      freshnessLevel: 'unknown',
      reliabilityWarning: 'Apple Health requires iOS companion app',

      heartRate: null,
      restingHeartRate: null,
      steps: 0,
      calories: 0,
      distance: 0,
      floors: 0,
      activeMinutes: 0,
      sleep: null,
      oxygen: null,

      device: null
    };
  }

  getIntegrationRequirements() {
    return {
      platform: 'iOS',
      requirements: [
        'Native iOS companion app required',
        'Must use HealthKit framework',
        'User grants permissions in iOS Health app',
        'Data accessible only on-device, not via web API'
      ],
      alternatives: [
        'Build native iOS app with HealthKit',
        'Use third-party services like Terra API or Tryvital'
      ]
    };
  }
}

export default AppleHealthAdapter;
