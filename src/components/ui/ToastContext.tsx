"use client";
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";
import { cn, type SlotClassNames } from "../../util/style";

import { Portal } from "./Portal";
import { Toast, type ToastVariant } from "./Toast";

type ToastOptions = {
  variant?: ToastVariant;
  title?: string;
  duration?: number;
  /** Overrides the variant's visually-hidden severity word. See `Toast`. */
  statusLabel?: string;
  /**
   * Overrides the variant's decorative severity glyph; `null` drops it. Reaches
   * the queue for the same reason `statusLabel` does — an override the primary
   * entry point cannot get to is not an override path. See `Toast`.
   */
  statusIcon?: ReactNode;
  /**
   * Overrides the dismiss button's accessible name. Reaches the queue for the
   * same reason `statusLabel` does — an override the primary entry point cannot
   * get to is not an override path. See `Toast`.
   */
  dismissLabel?: string;
};

type ToastApi = {
  toast: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

type ToastEntry = {
  id: string;
  message: string;
  variant: ToastVariant;
  title?: string;
  statusLabel?: string;
  statusIcon?: ReactNode;
  dismissLabel?: string;
  duration: number;
  dismissing: boolean;
};

/** Used only when the motion tokens cannot be read (no token layer). */
const FALLBACK_EXIT_MS = 300;
const FALLBACK_COLLAPSE_MS = 400;
const DEFAULT_DURATION_MS = 5000;
const MAX_VISIBLE = 5;

/**
 * The stack item. It is what makes the toasts above a dismissing one *glide*
 * down into its place instead of snapping there the moment it unmounts: the
 * card's slide-out empties the row but leaves it standing, so this collapses it
 * — `grid-template-rows` 1fr to 0fr, plus a negative margin that swallows the
 * list's `gap-r5` above it, which the row height alone would leave behind.
 * `delay` is the exit duration, so the collapse starts on an already
 * faded-out card and the two read as one gesture rather than fighting.
 *
 * `min-h-0` is what lets the track reach zero: a grid item's automatic minimum
 * size otherwise floors it at min-content. `Collapsible` spells that same thing
 * `overflow-hidden`, which here would clip the card's `shadow-lg` and cut the
 * slide-out off at the edge of the stack.
 *
 * The collapsed track is variant-scoped so it wins on specificity (0,2,0)
 * rather than on where Tailwind sorts it against the base's 0,1,0 — the same
 * reason `Collapsible` scopes its open track.
 *
 * `motion-safe:` is load-bearing, not decoration. The card carries
 * `motion-reduce:animate-none`, so under reduced motion it never fades, and
 * collapsing the row under a still-solid toast would drag it across the stack.
 * That branch keeps the pre-collapse behaviour, and `readRemovalDelayMs` drops
 * the collapse from its wait to match.
 */
const itemClasses =
  "grid grid-rows-[1fr] transition-[grid-template-rows,margin-top] duration-[var(--MOTION-DURATION-SHIFT)] delay-[var(--MOTION-DURATION-EXIT)] ease-[var(--MOTION-EASE-SHIFT)] motion-safe:data-[dismissing]:grid-rows-[0fr] motion-safe:data-[dismissing]:-mt-r5";

function readDurationMs(el: Element, token: string, fallback: number): number {
  const raw = getComputedStyle(el).getPropertyValue(token).trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return fallback;
  return raw.endsWith("ms") ? value : value * 1000;
}

/**
 * How long a dismissing toast stays mounted, read from the theme rather than
 * frozen: a theme owns these durations, and a fixed wait truncates the exit of
 * any theme slower than the guess. Across the themes measured here the exit
 * alone ranges 120ms to 350ms; a consumer theme may set anything.
 *
 * Two phases, in the order `itemClasses` plays them: the card's slide-out
 * (`--MOTION-DURATION-EXIT`), then the row collapse that closes the gap it left
 * (`--MOTION-DURATION-SHIFT`, the token `Collapsible` animates on too). Under
 * reduced motion there is no collapse to wait for — waiting anyway would only
 * hold a finished toast in the DOM.
 */
function readRemovalDelayMs(el: Element | null, reducedMotion: boolean): number {
  if (!el) return reducedMotion ? FALLBACK_EXIT_MS : FALLBACK_EXIT_MS + FALLBACK_COLLAPSE_MS;
  const exit = readDurationMs(el, "--MOTION-DURATION-EXIT", FALLBACK_EXIT_MS);
  if (reducedMotion) return exit;
  return exit + readDurationMs(el, "--MOTION-DURATION-SHIFT", FALLBACK_COLLAPSE_MS);
}

let idSequence = 0;

/**
 * `crypto.randomUUID` exists only in a secure context — on plain http it is
 * `undefined` and calling it throws, taking every `toast()` with it. The
 * counter needs only per-document uniqueness, which it has outright.
 */
function createToastId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  idSequence += 1;
  return `toast-${idSequence.toString(36)}`;
}

