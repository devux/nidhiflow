# Deployment

## Environments

Use isolated local, test, staging, and production environments with separate
databases, credentials, storage, email configuration, and AI provider access.
Production data must not be copied into lower environments without an approved
sanitization process.

## Build Artifacts

- Frontend: immutable Vite production assets served through a CDN/static host
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

Security review, privacy policy/consent review, accessibility testing, backup
restore test, incident contacts, monitoring alerts, support process, domain and
TLS validation, rate-limit verification, and critical end-to-end smoke tests.
