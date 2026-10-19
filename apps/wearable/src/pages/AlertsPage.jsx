// Alerts Page - View and manage triggered health alerts

import { useState, useEffect } from 'react'
import { getAlerts, acknowledgeAlert } from '../services/api'
import './AlertsPage.css'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, unread, critical, warning

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    try {
      const data = await getAlerts()
      setAlerts(data)
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAlert(alertId)
      setAlerts(prev =>
        prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
      )
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  const getAlertIcon = (type) => {
    switch (type) {
      case 'high_heart_rate': return '💓'
      case 'low_heart_rate': return '💔'
      case 'fall_detected': return '⚠️'
      case 'low_oxygen': return '🫁'
      case 'irregular_rhythm': return '📈'
      case 'high_bp': return '🩸'
      case 'inactivity': return '🪑'
      default: return '🔔'
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true
    if (filter === 'unread') return !alert.acknowledged
    return alert.severity === filter
  })

  const unreadCount = alerts.filter(a => !a.acknowledged).length

  if (loading) {
    return (
      <div className="page">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    )
  }

  return (
    <div className="page alerts-page">
      <div className="page-header">
        <h1>Health Alerts</h1>
        <p>Monitor and respond to health notifications</p>
      </div>

      {/* Stats Bar */}
      <div className="alerts-stats">
        <div className="stat-item">
          <span className="stat-number">{alerts.length}</span>
          <span className="stat-label">Total Alerts</span>
        </div>
        <div className="stat-item critical">
          <span className="stat-number">{alerts.filter(a => a.severity === 'critical').length}</span>
          <span className="stat-label">Critical</span>
        </div>
        <div className="stat-item warning">
          <span className="stat-number">{alerts.filter(a => a.severity === 'warning').length}</span>
          <span className="stat-label">Warning</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{unreadCount}</span>
          <span className="stat-label">Unread</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
        <button
          className={`filter-tab ${filter === 'critical' ? 'active' : ''}`}
          onClick={() => setFilter('critical')}
        >
          Critical
        </button>
        <button
          className={`filter-tab ${filter === 'warning' ? 'active' : ''}`}
          onClick={() => setFilter('warning')}
        >
          Warning
        </button>
      </div>

      {/* Alerts List */}
      <div className="alerts-list">
        {filteredAlerts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✓</span>
            <p>No alerts matching your filter</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`alert-card ${alert.severity} ${alert.acknowledged ? 'acknowledged' : ''}`}
            >
              <div className="alert-icon">{getAlertIcon(alert.type)}</div>

              <div className="alert-content">
                <div className="alert-header">
                  <span className={`severity-badge ${alert.severity}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="alert-time">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
                <h3 className="alert-type">{alert.type.replace(/_/g, ' ')}</h3>
                <p className="alert-message">{alert.message}</p>
              </div>

              <div className="alert-actions">
                {!alert.acknowledged ? (
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleAcknowledge(alert.id)}
                  >
                    Acknowledge
                  </button>
                ) : (
                  <span className="acknowledged-badge">✓ Acknowledged</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
