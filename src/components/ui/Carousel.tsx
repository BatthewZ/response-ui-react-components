"use client";
import {
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";
import { composeEventHandlers } from "../../util/merge-props";
import { mergeRefs } from "../../util/merge-refs";
import { cn, type SlotClassNames } from "../../util/style";

import { IconButton } from "./IconButton";

/** +1 in LTR, -1 in RTL — the sign `scrollLeft` moves in to advance one frame. */
function readingDirection(track: HTMLElement): 1 | -1 {
  return getComputedStyle(track).direction === "rtl" ? -1 : 1;
}

function frameWidth(track: HTMLElement): number {
  const peek = parseFloat(getComputedStyle(track).paddingInlineStart) || 0;
  return track.clientWidth - peek;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type CarouselContextValue = {
  trackRef: RefObject<HTMLDivElement | null>;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  scrollPrev: () => void;
  scrollNext: () => void;
};

const CarouselContext = createContext<CarouselContextValue | null>(null);

function useCarouselContext() {
  const ctx = useContext(CarouselContext);
  if (!ctx) throw new Error("Carousel compound components must be used within <Carousel>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Carousel (root)                                                    */
/* ------------------------------------------------------------------ */

type CarouselProps = {
  title?: ReactNode;
  /** Accessible name of the previous-frame arrow. */
  prevLabel?: string;
  /** Accessible name of the next-frame arrow. */
  nextLabel?: string;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * root; `Carousel.Track` and `Carousel.Item` take their own — so these four
   * reach the chrome the root builds around them. The union is written out here
   * so an unknown key is a type error rather than a silently ignored one.
   *
   * `prev` and `next` are separate keys because they are separate roles: hiding
   * one is a normal thing to want, and a single key for both cannot express it.
   */
  classNames?: SlotClassNames<"title" | "viewport" | "prev" | "next">;
} & Omit<ComponentPropsWithRef<"div">, "title">;

const CarouselRoot = forwardRef<HTMLDivElement, CarouselProps>(function Carousel(
  {
    title,
    prevLabel = "Previous",
    nextLabel = "Next",
    className,
    classNames,
    children,
    onKeyDown,
    ...props
  },
  ref
) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    // `scrollLeft` runs negative under `dir="rtl"`; distance from the start edge
    // is its magnitude either way.
    const fromStart = Math.abs(track.scrollLeft);
    setCanScrollPrev(fromStart > 0);
    setCanScrollNext(fromStart + track.clientWidth < track.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Initial check
    updateScrollState();

    // Scroll listener with rAF debounce
    let rafId = 0;
    function handleScroll() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateScrollState);
    }

    track.addEventListener("scroll", handleScroll, { passive: true });

    // Resize observer for dynamic content
    const observer = new ResizeObserver(() => {
      updateScrollState();
    });
    observer.observe(track);

    return () => {
      track.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [updateScrollState]);

  // An explicit `behavior: "smooth"` outranks the `scroll-behavior: auto` the
  // reduced-motion block sets, so the preference has to be read here too.
  const behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";

  const scrollPrev = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    track.scrollBy({ left: -readingDirection(track) * frameWidth(track), behavior });
  }, [behavior]);

  const scrollNext = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    track.scrollBy({ left: readingDirection(track) * frameWidth(track), behavior });
  }, [behavior]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Keydown bubbles, so without this an arrow pressed in an input, slider or
      // listbox inside a slide would page the rail and swallow the keystroke.
      // The root is its own tab stop, so paging is still reachable.
      if (e.target !== e.currentTarget) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext]
  );

  const baseId = useId();
  const titleId = title ? `${baseId}-carousel-title` : undefined;

  return (
    <CarouselContext.Provider
      value={{ trackRef, canScrollPrev, canScrollNext, scrollPrev, scrollNext }}
    >
      <div
        ref={ref}
        className={cn("carousel", className)}
        // ARIA prohibits `aria-roledescription` and a name on the implicit
        // `generic` role, so the root has to carry a real one.
        role="group"
        aria-roledescription="carousel"
        aria-label={titleId ? undefined : "Carousel"}
        aria-labelledby={titleId}
        tabIndex={0}
        onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown)}
        {...props}
      >
        {title && (
          <div id={titleId} className={cn("carousel-title", classNames?.title)}>
            {title}
          </div>
        )}
        {/* Viewport wraps the track + arrows so the arrows center on the
            track itself, not the title-inclusive root. */}
        <div className={cn("carousel-viewport", classNames?.viewport)}>
          {children}
          <IconButton
            aria-label={prevLabel}
            className={cn("carousel-arrow carousel-arrow--prev", classNames?.prev)}
            // Hidden by opacity alone, an end-of-rail arrow stayed in the tab
            // order as an invisible no-op button.
            disabled={!canScrollPrev}
            data-hidden={!canScrollPrev}
            onClick={scrollPrev}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
          <IconButton
            aria-label={nextLabel}
            className={cn("carousel-arrow carousel-arrow--next", classNames?.next)}
            disabled={!canScrollNext}
            data-hidden={!canScrollNext}
            onClick={scrollNext}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconButton>
        </div>
      </div>
    </CarouselContext.Provider>
  );
});

