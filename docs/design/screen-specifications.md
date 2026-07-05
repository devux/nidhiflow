# Screen Specifications

## Home

- Time-appropriate greeting and authenticated user identity
- Notification entry and Insights entry point
- The notification entry shows a compact unread-count badge when unread items
  exist; do not show a redundant overflow menu beside it
- Personal/family budget card: total, spent, remaining, progress
- Savings guidance uses a compact slide carousel with a practical tip and a
  clearly identified Flow AI preview slide
- Quick destinations are Budget, Reports, Goals, and Loans
- Recent transactions: source/merchant, category, signed amount, date
- Shared Space opens as a mobile bottom sheet. Its initial peek shows the
  current workspace, role, currency, invite code, Copy, and Share
- Role and currency use compact icon/value chips; member email is omitted
- Members can leave and create a personal workspace directly from the current
  workspace card
- Expanding by the drag handle reveals code-based joining, members,
  permissions, invite history, and workspace settings
- Do not show Personal/Shared tabs or workspace switching controls
- Joining replaces the current workspace membership
- If joining would move a manager away from remaining members, show a
  confirmation with Transfer ownership and join, and Stay in current workspace
- Member workspace identity shows the manager's current profile display name
  separately from the editable workspace name

## Activity

- Income and Expense segmented tabs
- Search and filters
- Groups: Today, Yesterday, or localized date
- Rows show context, signed amount, and time
- Selecting a row opens details and permitted edit actions
- Android-derived entries show a compact `From notification` provenance label
  in lists and details.

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
- Create, edit, contribute, complete, and archive flows use authenticated
  workspace goal records
- Image/icon, name, saved amount, target, percentage, and progress
- Positive non-manipulative completed-goal celebration

## Loans

- Secondary destination opened from Home quick actions and You/Profile tools;
  it is not a primary navigation tab
- Authenticated balances derive from credit-card, loan, and other-liability
  accounts and the existing transaction ledger
- Active total is grouped by currency; unlike currencies are never combined
- Account cards identify the account type, balance, due date, and minimum
  payment; unsupported due-date or payment data is labeled `Not provided`
- Payment-planning guidance remains visually separate from ledger balances and
  does not infer interest, minimum payments, or payoff dates
- Archived loans appear in a clearly identified history section and do
  not contribute to the active total
- Signed-out visitors cannot access the Loans route because account
  balances are authenticated workspace data
- Loading, empty, populated, and retryable error states are required

## Reports

- Date and Custom filters open in bottom sheets with Clear and Apply actions
- Date options: This month, Last month, Last year
- Custom requires a start date and end date
- Total income, total expense, net savings
- Expense category chart plus textual category, percentage, and amount legend
- Spending trend chart with total spend and previous-period comparison
- Top spending categories with amount, percentage, and accessible text labels
- Charts remain understandable without color

## Pay with UPI

- Home exposes a `Pay with UPI` quick action; it is not a primary navigation tab
- The first screen offers Scan UPI QR and manual UPI ID, receiver, amount, and
  note fields
- App selection lists installed compatible apps only
- The external-app transition remains user initiated
- Result uses success, failure, cancelled, or unknown wording followed by
  `Payment status reported by UPI app`
- Always display that the result is not bank-verified and provide a clear Done
  action
- Browser and unsupported-device states explain Android availability without
  imitating a successful launch

## You

- Keep `You` as the navigation destination and use `Profile` as the page heading
- Authenticated profile header shows a friendly default cartoon avatar,
  icon-labeled display name and email, and a right-aligned icon-only Edit
  action without repeating sign-in status
- Logout precedes Settings in the page header; compact widths show its icon
  while larger widths may include its label
- Selecting Edit opens display-name editing in a modal
- Do not show a visible `Preferences` section label
- Appearance, Language, Currency, Settings, and Share feedback use one compact
  options card; feedback opens into its modal form
- Do not show a Quick access section
- Feedback form
- Appearance, Language, and Currency initialize from the authenticated profile
  and persist changes to the backend. Theme and locale changes apply globally;
  currency changes update global defaults and formatting without relabeling
  existing records stored in another explicit currency
- Optional avatar with safe default
- Android app section uses one compact horizontal card with version,
  compatibility, trust indicator, and APK download on the same row
- On supported Android builds when enabled, Transaction detection explains
  notification-access scope, default-SMS transaction detection, and shared
  visibility; requires an INR destination account plus explicit consent; opens
  Android notification-access settings; and provides a disable action.

## Settings

- Settings is a protected secondary page opened from You
- Category settings list read-only system categories and allow workspace
  members to create, rename, and archive workspace-owned categories
- Category loading, empty, validation, save, archive, and retryable failure
  states remain local to the page

## Flow Preview

- Use Flow naming, not generic AI Assistant naming
- Explain personalized insights, savings recommendations, smart alerts, and
  natural conversations
- Optional Notify Me and feedback
- Viewing and saved launch contact require authentication
- Clearly identify unavailable functionality; never fake AI output

## Common States

Every screen defines loading, empty, populated, validation, offline, permission,
and unexpected-error behavior. Empty states provide one relevant next action.
Skeletons are used only when content loading is noticeable.

## Notifications

- Selecting the header notification control opens a dedicated notification page
- Show unread state, event title, actor-aware summary, timestamp, per-item read
  behavior, and a Mark all read action
- Shared workspace alerts cover another member's transaction, budget, goal, and
  loan creates, updates, deletes, archives, restores, and contributions where
  applicable
- Selecting an alert opens its allowlisted destination
- Alert text and payloads never include amounts, notes, account identifiers, or
  other financial details

## Public About

- Signed-out visitors see About before any finance or workspace screen.
- Use a spacious editorial layout inspired by the approved marketing reference:
  compact header, large hero, alternating feature stories, capability grid,
  onboarding steps, security section, final call to action, and footer.
- Show only currently available NidhiFlow capabilities.
- Provide persistent Log in and Get started actions and no Continue as Guest
  action.
- Support 320, 425, 768, 1024, 1440, and 2560 pixel breakpoints.

## Responsive Behavior

Phone behavior is authoritative for product acceptance. Validate the supported
phone widths in both Android browsers/WebViews and iOS Safari/WebViews,
including safe areas and software keyboards. Desktop uses additional width for
complementary panels, denser tables, and persistent secondary navigation
without changing business behavior. Tablet adaptation follows the same
component system and every platform-neutral workflow remains available at all
supported web breakpoints.
