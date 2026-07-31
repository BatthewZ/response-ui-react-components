"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  type KeyboardEvent,
  useEffect,
} from "react";

import { useRovingFocus } from "../../hooks/use-roving-focus";
import { useTheme } from "../../hooks/use-theme";
import { cn, type SlotClassNames } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `ThemeSwitcher.css` is gone — everything it drew is here. Each constant is
 * one flat string literal because the docs and focus guards resolve hoisted
 * constants textually and a composed one would not resolve.
 *
 * The group's own gap and padding are `0.125rem`, which is what they always
 * were: this is a segmented control whose segments must read as sitting *in* a
 * well, and the responsive `r`-scale's smallest step is far too large for that
 * hairline. `gap-0.5`/`p-0.5` are the same `0.125rem` through `--spacing`.
 */
const groupClasses = "inline-flex gap-0.5 p-0.5 rounded-lg bg-surface-3 border border-border-default";

/**
 * No `bg-transparent` and no `border-none`: Preflight already gives every
 * `button` `background-color: transparent` and `border: 0 solid` (measured in
 * the compiled output, and `Button.tsx` has relied on exactly this all along),
 * so restating them would only add two utilities a caller's own `bg-*` and
 * `border-*` have to out-rank.
 *
 * **The hover wash is one rung of a ladder — well 3 / hover 2 / active 0 — and
 * it must stay a rung above the group's own fill or it is invisible.** Move
 * `bg-surface-3` on the group and `hover:bg-surface-2` here together, or the
 * hover state disappears into the well.
 *
 * The ring is inset, like the sibling segmented control (`.tabs-tab`): the
 * group pads its options by only that `0.125rem`, so an outset ring would sit
 * on the group border instead of on the segment that actually holds focus.
 *
 * `duration-fast` is `--DURATION-FAST` through Tailwind's
 * `--transition-duration-*` namespace; `--MOTION-EASE-SHIFT` is in no namespace
 * at all and has to be read as a custom property.
 */
const optionClasses =
  "px-r4 py-r6 rounded-md text-body-2 font-semibold text-fg-secondary cursor-pointer whitespace-nowrap transition-all duration-fast ease-[var(--MOTION-EASE-SHIFT)] hover:text-fg-primary hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus";

/**
 * Converted alongside the base rather than instead of it. A base declaration
 * moved into `@layer utilities` on its own starts beating the modifier that
 * qualifies it; both moved, `cn()`'s tailwind-merge resolves the pair at the
 * call site and the selected option keeps its ink. The hover wash still wins
 * over the selected fill, as it did in CSS — `hover:bg-surface-2` emits at
 * 0,2,0 against this 0,1,0, and tailwind-merge keys on the modifier so neither
 * drops the other.
 */
const optionActiveClasses = "theme-switcher__option--active text-fg-primary bg-surface-0 shadow-sm";

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
  /**
   * `item` addresses every option button, the selected one included. There is no
   * per-theme key: the switcher is driven by *your* theme ids, so a keyed object
   * would be a second place to list them.
   */
  classNames?: SlotClassNames<"item">;
} & Omit<ComponentPropsWithRef<"div">, "children">;

export const ThemeSwitcher = forwardRef<HTMLDivElement, ThemeSwitcherProps>(function ThemeSwitcher(
  { themes: themesProp, labels, classNames, className, ...props },
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
      className={cn("theme-switcher", groupClasses, className)}
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
            className={cn(
              "theme-switcher__option",
              optionClasses,
              theme === t && optionActiveClasses,
              classNames?.item
            )}
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
