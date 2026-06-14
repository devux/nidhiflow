# Design System

## Source of Truth

`Figma/Final Screens` is the approved Phase 1 mobile visual reference. Product,
accessibility, security, and guest rules override ambiguous mockup details.
Extend the system responsively; do not recreate each screen with isolated CSS.

## Visual Language

- Near-white canvas with dark navy primary text
- NidhiFlow green as the primary accent
- Soft green surfaces for supporting information
- Selective green gradients for primary actions, active states, progress, and
  the Flow orb
- Large rounded cards, restrained shadows, subtle borders, and generous spacing
- Friendly finance icons and illustrations
- Bold scannable headings and softer neutral secondary text

INR amounts and dates in mockups are examples. Render the selected ISO currency,
locale, timezone, and date format. Never show mock names, email addresses,
balances, or transactions as real data unless sample mode is explicit.

## Tokens

Implement semantic tokens rather than raw values:

- Color: `surface`, `surfaceSubtle`, `textPrimary`, `textSecondary`, `border`,
  `brand`, `brandStrong`, `success`, `warning`, `danger`, `info`
- Spacing: a consistent 4px-based scale
- Radius: control, card, modal, and pill values
- Typography: display, page title, section title, body, label, caption, amount
- Elevation: flat, raised card, sticky navigation, modal
- Motion: fast feedback, standard transition, celebratory transition

Token values must support light and dark themes and accessible contrast.

## Components

Standardize buttons, icon buttons, inputs, amount fields, segmented controls,
chips, cards, list rows, progress bars/rings, charts, bottom sheets, dialogs,
toasts, skeletons, empty states, navigation, and Flow orb.

Each component must define:

- Variants and sizes
- Interactive states
- Loading and disabled behavior
- Keyboard and screen-reader behavior
- Error/help text
- Light/dark theme behavior

## Forms

- Use spacious amount-first layouts for transaction entry.
- Provide large touch targets and obvious selected categories.
- Keep labels visible; placeholders do not replace labels.
- Preserve entered data after validation errors.
- Use full-width primary save actions on mobile.

## Motion and Engagement

- Motion clarifies hierarchy, confirms progress, or celebrates meaningful
  outcomes.
- Respect `prefers-reduced-motion`.
- Avoid distracting continuous animation.
- Gamification visuals remain optional and never imply financial judgment.

## Content Style

Use plain, encouraging language. Avoid unnecessary jargon, shame, fear, false
urgency, and generic `AI Assistant` naming. Use `Flow` or `Flow ✨`
consistently.
