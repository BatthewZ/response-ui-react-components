import { useCallback, useMemo, useSyncExternalStore } from "react";

/** Default themes shipped with @batthewz/response-ui-css. */
export const THEMES = ["default", "events", "grimdark", "tech"] as const;
type DefaultTheme = (typeof THEMES)[number];

export const STORAGE_KEY = "theme";

function getSnapshotFor<T extends string>(
  themes: readonly T[],
  fallback: T,
): () => T {
  return () => {
    if (typeof document === "undefined") return fallback;
    const attr = document.documentElement.getAttribute("data-theme");
    return themes.includes(attr as T) ? (attr as T) : fallback;
  };
}

function subscribe(callback: () => void) {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === "data-theme") {
        callback();
        break;
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true });
  return () => observer.disconnect();
}

export interface UseThemeOptions<T extends string = DefaultTheme> {
  /**
   * The list of themes valid for this app. The first entry is treated as the
   * default (it removes the data-theme attribute when set, instead of writing
   * the value).
   */
  themes?: readonly T[];
}

export interface UseThemeReturn<T extends string = DefaultTheme> {
  theme: T;
  setTheme: (next: T) => void;
  themes: readonly T[];
}

/**
 * Theme hook. Reads the current theme from `<html data-theme>` and writes
 * theme changes back. Persists to localStorage. Pass a custom `themes` list
 * to register app-defined themes.
 *
 *     const { theme, setTheme, themes } = useTheme({
 *       themes: ["default", "grimdark", "aurora"] as const,
 *     });
 */
export function useTheme(): UseThemeReturn<DefaultTheme>;
export function useTheme<T extends string>(options: UseThemeOptions<T>): UseThemeReturn<T>;
export function useTheme<T extends string>(
  options?: UseThemeOptions<T>,
): UseThemeReturn<T | DefaultTheme> {
  const themes = (options?.themes ?? THEMES) as readonly (T | DefaultTheme)[];
  const fallback = themes[0] ?? "default";

  const getSnapshot = useMemo(
    () => getSnapshotFor(themes, fallback as T | DefaultTheme),
    [themes, fallback],
  );

  const theme = useSyncExternalStore(subscribe, getSnapshot, () => fallback as T | DefaultTheme);

  const setTheme = useCallback(
    (next: T | DefaultTheme) => {
      if (typeof document === "undefined") return;
      if (next === fallback) {
        document.documentElement.removeAttribute("data-theme");
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* private browsing */
        }
      } else {
        document.documentElement.setAttribute("data-theme", next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* private browsing */
        }
      }
    },
    [fallback],
  );

  return { theme, setTheme, themes };
}

export type { DefaultTheme as Theme };
