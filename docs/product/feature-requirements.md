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

## Budgets and Goals

- Monthly total and category budgets are mandatory for authenticated users before
  continuing monthly planning
- Create, view, update, and delete monthly budget plans
- Quick-fill current month budgets from the previous month, then allow edits
- Yearly budget totals and reports are derived from the last 12 monthly budget
  plans and are not entered separately
- Yearly budget view includes summary, budget vs actual spending, month-wise
  breakdown, category analysis, yearly trends, savings projection, and insights
- Used, spent, remaining, overspending alerts, and progress
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

## Shared Workspace

- Start with one workspace and one active workspace membership
- Generate a code for the current workspace without creating another workspace
- Join another workspace by moving the user's sole membership to it
- Require explicit ownership-transfer confirmation when a manager would leave
  members behind
- Leave a joined workspace by creating a new workspace for the departing user
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

## Direct UPI Intent Payments

- Authenticated Android users can scan a UPI QR code or enter payment details
- Show only installed compatible UPI apps and require an explicit app choice
- Generate the payment reference on the backend and launch the selected app
- Store callbacks as app-reported and unverified
- Never create a confirmed expense or claim bank settlement from an app callback
- See [Direct UPI Intent Payments](../payments/direct-upi-intent.md)

## Notifications

- In-app and email reminders for budgets, goals, and recurring entries
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
