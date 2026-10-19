-- eVida live backend — database schema
--
-- This file did not exist anywhere in the project before, even though
-- db/init.js and several routes assumed it did. On a fresh database
-- (e.g. a new deploy outside Replit) nothing would be created at all.
-- Every table/column here was reverse-engineered from the SQL queries
-- actually used across backend/index.js, backend/routes/*.js and
-- backend/services/*.js, so this matches what the code expects today.
--
-- Safe to run multiple times (CREATE ... IF NOT EXISTS everywhere).
-- Executed automatically on server startup via db/init.js.

-- ============================================================
-- USERS (patients, caregivers, operators, admins)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                   SERIAL PRIMARY KEY,
  username             VARCHAR(100) UNIQUE NOT NULL,
  email                VARCHAR(255) UNIQUE NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,
  name                 VARCHAR(255),
  phone                VARCHAR(50),
  role                 VARCHAR(30) NOT NULL DEFAULT 'user', -- user | caregiver | operator | admin
  rook_user_id         VARCHAR(255),
  last_lat             DOUBLE PRECISION,
  last_lng             DOUBLE PRECISION,
  last_location_update TIMESTAMPTZ,
  last_login_at        TIMESTAMPTZ,
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_rook ON users(rook_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Per-user sharing toggles (dispatch sharing, health data, location, auto-call).
-- Previously held in a single in-memory variable shared by every user and
-- reset on every server restart.
ALTER TABLE users ADD COLUMN IF NOT EXISTS share_settings JSONB NOT NULL DEFAULT
  '{"shareWithDispatch": true, "shareHealthData": true, "shareLocation": true, "emergencyAutoCall": true}'::jsonb;

-- ============================================================
-- CAREGIVERS — real emergency contacts for a user. Previously these only
-- lived in an in-memory array (also shared globally, also reset on restart),
-- so no SOS or alert could ever actually reach a real family member.
-- ============================================================
CREATE TABLE IF NOT EXISTS caregivers (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(50) NOT NULL, -- E.164, e.g. +50760000000
  email           VARCHAR(255),
  relationship    VARCHAR(100),
  channel         VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP', -- WHATSAPP | SMS | PHONE
  receive_alerts  BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safety net for a database that already had a partial/older "caregivers"
-- table from an earlier attempt (CREATE TABLE IF NOT EXISTS above is a
-- no-op when the table already exists, even if it's missing columns this
-- version needs — this is exactly what happened on the Replit database).
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS relationship VARCHAR(100);
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS receive_alerts BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_caregivers_user ON caregivers(user_id);

-- ============================================================
-- DEVICE TOKENS — OAuth tokens for any directly-connected wearable
-- (generic multi-brand table; Fitbit OAuth uses this today)
-- ============================================================
CREATE TABLE IF NOT EXISTS device_tokens (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_type     VARCHAR(50) NOT NULL,
  access_token    TEXT,
  refresh_token   TEXT,
  expires_at      BIGINT,
  device_user_id  VARCHAR(255),
  last_sync       TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, device_type)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);

-- ============================================================
-- FITBIT TOKENS — legacy table, kept only for backward compatibility
-- with loadFitbitTokensFromDB(). New connections go through
-- device_tokens above.
-- ============================================================
CREATE TABLE IF NOT EXISTS fitbit_tokens (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token    TEXT,
  refresh_token   TEXT,
  expires_at      BIGINT,
  fitbit_user_id  VARCHAR(255),
  last_sync       TIMESTAMPTZ
);

-- ============================================================
-- HEALTH EVENTS — raw data received from ROOK webhooks
-- ============================================================
CREATE TABLE IF NOT EXISTS health_events (
  id            SERIAL PRIMARY KEY,
  rook_user_id  VARCHAR(255),
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type    VARCHAR(100),
  data_source   VARCHAR(100),
  payload       JSONB,
  recorded_at   TIMESTAMPTZ,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_events_user ON health_events(user_id);
CREATE INDEX IF NOT EXISTS idx_health_events_rook_user ON health_events(rook_user_id);
CREATE INDEX IF NOT EXISTS idx_health_events_received ON health_events(received_at DESC);

-- ============================================================
-- SOS / INCIDENT PIPELINE
-- ============================================================
CREATE TABLE IF NOT EXISTS sos_events (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  source       VARCHAR(50)  NOT NULL, -- USER_APP | ROOK_WEBHOOK | ...
  type         VARCHAR(50)  NOT NULL, -- SOS | LOW_OXYGEN | HIGH_HEART_RATE | ...
  payload_json JSONB,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sos_incidents (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_id      INTEGER REFERENCES sos_events(id) ON DELETE SET NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'NEW', -- NEW | TRIAGED | CONTACTING | CONFIRMED | ESCALATED | CLOSED
  priority      VARCHAR(10) NOT NULL DEFAULT 'HIGH', -- HIGH | MED | LOW
  location_lat  DOUBLE PRECISION,
  location_lng  DOUBLE PRECISION,
  summary       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_incidents_status ON sos_incidents(status);
CREATE INDEX IF NOT EXISTS idx_sos_incidents_user ON sos_incidents(user_id);

CREATE TABLE IF NOT EXISTS sos_actions (
  id              SERIAL PRIMARY KEY,
  incident_id     INTEGER NOT NULL REFERENCES sos_incidents(id) ON DELETE CASCADE,
  action_type     VARCHAR(50) NOT NULL, -- NOTIFY_CONTACT | NOTIFY_OPERATOR | ESCALATE_EMS
  channel         VARCHAR(20) NOT NULL, -- WHATSAPP | SMS | EMAIL | PUSH | PHONE
  recipient       VARCHAR(255),
  payload_json    JSONB,
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | SENT | FAILED
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_actions_incident ON sos_actions(incident_id);
CREATE INDEX IF NOT EXISTS idx_sos_actions_pending ON sos_actions(status, next_attempt_at);

CREATE TABLE IF NOT EXISTS sos_notes (
  id              SERIAL PRIMARY KEY,
  incident_id     INTEGER NOT NULL REFERENCES sos_incidents(id) ON DELETE CASCADE,
  author_user_id  VARCHAR(100),
  author_role     VARCHAR(30),
  note            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_notes_incident ON sos_notes(incident_id);

CREATE TABLE IF NOT EXISTS sos_history (
  id              SERIAL PRIMARY KEY,
  incident_id     INTEGER NOT NULL REFERENCES sos_incidents(id) ON DELETE CASCADE,
  from_status     VARCHAR(20),
  to_status       VARCHAR(20) NOT NULL,
  changed_by      VARCHAR(100),
  changed_by_role VARCHAR(30),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_history_incident ON sos_history(incident_id);
