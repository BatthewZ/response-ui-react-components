"use client";
import { type ComponentPropsWithRef, forwardRef } from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { mergeProps } from "../../util/merge-props";
import { cn } from "../../util/style";

import { useFieldErrorProps } from "./Field";

type SwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "md";
  error?: boolean;
  name?: string;
  value?: string;
  /**
   * Not a Switch prop — the change channel is `onCheckedChange`, and `field()`
   * cannot bind a Switch (its `value` is the string the hidden input submits, not
   * the checked state; see README, "`checked`-based controls are wired via
   * `watch`/`setValue`").
   *
   * Declared `never` rather than only `Omit`ted because a JSX spread performs no
   * excess-property check: `Omit` alone let `{...form.field("x")}` land a handler
   * on the `<button>`, where React never fires it. Now that spread is a compile
   * error, and the destructure below keeps the key off the element regardless.
   */
  onChange?: never;
} & Omit<ComponentPropsWithRef<"button">, "onChange" | "value">;

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked,
    defaultChecked = false,
    onCheckedChange,
    size = "md",
    error,
    name,
    value = "on",
    className,
    disabled,
    form,
    onClick,
    onChange: _onChange,
    ...props
  },
  ref
) {
  const [isChecked, setChecked] = useControllableState({
    value: checked,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });

  const fieldErrorProps = useFieldErrorProps(error);

  return (
    <>
      <button
        ref={ref}
        type="button"
        {...mergeProps(props, fieldErrorProps)}
        role="switch"
        aria-checked={isChecked}
        data-state={isChecked ? "checked" : "unchecked"}
        data-size={size}
        disabled={disabled}
        form={form}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          setChecked((prev) => !prev);
        }}
        className={cn("switch", className)}
      >
        <span className="switch-thumb" />
      </button>
      {/* Native checkbox semantics for the form payload: an unchecked switch
          submits nothing at all (so `FormData.has(name)` answers the question it
          looks like it answers), a disabled one is excluded, and `form` lets the
          switch live outside the form it belongs to. */}
      {name && isChecked ? (
        <input type="hidden" name={name} value={value} form={form} disabled={disabled} />
      ) : null}
    </>
  );
});
