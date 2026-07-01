# Direct UPI Intent Payments

## Scope

NidhiFlow can prepare a UPI payment request and hand it to an installed Android
UPI application. NidhiFlow does not collect money, hold funds, connect to a
payment gateway, verify settlement, or automatically create a confirmed
expense. The feature is authenticated because payment attempts contain
financial and recipient data and need an owner-scoped audit trail.

## User Flow

1. Open `Pay with UPI` from Home.
2. Scan a UPI QR code or enter a UPI ID, optional receiver name, INR amount,
   and optional note.
3. NidhiFlow validates the details and shows only installed applications that
   handle `upi://pay`.
4. The user selects an application.
5. The backend creates an opaque payment ID and unique internal transaction
   reference. Manual entry receives a generated UPI URI. QR scan preserves the
   merchant payment URI and its reference/security parameters.
6. Android opens the exact selected package.
7. NidhiFlow captures the activity result and stores its status as app-reported
   and unverified.
8. The result screen tells the user to verify in their bank or UPI application.

Cancelling, returning no response, or receiving an unrecognized response never
becomes success.

## QR and URI Contract

Accepted QR values use `upi://pay` with:

- `pa`: required valid UPI ID
- `pn`: optional receiver name, at most 100 characters
- `am`: optional in the QR but required before launch; positive INR decimal
  with at most two fractional digits
- `tn`: optional note, at most 80 characters
- `cu`: optional and defaults to `INR`; other currencies are rejected

Merchant QR parameters such as `mc`, `mode`, `orgid`, `paytmqr`, `tr`, and
`sign` are retained. A QR-provided `tr` is never replaced, and a QR containing
`sign` is never mutated. For an unsigned dynamic QR without `am`, the validated
amount is added without removing its other parameters. A signed QR without
`am` is launched unchanged so the selected UPI app can collect the amount.

For manual entry, the backend generates the `upi://pay` URI and adds `tr`.
Every attempt still receives a separate server-generated internal transaction
reference for audit and display. Client input cannot provide or override that
internal reference. UPI IDs are trimmed and normalized to lowercase.

## Android Integration

The React application is packaged with Capacitor under
`com.nidhiflow.app`. The local `UpiPayments` plugin:

- declares Android package visibility for browsable `upi` handlers;
- queries compatible installed apps and identifies Google Pay, PhonePe, Paytm,
  and BHIM through explicit Android package visibility and package-targeted
  UPI capability checks while retaining other compatible handlers;
- scans QR codes with Google Code Scanner;
- launches an explicit package when the user selects one;
- receives the result through the Activity Result API;
- parses response keys case-insensitively and maps only recognized values.

Google Code Scanner keeps camera permission out of the NidhiFlow manifest. The
web build supports form entry and explanation but intentionally does not claim
that browsers can reliably enumerate apps or receive Android activity results.

Build and synchronize Android from `codebase/apps/frontend`:

```bash
npm run android:sync
```

Open the generated project:

```bash
npm run android:open
```

The web Profile page offers the current testing APK under `Android app`. The
download is debug-signed and intended for direct device testing, not public
production distribution. Its companion `.sha256.txt` file allows artifact
integrity checks.

## Status Model

`app_reported_status` is one of `PENDING`, `SUCCESS`, `FAILURE`, `CANCELLED`,
or `UNKNOWN`. `verification_status` is separately stored and starts as
`UNVERIFIED`. A callback never updates verification status.

| Activity result                            | Stored app-reported status |
| ------------------------------------------ | -------------------------- |
| Explicit `Status=SUCCESS`                  | `SUCCESS`                  |
| Explicit failure/failed                    | `FAILURE`                  |
| Android cancellation with no response      | `CANCELLED`                |
| Missing, malformed, or unfamiliar response | `UNKNOWN`                  |

Even `SUCCESS` means only “reported by the selected UPI app.” Bank or PSP
verification is a future, separately reviewed capability.

## API

All endpoints are under `/api/v1/payments` and require a bearer access token.
Ownership comes from the token, never from a create body.

- `POST /create`: validates payment details and the original QR URI when
  `source=QR_SCAN`, stores a pending attempt, and returns the safe launch URI.
- `POST /update-status`: records a bounded raw callback and parsed fields. The
  selected app must match the create request.
- `GET /:paymentId`: returns an owner-scoped payment.
- `GET /user/:userId`: returns at most the latest 100 attempts and only when
  the path user equals the authenticated user.

Inaccessible resources return a safe `404`. Database writes are parameterized.
Create and callback events write metadata-only audit events; raw UPI callbacks
and UPI IDs are excluded from audit metadata and application logs.

## Data and Privacy

The `payments` table stores recipient UPI ID/name, fixed-precision amount,
currency, note, server reference, selected app, source, canonical URI, reported
and verification statuses, bounded raw callback, parsed response fields, and
timestamps. This is sensitive financial data. It is not analytics data and
must not be sent to third-party trackers.

The first release does not convert a payment attempt into a transaction.
Reconciliation or verified transaction creation requires an explicit product,
security, privacy, and accounting design.

## Test Matrix

- valid and invalid manual UPI IDs and amounts;
- QR parsing, percent encoding, missing optional fields, and non-INR rejection;
- no installed UPI app;
- known and other compatible app discovery;
- targeted app launch;
- success, failure, cancellation, malformed, and empty callbacks;
- authentication, cross-user isolation, selected-app mismatch, and callback
  size validation;
- migration up/down and Neon migration status;
- Android device testing with at least two UPI apps before release.
