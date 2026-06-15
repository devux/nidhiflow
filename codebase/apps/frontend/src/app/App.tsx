import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import type { GuestPreferencesRepository } from "../data/guest/guestPreferencesRepository";
import { LoadingScreen } from "../shared/components/LoadingScreen";
import { GuestPreferencesProvider } from "./providers/GuestPreferencesProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { AppShell } from "./shell/AppShell";
import "../styles/tokens.css";
import "../styles/themes.css";
import "../styles/globals.css";

const HomePage = lazy(async () => ({
  default: (await import("../features/dashboard/pages/HomePage")).HomePage,
}));
const ActivityPage = lazy(async () => ({
  default: (await import("../features/activity/pages/ActivityPage")).ActivityPage,
}));
const FlowPage = lazy(async () => ({
  default: (await import("../features/flow/pages/FlowPage")).FlowPage,
}));
const PlanPage = lazy(async () => ({
  default: (await import("../features/budgets/pages/PlanPage")).PlanPage,
}));
const YouPage = lazy(async () => ({
  default: (await import("../features/profile/pages/YouPage")).YouPage,
}));

export function App({ repository }: { repository?: GuestPreferencesRepository }) {
  return (
    <GuestPreferencesProvider repository={repository}>
      <ThemeProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route element={<AppShell />}>
                <Route element={<HomePage />} index />
                <Route element={<ActivityPage />} path="activity" />
                <Route element={<FlowPage />} path="flow" />
                <Route element={<PlanPage />} path="plan" />
                <Route element={<YouPage />} path="you" />
                <Route element={<Navigate replace to="/" />} path="*" />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </GuestPreferencesProvider>
  );
}
