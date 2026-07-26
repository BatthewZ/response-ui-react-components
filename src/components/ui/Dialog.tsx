"use client";
import { type ComponentPropsWithRef, forwardRef, useEffect, useMemo, useRef } from "react";

import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";

type DialogProps = {
  open: boolean;
  /**
   * Called whenever the element closes or asks to — Escape, and any close the
   * element performs itself (`<form method="dialog">`, `ref.close()`). It
   * replaces the native `onClose` rather than sitting alongside it.
   */
  onClose: () => void;
} & Omit<ComponentPropsWithRef<"dialog">, "open" | "onClose">;

export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(function Dialog(
  { open, onClose, className, children, ...props },
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

  return (
    <dialog
      ref={mergedRef}
      className={cn(
        // `motion-reduce:` guards the utility: the CSS package's reduced-motion
        // block covers the `.fade-in` class, not the `animate-fade-in` utility.
        "no-body-scroll bg-surface-0 rounded-lg shadow-lg p-r2 animate-fade-in motion-reduce:animate-none max-w-[40rem] w-full m-auto",
        // Same scrim contract Drawer.css and CommandPalette.css read, fallback
        // included, so a theme that retunes the scrim retunes this one too.
        "backdrop:bg-[var(--OVERLAY-SCRIM-COLOR,rgb(0_0_0_/_0.5))]",
        className
      )}
      {...props}
    >
      {children}
    </dialog>
  );
});
