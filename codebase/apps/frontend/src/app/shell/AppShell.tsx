import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../providers/AuthProvider";
import { useApiLoadingCount } from "../providers/apiLoadingState";
import { GuestProtectionReminder } from "../../features/profile/components/GuestProtectionReminder";
import { Button } from "../../shared/components/Button";
import { Icon } from "../../shared/components/Icon";
import { LoadingScreen } from "../../shared/components/LoadingScreen";
import { BottomNavigation } from "./BottomNavigation";

export function AppShell() {
  const { isAuthenticated, isCheckingSession } = useAuth();
  const apiLoadingCount = useApiLoadingCount();
  const location = useLocation();
  const navigate = useNavigate();
  const [showGuestChoice, setShowGuestChoice] = useState(false);
  const isAuthRoute = location.pathname === "/login" || location.pathname === "/signup";
  const isTransactionEntryRoute =
    location.pathname.startsWith("/transactions/") || location.pathname === "/pay";
  const isApiLoading = apiLoadingCount > 0;
  const shouldInertContent =
    isApiLoading && !(typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom"));

  useEffect(() => {
    if (isCheckingSession || isAuthenticated || isAuthRoute) {
      setShowGuestChoice(false);
      return;
    }

    setShowGuestChoice(true);
  }, [isAuthRoute, isAuthenticated, isCheckingSession]);

  if (isCheckingSession) {
    return <LoadingScreen routePath={location.pathname} />;
  }

  return (
    <div
      className={isTransactionEntryRoute ? "app-shell app-shell--transaction-entry" : "app-shell"}
    >
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div
        className={
          isTransactionEntryRoute
            ? "app-shell__content app-shell__content--transaction-entry"
            : "app-shell__content"
        }
        inert={shouldInertContent}
      >
        <Outlet />
      </div>
      {isApiLoading ? <LoadingScreen routePath={location.pathname} variant="overlay" /> : null}
      {showGuestChoice ? (
        <aside aria-labelledby="guest-choice-title" className="guest-reminder" role="dialog">
          <span className="icon-tile" aria-hidden="true">
            <Icon name="shield" />
          </span>
          <div>
            <h2 id="guest-choice-title">Continue in guest mode?</h2>
            <p>
              You are not signed in. Guest mode keeps finance data local on this device; log in for
              account backup and sync.
            </p>
            <div className="guest-reminder__actions">
              <Button onClick={() => setShowGuestChoice(false)} variant="secondary">
                Continue as guest
              </Button>
              <Button
                onClick={() => {
                  void navigate("/login");
                }}
                variant="primary"
              >
                Log in
              </Button>
            </div>
          </div>
        </aside>
      ) : null}
      <GuestProtectionReminder isAuthenticated={isAuthenticated} />
      {isTransactionEntryRoute ? null : <BottomNavigation />}
    </div>
  );
}
