"use client";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  floatingArrowProps,
  FloatingPortal,
  type Placement,
  safePolygon,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "../../hooks/use-floating";
import { mergeRefs } from "../../util/merge-refs";
import { cn, type SlotClassNames } from "../../util/style";
import { useFadeDuration } from "./floating-motion";

export interface TooltipProps {
  content: ReactNode;
  placement?: Placement;
  delay?: number;
  offset?: number;
  /**
   * Where the bubble is portalled. Defaults to `<body>`, which paints *under* a
   * native `<dialog>`'s top layer — pass the dialog element (or any node inside
   * it) for a tooltip used inside `Dialog`/`Drawer`/`CommandPalette`.
   */
  container?: HTMLElement | null;
  /**
   * Classes for the bubble — the only element this component constructs. Its
   * `padding`, `max-width`, `word-wrap` and `z-index` had no override path at
   * any level before this prop existed; the rest of its appearance is themeable
   * as well, through the contract variables the stylesheet reads.
   *
   * It is not spread anywhere else: `children` is cloned untouched, so this
   * cannot reach the trigger.
   */
  className?: string;
  /**
   * Render the pointer triangle that points back at the trigger. Off by default,
   * because it is the one option here that changes what is painted.
   */
  arrow?: boolean;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * bubble, so the only slot is the arrow — which exists only under `arrow`, and
   * which a caller has no other route to. The union is written out here so an
   * unknown key is a type error rather than a silently ignored one.
   */
  classNames?: SlotClassNames<"arrow">;
  children: ReactElement;
}

export function Tooltip({
  content,
  placement = "top",
  delay = 300,
  offset: offsetPx = 8,
  container,
  className,
  arrow = false,
  classNames,
  children,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  // Handed to the hook unconditionally: floating-ui's `arrow` middleware reads
  // the ref at position time and returns nothing while `current` is null, so a
  // tooltip without an arrow pays no behavioural cost.
  const arrowRef = useRef<HTMLDivElement>(null);

  const {
    refs,
    floatingStyles,
    context,
    placement: resolvedPlacement,
    middlewareData,
  } = useFloating({
    placement,
    offsetPx,
    arrowRef,
    open,
    onOpenChange: setOpen,
  });

  // WCAG 1.4.13 "Hoverable": the pointer has to be able to move onto the bubble
  // without dismissing it — to read an overflowing tip, or to reach a link in
  // it. `safePolygon` keeps it open across the gap, and `.tooltip` drops the
  // `pointer-events: none` that made the bubble unreachable regardless.
  const hover = useHover(context, { delay, handleClose: safePolygon() });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  // Tempo comes from the theme, not from this file. `useTransitionStyles`
  // writes `transition-duration` inline, so no stylesheet and no utility can
  // reach it — `--MOTION-DURATION-*` is the only channel, and `useFadeDuration`
  // is how every other floating surface reads it. It also returns 0 under
  // `prefers-reduced-motion: reduce`, which drops the fade and the delayed
  // unmount together, since both are sized from this number.
  const duration = useFadeDuration(open);

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration,
  });

  const childRef = isValidElement(children)
    ? (children.props as Record<string, unknown>).ref as React.Ref<HTMLElement> | undefined
    : undefined;

  const mergedRef = useMemo(
    () => mergeRefs(refs.setReference, childRef),
    [refs.setReference, childRef]
  );

  const childProps = isValidElement(children)
    ? (children.props as Record<string, unknown>)
    : {};

  // Hand the child's own props to floating-ui so it composes their handlers
  // with its own; called bare it cannot see them, and `cloneElement` then
  // overwrites every one.
  const referenceProps = getReferenceProps(childProps);

  // `aria-describedby` is a space-separated IDREF *list*. Overwriting it would
  // silently delete whatever description the child already carried, so append
  // the tooltip's id to it rather than replacing.
  const describedBy =
    [childProps["aria-describedby"] as string | undefined, open ? id : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <>
      {isValidElement(children) &&
        cloneElement(children, {
          ...referenceProps,
          ref: mergedRef,
          "aria-describedby": describedBy,
        } as Record<string, unknown>)}
      {isMounted && (
        <FloatingPortal root={container}>
          <div
            ref={refs.setFloating}
            className={cn("tooltip", className)}
            style={{ ...floatingStyles, ...transitionStyles }}
            {...getFloatingProps()}
            // After the spread on purpose: `getFloatingProps` supplies an `id`
            // of its own, so setting ours above it left this panel with an id
            // the trigger never pointed at.
            id={id}
          >
            {content}
            {arrow && (
              <div
                ref={arrowRef}
                aria-hidden="true"
                {...floatingArrowProps(resolvedPlacement, middlewareData.arrow)}
                className={cn("tooltip-arrow", classNames?.arrow)}
              />
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
