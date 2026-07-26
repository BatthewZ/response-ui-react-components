"use client";
import { type ComponentPropsWithRef, type CSSProperties, forwardRef } from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { mergeProps } from "../../util/merge-props";
import { cn } from "../../util/style";

import { useFieldErrorProps } from "./Field";

type SliderProps = {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /**
   * Called with the committed number — the same payload as `onValueChange`, not
   * a DOM `ChangeEvent`.
   *
   * It exists so the documented `{...form.field<number>("vol")}` binding works:
   * a JSX spread performs no excess-property check, so `Omit`ting `onChange`
   * never stopped `field()` delivering it — it only stopped TypeScript
   * reporting it, and the leaked handler then displaced the `<input
   * type="range">`'s own.
   */
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  error?: boolean;
} & Omit<ComponentPropsWithRef<"input">, "type" | "value" | "defaultValue" | "onChange">;

/**
 * The value the browser will actually render the thumb at. `<input type="range">`
 * sanitises an off-grid value to the nearest step (ties going up, never past
 * `max`), so a fill drawn from the raw prop sits somewhere the thumb is not.
 */
function snapToStep(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(Math.max(value, min), max);
  if (!(step > 0) || !Number.isFinite(clamped)) return clamped;
  let snapped = min + Math.round((clamped - min) / step) * step;
  if (snapped > max) snapped -= step;
  // The multiply-add above can land on 0.30000000000000004; the thumb does not.
  snapped = Number(snapped.toPrecision(12));
  return Math.min(Math.max(snapped, min), max);
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    value,
    defaultValue,
    onValueChange,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    error,
    className,
    style,
    ...props
  },
  ref
) {
  const [current, setCurrent] = useControllableState<number>({
    value,
    defaultValue: defaultValue ?? min,
    onChange: (next) => {
      onValueChange?.(next);
      onChange?.(next);
    },
  });

  const fieldErrorProps = useFieldErrorProps(error);

  const range = max - min;
  const rendered = snapToStep(current, min, max, step);
  const pct = range > 0 ? ((rendered - min) / range) * 100 : 0;
  const clamped = Math.min(100, Math.max(0, pct));

  return (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      step={step}
      value={current}
      {...mergeProps(props, fieldErrorProps)}
      onChange={(event) => {
        setCurrent(Number(event.target.value));
      }}
      className={cn("slider", className)}
      style={{ "--slider-fill": `${clamped}%`, ...style } as CSSProperties}
    />
  );
});
