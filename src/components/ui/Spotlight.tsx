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
    <div ref={ref} className={cn("spotlight", className)} {...props}>
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
        className={cn("spotlight-item", reversed && "spotlight-item--reversed", className)}
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
   */
  imgProps?: Omit<ComponentPropsWithRef<"img">, "src" | "alt">;
} & Omit<ComponentPropsWithRef<"div">, "children">;

const SpotlightImage = forwardRef<HTMLDivElement, SpotlightImageProps>(function SpotlightImage(
  { src, alt, parallax = false, parallaxRate, parallaxClamp, imgProps, className, ...props },
  ref
) {
  const image = (
    <img {...imgProps} src={src} alt={alt ?? ""} role={alt ? undefined : "presentation"} />
  );

  const inner = parallax ? (
    <Parallax rate={parallaxRate} clamp={parallaxClamp} className="size-full">
      {image}
    </Parallax>
  ) : (
    image
  );

  return (
    <div ref={ref} className={cn("spotlight-image", className)} {...props}>
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
    const index = ctx?.index ?? 0;
    const animate = ctx?.animate ?? true;
    const reversed = useContext(SpotlightReversedContext);

    // `reversed` swaps the columns, so it has to swap the side the copy slides
    // in from too — otherwise it enters from where the image used to be.
    const flipped = (index % 2 === 1) !== reversed;
    const animation = flipped ? "fade-left" : "fade-right";

    // `ref` always lands on `.spotlight-content`; which element it pointed at
    // used to be decided by the root's `animate`, two components up.
    const inner = (
      <div ref={ref} className={cn("spotlight-content", className)} {...props}>
        {children}
      </div>
    );

    if (!animate) {
      return inner;
    }

    return <ScrollReveal animation={animation}>{inner}</ScrollReveal>;
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
