# eVida 24/7 Incident Workflow

## Overview

This document describes the complete incident workflow for the eVida medical emergency platform. The system handles health emergencies through a structured escalation process involving three user types: End Users, Caregivers (Circle), and Dispatch Operators.

---

## User Roles

| Role | Description | Access |
|------|-------------|--------|
| **User** | End user with wearable device | User App, SOS button |
| **Caregiver** | Family member or trusted contact in user's circle | Caregiver App, notifications |
| **Operator** | 24/7 dispatch center staff | Operator Console, incident management |

---

## Incident States

```
NEW → TRIAGED → CONTACTING → CONFIRMED → CLOSED
                    ↓
               ESCALATED → CLOSED
```

| State | Description | Who Can Change |
|-------|-------------|----------------|
| `NEW` | Incident just created, awaiting triage | System → Operator |
| `TRIAGED` | Operator reviewed, actions queued | Operator |
| `CONTACTING` | Attempting to reach user/caregivers | Operator |
| `CONFIRMED` | Emergency confirmed, help dispatched | Operator |
| `ESCALATED` | Emergency services (EMS) notified | Operator |
| `CLOSED` | Incident resolved | Operator |

---

## Priority Levels

| Priority | Triggers | Response Time |
|----------|----------|---------------|
| `HIGH` | SOS button, critical vital alert | < 2 minutes |
| `MED` | Abnormal vitals, missed check-in | < 15 minutes |
| `LOW` | Device disconnected, minor alert | < 1 hour |

---

## 1. User App Workflow

### Normal Operation
1. User connects wearable device (Fitbit, Garmin, etc.)
2. App displays real-time vitals with "Last sync" timestamp
3. User can view history, alerts, and manage sharing settings

### SOS Trigger
1. User presses **SOS button** in app
2. System creates:
   - `event` record (type: SOS, source: USER_APP)
   - `incident` record (status: NEW, priority: HIGH)
   - `incident_action` records for each caregiver (NOTIFY_CONTACT)
3. User sees confirmation: "Help is on the way"
4. User can add context via voice/text (optional)

### Automated Alerts
1. System detects abnormal vitals from wearable
2. Creates event + incident (priority based on severity)
3. Follows same escalation path

---

## 2. Caregiver App Workflow

### Setup
1. User invites caregiver via sharing settings
2. Caregiver receives invitation (email/SMS)
3. Caregiver creates account and accepts invitation
4. Caregiver can now view user's health dashboard

### Incident Notification
1. When incident created, system queues NOTIFY_CONTACT actions
2. Caregiver receives notification via preferred channel:
   - Push notification (if app installed)
   - SMS
   - WhatsApp
   - Email
3. Notification includes:
   - User name
   - Alert type (SOS, vital alert, etc.)
   - Last known location (if available)
   - Action buttons: "I'm responding" / "Can't help"

### Response Actions
| Action | System Response |
|--------|-----------------|
| "I'm responding" | Updates incident, notifies other caregivers |
| "Can't help" | Escalates to next caregiver or operator |
| No response (5 min) | Auto-escalates to next tier |

---

## 3. Operator Console Workflow

### Dashboard View
- Left panel: Incidents list (filterable by status, priority)
- Right panel: Selected incident details
- Auto-refresh every 10-15 seconds

### Incident Triage (NEW → TRIAGED)
1. Operator reviews incoming incident
2. Checks user profile, vitals, location
3. Sets status to TRIAGED
4. System auto-queues notification actions

### Contact Phase (TRIAGED → CONTACTING)
1. Operator attempts to reach user directly
2. Reviews caregiver response status
3. Adds notes to incident timeline
4. Sets status to CONTACTING

### Resolution Paths

**Path A: User OK**
```
CONTACTING → CLOSED
```
- User responds, confirms they're okay
- Operator adds resolution note
- Incident closed

**Path B: Emergency Confirmed**
```
CONTACTING → CONFIRMED → CLOSED
```
- Emergency verified (fall, medical event, etc.)
- Caregiver en route or assistance dispatched
- Monitor until resolved

**Path C: EMS Required**
```
CONTACTING → ESCALATED → CLOSED
```
- Serious emergency requiring 911/EMS
- Operator contacts emergency services
- Provides location and user info
- Documents EMS response

### Operator Actions
| Action | Description |
|--------|-------------|
| Update Status | Change incident state |
| Add Note | Document actions, observations |
| View History | Full timeline of incident |
| Retry Contact | Re-send notification to caregiver |
| Escalate | Move to higher priority tier |

---

## Notification Channels

