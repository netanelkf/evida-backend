export class BaseAdapter {
  constructor(config = {}) {
    this.deviceType = 'unknown';
    this.displayName = 'Unknown Device';
    this.supportsRealTime = false;
    this.syncMethod = 'polling';
    this.minSyncInterval = 300;
    this.dataCategories = ['heartRate', 'steps', 'calories'];
    this.config = config;
  }

  getDeviceInfo() {
    return {
      type: this.deviceType,
      displayName: this.displayName,
      supportsRealTime: this.supportsRealTime,
      syncMethod: this.syncMethod,
      minSyncInterval: this.minSyncInterval,
      dataCategories: this.dataCategories,
      reliabilityNote: this.getReliabilityNote()
    };
  }

  getReliabilityNote() {
    if (this.supportsRealTime) {
      return 'Real-time data - suitable for emergency monitoring';
    } else if (this.syncMethod === 'phone-sync') {
      return 'Data depends on phone app sync - may be delayed';
    } else {
      return 'Periodic sync - check last update time';
    }
  }

  async getAuthorizationUrl(redirectUri, state) {
    throw new Error('getAuthorizationUrl must be implemented');
  }

  async handleCallback(code, redirectUri) {
    throw new Error('handleCallback must be implemented');
  }

  async getMetrics(tokens) {
    throw new Error('getMetrics must be implemented');
  }

  async getDevices(tokens) {
    throw new Error('getDevices must be implemented');
  }

  async refreshToken(tokens) {
    throw new Error('refreshToken must be implemented');
  }

  async disconnect(tokens) {
    throw new Error('disconnect must be implemented');
  }

  normalizeMetrics(rawData) {
    return {
      source: this.deviceType,
      timestamp: new Date().toISOString(),
      lastSync: null,
      dataAge: null,
      isFresh: false,
      freshnessLevel: 'unknown',
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

  calculateFreshness(lastSyncTime) {
    if (!lastSyncTime) {
      return { isFresh: false, freshnessLevel: 'unknown', dataAge: null };
    }

    const syncDate = new Date(lastSyncTime);
    const now = new Date();
    const ageMs = now - syncDate;
    const ageMinutes = Math.floor(ageMs / 60000);
    const ageHours = Math.floor(ageMinutes / 60);
    const ageDays = Math.floor(ageHours / 24);

    let freshnessLevel, isFresh;

    if (ageMinutes < 5) {
      freshnessLevel = 'live';
      isFresh = true;
    } else if (ageMinutes < 30) {
      freshnessLevel = 'recent';
      isFresh = true;
    } else if (ageHours < 1) {
      freshnessLevel = 'acceptable';
      isFresh = true;
    } else if (ageHours < 6) {
      freshnessLevel = 'delayed';
      isFresh = false;
    } else if (ageDays < 1) {
      freshnessLevel = 'stale';
      isFresh = false;
    } else {
      freshnessLevel = 'outdated';
      isFresh = false;
    }

    let dataAgeText;
    if (ageMinutes < 1) {
      dataAgeText = 'Just now';
    } else if (ageMinutes < 60) {
      dataAgeText = `${ageMinutes} min ago`;
    } else if (ageHours < 24) {
      dataAgeText = `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`;
    } else {
      dataAgeText = `${ageDays} day${ageDays > 1 ? 's' : ''} ago`;
    }

    return {
      isFresh,
      freshnessLevel,
      dataAge: dataAgeText,
      ageMinutes,
      ageHours,
      ageDays,
      lastSyncTime: syncDate.toISOString()
    };
  }
}

export default BaseAdapter;
