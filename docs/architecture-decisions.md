# Architecture Decision Register

This register captures decisions still required and contradictions resolved
during the documentation reorganization. Approved decisions should become
numbered ADRs or be incorporated into their authoritative document.

## Resolved Contradictions

### Login Required vs Guest First

Earlier authentication wording could imply all finance APIs/features require
login. Resolution: core finance use is local and guest-compatible; cloud,
identity, collaboration, communication, and persistent personalized AI require
authentication.

### Family Collaboration vs Roles

Earlier text referenced owner/member roles while also requiring all members to
collaborate. Resolution: all members can view and edit ordinary shared finance
data. A minimal manager capability exists only for invitations, removal, and
workspace lifecycle. Its final name and transfer rules remain open.

### Phase 1 vs Flow Navigation

Flow is visually central in Phase 1 while AI capabilities are Phase 2.
Resolution: Phase 1 ships the Flow orb and truthful Coming Soon/feedback/Notify
Me experience; functional AI tools remain Phase 2.

### "Addictive" Experience vs User Safety

Resolution: NidhiFlow may be colorful, entertaining, and engaging but cannot
use addictive or manipulative patterns. Gamification is optional and rewards
healthy habits rather than screen time.

### INR Mockups vs Multi-Currency

Resolution: INR is example content. Currency and date rendering are localized
and never hardcoded.

### Guest Profile Mockup vs No Account

Resolution: a guest may have a local display name/avatar, but the UI must not
invent an email address or imply cloud backup/account status.

### Reports Table vs Generated Reports

Earlier requirements named a `reports` table. Resolution: interactive reports
are derived; only asynchronous generated export artifacts need a
`generated_reports` table.

## Missing Architectural Decisions

1. Concrete frontend libraries for server query state, forms, and charts
2. Server hosting, database provider, object storage, CDN, email, and queue
3. Browser access-token transport, cookie domains, and final CSRF strategy
4. JWT signing algorithm, key management, and rotation process
5. Workspace manager naming, transfer, last-manager, and member-removal rules
6. Personal plus family workspace limits and active-workspace behavior
7. Account creation timing relative to email verification
8. Guest encryption/key strategy and supported browsers
9. Guest-to-account duplicate fingerprint and conflict UI
10. Server-side reversal and immutable-ledger depth for authenticated transactions
11. Workspace currency and future multi-currency/conversion policy
12. Recurrence rule format and scheduler/queue architecture
13. Attachment limits, malware scanner, retention, and storage provider
14. Notification providers, retry policy, quiet hours, and templates
15. Legal retention, account deletion, shared records, and supported regions
16. Subscription/premium feature model shown in exploratory designs
17. Flow model/provider, regional processing, retention, cost limits, and
    evaluation framework
18. Offline writes and conflict resolution for authenticated users

## Milestone 1 Decisions

- Use an npm-workspaces monorepo under `codebase/`, with separate frontend and
  backend applications and shared root quality commands.
- Use Webpack 5 for the React build and development server.
- Use `pg` directly for the initial PostgreSQL connection layer and
  `node-pg-migrate` for version-controlled migrations. A higher-level query
  builder remains optional when product repositories are introduced.
- Use Zod for startup environment validation on both frontend and backend.
- Use Jest and Testing Library for frontend behavior tests. Use Vitest for
  backend unit and integration tests, and Supertest for Express HTTP tests.

## Milestone 2 Decisions

- Use React Router for guest-compatible client routes and route-level code
  splitting.
- Use `idb` as the typed IndexedDB adapter. The initial versioned guest
  database stores local preferences only; finance stores and their migrations
  are added with the owning milestones.
- Use React context for the small guest preference and theme state. IndexedDB
  remains the durable source of truth.
- Derive the initial locale, timezone, and currency from browser settings and
  allow the guest to change supported values locally.
- Use semantic CSS tokens for light/dark themes and responsive behavior rather
  than screen-specific styling.
- Use `jest-axe` as an automated accessibility smoke check alongside
  interaction tests. Manual keyboard, zoom, contrast, and screen-reader checks
  remain required before production launch.

## Milestone 3 Decisions

- Store guest transaction amounts as canonical integer minor-unit strings.
  Domain calculations use `BigInt`; formatting replaces localized fractional
  parts without converting financial values to JavaScript `Number`.
- Upgrade the local `nidhiflow-guest` IndexedDB schema from version 1 to 2,
  preserving preferences and adding an indexed transaction store.
- Keep the Milestone 3 transaction scope to income and expense. Accounts and
  transfers remain owned by Milestone 7.
- Use the documented system quick categories. Custom categories and
  subcategories remain owned by Milestone 7.
