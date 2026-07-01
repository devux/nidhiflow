import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";

import { useAuth } from "../../../app/providers/AuthProvider";
import {
  createPayment,
  updatePaymentStatus,
  type PaymentResource,
} from "../../../data/api/paymentClient";
import { parseUpiQr, upiIdPattern, validatePaymentAmount } from "../../../domain/payments/upi";
import { Button } from "../../../shared/components/Button";
import { InlineAlert } from "../../../shared/components/InlineAlert";
import { isNativeAndroid, upiPayments, type UpiApp } from "../native/upiPayments";

type Source = "QR_SCAN" | "MANUAL_ENTRY";

export function PayPage() {
  const { accessToken, isAuthenticated } = useAuth();
  const [payeeUpiId, setPayeeUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [source, setSource] = useState<Source>("MANUAL_ENTRY");
  const [apps, setApps] = useState<UpiApp[]>([]);
  const [payment, setPayment] = useState<PaymentResource | null>(null);
  const [step, setStep] = useState<"details" | "apps" | "result">("details");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function scanQr() {
    setError("");
    if (!isNativeAndroid()) {
      setError("QR scanning and UPI app launch are available in the NidhiFlow Android app.");
      return;
    }
    try {
      const scan = await upiPayments.scanUpiQr();
      const parsed = parseUpiQr(scan.value);
      setPayeeUpiId(parsed.payeeUpiId);
      setPayeeName(parsed.payeeName);
      setAmount(parsed.amount);
      setNote(parsed.note);
      setSource("QR_SCAN");
    } catch (scanError) {
      setError(
        scanError instanceof Error ? scanError.message : "The QR code could not be scanned.",
      );
    }
  }

  async function continueToApps(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!upiIdPattern.test(payeeUpiId.trim()))
      return setError("Enter a valid UPI ID such as name@bank.");
    if (!validatePaymentAmount(amount))
      return setError("Enter an amount greater than zero with up to 2 decimal places.");
    if (!isNativeAndroid())
      return setError("Direct UPI payment launch requires the NidhiFlow Android app.");
    setBusy(true);
    try {
      const result = await upiPayments.getInstalledApps();
      if (result.apps.length === 0)
        throw new Error("No UPI payment app is installed on this device.");
      setApps(result.apps);
      setStep("apps");
    } catch (appError) {
      setError(appError instanceof Error ? appError.message : "UPI apps could not be checked.");
    } finally {
      setBusy(false);
    }
  }

  async function launch(app: UpiApp) {
    if (!accessToken) return;
    setBusy(true);
    setError("");
    try {
      const created = await createPayment(accessToken, {
        amount,
        currency: "INR",
        note: note.trim() || undefined,
        payeeName: payeeName.trim() || undefined,
        payeeUpiId: payeeUpiId.trim(),
        selectedUpiApp: app.name,
        source,
      });
      const callback = await upiPayments.launchPayment({
        packageName: app.packageName,
        upiUri: created.upiUri,
      });
      const updated = await updatePaymentStatus(accessToken, {
        ...callback,
        paymentId: created.id,
        selectedUpiApp: app.name,
      });
      setPayment(updated);
      setStep("result");
    } catch (launchError) {
      setError(
        launchError instanceof Error ? launchError.message : "The payment app could not be opened.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated || !accessToken) {
    return (
      <main className="payment-page" id="main-content">
        <Link className="payment-page__back" to="/">
          <ArrowBackRoundedIcon /> Home
        </Link>
        <section className="payment-card payment-card--center">
          <h1>Pay with UPI</h1>
          <p>
            Sign in before creating a payment intent so its reported result remains private and
            auditable.
          </p>
          <Link className="button button--primary" to="/login">
            Log in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="payment-page" id="main-content">
      <Link className="payment-page__back" to="/">
        <ArrowBackRoundedIcon /> Home
      </Link>
      <header>
        <span>Direct UPI</span>
        <h1>Pay securely</h1>
        <p>NidhiFlow opens your chosen UPI app. No payment gateway or fee is involved.</p>
      </header>
      {error ? <InlineAlert title="Payment unavailable">{error}</InlineAlert> : null}
      {step === "details" ? (
        <form
          className="payment-card payment-form"
          onSubmit={(event) => void continueToApps(event)}
        >
          <Button onClick={() => void scanQr()} type="button" variant="secondary">
            <QrCodeScannerRoundedIcon /> Scan UPI QR
          </Button>
          <div className="payment-form__divider">
            <span>or enter details</span>
          </div>
          <label>
            UPI ID
            <input
              autoCapitalize="none"
              onChange={(event) => {
                setPayeeUpiId(event.target.value);
                setSource("MANUAL_ENTRY");
              }}
              placeholder="name@bank"
              value={payeeUpiId}
            />
          </label>
          <label>
            Receiver name <span>(optional)</span>
            <input
              maxLength={100}
              onChange={(event) => setPayeeName(event.target.value)}
              value={payeeName}
            />
          </label>
          <label>
            Amount (INR)
            <input
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              value={amount}
            />
          </label>
          <label>
            Note <span>(optional)</span>
            <input maxLength={80} onChange={(event) => setNote(event.target.value)} value={note} />
          </label>
          <Button disabled={busy} type="submit" variant="primary">
            {busy ? "Checking apps…" : "Choose UPI app"}
          </Button>
        </form>
      ) : null}
      {step === "apps" ? (
        <section className="payment-card">
          <h2>Choose an installed app</h2>
          <div className="payment-app-list">
            {apps.map((app) => (
              <button
                disabled={busy}
                key={app.packageName}
                onClick={() => void launch(app)}
                type="button"
              >
                <span>
                  <strong>{app.name}</strong>
                  <small>{app.known ? "UPI app" : "Other compatible app"}</small>
                </span>
                <OpenInNewRoundedIcon />
              </button>
            ))}
          </div>
          <Button disabled={busy} onClick={() => setStep("details")} variant="secondary">
            Back
          </Button>
        </section>
      ) : null}
      {step === "result" && payment ? (
        <section className="payment-card payment-result" aria-live="polite">
          <span
            className={`payment-result__status payment-result__status--${payment.appReportedStatus.toLowerCase()}`}
          >
            {payment.appReportedStatus}
          </span>
          <h2>Payment status reported by UPI app</h2>
          <dl>
            <div>
              <dt>Amount</dt>
              <dd>₹{payment.amount}</dd>
            </div>
            <div>
              <dt>To</dt>
              <dd>{payment.payeeName || payment.payeeUpiId}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{payment.transactionRef}</dd>
            </div>
          </dl>
          <InlineAlert title="Not bank-verified">
            This status is reported by the selected UPI app. Check your bank or UPI app before
            treating it as confirmed.
          </InlineAlert>
          <Link className="button button--primary" to="/">
            Done
          </Link>
        </section>
      ) : null}
    </main>
  );
}
