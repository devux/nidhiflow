# Screen Specifications

## Home

- Time-appropriate greeting and guest/user identity
- Notification entry and Insights entry point
- Personal/family budget card: total, spent, remaining, progress
- Prominent Add Expense and Add Income actions
- Active-goal preview: saved, target, percentage, View All
- Recent transactions: source/merchant, category, signed amount, date

## Activity

- Income and Expense segmented tabs
- Search and filters
- Groups: Today, Yesterday, or localized date
- Rows show context, signed amount, and time
- Selecting a row opens details and permitted edit actions

## Add Income and Add Expense

- Large amount input with selected currency
- Category quick choices and More
- Income suggestions: Salary, Freelance, Business, Interest
- Expense suggestions: Food, Shopping, Transport, Bills, Entertainment,
  Health, Education, Travel, Home
- Date and optional note, maximum 100 characters
- Full-width Save Income/Save Expense action
- Validate amount, category, and date while preserving invalid form input

## Plan

- Monthly, Budget, and Bills tabs
- Previous/next period navigation
- Monthly total, percentage used, spent, remaining, and Edit
- Category rows with spent/limit, percentage, and progress
- View All Categories

## Goals

- Active and completed sections
- Clear add action
- Image/icon, name, saved amount, target, percentage, and progress
- Positive non-manipulative completed-goal celebration

## Reports

- This Month, Last Month, This Year, Custom
- Total income, total expense, net savings
- Expense category chart plus textual category, percentage, and amount legend
- Recent transactions and View All
- Charts remain understandable without color

## You

- Guest/authenticated state
- Guest local-data explanation and non-blocking Create Account action
- Local preference to enable or disable the five-minute guest data-protection
  reminder
- No invented guest email or cloud identity
- Goals, Reports, Learn, Achievements, and Feedback shortcuts
- Appearance, Language, Currency, Notifications, and Privacy preferences
- Optional avatar with safe default

## Flow Preview

- Use Flow naming, not generic AI Assistant naming
- Explain personalized insights, savings recommendations, smart alerts, and
  natural conversations
- Optional Notify Me and feedback
- Viewing is guest-compatible; saved launch contact requires consent/account
- Clearly identify unavailable functionality; never fake AI output

## Common States

Every screen defines loading, empty, populated, validation, offline, permission,
and unexpected-error behavior. Empty states provide one relevant next action.
Skeletons are used only when content loading is noticeable.

## Guest Data-Protection Reminder

- After five minutes of active foreground guest use, show a dismissible banner,
  toast, or bottom sheet that does not block the current task.
- Explain that account creation protects history through backup, recovery, and
  synchronization; do not imply that local guest data has already been lost.
- Provide Create Account, Log In, and Continue as Guest actions.
- Offer `Remind me every 5 minutes` as an unchecked opt-in choice.
- Offer `Don't remind me again` and make the setting reversible from You.
- Preserve the current screen and unsaved form values through login or
  dismissal.
- Do not show the reminder over confirmations, errors, sensitive entry, or
  another modal.

## Responsive Behavior

Mobile is authoritative. Desktop uses additional width for complementary
panels, denser tables, and persistent secondary navigation without changing
business behavior. Tablet adaptation follows the same component system.
