import { useState } from 'react'
import { login, signup, familyLogin } from '../services/api'
import './LoginPage.css'

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
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

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="m21 2-9.6 9.6"/>
    <path d="m15.5 7.5 3 3L22 7l-3-3"/>
  </svg>
)

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/>
    <path d="M12 8h.01"/>
  </svg>
)

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
)

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/>
    <path d="m12 5 7 7-7 7"/>
  </svg>
)

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
)

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
)

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  </svg>
)

export default function LoginPage({ onLogin }) {
  const [loginType, setLoginType] = useState('user')
  const [isSignup, setIsSignup] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUserSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isSignup) {
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          setLoading(false)
          return
        }
        const response = await signup(username, email, password, fullName, phone)
        if (response.success) {
          setSuccess('Account created! You can now sign in.')
          setIsSignup(false)
          setPassword('')
          setConfirmPassword('')
        }
      } else {
        const response = await login(username, password)
        if (response.success) {
          onLogin(response.user, response.token, 'user')
        }
      }
    } catch (err) {
      setError(err.message || (isSignup ? 'Failed to create account' : 'Invalid username or password'))
    } finally {
      setLoading(false)
    }
  }

  const handleFamilySubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await familyLogin(email, accessCode)
      if (response.success) {
        onLogin(response.user, response.token, 'family')
      }
    } catch (err) {
      setError(err.message || 'Invalid email or access code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-content">
          <h2>Health monitoring<br/>made simple.</h2>
          <p>Connect your wearable device and keep your loved ones informed about your health status in real-time.</p>

          <div className="login-features">
            <div className="login-feature">
              <div className="login-feature-icon">
                <ActivityIcon />
              </div>
              <div className="login-feature-text">
                <h4>Real-time Monitoring</h4>
                <p>Track heart rate, oxygen levels & more</p>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">
                <BellIcon />
              </div>
              <div className="login-feature-text">
                <h4>Instant Alerts</h4>
                <p>Get notified when metrics need attention</p>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">
                <ShieldIcon />
              </div>
              <div className="login-feature-text">
                <h4>Family Access</h4>
                <p>Share status with trusted contacts</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-container">
          <div className="login-header">
            <div className="login-brand">
              <div className="login-logo">
                <HeartIcon />
              </div>
              <h1>eVida</h1>
            </div>
            <p>Sign in to access your health dashboard</p>
          </div>

          <div className="login-tabs">
            <button
              className={`tab ${loginType === 'user' ? 'active' : ''}`}
              onClick={() => { setLoginType('user'); setError(''); }}
            >
              <span className="tab-icon"><WatchIcon /></span>
              <span>Wearable User</span>
            </button>
            <button
              className={`tab ${loginType === 'family' ? 'active' : ''}`}
              onClick={() => { setLoginType('family'); setError(''); }}
            >
              <span className="tab-icon"><UsersIcon /></span>
              <span>Family Member</span>
            </button>
          </div>

          {loginType === 'user' && (
            <form onSubmit={handleUserSubmit} className="login-form">
              {isSignup && (
                <div className="form-group">
                  <label htmlFor="fullName">Full Name</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><UserIcon /></span>
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="username">Username</label>
                <div className="input-wrapper">
                  <span className="input-icon"><UserIcon /></span>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {isSignup && (
                <>
                  <div className="form-group">
                    <label htmlFor="signupEmail">Email</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><MailIcon /></span>
                      <input
                        type="email"
                        id="signupEmail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone (optional)</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><UserIcon /></span>
                      <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter your phone number"
                        autoComplete="tel"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon"><LockIcon /></span>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete={isSignup ? "new-password" : "current-password"}
                  />
                </div>
              </div>

              {isSignup && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><LockIcon /></span>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="error-message">
                  <AlertIcon />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="success-message">
                  <ShieldIcon />
                  <span>{success}</span>
                </div>
              )}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  <span className="btn-spinner"></span>
                ) : (
                  <>
                    <span>{isSignup ? 'Create Account' : 'Sign In'}</span>
                    <ArrowRightIcon />
                  </>
                )}
              </button>

              <div className="auth-toggle">
                {isSignup ? (
                  <p>Already have an account? <button type="button" onClick={() => { setIsSignup(false); setError(''); setSuccess(''); }}>Sign In</button></p>
                ) : (
                  <p>New user? <button type="button" onClick={() => { setIsSignup(true); setError(''); setSuccess(''); }}>Create Account</button></p>
                )}
              </div>
            </form>
          )}

          {loginType === 'family' && (
            <form onSubmit={handleFamilySubmit} className="login-form">
              <div className="form-intro">
                <InfoIcon className="form-intro-icon" />
                <p>Access your loved one's health status using the credentials they shared with you.</p>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon"><MailIcon /></span>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="accessCode">Access Code</label>
                <div className="input-wrapper">
                  <span className="input-icon"><KeyIcon /></span>
                  <input
                    type="password"
                    id="accessCode"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Enter access code"
                    required
                    autoComplete="one-time-code"
                  />
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <AlertIcon />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="login-btn family" disabled={loading}>
                {loading ? (
                  <span className="btn-spinner"></span>
                ) : (
                  <>
                    <span>Access Family Portal</span>
                    <ArrowRightIcon />
                  </>
                )}
              </button>

              <div className="demo-hint">
                <p>Demo: <code>family@example.com</code> / <code>family123</code></p>
              </div>
            </form>
          )}

          <div className="login-footer">
            <p>eVida Medical Emergency Platform</p>
          </div>
        </div>
      </div>
    </div>
  )
}
