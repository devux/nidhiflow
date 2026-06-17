import { Outlet } from "react-router-dom";

import { GuestProtectionReminder } from "../../features/profile/components/GuestProtectionReminder";
import { BottomNavigation } from "./BottomNavigation";

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="app-shell__content">
        <Outlet />
      </div>
      <GuestProtectionReminder />
      <BottomNavigation />
    </div>
  );
}