/**
 * Live semantics belong to the always-mounted container, not to the toast: a
 * live region inserted with its message already inside it is not announced.
 * `error` is the exception — `role="alert"` on insertion is the one case screen
 * readers do special-case, and it is the only variant that must interrupt.
 */
function liveOverride(
  variant: ToastVariant
): Pick<ComponentPropsWithRef<"div">, "role" | "aria-live"> {
  return variant === "error" ? {} : { role: undefined, "aria-live": undefined };
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

export type ToastProviderProps = {
  children: ReactNode;
  /**
   * Class overrides for the stack this provider renders. It takes no
   * `className`: the provider wraps the whole app and renders `children`
   * untouched beside a portalled container, so there is no outermost element for
   * one to land on.
   *
   * `list` is that container — the always-mounted live region every toast is
   * inserted into. It positions the stack, so this is the route to moving toasts
   * to another corner. Its `aria-live` and its mounting are not negotiable: a
   * live region inserted with its message already inside is not announced.
   *
   * `item` is the collapsing wrapper around each toast. It is the route to the
   * spacing *between* toasts, which `list`'s `gap-r5` sets but this one takes
   * back down as a toast leaves — so a gap changed on `list` alone is a gap that
   * no longer closes smoothly.
   */
  classNames?: SlotClassNames<"list" | "item">;
};

export function ToastProvider({ children, classNames }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)));
  }, []);

  const dismissAll = useCallback(() => {
    // Marks only what is on screen now. A blanket `setToasts([])` on a timer
    // deletes anything queued while the exit animation was running.
    setToasts((prev) => prev.map((t) => ({ ...t, dismissing: true })));
  }, []);

  const toast = useCallback((message: string, options?: ToastOptions) => {
    const id = createToastId();
    const entry: ToastEntry = {
      id,
      message,
      variant: options?.variant ?? "info",
      title: options?.title,
      statusLabel: options?.statusLabel,
      statusIcon: options?.statusIcon,
      dismissLabel: options?.dismissLabel,
      duration: options?.duration ?? DEFAULT_DURATION_MS,
      dismissing: false,
    };

    setToasts((prev) => {
      const next = [entry, ...prev];
      const visible = next.filter((t) => !t.dismissing);
      if (visible.length <= MAX_VISIBLE) return next;
      // Evict the oldest by marking it, in the same pure update — scheduling a
      // side effect inside an updater double-fires under StrictMode.
      const oldest = visible[visible.length - 1];
      return next.map((t) => (t.id === oldest.id ? { ...t, dismissing: true } : t));
    });

    return id;
  }, []);

  // Timers are derived from state, never scheduled from inside an updater or a
  // callback, so every one of them is in `timersRef` and dies on unmount.
  useEffect(() => {
    const timers = timersRef.current;

    const clear = (key: string) => {
      const timer = timers.get(key);
      if (timer === undefined) return;
      clearTimeout(timer);
      timers.delete(key);
    };

    const schedule = (key: string, ms: number, run: () => void) => {
      if (timers.has(key)) return;
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          run();
        }, ms)
      );
    };

    for (const entry of toasts) {
      const { id } = entry;
      if (entry.dismissing) {
        clear(`${id}:auto`);
        schedule(`${id}:remove`, readRemovalDelayMs(containerRef.current, reducedMotion), () => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        });
      } else if (entry.duration > 0) {
        schedule(`${id}:auto`, entry.duration, () => {
          setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)));
        });
      }
    }
  }, [toasts, reducedMotion]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const [, timer] of timers) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ toast, dismiss, dismissAll }),
    [toast, dismiss, dismissAll]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Portal>
        <div
          ref={containerRef}
          className={cn(
            "fixed bottom-r4 right-r4 z-50 flex flex-col gap-r5 pointer-events-none",
            classNames?.list
          )}
          // Mounted for the provider's whole life so a toast arrives as a change
          // *inside* an existing region — the only shape screen readers announce.
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              data-dismissing={t.dismissing || undefined}
              className={cn(itemClasses, classNames?.item)}
            >
              <div
                // slot:(a) the shrinker, and the class is the whole of it:
                // `min-h-0` is what lets the row above collapse to zero.
                // Varying it is not a restyle — it is the glide-down not
                // happening.
                className="min-h-0"
              >
                <Toast
                  variant={t.variant}
                  title={t.title}
                  statusLabel={t.statusLabel}
                  statusIcon={t.statusIcon}
                  dismissLabel={t.dismissLabel}
                  dismissing={t.dismissing}
                  onDismiss={() => dismiss(t.id)}
                  {...liveOverride(t.variant)}
                >
                  {t.message}
                </Toast>
              </div>
            </div>
          ))}
        </div>
      </Portal>
    </ToastContext.Provider>
  );
}
