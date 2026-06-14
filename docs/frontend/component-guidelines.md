# Component Guidelines

## Composition

Build small accessible primitives and compose them into domain components.
Create an abstraction when it enforces consistency or removes meaningful
duplication, not merely to reduce line count.

## Required Shared Components

- Button and IconButton
- TextField, TextArea, Select, DateField, AmountField
- SegmentedControl, Tabs, Chip
- Card, SummaryCard, ListRow
- ProgressBar and ProgressRing
- Modal/Dialog and BottomSheet
- Toast/InlineAlert
- Skeleton and EmptyState
- Accessible chart wrapper and textual legend
- BottomNavigation and FlowOrbButton
- CurrencyAmount and LocalizedDate

## Component Contract

Every reusable component documents:

- Props and controlled/uncontrolled behavior
- Variants and semantic intent
- Keyboard and screen-reader behavior
- Loading, disabled, empty, and error states
- Focus behavior
- Responsive and theme behavior

## Feature Components

Domain components may know finance concepts but must receive data/actions
through props or feature hooks. Avoid hidden API or storage access.

## Financial Display

- Use locale-aware formatting and explicit currency.
- Preserve sign and transaction type; do not communicate income/expense by
  color alone.
- Define rounding rules centrally.
- Make large values readable without silently truncating precision.

## Forms

- Persistent labels and contextual help
- Errors adjacent to fields and summarized when useful
- Submit disabled only when the reason is understandable
- Preserve values after server errors
- Confirm destructive changes
- Provide undo only for low-risk reversible actions

## Performance

Use route splitting and list virtualization for large histories where needed.
Avoid premature memoization. Optimize images and animations. Keep mobile
interaction responsive under realistic low-end device conditions.

## Testing

Test behavior rather than implementation details. Include keyboard operation,
accessible names, validation, loading/error states, localization, themes, and
small-screen layouts.
