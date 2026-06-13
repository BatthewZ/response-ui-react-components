import { useCallback, useRef, useState } from "react";

export interface UseControllableStateParams<T> {
  /** Controlled value. The hook is controlled iff this is `!== undefined`. */
  value?: T;
  /** Initial value used while uncontrolled. */
  defaultValue: T;
  /** Called with the resolved next value whenever the setter runs, in either mode. */
  onChange?: (next: T) => void;
}

export type UseControllableStateReturn<T> = [
  T,
  (next: T | ((prev: T) => T)) => void,
];

/**
 * Unifies the controlled/uncontrolled state pattern.
 *
 * - Controlled iff `value !== undefined`. The mode is locked on first render
 *   (via a ref) so it never flips mid-life and stays warn-free.
 * - Uncontrolled: backed by internal `useState` seeded with `defaultValue`;
 *   the setter updates internal state and calls `onChange`.
 * - Controlled: the setter never touches internal state; it only calls
 *   `onChange` with the resolved value, and reads return the controlled value.
 *
 * The setter accepts a functional updater `(prev) => next`, resolving `prev`
 * from the current effective value. Its identity is stable across renders.
 */
export function useControllableState<T>(
  params: UseControllableStateParams<T>,
): UseControllableStateReturn<T> {
  const { value, defaultValue, onChange } = params;

  // Lock the mode on first render so it never flips mid-life.
  const isControlledRef = useRef(value !== undefined);
  const isControlled = isControlledRef.current;

  const [internalValue, setInternalValue] = useState(defaultValue);

  // Keep the latest effective value and onChange in refs so the setter
  // identity stays stable and never reads stale closures.
  const effectiveValue = isControlled ? (value as T) : internalValue;
  const valueRef = useRef(effectiveValue);
  valueRef.current = effectiveValue;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    const resolved =
      typeof next === "function"
        ? (next as (prev: T) => T)(valueRef.current)
        : next;

    if (!isControlledRef.current) {
      valueRef.current = resolved;
      setInternalValue(resolved);
    }

    onChangeRef.current?.(resolved);
  }, []);

  return [effectiveValue, setValue];
}
