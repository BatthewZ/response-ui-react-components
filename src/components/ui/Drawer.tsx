"use client";
import { type ComponentPropsWithRef, forwardRef, useEffect, useMemo, useRef } from "react";

import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";

type DrawerSide = "left" | "right" | "top" | "bottom";

type DrawerProps = {
  open: boolean;
  /**
   * Called whenever the element closes or asks to — Escape, and any close the
   * element performs itself (`<form method="dialog">`, `ref.close()`). It
   * replaces the native `onClose` rather than sitting alongside it.
   */
  onClose: () => void;
  side?: DrawerSide;
} & Omit<ComponentPropsWithRef<"dialog">, "open" | "onClose">;

export const Drawer = forwardRef<HTMLDialogElement, DrawerProps>(function Drawer(
  { open, onClose, side = "right", className, children, ...props },
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
    <dialog ref={mergedRef} data-side={side} className={cn("drawer no-body-scroll", className)} {...props}>
      {children}
    </dialog>
  );
});
