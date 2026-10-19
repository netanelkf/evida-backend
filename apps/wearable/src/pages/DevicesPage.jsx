import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API_BASE } from '../services/api'
import './DevicesPage.css'

const POPULAR_DEVICES = [
  { name: 'Fitbit', source: 'fitbit', icon: 'fitbit' },
  { name: 'Garmin', source: 'garmin', icon: 'garmin' },
  { name: 'Oura Ring', source: 'oura', icon: 'oura' },
  { name: 'WHOOP', source: 'whoop', icon: 'whoop' },
  { name: 'Withings', source: 'withings', icon: 'withings' },
  { name: 'Polar', source: 'polar', icon: 'default' },
  { name: 'Apple Health', source: 'apple_health', icon: 'apple', comingSoon: true },
  { name: 'Health Connect', source: 'health_connect', icon: 'android', comingSoon: true },
]

const DEVICE_ICONS = {
  apple: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  ),
  android: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.44-.65-3.05-1.01-4.47-1.01s-3.03.36-4.47 1.01L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/>
    </svg>
  ),
  fitbit: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="4" r="2"/><circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="20" r="2"/>
      <circle cx="6" cy="8" r="1.5"/><circle cx="6" cy="16" r="1.5"/>
      <circle cx="18" cy="8" r="1.5"/><circle cx="18" cy="16" r="1.5"/>
    </svg>
  ),
  garmin: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  ),
  samsung: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="2"/>
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(60 12 12)"/>
      <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(120 12 12)"/>
    </svg>
  ),
  oura: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>
    </svg>
  ),
  whoop: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="8" width="16" height="8" rx="4"/>
    </svg>
  ),
  withings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
    </svg>
  ),
  default: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="12" r="4"/>
    </svg>
  )
}

