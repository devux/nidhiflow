# Frontend Architecture

## Stack

- React
- TypeScript with strict mode
- React Router for client routing and route-level code splitting
- TanStack Query for server state
- A lightweight client-state store only where React context/state is
  insufficient
- React Hook Form with a shared schema validator such as Zod
- IndexedDB through the typed `idb` adapter for guest finance data

Webpack 5 provides frontend development and production builds. Jest, Testing
Library, and `jest-axe` cover frontend behavior and accessibility smoke tests.
TanStack Query, React Hook Form, charting, and any additional client-state
library remain feature-driven decisions.

## Architecture Layers

1. **App shell:** providers, routing, navigation, themes, error boundaries
2. **Feature modules:** screens, feature components, hooks, schemas, mappings
3. **Domain:** framework-light finance types, calculations, and policies
4. **Data:** API client, server repositories, guest repositories, migrations
5. **Shared UI:** design-system components and accessibility primitives

Feature code must not read storage or call `fetch` directly. It uses repository
interfaces so guest and authenticated implementations share domain behavior.

## Routing

Use route-based code splitting. Public/guest routes include Home, Activity,
Plan, Goals, Reports, You, transaction forms, education, feedback, and Flow
preview. Protected capabilities use an intent-preserving authentication guard,
not a global login wall.

After authentication, return to the original route and action. Unauthorized
workspace resources render a safe not-found state.

## Guest and Account Modes

- Guest data is stored in IndexedDB or an equivalent secure structured local
  store, not raw localStorage.
- Small non-sensitive preferences may use localStorage.
- A local data version supports client-side migrations.
- Account mode uses the API and server state cache.
- Guest-to-account conversion runs an explicit migration workflow with
  preview, duplicate detection, idempotent upload, confirmation, and rollback.
- Logout clears credentials and account caches, then creates a separate guest
  context without mixing data.

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

Implement and test in this order:

1. Mobile
2. Desktop
3. Tablet

Use content-driven breakpoints and responsive components. Desktop may use
additional panels or denser presentation but must preserve behavior and
terminology.

## Theme and Localization

Semantic design tokens support light/dark themes. Theme preference respects
system default until explicitly chosen. Use `Intl` APIs for money, dates,
numbers, and relative time. Currency comes from the workspace/user context.

## Quality

Use unit tests for domain helpers and repositories, component tests for
interactions/accessibility, and end-to-end tests for guest entry,
guest-to-account migration, authentication, transaction creation, budgets,
goals, reports, and family collaboration.
