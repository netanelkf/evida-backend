// Alert Settings Page - Configure alert thresholds and rules

import { useState, useEffect } from 'react'
import { getAlertSettings, saveAlertSettings } from '../services/api'
import './AlertSettingsPage.css'

export default function AlertSettingsPage() {
  const [settings, setSettings] = useState({
    heartRate: {
      enabled: true,
      minBpm: 50,
      maxBpm: 120
    },
    oxygenLevel: {
      enabled: true,
      minPercent: 92
    },
    inactivity: {
      enabled: true,
      durationMinutes: 60
    },
    fallDetection: {
      enabled: true,
      sensitivity: 'medium'
    },
    temperature: {
      enabled: false,
      minTemp: 35.5,
      maxTemp: 38.5
    },
    geofencing: {
      enabled: false,
      zones: []
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState('heartRate')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await getAlertSettings()
      if (data) {
        setSettings(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      console.error('Error loading alert settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await saveAlertSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }))
  }

  const toggleCategory = (category) => {
    updateSetting(category, 'enabled', !settings[category].enabled)
  }

  if (loading) {
    return (
      <div className="page alert-settings-page">
        <div className="loading">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="page alert-settings-page">
      <div className="page-header">
        <h1>Alert Settings</h1>
        <p>Configure when you want to be alerted about health changes</p>
      </div>

      <div className="settings-layout">
        {/* Settings Navigation */}
        <div className="settings-nav">
          <button
            className={`nav-item ${activeSection === 'heartRate' ? 'active' : ''}`}
            onClick={() => setActiveSection('heartRate')}
          >
            <span className="nav-icon">❤️</span>
            <span className="nav-label">Heart Rate</span>
            <span className={`nav-status ${settings.heartRate.enabled ? 'on' : 'off'}`}>
              {settings.heartRate.enabled ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            className={`nav-item ${activeSection === 'oxygenLevel' ? 'active' : ''}`}
            onClick={() => setActiveSection('oxygenLevel')}
          >
            <span className="nav-icon">🫁</span>
            <span className="nav-label">Oxygen Level</span>
            <span className={`nav-status ${settings.oxygenLevel.enabled ? 'on' : 'off'}`}>
              {settings.oxygenLevel.enabled ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            className={`nav-item ${activeSection === 'inactivity' ? 'active' : ''}`}
            onClick={() => setActiveSection('inactivity')}
          >
            <span className="nav-icon">🧘</span>
            <span className="nav-label">Inactivity</span>
            <span className={`nav-status ${settings.inactivity.enabled ? 'on' : 'off'}`}>
              {settings.inactivity.enabled ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            className={`nav-item ${activeSection === 'fallDetection' ? 'active' : ''}`}
            onClick={() => setActiveSection('fallDetection')}
          >
            <span className="nav-icon">🚨</span>
            <span className="nav-label">Fall Detection</span>
            <span className={`nav-status ${settings.fallDetection.enabled ? 'on' : 'off'}`}>
              {settings.fallDetection.enabled ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            className={`nav-item ${activeSection === 'temperature' ? 'active' : ''}`}
            onClick={() => setActiveSection('temperature')}
          >
            <span className="nav-icon">🌡️</span>
            <span className="nav-label">Temperature</span>
            <span className={`nav-status ${settings.temperature.enabled ? 'on' : 'off'}`}>
              {settings.temperature.enabled ? 'ON' : 'OFF'}
            </span>
          </button>

          <button
            className={`nav-item ${activeSection === 'geofencing' ? 'active' : ''}`}
            onClick={() => setActiveSection('geofencing')}
          >
            <span className="nav-icon">📍</span>
            <span className="nav-label">Safe Zone</span>
            <span className={`nav-status ${settings.geofencing.enabled ? 'on' : 'off'}`}>
              {settings.geofencing.enabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          {/* Heart Rate Settings */}
          {activeSection === 'heartRate' && (
            <div className="setting-panel">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="panel-icon">❤️</span>
                  <div>
                    <h2>Heart Rate Alerts</h2>
                    <p>Get notified when heart rate goes outside your safe range</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.heartRate.enabled}
                    onChange={() => toggleCategory('heartRate')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className={`panel-body ${!settings.heartRate.enabled ? 'disabled' : ''}`}>
                <div className="threshold-group">
                  <div className="threshold-item">
                    <label>Minimum Heart Rate</label>
                    <div className="threshold-input">
                      <input
                        type="range"
                        min="30"
                        max="80"
                        value={settings.heartRate.minBpm}
                        onChange={(e) => updateSetting('heartRate', 'minBpm', parseInt(e.target.value))}
                        disabled={!settings.heartRate.enabled}
                      />
                      <span className="threshold-value">{settings.heartRate.minBpm} BPM</span>
                    </div>
                    <p className="threshold-desc">Alert if heart rate drops below this value</p>
                  </div>

                  <div className="threshold-item">
                    <label>Maximum Heart Rate</label>
                    <div className="threshold-input">
                      <input
                        type="range"
                        min="80"
                        max="200"
                        value={settings.heartRate.maxBpm}
                        onChange={(e) => updateSetting('heartRate', 'maxBpm', parseInt(e.target.value))}
                        disabled={!settings.heartRate.enabled}
                      />
                      <span className="threshold-value">{settings.heartRate.maxBpm} BPM</span>
                    </div>
                    <p className="threshold-desc">Alert if heart rate exceeds this value</p>
                  </div>
                </div>

                <div className="preview-box">
                  <span className="preview-label">Current Range</span>
                  <div className="range-visual">
                    <span className="range-low">{settings.heartRate.minBpm}</span>
                    <div className="range-bar">
                      <div className="range-safe"></div>
                    </div>
                    <span className="range-high">{settings.heartRate.maxBpm}</span>
                  </div>
                  <p>Safe zone: {settings.heartRate.minBpm} - {settings.heartRate.maxBpm} BPM</p>
                </div>
              </div>
            </div>
          )}

          {/* Oxygen Level Settings */}
          {activeSection === 'oxygenLevel' && (
            <div className="setting-panel">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="panel-icon">🫁</span>
                  <div>
                    <h2>Oxygen Level Alerts</h2>
                    <p>Get notified when blood oxygen drops too low</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.oxygenLevel.enabled}
                    onChange={() => toggleCategory('oxygenLevel')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className={`panel-body ${!settings.oxygenLevel.enabled ? 'disabled' : ''}`}>
                <div className="threshold-group">
                  <div className="threshold-item">
                    <label>Minimum Oxygen Level</label>
                    <div className="threshold-input">
                      <input
                        type="range"
                        min="80"
                        max="98"
                        value={settings.oxygenLevel.minPercent}
                        onChange={(e) => updateSetting('oxygenLevel', 'minPercent', parseInt(e.target.value))}
                        disabled={!settings.oxygenLevel.enabled}
                      />
                      <span className="threshold-value">{settings.oxygenLevel.minPercent}%</span>
                    </div>
                    <p className="threshold-desc">Alert if oxygen saturation drops below this level</p>
                  </div>
                </div>

                <div className="info-box warning">
                  <span className="info-icon">⚠️</span>
                  <div>
                    <strong>Medical Guidance</strong>
                    <p>Normal oxygen levels are typically 95-100%. Levels below 90% may require immediate medical attention.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inactivity Settings */}
          {activeSection === 'inactivity' && (
            <div className="setting-panel">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="panel-icon">🧘</span>
                  <div>
                    <h2>Inactivity Alerts</h2>
                    <p>Get notified after extended periods without movement</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.inactivity.enabled}
                    onChange={() => toggleCategory('inactivity')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className={`panel-body ${!settings.inactivity.enabled ? 'disabled' : ''}`}>
                <div className="threshold-group">
                  <div className="threshold-item">
                    <label>Inactivity Duration</label>
                    <div className="threshold-input">
                      <input
                        type="range"
                        min="15"
                        max="180"
                        step="15"
                        value={settings.inactivity.durationMinutes}
                        onChange={(e) => updateSetting('inactivity', 'durationMinutes', parseInt(e.target.value))}
                        disabled={!settings.inactivity.enabled}
                      />
                      <span className="threshold-value">{settings.inactivity.durationMinutes} min</span>
                    </div>
                    <p className="threshold-desc">Alert after this many minutes of no movement detected</p>
                  </div>
                </div>

                <div className="preset-buttons">
                  <span>Quick set:</span>
                  {[30, 60, 90, 120].map(mins => (
                    <button
                      key={mins}
                      className={`preset-btn ${settings.inactivity.durationMinutes === mins ? 'active' : ''}`}
                      onClick={() => updateSetting('inactivity', 'durationMinutes', mins)}
                      disabled={!settings.inactivity.enabled}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Fall Detection Settings */}
          {activeSection === 'fallDetection' && (
            <div className="setting-panel">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="panel-icon">🚨</span>
                  <div>
                    <h2>Fall Detection</h2>
                    <p>Automatically detect falls and send alerts</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.fallDetection.enabled}
                    onChange={() => toggleCategory('fallDetection')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className={`panel-body ${!settings.fallDetection.enabled ? 'disabled' : ''}`}>
                <div className="threshold-group">
                  <div className="threshold-item">
                    <label>Detection Sensitivity</label>
                    <div className="sensitivity-options">
                      {['low', 'medium', 'high'].map(level => (
                        <button
                          key={level}
                          className={`sensitivity-btn ${settings.fallDetection.sensitivity === level ? 'active' : ''}`}
                          onClick={() => updateSetting('fallDetection', 'sensitivity', level)}
                          disabled={!settings.fallDetection.enabled}
                        >
                          <span className="sens-label">{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                          <span className="sens-desc">
                            {level === 'low' && 'Fewer alerts, may miss some falls'}
                            {level === 'medium' && 'Balanced detection'}
                            {level === 'high' && 'More alerts, better detection'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="info-box">
                  <span className="info-icon">ℹ️</span>
                  <div>
                    <strong>How it works</strong>
                    <p>Your wearable device uses motion sensors to detect sudden falls. If detected, you'll have 30 seconds to cancel the alert before emergency contacts are notified.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Temperature Settings */}
          {activeSection === 'temperature' && (
            <div className="setting-panel">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="panel-icon">🌡️</span>
                  <div>
                    <h2>Temperature Alerts</h2>
                    <p>Monitor body temperature for fever or hypothermia</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.temperature.enabled}
                    onChange={() => toggleCategory('temperature')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className={`panel-body ${!settings.temperature.enabled ? 'disabled' : ''}`}>
                <div className="threshold-group">
                  <div className="threshold-item">
                    <label>Minimum Temperature</label>
                    <div className="threshold-input">
                      <input
                        type="range"
                        min="34"
                        max="37"
                        step="0.5"
                        value={settings.temperature.minTemp}
                        onChange={(e) => updateSetting('temperature', 'minTemp', parseFloat(e.target.value))}
                        disabled={!settings.temperature.enabled}
                      />
                      <span className="threshold-value">{settings.temperature.minTemp}°C</span>
                    </div>
                    <p className="threshold-desc">Alert for potential hypothermia</p>
                  </div>

                  <div className="threshold-item">
                    <label>Maximum Temperature</label>
                    <div className="threshold-input">
                      <input
                        type="range"
                        min="37"
                        max="42"
                        step="0.5"
                        value={settings.temperature.maxTemp}
                        onChange={(e) => updateSetting('temperature', 'maxTemp', parseFloat(e.target.value))}
                        disabled={!settings.temperature.enabled}
                      />
                      <span className="threshold-value">{settings.temperature.maxTemp}°C</span>
                    </div>
                    <p className="threshold-desc">Alert for fever</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Geofencing Settings */}
          {activeSection === 'geofencing' && (
            <div className="setting-panel">
              <div className="panel-header">
                <div className="panel-title">
                  <span className="panel-icon">📍</span>
                  <div>
                    <h2>Safe Zone (Geofencing)</h2>
                    <p>Get notified when leaving a designated safe area</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.geofencing.enabled}
                    onChange={() => toggleCategory('geofencing')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className={`panel-body ${!settings.geofencing.enabled ? 'disabled' : ''}`}>
                <div className="geofence-setup">
                  <div className="geofence-map-placeholder">
                    <span className="map-icon">🗺️</span>
                    <p>Safe Zone Map</p>
                    <span className="map-hint">Tap to set your safe zone location</span>
                  </div>

                  <div className="geofence-options">
                    <div className="threshold-item">
                      <label>Safe Zone Radius</label>
                      <div className="radius-buttons">
                        {[100, 250, 500, 1000].map(radius => (
                          <button
                            key={radius}
                            className="radius-btn"
                            disabled={!settings.geofencing.enabled}
                          >
                            {radius >= 1000 ? `${radius/1000}km` : `${radius}m`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="info-box">
                  <span className="info-icon">ℹ️</span>
                  <div>
                    <strong>About Safe Zones</strong>
                    <p>Set a home location or care facility. You'll be notified if the wearer leaves this area, which is helpful for dementia care or child safety.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="settings-footer">
        <button
          className="btn btn-primary save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
