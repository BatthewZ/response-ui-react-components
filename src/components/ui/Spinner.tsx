import { type ComponentPropsWithRef, forwardRef } from "react";

import { cn } from "../../util/style";

type Size = "sm" | "md" | "lg";

// `motion-reduce:animate-none` is carried here because the CSS package guards
// animation *classes*, not the `animate-*` utilities — this was the library's
// only unguarded continuous animation.
const baseClasses =
  "animate-spin motion-reduce:animate-none rounded-full border-2 border-current border-t-transparent";

const sizeClassMap: Record<Size, string> = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
};

type SpinnerProps = {
  size?: Size;
} & Omit<ComponentPropsWithRef<"div">, "size">;

/**
 * Decoration by default: `aria-hidden`, no role. N spinners on a page would
 * otherwise be N `role="status"` live regions, each already holding the word
 * "Loading" when it is inserted — the one shape screen readers do not announce,
 * and untranslatable besides.
 *
 * Pass `children` to make this spinner the status for what it is waiting on, in
 * the caller's own language:
 *
 *   <Spinner>Envoi en cours…</Spinner>
 */
export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(function Spinner(
  { size = "md", className, children, ...props },
  ref
) {
  const announces = children != null;
  return (
    <div
      ref={ref}
      role={announces ? "status" : undefined}
      aria-hidden={announces ? undefined : true}
      className={cn(baseClasses, sizeClassMap[size], className)}
      {...props}
    >
      {announces && (
        <span
          // slot:(a) the announcement, and `sr-only` is the whole mechanism: the
          // ring is the visible channel and this is the spoken one, so a route
          // here lets a caller print "Loading…" next to the spinner that already
          // says it. The wording is `children`; the ring itself is `className`.
          className="sr-only"
        >
          {children}
        </span>
      )}
    </div>
  );
});
