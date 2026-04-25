import { type ComponentPropsWithRef, forwardRef } from "react";

import { cn } from "../../util/style";

type Variant = "text" | "circular" | "rectangular" | "rounded";

const variantClassMap: Record<Variant, string> = {
  text: "skeleton--text",
  circular: "skeleton--circular",
  rectangular: "",
  rounded: "skeleton--rounded",
};

type SkeletonProps = {
  variant?: Variant;
  width?: string | number;
  height?: string | number;
} & Omit<ComponentPropsWithRef<"span">, "children">;

export const Skeleton = forwardRef<HTMLSpanElement, SkeletonProps>(function Skeleton(
  { variant = "text", width = "100%", height, className, style, ...props },
  ref
) {
  return (
    <span
      ref={ref}
      role="status"
      aria-label="Loading"
      className={cn("skeleton", variantClassMap[variant], className)}
      style={{ width, height, ...style }}
      {...props}
    >
      <span className="sr-only">Loading</span>
    </span>
  );
});
