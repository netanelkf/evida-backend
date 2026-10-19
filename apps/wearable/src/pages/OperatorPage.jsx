import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './OperatorPage.css'

const API_BASE = ''

const STATUS_COLORS = {
  NEW: '#ef4444',
  TRIAGED: '#f59e0b',
  CONTACTING: '#3b82f6',
  CONFIRMED: '#8b5cf6',
  ESCALATED: '#dc2626',
  CLOSED: '#22c55e'
}

const PRIORITY_COLORS = {
  HIGH: '#ef4444',
  MED: '#f59e0b',
  LOW: '#6b7280'
}

const STATUS_OPTIONS = ['NEW', 'TRIAGED', 'CONTACTING', 'CONFIRMED', 'ESCALATED', 'CLOSED']

export default function OperatorPage() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState('incidents')
  const [incidents, setIncidents] = useState([])
  const [users, setUsers] = useState([])
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [newNote, setNewNote] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const authHeaders = () => {
    const token = localStorage.getItem('operator_token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('operator_token')
    if (!token) {
      setIsAuthenticated(false)
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { headers: authHeaders() })
      if (res.ok) {
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem('operator_token')
        setIsAuthenticated(false)
      }
    } catch (error) {
      setIsAuthenticated(false)
    }
  }, [])

  const fetchIncidents = useCallback(async () => {
    try {
      let url = `${API_BASE}/api/incidents`
      if (statusFilter) {
        url += `?status=${statusFilter}`
      }
      const res = await fetch(url, { headers: authHeaders() })
      const data = await res.json()
      setIncidents(data.incidents || [])
    } catch (error) {
      console.error('Error fetching incidents:', error)
    }
  }, [statusFilter])

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/incidents/metrics`, { headers: authHeaders() })
      const data = await res.json()
      setMetrics(data)
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`, { headers: authHeaders() })
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  const fetchIncidentDetails = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/incidents/${id}`, { headers: authHeaders() })
      const data = await res.json()
      setSelectedIncident(data)
    } catch (error) {
      console.error('Error fetching incident:', error)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        setLoading(true)
        await Promise.all([fetchIncidents(), fetchMetrics(), fetchUsers()])
        setLoading(false)
      }
      loadData()

      const interval = setInterval(() => {
        fetchIncidents()
        fetchMetrics()
        fetchUsers()
        if (selectedIncident) {
          fetchIncidentDetails(selectedIncident.id)
        }
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [isAuthenticated, fetchIncidents, fetchMetrics, fetchIncidentDetails, selectedIncident])

  const handleLogin = async (e) => {
    e.preventDefault()
    const username = e.target.username.value
    const password = e.target.password.value

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        showToast(data.error || 'Invalid credentials', 'error')
        return
      }

      if (data.user.role !== 'operator' && data.user.role !== 'admin') {
        showToast('This account does not have operator access', 'error')
        return
      }

      localStorage.setItem('operator_token', data.token)
      setIsAuthenticated(true)
      showToast('Logged in successfully')
    } catch (error) {
      showToast('Login failed — check your connection', 'error')
    }
  }

  const handleLogout = () => {
    fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: authHeaders() }).catch(() => {})
    localStorage.removeItem('operator_token')
    setIsAuthenticated(false)
    setSelectedIncident(null)
  }

  const handleStatusChange = async (newStatus) => {
    if (!selectedIncident) return

    try {
      const res = await fetch(`${API_BASE}/api/incidents/${selectedIncident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        showToast(`Status updated to ${newStatus}`)
        await fetchIncidentDetails(selectedIncident.id)
        await fetchIncidents()
        await fetchMetrics()
      }
    } catch (error) {
      showToast('Failed to update status', 'error')
    }
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!selectedIncident || !newNote.trim()) return

    try {
      const res = await fetch(`${API_BASE}/api/incidents/${selectedIncident.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ note: newNote })
      })

      if (res.ok) {
        showToast('Note added')
        setNewNote('')
        await fetchIncidentDetails(selectedIncident.id)
      }
    } catch (error) {
      showToast('Failed to add note', 'error')
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (!isAuthenticated) {
    return (
      <div className="operator-login">
        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <h1>eVida Operator Console</h1>
            <p>24/7 Incident Management</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input type="text" name="username" placeholder="Enter username" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" name="password" placeholder="Enter password" required />
            </div>
            <button type="submit" className="login-btn">Sign In</button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="operator-page">
        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading incidents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="operator-page">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <header className="operator-header">
        <div className="header-left">
          <h1>eVida Operator Console</h1>
          <span className="live-indicator">LIVE</span>
          <div className="header-tabs">
            <button
              className={`header-tab ${activeTab === 'incidents' ? 'active' : ''}`}
              onClick={() => setActiveTab('incidents')}
            >
              Incidents
            </button>
            <button
              className={`header-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users ({users.length})
            </button>
          </div>
        </div>
        <div className="header-right">
          <button className="refresh-btn" onClick={() => { fetchIncidents(); fetchMetrics(); fetchUsers(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refresh
          </button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {metrics && (
        <div className="metrics-bar">
          <div className="metric">
            <span className="metric-value" style={{ color: '#ef4444' }}>{metrics.openCount}</span>
            <span className="metric-label">Open</span>
          </div>
          <div className="metric">
            <span className="metric-value">{metrics.todayCount}</span>
            <span className="metric-label">Today</span>
          </div>
          <div className="metric">
            <span className="metric-value" style={{ color: '#ef4444' }}>{metrics.byPriority?.HIGH || 0}</span>
            <span className="metric-label">High Priority</span>
          </div>
          <div className="metric">
            <span className="metric-value">{metrics.byStatus?.NEW || 0}</span>
            <span className="metric-label">New</span>
          </div>
          <div className="metric">
            <span className="metric-value">{metrics.byStatus?.TRIAGED || 0}</span>
            <span className="metric-label">Triaged</span>
          </div>
          <div className="metric">
            <span className="metric-value" style={{ color: '#22c55e' }}>{metrics.byStatus?.CLOSED || 0}</span>
            <span className="metric-label">Closed</span>
          </div>
        </div>
      )}

      <div className="operator-content">
        {activeTab === 'users' ? (
          <div className="users-panel full-width">
            <div className="panel-header">
              <h2>Registered Users</h2>
              <span className="user-count">{users.length} users</span>
            </div>
            {users.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p>No users registered yet</p>
              </div>
            ) : (
              <div className="users-grid">
                {users.map(user => (
                  <div key={user.id} className="user-card">
                    <div className="user-avatar">
                      {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                      <h3>{user.name || user.username}</h3>
                      <p className="user-email">{user.email}</p>
                      <p className="user-username">@{user.username}</p>
                    </div>
                    <div className="user-meta">
                      <span className="user-role">{user.role || 'user'}</span>
                      <span className="user-joined">Joined {new Date(user.created_at).toLocaleDateString()}</span>
                      {user.last_login_at && (
                        <span className="user-last-login">Last login: {new Date(user.last_login_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <>
        <div className="incidents-panel">
          <div className="panel-header">
            <h2>Incidents</h2>
            <select
              className="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {incidents.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              <p>No incidents found</p>
            </div>
          ) : (
            <div className="incidents-list">
              {incidents.map(incident => (
                <div
                  key={incident.id}
                  className={`incident-item ${selectedIncident?.id === incident.id ? 'selected' : ''}`}
                  onClick={() => fetchIncidentDetails(incident.id)}
                >
                  <div className="incident-header">
                    <span
                      className="priority-badge"
                      style={{ backgroundColor: PRIORITY_COLORS[incident.priority] }}
                    >
                      {incident.priority}
                    </span>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: STATUS_COLORS[incident.status] }}
                    >
                      {incident.status}
                    </span>
                  </div>
                  <div className="incident-info">
                    <span className="incident-id">#{incident.id}</span>
                    <span className="incident-user">{incident.user_id}</span>
                  </div>
                  <div className="incident-meta">
                    <span className="incident-type">{incident.event_type || 'SOS'}</span>
                    <span className="incident-time">{formatTimeAgo(incident.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="details-panel">
          {!selectedIncident ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
              <p>Select an incident to view details</p>
            </div>
          ) : (
            <>
              <div className="detail-header">
                <h2>Incident #{selectedIncident.id}</h2>
                <span
                  className="status-badge large"
                  style={{ backgroundColor: STATUS_COLORS[selectedIncident.status] }}
                >
                  {selectedIncident.status}
                </span>
              </div>

              <div className="detail-section">
                <h3>Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>User</label>
                    <span>{selectedIncident.user_id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Priority</label>
                    <span style={{ color: PRIORITY_COLORS[selectedIncident.priority] }}>
                      {selectedIncident.priority}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Type</label>
                    <span>{selectedIncident.event_type || 'SOS'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Created</label>
                    <span>{formatTime(selectedIncident.created_at)}</span>
                  </div>
                  {selectedIncident.summary && (
                    <div className="detail-item full-width">
                      <label>Summary</label>
                      <span>{selectedIncident.summary}</span>
                    </div>
                  )}
                  {(selectedIncident.location_lat && selectedIncident.location_lng) && (
                    <div className="detail-item full-width">
                      <label>Location</label>
                      <span>{selectedIncident.location_lat}, {selectedIncident.location_lng}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h3>Update Status</h3>
                <div className="status-buttons">
                  {STATUS_OPTIONS.filter(s => s !== selectedIncident.status).map(status => (
                    <button
                      key={status}
                      className="status-btn"
                      style={{ borderColor: STATUS_COLORS[status], color: STATUS_COLORS[status] }}
                      onClick={() => handleStatusChange(status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="detail-section">
                <h3>Actions ({selectedIncident.actions?.length || 0})</h3>
                <div className="actions-list">
                  {selectedIncident.actions?.map(action => (
                    <div key={action.id} className="action-item">
                      <div className="action-info">
                        <span className="action-type">{action.action_type}</span>
                        <span className="action-channel">{action.channel}</span>
                        <span className="action-recipient">{action.recipient}</span>
                      </div>
                      <span
                        className="action-status"
                        style={{
                          color: action.status === 'SENT' ? '#22c55e' :
                                 action.status === 'FAILED' ? '#ef4444' : '#f59e0b'
                        }}
                      >
                        {action.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="detail-section">
                <h3>Timeline</h3>
                <div className="timeline">
                  {selectedIncident.history?.map((h, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-dot" style={{ backgroundColor: STATUS_COLORS[h.to_status] }}></div>
                      <div className="timeline-content">
                        <span className="timeline-status">
                          {h.from_status ? `${h.from_status} → ` : ''}{h.to_status}
                        </span>
                        <span className="timeline-meta">
                          {h.changed_by} • {formatTime(h.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="detail-section">
                <h3>Notes ({selectedIncident.notes?.length || 0})</h3>
                <form className="note-form" onSubmit={handleAddNote}>
                  <input
                    type="text"
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <button type="submit" disabled={!newNote.trim()}>Add</button>
                </form>
                <div className="notes-list">
                  {selectedIncident.notes?.map(note => (
                    <div key={note.id} className="note-item">
                      <p>{note.note}</p>
                      <span className="note-meta">
                        {note.author_user_id} ({note.author_role}) • {formatTime(note.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  )
}
