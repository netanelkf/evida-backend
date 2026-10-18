// Reports Page - Download health reports as PDF/CSV

import { useState } from 'react'
import { downloadReport } from '../services/api'
import './ReportsPage.css'

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(false)
  const [format, setFormat] = useState('pdf')
  const [downloadComplete, setDownloadComplete] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    setDownloadComplete(false)

    try {
      if (format === 'pdf') {
        // For PDF, we need to fetch as blob
        const response = await fetch(`/api/reports?format=pdf`)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'evida-health-report.pdf'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        const data = await downloadReport(format)

        // Create blob and download
        const blob = new Blob([format === 'json' ? JSON.stringify(data, null, 2) : data], {
          type: format === 'csv' ? 'text/csv' : 'application/json'
        })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `evida-health-report.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }

      setDownloadComplete(true)
      setTimeout(() => setDownloadComplete(false), 3000)
    } catch (error) {
      console.error('Error downloading report:', error)
      alert('Failed to download report. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="page reports-page">
      <div className="page-header">
        <h1>Health Reports</h1>
        <p>Download your health data for personal records or sharing with doctors</p>
      </div>

      <div className="reports-grid">
        {/* Main Download Card */}
        <div className="card download-card">
          <div className="download-icon">📄</div>
          <h2>Download Health Report</h2>
          <p>
            Get a comprehensive report of your health metrics, including heart rate,
            oxygen levels, activity data, and any triggered alerts.
          </p>

          <div className="format-selector">
            <label>Select Format:</label>
            <div className="format-options">
              <button
                className={`format-btn ${format === 'pdf' ? 'active' : ''}`}
                onClick={() => setFormat('pdf')}
              >
                📑 PDF Report
              </button>
              <button
                className={`format-btn ${format === 'csv' ? 'active' : ''}`}
                onClick={() => setFormat('csv')}
              >
                📊 CSV (Excel)
              </button>
              <button
                className={`format-btn ${format === 'json' ? 'active' : ''}`}
                onClick={() => setFormat('json')}
              >
                📋 JSON (Data)
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary download-btn"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <span className="spinner-small"></span>
                Generating Report...
              </>
            ) : (
              <>
                ⬇️ Download Report
              </>
            )}
          </button>

          {downloadComplete && (
            <div className="success-message">
              ✓ Report downloaded successfully!
            </div>
          )}
        </div>

        {/* Report Info */}
        <div className="report-info">
          <div className="card info-card">
            <h3>📋 What's Included</h3>
            <ul>
              <li>Current health metrics snapshot</li>
              <li>Last 7 days of historical data</li>
              <li>All triggered health alerts</li>
              <li>Device connection status</li>
            </ul>
          </div>

          <div className="card info-card">
            <h3>🔒 Privacy & Security</h3>
            <p>
              Your health data is sensitive. Downloaded reports are not stored
              on our servers and are only available to you.
            </p>
          </div>

          <div className="card info-card">
            <h3>👨‍⚕️ For Your Doctor</h3>
            <p>
              Share the PDF report with your healthcare provider for a comprehensive
              overview of your health trends.
            </p>
          </div>
        </div>
      </div>

      {/* Report Types */}
      <div className="card">
        <h2>Available Reports</h2>
        <div className="report-types">
          <div className="report-type">
            <span className="report-type-icon">📑</span>
            <div className="report-type-info">
              <h3>PDF Report</h3>
              <p>Professional formatted document. Best for printing and sharing with healthcare providers.</p>
            </div>
            <span className="file-size">~50 KB</span>
          </div>

          <div className="report-type">
            <span className="report-type-icon">📊</span>
            <div className="report-type-info">
              <h3>CSV Report</h3>
              <p>Excel-compatible spreadsheet format. Best for data analysis and charting.</p>
            </div>
            <span className="file-size">~10 KB</span>
          </div>

          <div className="report-type">
            <span className="report-type-icon">📋</span>
            <div className="report-type-info">
              <h3>JSON Report</h3>
              <p>Structured data format. Best for integration with other health apps.</p>
            </div>
            <span className="file-size">~15 KB</span>
          </div>
        </div>
      </div>
    </div>
  )
}
