# Flow Assistant

## Identity and Experience

Flow is NidhiFlow's central AI-powered assistant. Use `Flow` or `Flow ✨` in
user-facing copy. It occupies the raised center navigation position with an
accessible orb treatment, text label, reduced-motion support, and no
distracting continuous animation.

## Phase 1 Preview

Before AI launch, Flow presents a truthful Coming Soon experience:

- Personalized insights
- Savings recommendations
- Smart alerts
- Natural conversations
- Feedback form/conversation
- Optional Notify Me with account or explicit contact consent

Never simulate AI output as real.

## Architecture

```text
Flow UI
  -> Flow API/orchestrator
  -> authentication and workspace context
  -> intent classification
  -> read-only finance tools / proposal tools
  -> policy and permission engine
  -> response with evidence and proposed actions
  -> user confirmation
  -> ordinary domain service executes action
  -> audit event and result
```

The model never writes directly to the database. It can call allowlisted tools
with typed schemas. Domain services revalidate every proposed action.

## Capabilities

- Add transactions through natural language
- Search transactions conversationally
- Create budgets and goals
- Explain financial insights
- Recommend savings approaches
- Assist with shared household finances
- Categorize transactions with confidence
- Clean merchant names and identify duplicates
- Extract receipt fields
- Forecast cash flow and detect unusual spending
- Detect bills, subscriptions, and recurring payments
- Generate monthly summaries in supported languages

## Context and Grounding

Flow receives only the current actor's authorized workspace data and only the
minimum fields needed. Responses distinguish facts, calculations, assumptions,
and suggestions. Important claims should be traceable to source transactions
or report aggregates.

## Action Contract

Action proposals include:

- Human-readable summary
- Exact fields and affected workspace/resources
- Calculated financial impact where applicable
- Warnings/assumptions
- Expiration/version to detect stale confirmation
- Confirm and cancel controls

After confirmation, the backend applies normal validation, authorization,
idempotency, database transactions, and audit logging.

## Authentication

Guest-compatible on-device AI remains a future decision. Persistent
personalized conversations, retained history, and cloud actions require an
account. Flow must not trigger unnecessary login for a static preview.
