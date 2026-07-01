# Privacy Rules

## Principles

- Data minimization
- Purpose limitation
- Explicit consent
- Transparent retention
- User control
- Privacy by default

## Guest Data

Guest mode is read-only. Legacy guest finance data remains on the device and
may be displayed or explicitly migrated after authentication, but guest users
must not create, update, delete, or upload finance data. Explain risks of data
loss and shared devices. Do not create hidden server profiles, silently upload,
or include guest finance data in analytics.

Guest-to-account migration requires:

1. Authentication
2. Clear data preview
3. Duplicate handling
4. Explicit confirmation
5. Idempotent protected upload
6. Success verification before local cleanup

## Account Data

Collect only data needed for product operation, security, support, and
consented communication. Profiles, preferences, financial records,
attachments, notifications, and AI history have documented purposes and
retention periods.

## Consent

- Email notifications and Flow launch notices require affirmative consent.
- Marketing consent is separate from transactional communication.
- AI use of retained financial history is opt-in where appropriate and clearly
  explained.
- Consent withdrawal is easy and does not block unrelated core features.

## User Rights

Support account-data export, correction, session management, communication
preferences, and deletion requests. Final legal response periods and regional
requirements require counsel.

## Shared Workspaces

Tell users that all family members can view shared data and edit collaborative
finance resources. Avoid placing private personal records into a shared
workspace without clear intent. Define behavior when a member leaves.

## Analytics

Use privacy-preserving product analytics with no transaction descriptions,
amounts, account names, notes, attachment content, or AI prompts unless a
separate explicit research consent exists. Avoid third-party trackers on
sensitive screens.
Recipient UPI IDs, receiver names, payment amounts/notes, UPI URIs, transaction
references, and raw app callbacks are excluded from analytics.

## Payment Intent Data

Direct UPI attempts are sensitive account data. Explain that NidhiFlow hands
the request to another app and cannot confirm settlement. Retention, account
export, and deletion handling must include payment attempts and preserve only
the minimum audit metadata required for security.

## AI Privacy

Send the minimum authorized context required for a Flow request. Do not use
user financial data for model training without explicit informed consent and a
documented policy. Define provider retention, regional processing, deletion,
and subprocessors before launch.

## Retention

Create a retention schedule for account records, exports, attachments,
notifications, feedback, logs, audit events, deleted accounts, and backups.
Retention must balance user deletion rights, shared-record integrity, fraud
prevention, and legal obligations.

## Logging and Support

Mask sensitive values. Admin access is least-privileged, audited, and limited
to support need. Internal notes never appear to other users.
