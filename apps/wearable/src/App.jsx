// eVida Wearable App - Main Application Component
// Routes to all screens with React Router

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import DevicesPage from './pages/DevicesPage'
import AlertsPage from './pages/AlertsPage'
import AlertSettingsPage from './pages/AlertSettingsPage'
import HistoryPage from './pages/HistoryPage'
import SharingPage from './pages/SharingPage'
import ReportsPage from './pages/ReportsPage'
import FamilyDashboard from './pages/FamilyDashboard'
import OperatorPage from './pages/OperatorPage'
import Navigation from './components/Navigation'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [userType, setUserType] = useState('user') // 'user' or 'family'

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('evida_token')
    const savedUser = localStorage.getItem('evida_user')
    const savedUserType = localStorage.getItem('evida_user_type')
    if (token && savedUser) {
      setIsAuthenticated(true)
      setUser(JSON.parse(savedUser))
      setUserType(savedUserType || 'user')
    }
  }, [])

  const handleLogin = (userData, token, type = 'user') => {
    localStorage.setItem('evida_token', token)
    localStorage.setItem('evida_user', JSON.stringify(userData))
    localStorage.setItem('evida_user_type', type)
    setUser(userData)
    setUserType(type)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('evida_token')
    localStorage.removeItem('evida_user')
    localStorage.removeItem('evida_user_type')
    setUser(null)
    setUserType('user')
    setIsAuthenticated(false)
  }

  return (
    <BrowserRouter>
      <div className="app">
        {isAuthenticated && userType === 'user' && <Navigation user={user} onLogout={handleLogout} />}
        <main className={isAuthenticated && userType === 'user' ? 'main-content with-nav' : 'main-content'}>
          <Routes>
            <Route
              path="/login"
              element={
                isAuthenticated ?
                <Navigate to={userType === 'family' ? '/family' : '/home'} /> :
                <LoginPage onLogin={handleLogin} />
              }
            />
            <Route
              path="/home"
              element={
                isAuthenticated ?
                <HomePage user={user} /> :
                <Navigate to="/login" />
              }
            />
            <Route
              path="/connect"
              element={
                isAuthenticated ?
                <DevicesPage /> :
                <Navigate to="/login" />
              }
            />
            <Route
              path="/alerts"
              element={
                isAuthenticated ?
                <AlertsPage /> :
                <Navigate to="/login" />
              }
            />
            <Route
              path="/alert-settings"
              element={
                isAuthenticated ?
                <AlertSettingsPage /> :
                <Navigate to="/login" />
              }
            />
            <Route
              path="/family"
              element={
                isAuthenticated && userType === 'family' ?
                <FamilyDashboard user={user} onLogout={handleLogout} /> :
                <Navigate to="/login" />
              }
            />
            <Route
              path="/history"
              element={
                isAuthenticated ?
                <HistoryPage /> :
                <Navigate to="/login" />
              }
            />
            <Route
              path="/share"
              element={
                isAuthenticated ?
                <SharingPage /> :
                <Navigate to="/login" />
              }
            />
            <Route
              path="/reports"
              element={
                isAuthenticated ?
                <ReportsPage /> :
                <Navigate to="/login" />
              }
            />
            <Route
              path="/operator"
              element={<OperatorPage />}
            />
            <Route
              path="/"
              element={<Navigate to={isAuthenticated ? (userType === 'family' ? "/family" : "/home") : "/login"} />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
