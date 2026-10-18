// History Page - View historical health data with charts

import { useState, useEffect } from 'react'
import { getHistory } from '../services/api'
import './HistoryPage.css'

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState('steps')
  const [dataSource, setDataSource] = useState('mock')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const data = await getHistory()

      // Check if this is the new format with days array and has real data
      if (data.isRealData && data.allDays && data.allDays.length > 0) {
        // Use allDays to show all available historical data
        const converted = data.allDays.map(day => ({
          date: day.date,
          dayName: new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
          steps: day.steps || 0,
          calories: day.calories || 0,
          activeMinutes: day.activeMinutes || 0,
          sleepHours: day.sleep || 0,
          hasData: (day.steps > 0 || day.calories > 0 || day.sleep > 0)
        })).filter(d => d.hasData) // Only show days with actual data

        if (converted.length > 0) {
          setHistory(converted)
          setDataSource('live')
        } else {
          // No days with data, show message
          setHistory([])
          setDataSource('no-data')
        }
      } else if (data.days && Array.isArray(data.days)) {
        const converted = data.days.map(day => ({
          date: day.date,
          dayName: new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
          steps: day.steps || 0,
          calories: day.calories || 0,
          activeMinutes: day.activeMinutes || 0,
          sleepHours: day.sleep || 0,
          hasData: (day.steps > 0 || day.calories > 0 || day.sleep > 0)
        }))
        setHistory(converted)
        setDataSource(data.isRealData ? 'live' : 'mock')
      } else {
        setHistory(convertMockData(data))
        setDataSource('mock')
      }
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setLoading(false)
    }
  }

  const convertMockData = (mockData) => {
    const grouped = {}
    mockData.forEach(record => {
      if (!grouped[record.date]) {
        grouped[record.date] = {
          date: record.date,
          dayName: new Date(record.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
          steps: 0,
          calories: 0,
          heartRate: null,
          sleepHours: null,
          hasData: true
        }
      }
      grouped[record.date].steps += record.steps || 0
      if (record.heartRate) grouped[record.date].heartRate = record.heartRate
    })
    return Object.values(grouped).slice(0, 7)
  }

  const getMetricData = () => {
    return history.map(h => ({
      date: h.date,
      dayName: h.dayName,
      value: metric === 'steps' ? h.steps
           : metric === 'calories' ? h.calories
           : metric === 'activeMinutes' ? h.activeMinutes
           : metric === 'sleepHours' ? (parseFloat(h.sleepHours) || 0)
           : h[metric] || 0,
      hasData: h.hasData
    }))
  }

  const getMaxValue = () => {
    const values = getMetricData().map(d => d.value).filter(v => v > 0)
    return values.length > 0 ? Math.max(...values) : 1
  }

  const getTotal = () => {
    const values = getMetricData().map(d => d.value)
    return values.reduce((a, b) => a + b, 0)
  }

  const getAverage = () => {
    const values = getMetricData().map(d => d.value).filter(v => v > 0)
    if (values.length === 0) return 0
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    return metric === 'sleepHours' ? avg.toFixed(1) : Math.round(avg)
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    )
  }

  const metricData = getMetricData()
  const maxVal = getMaxValue()

  const metricConfig = {
    steps: { label: 'Steps', unit: '', icon: '👣', color: '#3b82f6' },
    calories: { label: 'Calories', unit: 'kcal', icon: '🔥', color: '#ef4444' },
    activeMinutes: { label: 'Active Minutes', unit: 'min', icon: '⚡', color: '#22c55e' },
    sleepHours: { label: 'Sleep', unit: 'hrs', icon: '😴', color: '#8b5cf6' }
  }

  const currentMetric = metricConfig[metric] || metricConfig.steps

  return (
    <div className="page history-page">
      <div className="page-header">
        <h1>Data History</h1>
        <p>Your health data from connected devices</p>
      </div>

      {dataSource === 'live' && (
        <div className="data-source-badge live">
          <span className="dot"></span>
          Real data from Fitbit
        </div>
      )}

      {dataSource === 'no-data' && (
        <div className="data-source-badge demo">
          No data yet - Sync your Fitbit to see your history
        </div>
      )}

      {dataSource === 'mock' && (
        <div className="data-source-badge demo">
          Demo data - Connect a device for real metrics
        </div>
      )}

      <div className="metric-selector">
        {Object.entries(metricConfig).map(([key, config]) => (
          <button
            key={key}
            className={`metric-btn ${metric === key ? 'active' : ''}`}
            onClick={() => setMetric(key)}
          >
            {config.icon} {config.label}
          </button>
        ))}
      </div>

      <div className="history-stats">
        <div className="stat-card">
          <span className="stat-label">7-Day Total</span>
          <span className="stat-value">
            {metric === 'sleepHours' ? getTotal().toFixed(1) : getTotal().toLocaleString()}
            <span className="stat-unit">{currentMetric.unit}</span>
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Daily Average</span>
          <span className="stat-value">
            {typeof getAverage() === 'string' ? getAverage() : getAverage().toLocaleString()}
            <span className="stat-unit">{currentMetric.unit}</span>
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Best Day</span>
          <span className="stat-value">
            {metric === 'sleepHours' ? maxVal.toFixed(1) : maxVal.toLocaleString()}
            <span className="stat-unit">{currentMetric.unit}</span>
          </span>
        </div>
      </div>

      <div className="chart-container card">
        <h2>{currentMetric.icon} {currentMetric.label}</h2>
        <div className="chart">
          <div className="chart-bars">
            {metricData.map((data, idx) => {
              const height = maxVal > 0 ? (data.value / maxVal) * 100 : 0
              return (
                <div
                  key={idx}
                  className="bar-wrapper"
                >
                  <div className="bar-value">
                    {metric === 'sleepHours' ? data.value.toFixed(1) : data.value.toLocaleString()}
                  </div>
                  <div
                    className={`bar ${data.hasData && data.value > 0 ? '' : 'empty'}`}
                    style={{
                      height: `${Math.max(height, 3)}%`,
                      backgroundColor: data.hasData && data.value > 0 ? currentMetric.color : '#e5e7eb'
                    }}
                  />
                  <div className="bar-label">{data.dayName}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="history-table card">
        <h2>Daily Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Steps</th>
              <th>Calories</th>
              <th>Active Min</th>
              <th>Sleep</th>
            </tr>
          </thead>
          <tbody>
            {history.map((record, idx) => (
              <tr key={idx} className={record.hasData ? '' : 'no-data'}>
                <td>
                  <div className="date-cell">
                    <span className="day-name">{record.dayName}</span>
                    <span className="date-value">{record.date}</span>
                  </div>
                </td>
                <td>{record.steps?.toLocaleString() || '--'}</td>
                <td>{record.calories || '--'}</td>
                <td>{record.activeMinutes || '--'}</td>
                <td>{record.sleepHours ? `${record.sleepHours}h` : '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
