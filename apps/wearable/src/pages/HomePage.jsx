import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMetrics, getAlerts } from '../services/api'
import './HomePage.css'

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
  </svg>
)

const LungsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.081 20C2.732 20 0 16.418 0 12c0-2.052.684-3.942 1.836-5.443"/>
    <path d="M6 12c0-4.5 1.5-8 4-10"/>
    <path d="M14 2c2.5 2 4 5.5 4 10"/>
    <path d="M17.919 20C21.268 20 24 16.418 24 12c0-2.052-.684-3.942-1.836-5.443"/>
    <path d="M10 2v8l2 2 2-2V2"/>
  </svg>
)

const FootprintsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/>
    <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/>
    <path d="M16 17h4"/>
    <path d="M4 13h4"/>
  </svg>
)

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
)

const ThermometerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>
  </svg>
)

const FlameIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
)

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
  </svg>
)

const ZapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const WatchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="6"/>
    <polyline points="12 10 12 12 13 13"/>
    <path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05"/>
    <path d="m7.88 16.36.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05"/>
  </svg>
)

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="20" y2="10"/>
    <line x1="18" x2="18" y1="20" y2="4"/>
    <line x1="6" x2="6" y1="20" y2="16"/>
  </svg>
)

const FileTextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" x2="8" y1="13" y2="13"/>
    <line x1="16" x2="8" y1="17" y2="17"/>
    <line x1="10" x2="8" y1="9" y2="9"/>
  </svg>
)

const AlertTriangleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <line x1="12" x2="12" y1="9" y2="13"/>
    <line x1="12" x2="12.01" y1="17" y2="17"/>
  </svg>
)

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
)

const CheckCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

const WifiIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
    <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
    <line x1="12" x2="12.01" y1="20" y2="20"/>
  </svg>
)

