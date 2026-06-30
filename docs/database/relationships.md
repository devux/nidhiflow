# Database Relationships

## ERD-Style Overview

```text
users 1---* auth_sessions
users 1---* workspace_members *---1 workspaces
workspaces 1---* accounts
workspaces 1---* categories
workspaces 1---* transactions
workspaces 1---* budgets
workspaces 1---* goals 1---* goal_contributions
workspaces 1---* bills
workspaces 1---* recurring_transactions
workspaces 1---* attachments
users 1---* notifications
users 0---* feedback 1---* feedback_messages
workspaces 0---* audit_logs
```

## Ownership Boundary

Workspace is the primary finance tenancy boundary. Accounts, custom categories,
transactions, budgets, goals, bills, recurring templates, attachments, and
reports belong to exactly one workspace.

Every repository query for protected finance data includes `workspace_id`.
Membership is checked before service operations. IDs alone never grant access.

## Users and Workspaces

A user belongs to exactly one active workspace through one membership row.
Joining another workspace moves that membership atomically. Leaving creates a
new workspace and manager membership atomically. The minimal administrative
role governs invitation, removal, and confirmed ownership transfer; finance
resources remain collaborative.

## Transactions

- `account_id` is the primary affected account.
- `destination_account_id` is required only for transfers.
- `category_id` is required for income/expense under configured rules and null
  for transfers.
- `created_by_user_id`/`updated_by_user_id` attribute family changes.
- A generated recurring transaction references its template.
- Attachments may be linked to transactions.

Cross-workspace account/category references are prohibited by service checks
and, where practical, composite foreign-key constraints.

## Budgets

A budget belongs to a workspace and optionally a category. Budget spend is
derived from eligible expense transactions in the budget period; no direct
transaction-to-budget foreign key is required.

## Goals

Goals own contributions. A contribution may reference a transaction when
funding is represented in account history. Deleting a transaction must not
silently remove historical goal meaning; define reversal/reconciliation
behavior.

## Bills

A bill may reference a category/account and one paid transaction. Mark-paid is
idempotent so retries do not create duplicate transactions.

## Notifications

Notifications belong to users because delivery/read state is personal. They
may reference a workspace or resource through a safe typed reference.

## Feedback

Feedback may be anonymous (`user_id` null) or authenticated. User-visible
messages and internal admin notes use explicit visibility.

## Audit Logs

Audit logs may reference actor, workspace, and resource using stable opaque
identifiers. They are append-only and survive normal resource soft deletion.
Do not use cascading deletes that erase required security history.

## Delete Behavior

- Restrict deletion when it would break finance integrity.
- Prefer archive/soft delete for accounts, categories, transactions, budgets,
  goals, and bills.
- Cascade only owned non-audit children when policy explicitly permits.
- User/account deletion anonymizes or retains records according to finalized
  legal policy while preserving shared workspace integrity.
