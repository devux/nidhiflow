# Monitoring

## Observability

Use structured logs, metrics, traces where useful, error monitoring, and
synthetic checks. Correlate requests with a unique `requestId`.

## Logs

Include:

- Timestamp, environment, service/version
- Request ID, route template, method, status, duration
- Safe actor/workspace identifiers where authorized
- Stable error code

Exclude passwords, tokens, reset links, full request/response bodies,
transaction notes, attachment content, AI prompts, and unnecessary amounts or
personal data.

## Metrics

### Reliability

- Request rate, error rate, and latency by route
- Database pool usage and query latency
- Frontend startup and route-transition timing, separated into warm and hosting
  cold-start paths
- Duplicate startup request and request-waterfall regression checks
- Queue depth/job failures
- Storage/email provider failures
- Frontend error and web-vital trends

### Product-Critical

- Transaction write failures
- Idempotency conflicts/replays
- Guest migration preview/commit/failure
- Budget/report calculation failures
- Notification delivery and unsubscribe failures
- Authentication failure spikes and refresh-token reuse

### Flow

- Model/tool latency and failures
- Policy blocks
- Proposal confirmation/cancellation
- Invalid tool arguments
- User corrections and safety incidents

Do not include sensitive finance values in metric labels.

Android notification-derived transaction metrics, if the experimental feature
is enabled, are limited to permission state transitions, parser source/version,
success/failure reason codes, transaction creation, duplicates, user
corrections/reversals, and false-positive reports. Never include raw
notification content, merchant hints, amounts, or account identifiers.

## Alerts

Define actionable thresholds with an owner and runbook. Page for sustained
availability loss, data-integrity risk, authentication anomalies, migration
failure, backup failure, suspected data exposure, or widespread financial
calculation errors. Lower-severity issues create tickets.

## Health Checks

- Liveness: process can serve
- Readiness: required dependencies are available
- Synthetic tests: login, guest shell, protected read, and safe non-production
  finance workflow

Health endpoints disclose no secrets or detailed infrastructure.

## Audit and Security Monitoring

Monitor membership changes, bulk exports, account deletion, repeated access
denials, rate-limit abuse, session reuse, admin access, and Flow policy blocks.

## Retention

Set retention by log type and legal/privacy need. Restrict access, encrypt
storage, and support incident preservation without indefinite default
retention.
