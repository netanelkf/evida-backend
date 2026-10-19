import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUserProfile } from '../services/api'
import './UserProfilePage.css'

const HeartIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)

const LungsIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l-2 18"/>
    <path d="M12 2c2.8 0 5 2.2 5 5c0 6-5 11-5 11s-5-5-5-11c0-2.8 2.2-5 5-5z"/>
  </svg>
)

const StepsIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="2"/>
    <path d="M6 16l-2 6"/>
    <path d="M18 16l2 6"/>
    <path d="M12 12v5"/>
    <path d="M9 9l3 3 3-3"/>
  </svg>
)

const BatteryIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="2" width="12" height="20" rx="2" ry="2"/>
    <line x1="6" y1="6" x2="18" y2="6"/>
  </svg>
)

const PinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
)

export default function UserProfilePage({ onLogout }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [id])

  const loadProfile = async () => {
    try {
      const data = await getUserProfile(parseInt(id))
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading user profile...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="error-screen">
        <p>User not found</p>
        <button onClick={() => navigate('/')}>Back to Dashboard</button>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'var(--accent-red)'
      case 'warning': return 'var(--accent-yellow)'
      default: return 'var(--accent-green)'
    }
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <BackIcon /> Back to Dashboard
        </button>
        <div className="header-title">
          <h1>User Profile</h1>
        </div>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </header>

      <div className="profile-content">
        <div className="profile-card user-info-card">
          <div className="user-avatar" style={{ borderColor: getStatusColor(profile.status) }}>
            {profile.name.charAt(0)}
          </div>
          <div className="user-details">
            <h2>{profile.name}</h2>
            <p className="user-email">{profile.email}</p>
            <p className="user-phone">{profile.phone}</p>
            <p className="user-location"><PinIcon /> {profile.city}</p>
          </div>
          <div className={`status-badge large ${profile.status}`}>
            {profile.status.toUpperCase()}
          </div>
        </div>

        <div className="profile-card">
          <h3>Current Health Metrics</h3>
          <div className="metrics-grid">
            <div className="metric-box">
              <span className="metric-icon"><HeartIcon /></span>
              <span className="metric-value">{profile.metrics.heartRate}</span>
              <span className="metric-label">Heart Rate (bpm)</span>
            </div>
            <div className="metric-box">
              <span className="metric-icon"><LungsIcon /></span>
              <span className="metric-value">{profile.metrics.oxygenLevel}</span>
              <span className="metric-label">Oxygen Level (%)</span>
            </div>
            <div className="metric-box">
              <span className="metric-icon"><StepsIcon /></span>
              <span className="metric-value">{profile.metrics.steps}</span>
              <span className="metric-label">Steps Today</span>
            </div>
            <div className="metric-box">
              <span className="metric-icon"><BatteryIcon /></span>
              <span className="metric-value">{profile.battery}%</span>
              <span className="metric-label">Device Battery</span>
            </div>
          </div>
        </div>

        <div className="profile-card">
          <h3>Medical Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Blood Type</span>
              <span className="info-value">{profile.medicalInfo.bloodType}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Allergies</span>
              <span className="info-value">{profile.medicalInfo.allergies}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Medications</span>
              <span className="info-value">{profile.medicalInfo.medications}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Conditions</span>
              <span className="info-value">{profile.medicalInfo.conditions}</span>
            </div>
          </div>
        </div>

        <div className="profile-card">
          <h3>Recent Alerts ({profile.alerts.length})</h3>
          <div className="alerts-list">
            {profile.alerts.slice(0, 5).map((alert, idx) => (
              <div key={idx} className={`alert-item ${alert.severity}`}>
                <div className="alert-main">
                  <span className={`severity-badge ${alert.severity}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="alert-message">{alert.message}</span>
                </div>
                <span className="alert-time">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="profile-card">
          <h3>Last 24 Hours - Health Readings</h3>
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Heart Rate</th>
                  <th>Oxygen</th>
                  <th>Blood Pressure</th>
                </tr>
              </thead>
              <tbody>
                {profile.history.slice(0, 6).map((record, idx) => (
                  <tr key={idx}>
                    <td>{record.time}</td>
                    <td>{record.heartRate} bpm</td>
                    <td>{record.oxygenLevel}%</td>
                    <td>{record.bloodPressure}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="profile-card">
          <h3>Emergency Contacts</h3>
          <div className="contacts-grid">
            {profile.emergencyContacts.map((contact, idx) => (
              <div key={idx} className="contact-item">
                <div className="contact-avatar">{contact.name.charAt(0)}</div>
                <div className="contact-info">
                  <span className="contact-name">{contact.name}</span>
                  <span className="contact-relation">{contact.relationship}</span>
                  <span className="contact-phone">{contact.phone}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
