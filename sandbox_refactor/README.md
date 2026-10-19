# eVida "Life360 for Health" - Sandbox Refactor

This folder contains the new modular architecture for the eVida platform.

## Purpose

- Test new architecture in isolation before merging
- Keep existing app (`/backend/` and `/apps/`) untouched
- Validate database schema, services, and API endpoints

## Structure

```
sandbox_refactor/
├── backend/
│   ├── index.js              # Entry point
│   ├── app.js                # Express app setup
│   ├── config/               # Configuration files
│   ├── db/                   # Database schema & pool
│   ├── models/               # Database models
│   ├── services/             # Business logic
│   ├── routes/               # API routes
│   ├── middleware/           # Auth, role, subscription checks
│   ├── utils/                # Helpers
│   └── adapters/             # ROOK adapter (copied from main)
```

## To Run (when ready)

```bash
cd sandbox_refactor/backend
npm install
npm start
```

## Migration Plan

Once validated:
1. Back up current `/backend/`
2. Copy sandbox files to `/backend/`
3. Run database migrations
4. Test all endpoints
5. Update frontend API calls if needed
