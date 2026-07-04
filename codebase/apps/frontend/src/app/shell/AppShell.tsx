import { Outlet, useLocation } from "react-router-dom";

import { useApiLoadingCount } from "../providers/apiLoadingState";
import { LoadingScreen } from "../../shared/components/LoadingScreen";
import { BottomNavigation } from "./BottomNavigation";

export function AppShell() {
  const apiLoadingCount = useApiLoadingCount();
  const location = useLocation();
  const isTransactionEntryRoute =
    location.pathname.startsWith("/transactions/") || location.pathname === "/pay";
  const isApiLoading = apiLoadingCount > 0;
  const shouldInertContent =
    isApiLoading && !(typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom"));

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
      {isTransactionEntryRoute ? null : <BottomNavigation />}
    </div>
  );
}
