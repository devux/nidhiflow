# Validation Rules

## General

Validate path, query, headers, and body with explicit schemas. Reject unknown
fields for write contracts unless forward compatibility requires otherwise.
Normalize only after preserving user intent.

## Identifiers and Pagination

- IDs use one consistent server-generated format.
- `page >= 1`
- `1 <= pageSize <= 100`
- Sort fields come from an allowlist.
- Date ranges have a configured maximum for interactive requests.

## Money

- Decimal string, never JSON floating-point semantics for API money
- Greater than zero unless a specific adjustment rule permits otherwise
- Maximum precision follows the currency and database policy
- Currency is uppercase ISO 4217
- Reject scientific notation, `NaN`, and infinity

## Text

- Trim surrounding whitespace where appropriate.
- Transaction note maximum: 100 characters in Phase 1.
- Names, tags, feedback, and descriptions have documented bounded lengths.
- Sanitize on output/context; do not mutate meaningful text with ad hoc HTML
  stripping.

## Dates

- API timestamps are ISO 8601.
- Date-only finance fields use `YYYY-MM-DD`.
- Validate real calendar dates and range order.
- Interpret reporting periods using workspace timezone.

## Transactions

- Type is income, expense, or transfer.
- Amount, currency, date, and account requirements are explicit.
- Expense/income requires a compatible category.
- Transfer requires source and destination accounts and no category.
- Source and destination must differ.

## Accounts

- Type comes from an allowlist.
- Opening balance uses decimal-string validation.
- Archived accounts cannot receive new ordinary transactions unless restored.

## Budgets, Goals, and Bills

- Limits/targets/amounts are positive.
- Period boundaries are valid.
- Goal target date is optional but valid when present.
- Bill recurrence follows a defined enum/schema.
- Duplicate category budget for a period returns conflict.

## Authentication

- Normalize email casing/domain safely.
- Password policy follows authentication documentation.
- Tokens are bounded strings and never logged.

## Files

Validate size, MIME type, extension/signature, ownership, and malware strategy.
Store outside the web root. Generate safe server-side names.

## Errors

Validation failures return `422 VALIDATION_ERROR` with safe field details.
Malformed JSON or syntax returns `400`. Do not echo secrets or full sensitive
payloads.
