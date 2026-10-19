# eVida Medical Emergency Platform

## Overview
eVida is a comprehensive medical emergency platform featuring a wearable app for health monitoring, a dispatch command center for emergency response, and a family member portal for loved one monitoring. The platform aggregates health data from over 400 wearable devices via ROOK integration, focusing on real-time data for critical health events. Its core purpose is to provide timely health insights and facilitate rapid emergency response.

## User Preferences
- Simple, everyday language communication
- Mock data for rapid prototyping
- React for both frontends
- OpenStreetMap-style map (not Google Maps)
- WebSocket or interval refresh for real-time updates

## System Architecture

### UI/UX Decisions
The platform employs a professional medical-grade design system with a clear color palette (sky blue for primary, green for success, amber for warning, red for danger) and a system font stack for optimal readability. Components feature consistent border radii, subtle shadows, and professional SVG icons, avoiding emojis. The design is responsive for mobile and desktop.

### Technical Implementations
The system is built with React 18 + Vite for the frontend and Node.js + Express.js for the backend API. It utilizes a universal device adapter system to integrate with various wearables. A key architectural decision is the primary reliance on ROOK for data aggregation from over 400 devices, supplemented by direct API integrations for specific devices like Garmin, Apple Watch, and Fitbit for backward compatibility and specialized data streams. Real-time data freshness is indicated through a color-coded system (Live, Recent, Acceptable, Delayed, Stale, Outdated). The system includes three user-facing portals: Wearable User App, Dispatch Command Center, and Family Member Portal, each with dedicated login and functionalities. A new Operator Console provides 24/7 incident management.

### Feature Specifications
- **ROOK Integration:** Supports 400+ devices, including smartwatches, fitness trackers, CGMs, and blood pressure monitors. Collects data across Physical, Sleep, and Body Health pillars, offering real-time webhooks for event notifications.
- **Wearable App:** Provides a personal health dashboard, device connection management with freshness UI, customizable alert settings, health history, sharing settings for trusted contacts, and report downloads.
- **Family Member Portal:** Allows family members to monitor loved ones' vitals, view location, and access active alerts.
- **Dispatch Command Center:** Features a map-based dashboard for emergency operators with color-coded status pins, real-time device metrics, user profiles, and auto-refresh capabilities.
- **Operator Console:** Offers 24/7 incident management with real-time incident lists, status filtering, details, actions, and a defined incident workflow (NEW -> TRIAGED -> CONTACTING -> CONFIRMED -> ESCALATED -> CLOSED).
- **Sandbox Refactor:** A modular architecture rebuild introducing a health score, caregiver invitation system, alert engine with rule evaluation, incident workflow, ROOK webhook processing with signature verification, and Stripe subscription integration.

### System Design Choices
- **Backend:** Express.js API server (`backend/index.js`) handles all REST API endpoints.
- **Frontend Applications:** Separate React + Vite applications for Wearable App (`apps/wearable/`), Dispatch Center (`apps/dispatch-center/`), and a Launcher page (`apps/launcher/`).
- **Device Adapters:** A universal adapter system (`backend/adapters/`) supporting `BaseAdapter`, `RookAdapter`, `FitbitAdapter`, `GarminAdapter`, and `AppleHealthAdapter` for standardized device integration.
- **Incident Engine:** Database tables (`sos_events`, `sos_incidents`, `sos_actions`, `sos_notes`, `sos_history`) with transaction-safe services (`backend/services/incidentService.js`) and background action worker (`backend/services/actionWorker.js`).
- **Operator Console:** React-based UI at `/operator` route for 24/7 incident management with real-time updates.
- **Data:** Uses mock data generators for demonstration purposes, with a plan for Leaflet.js for map visualization in production.

### API Endpoints
- `POST /api/sos` - Trigger SOS event and create incident with notification actions
- `GET /api/incidents` - List incidents with optional status/priority filters
- `GET /api/incidents/:id` - Get incident details with actions, notes, history
- `PATCH /api/incidents/:id` - Update incident status
- `POST /api/incidents/:id/notes` - Add note to incident
- `GET /api/incidents/metrics` - Dashboard metrics (open count, status distribution)

## External Dependencies
- **ROOK:** Primary data aggregator for over 400 wearable devices, providing a unified data format, real-time webhooks, and HIPAA/GDPR compliance.
- **Fitbit API:** Direct integration for Fitbit devices, supporting OAuth and data retrieval (heart rate, steps, sleep, etc.).
- **Garmin Health API:** Direct integration for Garmin devices via webhooks.
- **Apple HealthKit:** Direct integration for Apple Watch (iOS only).
- **Stripe:** Integrated in the sandbox refactor for subscription management and payments.