export default function HomePage({ user }) {
  const [metrics, setMetrics] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState('mock')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      // Fetch metrics - now returns real ROOK webhook data if available
      const metricsData = await getMetrics()

      // Check if this is real data from ROOK webhooks
      if (metricsData.isRealData) {
        setDataSource('live')
      } else {
        setDataSource('mock')
      }

      const alertsData = await getAlerts()
      setMetrics(metricsData)
      setAlerts(alertsData.filter(a => !a.acknowledged).slice(0, 3))
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const getHeartRateStatus = (hr) => {
    if (hr < 60) return 'warning'
    if (hr > 100) return 'critical'
    return 'normal'
  }

  const getOxygenStatus = (o2) => {
    if (o2 < 92) return 'critical'
    if (o2 < 95) return 'warning'
    return 'normal'
  }

  return (
    <div className="page home-page">
      <div className="page-header">
        <div className="welcome-section">
          <div>
            <h1>Welcome back, {user?.name || 'User'}</h1>
            <p>Your health metrics at a glance</p>
          </div>
          <div className={`status-badge ${dataSource === 'live' ? 'connected' : dataSource === 'syncing' ? 'syncing' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {dataSource === 'live' ? 'Live' : dataSource === 'syncing' ? 'Syncing' : 'Demo Mode'}
          </div>
        </div>
      </div>

      {dataSource === 'syncing' && (
        <div className="sync-notice">
          <div className="sync-icon">
            <ClockIcon />
          </div>
          <div className="sync-content">
            <strong>{metrics?.source} connected</strong>
            <p>Waiting for health data to sync. Open your {metrics?.source} app to speed up the sync.</p>
          </div>
        </div>
      )}

      {dataSource === 'live' && metrics?.source && (
        <div className="data-source-section">
          <div className="data-source-badge fitbit">
            <WifiIcon />
            <span>Live data from {metrics.source}</span>
          </div>
          {metrics?.lastUpdated && (
            <div className="last-sync-info">
              <ClockIcon />
              <span>Last sync: {formatLastSync(metrics.lastUpdated)}</span>
            </div>
          )}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="alert-banner">
          <AlertTriangleIcon className="alert-banner-icon" />
          <span className="alert-banner-text">You have {alerts.length} unacknowledged alert{alerts.length > 1 ? 's' : ''}</span>
          <Link to="/alerts" className="alert-banner-link">
            View All
            <ChevronRightIcon />
          </Link>
        </div>
      )}

      <div className="metrics-grid">
        <div className={`metric-card primary ${getHeartRateStatus(metrics?.heartRate)}`}>
          <div className="metric-header">
            <div className="metric-icon-wrapper heart">
              <HeartIcon />
            </div>
            <CheckCircleIcon className={`metric-status-icon ${getHeartRateStatus(metrics?.heartRate)}`} />
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {metrics?.heartRate || '--'}
              <span className="unit">bpm</span>
            </div>
            <div className="metric-label">Heart Rate</div>
          </div>
        </div>

        <div className={`metric-card primary ${getOxygenStatus(metrics?.oxygenLevel)}`}>
          <div className="metric-header">
            <div className="metric-icon-wrapper oxygen">
              <ActivityIcon />
            </div>
            <CheckCircleIcon className={`metric-status-icon ${getOxygenStatus(metrics?.oxygenLevel)}`} />
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {metrics?.oxygenLevel || '--'}
              <span className="unit">%</span>
            </div>
            <div className="metric-label">Oxygen Level</div>
          </div>
        </div>

        <div className="metric-card normal">
          <div className="metric-header">
            <div className="metric-icon-wrapper steps">
              <FootprintsIcon />
            </div>
          </div>
          <div className="metric-content">
            <div className="metric-value">{metrics?.steps?.toLocaleString() || '--'}</div>
            <div className="metric-label">Steps Today</div>
          </div>
        </div>

        <div className="metric-card normal">
          <div className="metric-header">
            <div className="metric-icon-wrapper pressure">
              <ActivityIcon />
            </div>
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {metrics?.bloodPressure?.systolic || '--'}/{metrics?.bloodPressure?.diastolic || '--'}
            </div>
            <div className="metric-label">Blood Pressure</div>
          </div>
        </div>

        <div className="metric-card normal">
          <div className="metric-header">
            <div className="metric-icon-wrapper temp">
              <ThermometerIcon />
            </div>
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {metrics?.temperature || '--'}
              <span className="unit">°C</span>
            </div>
            <div className="metric-label">Temperature</div>
          </div>
        </div>

        <div className="metric-card normal">
          <div className="metric-header">
            <div className="metric-icon-wrapper calories">
              <FlameIcon />
            </div>
          </div>
          <div className="metric-content">
            <div className="metric-value">{metrics?.calories?.toLocaleString() || '--'}</div>
            <div className="metric-label">Calories</div>
          </div>
        </div>

        <div className="metric-card normal">
          <div className="metric-header">
            <div className="metric-icon-wrapper sleep">
              <MoonIcon />
            </div>
          </div>
          <div className="metric-content">
            <div className="metric-value">
              {metrics?.sleepHours || '--'}
              <span className="unit">hrs</span>
            </div>
            <div className="metric-label">Sleep</div>
          </div>
        </div>

        {metrics?.activeMinutes !== undefined && (
          <div className="metric-card normal">
            <div className="metric-header">
              <div className="metric-icon-wrapper active">
                <ZapIcon />
              </div>
            </div>
            <div className="metric-content">
              <div className="metric-value">
                {metrics.activeMinutes}
                <span className="unit">min</span>
              </div>
              <div className="metric-label">Active Minutes</div>
            </div>
          </div>
        )}
      </div>

      <div className="last-updated">
        <ClockIcon />
        Last updated: {metrics?.lastUpdated ? new Date(metrics.lastUpdated).toLocaleString() : 'N/A'}
        {dataSource === 'fitbit' && ' (Fitbit)'}
      </div>

      <h3 className="section-title">Quick Actions</h3>
      <div className="quick-actions">
        <Link to="/connect" className="action-card">
          <div className="action-icon">
            <WatchIcon />
          </div>
          <span className="action-text">Connect Device</span>
        </Link>
        <Link to="/history" className="action-card">
          <div className="action-icon">
            <ChartIcon />
          </div>
          <span className="action-text">View History</span>
        </Link>
        <Link to="/reports" className="action-card">
          <div className="action-icon">
            <FileTextIcon />
          </div>
          <span className="action-text">Download Report</span>
        </Link>
      </div>
    </div>
  )
}
