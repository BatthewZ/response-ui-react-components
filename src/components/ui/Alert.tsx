import { type ComponentPropsWithRef, forwardRef, type ReactNode } from "react";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";

import { cn, type SlotClassNames } from "../../util/style";

type Variant = "success" | "warning" | "error" | "info";

const baseClasses = "flex gap-r5 rounded-md p-r4 text-body-2";

/**
 * Centres the glyph on the message's *first* line. A flex row starts a 16px
 * glyph at the content top while the first line box is a whole `text-body-2`
 * leading tall, so the glyph reads high — measured at 6px here before this
 * landed. `1lh` *is* that leading, so it tracks the theme (which moves it by a
 * third) and the breakpoint, and the glyph stays put when the message wraps.
 * Deliberately not hoisted next to `Toast`'s twin: the docs guard resolves a
 * component's utilities textually from its own file and `./` siblings.
 */
const firstLineClasses = "flex h-[1lh] shrink-0 items-center";

const variantClassMap: Record<Variant, string> = {
  success: "bg-status-success-bg text-status-success border border-status-success/20",
  warning: "bg-status-warning-bg text-status-warning border border-status-warning/20",
  error: "bg-status-error-bg text-status-error border border-status-error/20",
  info: "bg-status-info-bg text-status-info border border-status-info/20",
};

/**
 * `role="alert"` carries an implicit `aria-live="assertive"`, so pairing it
 * with `polite` was a contradiction the browser resolved in favour of the
 * explicit attribute — every variant, including `error`, announced politely.
 * Politeness follows severity instead, on the same table `Toast` uses.
 */
const ariaMap: Record<
  Variant,
  { role: "status" | "alert"; "aria-live": "polite" | "assertive" }
> = {
  success: { role: "status", "aria-live": "polite" },
  warning: { role: "status", "aria-live": "polite" },
  info: { role: "status", "aria-live": "polite" },
  error: { role: "alert", "aria-live": "assertive" },
};

/** Announced before the message; the tint is the only other severity channel. */
const statusLabelMap: Record<Variant, string> = {
  success: "Success",
  warning: "Warning",
  error: "Error",
  info: "Information",
};

/**
 * The severity's *visible* channel, and the twin of `statusLabelMap` above.
 * Decorative on purpose: `statusLabel` already announces the severity into the
 * live region, so a named glyph would announce it a second time. Drawn in
 * `currentColor`, which is the variant's own `text-status-*` ink — the same
 * pairing the message text already uses, so it introduces no new contrast.
 */
const statusIconMap: Record<Variant, ReactNode> = {
  success: (
    <CircleCheck
      size={16}
      aria-hidden="true"
      // slot:(a) default *content*, not an element the component owns —
      // `statusIcon` replaces the whole node, so a class route here would style
      // something the caller may have swapped out. `shrink-0` is the flex guard
      // that keeps the glyph its own size beside a long message.
      className="shrink-0"
    />
  ),
  warning: (
    <TriangleAlert
      size={16}
      aria-hidden="true"
      // slot:(a) as `success` above — replaceable content, and `shrink-0` is the
      // flex guard that keeps the glyph its own size beside a long message.
      className="shrink-0"
    />
  ),
  error: (
    <CircleX
      size={16}
      aria-hidden="true"
      // slot:(a) as `success` above — replaceable content, and `shrink-0` is the
      // flex guard that keeps the glyph its own size beside a long message.
      className="shrink-0"
    />
  ),
  info: (
    <Info
      size={16}
      aria-hidden="true"
      // slot:(a) as `success` above — replaceable content, and `shrink-0` is the
      // flex guard that keeps the glyph its own size beside a long message.
      className="shrink-0"
    />
  ),
};

type AlertProps = {
  variant?: Variant;
  /**
   * Visually-hidden severity word, read ahead of the message. `""` drops it,
   * for a message that already names its own severity.
   */
  statusLabel?: string;
  /**
   * Decorative glyph for the severity, drawn before the message. `null` drops
   * it — the `statusLabel=""` of the visual channel. Anything you pass here
   * must be `aria-hidden`, or the severity is announced twice.
   */
  statusIcon?: ReactNode;
  /**
   * `icon` addresses the glyph's first-line box, not the glyph — the glyph is
   * `statusIcon`, and a replacement brings its own classes.
   */
  classNames?: SlotClassNames<"icon">;
} & ComponentPropsWithRef<"div">;

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { variant = "info", statusLabel, statusIcon, classNames, className, children, ...props },
  ref
) {
  const statusText = statusLabel ?? statusLabelMap[variant];
  // Not `??`: `null` is this prop's remover, and `??` would treat it as absent
  // and restore the default — the mirror of `statusLabel=""` surviving `??`.
  const icon = statusIcon === undefined ? statusIconMap[variant] : statusIcon;

  return (
    <div
      ref={ref}
      className={cn(baseClasses, variantClassMap[variant], className)}
      {...ariaMap[variant]}
      {...props}
    >
      {statusText && (
        <span
          // slot:(a) the severity word, read ahead of the message. `sr-only` is
          // the whole mechanism — the tint is the visible channel — so a route
          // here lets a caller drop it and print "Error" above their own error
          // text. `statusLabel=""` is the supported remover.
          className="sr-only"
        >
          {statusText}
        </span>
      )}
      {icon && <span className={cn(firstLineClasses, classNames?.icon)}>{icon}</span>}
      {children}
    </div>
  );
});
