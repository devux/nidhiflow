import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { Capacitor } from "@capacitor/core";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
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
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
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
      setIsNameModalOpen(false);
      return;
    }

    void persist({ ...preferences, displayName: normalizedName });
    setIsNameModalOpen(false);
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
      setIsFeedbackModalOpen(false);
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
  const showAndroidDownload = !Capacitor.isNativePlatform();

  return (
    <main className="page page--profile" id="main-content">
      <header className="profile-page-header">
        <span>
          <h1>Profile</h1>
          <p>Manage your account and preferences</p>
        </span>
        <IconButton
          aria-label="Open preferences"
          className="profile-page-header__settings"
          component="a"
          href="#preferences"
        >
          <SettingsRoundedIcon aria-hidden="true" />
        </IconButton>
      </header>

      <Card className="profile-card">
        <div className="profile-card__top">
          <button
            aria-label={`Edit display name, current name ${profileName}`}
            className="profile-card__identity"
            onClick={() => setIsNameModalOpen(true)}
            type="button"
          >
            <span className="profile-avatar" aria-hidden="true">
              {profileInitial}
            </span>
            <span className="profile-card__identity-copy">
              <span className="profile-card__name-row">
                <h2>{profileName}</h2>
                <span className="local-badge">
                  <Icon name="user" size={15} />
                  {isAuthenticated ? "Signed in" : "Guest user"}
                </span>
              </span>
              <small>{isAuthenticated && user ? user.email : "Local profile on this device"}</small>
            </span>
            <Icon name="chevron" size={18} />
          </button>
        </div>
        {isAuthenticated && user ? (
          <Button
            disabled={logoutState === "saving"}
            fullWidth
            onClick={() => void handleLogout()}
            variant="secondary"
          >
            <Icon name="user" size={20} />
            {logoutState === "saving" ? "Logging out" : "Log out"}
          </Button>
        ) : (
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

      <nav aria-label="Profile shortcuts" className="profile-compact-menu">
        <Card className="settings-list">
          {tools.map((tool) => (
            <Link key={tool.title} to={tool.href}>
              <span className="icon-tile">
                <Icon name={tool.icon} size={18} />
              </span>
              <strong>{tool.title}</strong>
              <Icon name="chevron" size={18} />
            </Link>
          ))}
          <button onClick={() => setIsFeedbackModalOpen(true)} type="button">
            <span className="icon-tile">
              <Icon name="feedback" size={18} />
            </span>
            <strong>Feedback</strong>
            <Icon name="chevron" size={18} />
          </button>
          <a href="#preferences">
            <span className="icon-tile">
              <SettingsRoundedIcon aria-hidden="true" fontSize="small" />
            </span>
            <strong>Preferences</strong>
            <Icon name="chevron" size={18} />
          </a>
        </Card>
      </nav>

      <section aria-labelledby="tools-title" className="profile-quick-access">
        <div className="section-heading">
          <h2 id="tools-title">Quick access</h2>
        </div>
        <Card className="settings-list profile-quick-access__list">
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

      <section aria-labelledby="feedback-title" className="profile-feedback-entry">
        <div className="section-heading">
          <h2 id="feedback-title">Feedback</h2>
        </div>
        <Card className="settings-list">
          <button aria-haspopup="dialog" onClick={() => setIsFeedbackModalOpen(true)} type="button">
            <span className="icon-tile">
              <Icon name="feedback" size={20} />
            </span>
            <span>
              <strong>Share feedback</strong>
              <small>Help improve NidhiFlow</small>
            </span>
            <Icon name="chevron" size={18} />
          </button>
        </Card>
      </section>

      {showAndroidDownload ? (
        <section aria-labelledby="android-app-title" className="profile-android-download">
          <div className="section-heading">
            <h2 id="android-app-title">Android app</h2>
          </div>
          <Card className="android-download-card">
            <span className="icon-tile" aria-hidden="true">
              <Icon name="cloud" size={22} />
            </span>
            <span>
              <strong>NidhiFlow for Android</strong>
              <small>Testing build · Version 1.0.1 · Android 7 or newer</small>
            </span>
            <a
              className="button button--primary"
              download="nidhiflow-android-debug-v1.0.1.apk"
              href="/downloads/nidhiflow-android-debug-v1.0.1.apk"
            >
              Download APK
            </a>
            <p>
              This APK uses a development signature for device testing. Android may ask you to allow
              installation from this browser.
            </p>
          </Card>
        </section>
      ) : null}

      <section aria-labelledby="preferences-title" id="preferences">
        <div className="section-heading">
          <h2 id="preferences-title">Preferences</h2>
        </div>
        <Card className="profile-preferences-list">
          <label className="profile-preference-row" htmlFor="appearance">
            <span className="icon-tile">
              <Icon
                name={
                  preferences.theme === "dark"
                    ? "moon"
                    : preferences.theme === "light"
                      ? "sun"
                      : "sparkles"
                }
                size={20}
              />
            </span>
            <strong>Appearance</strong>
            <select
              id="appearance"
              onChange={(event) =>
                void persist({
                  ...preferences,
                  theme: event.target.value as GuestPreferences["theme"],
                })
              }
              value={preferences.theme}
            >
              {themePreferences.map((theme) => (
                <option key={theme} value={theme}>
                  {theme[0].toUpperCase() + theme.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="profile-preference-row" htmlFor="locale">
            <span className="icon-tile">
              <Icon name="activity" size={20} />
            </span>
            <strong>Language</strong>
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

          <label className="profile-preference-row" htmlFor="currency">
            <span className="icon-tile profile-preference-row__currency" aria-hidden="true">
              {preferences.currency === "INR" ? "₹" : preferences.currency.slice(0, 1)}
            </span>
            <strong>Currency</strong>
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

      {!isAuthenticated ? (
        <Card className="privacy-card" subtle>
          <Icon name="lock" />
          <span>
            <h2>Privacy by default</h2>
            <p>NidhiFlow has not uploaded this guest profile or created a hidden server account.</p>
          </span>
        </Card>
      ) : null}

      <footer className="profile-page-footer">
        <span>NidhiFlow v1.0.0</span>
        <Icon name="shield" size={16} />
      </footer>

      <Dialog
        aria-labelledby="edit-name-dialog-title"
        fullWidth
        maxWidth="xs"
        onClose={() => setIsNameModalOpen(false)}
        open={isNameModalOpen}
        slotProps={{ paper: { className: "profile-dialog" } }}
      >
        <DialogTitle id="edit-name-dialog-title">Edit name</DialogTitle>
        <IconButton
          aria-label="Close name editor"
          className="profile-dialog__close"
          onClick={() => setIsNameModalOpen(false)}
          size="small"
        >
          <CloseRoundedIcon aria-hidden="true" />
        </IconButton>
        <DialogContent>
          <form className="settings-form" onSubmit={handleDisplayNameSubmit}>
            <label htmlFor="display-name">Display name</label>
            <p className="field-help" id="display-name-help">
              {isAuthenticated
                ? "This name appears across your NidhiFlow profile."
                : "This name is stored only in this browser."}
            </p>
            <input
              aria-describedby={`display-name-help${fieldError ? " display-name-error" : ""}`}
              aria-invalid={Boolean(fieldError)}
              id="display-name"
              maxLength={80}
              onChange={(event) => setDisplayName(event.target.value)}
              value={displayName}
            />
            {fieldError ? (
              <p className="field-error" id="display-name-error">
                {fieldError}
              </p>
            ) : null}
            <Button fullWidth type="submit">
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        aria-labelledby="feedback-dialog-title"
        fullWidth
        maxWidth="sm"
        onClose={() => setIsFeedbackModalOpen(false)}
        open={isFeedbackModalOpen}
        slotProps={{ paper: { className: "profile-dialog" } }}
      >
        <DialogTitle id="feedback-dialog-title">Feedback</DialogTitle>
        <IconButton
          aria-label="Close feedback"
          className="profile-dialog__close"
          onClick={() => setIsFeedbackModalOpen(false)}
          size="small"
        >
          <CloseRoundedIcon aria-hidden="true" />
        </IconButton>
        <DialogContent>
          <form
            className="settings-form profile-feedback-form"
            onSubmit={(event) => void handleFeedbackSubmit(event)}
          >
            <label className="profile-feedback-form__category" htmlFor="feedback-category">
              <strong>Category</strong>
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
            <label htmlFor="feedback-description">
              <strong>Message</strong>
            </label>
            <textarea
              id="feedback-description"
              maxLength={1000}
              minLength={10}
              onChange={(event) => setFeedbackDescription(event.target.value)}
              placeholder="Type your message..."
              required
              rows={4}
              value={feedbackDescription}
            />
            <Button disabled={feedbackState === "sending"} fullWidth type="submit">
              <Icon name="feedback" size={20} />
              {feedbackState === "sending" ? "Sending" : "Send feedback"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