export default function DevicesPage() {
  const [searchParams] = useSearchParams()
  const [connectedSources, setConnectedSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(null)
  const [message, setMessage] = useState(null)
  const [showAllDevices, setShowAllDevices] = useState(false)
  const [allDevices, setAllDevices] = useState([])

  useEffect(() => {
    loadData()

    const result = searchParams.get('device')
    if (result === 'success') {
      setMessage({ type: 'success', text: 'Device connected successfully! Your health data will sync automatically.' })
    } else if (result === 'error') {
      setMessage({ type: 'error', text: 'Connection failed. Please try again.' })
    }
  }, [searchParams])

  const loadData = async () => {
    try {
      const [devicesRes, sourcesRes] = await Promise.all([
        fetch(`${API_BASE}/api/rook/devices`),
        fetch(`${API_BASE}/api/rook/users/default/sources`)
      ])

      if (devicesRes.ok) {
        const data = await devicesRes.json()
        const devices = []
        Object.values(data.categories || {}).forEach(cat => {
          (cat.devices || []).forEach(d => devices.push(d))
        })
        setAllDevices(devices)
      }

      if (sourcesRes.ok) {
        const data = await sourcesRes.json()
        const connected = (data.sources || [])
          .filter(s => s.authorized)
          .map(s => s.data_source?.toLowerCase())
        setConnectedSources(connected)
      }
    } catch (error) {
      console.error('Error loading devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (device) => {
    if (device.comingSoon) {
      setMessage({ type: 'info', text: `${device.name} support is coming soon! We're building our mobile app.` })
      return
    }

    setConnecting(device.source)
    setMessage(null)

    try {
      await fetch(`${API_BASE}/api/rook/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default' })
      })

      const res = await fetch(`${API_BASE}/api/rook/users/default/authorize?dataSource=${device.source}`)
      const data = await res.json()

      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        setMessage({ type: 'error', text: 'Could not connect. Please try again.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection failed. Please try again.' })
    } finally {
      setConnecting(null)
    }
  }

  const isConnected = (source) => connectedSources.includes(source?.toLowerCase())

  const getRecommendedDevice = () => {
    return null
  }

  const recommended = getRecommendedDevice()

  if (loading) {
    return (
      <div className="devices-page">
        <div className="loading-state">
          <div className="loader"></div>
          <p>Finding your devices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="devices-page">
      {message && (
        <div className={`toast ${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>&times;</button>
        </div>
      )}

      {connectedSources.length > 0 ? (
        <div className="connected-hero">
          <div className="connected-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h1>{connectedSources.length} Device{connectedSources.length > 1 ? 's' : ''} Connected</h1>
          <p>Your health data is syncing automatically</p>
        </div>
      ) : (
        <div className="welcome-hero">
          <div className="hero-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <h1>Connect Your Health</h1>
          <p>Link your wearable or phone to start monitoring</p>
        </div>
      )}

      {recommended && !isConnected(recommended.source) && (
        <div className="recommended-section">
          <div className="recommended-label">
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
            Recommended for you
          </div>
          <button
            className="recommended-card"
            onClick={() => handleConnect(recommended)}
          >
            <div className="recommended-icon">
              {DEVICE_ICONS[recommended.icon] || DEVICE_ICONS.default}
            </div>
            <div className="recommended-info">
              <span className="recommended-name">{recommended.name}</span>
              <span className="recommended-desc">
                {platform === 'ios' ? 'Syncs Apple Watch, iPhone health data' : 'Syncs all Android wearables'}
              </span>
            </div>
            <div className="recommended-action">
              Connect
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </button>
        </div>
      )}

      <div className="devices-section">
        <h2>
          {connectedSources.length > 0 ? 'Add Another Device' : 'Choose Your Device'}
        </h2>

        <div className="devices-grid">
          {POPULAR_DEVICES.map((device) => {
            const connected = isConnected(device.source)
            const isLoading = connecting === device.source

            if (device.source === recommended?.source && !connected) return null

            return (
              <button
                key={device.source}
                className={`device-card ${connected ? 'connected' : ''} ${device.comingSoon ? 'coming-soon' : ''}`}
                onClick={() => !connected && handleConnect(device)}
                disabled={connected || isLoading}
              >
                <div className="device-icon">
                  {DEVICE_ICONS[device.icon] || DEVICE_ICONS.default}
                </div>
                <span className="device-name">{device.name}</span>
                {device.comingSoon && (
                  <span className="coming-soon-badge">Soon</span>
                )}
                {connected && (
                  <div className="connected-indicator">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                )}
                {isLoading && <div className="loading-indicator"></div>}
              </button>
            )
          })}
        </div>

        <button
          className="show-all-btn"
          onClick={() => setShowAllDevices(!showAllDevices)}
        >
          {showAllDevices ? 'Show Less' : `Show All ${allDevices.length}+ Devices`}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={showAllDevices ? 'rotated' : ''}>
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {showAllDevices && (
          <div className="all-devices-list">
            {allDevices.map((device, idx) => {
              const connected = isConnected(device.source)
              const isAppleHealth = device.source === 'apple_health'
              const isHealthConnect = device.source === 'health_connect'
              const isSamsungHealth = device.source === 'samsung_health'
              const comingSoon = isAppleHealth || isHealthConnect || isSamsungHealth

              return (
                <div key={idx} className={`all-device-item ${connected ? 'connected' : ''}`}>
                  <span>{device.name}</span>
                  {connected ? (
                    <span className="status-badge connected">Connected</span>
                  ) : comingSoon ? (
                    <span className="status-badge coming-soon">Coming Soon</span>
                  ) : (
                    <button
                      className="connect-mini-btn"
                      onClick={() => handleConnect(device)}
                    >
                      Connect
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="info-section">
        <div className="info-card">
          <div className="info-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
            </svg>
          </div>
          <div className="info-content">
            <strong>400+ Devices Supported</strong>
            <p>Works with Apple Watch, Fitbit, Garmin, Samsung, Oura, WHOOP, Dexcom, and more</p>
          </div>
        </div>
      </div>

    </div>
  )
}
