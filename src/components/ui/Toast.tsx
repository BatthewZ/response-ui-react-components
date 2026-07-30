import {
  type ComponentPropsWithRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";

import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";

import { IconButton } from "./IconButton";

export type ToastVariant = "success" | "warning" | "error" | "info";

// `motion-reduce:animate-none` is carried here because the CSS package guards
// the `.fade-*`/`.slide-*` *classes*, not the `animate-*` utilities that read
// the same keyframes through a Tailwind theme variable.
const baseClasses =
  "flex items-start gap-r5 rounded-md p-r4 text-body-2 shadow-lg border w-80 pointer-events-auto motion-reduce:animate-none";

/**
 * Centres a fixed-size control on the message's *first* line rather than on the
 * row's top edge or on the whole block. `items-start` alone starts a 16px glyph
 * at the content top while the first line box is a whole `text-body-2` leading
 * tall, so the glyph reads high and the taller dismiss button reads low — two
 * different wrongs, visible as the icon and the ✕ sitting at different heights.
 * `1lh` *is* that leading, so this tracks the theme (which moves it by a third)
 * and the breakpoint with no second copy of the number, and the icon still stays
 * on the first line when the message wraps.
 */
const firstLineClasses = "flex h-[1lh] shrink-0 items-center";

/**
 * `IconButton`'s hover and active are the neutral surface steps — right on a
 * neutral surface, wrong on all four of these, where they flash a patch of the
 * page's greys over a tinted card. Same problem `Button`'s `ghost-inverse`
 * exists to solve, answered the same way: the surrounding ink at a low alpha.
 *
 * `text-current` is what makes that work and is not itself visible. It resolves
 * to `inherit`, handing the button the variant's `text-status-*`, which is what
 * `bg-current` then tints with — so one string covers every variant and every
 * consumer theme without naming one. The glyph takes `text-fg-secondary` back
 * on the `<svg>`, because measured across the four example themes the neutral
 * mark holds 6.9–7.3:1 on these tints where the variant ink would hold 3.1–4.8.
 *
 * Alphas are the measured ceiling, not a guess: at `/20` the mark falls to
 * 3.09:1 in one theme, inside the rounding of the 3:1 floor for a graphical
 * object. `/10` and `/15` keep the worst case at 3.87 and 3.48.
 */
const dismissClasses = "text-current hover:bg-current/10 active:bg-current/15";

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

/** Announced ahead of the message; the tint is the only other severity channel. */
const statusLabelMap: Record<ToastVariant, string> = {
  success: "Success",
  warning: "Warning",
  error: "Error",
  info: "Information",
};

/**
 * The severity's *visible* channel, and the twin of `statusLabelMap` above.
 * Decorative on purpose: `statusLabel` already announces the severity into the
 * live region, so a named glyph would announce it a second time. Drawn in
 * `currentColor`, which is the variant's own `text-status-*` ink.
 */
const statusIconMap: Record<ToastVariant, ReactNode> = {
  success: <CircleCheck size={16} aria-hidden="true" className="shrink-0" />,
  warning: <TriangleAlert size={16} aria-hidden="true" className="shrink-0" />,
  error: <CircleX size={16} aria-hidden="true" className="shrink-0" />,
  info: <Info size={16} aria-hidden="true" className="shrink-0" />,
};

/** The dismiss button's name when the caller supplies none. */
const DEFAULT_DISMISS_LABEL = "Dismiss";

type ToastProps = {
  variant?: ToastVariant;
  title?: string;
  onDismiss: () => void;
  dismissing?: boolean;
  /**
   * Visually-hidden severity word, read ahead of the title and the message.
   * `""` drops it, for a message that already names its own severity.
   */
  statusLabel?: string;
  /**
   * Decorative glyph for the severity, drawn before the title. `null` drops it
   * — the `statusLabel=""` of the visual channel. Anything you pass here must
   * be `aria-hidden`, or the severity is announced twice.
   */
  statusIcon?: ReactNode;
  /**
   * Accessible name of the dismiss button. Unlike `statusLabel` this is not
   * removable: the button's only content is an `aria-hidden` glyph, so an empty
   * name would leave it unnamed rather than quieter.
   */
  dismissLabel?: string;
} & Omit<ComponentPropsWithRef<"div">, "title">;

export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(
  {
    variant = "info",
    title,
    onDismiss,
    dismissing = false,
    statusLabel,
    statusIcon,
    dismissLabel,
    className,
    children,
    onFocus,
    ...props
  },
  ref
) {
  const statusText = statusLabel ?? statusLabelMap[variant];
  // Not `??`: `null` is this prop's remover, and `??` would treat it as absent
  // and restore the default — the mirror of `statusLabel=""` surviving `??`.
  const icon = statusIcon === undefined ? statusIconMap[variant] : statusIcon;
  // `||` rather than `??`: an empty string here would ship a button with no
  // accessible name at all, which is worse than the English default.
  const dismissText = dismissLabel || DEFAULT_DISMISS_LABEL;
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
      {icon && <span className={firstLineClasses}>{icon}</span>}
      <div className="flex-1 min-w-0">
        {statusText && <span className="sr-only">{statusText}</span>}
        {title && <p className="font-semibold">{title}</p>}
        <p>{children}</p>
      </div>
      {/* The button is taller than one line; centring it overflows into the
          card's own padding rather than growing the toast past its text. */}
      <span className={firstLineClasses}>
        <IconButton
          aria-label={dismissText}
          onClick={handleDismiss}
          className={cn("shrink-0 -mr-r6", dismissClasses)}
        >
          <svg
            className="text-fg-secondary"
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
      </span>
    </div>
  );
});
