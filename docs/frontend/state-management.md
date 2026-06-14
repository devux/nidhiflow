# State Management

## State Categories

### Local UI State

Use component state for open/closed controls, temporary selections, input
visibility, and other short-lived presentation state.

### Form State

Use React Hook Form and shared schemas. Do not duplicate form fields in a
global store.

### URL State

Put shareable/navigation state in the URL: report period, activity filters,
search query, selected tab, page, and sort where appropriate.

### Server State

Use TanStack Query or equivalent for authenticated API data. Define stable
query keys by workspace and resource. Mutations invalidate or update only
affected caches.

### Guest Domain State

IndexedDB is the durable source of truth. Access it through typed repositories
and reactive hooks. Do not load the entire finance history into one global
store.

### App State

A small store/context may hold session status, active workspace, connectivity,
theme, locale, and pending authentication intent.

### Guest Reminder State

Store the guest data-protection reminder preference locally. Track active
foreground time rather than wall-clock session duration.

- First eligible reminder threshold: five active minutes
- Repeating interval: five active minutes only after explicit opt-in
- Pause while hidden, idle, authenticating, or displaying another blocking
  surface
- Stop immediately after successful authentication or `Don't remind me again`
- Do not synchronize this preference or use it to upload guest finance data

## Guest/Account Separation

- Use explicit `guest`, `authenticating`, and `authenticated` modes.
- Namespace local records by installation/guest profile.
- Never merge guest and account caches implicitly.
- Migration produces a preview and only marks local data migrated after the
  server confirms the complete idempotent operation.
- Logout removes tokens, server cache, and account-sensitive memory before
  creating or restoring guest state.

## Optimistic Updates

Use only where rollback is reliable and financial correctness remains clear.
Display pending state. Shared financial writes should generally confirm server
success before appearing final.

## Offline Behavior

Guest mode remains locally usable. Authenticated offline writes require a
future explicit synchronization design; do not silently queue financial writes
in Phase 1 unless conflict and idempotency behavior is implemented.

## Derived State

Derive totals and percentages through tested selectors/domain functions. Do
not persist values that can become inconsistent unless needed as server-side
snapshots with defined provenance.

## Sensitive State

Do not persist access tokens in localStorage. Do not place passwords, reset
tokens, full financial payloads, or sensitive attachments in logs, analytics,
URLs, or generic global stores.
