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
