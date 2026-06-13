"use client";
import { type ComponentPropsWithRef, forwardRef, useEffect, useMemo, useRef } from "react";

import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";

type DrawerSide = "left" | "right" | "top" | "bottom";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
} & Omit<ComponentPropsWithRef<"dialog">, "open">;

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

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  return (
    <dialog ref={mergedRef} data-side={side} className={cn("drawer no-body-scroll", className)} {...props}>
      {children}
    </dialog>
  );
});
