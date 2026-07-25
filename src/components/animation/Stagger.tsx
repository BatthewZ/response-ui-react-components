"use client";
import {
  Children,
  type ComponentPropsWithoutRef,
  type ElementType,
  forwardRef,
  type ReactNode,
} from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";

type StaggerProps = {
  staggerDelay?: string;
  className?: string;
  children?: ReactNode;
  as?: ElementType;
};

/** What the implementation destructures. The public signature is the cast below. */
type StaggerImplProps = StaggerProps & ComponentPropsWithoutRef<"div">;

export const Stagger = forwardRef<HTMLElement, StaggerImplProps>(function Stagger(
  { staggerDelay, className, children, as: Tag = "div", style, ...rest },
  ref
) {
  const reducedMotion = usePrefersReducedMotion();

  const items = Children.toArray(children);

  return (
    <Tag
      {...rest}
      ref={ref}
      className={className}
      style={
        staggerDelay || style
          ? ({ ...style, ...(staggerDelay && { "--stagger-delay": staggerDelay }) } as React.CSSProperties)
          : undefined
      }
    >
      {items.map((child, index) => (
        <div
          key={index}
          className="stagger-item"
          style={
            {
              "--stagger-index": reducedMotion ? 0 : index,
            } as React.CSSProperties
          }
        >
          {child}
        </div>
      ))}
    </Tag>
  );
}) as <T extends ElementType = "div">(
  props: StaggerProps & { as?: T } & Omit<React.ComponentPropsWithRef<T>, keyof StaggerProps | "as">
) => React.JSX.Element;
