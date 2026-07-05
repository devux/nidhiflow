# Frontend Architecture

## Stack

- React
- TypeScript with strict mode
- React Router for client routing and route-level code splitting
- TanStack Query for server state
- A lightweight client-state store only where React context/state is
  insufficient
- React Hook Form with a shared schema validator such as Zod
- IndexedDB adapter retained only for parked legacy guest-data compatibility

Webpack 5 provides frontend development and production builds. Jest, Testing
Library, and `jest-axe` cover frontend behavior and accessibility smoke tests.
TanStack Query, React Hook Form, charting, and any additional client-state
library remain feature-driven decisions.

## Architecture Layers

1. **App shell:** providers, routing, navigation, themes, error boundaries
2. **Feature modules:** screens, feature components, hooks, schemas, mappings
3. **Domain:** framework-light finance types, calculations, and policies
4. **Data:** API client, server repositories, and parked legacy guest adapters
5. **Shared UI:** design-system components and accessibility primitives

Feature code must not read storage or call `fetch` directly. It uses repository
interfaces and authenticated API clients.

## Routing

Use route-based code splitting. Public routes are About, Login, and Signup.
Every finance and app-shell route uses a global authentication guard.
Unauthorized workspace resources render a safe not-found state.
The authenticated notification control routes to `/notifications`; notification
destinations are selected from a fixed client allowlist before navigation.
Profile settings route to `/settings`, keeping category management separate
from the compact `/you` page.

## Public and Account Modes

- Public mode renders About, Login, and Signup without finance data.
- Account mode uses the API and server-state cache.
- Legacy guest IndexedDB adapters remain parked for compatibility but are not
  mounted as a user-accessible finance mode.
- Logout clears credentials and account caches, then returns to public About.

## API Layer

Use one typed API client responsible for base URL, JSON handling, request IDs,
authentication, refresh coordination, timeouts, cancellation, and normalized
errors. Feature repositories map API DTOs to domain models.

Do not retry non-idempotent writes automatically without an idempotency key.

## Forms and Validation

Forms use shared schemas where feasible. Client validation improves feedback;
the server remains authoritative. Preserve values on errors, focus the first
invalid field, and map server field errors to controls.

## Responsive Strategy

The shared React application must be production-complete on the web. Implement
and test responsive behavior in this order:

1. Mobile phones on Android and iOS browser/WebView engines
2. Desktop web compatibility
3. Tablet web compatibility

Mobile phones are the product focus and acceptance baseline. Desktop and tablet
support the same platform-neutral workflows but do not define separate product
scope. Android-only native integrations remain behind capability checks and
must not break web or iOS builds.

Use the following project breakpoints for all new responsive layout work:

| Viewport      | Minimum width |
| ------------- | ------------: |
| Small phones  |       `320px` |
| Large phones  |       `425px` |
| Tablets       |       `768px` |
| Laptops       |      `1024px` |
| Desktops      |      `1440px` |
| Large screens |      `2560px` |

Build the base styles for mobile first, then add enhancements with
`min-width` media queries:

```css
/* Small phones */
@media (min-width: 320px) {
}

/* Large phones */
@media (min-width: 425px) {
}

/* Tablets */
@media (min-width: 768px) {
}

/* Laptops */
@media (min-width: 1024px) {
}

/* Desktops */
@media (min-width: 1440px) {
}

/* Large screens */
@media (min-width: 2560px) {
}
```

Add a media query only when that viewport needs an actual layout change.
Desktop may use additional panels or denser presentation but must preserve
behavior and terminology.

## Theme and Localization

Semantic design tokens support light/dark themes. Theme preference respects
system default until explicitly chosen. Use `Intl` APIs for money, dates,
numbers, and relative time. Currency comes from the workspace/user context.
Authenticated theme, locale, and currency controls initialize from the user
profile and persist through the profile API rather than device-only storage.
Theme tokens and chart colors must react across every authenticated route.
Locale updates set the document language and all `Intl` formatting. Currency is
an explicit property of stored finance records: changing the preferred
currency updates global defaults and compatible summaries but must never
silently relabel existing amounts without a defined conversion.

## Quality

Use unit tests for domain helpers and repositories, component tests for
interactions/accessibility, and end-to-end tests for public entry,
authentication, transaction creation, budgets, goals, reports, and family
collaboration.

Run browser coverage against Chromium and WebKit-compatible mobile behavior.
Before the Android launch, maintain an internal Capacitor iOS build check on
macOS infrastructure even though public iOS distribution is deferred.
