import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * ITASM is the only theme. Per design.md §7, the runtime concern is light vs.
 * dark only. data-theme="itasm" is set once on <html> and never changes.
 */
const FIXED_THEME = "itasm";

export type ColorMode = "light" | "dark" | "system";

export interface ThemeContextValue {
  colorMode: ColorMode;
  isDark: boolean;
  setColorMode: (mode: ColorMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY_MODE = "comprint-color-mode";

function getSystemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorModeState] = useState<ColorMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_MODE);
    return (stored as ColorMode) || "light";
  });

  const [systemDark, setSystemDark] = useState(getSystemDark);

  const isDark = colorMode === "dark" || (colorMode === "system" && systemDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", FIXED_THEME);
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    localStorage.setItem(STORAGE_KEY_MODE, mode);
  }, []);

  // Memoize so consumers don't re-render on every ThemeProvider render — only
  // when colorMode / isDark actually change.
  const value = useMemo<ThemeContextValue>(
    () => ({ colorMode, isDark, setColorMode }),
    [colorMode, isDark, setColorMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
