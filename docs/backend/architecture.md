# Backend Architecture

## Stack

- Node.js
- Express
- TypeScript with strict mode
- PostgreSQL
- Schema-based validation
- Structured logging and OpenAPI generation/validation

## Module Architecture

Organize by business module with clean boundaries:

```text
src/
├── app/
│   ├── createApp.ts
│   ├── config/
│   ├── middleware/
│   └── routes.ts
├── modules/
│   ├── auth/
│   ├── users/
│   ├── workspaces/
│   ├── accounts/
│   ├── categories/
│   ├── transactions/
│   ├── budgets/
│   ├── goals/
│   ├── bills/
│   ├── reports/
│   ├── feedback/
│   ├── notifications/
│   └── audit/
├── shared/
│   ├── database/
│   ├── errors/
│   ├── logging/
│   ├── money/
│   ├── security/
│   └── types/
├── jobs/
├── openapi/
└── server.ts
```

Typical module:

```text
transactions/
├── transaction.routes.ts
├── transaction.controller.ts
├── transaction.service.ts
├── transaction.repository.ts
├── transaction.schemas.ts
├── transaction.types.ts
└── transaction.test.ts
```

## Responsibilities

- **Routes:** HTTP path, middleware, controller binding
- **Controllers:** parse validated context, call service, map result to HTTP
- **Services:** business rules, authorization context, transactions, auditing
- **Repositories:** parameterized data access and persistence mapping
- **Middleware:** request ID, security headers, authentication, rate limits,
  validation, error boundary
- **Jobs:** reminders, email, report generation, and cleanup

Controllers stay thin. Repositories do not decide business policy. Services do
not depend on Express request/response objects.

## Request Pipeline

Request ID -> security headers/CORS -> body limit -> rate limit ->
authentication -> validation -> authorization/service -> response -> error
handler.

## Transactions and Idempotency

Use database transactions for multi-step financial writes, guest migration,
workspace membership changes, and audit-coupled operations. Retryable writes
accept scoped idempotency keys and return the original result for safe retries.

## Guest Mode

Core guest finance data does not reach the backend. Public services are limited
to configuration/content where needed and anonymous feedback. Guest migration
is an authenticated, explicit, idempotent bulk operation.

## Error Handling

Throw typed application errors with stable codes. A centralized handler maps
them to the API envelope, logs safe context with `requestId`, and hides stack
traces/internal errors from clients.

## Testing

- Unit tests for domain/service rules
- Repository integration tests against PostgreSQL
- API contract tests for validation/auth/ownership
- End-to-end tests for migration and key financial workflows
