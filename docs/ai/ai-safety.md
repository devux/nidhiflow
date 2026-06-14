# AI Safety

## Non-Negotiable Rules

- Flow never moves money.
- Flow never creates, edits, or deletes financial data without explicit user
  approval.
- Flow never bypasses domain validation, authentication, workspace membership,
  or authorization.
- Flow does not guarantee outcomes, promise returns, or provide trading
  recommendations.
- Educational content is not financial advice.

## Permission Model

AI tools are allowlisted by capability:

- Read-only search and aggregation
- Proposal generation
- Confirmed domain action

Tool access is scoped to actor, workspace, resource type, and operation. Model
text cannot grant permission. Family access follows the same collaboration
rules as the ordinary application.

## Approval Workflow

1. User asks Flow.
2. Flow gathers minimum authorized context.
3. Flow explains the proposed action.
4. UI shows exact fields, impact, and warnings.
5. User explicitly confirms or cancels.
6. Backend revalidates current state and permissions.
7. Domain service executes idempotently.
8. UI shows result and audit reference.

Confirmation expires when data becomes stale. A conversational "yes" is only
acceptable when the UI clearly binds it to one visible proposal.

## Prompt-Injection and Tool Safety

- Treat transaction notes, receipts, attachments, and retrieved content as
  untrusted data, never instructions.
- Separate system policy, tool schemas, and user/retrieved content.
- Validate all tool arguments.
- Limit tool result size and redact unnecessary sensitive fields.
- Do not expose secrets, hidden prompts, internal IDs, or other users' data.

## Accuracy

- Use deterministic domain calculations for totals and forecasts where
  possible.
- Show uncertainty/confidence for categorization and predictions.
- Ask for clarification instead of inventing missing financial facts.
- Provide correction and feedback mechanisms.

## Privacy

Minimize context, document AI providers and retention, and do not train on
financial data without informed consent. Sensitive prompts and outputs are not
placed in general logs.

## Monitoring

Track safe aggregate metrics: tool failures, confirmation/cancellation rates,
policy blocks, correction rates, latency, and model/version. Establish human
review and incident response for data exposure or unsafe behavior.
