import { type ComponentPropsWithRef, forwardRef } from "react";

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
        "focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-0 focus:border-border-focus",
        "disabled:bg-surface-3 disabled:cursor-not-allowed",
        "min-h-[6.25rem] resize-y",
        invalid && "border-status-error focus:ring-status-error",
        className
      )}
      {...props}
    />
  );
});
