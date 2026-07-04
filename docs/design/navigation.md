# Navigation

## Platform Priority

Design and verify mobile first, desktop second, tablet third.

## Mobile Primary Navigation

Use a persistent five-item bottom navigation:

1. Home
2. Reports
3. Flow
4. Budget
5. You

Flow occupies a raised center position with the approved orb treatment. Every
destination has an icon and visible text label. Active state uses more than
color alone.

Respect safe areas. The Flow orb and navigation must not cover page content,
forms, primary actions, or the software keyboard.

## Destination Ownership

- **Home:** financial overview and quick actions
- **Reports:** income, expense, savings, category, and recent transaction summaries
- **Flow:** Phase 1 preview; Phase 2 assistant
- **Budget:** monthly budgets, category budgets, yearly budget insights, and goals
- **You:** profile state, tools, preferences, privacy, and account conversion

Activity remains a live secondary destination opened from You, transaction
flows, and relevant links. Add Income and Add Expense are task flows opened from
Home and relevant activity actions.

## Focused Flows

On forms and detail screens, keep bottom navigation only when it does not
compete with task completion. Always provide a clear back/cancel route and
preserve unsaved values when navigation is accidental.

## Desktop and Tablet

Desktop may translate bottom navigation into a left rail or top-level shell,
while preserving names, order, destinations, and the prominence of Flow.
Tablet adapts after mobile and desktop are stable. Do not create separate
information architectures by breakpoint.

## Authentication Navigation

- Signed-out visitors land on the public About page.
- About provides persistent Log in and Get started actions across breakpoints.
- All app-shell destinations require authentication and are not rendered for a
  signed-out visitor.
- Logout returns to About.

## Deep Links

Protected deep links return signed-out visitors to About. Invalid or
inaccessible authenticated resources use a safe not-found state without
revealing whether another user's resource exists.
