# eVida Backend

Backend API for eVida, a remote patient/elderly monitoring platform. It receives
vitals from wearables via a [Rook](https://tryrook.io) webhook, evaluates them
against per-user thresholds, and notifies the user and their emergency
contacts (email + push) when something looks abnormal. Caregivers can be
linked to patients to view their vitals and alerts.

## Stack

- Node.js + Express
- PostgreSQL + [Knex](https://knexjs.org) (query builder + migrations)
- JWT auth (`jsonwebtoken`, `bcryptjs`)
- Nodemailer (email) and `expo-server-sdk` (push notifications)

No Replit-specific tooling is used anywhere in this codebase — it runs as a
plain Node/Express app against a standard PostgreSQL database, so it can be
deployed to any Node host (Render, Railway, Fly.io, a VPS, Docker, etc.).

## Local setup

Requirements: Node.js 20+, a PostgreSQL database (local install or Docker).

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc.
npm run migrate
npm run dev             # starts on http://localhost:3000
```

### Using Docker Compose

A `docker-compose.yml` is included to spin up the API + a Postgres instance
with one command:

```bash
docker compose up --build
```

This runs migrations automatically on container start and serves the API on
`http://localhost:3000`.

## Environment variables

See `.env.example` for the full list. Notable ones:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `JWT_SECRET` | yes | Long random string used to sign auth tokens |
| `ROOK_WEBHOOK_SECRET` | required in production | HMAC secret used to verify `/device/data` webhook calls. If unset in production, the webhook route refuses requests instead of silently skipping verification. |
| `ALLOWED_ORIGINS` | recommended in production | Comma-separated list of allowed CORS origins (e.g. `https://app.evida.com,https://admin.evida.com`). If unset, CORS allows all origins — fine for local dev, not for production. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | optional | Email alerts are skipped (logged only) if `SMTP_HOST` is unset |

## Database migrations

```bash
npm run migrate            # apply latest migrations
npm run migrate:rollback   # roll back the last batch
```

## API overview

All authenticated routes expect `Authorization: Bearer <token>`.

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PATCH /auth/me`
- `POST /device/data` — Rook webhook (HMAC-signed, not user-authenticated)
- `GET /health-data`, `GET /health-data/latest`, `GET /health-data/summary`
- `GET /thresholds`, `PUT /thresholds/:metric`, `POST /thresholds/reset`
- `GET /alerts`, `GET /alerts/stats`, `POST /alerts/:id/acknowledge`
- `GET /contacts`, `POST /contacts`, `PUT /contacts/:id`, `DELETE /contacts/:id`
- `GET /caregiver/patients`, `POST /caregiver/patients/:patientId`,
  `GET /caregiver/patients/:patientId/vitals`,
  `GET /caregiver/patients/:patientId/alerts`, `GET /caregiver/dashboard`
- `GET /health` — liveness + DB check

## Testing

```bash
npm test
```

Unit tests cover the Rook payload parser, alert severity classification, and
the auth middleware. Integration tests for the auth routes run against a real
Postgres database — set `DATABASE_URL` (or rely on the default
`postgresql://postgres:postgres@localhost:5432/evida_test` used in CI) before
running them.

## Deployment

`render.yaml` provisions a Render web service + managed Postgres database out
of the box (`npm install && npm run migrate` as the build step). A
`Dockerfile` is also provided if you'd rather deploy to any container host
(Fly.io, a VPS with `docker run`, etc.) without depending on Render.
