"use client";
import { type ComponentPropsWithRef, forwardRef, type ReactNode, useEffect } from "react";

import { cn } from "../../util/style";

import { useFieldContext } from "./Field";

type FieldErrorProps = {
  children?: ReactNode;
} & Omit<ComponentPropsWithRef<"p">, "children">;

export const FieldError = forwardRef<HTMLParagraphElement, FieldErrorProps>(function FieldError(
  { children, className, id: idProp, ...props },
  ref
) {
  const field = useFieldContext();
  // Explicit children win; otherwise render the form/field-derived error.
  const content = children ?? field?.error;
  const id = idProp ?? field?.errorId;
  const mounted = Boolean(content);
  const registerError = field?.registerError;

  // The element that owns the id tells the Field which id exists, so a control's
  // `aria-describedby` follows the caller's `id` and disappears with the message
  // instead of pointing at an element that was never rendered.
  useEffect(() => {
    if (!mounted || !id || !registerError) return;
    return registerError(id);
  }, [mounted, id, registerError]);

  if (!content) return null;

  return (
    <p
      ref={ref}
      id={id}
      role="alert"
      className={cn("text-body-3 text-status-error", className)}
      {...props}
    >
      {content}
    </p>
  );
});
