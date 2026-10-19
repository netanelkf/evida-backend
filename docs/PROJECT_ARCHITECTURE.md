# Medical Emergency Wearable Platform - Architecture

## Project Overview

Two-part system for emergency health monitoring and dispatch:
1. **Wearable App**: User-facing application connecting to health wearables
2. **Dispatch Center**: Command center with real-time device tracking and management

## Tech Stack

### Backend (Shared)
- **Framework**: Express.js (Node.js)
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket support for live updates
- **Authentication**: JWT + Session-based
- **File uploads**: For health reports/exports
- **Maps**: Leaflet/Mapbox for geolocation

### Frontend - Wearable App
- **Framework**: React with Vite
- **UI**: Modern responsive design
- **Real-time updates**: WebSocket client
- **Data visualization**: Health metrics charts

### Frontend - Dispatch Center  
- **Framework**: React with Vite
- **Maps**: Interactive map with device tracking
- **Real-time**: WebSocket for live device updates
- **Status monitoring**: Device health and user status

## Project Structure

```
/apps/wearable/           - User wearable app
  /src
    /components           - React components
    /pages               - Screen pages
    /services            - API calls
    /hooks               - Custom React hooks
    /utils               - Utilities
  package.json
  vite.config.ts

/apps/dispatch-center/    - Dispatch center app
  /src
    /components          - React components
    /pages              - Dashboard pages
    /services           - API calls
    /utils              - Utilities
  package.json
  vite.config.ts

/backend/                - Shared backend API
  /src
    /routes             - API endpoints
    /db                 - Database schemas & migrations
    /middleware         - Auth, validation, etc
    /services           - Business logic
    /utils              - Helpers
  index.js
  package.json

/database/              - Database setup
  schema.sql           - PostgreSQL schema
  migrations/          - DB migrations
```

## Wearable App - Required Screens

1. **Login/Register Screen** - User authentication
2. **Dashboard** - Real-time health metrics display
3. **Device Connection** - Connect/manage wearables (Fitbit, Apple Watch, Garmin)
4. **Alerts Screen** - Emergency alerts and notifications
5. **Data History** - Past health data and trends
6. **Sharing Settings** - Share data with trusted contacts and dispatch
7. **Reports Screen** - Download/export user health data

## Dispatch Center - Features

1. **Map Dashboard** - Real-time device locations
2. **Device Status Board** - All connected devices status
3. **Alert Management** - View and respond to emergency alerts
4. **User Directory** - Search and manage connected users
5. **Report Generation** - Analytics and incident reports

## Wearable Integrations

1. **Fitbit** - OAuth 2.0 integration for heart rate, sleep, activity
2. **Apple Watch** - HealthKit framework integration
3. **Garmin** - OAuth integration for fitness data

## Database Schema - Core Tables

- **users** - User accounts
- **wearables** - Connected wearable devices
- **wearable_tokens** - OAuth tokens for each wearable
- **health_metrics** - Time-series health data
- **trusted_contacts** - Emergency contacts
- **alerts** - Emergency alerts log
- **locations** - Real-time user locations
- **shared_data** - Data sharing permissions

## API Structure

### Authentication Routes
- POST /auth/register
- POST /auth/login
- POST /auth/logout
- POST /auth/refresh

### User Routes
- GET /api/users/profile
- PUT /api/users/profile
- GET /api/users/trusted-contacts
- POST /api/users/trusted-contacts

### Wearable Routes
- GET /api/wearables
- POST /api/wearables/connect/:type (fitbit, apple, garmin)
- DELETE /api/wearables/:id
- GET /api/wearables/:id/data

### Health Data Routes
- GET /api/health/metrics
- GET /api/health/history
- GET /api/health/alerts

### Dispatch Routes (Protected)
- GET /api/dispatch/devices
- GET /api/dispatch/devices/:id/location
- GET /api/dispatch/alerts
- POST /api/dispatch/alerts/:id/respond
- GET /api/dispatch/analytics

### Sharing Routes
- POST /api/sharing/settings
- GET /api/sharing/permissions
- POST /api/sharing/grant
- DELETE /api/sharing/:id

## Real-time Features (WebSocket)

- Device location updates (every 5-10 seconds)
- Health metric broadcasts (real-time)
- Emergency alert notifications
- Device connection/disconnection status

## Security Considerations

1. **JWT Tokens** - API authentication
2. **OAuth 2.0** - Wearable integrations
3. **Data Encryption** - Sensitive health data
4. **Role-Based Access** - User vs Dispatch vs Admin
5. **HIPAA Compliance** - Health data handling

## Deployment Strategy

- **Backend**: Replit (Express server)
- **Wearable App**: Replit (Vite + React)
- **Dispatch Center**: Separate Replit project or same server
- **Database**: Replit PostgreSQL
- **Maps**: Mapbox/Leaflet (free tier)

## Phase 1 Implementation Focus

- Core authentication system
- Database schema
- Fitbit integration (proof of concept)
- Basic dashboard with health metrics
- Emergency alert mechanism
- Basic dispatch center with device list

## Next Steps

1. Set up database schema
2. Initialize backend Express server
3. Set up wearable React app
4. Set up dispatch center React app
5. Implement core authentication
6. Integrate Fitbit API
7. Build screens progressively
