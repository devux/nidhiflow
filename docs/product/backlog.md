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