- Removing a guest transaction records `deletedAt` and excludes it from lists
  and totals. The local record is retained for safer history semantics; the
  server-side reversal/audit model remains a future backend decision.
- Keep Activity search, type, category, and date filters in the URL. IndexedDB
  remains the durable source of truth, while React context holds only the
  currently displayed guest transaction collection.

## Milestone 4 Decisions

- Keep `/health/live` and `/health/ready` as operational routes outside the
  versioned `/api/v1` surface.
- Use a standard JSON success/error envelope for `/api/v1` routes, with
  `X-Request-Id` echoed in response headers and response metadata.
- Start the modular backend structure with public `categories`, `feedback`,
  and `openapi` modules plus shared middleware for validation, request
  context, rate limiting, and centralized error handling.
- Use an in-memory rate-limit foundation for public endpoints in development
  and tests. A distributed store remains a later operational hardening
  decision.
- Seed the documented quick categories in the core schema migration so guest
  and future authenticated flows share the same category vocabulary.
- Use text columns plus explicit check constraints for phase-foundation enum
  values in the initial core schema migration. This keeps the migration more
  resilient while preserving domain constraints.

## Milestone 5 Decisions

- Create the personal workspace during successful email verification, not
  during initial registration. This keeps unverified accounts from gaining
  protected workspace state while preserving a straightforward onboarding flow.
- Use a short-lived HMAC-signed access JWT plus opaque rotating refresh
  cookies for the milestone implementation. Asymmetric signing and managed key
  rotation remain a later operational decision.
- Keep verification and password-reset endpoints account-discovery-safe in
  normal responses. In non-production environments, return a debug token in
  the success payload so local development and automated tests can complete the
  flows before email delivery infrastructure exists.
- Treat revoked or expired sessions as invalid for access-token validation, and
  revoke the whole refresh-token family if a rotated refresh session is reused.

## Milestone 6 Decisions

- Accept guest migration payloads only through authenticated preview/commit
  endpoints. The commit endpoint requires explicit confirmation plus an
  `Idempotency-Key`.
- Treat `transactions.client_id` as the server-side guest-to-account mapping
  anchor so retries and duplicate detection can safely refer back to the same
  imported records.
- Use a single migration record to persist the preview summary, final outcome,
  and guest-to-server ID mapping so a successful retry can return the original
  result without duplicating imported data.

## Milestone 7 Decisions

- Expose authenticated workspace finance routes for accounts, workspace
  categories, and transactions under the existing versioned API surface rather
  than introducing a separate finance subdomain.
- Treat account and category archive/restore as soft-state changes so history
  remains available for balance reconciliation and shared-workspace audit
  history.
- Calculate account summaries from stored decimal balances using fixed-
  precision math, and keep transfers out of income/expense classification so
  net worth remains tied to account movement rather than reporting buckets.

## Milestone 8 Decisions

- Model budgets, goals, bills, and recurring transaction templates as
  authenticated workspace resources with soft-delete/archive semantics so the
  history needed for reporting and reminders stays intact.
- Keep budget and goal progress derived from transactions and contributions
  rather than storing derived totals, which makes the finance math easier to
  reconcile after edits and retries.
- Treat bill marking as idempotent by reusing the first generated payment
  transaction when the action is retried, and use the shared Bills category as
  the default expense classification when a bill does not carry a custom
  category.

## Milestone 9 Decisions

- Treat reports as derived workspace views over transactions rather than as a
  primary stored finance ledger. Summary, category, and cash-flow endpoints
  read directly from transaction history and honor the workspace reporting
  currency.
- Store generated CSV exports as metadata in `generated_reports` and regenerate
  the CSV on demand from the stored filter parameters. This keeps the first
  export implementation auditable without introducing a separate object-storage
  dependency.

## Recommended Improvements

- Adopt ADRs for material choices.
- Generate OpenAPI from shared schemas or validate implementation against it.
- Add a formal domain glossary for transaction, balance, budget, bill, and goal
  semantics.
- Add threat models for guest migration, family sharing, file upload, admin
  access, and Flow tools.
- Add a data-classification and retention matrix.
- Define service-level objectives and incident runbooks before launch.
- Add accessibility and financial-calculation test fixtures to CI.
- Establish design tokens directly from approved Figma assets.
- Add reconciliation jobs/invariants for balances and report totals.

## Future Product Decisions

- Whether guests receive browser notifications without accounts
- Whether guest feedback can include attachments
- Whether a user can belong to multiple family workspaces
- Whether completed goals can reopen
- Whether account deletion removes or anonymizes shared contributions
- Whether premium features exist and which capabilities they include
- Whether bank synchronization, investments, tax features, or business
  accounting ever enter scope
- Whether on-device AI can support guest users privately
