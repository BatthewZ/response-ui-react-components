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

type Animation = "fade-up" | "fade-in" | "fade-left" | "fade-right" | "scale";

const animationClassMap: Record<Animation, string> = {
  "fade-up": "fade-up",
  "fade-in": "fade-in",
  "fade-left": "fade-left",
  "fade-right": "fade-right",
  scale: "scale-in",
};

type ScrollRevealProps = {
  animation?: Animation;
  threshold?: number;
  delay?: number;
  once?: boolean;
  rootMargin?: string;
  /**
   * Run the scroll-triggered reveal at all. The reveal's server-rendered markup
   * is `opacity: 0` until an `IntersectionObserver` fires, so content that must
   * be readable without JS needs `animate={false}` — the same opt-out
   * `Swimlane` exposes.
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
    if (!node || !animate || reducedMotion || typeof IntersectionObserver === "undefined") return;

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
