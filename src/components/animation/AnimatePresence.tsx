"use client";
import {
  type AnimationEvent,
  type ComponentPropsWithRef,
  forwardRef,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";

/** Grace period on top of the exit animation's own timing before the fallback unmounts. */
const EXIT_FALLBACK_SLACK_MS = 100;

/** Longest time in a comma-separated `<time>` list, in ms. `auto`/`normal` count as 0. */
function longestTimeMs(list: string): number {
  let max = 0;
  for (const entry of list.split(",")) {
    const value = entry.trim();
    const amount = Number.parseFloat(value);
    if (Number.isNaN(amount)) continue;
    const ms = value.endsWith("ms") ? amount : amount * 1000;
    if (ms > max) max = ms;
  }
  return max;
}

/** How long the element's declared animation can still run for. */
function remainingAnimationMs(node: HTMLElement): number {
  const style = getComputedStyle(node);
  if (style.animationName === "none") return 0;
  return longestTimeMs(style.animationDuration) + longestTimeMs(style.animationDelay);
}

type AnimatePresenceProps = {
  show: boolean;
  enterClass?: string;
  exitClass?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithRef<"div">, "children">;

export const AnimatePresence = forwardRef<HTMLDivElement, AnimatePresenceProps>(
  function AnimatePresence(
    {
      show,
      enterClass = "fade-in",
      exitClass = "fade-out",
      className,
      children,
      onAnimationEnd,
      ...rest
    },
    ref
  ) {
    const [mounted, setMounted] = useState(show);
    const [phase, setPhase] = useState<"enter" | "exit" | null>(show ? "enter" : null);
    const [prevShow, setPrevShow] = useState(show);
    const reducedMotion = usePrefersReducedMotion();
    const innerRef = useRef<HTMLDivElement | null>(null);
    const setRefs = mergeRefs(innerRef, ref);

    // Derive state from props during render (React-recommended pattern)
    if (show !== prevShow) {
      setPrevShow(show);
      if (show) {
        setMounted(true);
        setPhase("enter");
      } else if (mounted) {
        if (reducedMotion) {
          setMounted(false);
          setPhase(null);
        } else {
          setPhase("exit");
        }
      }
    }

    // The unmount is driven by the wrapper's own `animationend`, so an `exitClass`
    // that runs no animation would leave the element on screen forever. Fall back
    // to a timer sized from whatever animation the element actually declares.
    useEffect(() => {
      if (phase !== "exit" || show) return;
      const node = innerRef.current;
      const wait = (node ? remainingAnimationMs(node) : 0) + EXIT_FALLBACK_SLACK_MS;
      const timer = setTimeout(() => {
        setMounted(false);
        setPhase(null);
      }, wait);
      return () => clearTimeout(timer);
    }, [phase, show]);

    function handleAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
      onAnimationEnd?.(e);
      // Only unmount on our own animation; `animationend` bubbles, so a child finishing
      // its animation mid-exit would otherwise cut the exit short.
      if (e.target !== e.currentTarget) return;
      if (phase === "exit" && !show) {
        setMounted(false);
        setPhase(null);
      }
    }

    if (!mounted) return null;

    const animClass = reducedMotion
      ? undefined
      : phase === "enter"
        ? enterClass
        : phase === "exit"
          ? exitClass
          : undefined;

    return (
      <div
        ref={setRefs}
        className={cn(animClass, className)}
        onAnimationEnd={handleAnimationEnd}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
