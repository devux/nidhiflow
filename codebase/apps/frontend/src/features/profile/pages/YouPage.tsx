import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { Capacitor } from "@capacitor/core";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "../../../app/providers/AuthProvider";
import { trackApiRequest } from "../../../app/providers/apiLoadingState";
import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { environment } from "../../../config/environment";
import {
  archiveCategory,
  createCategory,
  listAccounts,
  listCategories,
  updateCategory,
  type AccountResource,
  type CategoryResource,
} from "../../../data/api/financeClient";
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
import { Icon } from "../../../shared/components/Icon";
import {
  notificationTransactions,
  supportsNotificationTransactions,
  type NotificationTransactionStatus,
} from "../../notifications/native/notificationTransactions";

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
  const { accessToken, activeWorkspace, isAuthenticated, logout, updateProfile, user } = useAuth();
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
  const [notificationAccounts, setNotificationAccounts] = useState<AccountResource[]>([]);
  const [notificationConsent, setNotificationConsent] = useState(false);
  const [notificationState, setNotificationState] = useState<
    "error" | "idle" | "loading" | "saved"
  >("idle");
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationTransactionStatus | null>(null);
  const [notificationAccountId, setNotificationAccountId] = useState("");
  const [categories, setCategories] = useState<CategoryResource[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<"expense" | "income">("expense");
  const [categoryState, setCategoryState] = useState<"error" | "idle" | "loading" | "saving">(
    "idle",
  );
  const [editingCategory, setEditingCategory] = useState<CategoryResource | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const showNotificationTransactions =
    environment.ANDROID_NOTIFICATION_TRANSACTIONS_ENABLED &&
    supportsNotificationTransactions() &&
    isAuthenticated &&
    Boolean(accessToken && activeWorkspace);

  useEffect(() => {
    setDisplayName(profileName);
  }, [profileName]);

  useEffect(() => {
    if (!user) return;
    const nextLocale = (supportedLocales as readonly string[]).includes(user.locale)
      ? (user.locale as SupportedLocale)
      : preferences.locale;
    const nextCurrency = (supportedCurrencies as readonly string[]).includes(user.preferredCurrency)
      ? (user.preferredCurrency as SupportedCurrency)
      : preferences.currency;
    const nextTheme = (themePreferences as readonly string[]).includes(user.theme)
      ? (user.theme as GuestPreferences["theme"])
      : preferences.theme;

    if (
      nextLocale === preferences.locale &&
      nextCurrency === preferences.currency &&
      nextTheme === preferences.theme
    ) {
      return;
    }

    void savePreferences({
      ...preferences,
      currency: nextCurrency,
      locale: nextLocale,
      theme: nextTheme,
      timezone: user.timezone,
    });
  }, [preferences, savePreferences, user]);

  useEffect(() => {
    if (!accessToken || !activeWorkspace) return;
    let active = true;
    setCategoryState("loading");

    void listCategories({
      accessToken,
      trackLoading: false,
      workspaceId: activeWorkspace.id,
    })
      .then((records) => {
        if (!active) return;
        setCategories(records);
        setCategoryState("idle");
      })
      .catch(() => {
        if (active) setCategoryState("error");
      });

    return () => {
      active = false;
    };
  }, [accessToken, activeWorkspace]);

  useEffect(() => {
    if (!showNotificationTransactions || !accessToken || !activeWorkspace) return;
    const notificationAccessToken = accessToken;
    const notificationWorkspaceId = activeWorkspace.id;
    let active = true;
    async function loadNotificationSettings() {
      setNotificationState("loading");
      try {
        const [status, accounts] = await Promise.all([
          notificationTransactions.getStatus(),
          listAccounts({
            accessToken: notificationAccessToken,
            workspaceId: notificationWorkspaceId,
          }),
        ]);
        if (!active) return;
        const writableAccounts = accounts.filter(
          (account) => !account.isArchived && account.currency === "INR",
        );
        setNotificationAccounts(writableAccounts);
        setNotificationStatus(status);
        setNotificationAccountId(
          writableAccounts.some((account) => account.id === status.accountId)
            ? status.accountId
            : (writableAccounts[0]?.id ?? ""),
        );
        setNotificationState("idle");
      } catch {
        if (active) setNotificationState("error");
      }
    }
    const handleFocus = () => void loadNotificationSettings();
    void loadNotificationSettings();
    window.addEventListener("focus", handleFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, [accessToken, activeWorkspace, showNotificationTransactions]);

  async function persist(updatedPreferences: GuestPreferences) {
    setSaveState("idle");

    try {
      if (!user) throw new Error("AUTHENTICATION_REQUIRED");
      await updateProfile({
        locale: updatedPreferences.locale,
        preferredCurrency: updatedPreferences.currency,
        theme: updatedPreferences.theme,
        timezone: updatedPreferences.timezone,
      });
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

    if (user) {
      setSaveState("idle");
      void updateProfile({ displayName: normalizedName })
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
      setIsNameModalOpen(false);
      return;
    }

    setSaveState("error");
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

  function openCategoryDialog(category?: CategoryResource) {
    setEditingCategory(category ?? null);
    setCategoryName(category?.name ?? "");
    setCategoryType(category?.transactionType === "income" ? "income" : "expense");
    setCategoryState("idle");
    setIsCategoryDialogOpen(true);
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = categoryName.trim();
    if (!accessToken || !activeWorkspace || !normalizedName) return;
    setCategoryState("saving");

    try {
      const category = editingCategory
        ? await updateCategory({
            accessToken,
            categoryId: editingCategory.id,
            name: normalizedName,
            transactionType: categoryType,
            workspaceId: activeWorkspace.id,
          })
        : await createCategory({
            accessToken,
            name: normalizedName,
            transactionType: categoryType,
            workspaceId: activeWorkspace.id,
          });
      setCategories((current) => [...current.filter((item) => item.id !== category.id), category]);
      setCategoryState("idle");
      setIsCategoryDialogOpen(false);
    } catch {
      setCategoryState("error");
    }
  }

  async function handleCategoryDelete() {
    if (!accessToken || !activeWorkspace || !editingCategory) return;
    setCategoryState("saving");

    try {
      await archiveCategory({
        accessToken,
        categoryId: editingCategory.id,
        workspaceId: activeWorkspace.id,
      });
      setCategories((current) => current.filter((item) => item.id !== editingCategory.id));
      setCategoryState("idle");
      setIsCategoryDialogOpen(false);
    } catch {
      setCategoryState("error");
    }
  }

  async function enableNotificationTransactions() {
    if (!notificationConsent || !notificationAccountId) return;
    setNotificationState("loading");
    try {
      await notificationTransactions.configure({
        accountId: notificationAccountId,
        captureEnabled: true,
        userId: user?.id,
        workspaceId: activeWorkspace?.id,
      });
      const current = await notificationTransactions.getStatus();
      setNotificationStatus({ ...current, accountId: notificationAccountId, captureEnabled: true });
      setNotificationState("saved");
      window.dispatchEvent(new Event("nidhiflow:notification-settings-changed"));
      if (!current.permissionGranted) {
        await notificationTransactions.openNotificationAccessSettings();
      }
    } catch {
      setNotificationState("error");
    }
  }

  async function disableNotificationTransactions() {
    setNotificationState("loading");
    try {
      await notificationTransactions.disableAndClear();
      setNotificationStatus((current) =>
        current
          ? {
              ...current,
              accountId: "",
              captureEnabled: false,
              pendingCount: 0,
              userId: "",
              workspaceId: "",
            }
          : current,
      );
      setNotificationConsent(false);
      setNotificationState("saved");
    } catch {
      setNotificationState("error");
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
        <span className="profile-page-header__actions">
          <button
            aria-label="Log out"
            className="profile-page-header__logout"
            disabled={logoutState === "saving"}
            onClick={() => void handleLogout()}
            type="button"
          >
            <LogoutRoundedIcon aria-hidden="true" fontSize="small" />
            <span>{logoutState === "saving" ? "Logging out" : "Log out"}</span>
          </button>
          <IconButton
            aria-label="Open preferences"
            className="profile-page-header__settings"
            component="a"
            href="#preferences"
          >
            <SettingsRoundedIcon aria-hidden="true" />
          </IconButton>
        </span>
      </header>

      <section className="profile-card profile-card--compact">
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
              </span>
            </span>
            <span className="profile-card__edit" aria-hidden="true">
              <EditRoundedIcon fontSize="small" />
            </span>
          </button>
        </div>
      </section>

      {saveState === "saved" ? (
        <div className="success-message" role="status">
          <Icon name="check" size={20} />
          Profile updated.
        </div>
      ) : null}
      {saveState === "error" ? (
        <div className="error-message" role="alert">
          Profile or preferences could not be updated. Your previous settings remain unchanged.
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
              <small>v1.0.6 · Android 7 or newer</small>
            </span>
            <Icon name="shield" size={22} />
            <a
              className="button button--primary"
              download="nidhiflow-android-debug-v1.0.6.apk"
              href="/downloads/nidhiflow-android-debug-v1.0.6.apk"
            >
              Download APK
            </a>
          </Card>
        </section>
      ) : null}

      {showNotificationTransactions ? (
        <section aria-labelledby="notification-transactions-title">
          <div className="section-heading">
            <h2 id="notification-transactions-title">Transaction detection</h2>
          </div>
          <Card className="notification-transaction-settings">
            <div>
              <strong>Use Android notifications</strong>
              <p>
                NidhiFlow reads supported payment-app notifications and strict credited/debited
                banking messages posted by your default SMS app. It immediately creates shared
                transactions marked <em>From notification</em>. Raw notification text is not
                uploaded, and NidhiFlow does not read your SMS inbox.
              </p>
            </div>
            <label>
              Account for detected transactions
              <select
                disabled={
                  notificationState === "loading" || Boolean(notificationStatus?.captureEnabled)
                }
                onChange={(event) => setNotificationAccountId(event.target.value)}
                value={notificationAccountId}
              >
                <option value="">Select an INR account</option>
                {notificationAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            {!notificationStatus?.captureEnabled ? (
              <label className="notification-transaction-settings__consent">
                <input
                  checked={notificationConsent}
                  onChange={(event) => setNotificationConsent(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  I understand Android notification access can expose notifications from many apps,
                  including SMS previews, and detected transactions will be visible to everyone in
                  my workspace.
                </span>
              </label>
            ) : null}
            <p>
              Permission: {notificationStatus?.permissionGranted ? "Granted" : "Not granted"}
              {notificationStatus?.pendingCount
                ? ` · ${notificationStatus.pendingCount} waiting to sync`
                : ""}
            </p>
            {notificationState === "error" ? (
              <div className="error-message" role="alert">
                Notification transaction settings could not be updated.
              </div>
            ) : null}
            {notificationStatus?.captureEnabled ? (
              <Button
                disabled={notificationState === "loading"}
                fullWidth
                onClick={() => void disableNotificationTransactions()}
                variant="secondary"
              >
                Disable transaction detection
              </Button>
            ) : (
              <Button
                disabled={
                  notificationState === "loading" || !notificationConsent || !notificationAccountId
                }
                fullWidth
                onClick={() => void enableNotificationTransactions()}
              >
                Enable and open Android settings
              </Button>
            )}
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
        <Card className="profile-category-preferences">
          <div className="profile-category-preferences__heading">
            <span>
              <strong>Categories</strong>
              <small>
                Default categories stay read-only. Your categories belong to this workspace.
              </small>
            </span>
            <Button onClick={() => openCategoryDialog()} variant="secondary">
              <Icon name="plus" size={18} />
              Add
            </Button>
          </div>

          {categoryState === "loading" ? <p>Loading categories…</p> : null}
          {categoryState === "error" ? (
            <p className="form-error" role="alert">
              Categories could not be loaded or saved.
            </p>
          ) : null}

          <div className="profile-category-preferences__group">
            <strong>Default</strong>
            <div className="profile-category-chips">
              {categories
                .filter((category) => category.isSystem)
                .map((category) => (
                  <span key={category.id}>
                    {category.name}
                    <small>{category.transactionType}</small>
                  </span>
                ))}
            </div>
          </div>

          <div className="profile-category-preferences__group">
            <strong>Your categories</strong>
            {categories.some((category) => !category.isSystem) ? (
              <div className="profile-custom-categories">
                {categories
                  .filter((category) => !category.isSystem)
                  .map((category) => (
                    <button
                      aria-label={`Edit ${category.name} category`}
                      key={category.id}
                      onClick={() => openCategoryDialog(category)}
                      type="button"
                    >
                      <span>
                        <strong>{category.name}</strong>
                        <small>{category.transactionType}</small>
                      </span>
                      <span>Edit</span>
                    </button>
                  ))}
              </div>
            ) : (
              <p>No custom categories yet.</p>
            )}
          </div>
        </Card>
      </section>

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
              This name appears across your NidhiFlow profile.
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
        aria-labelledby="category-dialog-title"
        fullWidth
        maxWidth="xs"
        onClose={() => setIsCategoryDialogOpen(false)}
        open={isCategoryDialogOpen}
        slotProps={{ paper: { className: "profile-dialog" } }}
      >
        <DialogTitle id="category-dialog-title">
          {editingCategory ? "Edit category" : "Add category"}
        </DialogTitle>
        <IconButton
          aria-label="Close category editor"
          className="profile-dialog__close"
          onClick={() => setIsCategoryDialogOpen(false)}
          size="small"
        >
          <CloseRoundedIcon aria-hidden="true" />
        </IconButton>
        <DialogContent>
          <form
            className="settings-form profile-category-form"
            onSubmit={(event) => void handleCategorySubmit(event)}
          >
            <label htmlFor="category-name">Name</label>
            <input
              autoFocus
              id="category-name"
              maxLength={80}
              onChange={(event) => setCategoryName(event.target.value)}
              required
              value={categoryName}
            />
            <label htmlFor="category-type">Transaction type</label>
            <select
              id="category-type"
              onChange={(event) => setCategoryType(event.target.value as typeof categoryType)}
              value={categoryType}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            {categoryState === "error" ? (
              <p className="form-error" role="alert">
                This category could not be saved. Check the name and try again.
              </p>
            ) : null}
            <div className="profile-category-form__actions">
              {editingCategory ? (
                <Button
                  disabled={categoryState === "saving"}
                  onClick={() => void handleCategoryDelete()}
                  variant="quiet"
                >
                  Delete
                </Button>
              ) : null}
              <Button disabled={categoryState === "saving"} type="submit">
                {categoryState === "saving" ? "Saving" : "Save category"}
              </Button>
            </div>
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
