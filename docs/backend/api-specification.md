# API Specification

## Conventions

- Base path: `/api/v1`
- JSON over HTTPS
- Plural resource names and standard HTTP methods
- camelCase fields
- UTC ISO 8601 timestamps
- Money: `{ "amount": "1250.00", "currency": "INR" }`
- `Idempotency-Key` on retryable financial writes and guest migration
- `X-Request-Id` accepted/generated and returned in response metadata
- Maximum page size: 100
- OpenAPI is the executable contract
- Any backend API route, request schema, response schema, authentication
  requirement, validation rule, status code, or error code change must update
  Swagger/OpenAPI in the same change.

## Response Envelopes

Success:

```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "id": "txn_123",
    "type": "expense",
    "money": { "amount": "1250.00", "currency": "INR" }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-06-15T10:30:00Z"
  }
}
```

Paginated responses add:

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 125,
    "totalPages": 7,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

Error:

```json
{
  "success": false,
  "message": "The request could not be processed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "amount", "message": "Amount must be greater than zero" }
    ]
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-06-15T10:30:00Z"
  }
}
```

`204 No Content` has no body. Statuses include `200`, `201`, `204`, `400`,
`401`, `403`, `404`, `409`, `422`, `429`, and `500`.

## Access Classes

- **Public:** no account, narrowly scoped and rate-limited
- **Guest-compatible:** read-only feature works without authentication; writes
  are blocked client-side and protected server-side
- **Protected:** valid authenticated session and workspace membership

Finance CRUD APIs are protected. Guest requests without a valid authenticated
session receive `401` and must not create, update, delete, or modify data.

## Endpoint Catalog

### Auth

| Method | Endpoint                    | Access       | Purpose                          |
| ------ | --------------------------- | ------------ | -------------------------------- |
| POST   | `/auth/register`            | Public       | Create account and start session |
| POST   | `/auth/login`               | Public       | Start session                    |
| POST   | `/auth/refresh`             | Session      | Rotate session                   |
| POST   | `/auth/logout`              | Session      | Revoke current session           |
| POST   | `/auth/logout-all`          | Protected    | Revoke all sessions              |
| POST   | `/auth/verify-email`        | Public token | Deferred email verification      |
| POST   | `/auth/resend-verification` | Public       | Deferred verification resend     |
| POST   | `/auth/forgot-password`     | Public       | Request reset                    |
| POST   | `/auth/reset-password`      | Public token | Set new password                 |

### Users

| Method | Endpoint                             | Access    | Purpose                    |
| ------ | ------------------------------------ | --------- | -------------------------- |
| GET    | `/users/me`                          | Protected | Current profile            |
| PATCH  | `/users/me`                          | Protected | Update profile/preferences |
| GET    | `/users/me/sessions`                 | Protected | Active sessions            |
| DELETE | `/users/me/sessions/:sessionId`      | Protected | Revoke session             |
| POST   | `/users/me/export`                   | Protected | Request complete export    |
| DELETE | `/users/me`                          | Protected | Request account deletion   |
| POST   | `/users/me/guest-migrations/preview` | Protected | Preview import             |
| POST   | `/users/me/guest-migrations`         | Protected | Commit idempotent import   |

Migration request example:

```json
{
  "clientMigrationId": "migration_abc",
  "workspace": { "name": "My Finances", "currency": "INR" },
  "accounts": [],
  "categories": [],
  "transactions": [],
  "budgets": [],
  "goals": [],
  "bills": []
}
```

### Workspaces

| Method | Endpoint                                   | Access    | Purpose                          |
| ------ | ------------------------------------------ | --------- | -------------------------------- |
| GET    | `/workspaces`                              | Protected | List memberships                 |
| POST   | `/workspaces`                              | Protected | Create personal/family workspace |
| GET    | `/workspaces/:workspaceId`                 | Protected | Workspace details                |
| PATCH  | `/workspaces/:workspaceId`                 | Protected | Update settings                  |
| DELETE | `/workspaces/:workspaceId`                 | Manager   | Delete/request deletion          |
| GET    | `/workspaces/:workspaceId/members`         | Protected | List members                     |
| POST   | `/workspaces/:workspaceId/invitations`     | Manager   | Invite member                    |
| POST   | `/workspace-invitations/:token/accept`     | Protected | Join workspace                   |
| DELETE | `/workspaces/:workspaceId/members/:userId` | Manager   | Remove member                    |
| POST   | `/workspaces/:workspaceId/leave`           | Protected | Leave workspace                  |

Join requests accept `{ "transferOwnership": true }` only when the user's
current workspace still has other members. Without explicit confirmation the
API returns `409 OWNERSHIP_TRANSFER_REQUIRED` and changes nothing. A successful
join atomically transfers ownership when required, removes the prior
membership, and creates the destination membership. Leaving a workspace creates
and returns a new workspace for the departing user. In non-production
environments, invitation creation returns a `debugToken` so local development
and automated tests can complete the join flow before email delivery
infrastructure exists.
Workspace responses include `ownerDisplayName`, sourced from the workspace
creator's current profile, separately from the editable workspace `name`.

