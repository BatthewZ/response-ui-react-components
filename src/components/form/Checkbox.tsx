"use client";
import { type ComponentPropsWithRef, forwardRef } from "react";

import { focusRingControl } from "../../util/focus";
import { mergeProps } from "../../util/merge-props";
import { cn } from "../../util/style";

import { useFieldErrorProps } from "./Field";

type CheckboxProps = {
  error?: boolean;
} & Omit<ComponentPropsWithRef<"input">, "type">;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { error, className, ...props },
  ref
) {
  const ariaProps = useFieldErrorProps(error);
  return (
    <input
      ref={ref}
      type="checkbox"
      // No resting `border-*`/`rounded-*`: without `appearance-none` the box is
      // the UA's own, and Firefox 146 and Chrome 144 both render one byte-for-byte
      // identically with and without them. `accent-color` and the box size are
      // the two things a native checkbox does honour.
      className={cn("size-4 accent-accent", focusRingControl, className)}
      // `field()` always emits the KEY `aria-invalid`, valued `undefined` when
      // the field is valid — a plain `{...props}` after `{...ariaProps}` would
      // therefore erase the state computed from `error`/Field. Merging keeps
      // ours where we have an opinion and the caller's where we do not.
      {...mergeProps(props, ariaProps)}
    />
  );
});
