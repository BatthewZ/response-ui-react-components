import { type ComponentPropsWithRef, forwardRef, type ReactNode } from "react";

import { ScrollReveal } from "../animation/ScrollReveal";
import { cn, type SlotClassNames } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `Swimlane.css` is gone — everything it drew is here. Each constant is one
 * flat string literal because the docs guard resolves hoisted constants
 * textually and a composed one would not resolve.
 *
 * `min-w-0` on the title group is load-bearing rather than decorative: it is
 * what lets a long title shrink below its intrinsic width inside the flex
 * header instead of pushing the "View all" link off the end.
 */
const rootClasses = "mb-r2";

const headerClasses = "flex justify-between items-baseline gap-r4 mb-r4 px-r5";

const titleGroupClasses = "min-w-0";

const titleClasses = "text-fg-primary text-h4 font-bold";

const descriptionClasses = "text-fg-muted text-body-2 mt-r6";

/**
 * `no-underline` is not redundant with Preflight: Preflight gives `a`
 * `text-decoration: inherit`, so an ancestor that underlines would carry into
 * the link. The underline is the hover affordance and has to be the only one.
 *
 * `--MOTION-*-ENTER` is in no Tailwind namespace and is read as a custom
 * property; `duration-fast` and friends come from `--transition-duration-*` and
 * are different tokens, not substitutes.
 */
const viewAllClasses =
  "text-accent text-body-2 no-underline whitespace-nowrap shrink-0 transition-colors duration-[var(--MOTION-DURATION-ENTER)] ease-[var(--MOTION-EASE-ENTER)] hover:text-accent-hover hover:underline motion-reduce:transition-none";

const bodyClasses = "w-full";

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
   * markup is `opacity: 0` until the bundle executes. A missing
   * `IntersectionObserver` and scripting-off both reveal it now; a bundle that
   * never executes does not, so a lane that must be readable regardless still
   * needs `animate={false}`.
   */
  animate?: boolean;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * `<section>` and `children` is the lane's own content, so these five reach the
   * header chrome and the scroller between them. The union is written out here so
   * an unknown key is a type error rather than a silently ignored one.
   *
   * The "View all" anchor is absent on purpose: `viewAllProps` already carries a
   * `className` to it, and two writers for one element is one too many.
   * `description` is the slot for the `subtitle` prop's `<p>` — the prop keeps its
   * name, the slot uses the one this package spends everywhere else for secondary
   * text under a title.
   */
  classNames?: SlotClassNames<"header" | "titleGroup" | "title" | "description" | "body">;
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
    classNames,
    children,
    ...rest
  },
  ref
) {
  const content = (
    <>
      <div className={cn("swimlane__header", headerClasses, classNames?.header)}>
        <div className={cn("swimlane__titles", titleGroupClasses, classNames?.titleGroup)}>
          <Heading className={cn("swimlane__title", titleClasses, classNames?.title)}>
            {title}
          </Heading>
          {subtitle && (
            <p className={cn("swimlane__subtitle", descriptionClasses, classNames?.description)}>
              {subtitle}
            </p>
          )}
        </div>
        {viewAllHref && (
          <a
            {...viewAllProps}
            href={viewAllHref}
            className={cn("swimlane__view-all", viewAllClasses, viewAllProps?.className)}
          >
            {viewAllLabel}
          </a>
        )}
      </div>
      <div className={cn("swimlane__body", bodyClasses, classNames?.body)}>{children}</div>
    </>
  );

  if (!animate) {
    return (
      <section ref={ref} className={cn("swimlane", rootClasses, className)} {...rest}>
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
      className={cn("swimlane", rootClasses, className)}
      {...rest}
    >
      {content}
    </ScrollReveal>
  );
});
