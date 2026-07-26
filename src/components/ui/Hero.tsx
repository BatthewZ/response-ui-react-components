import { Children, type ComponentPropsWithRef, forwardRef, isValidElement } from "react";

import { Parallax } from "../animation/Parallax";
import { ScrollReveal } from "../animation/ScrollReveal";
import { Stagger } from "../animation/Stagger";
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Size / alignment maps                                              */
/* ------------------------------------------------------------------ */

type HeroSize = "sm" | "md" | "lg" | "full";
type HeroAlign = "start" | "center" | "end";

const sizeClass: Record<HeroSize, string> = {
  sm: "hero--sm",
  md: "hero--md",
  lg: "hero--lg",
  full: "hero--full",
};

const alignClass: Record<HeroAlign, string> = {
  start: "hero--align-start",
  center: "hero--align-center",
  end: "hero--align-end",
};

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
} & Omit<ComponentPropsWithRef<"section">, "size">;

const HeroRoot = forwardRef<HTMLElement, HeroProps>(function Hero(
  { size = "md", overlay, align = "end", className, children, ...props },
  ref
) {
  const hasBackground = Children.toArray(children).some(
    (child) => isValidElement(child) && child.type === HeroBackground
  );
  const showOverlay = overlay ?? hasBackground;

  return (
    <section
      ref={ref}
      className={cn("hero", sizeClass[size], alignClass[align], className)}
      {...props}
    >
      {children}
      {showOverlay && <div aria-hidden="true" className="hero__overlay" />}
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
} & Omit<ComponentPropsWithRef<"div">, "children">;

const HeroBackground = forwardRef<HTMLDivElement, HeroBackgroundProps>(function HeroBackground(
  { src, alt, parallax = false, parallaxRate, className, ...props },
  ref
) {
  const image = src ? (
    <img
      src={src}
      alt={alt ?? ""}
      role={alt ? undefined : "presentation"}
      className="size-full object-cover"
    />
  ) : null;

  // With no `src` there is nothing to drift, so the client Parallax wrapper (an
  // effect, a scroll listener and a compositor layer) does not get mounted.
  const inner = image && parallax ? (
    <Parallax rate={parallaxRate} className="size-full">
      {image}
    </Parallax>
  ) : (
    image
  );

  return (
    <div
      ref={ref}
      className={cn("hero__background", image && parallax && "hero__background--parallax", className)}
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
    <div ref={ref} className={cn("hero__content", className)} {...props}>
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
