# Admin Tools

## Scope

Phase 1 admin tools support users, feedback, system categories, operational
health, and security investigations. They are not a general database editor.

## Capabilities

- Search users by approved identifiers
- View account status and safe security metadata
- Assist with verification/session revocation through controlled actions
- Review, filter, assign, and update feedback
- Add internal feedback notes and user-visible replies
- Manage system category definitions
- Review notification delivery status
- View safe audit events and operational references
- Trigger or inspect approved export/deletion workflows

## Restrictions

- Admins do not view passwords, tokens, full payment credentials, or attachment
  contents by default.
- Financial data access requires a documented support purpose, elevated
  permission, user-consent policy where applicable, and audit logging.
- No direct arbitrary SQL or silent record editing in the admin UI.
- No impersonation without a separately designed, strongly audited policy.
- Internal notes never appear to users.

## Access Control

Use separate admin roles/capabilities, MFA, short sessions, least privilege,
network/device controls where appropriate, and periodic access reviews. Admin
authorization is separate from family workspace membership.

## Audit

Record admin actor, action, reason/ticket, target, request ID, time, and safe
before/after metadata. High-risk actions require step-up authentication and,
where appropriate, dual approval.

## Feedback Workflow

Suggested statuses: `new`, `triaged`, `planned`, `in_progress`, `resolved`,
`closed`, `spam`. Users see only approved status and messages, not internal
classification or notes.

## Safety

Destructive actions show impact, require confirmation, and prefer reversible
state changes. Export links are short-lived. Account deletion follows the
documented retention and shared-workspace policy.
