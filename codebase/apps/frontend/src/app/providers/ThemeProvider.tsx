import { useEffect, type ReactNode } from "react";

import { useGuestPreferences } from "./GuestPreferencesProvider";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { preferences } = useGuestPreferences();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const resolvedTheme =
        preferences.theme === "system"
          ? mediaQuery.matches
            ? "dark"
            : "light"
          : preferences.theme;

      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.style.colorScheme = resolvedTheme;
    };

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);

    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [preferences.theme]);

  return children;
}
