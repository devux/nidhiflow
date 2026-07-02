# Product Backlog

## Purpose

This backlog records planned work that is not yet a released product contract.
Items move into the active roadmap only after scope, dependencies, security,
privacy, API, database, design, and test requirements are ready.

## Priority Order

1. Initial-load and API performance
2. Profile screen UI optimization
3. Shared-workspace screen UI optimization
4. Dedicated Goals and Liabilities screens
5. Android notification-derived transactions
6. Parked Direct UPI intent

## P0: Initial-Load and API Performance

### Problem

Initial application loading and authenticated API reads are noticeably slow.
Loading indicators must not conceal avoidable frontend waterfalls, backend
latency, database query cost, or hosting cold starts.

### Scope

- Measure mobile app startup, route transition, authentication restoration, API
  latency by route, database query latency, bundle size, and hosting cold-start
  time before optimizing.
- Separate cold-start latency from warm API latency in monitoring and reports.
- Remove duplicate and sequential startup requests; load only data required for
  the visible route and defer secondary panels.
- Reuse current-user and workspace session summaries while credentials are
  safely revalidated.
- Review database query plans, indexes, connection pooling, response payload
  size, serialization cost, and avoidable aggregate queries.
- Keep one route-appropriate skeleton during first load or navigation. Do not
  show a skeleton and a second loading spinner for the same request.
- Add timeouts, cancellation, normalized retry behavior for safe reads, and
  useful offline/error states.
- Establish performance budgets after baseline measurement. Initial targets are
  a usable app shell within 2.5 seconds on a representative mid-range Android
  device and warm protected-read API p95 below 800 milliseconds. Cold-start
  targets require an explicit hosting decision.

### Acceptance Criteria

- A documented baseline and before/after measurements exist for representative
  mobile, desktop, warm, and cold-start paths.
- Startup has no duplicate requests or unnecessary request waterfall.
- Skeletons match page sections and disappear when their corresponding data is
  ready.
- Monitoring exposes route latency, database latency, and frontend web vitals
  without sensitive financial values.
- Regression tests cover session restoration, loading, empty, timeout, offline,
  and error behavior.

## P1: Profile Screen UI Optimization

### Goal

Make the Profile page faster to scan and easier to use on small screens without
changing account, privacy, or guest behavior.

### Scope

- Give identity and authentication status the strongest hierarchy.
- Group Account, Preferences, Privacy and Security, Support, and Android App
  into clearly named sections.
- Reduce repeated cards, icons, labels, and vertical space while retaining
  44-by-44-pixel touch targets and readable spacing.
- Keep display-name editing and feedback in focused accessible dialogs.
- Make destructive account actions visually separate from ordinary settings.
- Use section-level skeletons only for data that is actually loading.
- Verify light/dark themes, long localized text, keyboard navigation, screen
  readers, 200% zoom, and 320-pixel-wide screens.

### Acceptance Criteria

- The most common profile and preference actions are reachable without scanning
  unrelated sections.
- Guest and authenticated states remain clearly distinct.
- Privacy, session, export, and deletion actions are not hidden or weakened.
- Automated accessibility checks pass and mobile usability is manually tested.

## P1: Shared-Workspace Screen UI Optimization

### Goal

Make sharing and membership behavior understandable without introducing
personal/shared workspace switching.

### Scope

- Replace the crowded share dialog with a focused mobile-first workspace
  sharing experience or bottom sheet.
- Show current workspace name, manager identity, the user's role, and member
  list before invitation controls.
- Give managers clear Generate code, Copy code, Share code, Remove member, and
  Leave actions with loading, expiry, success, and error states.
- Explain that joining another workspace moves the user's sole membership.
- Keep ownership-transfer confirmation explicit when a manager would leave
  members behind.
- Never display a Personal Workspace switch because each user has one active
  workspace relationship.

### Acceptance Criteria

- A user can identify the current workspace and manager before sharing or
  joining.
- Codes are not exposed in logs or analytics and are hidden after expiry.
- Join, leave, removal, and ownership-transfer outcomes are confirmed only
  after backend success.
- The complete flow works at 320 pixels, with keyboard and screen-reader
  navigation.

## P1: Dedicated Goals Screen

### Goal

Give savings and debt-repayment goals a complete secondary destination instead
of limiting them to a small Budget preview.

### Scope

- Open Goals from Budget and relevant Home summaries; do not add a sixth primary
  navigation item.
- Provide Active and Completed sections, search/filter where justified, add,
  edit, contribution, withdrawal, completion, and archive flows.
