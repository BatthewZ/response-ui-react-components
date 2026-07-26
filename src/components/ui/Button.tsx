import { type ComponentPropsWithRef, type ElementType, forwardRef } from "react";

import { focusRingButton } from "../../util/focus";
import { cn } from "../../util/style";

type Variant = "primary" | "secondary" | "ghost" | "ghost-inverse" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const baseClasses =
  "inline-flex items-center justify-center font-semibold whitespace-nowrap duration-fast cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const variantClassMap: Record<Variant, string> = {
  primary: "bg-primary text-fg-on-primary hover:bg-primary-hover active:bg-primary-active",
  secondary: "bg-secondary text-fg-primary hover:bg-secondary-hover",
  ghost: "bg-transparent text-fg-secondary hover:bg-fg-secondary/10",
  "ghost-inverse": "bg-transparent text-fg-on-primary hover:bg-fg-on-primary/15",
  danger: "bg-status-error text-fg-inverse hover:bg-status-error/90",
  link: "text-accent hover:underline font-bold",
};

const sizeClassMap: Record<Size, string> = {
  sm: "text-body-3 px-2 py-1 gap-[var(--BUTTON-GAP-SM)] rounded-md",
  md: "text-body-2 px-3 py-1.5 gap-[var(--BUTTON-GAP-MD)] rounded-md",
  lg: "text-body-1 px-4 py-2 gap-[var(--BUTTON-GAP-LG)] rounded-md",
};

type ButtonProps<T extends ElementType = "button"> = {
  variant?: Variant;
  size?: Size;
  as?: T;
} & Omit<ComponentPropsWithRef<T>, "as" | "size">;

export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", as: Tag = "button", className, ...props },
  ref
) {
  return (
    <Tag
      ref={ref as never}
      // A bare <button> defaults to type="submit", so a Cancel button rendered
      // before the real submit becomes the form's default submitter. Only when
      // we actually render a <button>, and before the spread so a caller can
      // still ask for "submit".
      {...(Tag === "button" ? { type: "button" as const } : {})}
      className={cn(
        baseClasses,
        focusRingButton,
        variantClassMap[variant],
        sizeClassMap[size],
        className
      )}
      {...props}
    />
  );
}) as <T extends ElementType = "button">(props: ButtonProps<T>) => React.JSX.Element;
