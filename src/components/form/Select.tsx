"use client";
import { ChevronDown } from "lucide-react";
import { type ComponentPropsWithRef, forwardRef } from "react";

import {
  focusOutlineResetControl,
  focusRingControl,
  focusRingControlError,
} from "../../util/focus";
import { mergeProps } from "../../util/merge-props";
import { cn } from "../../util/style";

import { useFieldError } from "./Field";

type SelectProps = {
  error?: boolean;
} & ComponentPropsWithRef<"select">;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { error, className, ...props },
  ref
) {
  const { invalid, ariaProps } = useFieldError(error);
  return (
    // `appearance-none` strips the UA arrow, so the chevron is the only "I am a
    // dropdown" cue there is. It used to be a data-URI background whose
    // `fill="currentColor"` cannot resolve in an SVG-as-image — it painted
    // black on every theme (1.06:1 on `tech`). A real element inherits the
    // themed text colour instead.
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "w-full px-r4 py-r5 text-body-2 text-fg-primary",
          "bg-surface-0 border border-border-strong rounded-md",
          "duration-fast",
          focusOutlineResetControl,
          focusRingControl,
          "disabled:bg-surface-3 disabled:cursor-not-allowed",
          "appearance-none pr-10",
          invalid && focusRingControlError,
          className
        )}
        // `field()` always emits the KEY `aria-invalid`, valued `undefined` when
        // the field is valid — a plain `{...props}` after `{...ariaProps}` would
        // therefore erase the state computed from `error`/Field. Merging keeps
        // ours where we have an opinion and the caller's where we do not.
        {...mergeProps(props, ariaProps)}
      />
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-r4 top-1/2 -translate-y-1/2 text-fg-secondary"
      />
    </div>
  );
});
