"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  useState,
} from "react";
import { Star } from "lucide-react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { useRovingFocus } from "../../hooks/use-roving-focus";
import { cn } from "../../util/style";

type RatingProps = {
  value?: number;
  defaultValue?: number;
  onValueChange?: (v: number) => void;
  max?: number;
  allowHalf?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  "aria-label": string;
} & Omit<ComponentPropsWithRef<"div">, "onChange">;

function clamp(v: number, max: number): number {
  return Math.max(0, Math.min(v, max));
}

/** Fill amount for the star at 1-based position `position`, given `value`. */
function fillFor(position: number, value: number): number {
  if (value >= position) return 1;
  if (value >= position - 0.5) return 0.5;
  return 0;
}

function StarIcon({ fill }: { fill: number }) {
  return (
    <span className="rating-star" aria-hidden="true">
      <Star className="rating-star-base" strokeWidth={1.5} />
      <span className="rating-star-fill" style={{ width: `${fill * 100}%` }}>
        <Star className="rating-star-fill-icon" strokeWidth={1.5} />
      </span>
    </span>
  );
}

export const Rating = forwardRef<HTMLDivElement, RatingProps>(function Rating(
  {
    value: controlledValue,
    defaultValue = 0,
    onValueChange,
    max = 5,
    allowHalf = false,
    readOnly = false,
    disabled = false,
    "aria-label": ariaLabel,
    className,
    ...props
  },
  ref
) {
  const [value, setValue] = useControllableState<number>({
    value: controlledValue,
    defaultValue,
    onChange: onValueChange,
  });
  const [hover, setHover] = useState<number | null>(null);

  const { getRovingProps } = useRovingFocus({ orientation: "horizontal" });

  // Display value: hover preview wins when set (interactive only).
  const display = hover ?? value;

  /* --- Read-only --------------------------------------------------- */
  if (readOnly) {
    return (
      <div
        ref={ref}
        role="img"
        aria-label={`${value} out of ${max} stars`}
        className={cn("rating", className)}
        {...props}
      >
        {Array.from({ length: max }, (_, i) => (
          <StarIcon key={i} fill={fillFor(i + 1, value)} />
        ))}
      </div>
    );
  }

  /* --- Interactive ------------------------------------------------- */
  const step = allowHalf ? 0.5 : 1;

  function commit(next: number) {
    if (disabled) return;
    setValue(clamp(next, max));
  }

  function handleStarKeyDown(e: KeyboardEvent) {
    if (disabled) return;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      commit(value + step);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      commit(value - step);
    }
  }

  function valueFromClick(position: number, e: MouseEvent<HTMLButtonElement>): number {
    if (!allowHalf) return position;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    return isLeftHalf ? position - 0.5 : position;
  }

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={cn("rating", disabled && "rating--disabled", className)}
      {...props}
    >
      {Array.from({ length: max }, (_, i) => {
        const position = i + 1;
        const roving = getRovingProps(i);
        const isChecked = Math.ceil(value) === position && value > position - 1;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={isChecked}
            disabled={disabled}
            tabIndex={disabled ? -1 : roving.tabIndex}
            ref={roving.ref}
            className="rating-button"
            onKeyDown={(e) => {
              roving.onKeyDown(e);
              handleStarKeyDown(e);
            }}
            onClick={(e) => commit(valueFromClick(position, e))}
            onMouseMove={(e) => {
              if (disabled) return;
              setHover(valueFromClick(position, e));
            }}
            onMouseLeave={() => setHover(null)}
          >
            {/* Each radio is named for the value it stands for. Under
                `allowHalf` a star covers two values, so the checked one is
                named for the value actually held — naming every star
                `position - 0.5` left no radio named `max` and misnamed the
                checked one whenever the value was a whole star. */}
            <span className="sr-only">
              {allowHalf && isChecked ? value : position} stars
            </span>
            <StarIcon fill={fillFor(position, display)} />
          </button>
        );
      })}
    </div>
  );
});