/* ------------------------------------------------------------------ */
/*  Carousel.Track                                                     */
/* ------------------------------------------------------------------ */

type CarouselTrackProps = ComponentPropsWithRef<"div">;

const CarouselTrack = forwardRef<HTMLDivElement, CarouselTrackProps>(function CarouselTrack(
  { className, onMouseDown, onClickCapture, onDragStart, ...props },
  forwardedRef
) {
  const { trackRef } = useCarouselContext();
  const reducedMotion = usePrefersReducedMotion();
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startScroll: 0,
    didDrag: false,
    velocity: 0,
    prevX: 0,
    prevTime: 0,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      onMouseDown?.(e);
      if (e.button !== 0) return; // left click only
      // No `preventDefault()` here: on mousedown it also suppresses native focus
      // and caret placement, which made every form control inside a slide
      // unfocusable by mouse. The native image drag is cancelled in `dragstart`
      // instead, and text selection by `user-select: none` while dragging.
      const track = trackRef.current;
      if (!track) return;

      const now = performance.now();
      dragState.current = {
        isDragging: true,
        startX: e.clientX,
        startScroll: track.scrollLeft,
        didDrag: false,
        prevX: e.clientX,
        prevTime: now,
        velocity: 0,
      };
      track.classList.add("carousel-track--dragging");
    },
    [onMouseDown, trackRef]
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function handleMouseMove(e: MouseEvent) {
      const state = dragState.current;
      if (!state.isDragging) return;

      const now = performance.now();
      const dt = now - state.prevTime;

      const dx = e.clientX - state.startX;
      if (Math.abs(dx) > 3) state.didDrag = true;
      track!.scrollLeft = state.startScroll - dx;

      // Track velocity (px/ms), smoothed with previous value
      if (dt > 0) {
        const instantVelocity = (state.prevX - e.clientX) / dt;
        state.velocity = 0.7 * instantVelocity + 0.3 * state.velocity;
      }
      state.prevX = e.clientX;
      state.prevTime = now;
    }

    function handleMouseUp() {
      const state = dragState.current;
      if (!state.isDragging) return;
      state.isDragging = false;
      track!.classList.remove("carousel-track--dragging");

      const elapsed = performance.now() - state.prevTime;
      const hasVelocity = elapsed < 100 && Math.abs(state.velocity) > 0.1;

      if (hasVelocity) {
        // Animate from current drag position directly to one frame away
        // from where the drag started — same distance as the arrow buttons.
        const frameSize = frameWidth(track!);
        const target =
          state.velocity > 0 ? state.startScroll + frameSize : state.startScroll - frameSize;
        track!.scrollTo({ left: target, behavior: reducedMotion ? "auto" : "smooth" });
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [trackRef, reducedMotion]);

  const handleClickCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Prevent click on children after a drag
      if (dragState.current.didDrag) {
        e.preventDefault();
        e.stopPropagation();
        dragState.current.didDrag = false;
        return;
      }
      onClickCapture?.(e);
    },
    [onClickCapture]
  );

  return (
    <div
      ref={mergeRefs(forwardedRef, trackRef)}
      role="region"
      aria-label="Carousel items"
      className={cn("carousel-track", className)}
      onMouseDown={handleMouseDown}
      onDragStart={composeEventHandlers(onDragStart, (e) => e.preventDefault())}
      onClickCapture={handleClickCapture}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------ */
/*  Carousel.Item                                                      */
/* ------------------------------------------------------------------ */

type CarouselItemProps = ComponentPropsWithRef<"div">;

const CarouselItem = forwardRef<HTMLDivElement, CarouselItemProps>(function CarouselItem(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn("carousel-item", className)}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const Carousel = Object.assign(CarouselRoot, {
  Track: CarouselTrack,
  Item: CarouselItem,
});
