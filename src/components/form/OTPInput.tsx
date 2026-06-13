"use client";
import {
  type ClipboardEvent,
  type ComponentPropsWithRef,
  forwardRef,
  type KeyboardEvent,
  useRef,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { cn } from "../../util/style";

import { useFieldErrorProps } from "./Field";

type OTPMode = "numeric" | "alphanumeric";

type OTPInputProps = {
  length?: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  onComplete?: (v: string) => void;
  mode?: OTPMode;
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
    onComplete,
    mode = "numeric",
    error,
    disabled,
    className,
    "aria-label": ariaLabel = "One-time code",
    ...props
  },
  ref
) {
  const fieldErrorProps = useFieldErrorProps(error);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const completedRef = useRef(false);

  const [value, setValue] = useControllableState<string>({
    value: controlledValue,
    defaultValue,
    onChange: onValueChange,
  });

  // Fixed-length slot array; empty slots are represented as "" but a string
  // model would collapse internal gaps on join, so we keep an explicit array
  // and only serialise (trailing-trimmed) for the external value.
  function toSlots(v: string): string[] {
    return Array.from({ length }, (_, i) => {
      const c = v[i];
      return c === undefined || c === " " ? "" : c;
    });
  }

  function fromSlots(slots: string[]): string {
    // Serialise preserving internal gaps (as spaces) but trim trailing empties.
    let out = "";
    for (const s of slots) out += s === "" ? " " : s;
    return out.replace(/ +$/, "");
  }

  const slots = toSlots(value);

  function commit(nextSlots: string[]) {
    const serialised = fromSlots(nextSlots);
    setValue(serialised);
    const complete = nextSlots.every((s) => s !== "") && nextSlots.length === length;
    if (complete) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.(serialised);
      }
    } else {
      completedRef.current = false;
    }
  }

  function focusBox(index: number) {
    const clamped = Math.max(0, Math.min(index, length - 1));
    inputsRef.current[clamped]?.focus();
    inputsRef.current[clamped]?.select();
  }

  function handleChange(index: number, raw: string) {
    // Take the last typed character (in case the box already had a value).
    const filtered = filterValue(raw, mode);
    if (filtered.length === 0) return;
    const char = filtered[filtered.length - 1];
    const next = toSlots(value);
    next[index] = char;
    commit(next);
    focusBox(index + 1);
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
    let cursor = index;
    for (const char of pasted) {
      if (cursor >= length) break;
      next[cursor] = char;
      cursor += 1;
    }
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
            aria-label={`Digit ${i + 1}`}
            {...fieldErrorProps}
            className={cn(
              "size-12 text-center text-h5 text-fg-primary",
              "bg-surface-0 border border-border-strong rounded-md",
              "duration-fast",
              "focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus",
              "disabled:bg-surface-3 disabled:cursor-not-allowed",
              error && "border-status-error focus:ring-status-error"
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
