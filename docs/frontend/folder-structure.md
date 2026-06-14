# Frontend Folder Structure

Recommended structure:

```text
src/
├── app/
│   ├── App.tsx
│   ├── providers/
│   ├── router/
│   └── shell/
├── assets/
├── domain/
│   ├── money/
│   ├── transactions/
│   ├── budgets/
│   └── shared/
├── features/
│   ├── auth/
│   ├── accounts/
│   ├── activity/
│   ├── bills/
│   ├── budgets/
│   ├── categories/
│   ├── dashboard/
│   ├── feedback/
│   ├── flow/
│   ├── goals/
│   ├── notifications/
│   ├── profile/
│   ├── reports/
│   ├── transactions/
│   └── workspaces/
├── data/
│   ├── api/
│   ├── guest/
│   ├── migrations/
│   └── repositories/
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── schemas/
│   ├── types/
│   └── utils/
├── styles/
│   ├── tokens.css
│   ├── themes.css
│   └── globals.css
├── test/
└── main.tsx
```

## Feature Module Shape

```text
features/transactions/
├── api/
├── components/
├── hooks/
├── pages/
├── schemas/
├── types/
└── index.ts
```

Only create folders that contain real code. Feature internals are private;
`index.ts` exposes the supported public surface.

## Dependency Rules

- `app` may depend on features and shared code.
- Features may depend on domain, data abstractions, and shared code.
- Domain must not depend on React, routing, browser storage, or API DTOs.
- Shared components must not import feature code.
- Data adapters implement repository contracts; UI code does not know storage
  details.
- Avoid a generic `utils` dumping ground. Place logic near its domain.

## Naming

- Components and files: `PascalCase.tsx`
- Hooks: `useSomething.ts`
- Schemas and utilities: descriptive `camelCase.ts`
- Tests colocated as `*.test.ts(x)` or under a mirrored test directory
- Avoid ambiguous names such as `helpers.ts`, `common.ts`, or `data.ts`

## Assets

Reuse approved assets from `Figma/` where licensing and format permit. Convert
assets into optimized production forms without changing brand identity.
Decorative and meaningful images must have correct accessibility treatment.
