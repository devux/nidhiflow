# Deployment

## Current Production Setup

NidhiFlow is deployed as three separately managed production parts:

- Frontend: Vercel serves the React single-page app from
  `codebase/apps/frontend/dist`.
- Backend: Render runs the Express API from `codebase/apps/backend/dist`.
- Database: Neon hosts the production PostgreSQL database used by the Render
  backend.

Current production URLs:

- Frontend: `https://nidhiflow.vercel.app`
- Backend: `https://nidhiflow.onrender.com`
- Backend readiness check: `https://nidhiflow.onrender.com/health/ready`

Secrets and production connection strings must stay in Vercel, Render, Neon,
or local ignored environment files. Never commit them.

## Repository Layout for Deployment

The deployable application lives under `codebase`, not the repository root.

- Monorepo package root: `codebase/package.json`
- Frontend package: `codebase/apps/frontend/package.json`
- Frontend build output: `codebase/apps/frontend/dist`
- Backend package: `codebase/apps/backend/package.json`
- Backend build output: `codebase/apps/backend/dist`
- Backend migrations: `codebase/apps/backend/migrations`
- Render blueprint: `render.yaml`

## Vercel Frontend Deployment

Create the Vercel project from the same Git repository and configure it as a
frontend-only deployment.

Use these Vercel project settings:

- Framework preset: Other
- Root directory: `codebase`
- Install command: `npm install`
- Build command: `npm run build --workspace @nidhiflow/frontend`
- Output directory: `apps/frontend/dist`

Required Vercel environment variables:

```text
NIDHIFLOW_API_BASE_URL=https://nidhiflow.onrender.com
FLOW_AI_ENABLED=false
```

`NIDHIFLOW_API_BASE_URL` is compiled into the frontend bundle, so changing the
backend URL requires a new Vercel deployment. `FLOW_AI_ENABLED` controls whether
the Flow page shows the static coming-soon experience or the enabled Flow chat
experience.

Do not configure Vercel with output directory `public`; this app builds to
`apps/frontend/dist`.

## Render Backend Deployment

Render deploys the backend using the repository-level `render.yaml` blueprint.
The backend build runs `db:migrate:deploy` after a successful TypeScript build
and before Render starts the new service version. A failed migration fails the
deployment instead of starting code against an outdated production schema.
The configured service is `nidhiflow-backend`.

Render build command:

```bash
cd codebase && npm install && npm run build --workspace @nidhiflow/backend && npm run db:migrate:deploy --workspace @nidhiflow/backend
```

The free Render instance may spin down after 15 minutes without inbound
traffic. Its first request after that idle period can take about one minute
while the service starts. Use a paid instance for production latency that must
not include cold starts.

Render start command:

```bash
cd codebase && npm run start --workspace @nidhiflow/backend
```

Render health check path:

```text
/health/ready
```

Required Render environment variables:

```text
APP_ENV=production
LOG_LEVEL=info
DATABASE_URL=<Neon production pooled or direct connection string>
DATABASE_SSL=true
CORS_ORIGINS=https://nidhiflow.vercel.app
JWT_ACCESS_SECRET=<strong random secret>
AUTH_DEBUG_TOKENS_ENABLED=false
FLOW_AI_ENABLED=false
APP_PUBLIC_URL=https://nidhiflow.vercel.app
EMAIL_DELIVERY_PROVIDER=none
```

Optional Render environment variables, only when a feature needs them:

```text
JWT_ACCESS_ISSUER=nidhiflow.production
JWT_ACCESS_AUDIENCE=nidhiflow-web
JWT_ACCESS_TTL_SECONDS=900
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
FEEDBACK_RATE_LIMIT_MAX=5
FLOW_AI_TIMEOUT_MS=60000
FLOW_MODEL=llama3.2:3b
OLLAMA_BASE_URL=<private Ollama URL reachable by backend>
EMAIL_FROM=<verified Resend sender, only when EMAIL_DELIVERY_PROVIDER=resend>
RESEND_API_KEY=<Resend API key, only when EMAIL_DELIVERY_PROVIDER=resend>
```

Keep `AUTH_DEBUG_TOKENS_ENABLED=false` in normal production.

Keep `FLOW_AI_ENABLED=false` until the production backend has a reachable model
runtime and the feature has passed release checks. Local Ollama on a developer
machine is not reachable from Render production.

Production auth uses a refresh cookie from the Render API domain while the app
runs on the Vercel domain. The backend must set that cookie with
`SameSite=None; Secure`, and frontend API requests must keep
`credentials: "include"`. If the cookie is blocked, `/auth/refresh` returns
`INVALID_SESSION` and protected calls such as `/users/me` and `/workspaces`
return `UNAUTHENTICATED` after the short access token expires.

Email verification is parked. Current signup creates an active account and
starts a session without a verification token. Keep
`EMAIL_DELIVERY_PROVIDER=none` until production email-link verification is
reintroduced. When that backlog item resumes, configure
`EMAIL_DELIVERY_PROVIDER=resend`, `EMAIL_FROM`, and `RESEND_API_KEY` in Render
with a sender address or domain verified in Resend.

## Neon Database Deployment

Neon provides the production PostgreSQL database. Store only the Neon
connection string in `DATABASE_URL`; the application code reads it through
environment configuration.

