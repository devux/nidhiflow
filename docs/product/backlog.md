# Product Backlog

## Auth and Onboarding

- Reintroduce production email verification with a verified sender/domain and
  email-link flow; signup currently creates an active account without token entry.
- Revisit the entire user login flow because logged-in user details are not retained
  consistently after refresh. Confirm session restore, workspace restore, refresh-token
  cookie behavior, and guest/authenticated mode transitions end to end.

## Family Collaboration

- Add a family budget sharing option so authenticated users can intentionally share
  budget plans with family workspace members. - completed

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

## Growth and Discoverability

- Add SEO and AEO planning for the app, including metadata, structured content,
  answer-friendly landing content, indexability decisions, and measurement.

## Quality and Accessibility

- Add a full accessibility test pass covering automated checks, keyboard
  navigation, screen reader behavior, color contrast, focus states, and mobile
  accessibility.

## UI Document

List down components used
Home page ui improvement needed

- collobration modal and api fix /api/v1/workspaces/wrk_b3

budget page ui improvement needed

- Total budget section , add more border raduis to left and right arrow
- Make styles changes according to device sizes below 350px
- Match categories list with Home page list - done
- Improve copy prev month section UI

Report

- change filter UI as per other pages
- add more data relates section next to pie chat , add export feature

you

- Complete UI rewamp required

Flow

- Complete UI rewamp required

Feedback from other APPS

- Add splash screen
- Add selection bar instead of text field
- Add quick links , chips wherever possible
- Need to add the bills section
- from sms need to add application
