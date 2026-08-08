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
import { useEffect, useMemo, useState } from "react";

export type { Placement };

/**
 * Where a floating panel has to be portalled so that it is both visible and
 * clickable.
 *
 * `FloatingPortal`'s default is `<body>`, and inside a modal `<dialog>` that is
 * wrong twice over. `showModal()` promotes the dialog to the **top layer**, a
 * paint phase above the whole document that no `z-index` reaches — and it makes
 * everything outside the dialog **inert**, so a body-level panel takes no click
 * even when something else lifts it into view. Both are spec behaviour, so
 * neither is a browser to work around. Only being a DOM descendant of the dialog
 * answers both, which is what this returns.
 *
 * Read off the reference element rather than injected by `Dialog`/`Drawer`,
 * because the ancestor that matters is any `<dialog>` — including one the
 * consumer wrote themselves, which no context of ours would reach.
 *
 * The three return values are floating-ui's own vocabulary, and the distinction
 * between the last two is load-bearing:
 *
 * - an element — portal into it.
 * - `undefined` — no dialog ancestor; portal into `<body>`, exactly as before.
 * - `null` — *wait*. `useFloatingPortalNode` creates no node while the root is
 *   `null` and never moves one afterwards, so a panel already open on its first
 *   render would otherwise be pinned to `<body>` by the commit that runs before
 *   floating-ui has told us what the reference element is.
 *
 * **The wait is bounded to that first commit, and that is not a detail.** A
 * reference floating-ui never accepts leaves this `null` forever, and a portal
 * that waits forever renders *nothing* — which is worse than the bug being fixed,
 * because the trigger still reports `aria-expanded="true"`. It happens for real:
 * `asChild` with a child whose ref is not a DOM element (a class component) makes
 * `setReference` ignore the node, so `domReference` stays null for the component's
 * whole life. After mount, an unresolved reference therefore degrades to `<body>`
 * — the old behaviour — rather than to silence.
 *
 * `[open]` is deliberately not part of the selector. The children of a `Drawer`
 * stay mounted while it is closed, so a trigger commonly resolves its root
 * before the dialog has ever been opened.
 */
function useDialogPortalRoot(reference: Element | null): HTMLElement | null | undefined {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return useMemo(() => {
    if (reference) return reference.closest("dialog") ?? undefined;
    return mounted ? undefined : null;
  }, [reference, mounted]);
}

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

  const floating = useFloatingUI({
    placement,
    middleware,
    whileElementsMounted: autoUpdate,
    open,
    onOpenChange,
  });

  // `domReference`, not `reference`: ContextMenu positions against a virtual
  // reference at the cursor, which has no place in the DOM to ask about.
  const portalRoot = useDialogPortalRoot(floating.elements.domReference);

  return { ...floating, portalRoot };
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
