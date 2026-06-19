# Prototype Deployment Guide

This guide is for deploying a prototype/staging-style NidhiFlow environment.
It is not a production readiness substitute. Keep production data, secrets, and
databases separate from local and prototype environments.

## Recommended Prototype Stack

- Frontend: Vercel
- Backend: Render or Railway
- Database: Neon or Supabase Postgres

Vercel can run the backend too, but the current backend is a standard Express
service with health checks, migrations, PostgreSQL connections, and cookie
sessions. Render or Railway is the simpler fit for the prototype API.

## Frontend on Vercel

Create a Vercel project for the frontend.

### Project Settings

```text
Root Directory: codebase
Install Command: npm install
Build Command: npm run build --workspace @nidhiflow/frontend
Output Directory: apps/frontend/dist
```

Use `codebase` as the root because this repo uses npm workspaces and shared
dev dependencies from `codebase/package.json`.

### Frontend Environment Variables

Set this in Vercel for Production and Preview:

```text
NIDHIFLOW_API_BASE_URL=https://your-backend-domain
```

Do not include `/api/v1`. The frontend app appends API paths internally.

Example:

```text
NIDHIFLOW_API_BASE_URL=https://nidhiflow-backend.onrender.com
```

After changing environment variables, redeploy the Vercel project.

## Backend on Render

Create a Render Web Service for the backend.

### Service Settings

```text
Root Directory: codebase
Build Command: npm install && npm run build --workspace @nidhiflow/backend
Start Command: npm run start --workspace @nidhiflow/backend
```

Use Node.js 22 or newer.

### Backend Environment Variables

```text
APP_ENV=production
PORT=3000
LOG_LEVEL=info
DATABASE_URL=postgresql://...
DATABASE_SSL=true
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX=300
AUTH_RATE_LIMIT_MAX=20
FEEDBACK_RATE_LIMIT_MAX=10
JWT_ACCESS_SECRET=replace-with-long-random-secret
JWT_ACCESS_ISSUER=nidhiflow
JWT_ACCESS_AUDIENCE=nidhiflow-web
JWT_ACCESS_TTL_SECONDS=900
REFRESH_SESSION_TTL_DAYS=30
EMAIL_VERIFICATION_TTL_HOURS=24
PASSWORD_RESET_TTL_HOURS=2
CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

Use a unique strong value for `JWT_ACCESS_SECRET`. Do not reuse local secrets.

### Database Migrations

After creating the hosted PostgreSQL database and setting `DATABASE_URL`, run:

```bash
npm run db:migrate
```

Run migrations against the hosted database from a trusted environment where
the production/prototype database URL is available. Do not commit database
credentials.

### Backend Health Checks

After deployment, verify:

```text
https://your-backend-domain/health/live
https://your-backend-domain/health/ready
```

Expected responses:

```json
{ "status": "ok" }
```

```json
{ "status": "ready" }
```

## Backend on Railway

Railway can host both the backend service and PostgreSQL.

### Service Settings

```text
Root Directory: codebase
Build Command: npm install && npm run build --workspace @nidhiflow/backend
Start Command: npm run start --workspace @nidhiflow/backend
```

Use the same backend environment variables listed above. If using Railway
Postgres, set `DATABASE_URL` from Railway's PostgreSQL connection variable.

## Backend on Vercel

Backend deployment on Vercel is possible, but it may require adapting the
Express entrypoint so Vercel can treat the app as a function-backed Express
application.

### Project Settings

```text
Root Directory: codebase
Install Command: npm install
Build Command: npm run build --workspace @nidhiflow/backend
Output Directory: leave empty
```

Use the same backend environment variables listed above.

For the current app, prefer Render or Railway unless there is a strong reason
to keep the API on Vercel.

## Database Options

### Neon

Good default for a prototype PostgreSQL database. Use the pooled connection URL
if the hosting platform creates many short-lived connections.

### Supabase Postgres

Also suitable for prototype PostgreSQL. Use only the database unless you
intentionally decide to adopt Supabase Auth or Storage later.

## Deployment Order

1. Create hosted PostgreSQL database.
2. Configure backend environment variables.
3. Deploy backend.
4. Run database migrations.
5. Verify backend health checks.
6. Configure frontend `NIDHIFLOW_API_BASE_URL`.
7. Deploy frontend.
8. Test signup, login, profile, and a protected finance read/write flow.

## Prototype Safety Checklist

- Use HTTPS-only public URLs.
- Set `CORS_ORIGINS` to the exact frontend URL.
- Keep guest data read-only unless the user authenticates.
- Do not commit `.env` files or provider secrets.
- Keep prototype and production databases separate.
- Enable provider backups where available.
- Review logs to ensure passwords, tokens, and financial payloads are not
  exposed.
