"use client";
import { type ComponentPropsWithRef, forwardRef, useEffect, useMemo, useRef } from "react";

import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";

type DialogProps = {
  open: boolean;
  onClose: () => void;
} & Omit<ComponentPropsWithRef<"dialog">, "open">;

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

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={mergedRef}
      className={cn(
        "no-body-scroll bg-surface-0 rounded-lg shadow-lg p-r2 animate-fade-in max-w-[40rem] w-full m-auto",
        "backdrop:bg-black/50",
        className
      )}
      {...props}
    >
      {children}
    </dialog>
  );
});
