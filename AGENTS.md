# NidhiFlow Agent Guide

This is the master instruction file for NidhiFlow. The detailed requirements
live under `docs/`; do not duplicate them in code comments or new root files.

## Product Summary

NidhiFlow is a mobile-first, guest-first personal finance application for
individuals, families, and self-employed users. Phase 1 delivers reliable core
finance workflows. Phase 2 introduces the Flow AI assistant.

## Non-Negotiable Principles

1. Mobile first, desktop second, tablet third.
2. Guest first: login is optional for local core features.
3. Security, privacy, and accessibility are required, not deferred work.
4. Personal and household finance remain the primary scope.
5. Complete and stabilize Phase 1 before implementing Phase 2 AI.
6. AI may propose actions but never applies financial changes without explicit
   user confirmation.
7. Use clean architecture and keep business rules independent of frameworks.
8. Preserve financial accuracy: fixed-precision money, explicit currencies,
   timezone-aware dates, ownership checks, and auditable changes.

## Mandatory Reading Order

Before any implementation:

1. Read this file.
2. Read [Vision](docs/product/vision.md).
3. Read [Business Rules](docs/product/business-rules.md).
4. Read [Roadmap](docs/product/roadmap.md).
5. Read the documents required for the task from the matrix below.
6. Inspect related code and tests before editing.

If documents conflict, use this precedence:

1. Security and privacy rules
2. Business rules and finance safety
3. Feature requirements
4. API and database contracts
5. Design and screen specifications
6. Architecture and implementation guidance

Do not silently resolve a material conflict. Document the decision or ask when
it changes product behavior, security, stored data, or public contracts.

## Task Reading Matrix

### Product or Feature Work

- [Target Users](docs/product/target-users.md)
- [Feature Requirements](docs/product/feature-requirements.md)
- [Business Rules](docs/product/business-rules.md)
- [Roadmap](docs/product/roadmap.md)

### UI or UX Work

- [Design System](docs/design/design-system.md)
- [Navigation](docs/design/navigation.md)
- [Screen Specifications](docs/design/screen-specifications.md)
- [Accessibility](docs/design/accessibility.md)
- [Frontend Architecture](docs/frontend/architecture.md)
- Review `Figma/Final Screens`.

### Frontend Work

- [Frontend Architecture](docs/frontend/architecture.md)
- [Frontend Folder Structure](docs/frontend/folder-structure.md)
- [State Management](docs/frontend/state-management.md)
- [Component Guidelines](docs/frontend/component-guidelines.md)

### Backend Work

- [Backend Architecture](docs/backend/architecture.md)
- [Business Logic](docs/backend/business-logic.md)
- [Authentication](docs/backend/authentication.md)
- [Validation Rules](docs/backend/validation-rules.md)
- [Security Rules](docs/security/security-rules.md)

### API Work

- [API Specification](docs/backend/api-specification.md)
- [Validation Rules](docs/backend/validation-rules.md)
- [Authentication](docs/backend/authentication.md)
- [Privacy Rules](docs/security/privacy-rules.md)

### Database Work

- [Schema Design](docs/database/schema-design.md)
- [Relationships](docs/database/relationships.md)
- [Migration Rules](docs/database/migration-rules.md)
- [Security Rules](docs/security/security-rules.md)

### Security or Privacy Work

- [Security Rules](docs/security/security-rules.md)
- [Privacy Rules](docs/security/privacy-rules.md)
- [Authentication](docs/backend/authentication.md)
- Relevant API and database documents

### Flow or AI Work

- [Flow Assistant](docs/ai/flow-assistant.md)
- [AI Safety](docs/ai/ai-safety.md)
- [AI Roadmap](docs/ai/ai-roadmap.md)
- Relevant product, security, privacy, and API documents

### Operations or Admin Work

- [Deployment](docs/operations/deployment.md)
- [Monitoring](docs/operations/monitoring.md)
- [Admin Tools](docs/operations/admin-tools.md)
- [Security Rules](docs/security/security-rules.md)

## Engineering Rules

- Use React and TypeScript for the frontend.
- Use Node.js, Express, and TypeScript for the backend.
- Use PostgreSQL with migrations and foreign-key constraints.
- Validate all external input at the system boundary.
- Never use JavaScript floating point for stored or calculated money.
- Never hardcode secrets, tokens, passwords, currencies, dates, or sample user
  data.
- Keep controllers thin, business logic in services/domain code, and data
  access in repositories.
- Apply authentication, workspace ownership, and authorization checks to every
  protected operation.
- Do not upload guest financial data without explicit migration confirmation.
- Never expose stack traces, database errors, secrets, or sensitive data.
- Include loading, empty, success, validation, and error states in UI work.
- Add focused tests for changed behavior and broader tests for shared contracts.
- Explain major changes and any unverified assumptions after implementation.

## Definition of Done

A change is complete only when:

- It follows the relevant documentation.
- Guest and authenticated behavior are both considered.
- Mobile behavior is verified before desktop and tablet.
- Accessibility and localization are considered.
- Validation, error handling, authorization, privacy, and audit needs are met.
- Public API or schema changes are documented and migrated safely.
- Tests cover success and important failure paths.
- No unrelated user changes are reverted.

## Documentation Map

- Product: `docs/product/`
- Design: `docs/design/`
- Frontend: `docs/frontend/`
- Backend and API: `docs/backend/`
- Database: `docs/database/`
- Security and privacy: `docs/security/`
- Flow and AI: `docs/ai/`
- Operations: `docs/operations/`
- Decisions and unresolved architecture: `docs/architecture-decisions.md`

When behavior changes, update the authoritative document in the same change.
