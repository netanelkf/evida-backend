import { useState, useEffect } from 'react'
import axios from 'axios'
import '../styles/Dashboard.css'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [metrics, setMetrics] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  const token = localStorage.getItem('token')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` }

      const [userRes, metricsRes, alertsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/users/profile', { headers }),
        axios.get('http://localhost:5000/api/health/metrics', { headers }),
        axios.get('http://localhost:5000/api/health/alerts', { headers })
      ])

      setUser(userRes.data)
      setMetrics(metricsRes.data)
      setAlerts(alertsRes.data)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  if (loading) return <div className="dashboard">Loading...</div>

  const latestMetric = metrics[0] || {}

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Health Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      <div className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome, {user?.first_name || 'User'}</h2>
          <p>{user?.email}</p>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <h3>Heart Rate</h3>
            <p className="metric-value">{latestMetric.heart_rate || '--'} bpm</p>
          </div>
          <div className="metric-card">
            <h3>Steps</h3>
            <p className="metric-value">{latestMetric.steps || '--'}</p>
          </div>
          <div className="metric-card">
            <h3>Sleep</h3>
            <p className="metric-value">{latestMetric.sleep_duration ? latestMetric.sleep_duration.toFixed(1) : '--'} hrs</p>
          </div>
          <div className="metric-card">
            <h3>Calories</h3>
            <p className="metric-value">{latestMetric.activity_calories || '--'} kcal</p>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="alerts-section">
            <h3>Recent Alerts ({alerts.length})</h3>
            <div className="alerts-list">
              {alerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="alert-item">
                  <div className="alert-type">{alert.alert_type}</div>
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-time">{new Date(alert.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="actions">
          <button className="action-btn">Connect Wearable</button>
          <button className="action-btn">View History</button>
          <button className="action-btn emergency">Emergency Alert</button>
        </div>
      </div>
    </div>
  )
}
