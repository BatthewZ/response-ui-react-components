"use client";
import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
} from "react";

import { Parallax } from "../animation/Parallax";
import { ScrollReveal } from "../animation/ScrollReveal";
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Context (passes index + animate flag to items)                     */
/* ------------------------------------------------------------------ */

type SpotlightItemContextValue = {
  index: number;
  animate: boolean;
};

const SpotlightItemContext = createContext<SpotlightItemContextValue | null>(null);

/** Whether the row this content sits in swapped its columns. */
const SpotlightReversedContext = createContext(false);

function useSpotlightItemContext() {
  return useContext(SpotlightItemContext);
}

/* ------------------------------------------------------------------ */
/*  Column order                                                       */
/* ------------------------------------------------------------------ */

/**
 * Whether this row shows its image on the RIGHT — even rows alternate, and
 * `reversed` flips whatever the alternation decided. It also decides which side
 * the copy slides in from, so one predicate answers both.
 *
 * This was seven `order` rules in `Spotlight.css` selecting
 * `.spotlight-item > *:not(.spotlight-image)`, and the `:not()` was there for a
 * reason stated at source: with `animate` on, the grid item is the reveal
 * wrapper and `.spotlight-content` is a level down. Both columns are now ordered
 * by the elements themselves, so the row lays out the same whichever way round
 * it was authored — and `Spotlight.Content` puts its class on whichever element
 * IS the grid item, which is what the `:not()` was standing in for.
 *
 * Only above 40rem: below it the grid is one column and `order` would reshuffle
 * the stack, which is why every rule sat inside the media query.
 */
function useFlipped(): boolean {
  const index = useContext(SpotlightItemContext)?.index ?? 0;
  const reversed = useContext(SpotlightReversedContext);
  return (index % 2 === 1) !== reversed;
}

const imageOrder = (flipped: boolean) => (flipped ? "sm:order-2" : "sm:order-1");
const contentOrder = (flipped: boolean) => (flipped ? "sm:order-1" : "sm:order-2");

/* ------------------------------------------------------------------ */
/*  Spotlight (root)                                                   */
/* ------------------------------------------------------------------ */

type SpotlightProps = {
  animate?: boolean;
} & ComponentPropsWithRef<"div">;

const SpotlightRoot = forwardRef<HTMLDivElement, SpotlightProps>(function Spotlight(
  { animate = true, className, children, ...props },
  ref
) {
  const items = Children.toArray(children);

  return (
    <div ref={ref} className={cn("spotlight flex flex-col gap-r2", className)} {...props}>
      {items.map((child, index) => (
        // Keyed by the row's own key, not its position — keying by index made
        // a reorder remount the subtree and replay the reveal.
        <SpotlightItemContext.Provider
          key={isValidElement(child) ? child.key : index}
          value={{ index, animate }}
        >
          {child}
        </SpotlightItemContext.Provider>
      ))}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Spotlight.Item                                                     */
/* ------------------------------------------------------------------ */

type SpotlightItemProps = {
  reversed?: boolean;
} & ComponentPropsWithRef<"div">;

const SpotlightItem = forwardRef<HTMLDivElement, SpotlightItemProps>(function SpotlightItem(
  { reversed, className, children, ...props },
  ref
) {
  return (
    <SpotlightReversedContext.Provider value={Boolean(reversed)}>
      <div
        ref={ref}
        className={cn(
          "spotlight-item grid grid-cols-1 items-center gap-r4 sm:grid-cols-2",
          reversed && "spotlight-item--reversed",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </SpotlightReversedContext.Provider>
  );
});

/* ------------------------------------------------------------------ */
/*  Spotlight.Image                                                    */
/* ------------------------------------------------------------------ */

type SpotlightImageProps = {
  src: string;
  alt?: string;
  parallax?: boolean;
  parallaxRate?: number;
  /** Caps the parallax drift, in pixels — [Parallax](Parallax.tsx)'s `clamp`. */
  parallaxClamp?: number;
  /**
   * Props for the `<img>` itself. The rest of the bag lands on the wrapper, so
   * `loading`, `width`/`height`, `srcSet`, `sizes` and `decoding` need this.
   *
   * This used to be spread raw, on the grounds that the `<img>` carried no class
   * of its own and there was nothing to merge with — every rule that shaped it
   * hung off `.spotlight-image img` in the stylesheet. That rule is now
   * `size-full object-cover` on the `<img>` itself, so the exception no longer
   * applies and `className` merges the way `Hero.Background` and
   * `MediaCard.Image` already did: `object-contain` beats the default.
   */
  imgProps?: Omit<ComponentPropsWithRef<"img">, "src" | "alt">;
} & Omit<ComponentPropsWithRef<"div">, "children">;

const SpotlightImage = forwardRef<HTMLDivElement, SpotlightImageProps>(function SpotlightImage(
  { src, alt, parallax = false, parallaxRate, parallaxClamp, imgProps, className, ...props },
  ref
) {
  const flipped = useFlipped();

  const image = (
    <img
      {...imgProps}
      src={src}
      alt={alt ?? ""}
      role={alt ? undefined : "presentation"}
      className={cn("size-full object-cover", imgProps?.className)}
    />
  );

  const inner = parallax ? (
    <Parallax
      rate={parallaxRate}
      clamp={parallaxClamp}
      // slot:(a) the drift shim. Its one class makes the transformed layer fill
      // `.spotlight-image`; anything else detaches the photograph from the frame
      // it is cropped to, and it is present only when `parallax` is set, so a
      // class routed here would come and go with an unrelated prop.
      className="size-full"
    >
      {image}
    </Parallax>
  ) : (
    image
  );

  return (
    <div
      ref={ref}
      className={cn("spotlight-image overflow-hidden rounded-md", imageOrder(flipped), className)}
      {...props}
    >
      {inner}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Spotlight.Content                                                  */
/* ------------------------------------------------------------------ */

type SpotlightContentProps = ComponentPropsWithRef<"div">;

const SpotlightContent = forwardRef<HTMLDivElement, SpotlightContentProps>(
  function SpotlightContent({ className, children, ...props }, ref) {
    const ctx = useSpotlightItemContext();
    const animate = ctx?.animate ?? true;

    // `reversed` swaps the columns, so it has to swap the side the copy slides
    // in from too — otherwise it enters from where the image used to be.
    const flipped = useFlipped();
    const animation = flipped ? "fade-left" : "fade-right";

    // `ref` always lands on `.spotlight-content`; which element it pointed at
    // used to be decided by the root's `animate`, two components up.
    const inner = (
      <div
        ref={ref}
        className={cn(
          "spotlight-content flex flex-col justify-center p-r4",
          // The column order belongs to whichever element IS the grid item, and
          // that is the reveal wrapper when `animate` is on.
          !animate && contentOrder(flipped),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );

    if (!animate) {
      return inner;
    }

    return (
      <ScrollReveal
        animation={animation}
        // slot:(a) the reveal wrapper. Its one class is the column order, and
        // that is derived from the row's position and `reversed` — varying it is
        // not a restyle, it is the alternation breaking. It is also present only
        // while `animate` is on, so a route here would come and go with an
        // unrelated prop. `Spotlight.Content`'s own `className` reaches the copy
        // box inside it, and that is where a caller's classes belong.
        className={contentOrder(flipped)}
      >
        {inner}
      </ScrollReveal>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const Spotlight = Object.assign(SpotlightRoot, {
  Item: SpotlightItem,
  Image: SpotlightImage,
  Content: SpotlightContent,
});
