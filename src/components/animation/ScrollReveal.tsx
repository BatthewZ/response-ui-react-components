"use client";
import {
  type AnimationEvent,
  type ComponentPropsWithoutRef,
  type ElementType,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";

type Animation = "fade-up" | "fade-in" | "fade-left" | "fade-right" | "scale" | "none";

const animationClassMap: Record<Animation, string> = {
  "fade-up": "fade-up",
  "fade-in": "fade-in",
  "fade-left": "fade-left",
  "fade-right": "fade-right",
  scale: "scale-in",
  // Reveal without an entrance class. The caller owns the animation and keys it
  // off `data-entering`; see the prop docs below.
  none: "",
};

type ScrollRevealProps = {
  /**
   * Which shared entrance class from `@batthewz/response-ui-css` to apply while
   * the reveal is playing.
   *
   * `"none"` reveals with no entrance class at all, leaving the animation to the
   * caller's own stylesheet keyed on `data-entering`. That is how `Timeline`
   * drives its alternating direction: the foundation's `.fade-*` classes are
   * unlayered, so from `@layer components` no rule here can re-point their
   * `animation-name`, and a component that needs to has to stop emitting them.
   *
   * Under `"none"`, `data-entering` clears only if that stylesheet actually
   * animates — no animation means no `animationend`, so the marker latches on for
   * the element's life. Nothing here reads it, so it is inert rather than wrong.
   */
  animation?: Animation;
  threshold?: number;
  delay?: number;
  once?: boolean;
  rootMargin?: string;
  /**
   * Run the scroll-triggered reveal at all. A missing `IntersectionObserver`
   * reveals on mount and scripting-off reveals in CSS, but the server-rendered
   * markup is still `opacity: 0` for a page that should hydrate and does not, so
   * content that must always be readable needs `animate={false}` — the same
   * opt-out `Swimlane` exposes.
   */
  animate?: boolean;
  className?: string;
  children?: ReactNode;
  as?: ElementType;
};

/** What the implementation destructures. The public signature is the cast below. */
type ScrollRevealImplProps = ScrollRevealProps & ComponentPropsWithoutRef<"div">;

export const ScrollReveal = forwardRef<HTMLElement, ScrollRevealImplProps>(function ScrollReveal(
  {
    animation = "fade-up",
    threshold = 0.1,
    delay = 0,
    once = true,
    rootMargin = "0px",
    animate = true,
    className,
    children,
    as: Tag = "div",
    style,
    onAnimationEnd,
    ...rest
  },
  forwardedRef
) {
  const innerRef = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [animating, setAnimating] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const setRefs = mergeRefs(innerRef, forwardedRef);

  useEffect(() => {
    const node = innerRef.current;
    if (!node || !animate || reducedMotion) return;

    // Nothing will ever clear the hidden state where the observer API does not
    // exist, so the content would stay at `opacity: 0` for the life of the page.
    // Reveal it instead — statically, because a reveal with no trigger has no
    // entrance to play. Same shape as the reduced-motion path above.
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          setAnimating(true);
          if (once) {
            observer.unobserve(node);
          }
        } else if (!once) {
          setRevealed(false);
          setAnimating(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once, reducedMotion, animate]);

  const handleAnimationEnd = useCallback(
    (e: AnimationEvent<HTMLDivElement>) => {
      // Only handle our own animation, not bubbled events from children
      if (e.target === e.currentTarget) {
        setAnimating(false);
      }
      onAnimationEnd?.(e);
    },
    [onAnimationEnd]
  );

  const isHidden = animate && !reducedMotion && !revealed;
  const isAnimating = animate && animating;
  const delayStyle =
    isAnimating && delay > 0 && !reducedMotion
      ? { animationDelay: `${delay}ms`, animationFillMode: "backwards" as const }
      : undefined;

  return (
    <Tag
      {...rest}
      ref={setRefs}
      className={cn(
        isHidden && "scroll-reveal-hidden",
        isAnimating && animationClassMap[animation],
        className
      )}
      // The entrance window as an attribute, not only as a class. It marks
      // exactly the same interval `animationClassMap[animation]` does — set on
      // intersection, cleared on `animationend` — so a stylesheet can key an
      // entrance off it without this component having to emit a foundation
      // `.fade-*` class it cannot out-rank. Public: `Timeline.css` depends on it.
      // After the spread, because it is derived state, not a caller's to set.
      data-entering={isAnimating || undefined}
      style={delayStyle || style ? { ...style, ...delayStyle } : undefined}
      onAnimationEnd={handleAnimationEnd}
    >
      {children}
    </Tag>
  );
}) as <T extends ElementType = "div">(
  props: ScrollRevealProps & { as?: T } & Omit<
      React.ComponentPropsWithRef<T>,
      keyof ScrollRevealProps | "as"
    >
) => React.JSX.Element;
