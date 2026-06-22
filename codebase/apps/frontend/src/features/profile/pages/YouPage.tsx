import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../../app/providers/AuthProvider";
import { trackApiRequest } from "../../../app/providers/apiLoadingState";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { environment } from "../../../config/environment";
import {
  supportedCurrencies,
  supportedLocales,
  themePreferences,
  type GuestPreferences,
  type SupportedCurrency,
  type SupportedLocale,
} from "../../../domain/preferences/guestPreferences";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Icon, type IconName } from "../../../shared/components/Icon";
import { InlineAlert } from "../../../shared/components/InlineAlert";
import { PageHeader } from "../../../shared/components/PageHeader";

const tools: Array<{ description: string; href: string; icon: IconName; title: string }> = [
  {
    description: "Review income and expenses",
    href: "/activity",
    icon: "activity",
    title: "Activity",
  },
  {
    description: "Understand your financial story",
    href: "/reports",
    icon: "report",
    title: "Reports",
  },
];

const localeLabels: Record<SupportedLocale, string> = {
  "en-GB": "English (United Kingdom)",
  "en-IN": "English (India)",
  "en-US": "English (United States)",
};

const currencyLabels: Record<SupportedCurrency, string> = {
  EUR: "EUR - Euro",
  GBP: "GBP - British pound",
  INR: "INR - Indian rupee",
  USD: "USD - US dollar",
};

