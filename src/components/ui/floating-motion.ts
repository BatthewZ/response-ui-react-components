"use client";
import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";

/**
 * Fade timing for the floating surfaces (Popover, HoverCard, the menus), read
 * from the theme instead of frozen in the `.tsx`.
 *
 * These panels transition through `useTransitionStyles`, which writes
 * `transition-duration` *inline* — and an inline declaration outranks every
 * stylesheet rule, so the value cannot be supplied from CSS while that hook
 * owns it. It is read here the way `ToastContext` reads `--MOTION-DURATION-EXIT`
 * for the same reason: a theme owns its tempo, and a literal ignores it. The
 * spread is real, not theoretical — across the themes measured here the values
 * run 120ms to 500ms, and a consumer theme may sit anywhere.
 */

/** Used only when the tokens cannot be read (no token layer, or SSR). */
export const FLOATING_FADE_FALLBACK_MS = 150;

const FALLBACK_FADE = {
  open: FLOATING_FADE_FALLBACK_MS,
  close: FLOATING_FADE_FALLBACK_MS,
};
const NO_FADE = { open: 0, close: 0 };

/**
 * One `--MOTION-DURATION-*` token in milliseconds. `getComputedStyle` hands
 * back the authored string, so `0.2s` and `200ms` both have to resolve.
 */
export function readMotionDurationMs(property: string, fallbackMs: number): number {
  if (typeof document === "undefined") return fallbackMs;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return fallbackMs;
  return raw.endsWith("ms") ? value : value * 1000;
}

/**
 * The `duration` a floating panel's fade should use.
 *
 * `0` under `prefers-reduced-motion: reduce`, which removes the fade *and* the
 * delayed unmount, since both are sized from this number.
 *
 * The tokens are re-read whenever `open` changes, so switching theme at runtime
 * (this package ships a `ThemeSwitcher`) reaches the next open. The read is an
 * effect, so the first open after a theme change still begins on the previous
 * theme's value.
 */
export function useFadeDuration(open: boolean): { open: number; close: number } {
  const reducedMotion = usePrefersReducedMotion();
  const [fade, setFade] = useState(FALLBACK_FADE);

  useEffect(() => {
    setFade({
      open: readMotionDurationMs("--MOTION-DURATION-ENTER", FLOATING_FADE_FALLBACK_MS),
      close: readMotionDurationMs("--MOTION-DURATION-EXIT", FLOATING_FADE_FALLBACK_MS),
    });
  }, [open]);

  return reducedMotion ? NO_FADE : fade;
}
