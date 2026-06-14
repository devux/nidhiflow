# Accessibility

## Standard

Target WCAG 2.2 AA for web experiences. Accessibility acceptance criteria are
part of every feature.

## Interaction

- All controls are keyboard accessible with visible focus.
- Touch targets are at least 44 by 44 CSS pixels where practical.
- Focus order follows visual and task order.
- Dialogs trap and restore focus correctly.
- Do not use hover-only actions.
- Support zoom and text resizing without loss of content or operation.

## Semantics

- Use native elements before ARIA.
- Inputs have persistent labels, instructions, and programmatic errors.
- Icon-only controls have accessible names.
- Headings follow a logical hierarchy.
- Dynamic success/error messages use appropriate live regions without
  excessive announcements.

## Color and Charts

- Text and controls meet AA contrast.
- Do not rely on color alone for active state, income/expense, budget status,
  validation, or chart categories.
- Charts include text summaries, legends, values, and accessible alternatives.
- Positive/negative amounts use sign, text, or icons as well as color.

## Motion and Media

- Respect reduced-motion preferences.
- Avoid flashing and distracting continuous animation.
- Flow orb meaning is available through text and accessible naming.
- Decorative imagery is ignored by assistive technology; meaningful imagery
  has concise alternatives.

## Language and Cognition

- Use plain language and consistent terminology.
- Explain financial terms contextually.
- Avoid time-limited interactions unless essential.
- Preserve user input after errors.
- Error text identifies the problem and how to fix it.

## Testing

Test keyboard-only flows, screen-reader landmarks/forms, contrast, 200% zoom,
reduced motion, small mobile screens, dark theme, and localized long text.
Automated checks supplement but do not replace manual testing.