Recommended Neon setup:

- Use a dedicated production Neon project or protected production branch.
- Use a separate non-production branch for local testing, staging, and preview
  work.
- Use environment variables instead of committed connection strings.
- Enable backups and point-in-time recovery where the plan supports it.
- Prefer least-privilege runtime credentials for the application and a separate
  migration credential when available.

Production migrations are run from the backend workspace against the Neon
production `DATABASE_URL`.

```bash
cd codebase
npm run db:migrate:production --workspace @nidhiflow/backend
```

The production migration command loads `codebase/.env.production`. That file is
local-only and must remain ignored. In CI/CD, inject the same variables through
the platform secret store instead of committing an env file.

## Code and Migration Release Flow

Use this flow for every deployment that includes code changes, database
migrations, or both.

1. Create or update code in the correct package under `codebase/apps`.
2. If the database shape changes, add a new migration under
   `codebase/apps/backend/migrations`.
3. Never edit a migration that has already run in any shared or production
   database.
4. Update API docs when route contracts, request schemas, response schemas,
   auth requirements, validation, status codes, or error codes change.
5. Run local checks before deployment:

```bash
cd codebase
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

6. Run migrations against a test or staging database first:

```bash
cd codebase
npm run db:migrate --workspace @nidhiflow/backend
```

7. Deploy backend code to Render.
8. Run production migrations against Neon:

```bash
cd codebase
npm run db:migrate:production --workspace @nidhiflow/backend
```

9. Confirm the Render backend is healthy:

```bash
curl -fsS https://nidhiflow.onrender.com/health/ready
```

10. Deploy frontend code to Vercel.
11. Confirm the frontend can call the backend from
    `https://nidhiflow.vercel.app`.

For backward-compatible schema changes, it is acceptable to run migrations
before the backend rollout. For breaking changes, follow expand-and-contract:
add compatible schema first, deploy compatible code, backfill safely, then
remove old schema in a later release.

## Production Seeding

Production should not contain hardcoded sample users. For temporary smoke
testing, use the idempotent backend seed script with credentials supplied by
environment variables:

```bash
cd codebase
SEED_TEST_USER_EMAIL=test@nidhiflow.app \
SEED_TEST_USER_PASSWORD=<temporary strong password> \
SEED_TEST_USER_DISPLAY_NAME="Test User" \
npm run seed:test-user:production --workspace @nidhiflow/backend
```

The seed script creates or updates the user, marks the account verified, and
ensures a personal workspace membership exists. It must not print or commit the
password. Remove or rotate temporary test credentials before a real public
launch.

## Current Deployment-Related Code Changes

The current deployment setup added these operational pieces:

- `render.yaml` defines the Render backend service, build command, start
  command, health check, and required environment variables.
- `codebase/apps/backend/package.json` includes
  `db:migrate:production` for running migrations against the production
  environment and `seed:test-user:production` for controlled smoke-test user
  setup.
- `codebase/apps/backend/src/scripts/seedTestUser.ts` provides an idempotent
  production-safe test user seed that reads credentials from environment
  variables and ensures the user's personal workspace exists.

No database migration was added for the test-user seed script. It uses the
existing users, workspaces, and workspace membership tables after migrations
are already applied.

## Environments

Use isolated local, test, staging, and production environments with separate
databases, credentials, storage, email configuration, and AI provider access.
Production data must not be copied into lower environments without an approved
sanitization process.

## Build Artifacts

- Frontend: immutable production assets served through a CDN/static host
- Backend: versioned container image built from pinned dependencies
- Database: version-controlled migrations executed as a controlled release step
- OpenAPI document: generated/validated in CI and published with the release

## CI Pipeline

1. Install from lockfiles
2. Lint and type-check
3. Unit and component tests
4. API/schema contract tests
5. Integration tests with PostgreSQL
6. Security/dependency/secret scans
7. Production builds
8. Migration safety checks
9. Deploy to staging and run smoke tests
10. Approval and production rollout

## Configuration and Secrets

Validate configuration at startup. Secrets come from a managed secret store or
protected environment injection. Never build secrets into frontend bundles or
container layers. Define rotation procedures for database, JWT, email, storage,
and AI credentials.

## Release Strategy

Use rolling, blue/green, or canary deployment with health checks and rapid
rollback. Schema changes follow expand/contract rules. Feature flags protect
incomplete or high-risk functionality, especially Flow and migrations.

## Database

- Automated encrypted backups
- Point-in-time recovery where supported
- Regular restore tests
- Separate runtime and migration roles
- Migration metrics and timeout controls

## Frontend

Configure cache-busted assets, safe HTML caching, CSP, HTTPS, compression, and
source-map access restricted to approved error tooling. Validate mobile
performance before release.

## Backend

Expose liveness and readiness endpoints without sensitive details. Gracefully
drain requests on shutdown. Configure connection pooling, body limits,
timeouts, CORS, proxy trust, and rate limits explicitly.

## Rollback

Application rollback must remain compatible with expanded schemas. Destructive
migrations require recovery plans. Document how to disable Flow tools,
notifications, imports, or other risky capabilities independently.

## Launch Checklist

Follow the [Production Readiness](production-readiness.md) checklist before
shipping a release.
