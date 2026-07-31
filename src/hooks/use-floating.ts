"use client";
import {
  arrow,
  autoUpdate,
  flip,
  offset,
  type Placement,
  shift,
  useFloating as useFloatingUI,
} from "@floating-ui/react";

export type { Placement };

interface UseFloatingConfig {
  placement?: Placement;
  offsetPx?: number;
  /**
   * The pointer triangle to position, if the surface renders one. Typed
   * `Element | null` because that is what `useRef<HTMLDivElement>(null)` produces
   * — the previous `RefObject<Element>` could not receive one without a cast.
   */
  arrowRef?: React.RefObject<Element | null>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** The side of the floating element that faces the reference — where its arrow sits. */
export type ArrowSide = "top" | "right" | "bottom" | "left";

const arrowSideForPlacement: Record<ArrowSide, ArrowSide> = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
};

/**
 * Pins the arrow against the panel edge facing the reference, half of it
 * overlapping the panel. `translate` is a percentage of the arrow's own box, so
 * this stays correct when a consumer resizes the element — which is also what
 * keeps floating-ui's centring correct, since the middleware measures it.
 */
const arrowStaticSideStyle: Record<ArrowSide, React.CSSProperties> = {
  top: { top: 0, translate: "0 -50%" },
  bottom: { bottom: 0, translate: "0 50%" },
  left: { left: 0, translate: "-50% 0" },
  right: { right: 0, translate: "50% 0" },
};

/**
 * Geometry for a floating surface's arrow, from what `useFloating` already
 * returns — `middlewareData.arrow` and the *resolved* placement, so a flip
 * carries the arrow with it.
 *
 * Written here rather than in each surface because the maths is identical for
 * all three, and because only the measured cross-axis offset belongs inline: the
 * arrow's size, rotation, fill and borders stay in CSS, where a consumer's
 * `classNames.arrow` can still out-rank them.
 */
export function floatingArrowProps(
  placement: Placement,
  arrowData: { x?: number; y?: number } | undefined
): { "data-side": ArrowSide; style: React.CSSProperties } {
  const side = arrowSideForPlacement[placement.split("-")[0] as ArrowSide];
  return {
    "data-side": side,
    style: {
      // The measured cross-axis offset first, the edge pin last: floating-ui
      // reports only the axis it centres on, but the pin must win either way.
      ...(arrowData?.x != null && { left: `${arrowData.x}px` }),
      ...(arrowData?.y != null && { top: `${arrowData.y}px` }),
      ...arrowStaticSideStyle[side],
    },
  };
}

export function useFloating(config: UseFloatingConfig = {}) {
  const { placement = "bottom", offsetPx = 8, arrowRef, open, onOpenChange } = config;

  const middleware = [
    offset(offsetPx),
    flip(),
    shift({ padding: 8 }),
    ...(arrowRef ? [arrow({ element: arrowRef })] : []),
  ];

  return useFloatingUI({
    placement,
    middleware,
    whileElementsMounted: autoUpdate,
    open,
    onOpenChange,
  });
}

export {
  FloatingFocusManager,
  FloatingPortal,
  safePolygon,
  useClick,
  useDismiss,
  useFocus,
  useHover,
  useInteractions,
  useListNavigation,
  useRole,
  useTransitionStyles,
  useTypeahead,
} from "@floating-ui/react";
