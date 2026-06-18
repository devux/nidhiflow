# Feature Requirements

## Account and Profile

- Optional email signup/login/logout and email verification
- Forgot/reset password
- Secure account sessions
- Legacy guest-to-account migration
- Optional guest data-protection reminder after five minutes of active use
- Reminder actions: Create Account, Log In, Continue as Guest, Remind Me Every
  5 Minutes, and Don't Remind Me Again
- Profile, currency, locale, timezone, date format, theme, avatar, and
  notification preferences
- Account data export and deletion
- Active-session and security-activity view

## Transactions

- Authenticated users can create, view, edit, and delete/reverse income,
  expense, and transfer entries through backend APIs
- Guest users can view/read available transaction data but cannot create, edit,
  delete, or otherwise modify transactions
- Amount, currency, type, account, category, date, payment method, note, tags,
  and optional attachment
- Phase 1 note maximum: 100 characters
- Search, filter, sort, and paginate
- Recurring schedules and reminders
- CSV import/export with validation and duplicate detection
- Quick categories:
  - Income: Salary, Freelance, Business, Interest
  - Expense: Food, Shopping, Transport, Bills, Entertainment, Health,
    Education, Travel, Home

## Accounts and Balances

- Manual cash, bank, credit card, loan, wallet, and other accounts
- Opening/current balances
- Account-to-account transfers
- Asset, liability, and net-worth summaries
- Archive accounts without breaking history

## Budgets, Bills, and Goals

- Monthly total and category budgets
- Used, spent, remaining, overspending alerts, and progress
- Bills with due date, status, recurrence, and reminders
- Savings and debt-repayment goals with target, target date, contributions, and
  progress
- Active and completed goal views

## Dashboard, Activity, and Reports

- Personal/family budget summary
- Add Income and Add Expense quick actions
- Guest quick actions that would change data must show a login/signup prompt
  instead of opening an editable form
- Goal preview and recent activity
- Income/expense activity tabs, date grouping, search, and filters
- Monthly cash flow and income-versus-expense trends
- Spending by category/account
- Total income, total expense, and net savings
- This Month, Last Month, This Year, and Custom filters
- Accessible charts with text legends
- Downloadable CSV reports

## Family Workspace

- Create/join one shared family workspace
- Invite, remove, and leave
- Shared visibility and collaborative transaction editing
- Shared budgets and goals
- Member attribution and audit history

## Education and Engagement

- Short lessons, quizzes, practical tips, and sample data
- Optional challenges, badges, streaks, milestones, and completed-goal
  celebrations
- Personalizable themes, avatars, dashboard layout, and goal visuals

## Feedback and Support

- Suggestions, issues, and general comments
- Category, description, optional attachment, and status
- Anonymous feedback without contact details
- Authenticated support conversation and status history
- Admin filtering, status updates, and internal notes

## Notifications

- In-app and email reminders for bills, budgets, goals, and recurring entries
- Notification preferences
- Guest login/data-protection reminder preference stored locally
- Flow launch notification
- Useful, non-spammy delivery with clear disable controls

## Flow Preview and Phase 2

Phase 1 provides the Flow destination, orb navigation, Coming Soon content,
feedback, and optional Notify Me.

Phase 2 provides natural-language search/entry, insights, savings
recommendations, forecasting, smart alerts, household assistance, and
user-approved actions. See [Flow Assistant](../ai/flow-assistant.md).

## Cross-Cutting Requirements

- Mobile-first responsive behavior
- Guest and authenticated paths
- Guest paths are read-only; authenticated paths perform CRUD through APIs and
  persist data to the database
- Loading, empty, success, validation, offline, and error states
- Accessibility and localization
- Auditability for sensitive/shared changes
- Rate limiting and abuse protection
- Health, logs, metrics, and error monitoring
