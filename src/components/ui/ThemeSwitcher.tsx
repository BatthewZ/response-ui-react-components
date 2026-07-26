"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  type KeyboardEvent,
  useEffect,
  useRef,
} from "react";

import { useRovingFocus } from "../../hooks/use-roving-focus";
import { type Theme, THEMES, useTheme } from "../../hooks/use-theme";
import { cn } from "../../util/style";

/** Option text, keyed by theme id. A theme with no entry is labelled by its id. */
export type ThemeSwitcherLabels = Partial<Record<string, string>>;

const DEFAULT_LABELS: ThemeSwitcherLabels = {
  default: "Default",
  events: "Events",
  grimdark: "Grimdark",
  tech: "Tech",
} satisfies Record<Theme, string>;

type ThemeSwitcherProps = {
  /**
   * The themes to offer, first entry being the app's default. Passed straight to
   * `useTheme`, so app-registered themes are both selectable and reported
   * correctly. Declare it at module scope: the hook memoises its snapshot reader
   * on the array's identity.
   */
  themes?: readonly string[];
  /** Option text, keyed by theme id. Defaults to the English names above. */
  labels?: ThemeSwitcherLabels;
} & Omit<ComponentPropsWithRef<"div">, "children">;

export const ThemeSwitcher = forwardRef<HTMLDivElement, ThemeSwitcherProps>(function ThemeSwitcher(
  { themes: themesProp, labels, className, ...props },
  ref
) {
  const { theme, setTheme, themes } = useTheme({ themes: themesProp ?? THEMES });

  const { getRovingProps, setFocusedIndex } = useRovingFocus({ orientation: "horizontal" });
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = Math.max(0, themes.indexOf(theme));

  // Selection and focus are one state machine: a radiogroup's tab stop is its
  // checked option, and DOM focus follows selection whenever the group already
  // held focus. The hook's own `onKeyDown` is deliberately unused — it moves
  // focus without selecting, which would drift the tab stop away from the
  // checked option and leave the arrow keys doing nothing a radiogroup promises.
  useEffect(() => {
    setFocusedIndex(selectedIndex);
    const buttons = buttonsRef.current;
    const active = document.activeElement;
    if (active instanceof HTMLButtonElement && buttons.includes(active)) {
      buttons[selectedIndex]?.focus();
    }
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
            ref={(node) => {
              roving.ref(node);
              buttonsRef.current[i] = node;
            }}
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
