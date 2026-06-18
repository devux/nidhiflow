import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import type { GuestPreferencesRepository } from "../data/guest/guestPreferencesRepository";
import type { GuestTransactionRepository } from "../data/guest/guestTransactionRepository";
import { LoadingScreen } from "../shared/components/LoadingScreen";
import { AuthProvider } from "./providers/AuthProvider";
import { GuestPreferencesProvider } from "./providers/GuestPreferencesProvider";
import { GuestTransactionsProvider } from "./providers/GuestTransactionsProvider";
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
const BudgetPage = lazy(async () => ({
  default: (await import("../features/budgets/pages/BudgetPage")).BudgetPage,
}));
const YouPage = lazy(async () => ({
  default: (await import("../features/profile/pages/YouPage")).YouPage,
}));
const TransactionFormPage = lazy(async () => ({
  default: (await import("../features/transactions/pages/TransactionFormPage")).TransactionFormPage,
}));
const SignupPage = lazy(async () => ({
  default: (await import("../features/auth/pages/SignupPage")).SignupPage,
}));
const LoginPage = lazy(async () => ({
  default: (await import("../features/auth/pages/LoginPage")).LoginPage,
}));

interface AppProps {
  repository?: GuestPreferencesRepository;
  transactionRepository?: GuestTransactionRepository;
}

export function App({ repository, transactionRepository }: AppProps) {
  return (
    <GuestPreferencesProvider repository={repository}>
      <AuthProvider>
        <GuestTransactionsProvider repository={transactionRepository}>
          <ThemeProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  <Route element={<AppShell />}>
                    <Route element={<HomePage />} index />
                    <Route element={<ActivityPage />} path="activity" />
                    <Route element={<FlowPage />} path="flow" />
                    <Route element={<BudgetPage />} path="budget" />
                    <Route element={<Navigate replace to="/budget" />} path="plan" />
                    <Route element={<YouPage />} path="you" />
                    <Route element={<SignupPage />} path="signup" />
                    <Route element={<LoginPage />} path="login" />
                    <Route element={<TransactionFormPage />} path="transactions/new" />
                    <Route element={<TransactionFormPage />} path="transactions/:id/edit" />
                    <Route element={<Navigate replace to="/" />} path="*" />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ThemeProvider>
        </GuestTransactionsProvider>
      </AuthProvider>
    </GuestPreferencesProvider>
  );
}
