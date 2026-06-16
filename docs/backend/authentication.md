# Authentication and Authorization

## Modes

- **Guest:** local-only core finance use; no server identity
- **Authenticated:** cloud storage, synchronization, collaboration, protected
  communication, account lifecycle, and persistent AI

## Account Flow

1. Register with normalized email and password.
2. Hash password using Argon2id or an approved adaptive alternative.
3. Send single-use, expiring email verification.
4. Create a personal workspace after verification or according to finalized
   onboarding policy.
5. Issue short-lived access credentials and a rotating refresh session.

For Milestone 5, NidhiFlow creates the personal workspace at successful email
verification time and immediately starts the first authenticated session.

## JWT Strategy

- Short-lived access JWT with minimal claims: subject, session ID, issuer,
  audience, issued/expiry time, and token ID.
- Do not embed mutable workspace permissions as long-lived truth.
- Sign with an asymmetric algorithm where operationally supported.
- Rotate keys and publish/resolve key IDs.
- Reject wrong issuer, audience, signature, algorithm, and expiry.

## Refresh Sessions

Prefer an opaque rotating refresh token stored in a `Secure`, `HttpOnly`,
`SameSite` cookie for browser clients. Store only a hash server-side. Detect
reuse, revoke the token family, and record a security event.

Milestone 5 uses the refresh cookie for server-managed session rotation. In
non-production environments, verification and password-reset flows may return a
debug token in the success payload until email delivery infrastructure exists.

Access token storage must minimize XSS exposure. The final browser token
transport and CSRF design must be decided before implementation.

## Password and Recovery

- Minimum 12 characters; allow password managers and long passphrases.
- Block known-compromised/common passwords when feasible.
- Do not impose arbitrary composition or frequent rotation.
- Rate-limit login, registration, verification, and recovery.
- Reset tokens are random, single-use, short-lived, and stored hashed.
- Do not reveal whether an email exists.

## Authorization

- Authentication establishes actor identity.
- Membership establishes workspace access.
- Service-level policy checks establish action permission.
- All Phase 1 members may view shared data and edit collaborative finance
  resources.
- Membership management/workspace deletion uses a minimal manager capability.
- Inaccessible resources generally return `404` to prevent enumeration.

## Login Prompt Rules

Do not require login for local guest features. Protected-action prompts explain
the benefit, preserve intent, allow cancellation, and resume after success.

## Logout

Revoke the refresh session, clear credentials and account caches, and isolate
subsequent guest data. Provide "log out this session" and eventually "log out
all sessions."

## Google Login

Deferred. When added, use authorization code with PKCE, validate provider
claims, define account-linking rules, and prevent email-based account takeover.
