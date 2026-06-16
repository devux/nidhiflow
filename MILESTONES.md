# NidhiFlow Development Milestones

## Delivery Approach

Build NidhiFlow through small end-to-end vertical features instead of
completing the entire database, backend, or frontend separately.

Each milestone should produce a usable and testable result. Complete and
stabilize Phase 1 before implementing Phase 2 AI capabilities.

## Milestone 1: Project Foundation

**Status:** Complete as of June 15, 2026.

### Scope

- React and TypeScript frontend
- Node.js, Express, and TypeScript backend
- PostgreSQL development environment
- Database migration framework
- Shared linting and formatting
- Environment-variable validation
- Unit and integration test setup
- Basic CI workflow

### Completion Criteria

- Frontend and backend run locally.
- Backend connects to PostgreSQL.
- Tests, linting, and type checks run successfully.
- No secrets are committed.
- Setup instructions are documented.

## Milestone 2: Mobile Guest Foundation

**Status:** Complete as of June 15, 2026.

### Scope

- Mobile-first application shell
- Bottom navigation in this order:
  1. Home
  2. Activity
  3. Flow
  4. Plan
  5. You
- Core design tokens and reusable UI components
- Light and dark themes
- Currency, locale, and date formatting
- IndexedDB guest repository
- Loading, empty, validation, and error states

### Completion Criteria

- Core navigation works on mobile.
- Guest users can enter the app without authentication.
- Guest data remains available after closing and reopening the app.
- The interface follows `Figma/Final Screens`.
- Basic accessibility checks pass.

## Milestone 3: Guest Transaction Vertical

**Status:** Complete as of June 15, 2026.

This is the first usable product milestone.

### Scope

- Add income
- Add expense
- Transaction categories
- Activity list
- Transaction search and filters
- Edit and delete/reverse transactions
- Dashboard income, expense, and balance totals
- Local guest persistence

### Completion Criteria

A guest user can:

1. Open NidhiFlow without logging in.
2. Add an income or expense transaction.
3. View it in Activity.
4. Edit or remove it.
5. See accurate dashboard totals.
6. Close and reopen the app without losing local history.

Financial calculations must use fixed-precision money handling.

## Milestone 4: Backend Foundation

**Status:** Complete as of June 16, 2026.

### Scope

- Modular backend structure
- PostgreSQL core schema
- Versioned REST API under `/api/v1`
- Standard success, pagination, and error responses
- Request validation
- Centralized error handling
- Request IDs and structured logging
- Health and readiness endpoints
- Rate-limiting foundation
- OpenAPI documentation

### Completion Criteria

- API contracts are documented and tested.
- Validation and unexpected errors use the standard response format.
- Logs do not expose sensitive information.
- Database migrations run from an empty database.

## Milestone 5: Authentication and Accounts

**Status:** Complete as of June 16, 2026.

### Scope

- Signup and email verification
- Login and logout
- JWT access tokens
- Rotating refresh sessions
- Forgot-password and reset-password flows
- Profile and preferences
- Personal workspace creation
- Active-session management

### Completion Criteria

- Authentication is required only for protected features.
- Guest-supported features remain usable without login.
- Passwords and refresh tokens are securely hashed.
- Expired and revoked sessions are rejected.
- Protected resources enforce ownership and workspace membership.

## Milestone 6: Guest-to-Account Migration

**Status:** Complete as of June 16, 2026.

### Scope

- Guest-data migration preview
- Duplicate detection
- Explicit user confirmation
- Idempotent server import
- Guest-to-server ID mapping
- Failure rollback
- Successful migration verification

### Completion Criteria

- Guest data is never silently uploaded.
- Failed migration does not remove local data.
- Retrying does not create duplicate records.
- The user can review what will be imported.
- Successful migration preserves transaction history and totals.

## Milestone 7: Accounts and Categories

**Status:** Complete as of June 16, 2026.

### Scope

