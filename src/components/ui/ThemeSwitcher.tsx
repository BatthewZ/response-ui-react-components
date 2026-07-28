"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  type KeyboardEvent,
  useEffect,
} from "react";

import { useRovingFocus } from "../../hooks/use-roving-focus";
import { useTheme } from "../../hooks/use-theme";
import { cn } from "../../util/style";

/** Option text, keyed by theme id. A theme with no entry is labelled by its id. */
export type ThemeSwitcherLabels = Partial<Record<string, string>>;

/**
 * Only `default` is labelled here, because it is the only theme name this design
 * system defines. Your themes get their id as their label until you pass
 * `labels` — deliberately, so an unlabelled theme looks unfinished rather than
 * silently borrowing someone else's name.
 */
const DEFAULT_LABELS: ThemeSwitcherLabels = { default: "Default" };

/**
 * What the switcher offers when the app registered nothing. Module scope for a
 * stable identity (the hook memoises on it). One lonely option is the intended
 * signal: a theme switcher cannot know your themes, so pass `themes`.
 */
const FALLBACK_THEMES = ["default"] as const;

type ThemeSwitcherProps = {
  /**
   * The themes to offer, first entry being the app's default. Passed straight to
   * `useTheme`, so app-registered themes are both selectable and reported
   * correctly. Declare it at module scope: the hook memoises its snapshot reader
   * on the array's identity.
   *
   * Effectively required in a real app. Omitted, the switcher offers only
   * `default`, because this package does not know your themes and will not guess.
   */
  themes?: readonly string[];
  /**
   * Option text, keyed by theme id. A theme with no entry is labelled by its id,
   * so `aurora` reads as "aurora" until you name it.
   */
  labels?: ThemeSwitcherLabels;
} & Omit<ComponentPropsWithRef<"div">, "children">;

export const ThemeSwitcher = forwardRef<HTMLDivElement, ThemeSwitcherProps>(function ThemeSwitcher(
  { themes: themesProp, labels, className, ...props },
  ref
) {
  const { theme, setTheme, themes } = useTheme({ themes: themesProp ?? FALLBACK_THEMES });

  const { getRovingProps, setFocusedIndex } = useRovingFocus({ orientation: "horizontal" });

  const selectedIndex = Math.max(0, themes.indexOf(theme));

  // Selection and focus are one state machine: a radiogroup's tab stop is its
  // checked option, and `setFocusedIndex` carries DOM focus with it whenever the
  // group already held focus. The hook's own `onKeyDown` is deliberately unused
  // — it moves focus without selecting, which would drift the tab stop away from
  // the checked option and leave the arrow keys doing nothing a radiogroup
  // promises.
  useEffect(() => {
    setFocusedIndex(selectedIndex);
  }, [selectedIndex, setFocusedIndex]);

  function handleKeyDown(e: KeyboardEvent) {
    const count = themes.length;
    if (count === 0) return;

    let next: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (selectedIndex + 1) % count;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (selectedIndex - 1 + count) % count;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    setTheme(themes[next]);
  }

  return (
    <div
      ref={ref}
      className={cn("theme-switcher", className)}
      role="radiogroup"
      aria-label="Theme"
      {...props}
    >
      {themes.map((t, i) => {
        const roving = getRovingProps(i);
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={theme === t}
            tabIndex={roving.tabIndex}
            ref={roving.ref}
            className={cn("theme-switcher__option", theme === t && "theme-switcher__option--active")}
            onKeyDown={handleKeyDown}
            onClick={() => setTheme(t)}
          >
            {labels?.[t] ?? DEFAULT_LABELS[t] ?? t}
          </button>
        );
      })}
    </div>
  );
});