export function YouPage() {
  const { isAuthenticated, logout, updateProfile, user } = useAuth();
  const { preferences, savePreferences } = useGuestPreferences();
  const profileName = user?.displayName ?? preferences.displayName;
  const [displayName, setDisplayName] = useState(profileName);
  const [feedbackCategory, setFeedbackCategory] = useState<"general" | "issue" | "suggestion">(
    "suggestion",
  );
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [feedbackState, setFeedbackState] = useState<"error" | "idle" | "sent" | "sending">("idle");
  const [fieldError, setFieldError] = useState("");
  const [logoutState, setLogoutState] = useState<"error" | "idle" | "saving">("idle");
  const [saveState, setSaveState] = useState<"error" | "idle" | "saved">("idle");

  useEffect(() => {
    setDisplayName(profileName);
  }, [profileName]);

  async function persist(updatedPreferences: GuestPreferences) {
    setSaveState("idle");

    try {
      await savePreferences(updatedPreferences);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  function handleDisplayNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = displayName.trim();

    if (normalizedName.length < 1 || normalizedName.length > 80) {
      setFieldError("Enter a name between 1 and 80 characters.");
      return;
    }

    setFieldError("");

    if (isAuthenticated && user) {
      setSaveState("idle");
      void updateProfile({ displayName: normalizedName })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
      return;
    }

    void persist({ ...preferences, displayName: normalizedName });
  }

  async function handleFeedbackSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackState("sending");

    try {
      const response = await trackApiRequest(async () =>
        fetch(`${environment.NIDHIFLOW_API_BASE_URL}/api/v1/feedback`, {
          body: JSON.stringify({
            category: feedbackCategory,
            description: feedbackDescription,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }),
      );

      if (!response.ok) {
        throw new Error("Feedback failed");
      }

      setFeedbackDescription("");
      setFeedbackState("sent");
    } catch {
      setFeedbackState("error");
    }
  }

  async function handleLogout() {
    setLogoutState("saving");

    try {
      await logout();
      setLogoutState("idle");
    } catch {
      setLogoutState("error");
    }
  }

  const profileInitial = profileName.slice(0, 1).toUpperCase();

  return (
    <main className="page" id="main-content">
      <PageHeader
        eyebrow={
          isAuthenticated ? "Account profile and preferences" : "Guest profile and preferences"
        }
        title="You"
      />

      <Card className="profile-card">
        <div className="profile-card__identity">
          <span className="profile-avatar" aria-hidden="true">
            {profileInitial}
          </span>
          <span>
            <h2>{profileName}</h2>
            <span className="local-badge">
              <Icon name="user" size={17} />
              {isAuthenticated ? "Signed in" : "Guest user"}
            </span>
          </span>
        </div>
        {isAuthenticated && user ? (
          <>
            <InlineAlert title="Account active">
              {user.email} is signed in. You can now back up finance data to your account.
            </InlineAlert>
            <Button
              disabled={logoutState === "saving"}
              fullWidth
              onClick={() => void handleLogout()}
              variant="secondary"
            >
              <Icon name="user" size={20} />
              {logoutState === "saving" ? "Logging out" : "Log out"}
            </Button>
          </>
        ) : (
          <>
            <InlineAlert title="Saved only on this device">
              Clearing browser data, uninstalling, or losing this device may remove guest history
              permanently.
            </InlineAlert>
            <div className="account-actions">
              <Link className="button button--primary button--full" to="/signup">
                <Icon name="cloud" size={20} />
                Create an account for backup
              </Link>
              <Link className="button button--secondary button--full" to="/login">
                <Icon name="user" size={20} />
                Log in
              </Link>
            </div>
          </>
        )}
      </Card>

      {saveState === "saved" ? (
        <div className="success-message" role="status">
          <Icon name="check" size={20} />
          {isAuthenticated ? "Profile updated." : "Preferences saved on this device."}
        </div>
      ) : null}
      {saveState === "error" ? (
        <div className="error-message" role="alert">
          {isAuthenticated
            ? "Profile could not be updated. Your previous name remains unchanged."
            : "Preferences could not be saved. Your previous settings remain unchanged."}
        </div>
      ) : null}
      {feedbackState === "sent" ? (
        <div className="success-message" role="status">
          <Icon name="check" size={20} />
          Feedback received. Thank you for helping shape NidhiFlow.
        </div>
      ) : null}
      {feedbackState === "error" ? (
        <div className="error-message" role="alert">
          Feedback could not be sent. Your local finance data was not uploaded.
        </div>
      ) : null}
      {logoutState === "error" ? (
        <div className="error-message" role="alert">
          Logout could not complete. Please try again.
        </div>
      ) : null}

      <section aria-labelledby="profile-settings-title">
        <div className="section-heading">
          <h2 id="profile-settings-title">
            {isAuthenticated ? "Account profile" : "Local profile"}
          </h2>
        </div>
        <Card>
          <form className="settings-form" onSubmit={handleDisplayNameSubmit}>
            <label htmlFor="display-name">Display name</label>
            <p className="field-help" id="display-name-help">
              {isAuthenticated
                ? "This name appears across your signed-in NidhiFlow profile."
                : "This name is stored only in this browser."}
            </p>
            <div className="field-row">
              <input
                aria-describedby={`display-name-help${fieldError ? " display-name-error" : ""}`}
                aria-invalid={Boolean(fieldError)}
                id="display-name"
                maxLength={80}
                onChange={(event) => setDisplayName(event.target.value)}
                value={displayName}
              />
              <Button type="submit">Save</Button>
            </div>
            {fieldError ? (
              <p className="field-error" id="display-name-error">
                {fieldError}
              </p>
            ) : null}
          </form>
        </Card>
      </section>

      <section aria-labelledby="tools-title">
        <div className="section-heading">
          <h2 id="tools-title">My tools</h2>
        </div>
        <Card className="settings-list">
          {tools.map((tool) => (
            <Link key={tool.title} to={tool.href}>
              <span className="icon-tile">
                <Icon name={tool.icon} />
              </span>
              <span>
                <strong>{tool.title}</strong>
                <small>{tool.description}</small>
              </span>
              <Icon name="chevron" />
            </Link>
          ))}
        </Card>
      </section>

      <section aria-labelledby="feedback-title">
        <div className="section-heading">
          <h2 id="feedback-title">Feedback</h2>
        </div>
        <Card>
          <form className="settings-form" onSubmit={(event) => void handleFeedbackSubmit(event)}>
            <label className="select-field" htmlFor="feedback-category">
              <span>
                <strong>Category</strong>
                <small>Anonymous unless you choose to create an account later</small>
              </span>
              <select
                id="feedback-category"
                onChange={(event) =>
                  setFeedbackCategory(event.target.value as typeof feedbackCategory)
                }
                value={feedbackCategory}
              >
                <option value="suggestion">Suggestion</option>
                <option value="issue">Issue</option>
                <option value="general">General</option>
              </select>
            </label>
            <label htmlFor="feedback-description">Message</label>
            <textarea
              id="feedback-description"
              maxLength={1000}
              minLength={10}
              onChange={(event) => setFeedbackDescription(event.target.value)}
              required
              rows={4}
              value={feedbackDescription}
            />
            <Button disabled={feedbackState === "sending"} type="submit">
              <Icon name="feedback" size={20} />
              {feedbackState === "sending" ? "Sending" : "Send feedback"}
            </Button>
          </form>
        </Card>
      </section>

      <section aria-labelledby="preferences-title">
        <div className="section-heading">
          <h2 id="preferences-title">Preferences</h2>
        </div>
        <Card className="preference-card">
          <fieldset>
            <legend>Appearance</legend>
            <div className="theme-options">
              {themePreferences.map((theme) => (
                <button
                  aria-pressed={preferences.theme === theme}
                  className={preferences.theme === theme ? "is-selected" : ""}
                  key={theme}
                  onClick={() => void persist({ ...preferences, theme })}
                  type="button"
                >
                  <Icon name={theme === "dark" ? "moon" : theme === "light" ? "sun" : "sparkles"} />
                  {theme[0].toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="select-field" htmlFor="locale">
            <span>
              <strong>Language and locale</strong>
              <small>Controls date and number formatting</small>
            </span>
            <select
              id="locale"
              onChange={(event) =>
                void persist({
                  ...preferences,
                  locale: event.target.value as SupportedLocale,
                })
              }
              value={preferences.locale}
            >
              {supportedLocales.map((locale) => (
                <option key={locale} value={locale}>
                  {localeLabels[locale]}
                </option>
              ))}
            </select>
          </label>

          <label className="select-field" htmlFor="currency">
            <span>
              <strong>Currency</strong>
              <small>Used for local financial displays</small>
            </span>
            <select
              id="currency"
              onChange={(event) =>
                void persist({
                  ...preferences,
                  currency: event.target.value as SupportedCurrency,
                })
              }
              value={preferences.currency}
            >
              {supportedCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currencyLabels[currency]}
                </option>
              ))}
            </select>
          </label>
        </Card>
      </section>

      <Card className="privacy-card" subtle>
        <Icon name="lock" />
        <span>
          <h2>Privacy by default</h2>
          <p>NidhiFlow has not uploaded this guest profile or created a hidden server account.</p>
        </span>
      </Card>
    </main>
  );
}
