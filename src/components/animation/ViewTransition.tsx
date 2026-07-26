import {
  type ComponentPropsWithRef,
  type CSSProperties,
  forwardRef,
  type ReactNode,
} from "react";

// The hook carries the "use client" directive in its own module; this component
// holds no state and reads no browser API, so it stays server-renderable.
export { useViewTransition } from "./use-view-transition";

type ViewTransitionProps = {
  name: string;
  children: ReactNode;
} & ComponentPropsWithRef<"div">;

export const ViewTransition = forwardRef<HTMLDivElement, ViewTransitionProps>(
  function ViewTransition({ name, className, children, style, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={className}
        style={{ ...style, viewTransitionName: name } as CSSProperties}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
