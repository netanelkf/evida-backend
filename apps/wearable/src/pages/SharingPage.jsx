// Sharing Page - Manage trusted contacts and dispatch center sharing

import { useState, useEffect } from 'react'
import { getShareSettings, updateShareSettings, addTrustedContact, removeTrustedContact } from '../services/api'
import './SharingPage.css'

export default function SharingPage() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddContact, setShowAddContact] = useState(false)
  const [newContact, setNewContact] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    canReceiveAlerts: true
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await getShareSettings()
      setSettings(data)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (key) => {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    try {
      await updateShareSettings({ [key]: !settings[key] })
    } catch (error) {
      console.error('Error updating settings:', error)
      setSettings(settings) // Revert on error
    }
  }

  const handleAddContact = async (e) => {
    e.preventDefault()
    try {
      await addTrustedContact(newContact)
      await loadSettings()
      setShowAddContact(false)
      setNewContact({
        name: '',
        relationship: '',
        phone: '',
        email: '',
        canReceiveAlerts: true
      })
    } catch (error) {
      console.error('Error adding contact:', error)
    }
  }

  const handleRemoveContact = async (contactId) => {
    if (window.confirm('Are you sure you want to remove this contact?')) {
      try {
        await removeTrustedContact(contactId)
        await loadSettings()
      } catch (error) {
        console.error('Error removing contact:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    )
  }

  return (
    <div className="page sharing-page">
      <div className="page-header">
        <h1>Sharing Settings</h1>
        <p>Control who can access your health data</p>
      </div>

      {/* Dispatch Center Sharing */}
      <div className="card sharing-card">
        <div className="sharing-header">
          <div className="sharing-info">
            <h2>🚑 Dispatch Center</h2>
            <p>Share your data with emergency response centers</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.shareWithDispatch}
              onChange={() => handleToggle('shareWithDispatch')}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {settings.shareWithDispatch && (
          <div className="sub-options">
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={settings.shareHealthData}
                onChange={() => handleToggle('shareHealthData')}
              />
              <span>Share health metrics (heart rate, oxygen, etc.)</span>
            </label>
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={settings.shareLocation}
                onChange={() => handleToggle('shareLocation')}
              />
              <span>Share real-time location</span>
            </label>
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={settings.emergencyAutoCall}
                onChange={() => handleToggle('emergencyAutoCall')}
              />
              <span>Auto-call 911 on critical alerts</span>
            </label>
          </div>
        )}
      </div>

      {/* Trusted Contacts */}
      <div className="card">
        <div className="contacts-header">
          <h2>👥 Trusted Contacts</h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddContact(true)}
          >
            + Add Contact
          </button>
        </div>

        <p className="contacts-desc">
          These people will be notified in case of emergency alerts
        </p>

        <div className="contacts-list">
          {settings.trustedContacts.map((contact) => (
            <div key={contact.id} className="contact-card">
              <div className="contact-avatar">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div className="contact-info">
                <h3>{contact.name}</h3>
                <p className="contact-relationship">{contact.relationship}</p>
                <div className="contact-details">
                  <span>📞 {contact.phone}</span>
                  <span>✉️ {contact.email}</span>
                </div>
              </div>
              <div className="contact-actions">
                <span className={`alert-status ${contact.canReceiveAlerts ? 'active' : ''}`}>
                  {contact.canReceiveAlerts ? '🔔 Alerts ON' : '🔕 Alerts OFF'}
                </span>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => handleRemoveContact(contact.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add Trusted Contact</h2>
            <form onSubmit={handleAddContact}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Relationship</label>
                <input
                  type="text"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
                  placeholder="e.g., Spouse, Doctor, Parent"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  required
                />
              </div>
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={newContact.canReceiveAlerts}
                  onChange={(e) => setNewContact({...newContact, canReceiveAlerts: e.target.checked})}
                />
                <span>Can receive emergency alerts</span>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddContact(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
