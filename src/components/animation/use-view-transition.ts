"use client";
import { useCallback } from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";

/**
 * `useViewTransition(navigate)` wraps any navigation function so that the
 * navigation runs inside `document.startViewTransition()` when the browser
 * supports it. Pass your router's navigate function (e.g. `useNavigate()`
 * from react-router-dom):
 *
 *     const navigate = useNavigate();
 *     const transition = useViewTransition(navigate);
 *     transition("/dashboard");
 *
 * Whatever `navigate` returns is awaited, so an async router's navigation
 * completes before the browser snapshots the new state.
 *
 * Under `prefers-reduced-motion: reduce` the transition is skipped entirely and
 * `navigate` is called directly — no page cross-fade, and no morph of any
 * `<ViewTransition name="…">` group either.
 *
 * It lives in its own module so `ViewTransition` — which holds no state and
 * reads no browser API — does not have to be a client component.
 */
export function useViewTransition<TArgs extends unknown[]>(
  navigate: (...args: TArgs) => unknown,
): (...args: TArgs) => void {
  const reducedMotion = usePrefersReducedMotion();

  return useCallback(
    (...args: TArgs) => {
      if (reducedMotion || typeof document.startViewTransition !== "function") {
        void navigate(...args);
        return;
      }
      document.startViewTransition(async () => {
        // Returning the promise is what makes `startViewTransition` wait: it
        // captures the "new" snapshot only after this callback settles.
        await navigate(...args);
      });
    },
    [navigate, reducedMotion],
  );
}
