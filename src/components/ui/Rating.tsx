"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
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
  /**
   * Names one rating value for assistive tech: the accessible name of the radio
   * standing for it, and the read-only display's `aria-valuetext`.
   *
   * The default is the bare number — the only rendering that is right in every
   * language. Pass this to add a unit ("4 stars", "4 étoiles").
   */
  formatValue?: (value: number, max: number) => string;
  /**
   * Not a Rating prop — the change channel is `onValueChange`.
   *
   * Declared `never` rather than only `Omit`ted because a JSX spread performs no
   * excess-property check: `Omit` alone let `{...form.field("x")}` land a handler
   * on the root `<div>`, where it never fires (React dispatches `onChange` only
   * for a descendant form control, and Rating renders none). Now that spread is a
   * compile error, and the destructure below keeps the key off the element.
   */
  onChange?: never;
} & Omit<ComponentPropsWithRef<"div">, "onChange">;

function clamp(v: number, max: number): number {
  return Math.max(0, Math.min(v, max));
}

/**
 * An incoming `value` is whatever the caller holds. Snap it to a value this
 * scale can actually draw and announce, so `value={9} max={5}` cannot claim
 * nine and `value={4.3}` cannot draw four stars while announcing 4.3.
 */
function normalize(v: number, max: number, allowHalf: boolean): number {
  const snapped = allowHalf ? Math.round(v * 2) / 2 : Math.round(v);
  return clamp(Number.isFinite(snapped) ? snapped : 0, max);
}

/** 0-based index of the star that holds `value`. */
function starIndexOf(value: number, max: number): number {
  return Math.min(max - 1, Math.max(0, Math.ceil(value) - 1));
}

/** Fill amount for the star at 1-based position `position`, given `value`. */
function fillFor(position: number, value: number): number {
  if (value >= position) return 1;
  if (value >= position - 0.5) return 0.5;
  return 0;
}

// The four classes below implement one mechanism between them: a full-opacity
// glyph clipped to `fill * 100%` by an overlay stacked on a base glyph. The
// fraction is the inline `width` and the clipping is `overflow`/`position` split
// across all four, so no one of them is a value a consumer varies — a class on
// any of them detunes the fraction the whole component exists to draw.
function StarIcon({ fill }: { fill: number }) {
  return (
    <span
      // slot:(a) the positioning context the fill overlay is measured against.
      className="rating-star"
      aria-hidden="true"
    >
      <Star
        // slot:(a) the unfilled glyph the overlay is stacked on; it must match
        // the overlay's glyph exactly or the partial fill shows two outlines.
        className="rating-star-base"
        strokeWidth={1.5}
      />
      <span
        // slot:(a) the clip itself — its `width` *is* the fill fraction, so a
        // caller class competing for width prints the wrong rating.
        className="rating-star-fill"
        style={{ width: `${fill * 100}%` }}
      >
        <Star
          // slot:(a) the clipped glyph, sized to the star rather than to the
          // clip so the visible sliver lines up with the base beneath it.
          className="rating-star-fill-icon"
          strokeWidth={1.5}
        />
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
    formatValue,
    className,
    onChange: _onChange,
    ...props
  },
  ref
) {
  const [rawValue, setValue] = useControllableState<number>({
    value: controlledValue,
    defaultValue,
    onChange: onValueChange,
  });
  const value = normalize(rawValue, max, allowHalf);
  const [hover, setHover] = useState<number | null>(null);

  const { getRovingProps, setFocusedIndex } = useRovingFocus({
    orientation: "horizontal",
  });

  // Focus and value are one state machine, not two: the tab stop is always the
  // star holding the value, and `setFocusedIndex` carries DOM focus with it
  // whenever the group already had focus. Without this, arrow keys loop the tab
  // stop while the value clamps, a click never moves the tab stop, and Tab
  // re-enters on star 1.
  useEffect(() => {
    setFocusedIndex(starIndexOf(value, max));
  }, [value, max, setFocusedIndex]);

  const nameFor = (v: number) => (formatValue ? formatValue(v, max) : String(v));

  // Display value: hover preview wins when set (interactive only).
  const display = hover ?? value;

  /* --- Read-only --------------------------------------------------- */
  if (readOnly) {
    return (
      <div
        ref={ref}
        // A value within a known range, which is what `meter` is for. `img`
        // could only carry the value by overwriting the caller's `aria-label`
        // with a generated English sentence — the label is a required prop and
        // names the subject being rated, so it has to survive.
        role="meter"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatValue ? formatValue(value, max) : undefined}
        aria-disabled={disabled || undefined}
        className={cn("rating", disabled && "rating--disabled", className)}
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

  // Every key the group handles moves the value; focus follows from the effect
  // above. Home/End are the first and last selectable ratings, not just tab
  // stops.
  function handleStarKeyDown(e: KeyboardEvent) {
    if (disabled) return;
    let next: number;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = value + step;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = value - step;
        break;
      case "Home":
        next = step;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    commit(next);
  }

  function valueFromClick(position: number, e: MouseEvent<HTMLButtonElement>): number {
    if (!allowHalf) return position;
    // A keyboard-activated click carries no pointer position: `detail` is 0 and
    // `clientX` reads 0, which would resolve to the left half every time and
    // leave no way to activate a star at its whole value.
    if (e.detail === 0) return position;
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
            // slot:(a) a bare hit target around the glyph — it strips the UA
            // button chrome and nothing else, and the star it wraps is (a) for
            // the reason above, so there is no appearance here to vary.
            className="rating-button"
            // Deliberately not `roving.onKeyDown` as well: the hook's own key
            // handling is the second state machine this component used to run
            // alongside the value, and it loops where the value clamps.
            onKeyDown={handleStarKeyDown}
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
            <span
              // slot:(a) the radio's whole accessible name, and `sr-only` is
              // the mechanism: a route here lets a caller undo the hiding and
              // print a column of numerals across the stars.
              className="sr-only"
            >
              {nameFor(allowHalf && isChecked ? value : position)}
            </span>
            <StarIcon fill={fillFor(position, display)} />
          </button>
        );
      })}
    </div>
  );
});
