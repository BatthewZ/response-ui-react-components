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
import { useEffect, useLayoutEffect, useMemo, useState } from "react";

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

/**
 * The marker the top-layer reset is written against. Added here rather than in
 * each surface's `className` because the reset must apply exactly when the
 * promotion does — one effect owns both, so they cannot drift apart.
 *
 * `components/ui/floating-top-layer.css` holds the rules and says why each one
 * is needed.
 */
const TOP_LAYER_CLASS = "floating-top-layer";

/**
 * Whether this engine can promote an element into the top layer on its own.
 * `popover` is Baseline 2024.
 *
 * One answer, read by both halves of the change, and that is the point. The
 * promotion and `strategy: "fixed"` are a pair: fixed positioning alone escapes
 * a plain `Dialog`'s clip — a fixed box is not bounded by an ancestor scrollport
 * — but not a `Drawer`'s, because `Drawer` slides in on a `transform`, and a
 * transformed ancestor becomes the containing block for fixed descendants and
 * clips them again. Gating only the promotion on this therefore produced a THIRD
 * behaviour on an older engine rather than the previous one: measured as 13 of 14
 * menu items in a `Dialog` and still clipped in a `Drawer`. The fallback owes the
 * user the behaviour that shipped before, not a half of the new one.
 *
 * SSR-safe, and it cannot desync hydration: `topLayer` starts `false` and only
 * moves in a layout effect, so the first client render matches the server's
 * whatever this returns.
 */
function supportsTopLayerPromotion(): boolean {
  return (
    typeof HTMLElement !== "undefined" && typeof HTMLElement.prototype.showPopover === "function"
  );
}

/**
 * Promotes a panel that is already inside a `<dialog>` into the top layer in
 * its own right, so the dialog stops clipping it.
 *
 * `dialog:modal` carries `overflow: auto` in the **user agent** stylesheet, so
 * a modal dialog is a scrollport and bounds every descendant — and the panel has
 * to *be* a descendant, or `showModal()`'s inert subtree swallows the click (see
 * `useDialogPortalRoot`). `popover` is the one thing that answers both at once:
 * it lifts the element into the top layer, which takes it out of its ancestors'
 * clip, while leaving it a **flat-tree** descendant of the dialog, so it stays
 * interactive. Floating UI knows the same trick from the other side —
 * `isTopLayer()` returns no clipping ancestors at all for such an element, so
 * `flip`/`shift` go back to measuring against the viewport.
 *
 * `manual`, not `auto`, so dismissal stays entirely with `useDismiss` and the
 * platform's own light-dismiss and popover stack never take part. That is not a
 * precaution: measured in Chromium, `auto` leaves a `Popover` containing a
 * `Tooltip` inside a `Dialog` **permanently hidden** — attached, carrying the
 * attribute, never matching `:popover-open`, because the platform closes it on the
 * very click that opened it. A single panel in a `Drawer` shows no difference at
 * all under the same change, which is why the probe grew the nested composition:
 * `probe:floating-in-dialog`, case *"Popover in a plain Dialog"*.
 *
 * The attribute and `showPopover()` are one step, in that order:
 * `[popover]:not(:popover-open) { display: none }` is a UA rule, so an element
 * that carries the attribute and is not yet showing renders nothing at all —
 * which is why a failed promotion has to take the attribute back off with it.
 *
 * `enabled` already carries the feature detect — see `supportsTopLayerPromotion`,
 * which the positioning strategy reads from the same call so the two can never
 * disagree.
 */
function useTopLayer(floating: HTMLElement | null, enabled: boolean): void {
  useLayoutEffect(() => {
    if (!enabled || !floating) return;

    floating.classList.add(TOP_LAYER_CLASS);
    floating.setAttribute("popover", "manual");
    try {
      floating.showPopover();
    } catch {
      floating.classList.remove(TOP_LAYER_CLASS);
      floating.removeAttribute("popover");
      return;
    }

    return () => {
      // Detaching the node already takes it out of the top layer, and
      // `hidePopover()` on an element that is no longer showing throws.
      try {
        floating.hidePopover();
      } catch {
        /* already out of the top layer */
      }
      floating.classList.remove(TOP_LAYER_CLASS);
      floating.removeAttribute("popover");
    };
  }, [floating, enabled]);
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

  // Whether the panel is currently promoted into the top layer. State rather
  // than a value derived in this render, because the answer depends on
  // `portalRoot`, which is read off floating-ui's own output below — so the
  // strategy settles one commit later, before paint and long before a panel a
  // user opened by hand exists.
  const [topLayer, setTopLayer] = useState(false);

  const floating = useFloatingUI({
    placement,
    middleware,
    whileElementsMounted: autoUpdate,
    open,
    onOpenChange,
    // A top-layer element's containing block is the **viewport**, so its
    // coordinates have to be viewport-relative or every one of them is out by
    // the dialog's origin. Floating UI reads the pair together — its
    // `topLayer && isFixed` branch is what skips the offsetParent conversion —
    // so the strategy and the promotion must never disagree, which is why both
    // read this one flag.
    strategy: topLayer ? "fixed" : "absolute",
  });

  // `domReference`, not `reference`: ContextMenu positions against a virtual
  // reference at the cursor, which has no place in the DOM to ask about.
  const portalRoot = useDialogPortalRoot(floating.elements.domReference);

  // Only an element means "a dialog encloses this trigger". `null` is the
  // first-commit *wait* and `undefined` is `<body>`; neither is promoted, so
  // nothing outside a dialog changes.
  const promote = portalRoot != null && supportsTopLayerPromotion();
  useLayoutEffect(() => setTopLayer(promote), [promote]);

  useTopLayer(floating.elements.floating, topLayer);

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
