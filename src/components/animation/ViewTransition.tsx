"use client";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  forwardRef,
  type ReactNode,
  useCallback,
} from "react";

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

/**
 * `useViewTransition(navigate)` wraps any navigation function so that the
 * navigation runs inside `document.startViewTransition()` when the browser
 * supports it. Pass your router's navigate function (e.g. `useNavigate()`
 * from react-router-dom):
 *
 *     const navigate = useNavigate();
 *     const transition = useViewTransition(navigate);
 *     transition("/dashboard");
 */
export function useViewTransition<TArgs extends unknown[]>(
  navigate: (...args: TArgs) => unknown,
): (...args: TArgs) => void {
  return useCallback(
    (...args: TArgs) => {
      if (typeof document.startViewTransition === "function") {
        document.startViewTransition(() => {
          void navigate(...args);
        });
      } else {
        void navigate(...args);
      }
    },
    [navigate],
  );
}
