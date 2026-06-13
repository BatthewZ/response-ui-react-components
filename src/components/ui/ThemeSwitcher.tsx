"use client";
import { type ComponentPropsWithRef, forwardRef } from "react";

import { type Theme, useTheme } from "../../hooks/use-theme";
import { cn } from "../../util/style";

type ThemeSwitcherProps = Omit<ComponentPropsWithRef<"div">, "children">;

const LABELS: Record<Theme, string> = {
  default: "Default",
  events: "Events",
  grimdark: "Grimdark",
  tech: "Tech",
};

export const ThemeSwitcher = forwardRef<HTMLDivElement, ThemeSwitcherProps>(function ThemeSwitcher(
  { className, ...props },
  ref
) {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div
      ref={ref}
      className={cn("theme-switcher", className)}
      role="radiogroup"
      aria-label="Theme"
      {...props}
    >
      {themes.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          className={cn("theme-switcher__option", theme === t && "theme-switcher__option--active")}
          onClick={() => setTheme(t)}
        >
          {LABELS[t]}
        </button>
      ))}
    </div>
  );
});
