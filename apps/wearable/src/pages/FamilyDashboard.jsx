// Family Member Dashboard - View loved one's health status

import { useState, useEffect } from 'react'
import { getFamilyDashboard } from '../services/api'
import './FamilyDashboard.css'

export default function FamilyDashboard({ user, onLogout }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    loadDashboard()
    const interval = setInterval(loadDashboard, 10000)
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => {
      clearInterval(interval)
      clearInterval(timeInterval)
    }
  }, [])

  const loadDashboard = async () => {
    try {
      const dashboardData = await getFamilyDashboard()
      setData(dashboardData)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="family-dashboard">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading health status...</p>
        </div>
      </div>
    )
  }

  const lovedOne = data?.lovedOne
  const metrics = data?.metrics
  const alerts = data?.alerts || []
  const location = data?.location

  const getStatusColor = () => {
    if (alerts.some(a => a.severity === 'critical')) return 'critical'
    if (alerts.some(a => a.severity === 'warning')) return 'warning'
    return 'normal'
  }

  return (
    <div className="family-dashboard">
      {/* Header */}
      <header className="family-header">
        <div className="header-brand">
          <span className="brand-icon">💓</span>
          <div className="brand-text">
            <span className="brand-name">eVida</span>
            <span className="brand-sub">Family Portal</span>
          </div>
        </div>
        <div className="header-time">
          <span className="time">{currentTime.toLocaleTimeString()}</span>
          <span className="date">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="header-user">
          <span className="user-greeting">Welcome, {user?.name || 'Family Member'}</span>
          <button onClick={onLogout} className="logout-btn">Sign Out</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="family-main">
        {/* Loved One Card */}
        <div className="loved-one-section">
          <div className={`loved-one-card ${getStatusColor()}`}>
            <div className="loved-one-avatar">
              <span className="avatar-icon">👤</span>
              <div className={`status-ring ${getStatusColor()}`}></div>
            </div>
            <div className="loved-one-info">
              <h1>{lovedOne?.name || 'John Doe'}</h1>
              <p className="relationship">{lovedOne?.relationship || 'Family Member'}</p>
              <div className={`status-badge ${getStatusColor()}`}>
                {getStatusColor() === 'normal' && '✓ All vitals normal'}
                {getStatusColor() === 'warning' && '⚠ Attention needed'}
                {getStatusColor() === 'critical' && '🚨 Immediate attention required'}
              </div>
            </div>
            <div className="last-updated">
              <span className="update-dot"></span>
              <span>Live - Updated just now</span>
            </div>
          </div>
        </div>

        {/* Vitals Grid */}
        <div className="vitals-section">
          <h2 className="section-title">Current Vitals</h2>
          <div className="vitals-grid">
            <div className={`vital-card ${metrics?.heartRate < 50 || metrics?.heartRate > 120 ? 'alert' : ''}`}>
              <div className="vital-icon">❤️</div>
              <div className="vital-data">
                <span className="vital-value">{metrics?.heartRate || 72}</span>
                <span className="vital-unit">BPM</span>
              </div>
              <span className="vital-label">Heart Rate</span>
              <div className="vital-range">Normal: 60-100</div>
            </div>

            <div className={`vital-card ${metrics?.oxygenLevel < 92 ? 'alert' : ''}`}>
              <div className="vital-icon">🫁</div>
              <div className="vital-data">
                <span className="vital-value">{metrics?.oxygenLevel || 98}</span>
                <span className="vital-unit">%</span>
              </div>
              <span className="vital-label">Oxygen Level</span>
              <div className="vital-range">Normal: 95-100%</div>
            </div>

            <div className="vital-card">
              <div className="vital-icon">🩸</div>
              <div className="vital-data">
                <span className="vital-value">
                  {metrics?.bloodPressure?.systolic || 120}/{metrics?.bloodPressure?.diastolic || 80}
                </span>
                <span className="vital-unit">mmHg</span>
              </div>
              <span className="vital-label">Blood Pressure</span>
              <div className="vital-range">Normal: 120/80</div>
            </div>

            <div className="vital-card">
              <div className="vital-icon">🏃</div>
              <div className="vital-data">
                <span className="vital-value">{metrics?.steps?.toLocaleString() || '3,420'}</span>
                <span className="vital-unit">steps</span>
              </div>
              <span className="vital-label">Activity Today</span>
              <div className="vital-range">Goal: 10,000</div>
            </div>

            <div className="vital-card">
              <div className="vital-icon">🌡️</div>
              <div className="vital-data">
                <span className="vital-value">{metrics?.temperature || 36.8}</span>
                <span className="vital-unit">°C</span>
              </div>
              <span className="vital-label">Temperature</span>
              <div className="vital-range">Normal: 36.1-37.2</div>
            </div>

            <div className="vital-card">
              <div className="vital-icon">🔋</div>
              <div className="vital-data">
                <span className="vital-value">{metrics?.battery || 78}</span>
                <span className="vital-unit">%</span>
              </div>
              <span className="vital-label">Device Battery</span>
              <div className="vital-range">Wearable status</div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="two-column">
          {/* Location Card */}
          <div className="location-section">
            <h2 className="section-title">📍 Current Location</h2>
            <div className="location-card">
              <div className="location-map">
                <div className="map-placeholder">
                  <span className="map-icon">🗺️</span>
                  <p>Location Map</p>
                </div>
              </div>
              <div className="location-details">
                <div className="location-address">
                  <strong>{location?.address || '123 Oak Street'}</strong>
                  <span>{location?.city || 'Springfield, IL'}</span>
                </div>
                <div className="location-status">
                  <span className={`zone-badge ${location?.inSafeZone !== false ? 'safe' : 'outside'}`}>
                    {location?.inSafeZone !== false ? '✓ In Safe Zone' : '⚠ Outside Safe Zone'}
                  </span>
                  <span className="last-seen">Last movement: {location?.lastMovement || '5 min ago'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts Section */}
          <div className="alerts-section">
            <h2 className="section-title">🔔 Recent Alerts</h2>
            <div className="alerts-list">
              {alerts.length === 0 ? (
                <div className="no-alerts">
                  <span className="no-alerts-icon">✓</span>
                  <p>No alerts - everything looks good!</p>
                </div>
              ) : (
                alerts.slice(0, 5).map((alert, index) => (
                  <div key={index} className={`alert-item ${alert.severity}`}>
                    <div className="alert-icon">
                      {alert.severity === 'critical' && '🚨'}
                      {alert.severity === 'warning' && '⚠️'}
                      {alert.severity === 'info' && 'ℹ️'}
                    </div>
                    <div className="alert-content">
                      <span className="alert-message">{alert.message}</span>
                      <span className="alert-time">{alert.time || 'Just now'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="actions-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-card">
              <span className="action-icon">📞</span>
              <span className="action-label">Call {lovedOne?.name?.split(' ')[0] || 'Them'}</span>
            </button>
            <button className="action-card">
              <span className="action-icon">💬</span>
              <span className="action-label">Send Message</span>
            </button>
            <button className="action-card emergency">
              <span className="action-icon">🚨</span>
              <span className="action-label">Emergency Services</span>
            </button>
            <button className="action-card">
              <span className="action-icon">📊</span>
              <span className="action-label">View History</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="family-footer">
        <p>eVida Family Portal • Data refreshes every 10 seconds</p>
        <p>For medical emergencies, call 911 immediately</p>
      </footer>
    </div>
  )
}
