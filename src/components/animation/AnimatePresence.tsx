"use client";
import {
  type AnimationEvent,
  type ComponentPropsWithRef,
  forwardRef,
  type ReactNode,
  useState,
} from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";
import { cn } from "../../util/style";

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
        ref={ref}
        className={cn(animClass, className)}
        onAnimationEnd={handleAnimationEnd}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
