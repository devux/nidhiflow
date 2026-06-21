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
  ApiRequestError,
  getCurrentUser,
  getWorkspaces,
  login,
  logout,
  refreshAccessToken,
  registerAccount,
  updateCurrentUser,
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
  }) => Promise<void>;
  updateProfile: (
    input: Partial<
      Pick<AuthUser, "displayName" | "locale" | "preferredCurrency" | "theme" | "timezone">
    >,
  ) => Promise<AuthUser>;
  user: AuthUser | null;
  verifyEmail: (token: string) => Promise<void>;
  workspaces: WorkspaceSummary[];
}

const AuthContext = createContext<AuthContextValue | null>(null);
const sessionAccessTokenKey = "nidhiflow.accessToken";
const sessionAuthSnapshotKey = "nidhiflow.authSession";

interface StoredAuthSession {
  accessToken: string;
  user: AuthUser | null;
  workspaces: WorkspaceSummary[];
}

interface AuthenticatedStoredSession {
  accessToken: string;
  user: AuthUser;
  workspaces: WorkspaceSummary[];
}

function isAuthFailure(error: unknown) {
  return error instanceof ApiRequestError && (error.status === 401 || error.status === 403);
}

function readStoredAuthSession(): StoredAuthSession | null {
  try {
    const snapshot = window.sessionStorage.getItem(sessionAuthSnapshotKey);

    if (snapshot) {
      const parsed = JSON.parse(snapshot) as StoredAuthSession;

      if (parsed.accessToken && parsed.user && Array.isArray(parsed.workspaces)) {
        return parsed;
      }
    }

    const accessToken = window.sessionStorage.getItem(sessionAccessTokenKey);

    return accessToken ? { accessToken, user: null, workspaces: [] } : null;
  } catch {
    return null;
  }
}

function storeAuthSession(session: AuthenticatedStoredSession) {
  try {
    window.sessionStorage.setItem(sessionAccessTokenKey, session.accessToken);
    window.sessionStorage.setItem(sessionAuthSnapshotKey, JSON.stringify(session));
  } catch {
    // The refresh cookie remains the primary session restore mechanism.
  }
}

function clearStoredAuthSession() {
  try {
    window.sessionStorage.removeItem(sessionAccessTokenKey);
    window.sessionStorage.removeItem(sessionAuthSnapshotKey);
  } catch {
    // Nothing to clear when browser storage is unavailable.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadSession(accessTokenToLoad: string) {
      const [currentUser, currentWorkspaces] = await Promise.all([
        getCurrentUser(accessTokenToLoad),
        getWorkspaces(accessTokenToLoad),
      ]);
      const session = {
        accessToken: accessTokenToLoad,
        user: currentUser,
        workspaces: currentWorkspaces,
      };

      storeAuthSession(session);

      if (isActive) {
        setAccessToken(session.accessToken);
        setUser(session.user);
        setWorkspaces(session.workspaces);
      }
    }

    async function refreshSession() {
      const token = await refreshAccessToken();
      await loadSession(token);
    }

    async function restoreSession() {
      const storedSession = readStoredAuthSession();

      if (storedSession) {
        if (storedSession.user && isActive) {
          setAccessToken(storedSession.accessToken);
          setUser(storedSession.user);
          setWorkspaces(storedSession.workspaces);
          setIsCheckingSession(false);
        }

        try {
          await loadSession(storedSession.accessToken);
          return;
        } catch (storedSessionError) {
          if (!isAuthFailure(storedSessionError) && storedSession.user) {
            return;
          }

          clearStoredAuthSession();
        }
      }

      await refreshSession();
    }

    restoreSession()
      .catch(() => {
        if (isActive) {
          clearStoredAuthSession();
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
    storeAuthSession(session);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setWorkspaces(session.workspaces);
  }, []);

  const handleRegister = useCallback(
    async (input: {
      displayName: string;
      email: string;
      locale: string;
      password: string;
      preferredCurrency: string;
      theme: string;
      timezone: string;
    }) => {
      const session = await registerAccount(input);
      storeAuthSession(session);
      setAccessToken(session.accessToken);
      setUser(session.user);
      setWorkspaces(session.workspaces);
    },
    [],
  );

  const handleVerifyEmail = useCallback(async (token: string) => {
    const session = await verifyEmail(token);
    storeAuthSession(session);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setWorkspaces(session.workspaces);
  }, []);

  const handleUpdateProfile = useCallback(
    async (
      input: Partial<
        Pick<AuthUser, "displayName" | "locale" | "preferredCurrency" | "theme" | "timezone">
      >,
    ) => {
      if (!accessToken) {
        throw new ApiRequestError("Authentication is required.", 401);
      }

      const updatedUser = await updateCurrentUser(accessToken, input);
      setUser(updatedUser);

      if (accessToken) {
        storeAuthSession({
          accessToken,
          user: updatedUser,
          workspaces,
        });
      }

      return updatedUser;
    },
    [accessToken, workspaces],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    clearStoredAuthSession();
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
      updateProfile: handleUpdateProfile,
      user,
      verifyEmail: handleVerifyEmail,
      workspaces,
    }),
    [
      accessToken,
      handleLogin,
      handleLogout,
      handleRegister,
      handleUpdateProfile,
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
