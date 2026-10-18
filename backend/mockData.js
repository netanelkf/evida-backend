// Mock Data Generator for eVida Medical Emergency Platform
// This file provides realistic mock data for health metrics, alerts, devices, and users

export const mockUsers = [
  { id: 1, username: 'user1', password: 'password123', name: 'John Smith', email: 'john@example.com' },
  { id: 2, username: 'user2', password: 'password123', name: 'Jane Doe', email: 'jane@example.com' },
  { id: 3, username: 'demo', password: 'demo', name: 'Demo User', email: 'demo@evida.com' }
];

export const mockDispatchUsers = [
  { id: 1, username: 'dispatch1', password: 'dispatch123', name: 'Dispatch Operator 1', center: 'Central Station' },
  { id: 2, username: 'admin', password: 'admin123', name: 'Admin User', center: 'Main HQ' }
];

// Generate random health metrics
export function generateMetrics() {
  return {
    heartRate: Math.floor(Math.random() * 40) + 60, // 60-100 bpm
    oxygenLevel: Math.floor(Math.random() * 5) + 95, // 95-100%
    steps: Math.floor(Math.random() * 5000) + 3000, // 3000-8000 steps
    bloodPressure: {
      systolic: Math.floor(Math.random() * 30) + 110, // 110-140
      diastolic: Math.floor(Math.random() * 20) + 70  // 70-90
    },
    temperature: (Math.random() * 1.5 + 36.5).toFixed(1), // 36.5-38°C
    calories: Math.floor(Math.random() * 500) + 1500, // 1500-2000
    sleepHours: (Math.random() * 3 + 5).toFixed(1), // 5-8 hours
    lastUpdated: new Date().toISOString()
  };
}

// Generate mock alerts
export function generateAlerts() {
  const alertTypes = [
    { type: 'high_heart_rate', message: 'Heart rate exceeded 100 bpm', severity: 'warning' },
    { type: 'low_heart_rate', message: 'Heart rate dropped below 50 bpm', severity: 'critical' },
    { type: 'fall_detected', message: 'Possible fall detected', severity: 'critical' },
    { type: 'low_oxygen', message: 'Blood oxygen level below 92%', severity: 'warning' },
    { type: 'irregular_rhythm', message: 'Irregular heart rhythm detected', severity: 'warning' },
    { type: 'high_bp', message: 'Blood pressure elevated (150/95)', severity: 'warning' },
    { type: 'inactivity', message: 'No movement detected for 2 hours', severity: 'info' }
  ];

  const alerts = [];
  const numAlerts = Math.floor(Math.random() * 5) + 2; // 2-6 alerts

  for (let i = 0; i < numAlerts; i++) {
    const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const hoursAgo = Math.floor(Math.random() * 72); // Within last 72 hours
    alerts.push({
      id: i + 1,
      ...alert,
      timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
      acknowledged: Math.random() > 0.5
    });
  }

  return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Generate historical data (last 7 days)
export function generateHistory() {
  const history = [];
  const now = Date.now();

  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour += 4) { // Every 4 hours
      const timestamp = new Date(now - (day * 24 + hour) * 60 * 60 * 1000);
      history.push({
        timestamp: timestamp.toISOString(),
        date: timestamp.toLocaleDateString(),
        time: timestamp.toLocaleTimeString(),
        heartRate: Math.floor(Math.random() * 40) + 60,
        oxygenLevel: Math.floor(Math.random() * 5) + 95,
        steps: Math.floor(Math.random() * 2000) + 500,
        bloodPressure: `${Math.floor(Math.random() * 30) + 110}/${Math.floor(Math.random() * 20) + 70}`
      });
    }
  }

  return history;
}

// Mock connected devices
export const mockDevices = [
  { id: 1, type: 'apple_watch', name: 'Apple Watch Series 9', connected: true, battery: 78, lastSync: new Date().toISOString() },
  { id: 2, type: 'fitbit', name: 'Fitbit (Connect to see model)', connected: false, battery: null, lastSync: null },
  { id: 3, type: 'garmin', name: 'Garmin Venu 3', connected: false, battery: 92, lastSync: new Date(Date.now() - 172800000).toISOString() }
];

