"use client";
import {
  type ClipboardEvent,
  type ComponentPropsWithRef,
  forwardRef,
  type KeyboardEvent,
  useRef,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import {
  focusOutlineResetControl,
  focusRingControl,
  focusRingControlError,
} from "../../util/focus";
import { cn } from "../../util/style";

import { useFieldError } from "./Field";

type OTPMode = "numeric" | "alphanumeric";

type OTPInputProps = {
  length?: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  /**
   * Called with the committed code — the same payload as `onValueChange`, not a
   * DOM `ChangeEvent`.
   *
   * It exists so the documented `{...form.field<string>("code")}` binding works:
   * a JSX spread performs no excess-property check, so `Omit`ting `onChange`
   * never stopped `field()` delivering it — it only stopped TypeScript
   * reporting it.
   */
  onChange?: (v: string) => void;
  onComplete?: (v: string) => void;
  mode?: OTPMode;
  /**
   * Accessible name for one box, given its 1-based position and the total.
   * The default says "Character", not "Digit" — the boxes hold letters under
   * `mode="alphanumeric"` — and it is a prop so it can be translated.
   * @default (position, length) => `Character ${position} of ${length}`
   */
  charLabel?: (position: number, length: number) => string;
  error?: boolean;
  disabled?: boolean;
} & Omit<ComponentPropsWithRef<"div">, "onChange" | "defaultValue">;

const PATTERNS: Record<OTPMode, RegExp> = {
  numeric: /\d/,
  alphanumeric: /[a-zA-Z0-9]/,
};

function filterValue(raw: string, mode: OTPMode): string {
  const pattern = PATTERNS[mode];
  let out = "";
  for (const char of raw) {
    if (pattern.test(char)) out += char;
  }
  return out;
}

export const OTPInput = forwardRef<HTMLDivElement, OTPInputProps>(function OTPInput(
  {
    length = 6,
    value: controlledValue,
    defaultValue = "",
    onValueChange,
    onChange,
    onComplete,
    mode = "numeric",
    charLabel = (position, total) => `Character ${position} of ${total}`,
    error,
    disabled,
    className,
    "aria-label": ariaLabel = "One-time code",
    ...props
  },
  ref
) {
  const { invalid, ariaProps } = useFieldError(error);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  // The last value `onComplete` fired with, so a further edit of an already
  // complete code re-fires rather than latching on a stale one.
  const completedRef = useRef<string | null>(null);

  const [value, setValue] = useControllableState<string>({
    value: controlledValue,
    defaultValue,
    onChange: (next) => {
      onValueChange?.(next);
      onChange?.(next);
    },
  });

  // Fixed-length view of the string, one character per box. A space is read as
  // an empty slot so a value seeded with the older space encoding still lands
  // on the right boxes; it is never written back out.
  function toSlots(v: string): string[] {
    return Array.from({ length }, (_, i) => {
      const c = v[i];
      return c === undefined || c === " " ? "" : c;
    });
  }

  // Slots hold only characters the user entered, so the string is a truthful
  // count of them: `value.length` is the number of characters entered, and no
  // filler is invented for an empty slot. The cost is that a gap cannot survive
  // a round trip — the tail shifts left on the next commit.
  function fromSlots(nextSlots: string[]): string {
    return nextSlots.join("");
  }

  const slots = toSlots(value);

  function commit(nextSlots: string[]) {
    const serialised = fromSlots(nextSlots);
    setValue(serialised);
    if (!nextSlots.every((s) => s !== "")) {
      completedRef.current = null;
      return;
    }
    if (completedRef.current === serialised) return;
    completedRef.current = serialised;
    onComplete?.(serialised);
  }

  function focusBox(index: number) {
    const clamped = Math.max(0, Math.min(index, length - 1));
    inputsRef.current[clamped]?.focus();
    inputsRef.current[clamped]?.select();
  }

  /** Write `chars` into `nextSlots` from `start`, returning the resting cursor. */
  function fill(nextSlots: string[], start: number, chars: string): number {
    let cursor = start;
    for (const char of chars) {
      if (cursor >= length) break;
      nextSlots[cursor] = char;
      cursor += 1;
    }
    return cursor;
  }

  function handleChange(index: number, raw: string) {
    const next = toSlots(value);
    if (raw === "") {
      // Delete, cut, or a selection overwritten with nothing. Clearing a box is
      // a real edit, not an event to discard.
      next[index] = "";
      commit(next);
      return;
    }
    const filtered = filterValue(raw, mode);
    // Something arrived but no character survived the mode filter: reject it and
    // leave the slot as it was, rather than reading it as a clear.
    if (filtered.length === 0) return;
    // A change event can carry more than one character — browser/OS autofill for
    // `autocomplete="one-time-code"` delivers the whole code in one — so spread
    // it across the boxes exactly as a paste does.
    const cursor = fill(next, index, filtered);
    commit(next);
    focusBox(cursor);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = toSlots(value);
      if (next[index] !== "") {
        // Filled: clear current, stay.
        next[index] = "";
        commit(next);
      } else if (index > 0) {
        // Empty: move to previous and clear it.
        next[index - 1] = "";
        commit(next);
        focusBox(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(index + 1);
    }
  }

  function handlePaste(index: number, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = filterValue(e.clipboardData.getData("text"), mode);
    if (pasted.length === 0) return;

    const next = toSlots(value);
    const cursor = fill(next, index, pasted);
    commit(next);
    focusBox(cursor);
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      className={cn("inline-grid grid-flow-col gap-r6", className)}
      {...props}
    >
      {Array.from({ length }, (_, i) => {
        const setInputRef = (el: HTMLInputElement | null) => {
          inputsRef.current[i] = el;
        };
        return (
          <input
            key={i}
            ref={setInputRef}
            type="text"
            inputMode={mode === "numeric" ? "numeric" : "text"}
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            disabled={disabled}
            value={slots[i] ?? ""}
            aria-label={charLabel(i + 1, length)}
            {...ariaProps}
            className={cn(
              "size-12 text-center text-h5 text-fg-primary",
              "bg-surface-0 border border-border-strong rounded-md",
              "duration-fast",
              focusOutlineResetControl,
              focusRingControl,
              "disabled:bg-surface-3 disabled:cursor-not-allowed",
              invalid && focusRingControlError
            )}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(i, e)}
            onFocus={(e) => e.target.select()}
          />
        );
      })}
    </div>
  );
});
