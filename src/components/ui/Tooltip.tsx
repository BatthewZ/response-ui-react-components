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

  /* eslint-disable react-hooks/refs -- refs.setReference/setFloating are stable callback setters from floating-ui */
  const mergedRef = useMemo(
    () => mergeRefs(refs.setReference, childRef),
    [refs.setReference, childRef]
  );
  /* eslint-enable react-hooks/refs */

  return (
    <>
      {isValidElement(children) &&
        cloneElement(children, {
          ref: mergedRef,
          "aria-describedby": open ? id : undefined,
          ...getReferenceProps(),
        } as Record<string, unknown>)}
      {isMounted && (
        <FloatingPortal>
          <div
            // eslint-disable-next-line react-hooks/refs -- refs.setFloating is a stable callback setter from floating-ui
            ref={refs.setFloating}
            id={id}
            className="tooltip"
            style={{ ...floatingStyles, ...transitionStyles }}
            {...getFloatingProps()}
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