// Mock sharing settings
export const mockShareSettings = {
  trustedContacts: [
    { id: 1, name: 'Mary Smith', relationship: 'Spouse', phone: '+1-555-0101', email: 'mary@example.com', canReceiveAlerts: true },
    { id: 2, name: 'Dr. Johnson', relationship: 'Doctor', phone: '+1-555-0102', email: 'drjohnson@clinic.com', canReceiveAlerts: true },
    { id: 3, name: 'Tom Smith', relationship: 'Son', phone: '+1-555-0103', email: 'tom@example.com', canReceiveAlerts: false }
  ],
  shareWithDispatch: true,
  shareHealthData: true,
  shareLocation: true,
  emergencyAutoCall: true
};

// Mock devices for dispatch center (with locations)
export function generateDispatchDevices() {
  const statuses = ['normal', 'normal', 'normal', 'warning', 'critical']; // Weighted towards normal
  const baseLocations = [
    { lat: 40.7128, lng: -74.0060, city: 'New York' },
    { lat: 34.0522, lng: -118.2437, city: 'Los Angeles' },
    { lat: 41.8781, lng: -87.6298, city: 'Chicago' },
    { lat: 29.7604, lng: -95.3698, city: 'Houston' },
    { lat: 33.4484, lng: -112.0740, city: 'Phoenix' },
    { lat: 39.9526, lng: -75.1652, city: 'Philadelphia' },
    { lat: 29.4241, lng: -98.4936, city: 'San Antonio' },
    { lat: 32.7157, lng: -117.1611, city: 'San Diego' },
    { lat: 32.7767, lng: -96.7970, city: 'Dallas' },
    { lat: 37.7749, lng: -122.4194, city: 'San Francisco' }
  ];

  const names = [
    'John Smith', 'Jane Doe', 'Robert Johnson', 'Emily Davis', 'Michael Wilson',
    'Sarah Brown', 'David Lee', 'Lisa Anderson', 'James Taylor', 'Jennifer Martinez'
  ];

  return names.map((name, index) => {
    const loc = baseLocations[index];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const metrics = generateMetrics();

    // Adjust metrics based on status
    if (status === 'warning') {
      metrics.heartRate = Math.floor(Math.random() * 15) + 95; // 95-110
    } else if (status === 'critical') {
      metrics.heartRate = Math.floor(Math.random() * 20) + 110; // 110-130
      metrics.oxygenLevel = Math.floor(Math.random() * 5) + 88; // 88-93
    }

    return {
      id: index + 1,
      deviceId: `DEV-${String(index + 1).padStart(4, '0')}`,
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
      phone: `+1-555-${String(1000 + index).padStart(4, '0')}`,
      lat: loc.lat + (Math.random() - 0.5) * 0.1, // Add small random offset
      lng: loc.lng + (Math.random() - 0.5) * 0.1,
      city: loc.city,
      status,
      metrics,
      shareWithDispatch: Math.random() > 0.2, // 80% share
      lastUpdate: new Date(Date.now() - Math.random() * 600000).toISOString(), // Within last 10 min
      deviceType: ['apple_watch', 'fitbit', 'garmin'][Math.floor(Math.random() * 3)],
      battery: Math.floor(Math.random() * 60) + 40 // 40-100%
    };
  });
}

// Generate user profile data for dispatch
export function generateUserProfile(userId) {
  const devices = generateDispatchDevices();
  const device = devices.find(d => d.id === userId) || devices[0];

  return {
    ...device,
    alerts: generateAlerts(),
    history: generateHistory(),
    emergencyContacts: mockShareSettings.trustedContacts,
    medicalInfo: {
      bloodType: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'][Math.floor(Math.random() * 8)],
      allergies: ['None', 'Penicillin', 'Peanuts', 'None'][Math.floor(Math.random() * 4)],
      medications: ['Lisinopril 10mg', 'Metformin 500mg', 'None'][Math.floor(Math.random() * 3)],
      conditions: ['Hypertension', 'Type 2 Diabetes', 'None', 'Asthma'][Math.floor(Math.random() * 4)]
    }
  };
}

export default {
  mockUsers,
  mockDispatchUsers,
  mockDevices,
  mockShareSettings,
  generateMetrics,
  generateAlerts,
  generateHistory,
  generateDispatchDevices,
  generateUserProfile
};
