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

import { Portal } from "./Portal";
import { Toast, type ToastVariant } from "./Toast";

type ToastOptions = {
  variant?: ToastVariant;
  title?: string;
  duration?: number;
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
  duration: number;
  dismissing: boolean;
};

/** Used only when `--MOTION-DURATION-EXIT` cannot be read (no token layer). */
const FALLBACK_EXIT_MS = 300;
const DEFAULT_DURATION_MS = 5000;
const MAX_VISIBLE = 5;

/**
 * How long a dismissing toast stays mounted, read from the theme rather than
 * frozen: shipped themes set `--MOTION-DURATION-EXIT` between 120ms and 350ms,
 * and a fixed wait truncates the exit animation of the slower ones.
 */
function readExitDurationMs(el: Element | null): number {
  if (!el) return FALLBACK_EXIT_MS;
  const raw = getComputedStyle(el).getPropertyValue("--MOTION-DURATION-EXIT").trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return FALLBACK_EXIT_MS;
  return raw.endsWith("ms") ? value : value * 1000;
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

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
        schedule(`${id}:remove`, readExitDurationMs(containerRef.current), () => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        });
      } else if (entry.duration > 0) {
        schedule(`${id}:auto`, entry.duration, () => {
          setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)));
        });
      }
    }
  }, [toasts]);

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
          className="fixed bottom-r4 right-r4 z-50 flex flex-col gap-r5 pointer-events-none"
          // Mounted for the provider's whole life so a toast arrives as a change
          // *inside* an existing region — the only shape screen readers announce.
          aria-live="polite"
        >
          {toasts.map((t) => (
            <Toast
              key={t.id}
              variant={t.variant}
              title={t.title}
              dismissing={t.dismissing}
              onDismiss={() => dismiss(t.id)}
              {...liveOverride(t.variant)}
            >
              {t.message}
            </Toast>
          ))}
        </div>
      </Portal>
    </ToastContext.Provider>
  );
}
