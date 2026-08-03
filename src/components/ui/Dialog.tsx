"use client";
import { X } from "lucide-react";
import { type ComponentPropsWithRef, forwardRef, useEffect, useMemo, useRef } from "react";

import { useLightDismiss } from "../../hooks/use-light-dismiss";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";
import { IconButton } from "./IconButton";

/** The close control's name when the caller supplies none. */
const DEFAULT_CLOSE_LABEL = "Close";

type DialogProps = {
  open: boolean;
  /**
   * Called whenever the element closes or asks to — Escape, and any close the
   * element performs itself (`<form method="dialog">`, `ref.close()`). It
   * replaces the native `onClose` rather than sitting alongside it.
   */
  onClose: () => void;
  /**
   * Close on a press that both begins and ends outside the panel.
   *
   * Off by default, and the default is the decision: a modal that light-dismisses
   * is a modal a misplaced press can throw away, which is right for something you
   * are reading and wrong for a destructive confirmation or anything holding a
   * half-finished form. Escape is always wired; this is the pointer's equivalent,
   * and only the call site knows whether the panel can afford one.
   */
  lightDismiss?: boolean;
} & Omit<ComponentPropsWithRef<"dialog">, "open" | "onClose">;

export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(function Dialog(
  { open, onClose, lightDismiss = false, className, children, onPointerDown, onClick, ...props },
  forwardedRef
) {
  const innerRef = useRef<HTMLDialogElement>(null);
  const mergedRef = useMemo(() => mergeRefs(forwardedRef, innerRef), [forwardedRef]);

  useEffect(() => {
    const dialog = innerRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = innerRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    // The element can also close itself — `<form method="dialog">`, `ref.close()`,
    // light dismiss. Without this the DOM goes closed while `open` stays `true`,
    // and the next `open={true}` is a no-op the effect above never sees.
    const handleClose = () => {
      if (open) onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose, open]);

  const dismissHandlers = useLightDismiss({
    ref: innerRef,
    enabled: lightDismiss,
    onDismiss: onClose,
    onPointerDown,
    onClick,
  });

  return (
    <dialog
      ref={mergedRef}
      className={cn(
        // `motion-reduce:` guards the utility: the CSS package's reduced-motion
        // block covers the `.fade-in` class, not the `animate-fade-in` utility.
        "no-body-scroll bg-surface-0 rounded-lg shadow-lg p-r2 animate-fade-in motion-reduce:animate-none max-w-[40rem] w-full m-auto",
        // A column, so `DialogBody` can be the only part that scrolls and the
        // rest of the panel stays where the reader left it. Qualified by `open:`
        // because a `display` an author declares beats the user agent's
        // `dialog:not([open]) { display: none }` at any specificity — unqualified,
        // this one line would render every closed dialog in the library inline on
        // the page. The variant compiles to `:is([open], :popover-open, :open)`,
        // so a closed panel matches nothing here and the user agent still hides it.
        "open:flex open:flex-col",
        // Same scrim contract Drawer.css and CommandPalette.css read, fallback
        // included, so a theme that retunes the scrim retunes this one too.
        "backdrop:bg-[var(--OVERLAY-SCRIM-COLOR,rgb(0_0_0_/_0.5))]",
        className
      )}
      {...props}
      // After the spread, deliberately: a caller's `onClick` composes into these
      // rather than replacing them, so passing one cannot silently delete light
      // dismiss, and `preventDefault()` in it is the opt-out.
      {...dismissHandlers}
    >
      {children}
    </dialog>
  );
});

type DialogHeaderProps = {
  /**
   * Renders a close control at the end of the row. Omit it and the row is just a
   * row — the control is not free, and a panel that must be read to the end
   * (a licence, a destructive confirmation) is entitled to withhold it.
   */
  onClose?: () => void;
  /** The close control's accessible name. Its only content is a hidden glyph. */
  closeLabel?: string;
} & ComponentPropsWithRef<"div">;

/**
 * The row that stays put: a panel's title, and the way out of it.
 *
 * It exists because of what it does not do — shrink. Every child of the panel is
 * a flex item, and flex distributes a shortfall across all of them, so a header
 * beside an overlong body gets compressed and its text clipped rather than the
 * body scrolling. `shrink-0` here and on the footer is what leaves `DialogBody`
 * as the only part that gives.
 *
 * The close control belongs in this row rather than floating over the panel: a
 * reader on a phone meets a panel taller than the screen, and a dismissal at the
 * end of the content is one they have to go looking for — while `showModal()`
 * puts focus on the first focusable descendant, so the control that is first in
 * the DOM also decides where the panel opens.
 */
export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(function DialogHeader(
  { onClose, closeLabel, className, children, ...props },
  ref
) {
  // `||` rather than `??`: an empty string would ship a button with no accessible
  // name at all, which is worse than the English default.
  const label = closeLabel || DEFAULT_CLOSE_LABEL;

  return (
    <div
      ref={ref}
      className={cn("flex shrink-0 items-start justify-between gap-r5", className)}
      {...props}
    >
      {children}
      {onClose && (
        <IconButton type="button" aria-label={label} onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </IconButton>
      )}
    </div>
  );
});

/**
 * The one part of the panel that scrolls.
 *
 * `min-h-0` is the load-bearing half: a flex item's floor is its own content, so
 * without it the part grows to fit the content and pushes the panel past the
 * viewport instead of scrolling inside it. It carries no padding of its own —
 * the panel's `p-r2` is already the gutter, and a second one inside it reads as
 * a box within a box.
 *
 * `relative` is not decoration either. The library's visually-hidden text — a
 * badge's status word, a copy button's live region — is `position: absolute` with
 * no offsets, so with no positioned ancestor it resolves against the viewport,
 * escapes the clip and stretches the page to the height of content that is
 * scrolled out of sight.
 */
export const DialogBody = forwardRef<HTMLDivElement, ComponentPropsWithRef<"div">>(
  function DialogBody({ className, ...props }, ref) {
    return (
      <div ref={ref} className={cn("relative min-h-0 flex-1 overflow-y-auto", className)} {...props} />
    );
  }
);