### Accounts

| Method             | Endpoint                                               | Access    |
| ------------------ | ------------------------------------------------------ | --------- |
| GET, POST          | `/workspaces/:workspaceId/accounts`                    | Protected |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/accounts/:accountId`         | Protected |
| POST               | `/workspaces/:workspaceId/accounts/:accountId/archive` | Protected |
| POST               | `/workspaces/:workspaceId/accounts/:accountId/restore` | Protected |
| GET                | `/workspaces/:workspaceId/accounts/summary`            | Protected |

Create example:

```json
{
  "name": "Cash",
  "type": "cash",
  "openingBalance": { "amount": "5000.00", "currency": "INR" }
}
```

Exact duplicate account create requests return `200` with the existing matching
account so safe client retries do not fail. Duplicate account names with
different type, currency, or opening balance return `409 CONFLICT`.

### Categories

| Method             | Endpoint                                                  | Access    |
| ------------------ | --------------------------------------------------------- | --------- |
| GET                | `/categories/system`                                      | Public    |
| GET, POST          | `/workspaces/:workspaceId/categories`                     | Protected |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/categories/:categoryId`         | Protected |
| POST               | `/workspaces/:workspaceId/categories/:categoryId/archive` | Protected |
| POST               | `/workspaces/:workspaceId/categories/:categoryId/restore` | Protected |

### Transactions

| Method             | Endpoint                                                  | Access                   |
| ------------------ | --------------------------------------------------------- | ------------------------ |
| GET, POST          | `/workspaces/:workspaceId/transactions`                   | Protected                |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/transactions/:transactionId`    | Protected                |
| POST               | `/workspaces/:workspaceId/transactions/imports`           | Protected                |
| POST               | `/workspaces/:workspaceId/transactions/from-notification` | Protected, feature-gated |
| GET                | `/workspaces/:workspaceId/transactions/exports`           | Protected                |

Create example:

```json
{
  "type": "expense",
  "money": { "amount": "1250.00", "currency": "INR" },
  "accountId": "acc_123",
  "categoryId": "cat_food",
  "transactionDate": "2026-06-15",
  "note": "Lunch"
}
```

List filters include `type`, `accountId`, `categoryId`, `from`, `to`, `query`,
`page`, `pageSize`, and allowlisted `sort`.

`PATCH /workspaces/:workspaceId/transactions/:transactionId` replaces the
transaction payload using the same validation rules as create. `DELETE` soft
deletes the transaction and records an audit event.

Notification ingestion accepts only derived fields: account, positive INR
amount, income/expense type, category hint, transaction/detection dates,
allowlisted Android source package (including normalized
`android.default_sms`), parser version, optional merchant hint, and a SHA-256
source fingerprint. It never accepts raw notification content. The fingerprint
is idempotent per user. Created entries are ordinary shared transactions with
`source=ANDROID_NOTIFICATION`; duplicate requests return the existing entry
only within its original workspace.

### Recurring Transactions

| Method             | Endpoint                                                                         | Access    |
| ------------------ | -------------------------------------------------------------------------------- | --------- |
| GET, POST          | `/workspaces/:workspaceId/recurring-transactions`                                | Protected |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/recurring-transactions/:recurringTransactionId`        | Protected |
| POST               | `/workspaces/:workspaceId/recurring-transactions/:recurringTransactionId/pause`  | Protected |
| POST               | `/workspaces/:workspaceId/recurring-transactions/:recurringTransactionId/resume` | Protected |

Generation jobs use the recurring item ID plus occurrence date as an
idempotency boundary.

### Budgets

| Method             | Endpoint                                     | Access    |
| ------------------ | -------------------------------------------- | --------- |
| GET, POST          | `/workspaces/:workspaceId/budgets`           | Protected |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/budgets/:budgetId` | Protected |
| GET                | `/workspaces/:workspaceId/budgets/summary`   | Protected |

### Goals

| Method             | Endpoint                                                   | Access    |
| ------------------ | ---------------------------------------------------------- | --------- |
| GET, POST          | `/workspaces/:workspaceId/goals`                           | Protected |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/goals/:goalId`                   | Protected |
| POST               | `/workspaces/:workspaceId/goals/:goalId/contributions`     | Protected |
| DELETE             | `/workspaces/:workspaceId/goals/:goalId/contributions/:id` | Protected |

### Bills

