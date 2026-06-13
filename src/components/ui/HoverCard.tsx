"use client";
import {
  cloneElement,
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useId,
  useMemo,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import {
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
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface HoverCardContextValue {
  open: boolean;
  refs: ReturnType<typeof useFloating>["refs"];
  floatingStyles: React.CSSProperties;
  context: ReturnType<typeof useFloating>["context"];
  getReferenceProps: ReturnType<typeof useInteractions>["getReferenceProps"];
  getFloatingProps: ReturnType<typeof useInteractions>["getFloatingProps"];
  contentId: string;
}

const HoverCardContext = createContext<HoverCardContextValue | null>(null);

function useHoverCardContext() {
  const ctx = useContext(HoverCardContext);
  if (!ctx) throw new Error("HoverCard compound components must be used within <HoverCard>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Root                                                              */
/* ------------------------------------------------------------------ */

interface HoverCardRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openDelay?: number;
  closeDelay?: number;
  placement?: Placement;
  children: ReactNode;
}

function HoverCardRoot({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  openDelay = 300,
  closeDelay = 150,
  placement = "bottom",
  children,
}: HoverCardRootProps) {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const contentId = useId();

  const { refs, floatingStyles, context } = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
  });

  const hover = useHover(context, {
    delay: { open: openDelay, close: closeDelay },
    handleClose: safePolygon(),
    mouseOnly: true,
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "dialog" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const value = useMemo(
    () => ({
      open,
      refs,
      floatingStyles,
      context,
      getReferenceProps,
      getFloatingProps,
      contentId,
    }),
    [open, refs, floatingStyles, context, getReferenceProps, getFloatingProps, contentId]
  );

  return (
    <HoverCardContext.Provider value={value}>{children}</HoverCardContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Trigger                                                           */
/* ------------------------------------------------------------------ */

type HoverCardTriggerProps = ComponentPropsWithRef<"span"> & {
  /** When true, merges trigger props onto the single child element instead of wrapping in a <span>. */
  asChild?: boolean;
};

const HoverCardTrigger = forwardRef<HTMLSpanElement, HoverCardTriggerProps>(
  function HoverCardTrigger({ children, className, asChild = false, ...props }, ref) {
    const { open, refs, getReferenceProps, contentId } = useHoverCardContext();
    const triggerProps = {
      // eslint-disable-next-line react-hooks/refs -- mergeRefs defers ref assignment to the returned callback
      ref: mergeRefs(ref, refs.setReference),
      "aria-expanded": open,
      "aria-controls": open ? contentId : undefined,
      ...getReferenceProps(props),
    };

    if (asChild && isValidElement(children)) {
      return cloneElement(children as ReactElement<Record<string, unknown>>, {
        ...triggerProps,
        className: cn(
          (children.props as Record<string, unknown>).className as string | undefined,
          className
        ),
      });
    }

    return (
      <span className={cn("inline-flex w-fit", className)} {...triggerProps}>
        {children}
      </span>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */

type HoverCardContentProps = ComponentPropsWithRef<"div">;

const HoverCardContent = forwardRef<HTMLDivElement, HoverCardContentProps>(
  function HoverCardContent({ children, className, style, ...props }, ref) {
    const { refs, floatingStyles, context, getFloatingProps, contentId } =
      useHoverCardContext();

    const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
      duration: 150,
      initial: { opacity: 0 },
    });

    if (!isMounted) return null;

    return (
      <FloatingPortal>
        <div
          ref={mergeRefs(ref, refs.setFloating)}
          id={contentId}
          data-state={context.open ? "open" : "closed"}
          className={cn(
            "bg-surface-0 border border-border-default rounded-lg shadow-lg p-r4 w-72 outline-none",
            className
          )}
          style={{ ...floatingStyles, ...transitionStyles, ...style }}
          {...getFloatingProps(props)}
        >
          {children}
        </div>
      </FloatingPortal>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Export                                                            */
/* ------------------------------------------------------------------ */

export const HoverCard = Object.assign(HoverCardRoot, {
  Trigger: HoverCardTrigger,
  Content: HoverCardContent,
});
