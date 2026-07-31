"use client";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  forwardRef,
  useState,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { composeEventHandlers, mergeProps } from "../../util/merge-props";
import { cn, type SlotClassNames } from "../../util/style";

import { useFieldError } from "./Field";

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `RangeSlider.css` keeps the two `<input type="range">` overlays and says why;
 * the rail, the fill and the root are here. Each constant is one flat string
 * literal because `verify:component-docs` resolves hoisted constants textually
 * and a composed one would not resolve.
 */
const rootClasses = "relative flex items-center w-full h-5";

const trackClasses =
  "absolute left-0 right-0 h-2 rounded-full bg-surface-3";

/**
 * The selected segment. Its inset edges are read from `--range-lo` / `--range-hi`
 * on the root, which are written as an inline style — so they stay arbitrary
 * values here rather than becoming `left-*` / `right-*` scale steps.
 */
const fillClasses =
  "absolute left-[var(--range-lo,0%)] right-[var(--range-hi,0%)] h-2 rounded-full bg-accent";

/**
 * A `[low, high]` pair. The component orders it (`low <= high`) and opens it to
 * at least `minDistance` before rendering, so an out-of-order or too-close pair
 * from the caller is drawn and announced as the scale can actually hold it.
 */
export type RangeSliderValue = [number, number];

/**
 * Bring an incoming pair onto the scale: ordered, inside `[min, max]`, and at
 * least `minDistance` apart. Rendering only — the caller's value is never
 * rewritten behind their back.
 */
function normalizePair(
  pair: RangeSliderValue,
  min: number,
  max: number,
  minDistance: number,
): RangeSliderValue {
  const clamp = (n: number) => Math.min(Math.max(n, min), max);
  let lo = clamp(pair[0] <= pair[1] ? pair[0] : pair[1]);
  let hi = clamp(pair[0] <= pair[1] ? pair[1] : pair[0]);
  if (hi - lo < minDistance) {
    hi = clamp(lo + minDistance);
    lo = clamp(hi - minDistance);
  }
  return [lo, hi];
}

type RangeSliderProps = {
  value?: RangeSliderValue;
  defaultValue?: RangeSliderValue;
  onValueChange?: (value: RangeSliderValue) => void;
  /**
   * Called with the committed `[low, high]` pair — the same payload as
   * `onValueChange`, not a DOM `ChangeEvent`.
   *
   * It exists so the documented `{...form.field<RangeSliderValue>("span")}`
   * binding works: a JSX spread performs no excess-property check, so `Omit`ting
   * `onChange` never stopped `field()` delivering it — it only stopped
   * TypeScript reporting it, and the leaked handler then received the raw change
   * events bubbling off the two `<input type="range">` thumbs.
   */
  onChange?: (value: RangeSliderValue) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Minimum gap kept between the two thumbs. @default 0 */
  minDistance?: number;
  error?: boolean;
  disabled?: boolean;
  /** Accessible label for the lower thumb. @default "Minimum" */
  minLabel?: string;
  /** Accessible label for the upper thumb. @default "Maximum" */
  maxLabel?: string;
  /**
   * Spoken form of a thumb's value, applied as `aria-valuetext` on both thumbs.
   * Without it a screen reader reads the raw number as a percentage of the
   * range, which is wrong for prices, dates or any non-linear scale.
   */
  formatValue?: (value: number) => string;
  className?: string;
  style?: CSSProperties;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * root the two thumbs are positioned inside, so these reach the three parts
   * it paints underneath and on top of them.
   *
   * `input` lands on **both** `<input type="range">` elements — they are one
   * control in two directions and no key names an individual thumb. Their
   * geometry is driven by `--range-lo`/`--range-hi` on the root, so a class here
   * changes appearance, never position.
   */
  classNames?: SlotClassNames<"track" | "fill" | "input">;
} & Omit<
  ComponentPropsWithRef<"div">,
  "onChange" | "defaultValue" | "children"
>;

/**
 * Dual-thumb numeric range slider. Built from two overlaid native
 * `<input type="range">` thumbs so keyboard, focus, and assistive-tech support
 * come for free — the track and fill are painted underneath, the inputs sit on
 * top with `pointer-events` confined to their thumbs.
 *
 * The two values are always kept ordered with at least `minDistance` between
 * them: dragging one thumb past the other pushes against it rather than
 * swapping. When both thumbs crowd the top end, the lower thumb is raised above
 * the upper one so it stays grabbable.
 */
