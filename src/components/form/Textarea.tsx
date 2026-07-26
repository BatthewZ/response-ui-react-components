import { type ComponentPropsWithRef, forwardRef } from "react";

import {
  focusOutlineResetControl,
  focusRingControl,
  focusRingControlError,
} from "../../util/focus";
import { cn } from "../../util/style";

import { useFieldError } from "./Field";

type TextareaProps = {
  error?: boolean;
} & ComponentPropsWithRef<"textarea">;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, className, ...props },
  ref
) {
  const { invalid, ariaProps } = useFieldError(error);
  return (
    <textarea
      ref={ref}
      {...ariaProps}
      className={cn(
        "w-full px-r4 py-r5 text-body-2 text-fg-primary",
        "bg-surface-0 border border-border-strong rounded-md",
        "placeholder:text-fg-muted",
        "duration-fast",
        focusOutlineResetControl,
        focusRingControl,
        "disabled:bg-surface-3 disabled:cursor-not-allowed",
        "min-h-[6.25rem] resize-y",
        invalid && focusRingControlError,
        className
      )}
      {...props}
    />
  );
});
