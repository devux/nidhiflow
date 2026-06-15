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
  IndexedDbGuestPreferencesRepository,
  type GuestPreferencesRepository,
} from "../../data/guest/guestPreferencesRepository";
import type { GuestPreferences } from "../../domain/preferences/guestPreferences";
import { ErrorState } from "../../shared/components/ErrorState";
import { LoadingScreen } from "../../shared/components/LoadingScreen";

interface GuestPreferencesContextValue {
  preferences: GuestPreferences;
  savePreferences: (preferences: GuestPreferences) => Promise<void>;
}

interface GuestPreferencesProviderProps {
  children: ReactNode;
  repository?: GuestPreferencesRepository;
}

const GuestPreferencesContext = createContext<GuestPreferencesContextValue | null>(null);
const defaultRepository = new IndexedDbGuestPreferencesRepository();

export function GuestPreferencesProvider({
  children,
  repository = defaultRepository,
}: GuestPreferencesProviderProps) {
  const [preferences, setPreferences] = useState<GuestPreferences>();
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;

    setLoadError(false);

    repository
      .load()
      .then((loadedPreferences) => {
        if (isActive) {
          setPreferences(loadedPreferences);
        }
      })
      .catch(() => {
        if (isActive) {
          setLoadError(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [loadAttempt, repository]);

  const savePreferences = useCallback(
    async (updatedPreferences: GuestPreferences) => {
      await repository.save(updatedPreferences);
      setPreferences(updatedPreferences);
    },
    [repository],
  );

  const contextValue = useMemo(
    () => (preferences ? { preferences, savePreferences } : null),
    [preferences, savePreferences],
  );

  if (loadError) {
    return (
      <ErrorState
        actionLabel="Try again"
        description="Your local guest preferences could not be opened. No data was uploaded."
        onAction={() => setLoadAttempt((attempt) => attempt + 1)}
        title="Local storage is unavailable"
      />
    );
  }

  if (!contextValue) {
    return <LoadingScreen />;
  }

  return (
    <GuestPreferencesContext.Provider value={contextValue}>
      {children}
    </GuestPreferencesContext.Provider>
  );
}

export function useGuestPreferences(): GuestPreferencesContextValue {
  const context = useContext(GuestPreferencesContext);

  if (!context) {
    throw new Error("useGuestPreferences must be used within GuestPreferencesProvider.");
  }

  return context;
}
