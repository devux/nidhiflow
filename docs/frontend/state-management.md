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
Background reads and operations with an existing local pending state must not
activate the app-shell blocking loader. Home notification refreshes and Shared
Space code generation, join, leave, and workspace refresh actions remain
visible and report progress inside their owning component.
Authenticated transaction state revalidates in the background when Home is
entered and when the app returns to the foreground. Concurrent revalidation for
the same session/workspace is deduplicated, and failed refreshes retain only the
last server-confirmed snapshot until the next retry.

### Legacy Guest Domain State

Legacy local IndexedDB records remain isolated and inaccessible while guest
mode is parked. Do not display, change, merge, upload, or delete them.

### App State

A small store/context may hold session status, active workspace, connectivity,
theme, locale, and pending authentication intent.
An authenticated user has exactly one workspace membership, so workspace state
contains one current workspace rather than a switchable workspace list.
Generating a share code shares that current workspace. Joining with a code
replaces the current membership only after the backend completes the move.
When ownership transfer is required, the UI presents explicit Transfer and
Stay actions and does not change local workspace state until the transfer and
join succeed.
The browser session may retain the short-lived access token in `sessionStorage`
as a fallback when the refresh cookie is unavailable, but it must be cleared on
logout and must not be stored in `localStorage`.
The same browser session may also retain the current authenticated user and
current workspace summary in `sessionStorage` so a page refresh can render the
signed-in state immediately while the token is revalidated or refreshed.

## Public/Account Separation

- Use explicit `public`, `authenticating`, and `authenticated` modes.
- Public mode contains no finance-domain state.
- Namespace and preserve legacy guest records without exposing them.
- Never merge legacy guest and account caches implicitly.
- Logout removes tokens, server cache, and account-sensitive memory before
  returning to public About.

## Optimistic Updates

Use only where rollback is reliable and financial correctness remains clear.
Display pending state. Shared financial writes should generally confirm server
success before appearing final.

## Offline Behavior

Authenticated offline writes require a future explicit synchronization design;
do not silently queue financial writes in Phase 1 unless conflict and
idempotency behavior is implemented.

## Derived State

Derive totals and percentages through tested selectors/domain functions. Do
not persist values that can become inconsistent unless needed as server-side
snapshots with defined provenance.

## Sensitive State

Do not persist access tokens in `localStorage`. If `sessionStorage` is used as
a browser-session fallback, keep only the short-lived access token plus the
current user/workspace summary needed to avoid a refresh-time public fallback,
and clear it on logout or confirmed authentication failure. Do not place
passwords, reset tokens, full financial payloads, or sensitive attachments in
logs, analytics, URLs, or generic global stores.
