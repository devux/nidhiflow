# Business Rules

## Money and Time

- Store money as fixed-precision decimal values with an ISO 4217 currency.
- Never use floating point for persisted money or financial calculations.
- A workspace has a reporting currency in Phase 1. Currency conversion remains
  a future decision.
- Store timestamps in UTC and render them using the user's timezone and locale.
- Transfers move value between accounts and must not count as income or
  expense.
- Reports must use explicit date boundaries and consistent transaction status
  rules.
- Authenticated budget planning is monthly. A monthly budget plan is required
  for each active planning month.
- Yearly budget totals and reports must be calculated from the last 12 monthly
  budget plans and must not be entered or stored as a separate yearly plan.

## Signed-Out Access

- Signed-out visitors may access only the public About, login, and account
  creation experiences.
- Authentication is required before rendering Home, Activity, Reports, Budget,
  Goals, Liabilities, Flow, You, transaction forms, payments, or workspace data.
- Do not create hidden server-side guest profiles or new local guest finance
  records.
- Legacy guest records remain isolated on the device and must not be silently
  displayed, changed, uploaded, merged, or deleted.
- Anonymous feedback may use a narrowly scoped public endpoint only when a
  separately approved public feedback entry point exists.
- Logout clears account credentials and returns to the public About page.

## Family Collaboration

- Every authenticated user belongs to exactly one active workspace.
- Registration creates the user's initial workspace and manager membership.
- Sharing does not create a second workspace or a separate personal copy.
- Joining another workspace atomically removes the user's previous membership
  and adds membership in the destination workspace.
- Leaving a joined workspace atomically creates a new workspace managed by the
  departing user.
- All Phase 1 family members can view shared workspace data.
- All members can add and edit shared transactions.
- Budgets and goals are collaborative workspace resources.
- Record which member made a change and when.
- Confirm destructive actions and audit them.
- Do not add per-account, per-category, or per-feature permissions in Phase 1.
- Joining or accessing a family workspace requires authentication.
- If a manager would leave members behind while joining or leaving, block the
  operation until the manager explicitly confirms ownership transfer. On
  confirmation, promote the longest-standing remaining member before moving
  the manager. Cancelling leaves all memberships unchanged.

Membership administration needs a minimal distinction: a workspace creator or
designated manager may invite/remove members; this does not restrict ordinary
finance collaboration.

## Feature Gating

- The public About page explains the value of the product and provides clear
  Log in and Create account actions.
- Protected deep links return signed-out visitors to the About page. A future
  intent-preserving login redirect requires an explicit design.
- All finance views, Flow preview, workspace data, and CRUD actions require an
  authenticated account.
- Flow launch notifications require an account or explicit contact consent.
- Persistent personalized Flow history requires authentication.

## Finance Safety

- Do not guarantee outcomes, promise returns, or provide trading
  recommendations.
- Educational insights must include when appropriate:
  "This information is for educational purposes only and is not financial advice."
- User-entered data and calculations must be distinguishable from suggestions.
- Never shame users for spending, debt, or incomplete goals.
- Direct UPI intent is an external-app handoff, not automatic movement of money
  by NidhiFlow.
- A UPI app callback is unverified evidence. It must remain separate from bank
  verification and must not automatically create or confirm a transaction.
- The user must explicitly choose the destination app and verify the outcome in
  their bank or UPI app.
- When the experimental Android notification feature is explicitly enabled,
  a supported transaction notification may automatically create an ordinary
  workspace transaction without a separate review step.
- A notification-derived transaction immediately participates in balances,
  budgets, goals, reports, exports, and shared-workspace activity.
- Show `From notification` on every notification-derived entry. This identifies
  provenance and does not claim bank verification.
- All workspace members can view the entry, and ordinary edit and
  deletion/reversal rules remain available for corrections.

## Ethical Engagement

- Gamification is optional, transparent, and easy to disable.
- Challenges reward healthy actions, not screen time or transaction volume.
- Notifications are useful, configurable, and easy to disable.
- Do not use misleading controls, artificial urgency, endless prompts, or
  excessive rewards.

## Data Lifecycle

- Account export and deletion are supported.
- Archiving preserves historical references; deletion must respect audit,
  legal, and integrity requirements.
- Financial records should generally use soft deletion or reversal semantics
  where silent removal would damage history.
- Audit records are append-only and must not contain secrets or unnecessary
  sensitive payloads.
