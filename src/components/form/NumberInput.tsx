"use client";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  type ComponentPropsWithRef,
  forwardRef,
  useRef,
  useState,
} from "react";

import { cn } from "../../util/style";

import { Input } from "./Input";

type NumberInputProps = {
  value?: number | null;
  defaultValue?: number;
  onValueChange?: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  error?: boolean;
} & Omit<
  ComponentPropsWithRef<"input">,
  "type" | "value" | "defaultValue" | "onChange"
>;

function clamp(n: number, min: number | undefined, max: number | undefined) {
  let result = n;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  return result;
}

function round(n: number, precision: number | undefined) {
  return precision === undefined ? n : Number(n.toFixed(precision));
}

/** Parse a draft string to a number, or null if empty/unparseable. */
function parseDraft(draft: string): number | null {
  const trimmed = draft.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    {
      value,
      defaultValue,
      onValueChange,
      min,
      max,
      step = 1,
      precision,
      error,
      className,
      onKeyDown,
      onBlur,
      disabled,
      ...props
    },
    ref
  ) {
    const isControlled = value !== undefined;
    // Internal numeric value used while uncontrolled.
    const [internalValue, setInternalValue] = useState<number | null>(
      defaultValue ?? null
    );
    const currentValue = isControlled ? value : internalValue;

    // Internal string draft so partial input ("", "-", "1.") never NaN-commits.
    const [draft, setDraft] = useState<string>(
      currentValue == null ? "" : String(currentValue)
    );

    // Reconcile the draft against the effective value during render (React's
    // recommended "adjust state on prop change" pattern). Sync only when the
    // parsed draft differs from the value, so active typing (e.g. "1.") that
    // parses to the same number is never clobbered.
    const prevValueRef = useRef(currentValue);
    if (prevValueRef.current !== currentValue) {
      prevValueRef.current = currentValue;
      if (parseDraft(draft) !== currentValue) {
        setDraft(currentValue == null ? "" : String(currentValue));
      }
    }

    function emit(next: number | null) {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    }

    /** Parse → clamp → round the draft and emit, then reflect canonical text. */
    function commit(nextDraft: string) {
      const parsed = parseDraft(nextDraft);
      if (parsed == null) {
        setDraft("");
        emit(null);
        return;
      }
      const next = round(clamp(parsed, min, max), precision);
      setDraft(String(next));
      emit(next);
    }

    function stepBy(direction: 1 | -1) {
      const base = currentValue ?? min ?? 0;
      const next = round(clamp(base + direction * step, min, max), precision);
      setDraft(String(next));
      emit(next);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Enter") {
        commit(draft);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        stepBy(1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        stepBy(-1);
      }
      onKeyDown?.(e);
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      commit(draft);
      onBlur?.(e);
    }

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          role="spinbutton"
          error={error}
          disabled={disabled}
          aria-valuenow={currentValue ?? undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={cn("pr-r2", className)}
          {...props}
        />
        <div className="absolute inset-y-0 right-0 flex flex-col">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            disabled={disabled}
            onPointerDown={(e) => {
              e.preventDefault();
              stepBy(1);
            }}
            className={cn(
              "flex flex-1 items-center justify-center px-r5 text-fg-secondary",
              "hover:bg-surface-2 active:bg-surface-3 rounded-tr-md duration-fast",
              "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            )}
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            disabled={disabled}
            onPointerDown={(e) => {
              e.preventDefault();
              stepBy(-1);
            }}
            className={cn(
              "flex flex-1 items-center justify-center px-r5 text-fg-secondary",
              "hover:bg-surface-2 active:bg-surface-3 rounded-br-md duration-fast",
              "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            )}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
    );
  }
);
