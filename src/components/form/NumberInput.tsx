"use client";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  forwardRef,
  useRef,
  useState,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { composeEventHandlers } from "../../util/merge-props";
import { cn, type SlotClassNames } from "../../util/style";

import { Input } from "./Input";

type NumberInputProps = {
  value?: number | null;
  defaultValue?: number;
  onValueChange?: (value: number | null) => void;
  /**
   * Called with the committed number — the same payload as `onValueChange`, not
   * a DOM `ChangeEvent`.
   *
   * It exists so the documented `{...form.field<number | null>("qty")}` binding
   * works: a JSX spread performs no excess-property check, so `Omit`ting
   * `onChange` never stopped `field()` delivering it — it only stopped
   * TypeScript reporting it, and the raw event then wrote the input's *text*
   * into a numeric field.
   */
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  error?: boolean;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * `<input>` — the element the `ref` and every other prop address — so the
   * framing box and the stepper pair are the two things no caller can otherwise
   * reach. `chevron` lands on **both** chevron buttons; they are one control in
   * two directions and no key names an individual one. The union is written out
   * here so an unknown key is a type error rather than a silently ignored one.
   *
   * `control` is the framing box, the same word `DatePicker`,
   * `DateRangePicker`, `Select` and `MultiSelect` spend on the same element
   * (`docs/project-docs/slot-vocabulary.md` §6, §7.1). It is a slot rather than a re-pointed
   * `className` because moving a documented `className` target is breaking and
   * is the owner's call, not a lane's (`docs/project-docs/slot-convention.md` §7).
   */
  classNames?: SlotClassNames<"control" | "chevron">;
} & Omit<
  ComponentPropsWithRef<"input">,
  "type" | "value" | "defaultValue" | "onChange"
>;

/** Width of one stepper chevron. The reserved right padding is derived from it
 * rather than guessed at, so a long value cannot render under the chevrons. */
const CHEVRON_SIZE = 14;

/** Optionally signed decimal, with optional fraction and exponent. */
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function clamp(n: number, min: number | undefined, max: number | undefined) {
  let result = n;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  return result;
}

function round(n: number, precision: number | undefined) {
  return precision === undefined ? n : Number(n.toFixed(precision));
}

/** value → draft: the canonical text for a value. One of the two crossings. */
function formatValue(value: number | null): string {
  return value == null ? "" : String(value);
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    {
      value,
      defaultValue,
      onValueChange,
      onChange,
      min,
      max,
      step = 1,
      precision,
      error,
      className,
      classNames,
      onKeyDown,
      onBlur,
      disabled,
      readOnly,
      ...props
    },
    ref
  ) {
    const [currentValue, setValue] = useControllableState<number | null>({
      value,
      defaultValue: defaultValue ?? null,
      onChange: (next) => {
        onValueChange?.(next);
        onChange?.(next);
      },
    });

    // A string draft so partial input ("", "-", "1.") never commits a number
    // the user has not finished typing.
    const [draft, setDraft] = useState(() => formatValue(currentValue));

    /**
     * draft → value: the other crossing. Strict — `Number()` also reads `0x1f`,
     * `Infinity` and `1e400`, none of which a decimal field means. `null` for
     * empty or unreadable text.
     */
    function readDraft(text: string): number | null {
      const trimmed = text.trim();
      if (!DECIMAL.test(trimmed)) return null;
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) return null;
      return round(clamp(parsed, min, max), precision);
    }

    // Every commit bumps this, so the draft is re-derived from whichever value
    // is effective on the render that follows. Reconciling on that signature
    // rather than on value identity is what re-syncs a value the parent
    // refused, where the prop itself never changes.
    const [commits, setCommits] = useState(0);
    const signature = `${commits}:${formatValue(currentValue)}`;
    const syncedRef = useRef(signature);
    if (syncedRef.current !== signature) {
      syncedRef.current = signature;
      setDraft(formatValue(currentValue));
    }

    /**
     * Offer a value; the reconcile above then owns the text. `setValue` skips
     * both the state write and `onChange` when nothing moved, so a press at a
     * clamped bound is silent.
     */
    function apply(next: number | null) {
      setValue(next);
      setCommits((n) => n + 1);
    }

    // A read-only field is not an editable one by another route: the steppers
    // and the Arrow keys commit exactly what typing would.
    const locked = disabled === true || readOnly === true;

    function stepBy(direction: 1 | -1) {
      if (locked) return;
      // Step from the text in the box, committed or not, seeding an empty field
      // at 0 and letting the clamp carry it to the bound — so the first press
      // in a `min={10}` field lands on 10 itself, as a native spinner does.
      const base = readDraft(draft) ?? 0;
      apply(round(clamp(base + direction * step, min, max), precision));
    }

    const handleKeyDown = composeEventHandlers(
      onKeyDown,
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (locked) return;
        if (e.key === "Enter") {
          apply(readDraft(draft));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          stepBy(1);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          stepBy(-1);
        }
      }
    );

    const handleBlur = composeEventHandlers(onBlur, () => {
      if (locked) return;
      apply(readDraft(draft));
    });

    return (
      <div
        className={cn("relative", classNames?.control)}
        style={
          {
            "--numberinput-stepper": `calc(${CHEVRON_SIZE}px + 2 * var(--R-SIZE-5))`,
          } as CSSProperties
        }
      >
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          role="spinbutton"
          error={error}
          disabled={disabled}
          readOnly={readOnly}
          aria-readonly={readOnly || undefined}
          aria-valuenow={currentValue ?? undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          {...props}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          // Reserve exactly the stepper column, not an eyeballed token that is
          // narrower than it — a long value used to render under the chevrons.
          className={cn("pr-[var(--numberinput-stepper)]", className)}
        />
        <div
          // slot:(a) the stepper column is pure reservation geometry: it fills
          // the exact right-hand strip the input pads for, and every declaration
          // on it (`absolute inset-y-0 right-0`, the column direction the two
          // halves split) is what pins the pair to the field. A caller restyling
          // the steppers wants the buttons, which `classNames.chevron` reaches.
          className="absolute inset-y-0 right-0 flex flex-col"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            disabled={locked}
            onPointerDown={(e) => {
              e.preventDefault();
              stepBy(1);
            }}
            className={cn(
              "flex flex-1 items-center justify-center px-r5 text-fg-secondary",
              "hover:bg-surface-2 active:bg-surface-3 rounded-tr-md duration-fast",
              "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
              classNames?.chevron
            )}
          >
            <ChevronUp size={CHEVRON_SIZE} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            disabled={locked}
            onPointerDown={(e) => {
              e.preventDefault();
              stepBy(-1);
            }}
            className={cn(
              "flex flex-1 items-center justify-center px-r5 text-fg-secondary",
              "hover:bg-surface-2 active:bg-surface-3 rounded-br-md duration-fast",
              "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
              classNames?.chevron
            )}
          >
            <ChevronDown size={CHEVRON_SIZE} />
          </button>
        </div>
      </div>
    );
  }
);
