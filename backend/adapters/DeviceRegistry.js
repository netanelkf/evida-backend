import FitbitAdapter from './FitbitAdapter.js';
import GarminAdapter from './GarminAdapter.js';
import AppleHealthAdapter from './AppleHealthAdapter.js';
import RookAdapter from './RookAdapter.js';

const ROOK_INTEGRATION = {
  id: 'rook',
  name: 'ROOK',
  description: 'Connect 400+ wearables with one integration',
  supportedDevices: 400,
  website: 'https://tryrook.io',
  documentation: 'https://docs.tryrook.io',
  compliance: ['HIPAA', 'GDPR', 'BAA Available'],
  features: [
    'Real-time webhooks',
    'Heart rate events',
    'Blood glucose (CGM)',
    'Blood pressure',
    'Body temperature',
    'Sleep analysis',
    'ROOK Score',
    'Unified data format'
  ],
  dataPillars: {
    physical: ['heartRate', 'steps', 'calories', 'distance', 'hrv', 'stress', 'oxygen'],
    sleep: ['duration', 'efficiency', 'stages', 'respiratory'],
    body: ['glucose', 'bloodPressure', 'temperature', 'weight', 'hydration']
  },
  supportedCategories: [
    { id: 'smartwatches', name: 'Smartwatches', examples: ['Apple Watch', 'Garmin', 'Samsung', 'WHOOP', 'Oura'] },
    { id: 'fitness_trackers', name: 'Fitness Trackers', examples: ['Fitbit bands', 'Mi Band', 'Honor Band'] },
    { id: 'cgm', name: 'Glucose Monitors', examples: ['Dexcom G7', 'FreeStyle Libre 3'], realTime: true },
    { id: 'blood_pressure', name: 'Blood Pressure', examples: ['Withings BPM', 'Omron'] },
    { id: 'health_platforms', name: 'Health Platforms', examples: ['Apple Health', 'Health Connect', 'Samsung Health'] }
  ],
  pricing: 'Contact ROOK for pricing',
  isConfigured: () => !!(process.env.ROOK_CLIENT_UUID && process.env.ROOK_CLIENT_SECRET),
  requiredSecrets: ['ROOK_CLIENT_UUID', 'ROOK_CLIENT_SECRET']
};

