# Database Schema Design

## Standards

- PostgreSQL
- UUIDv7 or another sortable opaque ID strategy, selected consistently
- `timestamptz` for timestamps
- `numeric(19,4)` or a finalized currency-aware precision for money
- ISO 4217 `char(3)` currency codes
- `created_at` and `updated_at` on mutable tables
- Foreign keys, check constraints, and unique constraints enforce invariants
- All application access uses parameterized queries

## Core Tables

### users

- `id` PK
- `email` case-insensitive unique
- `password_hash`
- `email_verified_at`
- `display_name`, `avatar_key`
- `locale`, `timezone`, `preferred_currency`, `theme`
- `status`
- `created_at`, `updated_at`, `deleted_at`

Never store plain-text passwords or provider tokens.

### auth_sessions

- `id` PK, `user_id` FK
- `refresh_token_hash`, `token_family_id`
- `expires_at`, `last_used_at`, `revoked_at`
- safe device/IP metadata
- timestamps

### workspaces

- `id` PK
- `name`, `type` (`personal`, `family`)
- `reporting_currency`, `timezone`
- `created_by_user_id` FK
- timestamps, `deleted_at`

### workspace_members

- `id` PK
- `workspace_id`, `user_id` FKs
- minimal `membership_role` for membership administration
- `joined_at`, timestamps
- unique `(workspace_id, user_id)`

Role must not restrict ordinary Phase 1 finance collaboration.

### workspace_invitations

- `id` PK, `workspace_id` FK
- invited email, inviting user, hashed invitation token
- status (`pending`, `accepted`, `revoked`, `expired`)
- expiry, accepted user/time, revoked time
- timestamps

### accounts

- `id`, `workspace_id`
- `name`, `type`
- `opening_balance`, `currency`
- `is_archived`, `archived_at`
- timestamps, optional `deleted_at`

### categories

- `id`
- nullable `workspace_id` for system categories
- nullable `parent_id`
- `transaction_type`, `name`, `icon_key`, `color_token`
- `is_system`, `is_archived`
- timestamps

### transactions

- `id`, `workspace_id`
- `type` (`income`, `expense`, `transfer`)
- `amount`, `currency`
- `account_id`
- nullable `destination_account_id` for transfer
- nullable `category_id`
- `transaction_date`, nullable `occurred_at`
- nullable `payment_method`, `note`
- nullable `recurring_transaction_id`
- `created_by_user_id`, `updated_by_user_id`
- nullable stable `client_id` for migration/idempotency
- timestamps, `deleted_at`

Checks enforce positive amount, transfer account rules, and category rules.

### transaction_tags

- `transaction_id`, `tag_id`
- composite PK

### recurring_transactions

- workspace/account/category/type/money template
- recurrence rule, timezone, next occurrence, active state
- timestamps

### budgets

- `id`, `workspace_id`
- nullable `category_id` for total budget
- `period_start`, `period_end`
- `limit_amount`, `currency`
- `created_by_user_id`
- timestamps, `deleted_at`

Unique active budget per workspace/category/period.

### goals

- `id`, `workspace_id`
- `name`, `type`, `target_amount`, `currency`
- nullable `target_date`, `image_key`
- `status`, `created_by_user_id`
- timestamps, `deleted_at`

### goal_contributions

- `id`, `goal_id`
- `amount`, `currency`, `contribution_date`
- nullable `transaction_id`
- `created_by_user_id`
- timestamps, `deleted_at`

### bills

- `id`, `workspace_id`
- `name`, `amount`, `currency`
- `due_date`, recurrence rule, `status`
- nullable `category_id`, `account_id`, `paid_transaction_id`
- timestamps, `deleted_at`

### attachments

- `id`, `workspace_id`, `uploaded_by_user_id`
- owner resource type/ID or normalized join tables
- storage key, safe filename, MIME type, size, scan status
- timestamps, `deleted_at`

### notifications

- `id`, `user_id`, nullable `workspace_id`
- `type`, safe payload/reference, `read_at`, `sent_at`
- timestamps

### notification_preferences

- `user_id` PK/FK
- channel and event preferences
- quiet hours/timezone
- timestamps

### flow_launch_subscriptions

- `id`, nullable `user_id`
- consented email when no account exists
- hashed unsubscribe token
- consent and unsubscribe timestamps
- timestamps

### feedback

- `id`, nullable `user_id`
- category, description, status
- nullable consented contact data
- timestamps, `deleted_at`

### feedback_messages

- `id`, `feedback_id`, actor type/ID
- message, visibility (`user`, `internal`)
- timestamps

### audit_logs

- `id`, nullable actor/user/workspace IDs
- action, resource type, opaque resource ID
- safe change metadata, request ID, timestamp
- no `updated_at`; append-only

### idempotency_keys

- actor/workspace scope, key, request fingerprint, response reference/status,
  expiry, timestamps
- unique scoped key

### generated_reports

- `id`, `workspace_id`, `requested_by_user_id`
- type, parameters, status, storage key, expiry
- timestamps

## Index Recommendations

- All foreign keys
- `transactions(workspace_id, transaction_date desc)`
- transaction filters by type/account/category and non-deleted state
- `budgets(workspace_id, period_start, period_end)`
- `bills(workspace_id, due_date, status)`
- `goals(workspace_id, status)`
- unread notifications by user
- feedback status/created time for admins
- audit workspace/resource/time
- partial indexes for active/non-deleted records

Verify indexes with production-like query plans; avoid speculative duplication.
