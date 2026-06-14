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

1. Monorepo/package manager/build orchestration
2. ORM/query builder and migration framework
3. Concrete frontend libraries for query state, local state, forms, schemas,
   IndexedDB, charts, and testing
4. Server hosting, database provider, object storage, CDN, email, and queue
5. Browser access-token transport, cookie domains, and final CSRF strategy
6. JWT signing algorithm, key management, and rotation process
7. Workspace manager naming, transfer, last-manager, and member-removal rules
8. Personal plus family workspace limits and active-workspace behavior
9. Account creation timing relative to email verification
10. Guest encryption/key strategy and supported browsers
11. Guest-to-account duplicate fingerprint and conflict UI
12. Soft deletion, reversal, and immutable-ledger depth for transactions
13. Workspace currency and future multi-currency/conversion policy
14. Recurrence rule format and scheduler/queue architecture
15. Attachment limits, malware scanner, retention, and storage provider
16. Notification providers, retry policy, quiet hours, and templates
17. Legal retention, account deletion, shared records, and supported regions
18. Subscription/premium feature model shown in exploratory designs
19. Flow model/provider, regional processing, retention, cost limits, and
   evaluation framework
20. Offline writes and conflict resolution for authenticated users

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