const ALL_WEARABLE_BRANDS = [
  {
    type: 'garmin',
    displayName: 'Garmin',
    brand: 'Garmin',
    logo: '⌚',
    supportsRealTime: true,
    syncMethod: 'webhook-push',
    emergencySuitable: true,
    status: 'available',
    apiRequired: true,
    popularModels: ['Forerunner', 'Fenix', 'Venu', 'Vivoactive', 'Instinct'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'stress', 'oxygen', 'respiration'],
    reliabilityNote: 'Data pushed automatically via webhooks. Excellent for emergency monitoring.',
    integrationMethod: 'direct'
  },
  {
    type: 'apple',
    displayName: 'Apple Watch',
    brand: 'Apple',
    logo: '🍎',
    supportsRealTime: true,
    syncMethod: 'healthkit',
    emergencySuitable: true,
    status: 'available',
    apiRequired: false,
    requiresApp: true,
    popularModels: ['Apple Watch Series 9', 'Apple Watch Ultra', 'Apple Watch SE'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'oxygen', 'ecg', 'fallDetection'],
    reliabilityNote: 'Real-time via iOS HealthKit. Requires iOS companion app.',
    integrationMethod: 'native-app'
  },
  {
    type: 'fitbit',
    displayName: 'Fitbit',
    brand: 'Fitbit/Google',
    logo: '💜',
    supportsRealTime: false,
    syncMethod: 'phone-sync',
    emergencySuitable: false,
    status: 'available',
    apiRequired: true,
    popularModels: ['Sense 2', 'Versa 4', 'Charge 6', 'Inspire 3', 'Luxe'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'floors', 'activeMinutes', 'sleep'],
    reliabilityNote: 'Data only syncs when user opens Fitbit app. NOT suitable for emergency monitoring.',
    integrationMethod: 'direct'
  },
  {
    type: 'samsung',
    displayName: 'Samsung Galaxy Watch',
    brand: 'Samsung',
    logo: '🔵',
    supportsRealTime: true,
    syncMethod: 'samsung-health',
    emergencySuitable: true,
    status: 'coming-soon',
    apiRequired: true,
    requiresApp: true,
    popularModels: ['Galaxy Watch 6', 'Galaxy Watch 5', 'Galaxy Watch FE'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'oxygen', 'bodyComposition'],
    reliabilityNote: 'Real-time via Samsung Health. Requires Android companion app.',
    integrationMethod: 'direct'
  },
  {
    type: 'xiaomi',
    displayName: 'Xiaomi Mi Band / Watch',
    brand: 'Xiaomi',
    logo: '🟠',
    supportsRealTime: false,
    syncMethod: 'zepp-sync',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['Mi Band 8', 'Xiaomi Watch 2', 'Redmi Watch 4'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'oxygen'],
    reliabilityNote: 'Syncs through Zepp Life app. Limited API availability.',
    integrationMethod: 'aggregator'
  },
  {
    type: 'amazfit',
    displayName: 'Amazfit',
    brand: 'Zepp/Amazfit',
    logo: '🟢',
    supportsRealTime: false,
    syncMethod: 'zepp-sync',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['GTR 4', 'GTS 4', 'T-Rex Ultra', 'Bip 5', 'Balance'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'oxygen', 'stress'],
    reliabilityNote: 'Syncs through Zepp app. Data may be delayed.',
    integrationMethod: 'aggregator'
  },
  {
    type: 'huawei',
    displayName: 'Huawei Watch',
    brand: 'Huawei',
    logo: '🔴',
    supportsRealTime: false,
    syncMethod: 'huawei-health',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['Watch GT 4', 'Watch 4 Pro', 'Watch Fit 3', 'Band 8'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'oxygen', 'stress'],
    reliabilityNote: 'Syncs through Huawei Health. Region-restricted API.',
    integrationMethod: 'aggregator'
  },
  {
    type: 'withings',
    displayName: 'Withings',
    brand: 'Withings',
    logo: '⚪',
    supportsRealTime: false,
    syncMethod: 'cloud-sync',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['ScanWatch 2', 'Steel HR', 'Move ECG'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'oxygen', 'ecg', 'temperature'],
    reliabilityNote: 'Medical-grade sensors. Cloud sync with good API.',
    integrationMethod: 'direct'
  },
  {
    type: 'polar',
    displayName: 'Polar',
    brand: 'Polar',
    logo: '❄️',
    supportsRealTime: false,
    syncMethod: 'polar-flow',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['Vantage V3', 'Grit X2', 'Pacer Pro', 'Ignite 3'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'hrv', 'training'],
    reliabilityNote: 'Excellent heart rate accuracy. Syncs through Polar Flow.',
    integrationMethod: 'direct'
  },
  {
    type: 'oura',
    displayName: 'Oura Ring',
    brand: 'Oura',
    logo: '💍',
    supportsRealTime: false,
    syncMethod: 'cloud-sync',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['Oura Ring Gen 3'],
    dataCategories: ['heartRate', 'sleep', 'hrv', 'temperature', 'activity', 'readiness'],
    reliabilityNote: 'Excellent sleep and recovery tracking. Cloud API available.',
    integrationMethod: 'direct'
  },
  {
    type: 'whoop',
    displayName: 'WHOOP',
    brand: 'WHOOP',
    logo: '🏋️',
    supportsRealTime: true,
    syncMethod: 'continuous',
    emergencySuitable: true,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['WHOOP 4.0'],
    dataCategories: ['heartRate', 'hrv', 'sleep', 'strain', 'recovery', 'respiratory'],
    reliabilityNote: 'Continuous monitoring with real-time data. Great for athletes.',
    integrationMethod: 'direct'
  },
  {
    type: 'suunto',
    displayName: 'Suunto',
    brand: 'Suunto',
    logo: '🏔️',
    supportsRealTime: false,
    syncMethod: 'cloud-sync',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['Suunto 9 Peak', 'Suunto Vertical', 'Suunto Race'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'altitude'],
    reliabilityNote: 'Built for outdoor sports. Cloud sync available.',
    integrationMethod: 'direct'
  },
  {
    type: 'coros',
    displayName: 'COROS',
    brand: 'COROS',
    logo: '🏃',
    supportsRealTime: false,
    syncMethod: 'cloud-sync',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['COROS APEX 2', 'COROS VERTIX 2', 'COROS PACE 3'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'training'],
    reliabilityNote: 'Popular with runners. Cloud API in development.',
    integrationMethod: 'aggregator'
  },
  {
    type: 'fossil',
    displayName: 'Fossil / Wear OS',
    brand: 'Fossil Group',
    logo: '⌚',
    supportsRealTime: false,
    syncMethod: 'health-connect',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: false,
    popularModels: ['Fossil Gen 6', 'Michael Kors', 'Skagen', 'Diesel'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep'],
    reliabilityNote: 'Uses Android Health Connect. Data syncs through Google.',
    integrationMethod: 'health-connect'
  },
  {
    type: 'google-pixel',
    displayName: 'Google Pixel Watch',
    brand: 'Google',
    logo: '🔷',
    supportsRealTime: false,
    syncMethod: 'health-connect',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: false,
    popularModels: ['Pixel Watch 2', 'Pixel Watch'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'ecg'],
    reliabilityNote: 'Uses Fitbit sensors. Syncs through Health Connect.',
    integrationMethod: 'health-connect'
  },
  {
    type: 'honor',
    displayName: 'Honor',
    brand: 'Honor',
    logo: '🟡',
    supportsRealTime: false,
    syncMethod: 'cloud-sync',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['Honor Watch 4', 'Honor Band 7'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'oxygen'],
    reliabilityNote: 'Syncs through Honor Health app.',
    integrationMethod: 'aggregator'
  },
  {
    type: 'oppo',
    displayName: 'OPPO Watch',
    brand: 'OPPO',
    logo: '🟢',
    supportsRealTime: false,
    syncMethod: 'health-connect',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: false,
    popularModels: ['OPPO Watch 4 Pro', 'OPPO Band 2'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'oxygen'],
    reliabilityNote: 'Wear OS based. Uses Health Connect.',
    integrationMethod: 'health-connect'
  },
  {
    type: 'oneplus',
    displayName: 'OnePlus Watch',
    brand: 'OnePlus',
    logo: '🔴',
    supportsRealTime: false,
    syncMethod: 'health-connect',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: false,
    popularModels: ['OnePlus Watch 2'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'oxygen'],
    reliabilityNote: 'Wear OS based. Uses Health Connect.',
    integrationMethod: 'health-connect'
  },
  {
    type: 'mobvoi',
    displayName: 'TicWatch / Mobvoi',
    brand: 'Mobvoi',
    logo: '⚫',
    supportsRealTime: false,
    syncMethod: 'health-connect',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: false,
    popularModels: ['TicWatch Pro 5', 'TicWatch E3'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'oxygen'],
    reliabilityNote: 'Wear OS based. Uses Health Connect.',
    integrationMethod: 'health-connect'
  },
  {
    type: 'realme',
    displayName: 'Realme',
    brand: 'Realme',
    logo: '🟡',
    supportsRealTime: false,
    syncMethod: 'cloud-sync',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['Realme Watch 3 Pro', 'Realme Band 2'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'oxygen'],
    reliabilityNote: 'Budget-friendly. Syncs through Realme Link.',
    integrationMethod: 'aggregator'
  },
  {
    type: 'noise',
    displayName: 'Noise',
    brand: 'Noise',
    logo: '🟣',
    supportsRealTime: false,
    syncMethod: 'cloud-sync',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['NoiseFit Evolve', 'ColorFit Pro'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep', 'oxygen'],
    reliabilityNote: 'Popular in India. Limited API.',
    integrationMethod: 'aggregator'
  },
  {
    type: 'boatwatches',
    displayName: 'boAt',
    brand: 'boAt',
    logo: '🚢',
    supportsRealTime: false,
    syncMethod: 'cloud-sync',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['Wave Lite', 'Storm Pro'],
    dataCategories: ['heartRate', 'steps', 'calories', 'distance', 'sleep'],
    reliabilityNote: 'Popular in India. Limited API.',
    integrationMethod: 'aggregator'
  },
  {
    type: 'dexcom',
    displayName: 'Dexcom CGM',
    brand: 'Dexcom',
    logo: '💉',
    supportsRealTime: true,
    syncMethod: 'continuous',
    emergencySuitable: true,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['Dexcom G7', 'Dexcom G6'],
    dataCategories: ['glucose'],
    reliabilityNote: 'Continuous glucose monitoring. Critical for diabetics.',
    integrationMethod: 'direct'
  },
  {
    type: 'freestyle',
    displayName: 'FreeStyle Libre',
    brand: 'Abbott',
    logo: '💉',
    supportsRealTime: true,
    syncMethod: 'continuous',
    emergencySuitable: true,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['Libre 3', 'Libre 2'],
    dataCategories: ['glucose'],
    reliabilityNote: 'Continuous glucose monitoring. Flash-based.',
    integrationMethod: 'direct'
  },
  {
    type: 'biostrap',
    displayName: 'Biostrap',
    brand: 'Biostrap',
    logo: '📊',
    supportsRealTime: false,
    syncMethod: 'cloud-sync',
    emergencySuitable: false,
    status: 'coming-soon',
    apiRequired: true,
    popularModels: ['Biostrap EVO'],
    dataCategories: ['heartRate', 'hrv', 'sleep', 'oxygen', 'respiratory'],
    reliabilityNote: 'Clinical-grade biometrics. Research-focused.',
    integrationMethod: 'direct'
  },
  {
    type: 'manual',
    displayName: 'Manual Entry',
    brand: 'Any Device',
    logo: '✏️',
    supportsRealTime: false,
    syncMethod: 'manual',
    emergencySuitable: false,
    status: 'available',
    apiRequired: false,
    popularModels: ['Any wearable not listed'],
    dataCategories: ['heartRate', 'steps', 'oxygen', 'bloodPressure'],
    reliabilityNote: 'Manually enter readings from any device. For supplemental tracking only.',
    integrationMethod: 'manual'
  }
];

const AGGREGATOR_SERVICES = [
  {
    id: 'terra',
    name: 'Terra API',
    description: 'Connect 100+ devices with one integration',
    supportedDevices: 100,
    website: 'https://tryterra.co',
    pricing: 'Contact for pricing',
    compliance: ['HIPAA', 'GDPR', 'SOC 2'],
    features: ['Webhooks', 'REST API', 'Data normalization', 'Pre-built auth widget']
  },
  {
    id: 'rook',
    name: 'ROOK',
    description: 'API for wearable and health data integration',
    supportedDevices: 400,
    website: 'https://tryrook.io',
    compliance: ['HIPAA', 'GDPR'],
    features: ['Real-time webhooks', 'Connection UI', 'Health scores']
  },
  {
    id: 'thryve',
    name: 'Thryve',
    description: 'EU-based wearable API (GDPR-focused)',
    supportedDevices: 500,
    website: 'https://thryve.health',
    compliance: ['GDPR', 'HIPAA', 'ISO'],
    features: ['100% EU infrastructure', 'Auto deduplication', 'Health Connect ready']
  }
];

class DeviceRegistry {
  constructor() {
    this.adapters = new Map();
    this.registerDefaultAdapters();
  }

  registerDefaultAdapters() {
    this.register('fitbit', FitbitAdapter);
    this.register('garmin', GarminAdapter);
    this.register('apple', AppleHealthAdapter);
  }

  register(type, AdapterClass) {
    this.adapters.set(type, AdapterClass);
  }

  getAdapter(type, config = {}) {
    const AdapterClass = this.adapters.get(type);
    if (!AdapterClass) {
      throw new Error(`Unknown device type: ${type}`);
    }
    return new AdapterClass(config);
  }

  getAllBrands() {
    return ALL_WEARABLE_BRANDS;
  }

  getAggregatorServices() {
    return AGGREGATOR_SERVICES;
  }

  getSupportedDevices() {
    return ALL_WEARABLE_BRANDS.map(device => ({
      ...device,
      isConfigured: this.isConfigured(device.type),
      hasAdapter: this.adapters.has(device.type)
    })).sort((a, b) => {
      const statusOrder = { 'available': 0, 'coming-soon': 1 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      if (a.supportsRealTime && !b.supportsRealTime) return -1;
      if (!a.supportsRealTime && b.supportsRealTime) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }

  getAvailableDevices() {
    return this.getSupportedDevices().filter(d => d.status === 'available');
  }

  getComingSoonDevices() {
    return this.getSupportedDevices().filter(d => d.status === 'coming-soon');
  }

  getRealTimeDevices() {
    return this.getSupportedDevices().filter(d => d.supportsRealTime && d.emergencySuitable);
  }

  isConfigured(type) {
    switch (type) {
      case 'fitbit':
        return !!(process.env.FITBIT_CLIENT_ID && process.env.FITBIT_CLIENT_SECRET);
      case 'garmin':
        return !!(process.env.GARMIN_CLIENT_ID && process.env.GARMIN_CLIENT_SECRET);
      case 'apple':
        return false;
      case 'samsung':
        return !!(process.env.SAMSUNG_CLIENT_ID && process.env.SAMSUNG_CLIENT_SECRET);
      case 'withings':
        return !!(process.env.WITHINGS_CLIENT_ID && process.env.WITHINGS_CLIENT_SECRET);
      case 'polar':
        return !!(process.env.POLAR_CLIENT_ID && process.env.POLAR_CLIENT_SECRET);
      case 'oura':
        return !!(process.env.OURA_CLIENT_ID && process.env.OURA_CLIENT_SECRET);
      case 'whoop':
        return !!(process.env.WHOOP_CLIENT_ID && process.env.WHOOP_CLIENT_SECRET);
      case 'manual':
        return true;
      default:
        return false;
    }
  }

  getConfigurationStatus() {
    const status = {};
    for (const device of ALL_WEARABLE_BRANDS) {
      status[device.type] = {
        configured: this.isConfigured(device.type),
        status: device.status,
        apiRequired: device.apiRequired,
        integrationMethod: device.integrationMethod,
        requiredSecrets: this.getRequiredSecrets(device.type)
      };
    }
    return status;
  }

  getRequiredSecrets(type) {
    const secretMap = {
      'fitbit': ['FITBIT_CLIENT_ID', 'FITBIT_CLIENT_SECRET'],
      'garmin': ['GARMIN_CLIENT_ID', 'GARMIN_CLIENT_SECRET'],
      'samsung': ['SAMSUNG_CLIENT_ID', 'SAMSUNG_CLIENT_SECRET'],
      'withings': ['WITHINGS_CLIENT_ID', 'WITHINGS_CLIENT_SECRET'],
      'polar': ['POLAR_CLIENT_ID', 'POLAR_CLIENT_SECRET'],
      'oura': ['OURA_CLIENT_ID', 'OURA_CLIENT_SECRET'],
      'whoop': ['WHOOP_CLIENT_ID', 'WHOOP_CLIENT_SECRET'],
      'dexcom': ['DEXCOM_CLIENT_ID', 'DEXCOM_CLIENT_SECRET'],
      'terra': ['TERRA_API_KEY', 'TERRA_DEV_ID', 'TERRA_SECRET'],
      'rook': ['ROOK_CLIENT_UUID', 'ROOK_CLIENT_SECRET'],
    };
    return secretMap[type] || [];
  }

  getIntegrationOptions() {
    return {
      rook: {
        description: 'ROOK - Connect 400+ devices with one integration (RECOMMENDED)',
        pros: ['400+ devices supported', 'Real-time webhooks', 'HIPAA/GDPR compliant', 'CGM & blood pressure support', 'Unified data format'],
        cons: ['Requires ROOK subscription'],
        recommended: true,
        info: ROOK_INTEGRATION
      },
      direct: {
        description: 'Connect directly to device API',
        pros: ['Full control', 'No third-party fees', 'Direct data access'],
        cons: ['Requires API registration per brand', 'More development work']
      },
      aggregator: {
        description: 'Use a single API to connect many devices',
        pros: ['One integration = 100+ devices', 'Normalized data', 'Less maintenance'],
        cons: ['Monthly fees', 'Data passes through third party'],
        recommended: AGGREGATOR_SERVICES
      },
      healthConnect: {
        description: 'Android Health Connect (replaces Google Fit)',
        pros: ['Free', 'Supports many Android devices', 'Native Android integration'],
        cons: ['Android only', 'Requires mobile app', '30-day data limit']
      },
      manual: {
        description: 'User manually enters readings',
        pros: ['Works with any device', 'No API needed'],
        cons: ['Not real-time', 'User effort required', 'Not suitable for emergencies']
      }
    };
  }

  getRookIntegration() {
    return {
      ...ROOK_INTEGRATION,
      isConfigured: ROOK_INTEGRATION.isConfigured()
    };
  }

  isRookConfigured() {
    return ROOK_INTEGRATION.isConfigured();
  }

  getRookAdapter() {
    return new RookAdapter();
  }
}

export const deviceRegistry = new DeviceRegistry();
export default DeviceRegistry;
