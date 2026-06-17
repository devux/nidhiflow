# Production Readiness

This checklist collects the launch-time work that spans deployment, monitoring,
security, accessibility, and validation. It is the final gate before Phase 1 is
considered stable enough for production rollout.

## Pre-Launch Checks

1. Confirm the current release passes `npm run verify` in `codebase/`.
2. Run PostgreSQL migration checks against a clean database.
3. Validate the generated OpenAPI document and the published API routes.
4. Confirm frontend and backend production builds succeed from lockfiles.
5. Review security, privacy, and accessibility requirements against the
   current implementation.

## Accessibility Checks

- Keyboard-only navigation works across the guest shell, Flow preview, profile
  settings, and transaction flows.
- Focus states remain visible in light and dark themes.
- Long localized labels, helper text, and error messages fit on small mobile
  screens without clipping core controls.
- Reduced-motion preferences remove distracting motion from the interface.
- Automated `jest-axe` coverage passes for the main guest routes.

## Monitoring Checks

- Liveness and readiness endpoints respond without exposing internals.
- Request IDs are present in logs and API responses.
- Error monitoring, synthetic checks, and alert ownership are defined.
- High-risk events such as auth anomalies, migration failures, backup failures,
  and repeated rate-limit abuse have explicit alerting paths.

## Backup And Restore Checks

- Production database backups are encrypted and retained according to policy.
- Restore procedures are documented and rehearsed in a non-production
  environment.
- A restore test verifies that application migrations, baseline data, and
  critical records survive a recovery run.

## Rollout And Rollback

- Deploy with rolling, blue/green, or canary releases.
- Keep rollback compatible with expanded schemas.
- Use feature flags for risky capabilities such as Flow, notifications, and
  imports.
- Keep a clear disablement path for launch-sensitive functionality.

## Smoke Test Checklist

Run the following after a staging deploy:

1. Open the guest home screen.
2. Navigate to Activity, Flow, Plan, and You.
3. Submit the Flow launch notification form.
4. Submit guest feedback.
5. Verify login and protected reads with a test account.
6. Confirm the readiness endpoint reports the database as available.

## Support Readiness

- Support contacts and ownership are assigned.
- Incident escalation and evidence-retention procedures are documented.
- Privacy and consent language matches the user-facing flows.
- Restore, auth, and notification issues have a known triage path.
