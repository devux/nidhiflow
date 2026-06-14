# Backend Business Logic

## Service Rules

All protected service methods receive an authenticated actor and workspace
context. Never trust a client-supplied user/workspace ID without membership
verification.

## Transactions

- Types: `income`, `expense`, `transfer`
- Amount must be positive; type determines reporting treatment.
- Transfer requires distinct source and destination accounts in the same
  workspace and creates balanced ledger effects.
- Category must belong to the workspace or be an allowed system category.
- Account/category/archive state is validated at transaction date as defined by
  product policy.
- Updates and deletions/reversals are audited.
- Recurring schedules generate ordinary transactions idempotently.

## Balances

Balances derive from opening balance and transaction effects. Cache/materialize
only with a reconciliation strategy. Credit and loan accounts have explicit
liability semantics.

## Budgets

- Budget periods use workspace timezone.
- Category budgets cannot duplicate the same category/period within a
  workspace.
- Spent excludes transfers and includes eligible expenses only.
- Remaining equals limit minus eligible spend.
- Overspending alerts are idempotent and preference-aware.

## Goals

- Goal targets are positive.
- Contributions cannot be negative unless modeled as an explicit withdrawal.
- Completed status derives from or is validated against progress.
- Goal changes in family workspaces are collaborative and attributed.

## Bills

- Bills define amount, currency, due date, recurrence, status, and optional
  linked transaction.
- Marking paid must not create duplicate transactions on retries.
- Reminder jobs use timezone and notification preferences.

## Reports

Reports use consistent transaction inclusion rules, workspace currency, and
explicit date ranges. Totals must reconcile with source transactions. Transfers
are excluded from income/expense totals.

## Family Workspace

All members view shared finance data and may add/edit transactions, budgets,
and goals. Membership administration uses the minimal manager capability
described in product rules. Every shared write records actor attribution.

## Feedback

Anonymous feedback excludes account identity unless consented. Authenticated
feedback may support status history and replies. Internal notes never appear in
user responses.

## Guest Migration

Validate the complete payload, calculate a preview, detect duplicates using
stable client IDs/fingerprints, and commit atomically. Preserve mappings from
guest IDs to server IDs and record an audit event without logging financial
payloads.
