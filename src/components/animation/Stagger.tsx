"use client";
import {
  Children,
  type ComponentPropsWithoutRef,
  type ElementType,
  forwardRef,
  type ReactNode,
} from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";

/**
 * Resolves the delay step ONCE, on the container, where nothing competes.
 *
 * `.stagger-item` in `@batthewz/response-ui-css` re-declares
 * `--stagger-delay: var(--MOTION-STAGGER-DELAY)` on the very element that reads
 * it, so a value set on any ancestor — a consumer's stylesheet, a wrapper, a
 * theme scope — is shadowed and never reaches `animation-delay`. This package
 * used to undo that with `--stagger-delay: inherit` in `Stagger.css`, which
 * worked only while this package's CSS was unlayered; from `@layer components`
 * that rule loses to the foundation's at any specificity.
 *
 * So the value is written INLINE on the item instead, where no stylesheet in
 * either package can shadow it. The container reads the ancestor value (or the
 * contract token) into this private variable and the item references it, which
 * keeps the fallback inside the reference — an inline `animation-delay` would
 * have made the foundation's own reduced-motion guard inert, and this does not
 * declare `animation-delay` at all.
 */
const STAGGER_STEP = "--_stagger-step";
const STAGGER_STEP_FALLBACK = "var(--stagger-delay, var(--MOTION-STAGGER-DELAY))";

type StaggerProps = {
  /**
   * Delay step between items, e.g. `"100ms"`. Resolved on the container and
   * *declared* on each item wrapper: `.stagger-item` re-declares
   * `--stagger-delay` on itself, so a merely inherited value never reaches the
   * `animation-delay` that reads it.
   *
   * Highest priority of the three delay sources. Omit it and the item falls back
   * to an ancestor's `--stagger-delay`, then to `--MOTION-STAGGER-DELAY`.
   */
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
      // The caller's `style` is spread LAST, so every key of theirs still wins.
      style={
        {
          [STAGGER_STEP]: staggerDelay ?? STAGGER_STEP_FALLBACK,
          ...style,
        } as React.CSSProperties
      }
    >
      {items.map((child, index) => (
        <div
          key={index}
          // slot:(a) `.stagger-item` is the foundation's own hook and the whole
          // mechanism — the animation, its `--stagger-delay` re-declaration and
          // the reduced-motion guard all hang off it. Two accepted
          // `probe:cascade-layer` rows are pinned on the premise that nothing
          // this package renders can put a class on this element, so a route
          // here is not a slot decision on its own. The delay is the `staggerDelay`
          // prop; the item's own box is the caller's child, which they class
          // directly.
          className="stagger-item"
          style={
            {
              "--stagger-index": reducedMotion ? 0 : index,
              // Always present, and a reference rather than a value: the
              // foundation's own declaration on this element is what it exists to
              // out-rank, and only an inline declaration can.
              "--stagger-delay": `var(${STAGGER_STEP})`,
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
