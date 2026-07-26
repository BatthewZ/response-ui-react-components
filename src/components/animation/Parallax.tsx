"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";
import { mergeRefs } from "../../util/merge-refs";

type ParallaxProps = {
  rate?: number;
  clamp?: number;
  children: ReactNode;
} & ComponentPropsWithRef<"div">;

/** Promote the layer before it scrolls in, so the hint lands ahead of the movement. */
const LAYER_MARGIN = "200px";

export const Parallax = forwardRef<HTMLDivElement, ParallaxProps>(function Parallax(
  { rate, clamp, className, children, style, ...rest },
  ref
) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const rafId = useRef<number>(0);
  const currentOffset = useRef(0);
  const reducedMotion = usePrefersReducedMotion();
  // Starts `false` on both server and client so hydration sees one style
  // attribute; the effect below promotes as soon as it knows the answer.
  const [promoted, setPromoted] = useState(false);

  const update = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // Subtract current transform so we compute from the layout position,
    // not the visually-shifted position (getBoundingClientRect includes transforms).
    const layoutTop = rect.top - currentOffset.current;
    const viewportCenter = window.innerHeight / 2;
    const elCenter = layoutTop + rect.height / 2;
    const distance = elCenter - viewportCenter;

    const effectiveRate = rate ?? 0.3;
    let offset = distance * effectiveRate;

    if (clamp != null) {
      offset = Math.max(-clamp, Math.min(clamp, offset));
    }

    currentOffset.current = offset;
    el.style.transform = `translateY(${offset}px)`;
  }, [rate, clamp]);

  useEffect(() => {
    if (reducedMotion || typeof window === "undefined") return;

    function schedule() {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(update);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    // `viewportCenter` is read from `window.innerHeight`, so a viewport that
    // changes height without scrolling leaves the applied offset stale.
    window.addEventListener("resize", schedule);
    update();

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(rafId.current);
      // The transform is written imperatively, so React does not own it and
      // nothing else would undo it: without this, turning reduced motion on
      // mid-scroll freezes the layer wherever it had drifted to.
      currentOffset.current = 0;
      if (innerRef.current) innerRef.current.style.transform = "";
    };
  }, [update, reducedMotion]);

  useEffect(() => {
    const el = innerRef.current;
    if (reducedMotion) {
      setPromoted(false);
      return;
    }
    // Without an observer the hint is the only way to get a layer at all, so
    // fall back to promoting for the element's life rather than never.
    if (!el || typeof IntersectionObserver === "undefined") {
      setPromoted(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setPromoted(entry?.isIntersecting ?? false),
      { rootMargin: LAYER_MARGIN }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={mergeRefs(innerRef, ref)}
      className={className}
      style={{
        ...style,
        // A permanent hint parks a compositor layer for the element's whole
        // life; scoped to the viewport it costs one only while it can move.
        willChange: promoted ? "transform" : undefined,
      }}
      {...rest}
    >
      {children}
    </div>
  );
});