export const RangeSlider = forwardRef<HTMLDivElement, RangeSliderProps>(
  function RangeSlider(
    {
      value,
      defaultValue,
      onValueChange,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      minDistance = 0,
      error,
      disabled,
      minLabel = "Minimum",
      maxLabel = "Maximum",
      formatValue,
      className,
      classNames,
      style,
      "aria-invalid": ariaInvalid,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref,
  ) {
    const [current, setCurrent] = useControllableState<RangeSliderValue>({
      value,
      defaultValue: defaultValue ?? [min, max],
      onChange: (next) => {
        onValueChange?.(next);
        onChange?.(next);
      },
    });

    const { invalid, ariaProps: fieldErrorProps } = useFieldError(error);
    // The invalid skin used to be keyed off `.range-slider[aria-invalid="true"]`,
    // and that attribute is destructured out of the rest props and routed to the
    // two thumbs — so it never reached the root and all three rules were dead:
    // an invalid RangeSlider painted exactly like a valid one. `data-invalid` is
    // the root's own mirror of the state the thumbs announce, computed from both
    // sources the thumbs get it from.
    const showInvalid =
      invalid || ariaInvalid === true || ariaInvalid === "true";
    // The invalid state and the error text belong on the focusable controls
    // that report them, not on the wrapper `<div>` — an AT never reads the
    // wrapper while a thumb has focus. Merged rather than spread because
    // `field()` emits the KEY `aria-invalid` valued `undefined` on every
    // render, which a plain spread would use to delete the computed state.
    const thumbAriaProps = mergeProps(
      {
        "aria-invalid": ariaInvalid,
        "aria-describedby": ariaDescribedBy,
      },
      fieldErrorProps,
    );

    const [lo, hi] = normalizePair(current, min, max, minDistance);
    const range = max - min;

    const toPct = (n: number) =>
      range > 0 ? Math.min(100, Math.max(0, ((n - min) / range) * 100)) : 0;
    const loPct = toPct(lo);
    const hiPct = toPct(hi);

    function setLow(next: number, el: HTMLInputElement) {
      // The lower thumb can never cross past (upper - minDistance).
      const clamped = Math.min(Math.max(next, min), hi - minDistance);
      if (clamped !== lo) {
        setCurrent([clamped, hi]);
      } else {
        // The thumb hit the boundary but the native input kept advancing its
        // own value. With no state change React never re-asserts `value`, so
        // the thumb would visually drift past the wall and snap back on the
        // next render — the boundary judder. Re-pin the DOM value now.
        el.value = String(lo);
      }
    }

    function setHigh(next: number, el: HTMLInputElement) {
      // The upper thumb can never cross below (lower + minDistance).
      const clamped = Math.max(Math.min(next, max), lo + minDistance);
      if (clamped !== hi) {
        setCurrent([lo, clamped]);
      } else {
        el.value = String(hi);
      }
    }

    // Which thumb is mid-drag, captured on pointerdown and held until release.
    const [activeThumb, setActiveThumb] = useState<"lo" | "hi" | null>(null);
    // Where the pointer is over the track, as a percentage, while idle.
    const [pointerPct, setPointerPct] = useState<number | null>(null);

    function trackPointerMove(event: React.PointerEvent<HTMLDivElement>) {
      if (activeThumb !== null) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width === 0) return;
      setPointerPct(((event.clientX - rect.left) / rect.width) * 100);
    }

    // The actively dragged thumb stays on top for the whole gesture so the
    // drag never hands off to its sibling mid-stroke — that hand-off dropped
    // the native pointer capture and caused the stutter when a thumb crossed
    // the midpoint.
    //
    // When idle, only the top input is hit-testable where the two overlap, so
    // at equal values one thumb is unreachable by pointer and a fixed heuristic
    // just chooses which one is buried. Decide by approach instead: a pointer
    // left of the pair wants the lower thumb, one to its right the upper. Falls
    // back to the positional heuristic before the pointer has been seen.
    const lowOnTop =
      activeThumb === "lo" ||
      (activeThumb === null &&
        (pointerPct != null
          ? pointerPct < (loPct + hiPct) / 2
          : lo > (min + max) / 2));

    return (
      <div
        ref={ref}
        className={cn(
          "range-slider",
          rootClasses,
          disabled && "opacity-50",
          className,
        )}
        data-disabled={disabled || undefined}
        data-invalid={showInvalid || undefined}
        style={
          {
            "--range-lo": `${loPct}%`,
            "--range-hi": `${100 - hiPct}%`,
            ...style,
          } as CSSProperties
        }
        {...props}
        onPointerMove={composeEventHandlers(props.onPointerMove, trackPointerMove, {
          checkDefaultPrevented: false,
        })}
      >
        <span
          className={cn("range-slider__track", trackClasses, classNames?.track)}
          aria-hidden="true"
        />
        <span
          className={cn(
            "range-slider__fill",
            fillClasses,
            showInvalid && "bg-status-error",
            classNames?.fill,
          )}
          aria-hidden="true"
        />
        <input
          type="range"
          className={cn("range-slider__input", classNames?.input)}
          min={min}
          max={max}
          step={step}
          value={lo}
          disabled={disabled}
          aria-label={minLabel}
          aria-valuetext={formatValue?.(lo)}
          {...thumbAriaProps}
          style={lowOnTop ? { zIndex: 4 } : undefined}
          onPointerDown={() => setActiveThumb("lo")}
          onPointerUp={() => setActiveThumb(null)}
          onPointerCancel={() => setActiveThumb(null)}
          onBlur={() => setActiveThumb(null)}
          onChange={(event) => setLow(Number(event.target.value), event.currentTarget)}
        />
        <input
          type="range"
          className={cn("range-slider__input", classNames?.input)}
          min={min}
          max={max}
          step={step}
          value={hi}
          disabled={disabled}
          aria-label={maxLabel}
          aria-valuetext={formatValue?.(hi)}
          {...thumbAriaProps}
          style={!lowOnTop && activeThumb === "hi" ? { zIndex: 4 } : undefined}
          onPointerDown={() => setActiveThumb("hi")}
          onPointerUp={() => setActiveThumb(null)}
          onPointerCancel={() => setActiveThumb(null)}
          onBlur={() => setActiveThumb(null)}
          onChange={(event) => setHigh(Number(event.target.value), event.currentTarget)}
        />
      </div>
    );
  },
);
