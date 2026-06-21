import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../../app/providers/AuthProvider";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { Button } from "../../../shared/components/Button";
import { Icon } from "../../../shared/components/Icon";
import { InlineAlert } from "../../../shared/components/InlineAlert";
import { PageHeader } from "../../../shared/components/PageHeader";
import { Card } from "../../../shared/components/Card";

export function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { preferences } = useGuestPreferences();
  const [displayName, setDisplayName] = useState(preferences.displayName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("saving");

    try {
      await register({
        displayName,
        email,
        locale: preferences.locale,
        password,
        preferredCurrency: preferences.currency,
        theme: preferences.theme,
        timezone: preferences.timezone,
      });

      void navigate("/");
    } catch (registerError) {
      setError(
        registerError instanceof Error ? registerError.message : "Account could not be created.",
      );
      setStatus("idle");
    }
  }

  return (
    <main className="page focused-page" id="main-content">
      <PageHeader eyebrow="Optional account" title="Create account" />

      {error ? <InlineAlert title="Account action failed">{error}</InlineAlert> : null}
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

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </main>
  );
}
