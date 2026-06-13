import { type ComponentPropsWithRef, type CSSProperties, forwardRef } from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { cn } from "../../util/style";

import { useFieldErrorProps } from "./Field";

type SliderProps = {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  error?: boolean;
} & Omit<ComponentPropsWithRef<"input">, "type" | "value" | "defaultValue" | "onChange">;

export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    value,
    defaultValue,
    onValueChange,
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
    onChange: onValueChange,
  });

  const fieldErrorProps = useFieldErrorProps(error);

  const range = max - min;
  const pct = range > 0 ? ((current - min) / range) * 100 : 0;
  const clamped = Math.min(100, Math.max(0, pct));

  return (
    <input
      ref={ref}
      type="range"
      min={min}
      max={max}
      step={step}
      value={current}
      {...fieldErrorProps}
      onChange={(event) => {
        setCurrent(Number(event.target.value));
      }}
      className={cn("slider", className)}
      style={{ "--slider-fill": `${clamped}%`, ...style } as CSSProperties}
      {...props}
    />
  );
});
