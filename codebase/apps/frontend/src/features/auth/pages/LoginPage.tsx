import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../../app/providers/AuthProvider";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Icon } from "../../../shared/components/Icon";
import { InlineAlert } from "../../../shared/components/InlineAlert";
import { PageHeader } from "../../../shared/components/PageHeader";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("saving");

    try {
      await login({ email, password });
      void navigate("/");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
      setStatus("idle");
    }
  }

  return (
    <main className="page focused-page" id="main-content">
      <PageHeader eyebrow="Welcome back" title="Log in" />

      {error ? <InlineAlert title="Could not log in">{error}</InlineAlert> : null}

      <Card>
        <form className="settings-form" onSubmit={(event) => void handleLogin(event)}>
          <label htmlFor="login-email">Email</label>
          <input
            autoComplete="email"
            id="login-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />

          <label htmlFor="login-password">Password</label>
          <input
            autoComplete="current-password"
            id="login-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          <Button disabled={status === "saving"} fullWidth type="submit">
            <Icon name="user" size={20} />
            {status === "saving" ? "Logging in" : "Log in"}
          </Button>
        </form>
      </Card>

      <p className="auth-switch">
        New to NidhiFlow? <Link to="/signup">Create an account</Link>
      </p>
    </main>
  );
}
