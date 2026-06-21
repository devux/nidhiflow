import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../../../app/providers/AuthProvider";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Icon } from "../../../shared/components/Icon";
import { InlineAlert } from "../../../shared/components/InlineAlert";
import { PageHeader } from "../../../shared/components/PageHeader";

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = useMemo(
    () => searchParams.get("verificationToken")?.trim() ?? "",
    [searchParams],
  );
  const { register, verifyEmail } = useAuth();
  const { preferences } = useGuestPreferences();
  const [displayName, setDisplayName] = useState(preferences.displayName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationToken, setVerificationToken] = useState(tokenFromUrl);
  const [status, setStatus] = useState<"idle" | "registered" | "saving" | "verifying">(
    tokenFromUrl ? "registered" : "idle",
  );
  const [error, setError] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("saving");

    try {
      const result = await register({
        displayName,
        email,
        locale: preferences.locale,
        password,
        preferredCurrency: preferences.currency,
        theme: preferences.theme,
        timezone: preferences.timezone,
      });

      setVerificationToken(result.debugToken ?? "");
      setStatus("registered");
    } catch (registerError) {
      setError(
        registerError instanceof Error ? registerError.message : "Account could not be created.",
      );
      setStatus("idle");
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("verifying");

    try {
      await verifyEmail(verificationToken);
      void navigate("/");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Email could not be verified.");
      setStatus("registered");
    }
  }

  return (
    <main className="page focused-page" id="main-content">
      <PageHeader eyebrow="Optional account" title="Create account" />

      {error ? <InlineAlert title="Account action failed">{error}</InlineAlert> : null}
      {status === "registered" ? (
        <InlineAlert title="Verify your email">
          We sent a verification link to your email. Use the link or paste the token below to start
          your signed-in session.
        </InlineAlert>
      ) : null}

      <Card>
        <form className="settings-form" onSubmit={(event) => void handleRegister(event)}>
          <label htmlFor="signup-name">Display name</label>
          <input
            id="signup-name"
            maxLength={80}
            minLength={1}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            value={displayName}
          />

          <label htmlFor="signup-email">Email</label>
          <input
            autoComplete="email"
            id="signup-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />

          <label htmlFor="signup-password">Password</label>
          <input
            autoComplete="new-password"
            id="signup-password"
            minLength={12}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          <Button disabled={status === "saving"} fullWidth type="submit">
            <Icon name="cloud" size={20} />
            {status === "saving" ? "Creating account" : "Create account"}
          </Button>
        </form>
      </Card>

      {status === "registered" || status === "verifying" ? (
        <Card>
          <form className="settings-form" onSubmit={(event) => void handleVerify(event)}>
            <label htmlFor="verification-token">Verification token</label>
            <textarea
              id="verification-token"
              onChange={(event) => setVerificationToken(event.target.value)}
              required
              rows={3}
              value={verificationToken}
            />
            <Button disabled={status === "verifying"} fullWidth type="submit">
              <Icon name="check" size={20} />
              {status === "verifying" ? "Verifying" : "Verify and continue"}
            </Button>
          </form>
        </Card>
      ) : null}

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </main>
  );
}
