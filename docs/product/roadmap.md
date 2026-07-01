# Product Roadmap

## Delivery Rule

Phase 1 must be stable, secure, tested, and operationally observable before
Phase 2 AI actions are released. AI work may be prototyped behind flags, but it
must not delay or weaken the core finance foundation.

## Phase 1: Core Finance

### Foundation

- Read-only guest mode with no guest CRUD writes
- Optional signup, login, logout, email verification, and password recovery
- Optional five-minute guest data-protection reminder with local preferences
- Legacy guest-to-account migration with preview, duplicate handling,
  confirmation, and rollback on failure
- Profiles, locale, timezone, currency, theme, and notification preferences

### Finance Workflows

- Authenticated income, expense, and transfer CRUD through backend APIs
- Default/custom categories and subcategories
- Manual cash, bank, credit card, loan, wallet, and other accounts
- Balances, assets, liabilities, and net-worth summaries
- Monthly and category budgets
- Savings and debt-repayment goals
- Recurring transactions, reminders, and attachments
- Search, filtering, sorting, pagination, CSV import/export
- Authenticated Android Direct UPI intent handoff with unverified result capture

### Insights and Engagement

- Dashboard and recent activity
- Cash-flow and category reports
- Interactive financial lessons and quizzes
- Optional challenges, achievements, badges, streaks, and milestones
- Feedback submission and admin review
- Flow Coming Soon preview, feedback, and optional launch notification

### Collaboration and Operations

- One shared family workspace
- Shared data, transactions, budgets, and goals
- Member attribution and audit history
- Admin support tools, rate limiting, health checks, structured logs, and error
  monitoring

## Phase 1 Delivery Order

1. Read-only guest access, account security, and authenticated transaction management
2. Accounts, budgets, goals, dashboard, and basic reports
3. Family workspace, recurring transactions, and notifications
4. Import/export, attachments, education, achievements, and feedback
5. Accessibility, localization, operational hardening, and complete testing

## Phase 2: Flow AI

- Automatic categorization with confidence
- Merchant cleanup and duplicate detection
- Receipt OCR and field extraction
- Natural-language transaction entry and search
- Personalized summaries and spending insights
- Anomaly detection and smart alerts
- Cash-flow forecasting
- Bill, subscription, and recurring-payment detection
- Budget and savings recommendations
- Monthly summaries and multilingual conversations
- User-approved creation of transactions, budgets, goals, and reminders
- Household finance assistance

See [AI Roadmap](../ai/ai-roadmap.md) for sequencing and release gates.

## Out of Initial Scope

- Full accounting and bookkeeping
- Payroll and invoicing
- Tax filing or tax advice
- Lending or credit decisions
- Investment execution or trading recommendations
- Automatic movement of money

Direct UPI intent handoff is not automatic movement of money: the user chooses
and completes the action in an external UPI app, and NidhiFlow does not verify
or settle it.
