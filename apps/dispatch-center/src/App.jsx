// eVida Dispatch Center - Main Application Component

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UserProfilePage from './pages/UserProfilePage'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('dispatch_token')
    const savedUser = localStorage.getItem('dispatch_user')
    if (token && savedUser) {
      setIsAuthenticated(true)
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const handleLogin = (userData, token) => {
    localStorage.setItem('dispatch_token', token)
    localStorage.setItem('dispatch_user', JSON.stringify(userData))
    setUser(userData)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('dispatch_token')
    localStorage.removeItem('dispatch_user')
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ?
              <Navigate to="/" /> :
              <LoginPage onLogin={handleLogin} />
            }
          />
          <Route
            path="/"
            element={
              isAuthenticated ?
              <DashboardPage user={user} onLogout={handleLogout} /> :
              <Navigate to="/login" />
            }
          />
          <Route
            path="/user/:id"
            element={
              isAuthenticated ?
              <UserProfilePage onLogout={handleLogout} /> :
              <Navigate to="/login" />
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
