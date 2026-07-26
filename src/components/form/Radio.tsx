"use client";
import { type ComponentPropsWithRef, forwardRef } from "react";

import { focusOutlineResetControl, focusRingControl } from "../../util/focus";
import { mergeProps } from "../../util/merge-props";
import { cn } from "../../util/style";

import { useFieldDescription } from "./Field";

type RadioProps = Omit<ComponentPropsWithRef<"input">, "type">;

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, ...props },
  ref
) {
  // Description only, and no `error` prop to force the other half: ARIA 1.2
  // lists `aria-invalid` under `radiogroup` and not under `radio`, so the
  // invalid state belongs on the group container the caller owns. Checkbox is
  // the mirror case — `checkbox` does support it, so Checkbox carries both.
  const ariaProps = useFieldDescription();
  return (
    <input
      ref={ref}
      type="radio"
      className={cn(
        "size-4 accent-accent",
        focusOutlineResetControl,
        focusRingControl,
        className
      )}
      {...mergeProps(props, ariaProps)}
    />
  );
});
