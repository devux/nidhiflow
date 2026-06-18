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

Guest domain state is read-only. Legacy local IndexedDB records may be read for
display and explicit migration, but guest users must not create, update, or
delete finance records locally.

### App State

A small store/context may hold session status, active workspace, connectivity,
theme, locale, and pending authentication intent.
The browser session may retain the short-lived access token in `sessionStorage`
as a fallback when the refresh cookie is unavailable, but it must be cleared on
logout and must not be stored in `localStorage`.
The same browser session may also retain the current authenticated user and
workspace summary in `sessionStorage` so a page refresh can render the
signed-in state immediately while the token is revalidated or refreshed.

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
- Guest mode is read-only. Block write attempts with an authentication prompt.
- Namespace any legacy local records by installation/guest profile.
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

Guest mode remains locally readable. Guest writes and authenticated offline
writes require a future explicit synchronization design; do not silently queue
financial writes in Phase 1 unless conflict and idempotency behavior is
implemented.

## Derived State

Derive totals and percentages through tested selectors/domain functions. Do
not persist values that can become inconsistent unless needed as server-side
snapshots with defined provenance.

## Sensitive State

Do not persist access tokens in `localStorage`. If `sessionStorage` is used as
a browser-session fallback, keep only the short-lived access token plus the
current user/workspace summary needed to avoid a refresh-time guest fallback,
and clear it on logout or confirmed authentication failure. Do not place
passwords, reset tokens, full financial payloads, or sensitive attachments in
logs, analytics, URLs, or generic global stores.
