import { type ComponentPropsWithRef, forwardRef, type ReactNode } from "react";

import { ScrollReveal } from "../animation/ScrollReveal";
import { cn } from "../../util/style";

type Animation = "fade-up" | "fade-in" | "fade-left" | "fade-right" | "scale";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type SwimlaneProps = {
  title: ReactNode;
  /** Heading element for `title`. A lane nested under an `<h2>` wants `"h3"`. */
  titleAs?: HeadingLevel;
  subtitle?: ReactNode;
  viewAllHref?: string;
  /** Text of the "View all" link. Pass this to translate or reword it. */
  viewAllLabel?: ReactNode;
  /** Extra props for the "View all" anchor — `aria-label`, `target`, `rel`, `onClick`. */
  viewAllProps?: Omit<ComponentPropsWithRef<"a">, "href" | "children">;
  animation?: Animation;
  once?: boolean;
  /**
   * Wrap the lane in a scroll-triggered reveal. The reveal's server-rendered
   * markup is `opacity: 0` until an `IntersectionObserver` fires, so a lane that
   * must be readable without JS needs `animate={false}`.
   */
  animate?: boolean;
} & Omit<ComponentPropsWithRef<"section">, "title">;

export const Swimlane = forwardRef<HTMLElement, SwimlaneProps>(function Swimlane(
  {
    title,
    titleAs: Heading = "h2",
    subtitle,
    viewAllHref,
    viewAllLabel = "View all",
    viewAllProps,
    animation = "fade-up",
    once = true,
    animate = true,
    className,
    children,
    ...rest
  },
  ref
) {
  const content = (
    <>
      <div className="swimlane__header">
        <div className="swimlane__titles">
          <Heading className="swimlane__title">{title}</Heading>
          {subtitle && <p className="swimlane__subtitle">{subtitle}</p>}
        </div>
        {viewAllHref && (
          <a {...viewAllProps} href={viewAllHref} className={cn("swimlane__view-all", viewAllProps?.className)}>
            {viewAllLabel}
          </a>
        )}
      </div>
      <div className="swimlane__body">{children}</div>
    </>
  );

  if (!animate) {
    return (
      <section ref={ref} className={cn("swimlane", className)} {...rest}>
        {content}
      </section>
    );
  }

  return (
    <ScrollReveal
      as="section"
      ref={ref}
      animation={animation}
      once={once}
      className={cn("swimlane", className)}
      {...rest}
    >
      {content}
    </ScrollReveal>
  );
});
