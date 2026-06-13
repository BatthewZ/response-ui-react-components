import { type ComponentPropsWithRef, forwardRef } from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
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
    onClick,
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
        role="switch"
        aria-checked={isChecked}
        data-state={isChecked ? "checked" : "unchecked"}
        data-size={size}
        disabled={disabled}
        {...fieldErrorProps}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          setChecked((prev) => !prev);
        }}
        className={cn("switch", className)}
        {...props}
      >
        <span className="switch-thumb" />
      </button>
      {name ? <input type="hidden" name={name} value={isChecked ? value : ""} /> : null}
    </>
  );
});