| Method             | Endpoint                                           | Access    |
| ------------------ | -------------------------------------------------- | --------- |
| GET, POST          | `/workspaces/:workspaceId/bills`                   | Protected |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/bills/:billId`           | Protected |
| POST               | `/workspaces/:workspaceId/bills/:billId/mark-paid` | Protected |

### Attachments

| Method | Endpoint                                                      | Access    | Purpose                             |
| ------ | ------------------------------------------------------------- | --------- | ----------------------------------- |
| POST   | `/workspaces/:workspaceId/attachments/upload-requests`        | Protected | Request controlled upload           |
| POST   | `/workspaces/:workspaceId/attachments/:attachmentId/complete` | Protected | Confirm upload and start validation |
| GET    | `/workspaces/:workspaceId/attachments/:attachmentId`          | Protected | Metadata/status                     |
| GET    | `/workspaces/:workspaceId/attachments/:attachmentId/download` | Protected | Short-lived authorized download     |
| DELETE | `/workspaces/:workspaceId/attachments/:attachmentId`          | Protected | Remove attachment                   |

Do not expose a download until ownership, type/size validation, and required
malware scanning succeed.

### Reports

| Method | Endpoint                                                      | Access    | Purpose                |
| ------ | ------------------------------------------------------------- | --------- | ---------------------- |
| GET    | `/workspaces/:workspaceId/reports/summary`                    | Protected | Income/expense/savings |
| GET    | `/workspaces/:workspaceId/reports/categories`                 | Protected | Category breakdown     |
| GET    | `/workspaces/:workspaceId/reports/cash-flow`                  | Protected | Trend                  |
| POST   | `/workspaces/:workspaceId/reports/exports`                    | Protected | Generate export        |
| GET    | `/workspaces/:workspaceId/reports/exports/:exportId`          | Protected | Export status/link     |
| GET    | `/workspaces/:workspaceId/reports/exports/:exportId/download` | Protected | Download CSV           |

Report filters use `period=thisMonth|lastMonth|thisYear|custom`. Custom ranges require
`from` and `to` in `YYYY-MM-DD` form and are interpreted in the workspace timezone.
The export request accepts `reportType=summary|categories|cashFlow`.

### Feedback

| Method | Endpoint                         | Access               |
| ------ | -------------------------------- | -------------------- |
| POST   | `/feedback`                      | Public, rate-limited |
| GET    | `/feedback/mine`                 | Protected            |
| GET    | `/feedback/:feedbackId`          | Owner/admin          |
| POST   | `/feedback/:feedbackId/messages` | Owner/admin          |

Anonymous requests omit identity and contact data. Attachments use a separate
approved upload flow.

### Direct UPI Payments

| Method | Endpoint                  | Access    | Purpose                             |
| ------ | ------------------------- | --------- | ----------------------------------- |
| POST   | `/payments/create`        | Protected | Create server reference and UPI URI |
| POST   | `/payments/update-status` | Protected | Store an unverified app callback    |
| GET    | `/payments/:paymentId`    | Owner     | Read one payment attempt            |
| GET    | `/payments/user/:userId`  | Same user | List the latest 100 attempts        |

Create accepts `payeeUpiId`, optional `payeeName`, decimal-string `amount`,
literal currency `INR`, optional `note`, `selectedUpiApp`, and
`source=QR_SCAN|MANUAL_ENTRY`. `QR_SCAN` additionally requires the original
`qrUpiUri` (maximum 2,048 characters); `MANUAL_ENTRY` rejects that field.
Scanned merchant and signed parameters are preserved, while manual entry gets
a generated UPI `tr`. Every attempt has a separate server-generated internal
reference. The authenticated token supplies ownership.
Status update accepts the payment ID, matching selected app, reported status,
and optional bounded raw/parsed callback fields. Responses always expose
`appReportedStatus` separately from `verificationStatus`.

### Notifications

| Method     | Endpoint                              | Access                      |
| ---------- | ------------------------------------- | --------------------------- |
| GET        | `/notifications`                      | Protected                   |
| PATCH      | `/notifications/:notificationId/read` | Protected                   |
| POST       | `/notifications/read-all`             | Protected                   |
| GET, PATCH | `/users/me/notification-preferences`  | Protected                   |
| POST       | `/flow-launch-subscriptions`          | Public consent or protected |
| DELETE     | `/flow-launch-subscriptions/:token`   | Unsubscribe token           |

Flow launch subscriptions require an email address when used without an
account. Store only hashed unsubscribe tokens server-side; non-production
responses may include a `debugToken` for local testing.

## Security and Contract Rules

- Validate every input and enforce body/file limits.
- Enforce workspace membership in services, not only route middleware.
- Parameterize database queries.
- Return `404` for inaccessible resources where enumeration is a risk.
- Do not expose internal IDs if a public opaque identifier is intended.
- Keep contracts backward-compatible within `/v1`.
- Document all endpoints, schemas, examples, and error codes in OpenAPI.
- Keep Swagger/OpenAPI synchronized with every API contract change before the
  change is considered complete.
