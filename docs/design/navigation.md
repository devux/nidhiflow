# Navigation

## Platform Priority

Design and verify for phone users first. Desktop and tablet adapt the same web
information architecture after mobile behavior is correct; they are supported
breakpoints rather than separate product targets. Validate both Android and
iOS browser safe areas, touch behavior, keyboards, and accessibility.

## Mobile Primary Navigation

Use a persistent five-item bottom navigation:

1. Home
2. Add income
3. Add expense
4. Budget
5. You

Add expense occupies the emphasized center position. Every destination has an
icon and visible text label. Active state uses more than color alone.

Respect safe areas. The center action and navigation must not cover page
content, forms, primary actions, or the software keyboard.

## Destination Ownership

- **Home:** financial overview and quick actions
- **Add income:** opens a new income transaction
- **Add expense:** opens a new expense transaction
- **Budget:** monthly budgets, category budgets, yearly budget insights, and goals
- **You:** profile state, tools, preferences, privacy, and account conversion

Home exposes Budget, Reports, Goals, and Loans as secondary destinations.
Activity, Flow, and Settings remain secondary destinations opened from relevant
links. Settings is reached from You and owns workspace category management.

## Focused Flows

On forms and detail screens, keep bottom navigation only when it does not
compete with task completion. Always provide a clear back/cancel route and
preserve unsaved values when navigation is accidental.

## Desktop and Tablet

Desktop may translate bottom navigation into a left rail or top-level shell,
while preserving names, order, destinations, and the prominence of Add expense.
Desktop and tablet layouts must remain complete and usable, but must not
introduce separate feature scope or information architecture.

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
