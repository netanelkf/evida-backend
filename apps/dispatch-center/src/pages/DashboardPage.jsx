import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDevices, getStats } from '../services/api'
import Map from '../components/Map'
import './DashboardPage.css'

const MapIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
)

const AlertIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

const ChartIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)

const FileIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)

const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const ZapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)

const BellIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

const HeartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

export default function DashboardPage({ user, onLogout }) {
  const [devices, setDevices] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activePanel, setActivePanel] = useState('devices')
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => {
      clearInterval(interval)
      clearInterval(timeInterval)
    }
  }, [])

  const loadData = async () => {
    try {
      const [devicesData, statsData] = await Promise.all([
        getDevices(),
        getStats()
      ])
      setDevices(devicesData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeviceClick = (device) => {
    setSelectedDevice(device)
  }

  const openProfile = (deviceId) => {
    navigate(`/user/${deviceId}`)
  }

  const criticalDevices = devices.filter(d => d.status === 'critical')
  const warningDevices = devices.filter(d => d.status === 'warning')

  if (loading) {
    return (
      <div className="command-center">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Initializing Command Center...</p>
          <div className="loading-bar"><div className="loading-progress"></div></div>
        </div>
      </div>
    )
  }

  return (
    <div className="command-center">
      <div className="window-titlebar">
        <div className="titlebar-left">
          <div className="window-controls">
            <span className="control close"></span>
            <span className="control minimize"></span>
            <span className="control maximize"></span>
          </div>
          <span className="app-title">eVida Dispatch Command Center v2.1.0</span>
        </div>
        <div className="titlebar-center">
          <div className="system-status">
            <span className="status-indicator online"></span>
            <span>SYSTEM ONLINE</span>
          </div>
        </div>
        <div className="titlebar-right">
          <span className="system-time">{currentTime.toLocaleTimeString()}</span>
          <span className="system-date">{currentTime.toLocaleDateString()}</span>
        </div>
      </div>

      <div className="main-toolbar">
        <div className="toolbar-section">
          <button className="toolbar-btn active">
            <span className="tb-icon"><MapIcon /></span>
            <span className="tb-label">Live Map</span>
          </button>
          <button className="toolbar-btn" onClick={() => setActivePanel('alerts')}>
            <span className="tb-icon"><AlertIcon /></span>
            <span className="tb-label">Alerts</span>
            {criticalDevices.length > 0 && (
              <span className="badge critical">{criticalDevices.length}</span>
            )}
          </button>
          <button className="toolbar-btn">
            <span className="tb-icon"><ChartIcon /></span>
            <span className="tb-label">Analytics</span>
          </button>
          <button className="toolbar-btn">
            <span className="tb-icon"><FileIcon /></span>
            <span className="tb-label">Reports</span>
          </button>
        </div>

        <div className="toolbar-section stats-section">
          <div className="toolbar-stat">
            <span className="stat-value">{stats?.totalDevices || 0}</span>
            <span className="stat-name">TOTAL</span>
          </div>
          <div className="toolbar-stat normal">
            <span className="stat-value">{stats?.normalCount || 0}</span>
            <span className="stat-name">NORMAL</span>
          </div>
          <div className="toolbar-stat warning">
            <span className="stat-value">{stats?.warningCount || 0}</span>
            <span className="stat-name">WARNING</span>
          </div>
          <div className="toolbar-stat critical">
            <span className="stat-value">{stats?.criticalCount || 0}</span>
            <span className="stat-name">CRITICAL</span>
          </div>
        </div>

        <div className="toolbar-section">
          <div className="operator-info">
            <span className="operator-avatar"><UserIcon /></span>
            <div className="operator-details">
              <span className="operator-name">{user?.name || 'Operator'}</span>
              <span className="operator-station">{user?.center || 'Central Command'}</span>
            </div>
          </div>
          <button onClick={onLogout} className="toolbar-btn logout">
            <span className="tb-icon"><LogoutIcon /></span>
            <span className="tb-label">Logout</span>
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="left-sidebar">
          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-icon"><ZapIcon /></span>
              <span>QUICK ACTIONS</span>
            </div>
            <div className="quick-actions">
              <button className="action-btn">
                <PinIcon /> Locate All
              </button>
              <button className="action-btn" onClick={loadData}>
                <RefreshIcon /> Refresh
              </button>
              <button className="action-btn emergency">
                <BellIcon /> Emergency
              </button>
            </div>
          </div>

          <div className="sidebar-section alerts-section">
            <div className="section-header">
              <span className="section-icon"><WarningIcon /></span>
              <span>ACTIVE ALERTS</span>
              <span className="alert-count">{criticalDevices.length + warningDevices.length}</span>
            </div>
            <div className="alerts-list">
              {criticalDevices.map(device => (
                <div key={device.id} className="alert-item critical" onClick={() => handleDeviceClick(device)}>
                  <div className="alert-indicator"></div>
                  <div className="alert-content">
                    <span className="alert-name">{device.name}</span>
                    <span className="alert-detail">HR: {device.metrics.heartRate} | O2: {device.metrics.oxygenLevel}%</span>
                  </div>
                  <span className="alert-time">LIVE</span>
                </div>
              ))}
              {warningDevices.map(device => (
                <div key={device.id} className="alert-item warning" onClick={() => handleDeviceClick(device)}>
                  <div className="alert-indicator"></div>
                  <div className="alert-content">
                    <span className="alert-name">{device.name}</span>
                    <span className="alert-detail">HR: {device.metrics.heartRate} | O2: {device.metrics.oxygenLevel}%</span>
                  </div>
                  <span className="alert-time">LIVE</span>
                </div>
              ))}
              {criticalDevices.length === 0 && warningDevices.length === 0 && (
                <div className="no-alerts">
                  <CheckIcon /> All systems normal
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="map-area">
          <div className="map-header">
            <span className="map-title">LIVE TRACKING - NORTH AMERICA REGION</span>
            <div className="map-controls">
              <button className="map-ctrl">-</button>
              <button className="map-ctrl">+</button>
              <button className="map-ctrl">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="map-wrapper">
            <Map
              devices={devices}
              selectedDevice={selectedDevice}
              onDeviceClick={handleDeviceClick}
            />
          </div>
          <div className="map-footer">
            <div className="map-legend">
              <div className="legend-item">
                <span className="legend-dot normal"></span>
                <span>Normal ({stats?.normalCount || 0})</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot warning"></span>
                <span>Warning ({stats?.warningCount || 0})</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot critical"></span>
                <span>Critical ({stats?.criticalCount || 0})</span>
              </div>
            </div>
            <div className="map-info">
              <span className="refresh-indicator">Auto-refresh: 5s</span>
              <span>Last update: {currentTime.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        <div className="right-sidebar">
          <div className="sidebar-tabs">
            <button
              className={`tab ${activePanel === 'devices' ? 'active' : ''}`}
              onClick={() => setActivePanel('devices')}
            >
              DEVICES
            </button>
            <button
              className={`tab ${activePanel === 'selected' ? 'active' : ''}`}
              onClick={() => setActivePanel('selected')}
            >
              SELECTED
            </button>
          </div>

          {activePanel === 'devices' && (
            <div className="devices-panel">
              <div className="panel-header">
                <input
                  type="text"
                  placeholder="Search devices..."
                  className="search-input"
                />
              </div>
              <div className="devices-list">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className={`device-row ${device.status} ${selectedDevice?.id === device.id ? 'selected' : ''}`}
                    onClick={() => handleDeviceClick(device)}
                  >
                    <div className="device-status-indicator"></div>
                    <div className="device-info">
                      <span className="device-name">{device.name}</span>
                      <span className="device-location">{device.city}</span>
                    </div>
                    <div className="device-vitals">
                      <span className="vital"><HeartIcon /> {device.metrics.heartRate}</span>
                      <span className="vital">O2 {device.metrics.oxygenLevel}%</span>
                    </div>
                    <button
                      className="view-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        openProfile(device.id)
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activePanel === 'selected' && selectedDevice && (
            <div className="selected-panel">
              <div className="selected-header">
                <div className={`status-badge ${selectedDevice.status}`}>
                  {selectedDevice.status.toUpperCase()}
                </div>
                <h3>{selectedDevice.name}</h3>
                <p>{selectedDevice.city}</p>
              </div>
              <div className="selected-vitals">
                <div className="vital-card">
                  <span className="vital-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </span>
                  <span className="vital-value">{selectedDevice.metrics.heartRate}</span>
                  <span className="vital-unit">BPM</span>
                </div>
                <div className="vital-card">
                  <span className="vital-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                      <path d="M12 2l-2 18"/>
                      <path d="M12 2c2.8 0 5 2.2 5 5c0 6-5 11-5 11s-5-5-5-11c0-2.8 2.2-5 5-5z"/>
                    </svg>
                  </span>
                  <span className="vital-value">{selectedDevice.metrics.oxygenLevel}</span>
                  <span className="vital-unit">% O2</span>
                </div>
                <div className="vital-card">
                  <span className="vital-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </span>
                  <span className="vital-value">{selectedDevice.metrics.bloodPressure?.systolic || 120}/{selectedDevice.metrics.bloodPressure?.diastolic || 80}</span>
                  <span className="vital-unit">mmHg</span>
                </div>
                <div className="vital-card">
                  <span className="vital-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2">
                      <rect x="6" y="2" width="12" height="20" rx="2" ry="2"/>
                      <line x1="6" y1="6" x2="18" y2="6"/>
                    </svg>
                  </span>
                  <span className="vital-value">{selectedDevice.battery}</span>
                  <span className="vital-unit">%</span>
                </div>
              </div>
              <div className="selected-details">
                <div className="detail-row">
                  <span>Device:</span>
                  <span>{selectedDevice.deviceType?.replace('_', ' ')}</span>
                </div>
                <div className="detail-row">
                  <span>Coordinates:</span>
                  <span>{selectedDevice.lat?.toFixed(4)}, {selectedDevice.lng?.toFixed(4)}</span>
                </div>
                <div className="detail-row">
                  <span>Last Update:</span>
                  <span>{currentTime.toLocaleTimeString()}</span>
                </div>
              </div>
              <div className="selected-actions">
                <button className="action-btn primary" onClick={() => openProfile(selectedDevice.id)}>
                  Open Full Profile
                </button>
                <button className="action-btn">Contact User</button>
                <button className="action-btn emergency">Dispatch Emergency</button>
              </div>
            </div>
          )}

          {activePanel === 'selected' && !selectedDevice && (
            <div className="no-selection">
              <span className="no-selection-icon">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </span>
              <p>Select a device from the map or list to view details</p>
            </div>
          )}
        </div>
      </div>

      <div className="status-bar">
        <div className="status-left">
          <span className="status-item">
            <span className="status-dot online"></span>
            Connected to eVida Network
          </span>
          <span className="status-item">Region: North America</span>
          <span className="status-item">Nodes: 24 Active</span>
        </div>
        <div className="status-right">
          <span className="status-item">API: Healthy</span>
          <span className="status-item">Latency: 42ms</span>
          <span className="status-item">Uptime: 99.9%</span>
        </div>
      </div>
    </div>
  )
}
