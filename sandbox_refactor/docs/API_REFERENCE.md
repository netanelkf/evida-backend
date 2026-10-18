# eVida Life360 Health API Reference

## Base URL
```
Development: http://localhost:3001/api
Production: https://[your-domain]/api
```

## Authentication

All authenticated endpoints require a Bearer token:
```
Authorization: Bearer <access_token>
```

### Get Tokens

**Register**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

**Login**
```http
POST /api/auth/login

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "customer" },
  "accessToken": "jwt...",
  "refreshToken": "jwt..."
}
```

---

## User Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user profile | Yes |
| PUT | `/users/me` | Update profile | Yes |
| GET | `/users/me/medical-info` | Get medical information | Yes |
| PUT | `/users/me/location` | Update location | Yes |
| POST | `/users/me/change-password` | Change password | Yes |

---

## Caregiver Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/caregivers/invite` | Send invitation | Yes |
| GET | `/caregivers/invitation/:token` | Validate invitation | No |
| POST | `/caregivers/accept/:token` | Accept invitation | Yes (caregiver) |
| POST | `/caregivers/register-and-accept/:token` | Register and accept | No |
| GET | `/caregivers/linked-users` | Get linked users (caregiver) | Yes |
| GET | `/caregivers/linked-caregivers` | Get linked caregivers (user) | Yes |
| PUT | `/caregivers/link/:linkId/permissions` | Update permissions | Yes |
| DELETE | `/caregivers/link/:linkId` | Remove link | Yes |

**Invite Request:**
```json
{
  "email": "caregiver@example.com",
  "relationship": "spouse"
}
```

---

## Device Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/devices/supported` | List all supported devices | No |
| GET | `/devices` | Get connected devices | Yes |
| GET | `/devices/:type/status` | Check device connection | Yes |
| GET | `/devices/:type/authorize` | Get OAuth URL | Yes |
| POST | `/devices/:type/connect` | Connect device | Yes |
| POST | `/devices/:type/disconnect` | Disconnect device | Yes |

---

## ROOK Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/rook/devices` | List device categories | No |
| POST | `/rook/users` | Register user with ROOK | Yes |
| GET | `/rook/users/:userId/authorize` | Get auth URL | Yes |
| GET | `/rook/callback` | OAuth callback | No |
| GET | `/rook/users/:userId/sources` | Get connected sources | Yes |
| DELETE | `/rook/users/:userId/sources/:source` | Disconnect source | Yes |
| POST | `/rook/webhooks` | ROOK webhook receiver | No |
| GET | `/rook/webhooks/recent` | Get recent webhooks | Yes |

---

## Vitals Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/vitals/current` | Get latest vitals | Yes |
| GET | `/vitals/history` | Get vitals history | Yes |
| GET | `/vitals/daily-summaries` | Get daily summaries | Yes |
| GET | `/vitals/stats` | Get aggregated stats | Yes |
| POST | `/vitals/manual` | Add manual entry | Yes |
| POST | `/vitals/calculate-baselines` | Calculate baselines | Yes |

**Query Parameters:**
- `days` - Number of days for history (default: 7)

---

## Alerts Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/alerts` | Get all alerts | Yes |
| GET | `/alerts/active` | Get active alerts | Yes |
| POST | `/alerts/:alertId/acknowledge` | Acknowledge alert | Yes |
| POST | `/alerts/:alertId/resolve` | Resolve alert | Yes |
| GET | `/alerts/rules` | Get alert rules | Yes |
| POST | `/alerts/rules` | Create alert rule | Yes |
| PUT | `/alerts/rules/:ruleId` | Update alert rule | Yes |
| PUT | `/alerts/rules/:ruleId/toggle` | Toggle rule on/off | Yes |
| DELETE | `/alerts/rules/:ruleId` | Delete alert rule | Yes |

**Alert Rule Types:**
- `high_hr`, `very_high_hr` - High heart rate
- `low_hr`, `very_low_hr` - Low heart rate
- `low_oxygen` - Low oxygen saturation
- `hrv_drop` - HRV drop from baseline
- `inactivity` - No movement
- `no_data` - No vitals received
- `low_battery` - Device battery low

---

## Incidents Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/incidents` | Get user's incidents | Yes |
| POST | `/incidents/sos` | Create SOS incident | Yes |
| GET | `/incidents/:id` | Get incident details | Yes |
| POST | `/incidents/:id/assign` | Assign to operator | Yes (operator) |
| PUT | `/incidents/:id/status` | Update status | Yes (operator) |
| POST | `/incidents/:id/notes` | Add note | Yes (operator) |
| POST | `/incidents/:id/contact` | Log contact attempt | Yes (operator) |
| POST | `/incidents/:id/resolve` | Resolve incident | Yes (operator) |

**SOS Request:**
```json
{
  "lat": 37.7749,
  "lng": -122.4194
}
```

---

## Health Score Endpoints (Basic+ subscription)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health-score` | Get current score | Yes |
| GET | `/health-score/history` | Get score history | Yes |
| POST | `/health-score/calculate` | Force recalculate | Yes |

**Response:**
```json
{
  "score": 78,
  "score_trend": "stable",
  "breakdown": {
    "hrv_score": 22,
    "heart_rate_score": 25,
    "sleep_score": 18,
    "activity_score": 13,
    "anomaly_penalty": 0
  },
  "interpretation": "Your health stability is good today."
}
```

---

## Subscription Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/subscriptions` | Get current subscription | Yes |
| GET | `/subscriptions/plans` | List available plans | No |
| POST | `/subscriptions/checkout` | Create checkout session | Yes |
| POST | `/subscriptions/cancel` | Cancel subscription | Yes |
| POST | `/subscriptions/webhook` | Stripe webhook | No |

---

## Dispatch Endpoints (Operators only)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/dispatch/queue` | Get incident queue | Yes (operator) |
| GET | `/dispatch/my-incidents` | Get assigned incidents | Yes (operator) |
| GET | `/dispatch/stats` | Get dashboard stats | Yes (operator) |
| GET | `/dispatch/operators` | List operators | Yes (operator) |
| GET | `/dispatch/users/:userId` | Get user details | Yes (operator) |

---

## Notifications Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications` | Get notifications | Yes |
| GET | `/notifications/unread-count` | Get unread count | Yes |
| POST | `/notifications/:id/read` | Mark as read | Yes |
| POST | `/notifications/mark-all-read` | Mark all read | Yes |

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error type",
  "message": "Human-readable message",
  "details": ["Optional array of details"]
}
```

### Common Status Codes
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `402` - Payment Required (upgrade needed)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
