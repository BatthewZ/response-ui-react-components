"use client";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
  useMemo,
  useState,
} from "react";

import {
  FloatingPortal,
  type Placement,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "../../hooks/use-floating";
import { mergeRefs } from "../../util/merge-refs";

interface TooltipProps {
  content: ReactNode;
  placement?: Placement;
  delay?: number;
  offset?: number;
  children: ReactElement;
}

export function Tooltip({
  content,
  placement = "top",
  delay = 300,
  offset: offsetPx = 8,
  children,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const { refs, floatingStyles, context } = useFloating({
    placement,
    offsetPx,
    open,
    onOpenChange: setOpen,
  });

  const hover = useHover(context, { delay });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: 150,
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
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className="tooltip"
            style={{ ...floatingStyles, ...transitionStyles }}
            {...getFloatingProps()}
            // After the spread on purpose: `getFloatingProps` supplies an `id`
            // of its own, so setting ours above it left this panel with an id
            // the trigger never pointed at.
            id={id}
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
