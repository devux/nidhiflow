# Product Vision

## Purpose

NidhiFlow helps people understand and improve everyday finances without making
money management feel intimidating, tedious, or inaccessible.

## Product Promise

Signed-out visitors can understand NidhiFlow through a public About experience.
An account is required before entering finance views or accessing workspace
data.

## Platform and Launch Strategy

- NidhiFlow must be complete and production-ready as a responsive web
  application. Every platform-neutral Phase 1 workflow must work through the
  web application; a native package must not be required for core finance use.
- The product is designed for mobile-phone users first. Phone ergonomics,
  touch interaction, constrained width, mobile performance, and intermittent
  connectivity are authoritative. Desktop and tablet remain supported web
  breakpoints, not separate product priorities.
- The initial public native launch is Android only.
- iPhone and iPad compatibility is developed and tested alongside Android,
  including mobile Safari and internal Capacitor iOS builds where macOS build
  infrastructure is available. No iOS App Store distribution is included in
  the initial launch.
- Explicitly Android-only OS integrations, including notification access and
  direct UPI app intents, are exceptions to cross-platform web completeness.
  Their absence must never block platform-neutral finance workflows.

## Core Principles

- **Mobile-user first:** optimize phone implementation, testing, accessibility,
  and performance first. Desktop and tablet adapt the same complete web
  application without creating desktop-only product scope.
- **Public discovery first:** explain the product without requiring login;
  authenticated accounts protect all finance and workspace experiences.
- **Security first:** protect financial data through least privilege, secure
  defaults, validation, and auditable operations.
- **Accessibility first:** support diverse abilities, devices, languages, and
  levels of financial literacy.
- **Personal finance focus:** prioritize individuals and households. Small
  business support is limited to simple income, expense, cash-flow, and
  category tracking.
- **Trustworthy engagement:** make finance colorful, friendly, and rewarding
  without shame, pressure, artificial urgency, or addictive dark patterns.
- **Progressive delivery:** Phase 1 establishes accurate finance workflows;
  Phase 2 adds Flow AI capabilities on that stable foundation.

## Experience Vision

NidhiFlow should feel modern, lively, and satisfying, especially for younger
users, without becoming childish or excluding older users. Common tasks should
be obvious, fast, and written in plain language. The experience should teach
through short interactive content, relatable examples, meaningful progress,
and optional ethical gamification.

## Scope

NidhiFlow includes transaction tracking, manual accounts, budgets,
savings and debt goals, reports, notifications, feedback, education,
achievements, and simple family collaboration.

The initial scope excludes full accounting, payroll, invoicing, tax filing,
lending, investment trading, guaranteed advice, return promises, and trading
recommendations.

## Success Outcomes

- A signed-out visitor can understand the product and move clearly to login or
  account creation without seeing workspace finance data.
- A user can understand current spending, remaining budget, and goal progress
  within seconds.
- Families can collaborate without learning a complex permission model.
- Account users can safely retain, recover, and synchronize history.
- Flow provides understandable assistance while users remain in control.
- Users trust calculations, data handling, notifications, and AI behavior.
