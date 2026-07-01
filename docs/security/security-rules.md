# Security Rules

## Baseline

Use current OWASP guidance, secure defaults, least privilege, defense in depth,
and threat modeling for financial and AI workflows.

## Authentication

- Adaptive password hashing (prefer Argon2id)
- Short-lived validated access JWTs
- Rotating hashed refresh sessions
- Single-use expiring verification/reset tokens
- Session revocation and reuse detection
- Rate limiting and generic account-discovery-safe responses

See [Authentication](../backend/authentication.md).

## Authorization

- Deny by default.
- Guest users are read-only and must never be authorized for finance CRUD.
- Enforce workspace membership and action policy in the service layer.
- Never trust client-supplied ownership fields.
- Use safe `404` responses where resource enumeration is possible.
- Audit membership, security, destructive, and sensitive export changes.

## API Security

- HTTPS only in production
- Strict CORS allowlist
- Security headers including CSP appropriate to the deployment
- Request body, query, and file size limits
- Schema validation for every external input
- Parameterized queries
- Idempotency for retryable writes
- Separate rate limits for auth, public feedback, exports, and expensive
  reports
- CSRF protection when cookie credentials authorize state changes

## Secrets

Use a secrets manager or protected environment injection. Never commit secrets,
API keys, passwords, tokens, signing keys, or production connection strings.
Rotate credentials and define incident procedures.

## Logging

Structured logs include request ID, safe actor/workspace identifiers, route,
status, duration, and error code. Never log passwords, tokens, reset links,
full financial payloads, attachment contents, or unnecessary personal data.
UPI IDs, payment notes, canonical UPI URIs, and raw UPI callbacks must not be
written to application or audit logs.

## Direct UPI Intent

- Require authentication and derive payment ownership from the access token.
- Validate the UPI ID, positive fixed-precision INR amount, field sizes, source,
  selected app, and callback status at the boundary.
- Generate transaction references server-side with cryptographic randomness.
- Launch only an installed app selected by the user.
- Treat all callback content as untrusted and unverified.
- Return safe `404` responses for cross-user reads or updates.

## Files

Validate signature/type/size, use generated storage keys, store outside the web
root, authorize every download, use short-lived URLs, and implement malware
scanning/quarantine before broad release.

## Browser Security

- Do not store access/refresh tokens in localStorage.
- Use CSP and output encoding to reduce XSS.
- Avoid sensitive data in URLs.
- Clear account caches on logout.
- Separate guest and account data on shared devices.

## Database and Infrastructure

- Application DB role has minimum required privileges.
- Separate migration and runtime privileges.
- Encrypt traffic and managed storage/backups.
- Restrict network access.
- Test backup restoration.
- Patch dependencies and scan images/packages.

## Security Testing

Test authentication bypass, IDOR/workspace isolation, injection, token replay,
CSRF/XSS, rate limits, file upload, migration duplication, sensitive logging,
and account/guest data separation.

## Incident Response

Define severity, on-call ownership, containment, token/key revocation, user
notification, evidence retention, recovery, and post-incident review before
production launch.
