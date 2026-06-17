import { useEffect, useState, type FormEvent } from "react";

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

const tools: Array<{ description: string; icon: IconName; title: string }> = [
  { description: "Track savings milestones", icon: "goal", title: "Goals" },
  { description: "Understand your financial story", icon: "report", title: "Reports" },
  { description: "Share thoughts without an account", icon: "feedback", title: "Feedback" },
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
  const { preferences, savePreferences } = useGuestPreferences();
  const [displayName, setDisplayName] = useState(preferences.displayName);
  const [feedbackCategory, setFeedbackCategory] = useState<"general" | "issue" | "suggestion">(
    "suggestion",
  );
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [feedbackState, setFeedbackState] = useState<"error" | "idle" | "sent" | "sending">("idle");
  const [fieldError, setFieldError] = useState("");
  const [saveState, setSaveState] = useState<"error" | "idle" | "saved">("idle");

  useEffect(() => {
    setDisplayName(preferences.displayName);
  }, [preferences.displayName]);

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

    if (normalizedName.length < 1 || normalizedName.length > 40) {
      setFieldError("Enter a name between 1 and 40 characters.");
      return;
    }

    setFieldError("");
    void persist({ ...preferences, displayName: normalizedName });
  }

  async function handleFeedbackSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackState("sending");

    try {
      const response = await fetch(`${environment.NIDHIFLOW_API_BASE_URL}/api/v1/feedback`, {
        body: JSON.stringify({
          category: feedbackCategory,
          description: feedbackDescription,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Feedback failed");
      }

      setFeedbackDescription("");
      setFeedbackState("sent");
    } catch {
      setFeedbackState("error");
    }
  }

  return (
    <main className="page" id="main-content">
      <PageHeader eyebrow="Guest profile and preferences" title="You" />

      <Card className="profile-card">
        <div className="profile-card__identity">
          <span className="profile-avatar" aria-hidden="true">
            {preferences.displayName.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <h2>{preferences.displayName}</h2>
            <span className="local-badge">
              <Icon name="user" size={17} />
              Guest user
            </span>
          </span>
        </div>
        <InlineAlert title="Saved only on this device">
          Clearing browser data, uninstalling, or losing this device may remove guest history
          permanently.
        </InlineAlert>
        <Button fullWidth variant="secondary">
          <Icon name="cloud" size={20} />
          Create an account for backup
        </Button>
      </Card>

      {saveState === "saved" ? (
        <div className="success-message" role="status">
          <Icon name="check" size={20} />
          Preferences saved on this device.
        </div>
      ) : null}
      {saveState === "error" ? (
        <div className="error-message" role="alert">
          Preferences could not be saved. Your previous settings remain unchanged.
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

      <section aria-labelledby="guest-profile-title">
        <div className="section-heading">
          <h2 id="guest-profile-title">Local profile</h2>
        </div>
        <Card>
          <form className="settings-form" onSubmit={handleDisplayNameSubmit}>
            <label htmlFor="display-name">Display name</label>
            <p className="field-help" id="display-name-help">
              This name is stored only in this browser.
            </p>
            <div className="field-row">
              <input
                aria-describedby={`display-name-help${fieldError ? " display-name-error" : ""}`}
                aria-invalid={Boolean(fieldError)}
                id="display-name"
                maxLength={40}
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
            <button key={tool.title} type="button">
              <span className="icon-tile">
                <Icon name={tool.icon} />
              </span>
              <span>
                <strong>{tool.title}</strong>
                <small>{tool.description}</small>
              </span>
              <Icon name="chevron" />
            </button>
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

          <label className="toggle-field">
            <span>
              <strong>Data-protection reminder</strong>
              <small>Keep the optional local guest reminder enabled</small>
            </span>
            <input
              checked={preferences.reminderEnabled}
              onChange={(event) =>
                void persist({
                  ...preferences,
                  reminderEnabled: event.target.checked,
                })
              }
              type="checkbox"
            />
          </label>

          <label className="toggle-field">
            <span>
              <strong>Repeat reminder</strong>
              <small>Show the data-protection reminder every five active minutes</small>
            </span>
            <input
              checked={preferences.reminderRepeatEnabled}
              disabled={!preferences.reminderEnabled}
              onChange={(event) =>
                void persist({
                  ...preferences,
                  reminderRepeatEnabled: event.target.checked,
                })
              }
              type="checkbox"
            />
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
