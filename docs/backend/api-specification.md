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
- **Guest-compatible:** feature works locally; API is not required
- **Protected:** valid authenticated session and workspace membership

Core guest finance data has no CRUD API until explicit authenticated migration.

## Endpoint Catalog

### Auth

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create account |
| POST | `/auth/login` | Public | Start session |
| POST | `/auth/refresh` | Session | Rotate session |
| POST | `/auth/logout` | Session | Revoke current session |
| POST | `/auth/logout-all` | Protected | Revoke all sessions |
| POST | `/auth/verify-email` | Public token | Verify email |
| POST | `/auth/resend-verification` | Public | Resend safely |
| POST | `/auth/forgot-password` | Public | Request reset |
| POST | `/auth/reset-password` | Public token | Set new password |

### Users

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/users/me` | Protected | Current profile |
| PATCH | `/users/me` | Protected | Update profile/preferences |
| GET | `/users/me/sessions` | Protected | Active sessions |
| DELETE | `/users/me/sessions/:sessionId` | Protected | Revoke session |
| POST | `/users/me/export` | Protected | Request complete export |
| DELETE | `/users/me` | Protected | Request account deletion |
| POST | `/users/me/guest-migrations/preview` | Protected | Preview import |
| POST | `/users/me/guest-migrations` | Protected | Commit idempotent import |

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

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/workspaces` | Protected | List memberships |
| POST | `/workspaces` | Protected | Create personal/family workspace |
| GET | `/workspaces/:workspaceId` | Protected | Workspace details |
| PATCH | `/workspaces/:workspaceId` | Protected | Update settings |
| DELETE | `/workspaces/:workspaceId` | Manager | Delete/request deletion |
| GET | `/workspaces/:workspaceId/members` | Protected | List members |
| POST | `/workspaces/:workspaceId/invitations` | Manager | Invite member |
| POST | `/workspace-invitations/:token/accept` | Protected | Join workspace |
| DELETE | `/workspaces/:workspaceId/members/:userId` | Manager | Remove member |
| POST | `/workspaces/:workspaceId/leave` | Protected | Leave workspace |

### Accounts

| Method | Endpoint | Access |
|---|---|---|
| GET, POST | `/workspaces/:workspaceId/accounts` | Protected |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/accounts/:accountId` | Protected |
| POST | `/workspaces/:workspaceId/accounts/:accountId/archive` | Protected |
| POST | `/workspaces/:workspaceId/accounts/:accountId/restore` | Protected |
| GET | `/workspaces/:workspaceId/accounts/summary` | Protected |

Create example:

```json
{
  "name": "Cash",
  "type": "cash",
  "openingBalance": { "amount": "5000.00", "currency": "INR" }
}
```

### Categories

| Method | Endpoint | Access |
|---|---|---|
| GET | `/categories/system` | Public |
| GET, POST | `/workspaces/:workspaceId/categories` | Protected |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/categories/:categoryId` | Protected |
| POST | `/workspaces/:workspaceId/categories/:categoryId/archive` | Protected |
| POST | `/workspaces/:workspaceId/categories/:categoryId/restore` | Protected |

### Transactions

| Method | Endpoint | Access |
|---|---|---|
| GET, POST | `/workspaces/:workspaceId/transactions` | Protected |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/transactions/:transactionId` | Protected |
| POST | `/workspaces/:workspaceId/transactions/imports` | Protected |
| GET | `/workspaces/:workspaceId/transactions/exports` | Protected |

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

### Recurring Transactions

| Method | Endpoint | Access |
|---|---|---|
| GET, POST | `/workspaces/:workspaceId/recurring-transactions` | Protected |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/recurring-transactions/:recurringTransactionId` | Protected |
| POST | `/workspaces/:workspaceId/recurring-transactions/:recurringTransactionId/pause` | Protected |
| POST | `/workspaces/:workspaceId/recurring-transactions/:recurringTransactionId/resume` | Protected |

Generation jobs use the recurring item ID plus occurrence date as an
idempotency boundary.

### Budgets

| Method | Endpoint | Access |
|---|---|---|
| GET, POST | `/workspaces/:workspaceId/budgets` | Protected |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/budgets/:budgetId` | Protected |
| GET | `/workspaces/:workspaceId/budgets/summary` | Protected |

### Goals

| Method | Endpoint | Access |
|---|---|---|
| GET, POST | `/workspaces/:workspaceId/goals` | Protected |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/goals/:goalId` | Protected |
| POST | `/workspaces/:workspaceId/goals/:goalId/contributions` | Protected |
| DELETE | `/workspaces/:workspaceId/goals/:goalId/contributions/:id` | Protected |

### Bills

| Method | Endpoint | Access |
|---|---|---|
| GET, POST | `/workspaces/:workspaceId/bills` | Protected |
| GET, PATCH, DELETE | `/workspaces/:workspaceId/bills/:billId` | Protected |
| POST | `/workspaces/:workspaceId/bills/:billId/mark-paid` | Protected |

### Attachments

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/workspaces/:workspaceId/attachments/upload-requests` | Protected | Request controlled upload |
| POST | `/workspaces/:workspaceId/attachments/:attachmentId/complete` | Protected | Confirm upload and start validation |
| GET | `/workspaces/:workspaceId/attachments/:attachmentId` | Protected | Metadata/status |
| GET | `/workspaces/:workspaceId/attachments/:attachmentId/download` | Protected | Short-lived authorized download |
| DELETE | `/workspaces/:workspaceId/attachments/:attachmentId` | Protected | Remove attachment |

Do not expose a download until ownership, type/size validation, and required
malware scanning succeed.

### Reports

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/workspaces/:workspaceId/reports/summary` | Protected | Income/expense/savings |
| GET | `/workspaces/:workspaceId/reports/categories` | Protected | Category breakdown |
| GET | `/workspaces/:workspaceId/reports/cash-flow` | Protected | Trend |
| POST | `/workspaces/:workspaceId/reports/exports` | Protected | Generate export |
| GET | `/workspaces/:workspaceId/reports/exports/:exportId` | Protected | Export status/link |

### Feedback

| Method | Endpoint | Access |
|---|---|---|
| POST | `/feedback` | Public, rate-limited |
| GET | `/feedback/mine` | Protected |
| GET | `/feedback/:feedbackId` | Owner/admin |
| POST | `/feedback/:feedbackId/messages` | Owner/admin |

Anonymous requests omit identity and contact data. Attachments use a separate
approved upload flow.

### Notifications

| Method | Endpoint | Access |
|---|---|---|
| GET | `/notifications` | Protected |
| PATCH | `/notifications/:notificationId/read` | Protected |
| POST | `/notifications/read-all` | Protected |
| GET, PATCH | `/users/me/notification-preferences` | Protected |
| POST | `/flow-launch-subscriptions` | Public consent or protected |
| DELETE | `/flow-launch-subscriptions/:token` | Unsubscribe token |

## Security and Contract Rules

- Validate every input and enforce body/file limits.
- Enforce workspace membership in services, not only route middleware.
- Parameterize database queries.
- Return `404` for inaccessible resources where enumeration is a risk.
- Do not expose internal IDs if a public opaque identifier is intended.
- Keep contracts backward-compatible within `/v1`.
- Document all endpoints, schemas, examples, and error codes in OpenAPI.
