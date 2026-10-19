import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './Map.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const createCustomIcon = (status) => {
  const colors = {
    normal: '#22c55e',
    warning: '#eab308',
    critical: '#ef4444'
  }

  return L.divIcon({
    className: `custom-marker ${status}`,
    html: `
      <div class="marker-pin" style="background-color: ${colors[status]}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      ${status === 'critical' ? '<div class="marker-pulse"></div>' : ''}
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  })
}

function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], map.getZoom())
    }
  }, [center, map])
  return null
}

export default function Map({ devices, selectedDevice, onDeviceClick }) {
  const getCenter = () => {
    if (devices.length === 0) return { lat: 39.8283, lng: -98.5795 }
    const avgLat = devices.reduce((sum, d) => sum + d.lat, 0) / devices.length
    const avgLng = devices.reduce((sum, d) => sum + d.lng, 0) / devices.length
    return { lat: avgLat, lng: avgLng }
  }

  const center = getCenter()

  return (
    <div className="leaflet-map-wrapper">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {devices.map((device) => (
          <Marker
            key={device.id}
            position={[device.lat, device.lng]}
            icon={createCustomIcon(device.status)}
            eventHandlers={{
              click: () => onDeviceClick(device)
            }}
          >
            <Popup>
              <div className="map-popup">
                <div className="popup-header">
                  <strong>{device.name}</strong>
                  <span className={`status-tag ${device.status}`}>
                    {device.status.toUpperCase()}
                  </span>
                </div>
                <div className="popup-body">
                  <p className="popup-city">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {device.city}
                  </p>
                  <div className="popup-metrics">
                    <span className="metric">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                      {device.metrics.heartRate} bpm
                    </span>
                    <span className="metric">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      {device.metrics.oxygenLevel}% O2
                    </span>
                    <span className="metric">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                        <rect x="6" y="2" width="12" height="20" rx="2" ry="2"/>
                        <line x1="6" y1="6" x2="18" y2="6"/>
                      </svg>
                      {device.battery}%
                    </span>
                  </div>
                  <p className="popup-device">{device.deviceType.replace('_', ' ')}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {selectedDevice && (
          <MapUpdater center={{ lat: selectedDevice.lat, lng: selectedDevice.lng }} />
        )}
      </MapContainer>

      <div className="map-overlay-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
        <span>Live Device Tracking</span>
        <span className="update-indicator">Updating every 5s</span>
      </div>
    </div>
  )
}
