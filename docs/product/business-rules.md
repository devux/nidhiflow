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

## Guest Rules

- Login is optional for read-only product access.
- Guest users may view/read available data and product screens, but they must
  not create, update, delete, migrate, upload, or otherwise modify finance
  records.
- Guest write attempts must be blocked and replaced with a login/signup prompt
  that preserves the user's intent where practical.
- Legacy guest data remains on the device and is not silently uploaded.
- Explain that legacy guest data cannot be changed in guest mode and may be
  permanently lost if browser/app storage is cleared, the app is uninstalled,
  or the device is lost.
- Do not create hidden server-side guest profiles.
- Guests may not locally manage transactions, accounts, categories, budgets,
  bills, goals, reports, preferences that affect server data, education
  progress, achievements, or export.
- Anonymous feedback may use a narrowly scoped public endpoint.
- Authentication is required for every CRUD operation, server persistence,
  cloud backup/recovery, multi-device sync, shared workspaces, saved contact
  preferences, cloud attachments, persistent support history, account
  export/deletion, and persistent personalized AI.
- Preserve the current task when prompting for authentication.
- Account conversion must preview migration, detect duplicates, require
  confirmation, and never lose the local source on failed migration.
- After five minutes of active foreground guest use, the app may show a
  non-blocking data-protection reminder explaining that creating an account
  enables backup, recovery, and synchronization.
- The reminder must say that guest mode is read-only and any legacy local data
  may be lost if local app/browser data is cleared, the app is uninstalled, or
  the device is lost.
- The first reminder may appear automatically. Repeating it every five minutes
  requires the guest to explicitly enable `Remind me every 5 minutes`.
- A guest can dismiss the reminder, select `Don't remind me again`, or disable
  it later in preferences without losing access to any guest feature.
- Count only active foreground use. Reset or pause the timer while the app is
  hidden, the device is idle, a login flow is open, or the reminder is visible.

## Family Collaboration

- A family shares one workspace instance.
- All Phase 1 family members can view shared workspace data.
- All members can add and edit shared transactions.
- Budgets and goals are collaborative workspace resources.
- Record which member made a change and when.
- Confirm destructive actions and audit them.
- Do not add per-account, per-category, or per-feature permissions in Phase 1.
- Joining or accessing a family workspace requires authentication.

Membership administration needs a minimal distinction: a workspace creator or
designated manager may invite/remove members and delete the workspace; this
does not restrict ordinary finance collaboration. Final naming and transfer of
this responsibility are listed as future decisions.

## Feature Gating

- Prompt for login only at the moment a requested capability needs identity,
  server persistence, synchronization, or communication.
- Explain the benefit and allow cancellation back to guest mode.
- All CRUD actions need identity and server persistence, so they must always be
  gated for guest users.
- The optional five-minute guest data-protection reminder is an exception to
  contextual feature gating, but it must remain informational and non-blocking.
- Flow preview is public/guest-compatible.
- Flow launch notifications require an account or explicit contact consent.
- Persistent personalized Flow history requires authentication.

## Finance Safety

- Do not guarantee outcomes, promise returns, or provide trading
  recommendations.
- Educational insights must include when appropriate:
  "This information is for educational purposes only and is not financial advice."
- User-entered data and calculations must be distinguishable from suggestions.
- Never shame users for spending, debt, or incomplete goals.

## Ethical Engagement

- Gamification is optional, transparent, and easy to disable.
- Challenges reward healthy actions, not screen time or transaction volume.
- Notifications are useful, configurable, and easy to disable.
- Never repeat the guest login reminder every five minutes unless the user has
  explicitly opted into that frequency.
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
