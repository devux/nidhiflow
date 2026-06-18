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

## Plan and Budget

- Deeply revisit the Plan page monthly and yearly budget planning flows,
  including period behavior, category limits, calculations, and editing UX.
