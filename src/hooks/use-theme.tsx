"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useStoredValue } from "./use-storage";

export type Theme = "light" | "dark" | "system";

const KEY = "elixir.theme.v1";

// Runs before paint so the first frame is already in the right theme.
export const THEME_SCRIPT = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}));if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})()`;

interface ThemeState {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return !window.matchMedia("(prefers-color-scheme: light)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useStoredValue<Theme>(KEY);
  const theme: Theme = stored ?? "system";

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setStored(t === "system" ? null : t), [setStored]);

  const value = useMemo<ThemeState>(
    () => ({ theme, resolved: theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme, setTheme }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const t = useContext(ThemeContext);
  if (!t) throw new Error("useTheme must be used inside ThemeProvider");
  return t;
}
