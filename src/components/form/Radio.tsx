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
      // `appearance-none` is what makes the focus ring round: an engine paints a
      // native radio's decorations itself and ignores an author `border-radius`,
      // so the ring — a `box-shadow` — came out square around the circle. Taking
      // the painting over costs the UA's dot, which `Radio.css` puts back, and
      // `accent-accent`, which is a no-op once nothing native is drawn.
      className={cn(
        "radio size-4 appearance-none rounded-full",
        "border border-border-strong bg-surface-0 checked:border-accent",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        focusOutlineResetControl,
        focusRingControl,
        className
      )}
      {...mergeProps(props, ariaProps)}
    />
  );
});
