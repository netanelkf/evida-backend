import { useState, useEffect } from 'react'
import { dispatchLogin } from '../services/api'
import './LoginPage.css'

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const UnlockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
  </svg>
)

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await dispatchLogin(username, password)

      if (response.success) {
        onLogin(response.user, response.token)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Check credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dispatch-login">
      <div className="login-bg-grid"></div>

      <div className="login-status-bar">
        <div className="status-left">
          <span className="status-indicator"></span>
          <span>SECURE CONNECTION ESTABLISHED</span>
        </div>
        <div className="status-right">
          <span>{currentTime.toLocaleTimeString()}</span>
          <span>{currentTime.toLocaleDateString()}</span>
        </div>
      </div>

      <div className="login-terminal">
        <div className="terminal-header">
          <div className="terminal-controls">
            <span className="control close"></span>
            <span className="control minimize"></span>
            <span className="control maximize"></span>
          </div>
          <span className="terminal-title">eVida Dispatch Command Center - Authentication</span>
        </div>

        <div className="terminal-body">
          <div className="terminal-logo">
            <div className="logo-icon">
              <span className="logo-cross">+</span>
            </div>
            <div className="logo-text">
              <span className="logo-main">eVida</span>
              <span className="logo-sub">DISPATCH COMMAND CENTER</span>
            </div>
          </div>

          <div className="terminal-info">
            <div className="info-line">
              <span className="info-label">SYSTEM:</span>
              <span className="info-value">Emergency Response Network v2.1.0</span>
            </div>
            <div className="info-line">
              <span className="info-label">REGION:</span>
              <span className="info-value">North America Central</span>
            </div>
            <div className="info-line">
              <span className="info-label">STATUS:</span>
              <span className="info-value online">OPERATIONAL</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">
                <span className="label-icon"><UserIcon /></span>
                OPERATOR ID
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter operator ID"
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <span className="label-icon"><LockIcon /></span>
                ACCESS CODE
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access code"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon"><AlertIcon /></span>
                {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="btn-spinner"></span>
                  AUTHENTICATING...
                </>
              ) : (
                <>
                  <span className="btn-icon"><UnlockIcon /></span>
                  AUTHORIZE ACCESS
                </>
              )}
            </button>
          </form>

          <div className="terminal-footer">
            <div className="security-notice">
              <span className="notice-icon"><ShieldIcon /></span>
              <span>256-bit encrypted connection</span>
            </div>
          </div>
        </div>
      </div>

      <div className="login-footer">
        <span>eVida Medical Emergency Platform</span>
        <span>•</span>
        <span>Authorized Personnel Only</span>
      </div>
    </div>
  )
}
