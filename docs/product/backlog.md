# Product Backlog

## Auth and Onboarding

- Replace the local-development verification-token entry with a production email-link flow.
  In development, the API may continue returning `debugToken`, but the user-facing
  experience should explain that real users verify by clicking an email link.
- Revisit the entire user login flow because logged-in user details are not retained
  consistently after refresh. Confirm session restore, workspace restore, refresh-token
  cookie behavior, and guest/authenticated mode transitions end to end.

## Family Collaboration

- Add a family budget sharing option so authenticated users can intentionally share
  budget plans with family workspace members.

## Transaction Entry

- Revisit Add Income form field width adjustment across mobile and desktop
  breakpoints.
- Persist all home actions, including add expense and add income, through the API
  for the authenticated user so the data is stored in the database instead of
  remaining local-only.

## Budget

- Add a smart first-time budget setup flow that guides new users through a
  question-and-answer experience to create the first/current month budget plan.
- Continue refining monthly budget planning UX, including month navigation,
  quick-fill review, category limit editing, and derived yearly reporting.
- Revisit yearly budget trends and insights as a future enhancement, including
  trend signals, practical lessons, and healthy-progress guidance.
- Park the Goals feature for future implementation, including the dedicated
  goals experience, navigation entry point, milestones, contributions, and
  progress tracking.
- Reintroduce Bills as a future feature outside the current Budget module,
  including due dates, status, recurrence, reminders, and related notifications.
