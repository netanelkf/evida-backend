// Mock Data Generator for eVida Medical Emergency Platform
// This file provides realistic mock data for health metrics, alerts, devices, and users

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

export default {
  mockDevices,
  mockShareSettings,
  generateMetrics,
  generateAlerts,
  generateHistory
};
