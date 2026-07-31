"use client";
import {
  cloneElement,
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  isValidElement,
  type ReactElement,
  useContext,
  useMemo,
  useRef,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import {
  FloatingFocusManager,
  floatingArrowProps,
  FloatingPortal,
  type Placement,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from "../../hooks/use-floating";
import { mergeProps } from "../../util/merge-props";
import { mergeRefs } from "../../util/merge-refs";
import { cn, type SlotClassNames } from "../../util/style";
import { useFadeDuration } from "./floating-motion";

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface PopoverContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  refs: ReturnType<typeof useFloating>["refs"];
  floatingStyles: React.CSSProperties;
  context: ReturnType<typeof useFloating>["context"];
  getReferenceProps: ReturnType<typeof useInteractions>["getReferenceProps"];
  getFloatingProps: ReturnType<typeof useInteractions>["getFloatingProps"];
  /** `string | undefined` because Floating UI types its own id that way. */
  contentId: string | undefined;
  /** The arrow element the middleware measures; `Popover.Content` fills it in. */
  arrowRef: React.RefObject<HTMLDivElement | null>;
  /** The *resolved* placement, so a flip carries the arrow to the other edge. */
  placement: Placement;
  middlewareData: ReturnType<typeof useFloating>["middlewareData"];
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error("Popover compound components must be used within <Popover>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Root                                                              */
/* ------------------------------------------------------------------ */

interface PopoverRootProps {
  /**
   * Controlled open state. Controlled-ness is decided on the FIRST render and
   * never changes, so `open={o ?? undefined}` keeps the popover controlled — a
   * later `undefined` reads as closed rather than switching mode.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  placement?: Placement;
  offset?: number;
  children: React.ReactNode;
}

function PopoverRoot({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  placement = "bottom",
  offset: offsetPx = 8,
  children,
}: PopoverRootProps) {
  // Only `useControllableState` reads the raw prop; this ref is the mode lock's
  // one job here — keep feeding the hook a defined value once controlled, so a
  // later `open={undefined}` reads as closed rather than a mode switch.
  const isControlledRef = useRef(controlledOpen !== undefined);
  const [open, handleOpenChange] = useControllableState<boolean>({
    value: isControlledRef.current ? (controlledOpen ?? false) : undefined,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  // Handed to the hook unconditionally: floating-ui's `arrow` middleware reads
  // the ref at position time and returns nothing while `current` is null, so a
  // Popover whose Content never asks for an arrow pays no behavioural cost.
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
    onOpenChange: handleOpenChange,
  });

  // The id the panel will actually carry. `useRole` supplies its own `id`
  // through `getFloatingProps`, and that spread wins on the element — so
  // minting a second id here would be a second source for one value, which is
  // what #127 caught a reader assuming their way through (#469).
  const contentId = context.floatingId;

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "dialog" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const value = useMemo(
    () => ({
      open,
      setOpen: handleOpenChange,
      refs,
      floatingStyles,
      context,
      getReferenceProps,
      getFloatingProps,
      contentId,
      arrowRef,
      placement: resolvedPlacement,
      middlewareData,
    }),
    [
      open,
      handleOpenChange,
      refs,
      floatingStyles,
      context,
      getReferenceProps,
      getFloatingProps,
      contentId,
      resolvedPlacement,
      middlewareData,
    ]
  );

  return (
    <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Trigger                                                           */
/* ------------------------------------------------------------------ */

type PopoverTriggerProps = ComponentPropsWithRef<"button"> & {
  /** When true, merges trigger props onto the single child element instead of wrapping in a <button>. */
  asChild?: boolean;
};

const PopoverTrigger = forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  function PopoverTrigger({ children, className, asChild = false, ...props }, ref) {
    const { open, refs, getReferenceProps, contentId } = usePopoverContext();
    const triggerProps = {
      ref: mergeRefs(ref, refs.setReference),
      "aria-expanded": open,
      "aria-haspopup": "dialog" as const,
      "aria-controls": open ? contentId : undefined,
      ...getReferenceProps(props),
    };

    if (asChild && isValidElement(children)) {
      // `cloneElement` overwrites props rather than merging them, so spreading
      // `triggerProps` bare would discard the child's own handlers and ref.
      return cloneElement(
        children as ReactElement<Record<string, unknown>>,
        mergeProps(children.props as Record<string, unknown>, {
          ...triggerProps,
          className,
        })
      );
    }

    return (
      <button type="button" className={cn("popover-trigger", className)} {...triggerProps}>
        {children}
      </button>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */

export type PopoverContentProps = ComponentPropsWithRef<"div"> & {
  /**
   * Render the pointer triangle that points back at the trigger. Off by default,
   * because it is the one option here that changes what is painted.
   */
  arrow?: boolean;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * panel itself, so the only slot is the arrow — an element a caller has no
   * other route to. The union is written out here so an unknown key is a type
   * error rather than a silently ignored one.
   */
  classNames?: SlotClassNames<"arrow">;
};

const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  function PopoverContent(
    { children, className, style, arrow = false, classNames, ...props },
    ref
  ) {
    const {
      open,
      refs,
      floatingStyles,
      context,
      getFloatingProps,
      contentId,
      arrowRef,
      placement,
      middlewareData,
    } = usePopoverContext();

    const duration = useFadeDuration(open);

    const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
      duration,
      initial: { opacity: 0 },
    });

    if (!isMounted) return null;

    return (
      <FloatingPortal>
        <FloatingFocusManager context={context} modal={false}>
          <div
            ref={mergeRefs(ref, refs.setFloating)}
            id={contentId}
            className={cn("popover-content", className)}
            style={{ ...floatingStyles, ...transitionStyles, ...style }}
            {...getFloatingProps(props)}
          >
            {children}
            {arrow && (
              <div
                ref={arrowRef}
                aria-hidden="true"
                {...floatingArrowProps(placement, middlewareData.arrow)}
                className={cn("popover-arrow", classNames?.arrow)}
              />
            )}
          </div>
        </FloatingFocusManager>
      </FloatingPortal>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Export                                                            */
/* ------------------------------------------------------------------ */

export const Popover = Object.assign(PopoverRoot, {
  Trigger: PopoverTrigger,
  Content: PopoverContent,
});
