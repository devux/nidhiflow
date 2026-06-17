import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUser,
  getWorkspaces,
  login,
  logout,
  refreshAccessToken,
  registerAccount,
  verifyEmail,
  type AuthUser,
  type WorkspaceSummary,
} from "../../data/api/authClient";

interface AuthContextValue {
  accessToken: string | null;
  isAuthenticated: boolean;
  isCheckingSession: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  register: (input: {
    displayName: string;
    email: string;
    locale: string;
    password: string;
    preferredCurrency: string;
    theme: string;
    timezone: string;
  }) => Promise<{ debugToken?: string; message: string }>;
  user: AuthUser | null;
  verifyEmail: (token: string) => Promise<void>;
  workspaces: WorkspaceSummary[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isActive = true;

    refreshAccessToken()
      .then(async (token) => {
        const [currentUser, currentWorkspaces] = await Promise.all([
          getCurrentUser(token),
          getWorkspaces(token),
        ]);

        if (isActive) {
          setAccessToken(token);
          setUser(currentUser);
          setWorkspaces(currentWorkspaces);
        }
      })
      .catch(() => {
        if (isActive) {
          setAccessToken(null);
          setUser(null);
          setWorkspaces([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleLogin = useCallback(async (input: { email: string; password: string }) => {
    const session = await login(input);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setWorkspaces(session.workspaces);
  }, []);

  const handleRegister = useCallback(
    (input: {
      displayName: string;
      email: string;
      locale: string;
      password: string;
      preferredCurrency: string;
      theme: string;
      timezone: string;
    }) => registerAccount(input),
    [],
  );

  const handleVerifyEmail = useCallback(async (token: string) => {
    const session = await verifyEmail(token);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setWorkspaces(session.workspaces);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setAccessToken(null);
    setUser(null);
    setWorkspaces([]);
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      isAuthenticated: Boolean(user && accessToken),
      isCheckingSession,
      login: handleLogin,
      logout: handleLogout,
      register: handleRegister,
      user,
      verifyEmail: handleVerifyEmail,
      workspaces,
    }),
    [
      accessToken,
      handleLogin,
      handleLogout,
      handleRegister,
      handleVerifyEmail,
      isCheckingSession,
      user,
      workspaces,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
