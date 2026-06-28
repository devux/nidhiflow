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
  activeWorkspace: WorkspaceSummary | null;
  isAuthenticated: boolean;
  isCheckingSession: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshWorkspaces: (preferredWorkspaceId?: string) => Promise<WorkspaceSummary[]>;
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
  setActiveWorkspace: (workspaceId: string) => void;
  user: AuthUser | null;
  verifyEmail: (token: string) => Promise<void>;
  workspaces: WorkspaceSummary[];
}

const AuthContext = createContext<AuthContextValue | null>(null);
const sessionAccessTokenKey = "nidhiflow.accessToken";
const sessionAuthSnapshotKey = "nidhiflow.authSession";
const sessionActiveWorkspaceKey = "nidhiflow.activeWorkspaceId";

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
    window.sessionStorage.removeItem(sessionActiveWorkspaceKey);
  } catch {
    // Nothing to clear when browser storage is unavailable.
  }
}

function readStoredActiveWorkspaceId(): string | null {
  try {
    return window.sessionStorage.getItem(sessionActiveWorkspaceKey);
  } catch {
    return null;
  }
}

function storeActiveWorkspaceId(workspaceId: string | null) {
  try {
    if (workspaceId) {
      window.sessionStorage.setItem(sessionActiveWorkspaceKey, workspaceId);
    } else {
      window.sessionStorage.removeItem(sessionActiveWorkspaceKey);
    }
  } catch {
    // Workspace selection remains available for the current in-memory session.
  }
}

function selectActiveWorkspace(
  workspaces: WorkspaceSummary[],
  preferredWorkspaceId?: string | null,
): WorkspaceSummary | null {
  const preferredWorkspace = preferredWorkspaceId
    ? workspaces.find((workspace) => workspace.id === preferredWorkspaceId)
    : null;

  if (preferredWorkspace) return preferredWorkspace;

  return workspaces.find((workspace) => workspace.type === "personal") ?? workspaces[0] ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isActive = true;
    const guestFirstFallback = window.setTimeout(() => {
      if (isActive) {
        setIsCheckingSession(false);
      }
    }, 1500);

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
        setActiveWorkspaceId((current) => {
          const selectedWorkspace = selectActiveWorkspace(
            session.workspaces,
            current ?? readStoredActiveWorkspaceId(),
          );
          storeActiveWorkspaceId(selectedWorkspace?.id ?? null);
          return selectedWorkspace?.id ?? null;
        });
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
          setActiveWorkspaceId(
            selectActiveWorkspace(storedSession.workspaces, readStoredActiveWorkspaceId())?.id ??
              null,
          );
          setIsCheckingSession(false);
        }

        try {
          await loadSession(storedSession.accessToken);
          return;
        } catch (storedSessionError) {
          if (!isAuthFailure(storedSessionError) && storedSession.user) {
            return;
          }
        }

        try {
          await refreshSession();
          return;
        } catch (refreshError) {
          if (storedSession.user && !isAuthFailure(refreshError)) {
            return;
          }

          throw refreshError;
        }
      }

      await refreshSession();
    }

    restoreSession()
      .catch((error: unknown) => {
        if (isActive) {
          if (isAuthFailure(error)) {
            clearStoredAuthSession();
          }
          setAccessToken(null);
          setActiveWorkspaceId(null);
          setUser(null);
          setWorkspaces([]);
        }
      })
      .finally(() => {
        window.clearTimeout(guestFirstFallback);
        if (isActive) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      isActive = false;
      window.clearTimeout(guestFirstFallback);
    };
  }, []);

  const handleLogin = useCallback(async (input: { email: string; password: string }) => {
    const session = await login(input);
    storeAuthSession(session);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setWorkspaces(session.workspaces);
    const selectedWorkspace = selectActiveWorkspace(session.workspaces);
    setActiveWorkspaceId(selectedWorkspace?.id ?? null);
    storeActiveWorkspaceId(selectedWorkspace?.id ?? null);
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
      const selectedWorkspace = selectActiveWorkspace(session.workspaces);
      setActiveWorkspaceId(selectedWorkspace?.id ?? null);
      storeActiveWorkspaceId(selectedWorkspace?.id ?? null);
    },
    [],
  );

  const handleVerifyEmail = useCallback(async (token: string) => {
    const session = await verifyEmail(token);
    storeAuthSession(session);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setWorkspaces(session.workspaces);
    const selectedWorkspace = selectActiveWorkspace(session.workspaces);
    setActiveWorkspaceId(selectedWorkspace?.id ?? null);
    storeActiveWorkspaceId(selectedWorkspace?.id ?? null);
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

  const handleRefreshWorkspaces = useCallback(
    async (preferredWorkspaceId?: string) => {
      if (!accessToken) {
        throw new ApiRequestError("Authentication is required.", 401);
      }

      const currentWorkspaces = await getWorkspaces(accessToken);
      setWorkspaces(currentWorkspaces);
      setActiveWorkspaceId((current) => {
        const selectedWorkspace = selectActiveWorkspace(
          currentWorkspaces,
          preferredWorkspaceId ?? current,
        );
        storeActiveWorkspaceId(selectedWorkspace?.id ?? null);
        return selectedWorkspace?.id ?? null;
      });

      if (user) {
        storeAuthSession({
          accessToken,
          user,
          workspaces: currentWorkspaces,
        });
      }

      return currentWorkspaces;
    },
    [accessToken, user],
  );

  const handleSetActiveWorkspace = useCallback(
    (workspaceId: string) => {
      if (!workspaces.some((workspace) => workspace.id === workspaceId)) {
        throw new Error("The selected workspace is not available.");
      }

      storeActiveWorkspaceId(workspaceId);
      setActiveWorkspaceId(workspaceId);
    },
    [workspaces],
  );

  const handleLogout = useCallback(async () => {
    await logout();
    clearStoredAuthSession();
    setAccessToken(null);
    setActiveWorkspaceId(null);
    setUser(null);
    setWorkspaces([]);
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      activeWorkspace:
        workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
        selectActiveWorkspace(workspaces),
      isAuthenticated: Boolean(user && accessToken),
      isCheckingSession,
      login: handleLogin,
      logout: handleLogout,
      register: handleRegister,
      refreshWorkspaces: handleRefreshWorkspaces,
      setActiveWorkspace: handleSetActiveWorkspace,
      updateProfile: handleUpdateProfile,
      user,
      verifyEmail: handleVerifyEmail,
      workspaces,
    }),
    [
      accessToken,
      activeWorkspaceId,
      handleLogin,
      handleLogout,
      handleRefreshWorkspaces,
      handleRegister,
      handleSetActiveWorkspace,
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