- Cash, bank, credit card, loan, wallet, and other manual accounts
- Opening and current balances
- Account archiving
- Default and custom categories
- Subcategories
- Transfers between accounts
- Asset, liability, and net-worth summaries

### Completion Criteria

- Transfers do not count as income or expense.
- Archived accounts retain history.
- Account balances reconcile with transactions.
- Category and account ownership is enforced.

## Milestone 8: Budgets, Goals, and Bills

**Status:** Complete as of June 16, 2026.

### Scope

- Monthly total budgets
- Category budgets
- Budget usage and overspending alerts
- Savings goals
- Debt-repayment goals
- Goal contributions and completed goals
- Bills, due dates, statuses, and reminders
- Recurring transaction schedules

### Completion Criteria

- Budget totals match eligible expenses.
- Goal progress is calculated accurately.
- Bill payment does not create duplicate transactions.
- Recurring generation is idempotent.

## Milestone 9: Reports and Dashboard

### Scope

- Monthly cash-flow summary
- Income-versus-expense trends
- Spending by category and account
- Total income, expense, and net savings
- This Month, Last Month, This Year, and Custom filters
- Accessible charts and text legends
- CSV reports and exports
- Customizable dashboard summaries

### Completion Criteria

- Reports reconcile with transaction records.
- Transfers are excluded from income and expense totals.
- Charts are understandable without relying only on color.
- Date ranges respect workspace timezone.

## Milestone 10: Family Collaboration

### Scope

- Shared family workspace
- Member invitations
- Join, leave, and remove flows
- Shared transaction visibility and editing
- Collaborative budgets and goals
- Member attribution
- Audit history

### Completion Criteria

- All family members can view shared workspace data.
- All members can add and edit collaborative finance data.
- Complex per-feature permissions are not introduced.
- Membership and destructive actions are audited.

## Milestone 11: Engagement and Communication

### Scope

- In-app and email notifications
- Notification preferences
- Guest five-minute data-protection reminder
- Feedback submission and status
- Financial lessons, quizzes, and practical tips
- Optional achievements, challenges, badges, and streaks
- Flow Coming Soon screen and Notify Me

### Completion Criteria

- Notifications are useful and easy to disable.
- The guest login reminder remains optional and non-blocking.
- Repeating it every five active minutes requires explicit opt-in.
- Gamification is optional and non-manipulative.
- Anonymous feedback does not require an account.

## Milestone 12: Production Readiness

### Scope

- Accessibility review
- Localization testing
- Mobile performance optimization
- Security and privacy review
- Admin support tools
- Audit and security monitoring
- Error monitoring and operational dashboards
- Backup and restore testing
- Deployment and rollback procedures
- Critical end-to-end test suite

### Completion Criteria

- Security, privacy, and accessibility launch checks pass.
- Production backups can be restored.
- Important alerts have owners and runbooks.
- Critical guest and authenticated workflows pass end-to-end tests.
- Phase 1 is stable before Phase 2 begins.

## Milestone 13: Flow AI Phase 2

### Initial Delivery Order

1. Read-only transaction search
2. Financial summaries and explanations
3. Categorization and merchant-cleanup suggestions
4. Duplicate, bill, and unusual-spending detection
5. Budget and savings recommendations
6. Cash-flow forecasting
7. User-approved transaction, budget, goal, and reminder actions
8. Household finance assistance

### Completion Criteria

- Flow uses only authorized user data.
- Suggestions clearly distinguish facts, assumptions, and recommendations.
- Every data-changing action shows an exact preview.
- Financial changes require explicit user approval.
- Flow never moves money or bypasses normal validation and authorization.

## Immediate Starting Sprint

Begin with this sequence:

```text
Project Foundation
→ Mobile App Shell
→ Guest IndexedDB
→ Add Expense and Add Income
→ Activity List
→ Home Dashboard Totals
```

The first sprint is complete when a guest can add transactions, see accurate
activity and dashboard totals, close the app, reopen it, and retain local
history without creating an account.
