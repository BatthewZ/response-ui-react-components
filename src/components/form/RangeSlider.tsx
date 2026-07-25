"use client";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  forwardRef,
  useState,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { mergeProps } from "../../util/merge-props";
import { cn } from "../../util/style";

import { useFieldErrorProps } from "./Field";

/** A `[low, high]` pair. Always kept ordered (`low <= high`) by the component. */
export type RangeSliderValue = [number, number];

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
  className?: string;
  style?: CSSProperties;
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
      className,
      style,
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

    const fieldErrorProps = useFieldErrorProps(error);

    const [lo, hi] = current;
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

    // The actively dragged thumb stays on top for the whole gesture so the
    // drag never hands off to its sibling mid-stroke — that hand-off dropped
    // the native pointer capture and caused the stutter when a thumb crossed
    // the midpoint. When idle, fall back to a positional heuristic: once both
    // thumbs bunch near the top end the upper input would sit over the lower
    // one and trap it, so raise the lower thumb past the midpoint to keep it
    // grabbable.
    const lowOnTop =
      activeThumb === "lo" ||
      (activeThumb === null && lo > (min + max) / 2);

    return (
      <div
        ref={ref}
        className={cn("range-slider", className)}
        data-disabled={disabled || undefined}
        style={
          {
            "--range-lo": `${loPct}%`,
            "--range-hi": `${100 - hiPct}%`,
            ...style,
          } as CSSProperties
        }
        {...mergeProps(props, fieldErrorProps)}
      >
        <span className="range-slider__track" aria-hidden="true" />
        <span className="range-slider__fill" aria-hidden="true" />
        <input
          type="range"
          className="range-slider__input"
          min={min}
          max={max}
          step={step}
          value={lo}
          disabled={disabled}
          aria-label={minLabel}
          style={lowOnTop ? { zIndex: 4 } : undefined}
          onPointerDown={() => setActiveThumb("lo")}
          onPointerUp={() => setActiveThumb(null)}
          onPointerCancel={() => setActiveThumb(null)}
          onBlur={() => setActiveThumb(null)}
          onChange={(event) => setLow(Number(event.target.value), event.currentTarget)}
        />
        <input
          type="range"
          className="range-slider__input"
          min={min}
          max={max}
          step={step}
          value={hi}
          disabled={disabled}
          aria-label={maxLabel}
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