- Display target, saved amount, remaining amount, target date, percentage,
  progress, and member attribution.
- Use fixed-precision amounts and workspace currency.
- Require authentication for every write and preserve read-only guest behavior.

### Acceptance Criteria

- Goal totals reconcile with contributions and never use floating point.
- Empty, loading, validation, offline, success, and error states are present.
- Shared changes identify the actor and are audited.
- Completed-goal celebration is optional, accessible, and non-manipulative.

## P1: Dedicated Liabilities Screen

### Goal

Provide a clear view of money owed without creating a duplicate liability
ledger.

### Scope

- Derive liabilities from credit-card, loan, and other liability account types.
- Open Liabilities from Home/account summaries or Profile tools; do not add a
  sixth primary navigation item.
- Show total liabilities, account balances, due dates where supported, minimum
  or planned payments, and debt-repayment goal links.
- Separate principal/account balances from user-entered plans and educational
  suggestions.
- Do not infer interest, payoff dates, or minimum payments when the required
  inputs do not exist.

### Acceptance Criteria

- Liability totals reconcile with the account and transaction ledger.
- Transfers and repayments do not double-count expenses or balances.
- Archived accounts remain available in history but are clearly identified.
- Currency, accessibility, loading, empty, and error behavior follow shared
  finance rules.

## P2 Experimental: Android Notification-Derived Transactions

### Goal

With explicit Android notification-access permission, recognize likely
transaction notifications and automatically add categorized transactions to
the user's current workspace.

### Product Rules

- Android only and authenticated users only.
- Disabled by default behind a dedicated feature flag.
- Explain that Android notification access can expose notifications from many
  applications before opening system settings.
- Access begins only after explicit user opt-in and Android system permission.
  Revocation must stop processing immediately.
- Start with a reviewed allowlist of supported banking and payment-app package
  names and versioned parsers.
- Ignore OTPs, verification codes, login/security alerts, promotional content,
  messages without a reliable amount, and unsupported currencies.
- Parse locally and discard unrelated notification content immediately.
- Extract only the minimum candidate fields: amount, currency, direction,
  merchant/counterparty hint, event time, source package, and a non-reversible
  deduplication fingerprint.
- Automatically create an idempotent ordinary workspace transaction after
  local parsing. No review or confirmation step is required.
- Include the transaction immediately in account balances, budgets, goals,
  reports, exports, and shared-workspace activity.
- Display a small `From notification` provenance label in transaction lists and
  details. The label describes the source and must not imply bank verification.
- Assign the best supported category using deterministic, versioned rules.
  When no rule reaches the approved confidence threshold, use the workspace's
  explicit Uncategorized category rather than guessing.
- Recheck authentication, active workspace membership, account, category,
  amount, currency, date, duplicates, and idempotency before automatic
  creation.
- Store only derived transaction fields, source metadata, and the
  non-reversible duplicate fingerprint. Never upload the raw notification.
- Allow ordinary edit and delete/reversal actions so users can correct false
  positives, category errors, refunds, and reversals.
- Raw notification title/body must not be stored in the database, logs,
  analytics, crash reports, or audit metadata.
- Explain during opt-in that automatically created transactions are immediately
  visible to every member of the current workspace.

### Delivery Stages

1. Threat model, privacy review, supported-source research, and parser fixtures
   containing synthetic data only.
2. Local on-device detection and automatic ordinary transaction creation behind
   a feature flag.
3. Transaction-source labeling, deterministic categorization, idempotency,
   duplicate detection, and user correction flows.
4. Limited physical-device pilot with false-positive, missed-detection,
   permission-revocation, battery, and accessibility measurements.
5. Broader enablement only after accuracy and privacy release gates pass.

### Acceptance Criteria

- Permission education, enable, disable, and revocation paths are tested on
  supported Android versions.
- Unsupported and sensitive notifications create no transaction.
- Duplicate delivery or app restart cannot create duplicate transactions.
- Every created entry appears immediately in all applicable workspace
  calculations and views with the `From notification` label.
- All workspace members can view notification-derived transactions under the
  same collaboration rules as manually entered transactions.
- Parser accuracy is measured per supported source; a source is disabled when
  its format changes or confidence falls below the approved threshold.
- The feature remains unavailable on web and unsupported Android devices
  without misleading fallback behavior.

## Parked: Direct UPI Intent

Direct UPI remains retained behind `DIRECT_UPI_ENABLED=false`. It must not be
enabled until NidhiFlow has an approved merchant/PSP integration and completes
physical-device validation across supported UPI applications and banks.
