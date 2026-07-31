"use client";
import { ChevronDown } from "lucide-react";
import { type ComponentPropsWithRef, forwardRef } from "react";

import {
  focusOutlineResetControl,
  focusRingControl,
  focusRingControlError,
} from "../../util/focus";
import { mergeProps } from "../../util/merge-props";
import { cn, type SlotClassNames } from "../../util/style";

import { useFieldError } from "./Field";

type SelectProps = {
  error?: boolean;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * `<select>` itself — the element every other prop and the `ref` address — so
   * the outer positioning box and the chevron are the two elements no caller can
   * otherwise reach. The union is written out here so an unknown key is a type
   * error rather than a silently ignored one.
   *
   * `control` is the framing box, the same word `DatePicker`, `DateRangePicker`
   * and `MultiSelect` spend on the same element (`SLOT-VOCABULARY.md` §6, §7.1).
   * It is a slot rather than a re-pointed `className` because moving a
   * documented `className` target is breaking and is the owner's call, not a
   * lane's (`PHASE3-PATTERN.md` §7).
   */
  classNames?: SlotClassNames<"control" | "chevron">;
} & ComponentPropsWithRef<"select">;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { error, className, classNames, ...props },
  ref
) {
  const { invalid, ariaProps } = useFieldError(error);
  return (
    // `appearance-none` strips the UA arrow, so the chevron is the only "I am a
    // dropdown" cue there is. It used to be a data-URI background whose
    // `fill="currentColor"` cannot resolve in an SVG-as-image — it painted
    // black on every theme (1.06:1 on `tech`). A real element inherits the
    // themed text colour instead.
    <div className={cn("relative", classNames?.control)}>
      <select
        ref={ref}
        className={cn(
          "w-full px-r4 py-r5 text-body-2 text-fg-primary",
          "bg-surface-0 border border-border-strong rounded-md",
          "duration-fast",
          focusOutlineResetControl,
          focusRingControl,
          "disabled:bg-surface-3 disabled:cursor-not-allowed",
          // The chevron's gutter is `r1`, the same rung DatePicker reserves for
          // its icon cluster. It used to be `pr-10` — a frozen 2.5rem on
          // Tailwind's *default* scale rather than the `r`-scale every other
          // padding here sits on, so it never stepped up at 40rem and left only
          // 4px between the text and the chevron on desktop.
          //
          // `r1` is the smallest rung that clears `right-r4` + the glyph's 16px
          // at both steps (8px spare below 40rem, 60px above it). `r2` is
          // 1.25rem on a phone and would run under the chevron. The 60px is
          // more than the graphic needs and is the price of staying on the
          // scale; a composed `calc()` of two rungs fits better but resolves to
          // no single token, so `scripts/verify-component-docs.mjs` cannot
          // check the doc row that claims it.
          "appearance-none pr-r1",
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
        className={cn(
          "pointer-events-none absolute right-r4 top-1/2 -translate-y-1/2 text-fg-secondary",
          classNames?.chevron
        )}
      />
    </div>
  );
});
