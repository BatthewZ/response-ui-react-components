import { type ComponentPropsWithRef, forwardRef, useCallback, useMemo, useRef } from "react";

import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";

import { IconButton } from "./IconButton";

export type ToastVariant = "success" | "warning" | "error" | "info";

// `motion-reduce:animate-none` is carried here because the CSS package guards
// the `.fade-*`/`.slide-*` *classes*, not the `animate-*` utilities that read
// the same keyframes through a Tailwind theme variable.
const baseClasses =
  "flex items-start gap-r5 rounded-md p-r4 text-body-2 shadow-lg border w-80 pointer-events-auto motion-reduce:animate-none";

const variantClassMap: Record<ToastVariant, string> = {
  success: "bg-status-success-bg text-status-success border-status-success/20",
  warning: "bg-status-warning-bg text-status-warning border-status-warning/20",
  error: "bg-status-error-bg text-status-error border-status-error/20",
  info: "bg-status-info-bg text-status-info border-status-info/20",
};

const ariaMap: Record<
  ToastVariant,
  { role: "status" | "alert"; "aria-live": "polite" | "assertive" }
> = {
  success: { role: "status", "aria-live": "polite" },
  warning: { role: "status", "aria-live": "polite" },
  info: { role: "status", "aria-live": "polite" },
  error: { role: "alert", "aria-live": "assertive" },
};

type ToastProps = {
  variant?: ToastVariant;
  title?: string;
  onDismiss: () => void;
  dismissing?: boolean;
} & Omit<ComponentPropsWithRef<"div">, "title">;

export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(
  { variant = "info", title, onDismiss, dismissing = false, className, children, onFocus, ...props },
  ref
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMemo(() => mergeRefs(ref, rootRef), [ref]);
  // Where focus was before it entered the toast. Dismissing unmounts the button
  // that holds focus, and without somewhere to put it the browser drops it on
  // `<body>` — a keyboard user loses their place in the page.
  const restoreRef = useRef<HTMLElement | null>(null);

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const from = e.relatedTarget as HTMLElement | null;
      if (!e.currentTarget.contains(from)) {
        restoreRef.current = from;
      }
      onFocus?.(e);
    },
    [onFocus]
  );

  const handleDismiss = useCallback(() => {
    const restore = restoreRef.current;
    // Move focus *before* the unmount, so removal never sees a focused subtree.
    if (restore?.isConnected && rootRef.current?.contains(document.activeElement)) {
      restore.focus();
    }
    onDismiss();
  }, [onDismiss]);

  return (
    <div
      ref={mergedRef}
      onFocus={handleFocus}
      className={cn(
        baseClasses,
        variantClassMap[variant],
        dismissing ? "animate-slide-out-right" : "animate-slide-in-right",
        className
      )}
      {...ariaMap[variant]}
      {...props}
    >
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <p>{children}</p>
      </div>
      <IconButton aria-label="Dismiss" onClick={handleDismiss} className="shrink-0 -mr-r6 -mt-r6">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </IconButton>
    </div>
  );
});
