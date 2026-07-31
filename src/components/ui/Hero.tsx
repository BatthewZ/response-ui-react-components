import { Children, type ComponentPropsWithRef, forwardRef, isValidElement } from "react";

import { Parallax } from "../animation/Parallax";
import { ScrollReveal } from "../animation/ScrollReveal";
import { Stagger } from "../animation/Stagger";
import { cn, type SlotClassNames } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Size / alignment maps                                              */
/* ------------------------------------------------------------------ */

type HeroSize = "sm" | "md" | "lg" | "full";
type HeroAlign = "start" | "center" | "end";

/**
 * The BEM names survive as declaration-free markers — a consumer stylesheet,
 * devtools and Astro/Rails consumers of `response-ui-css` still find one name
 * per variant — and the utility beside each one is what paints it.
 *
 * `hero--full` was `min-height: 100vh` followed by `min-height: 100dvh`, a
 * progressive-enhancement pair. Only `min-h-dvh` survives, and the fallback is
 * not a loss: two utilities setting the same property resolve by Tailwind's sort
 * order rather than by the browser dropping the one it cannot parse, so the pair
 * does not transpose — and every engine Tailwind 4 itself supports (Safari 16.4,
 * Chrome 111, Firefox 128) has had `dvh` since well before that. The fallback
 * was already dead weight in a v4 build.
 */
const sizeClass: Record<HeroSize, string> = {
  sm: "hero--sm min-h-[40vh]",
  md: "hero--md min-h-[60vh]",
  lg: "hero--lg min-h-[80vh]",
  full: "hero--full min-h-dvh",
};

const alignClass: Record<HeroAlign, string> = {
  start: "hero--align-start items-start",
  center: "hero--align-center items-center",
  end: "hero--align-end items-end",
};

/**
 * `Hero.css` keeps the two `.stagger-item` rules and says why; everything else
 * is here. Each constant is one flat string literal because the docs and focus
 * guards resolve hoisted constants textually and a composed one would not
 * resolve.
 */
const heroClasses = "relative flex w-full overflow-hidden";

/** It is a paint, not a hit target — anything under it stays clickable. The
 *  fallback matches `CommandPalette`: without the token layer the scrim would
 *  otherwise be transparent rather than 50% black. */
const heroOverlayClasses =
  "pointer-events-none absolute inset-0 bg-[var(--OVERLAY-SCRIM-COLOR,rgb(0_0_0_/_0.5))]";

const heroContentClasses = "relative z-10 w-full p-r3 sm:p-r2 lg:p-r1";

/* ------------------------------------------------------------------ */
/*  Hero (root)                                                        */
/* ------------------------------------------------------------------ */

type HeroProps = {
  size?: HeroSize;
  /**
   * Paint the darkening scrim. Defaults to whether a `Hero.Background` is among
   * the children — a hero with no photograph has nothing to darken, and the
   * scrim would only dim its own copy.
   */
  overlay?: boolean;
  align?: HeroAlign;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * `<section>`, and `Hero.Background` / `Hero.Content` take their own — so the
   * scrim is the one element nothing else reaches. The union is written out here
   * so an unknown key is a type error rather than a silently ignored one.
   */
  classNames?: SlotClassNames<"overlay">;
} & Omit<ComponentPropsWithRef<"section">, "size">;

const HeroRoot = forwardRef<HTMLElement, HeroProps>(function Hero(
  { size = "md", overlay, align = "end", className, classNames, children, ...props },
  ref
) {
  const hasBackground = Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === HeroBackground
  );
  const showOverlay = overlay ?? hasBackground;

  return (
    <section
      ref={ref}
      className={cn("hero", heroClasses, sizeClass[size], alignClass[align], className)}
      {...props}
    >
      {children}
      {showOverlay && (
        <div aria-hidden="true" className={cn("hero__overlay", heroOverlayClasses, classNames?.overlay)} />
      )}
    </section>
  );
});

/* ------------------------------------------------------------------ */
/*  Hero.Background                                                    */
/* ------------------------------------------------------------------ */

type HeroBackgroundProps = {
  src?: string;
  alt?: string;
  parallax?: boolean;
  parallaxRate?: number;
  /**
   * Props for the `<img>` itself. The rest of the bag lands on the wrapper, so
   * `loading`, `fetchPriority`, `srcSet`, `sizes`, `width`/`height` and
   * `decoding` need this — a hero background is usually the page's LCP element
   * and none of them was reachable before. Its `className` merges after the
   * component's own, so `object-contain` beats the default `object-cover`.
   */
  imgProps?: Omit<ComponentPropsWithRef<"img">, "src" | "alt">;
} & Omit<ComponentPropsWithRef<"div">, "children">;

const HeroBackground = forwardRef<HTMLDivElement, HeroBackgroundProps>(function HeroBackground(
  { src, alt, parallax = false, parallaxRate, imgProps, className, ...props },
  ref
) {
  const image = src ? (
    <img
      {...imgProps}
      src={src}
      alt={alt ?? ""}
      role={alt ? undefined : "presentation"}
      className={cn("size-full object-cover", imgProps?.className)}
    />
  ) : null;

  // With no `src` there is nothing to drift, so the client Parallax wrapper (an
  // effect, a scroll listener and a compositor layer) does not get mounted.
  const inner = image && parallax ? (
    <Parallax
      rate={parallaxRate}
      // slot:(a) the drift shim. Its one class makes the transformed layer fill
      // the background box; anything else detaches the photograph from the frame
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
      className={cn(
        "hero__background absolute",
        // Ternary, not `inset-0` plus an override: two utilities setting the same
        // property resolve by Tailwind's sort order, and `cn()`'s merge does not
        // treat `inset-y` as superseding `inset`. Emitting one or the other is
        // the same computed box with nothing left to a tie-break.
        image && parallax ? "hero__background--parallax -inset-y-1/2 inset-x-0" : "inset-0",
        className
      )}
      {...props}
    >
      {inner}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Hero.Content                                                       */
/* ------------------------------------------------------------------ */

type HeroContentAnimation = "fade-up" | "fade-in" | "scale";

type HeroContentProps = {
  animate?: boolean;
  animation?: HeroContentAnimation;
} & Omit<ComponentPropsWithRef<"div">, "animation">;

const HeroContent = forwardRef<HTMLDivElement, HeroContentProps>(function HeroContent(
  { animate = false, animation = "fade-up", className, children, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn("hero__content", heroContentClasses, className)} {...props}>
      {animate ? (
        <ScrollReveal animation={animation}>
          <Stagger>{children}</Stagger>
        </ScrollReveal>
      ) : (
        children
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const Hero = Object.assign(HeroRoot, {
  Background: HeroBackground,
  Content: HeroContent,
});
