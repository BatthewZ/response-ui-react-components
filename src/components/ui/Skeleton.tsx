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
} & ComponentPropsWithRef<"span">;

/**
 * A skeleton is decoration by default: `aria-hidden`, no role, nothing to
 * announce. A card of four skeletons would otherwise mount four `role="status"`
 * live regions, each already full of the word "Loading" at the moment it is
 * inserted — which is the one shape screen readers do not announce.
 *
 * Pass `children` to make one skeleton the status for its group, in the
 * caller's own language:
 *
 *   <Skeleton>Chargement du profil…</Skeleton>
 *   <Skeleton />
 *   <Skeleton />
 *
 * Geometry is `className`, both axes. `w-full` is in the class list rather than
 * an inline default so `cn` collapses it against the caller's own `w-*`; height
 * stays with `.skeleton { height: 1em }` in `@layer components`, which sits
 * below `@layer utilities`, so `h-*` beats it. An inline `style` still outranks
 * both, which is the hatch for a width only known at runtime.
 */
export const Skeleton = forwardRef<HTMLSpanElement, SkeletonProps>(function Skeleton(
  { variant = "text", className, children, ...props },
  ref
) {
  const announces = children != null;
  return (
    <span
      ref={ref}
      role={announces ? "status" : undefined}
      aria-hidden={announces ? undefined : true}
      className={cn("skeleton w-full", variantClassMap[variant], className)}
      {...props}
    >
      {announces && (
        <span
          // slot:(a) the announcement itself, and `sr-only` is the mechanism:
          // this text exists to be read and not seen, so a route here lets a
          // caller print the loading sentence inside the shimmer.
          className="sr-only"
        >
          {children}
        </span>
      )}
    </span>
  );
});