| Channel | Use Case | Retry Policy |
|---------|----------|---------------|
| Push | Primary for app users | 3 attempts, 1 min apart |
| SMS | Fallback, urgent alerts | 3 attempts, 2 min apart |
| WhatsApp | User preference | 3 attempts, 2 min apart |
| Email | Non-urgent, documentation | 2 attempts, 5 min apart |
| Phone Call | Escalation, EMS | Immediate, no auto-retry |

---

## Action Processing

### Retry Logic
```
Attempt 1: Immediate
Attempt 2: +1 minute (or channel-specific delay)
Attempt 3: +2 minutes
Failure: Mark FAILED, escalate to next tier
```

### Action States
| State | Description |
|-------|-------------|
| `PENDING` | Queued, awaiting processing |
| `SENT` | Successfully delivered |
| `FAILED` | All attempts exhausted |

---

## Data Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  User App   │────→│   Backend    │────→│  Operator Console│
│  SOS Button │     │  API Server  │     │   Dashboard      │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Database   │
                    │  - events    │
                    │  - incidents │
                    │  - actions   │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Worker     │
                    │  (Actions)   │
                    └──────────────┘
                           │
                           ▼
              ┌────────────┴────────────┐
              │                         │
         ┌────▼────┐              ┌─────▼─────┐
         │   SMS   │              │  WhatsApp │
         │ (Twilio)│              │   (API)   │
         └─────────┘              └───────────┘
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `events` | Raw event log (SOS, vitals, etc.) |
| `incidents` | Active/closed incidents |
| `incident_actions` | Notification queue |
| `incident_notes` | Operator/caregiver notes |
| `incident_history` | Status change audit log |

---

## API Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/sos` | POST | Create SOS event + incident | User |
| `/api/incidents` | GET | List incidents | Operator |
| `/api/incidents/:id` | GET | Incident details | Operator |
| `/api/incidents/:id` | PATCH | Update status | Operator |
| `/api/incidents/:id/notes` | POST | Add note | Operator |
| `/api/incidents/metrics` | GET | Dashboard metrics | Operator |

---

## How to Test

### 1. Create SOS Incident
```bash
curl -X POST http://localhost:3001/api/sos \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "location": {"lat": 37.7749, "lng": -122.4194}, "message": "Test SOS"}'
```

**Expected:** Returns incident ID, creates event + incident + actions in DB

### 2. List Incidents
```bash
curl http://localhost:3001/api/incidents
```

**Expected:** Returns array with the new incident

### 3. View Incident Details
```bash
curl http://localhost:3001/api/incidents/{incident_id}
```

**Expected:** Returns incident with actions and notes

### 4. Update Incident Status
```bash
curl -X PATCH http://localhost:3001/api/incidents/{incident_id} \
  -H "Content-Type: application/json" \
  -d '{"status": "TRIAGED", "note": "Reviewed, contacting caregivers"}'
```

**Expected:** Status updated, note added, history logged

### 5. Add Note
```bash
curl -X POST http://localhost:3001/api/incidents/{incident_id}/notes \
  -H "Content-Type: application/json" \
  -d '{"note": "Spoke with user, they are okay"}'
```

**Expected:** Note added to incident

### 6. Check Metrics
```bash
curl http://localhost:3001/api/incidents/metrics
```

**Expected:** Returns counts by status, average resolution time

### 7. Verify Action Processing
Check backend logs for:
```
[ActionWorker] Processing action: NOTIFY_CONTACT to caregiver@email.com
[ActionWorker] Action sent successfully (stub)
```

### 8. Test Operator Console
1. Navigate to `/operator`
2. Log in with dispatch credentials (`admin` / `admin123`)
3. Verify incidents appear in list
4. Select incident, update status, add notes
5. Confirm auto-refresh updates the list

### 9. Verify ROOK/Fitbit Still Works
1. Navigate to `/connect` in user app
2. Click Fitbit
3. Confirm OAuth flow initiates correctly
4. If you have Fitbit credentials, complete the flow

---

## Environment Variables

See `.env.example` for required configuration:

```
DATABASE_URL=postgresql://...
ROOK_CLIENT_UUID=...
ROOK_CLIENT_SECRET=...

# Future integrations (currently stubbed)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## Future Enhancements

1. **Real Notifications** - Integrate Twilio for SMS/WhatsApp
2. **Push Notifications** - Firebase Cloud Messaging for mobile apps
3. **Voice Calls** - Auto-dial user/caregivers for urgent incidents
4. **Location Tracking** - Real-time GPS during active incidents
5. **Two-Way Chat** - In-app messaging between user and operator
6. **Escalation Rules** - Configurable escalation policies per user
