# Screen Specifications

## Home

- Time-appropriate greeting and guest/user identity
- Notification entry and Insights entry point
- Personal/family budget card: total, spent, remaining, progress
- Prominent Add Expense and Add Income actions
- Recent transactions: source/merchant, category, signed amount, date
- Shared-space dialog uses Personal and Shared tabs
- Personal contains only invitation-code management for the user's managed
  shared space
- Shared contains joined workspace identity for members, shared workspace
  switching, and code-based joining; managers do not see their own workspace
  repeated as a current shared-space card
- Shared provides one explicit control to switch between personal and shared
  finance data
- Shared workspace identity shows the creator's current profile display name
  separately from the editable workspace name

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

## Budget

- Monthly and Yearly tabs; Monthly is the default tab
- Monthly tab manages one monthly budget plan at a time
- Monthly budget plans are required for authenticated users before proceeding
  with planning
- Users can create, view, update, and delete monthly budget categories
- Quick-fill copies the previous month's budget into the selected month
- Monthly budget total, percentage used, spent, and remaining recalculate from
  budget categories and matching transactions
- Yearly tab is read-only and derives all totals from the last 12 monthly
  budget plans
- Yearly tab includes yearly budget summary, budget vs actual spending,
  month-wise breakdown, category analysis, and savings projection
- Category rows with spent/limit, percentage, and progress

## Goals

- Active and completed sections
- Clear add action
- Image/icon, name, saved amount, target, percentage, and progress
- Positive non-manipulative completed-goal celebration

## Reports

- Date and Custom filters open in bottom sheets with Clear and Apply actions
- Date options: This month, Last month, Last year
- Custom requires a start date and end date
- Total income, total expense, net savings
- Expense category chart plus textual category, percentage, and amount legend
- Spending trend chart with total spend and previous-period comparison
- Top spending categories with amount, percentage, and accessible text labels
- Charts remain understandable without color

## You

- Keep `You` as the navigation destination and use `Profile` as the page heading
- Guest/authenticated state
- Selecting the profile name opens display-name editing in a modal
- Feedback opens from a single page action into a modal form
- Guest local-data explanation and non-blocking Create Account action
- No invented guest email or cloud identity
- Activity and Reports shortcuts
- Feedback form
- Appearance, Language, Currency, and Privacy preferences
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
