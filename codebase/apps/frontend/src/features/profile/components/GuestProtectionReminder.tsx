import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useGuestPreferences } from "../../../app/providers/GuestPreferencesProvider";
import { Button } from "../../../shared/components/Button";
import { Icon } from "../../../shared/components/Icon";

const reminderDelayMs = 5 * 60 * 1000;

interface GuestProtectionReminderProps {
  isAuthenticated: boolean;
}

export function GuestProtectionReminder({ isAuthenticated }: GuestProtectionReminderProps) {
  const location = useLocation();
  const { preferences, savePreferences } = useGuestPreferences();
  const [isVisible, setIsVisible] = useState(false);
  const [cycle, setCycle] = useState(0);
  const shouldPause = isAuthenticated || location.pathname.startsWith("/transactions/");

  const canSchedule = useMemo(
    () => preferences.reminderEnabled && !isAuthenticated && !shouldPause && !isVisible,
    [isAuthenticated, isVisible, preferences.reminderEnabled, shouldPause],
  );

  useEffect(() => {
    if (isAuthenticated) {
      setIsVisible(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!canSchedule) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      if (!document.hidden) {
        setIsVisible(true);
      }
    }, reminderDelayMs);

    return () => window.clearTimeout(timeout);
  }, [canSchedule, cycle]);

  if (isAuthenticated || !isVisible || shouldPause || !preferences.reminderEnabled) {
    return null;
  }

  function continueAsGuest() {
    setIsVisible(false);

    if (preferences.reminderRepeatEnabled) {
      setCycle((current) => current + 1);
    }
  }

  async function remindAgain() {
    await savePreferences({
      ...preferences,
      reminderEnabled: true,
      reminderRepeatEnabled: true,
    });
    setIsVisible(false);
    setCycle((current) => current + 1);
  }

  async function stopReminders() {
    await savePreferences({
      ...preferences,
      reminderEnabled: false,
      reminderRepeatEnabled: false,
    });
    setIsVisible(false);
  }

  return (
    <aside aria-labelledby="guest-reminder-title" className="guest-reminder" role="status">
      <span className="icon-tile" aria-hidden="true">
        <Icon name="shield" />
      </span>
      <div>
        <h2 id="guest-reminder-title">Protect your guest data</h2>
        <p>
          Your local records remain usable, but they may be lost if this browser data is cleared.
        </p>
        <div className="guest-reminder__actions">
          <Link className="button button--primary" to="/signup">
            <Icon name="cloud" size={18} />
            Create account
          </Link>
          <Link className="button button--secondary" to="/login">
            <Icon name="user" size={18} />
            Log in
          </Link>
          <Button onClick={continueAsGuest} variant="secondary">
            Continue as guest
          </Button>
          <Button onClick={() => void remindAgain()} variant="quiet">
            Remind every 5 minutes
          </Button>
          <Button onClick={() => void stopReminders()} variant="quiet">
            Don't remind me again
          </Button>
        </div>
      </div>
    </aside>
  );
}
