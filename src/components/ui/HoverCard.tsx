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
import { mergeProps } from "../../util/merge-props";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";
import { useFadeDuration } from "./floating-motion";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface HoverCardContextValue {
  open: boolean;
  triggerId: string;
  refs: ReturnType<typeof useFloating>["refs"];
  floatingStyles: React.CSSProperties;
  context: ReturnType<typeof useFloating>["context"];
  getReferenceProps: ReturnType<typeof useInteractions>["getReferenceProps"];
  getFloatingProps: ReturnType<typeof useInteractions>["getFloatingProps"];
  /** `string | undefined` because Floating UI types its own id that way. */
  contentId: string | undefined;
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
  const triggerId = useId();

  const { refs, floatingStyles, context } = useFloating({
    placement,
    open,
    onOpenChange: setOpen,
  });

  // The id the card will actually carry. `useRole` supplies its own `id` through
  // `getFloatingProps`, and that spread wins on the element — so minting a
  // second id here would leave every IDREF pointing at nothing.
  const contentId = context.floatingId;

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
      triggerId,
      refs,
      floatingStyles,
      context,
      getReferenceProps,
      getFloatingProps,
      contentId,
    }),
    [
      open,
      triggerId,
      refs,
      floatingStyles,
      context,
      getReferenceProps,
      getFloatingProps,
      contentId,
    ]
  );

  return (
    <HoverCardContext.Provider value={value}>{children}</HoverCardContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Trigger                                                           */
/* ------------------------------------------------------------------ */

type HoverCardTriggerProps = ComponentPropsWithRef<"button"> & {
  /** When true, merges trigger props onto the single child element instead of wrapping in a <button>. */
  asChild?: boolean;
};

const HoverCardTrigger = forwardRef<HTMLButtonElement, HoverCardTriggerProps>(
  function HoverCardTrigger({ children, className, asChild = false, ...props }, ref) {
    const { open, refs, getReferenceProps, contentId, triggerId } = useHoverCardContext();

    // `aria-describedby` is a space-separated IDREF *list*; appending keeps
    // whatever description the caller (or the child, under `asChild`) had.
    const childDescribedBy =
      asChild && isValidElement(children)
        ? ((children.props as Record<string, unknown>)["aria-describedby"] as
            | string
            | undefined)
        : undefined;
    const describedBy =
      [childDescribedBy, props["aria-describedby"], open ? contentId : undefined]
        .filter(Boolean)
        .join(" ") || undefined;

    const triggerProps = {
      ref: mergeRefs(ref, refs.setReference),
      id: triggerId,
      "aria-expanded": open,
      "aria-controls": open ? contentId : undefined,
      ...getReferenceProps(props),
      // The card is a `role="dialog"`: without this its contents are never read,
      // because a dialog announces its name and stops there.
      "aria-describedby": describedBy,
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

    // A `<button>`, not a `<span>`: the default trigger carries `aria-expanded`,
    // which is invalid on a role-less element, and `useFocus` has nothing to
    // work with unless the trigger can hold focus in the first place.
    return (
      <button
        type="button"
        className={cn("inline-flex w-fit text-left", className)}
        {...triggerProps}
      >
        {children}
      </button>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */

type HoverCardContentProps = ComponentPropsWithRef<"div">;

const HoverCardContent = forwardRef<HTMLDivElement, HoverCardContentProps>(
  function HoverCardContent({ children, className, style, ...props }, ref) {
    const { open, refs, floatingStyles, context, getFloatingProps, contentId, triggerId } =
      useHoverCardContext();

    // Only as a default: an explicit name from the caller must not be beaten by
    // `aria-labelledby`, which wins the name computation wherever both appear.
    const named = props["aria-label"] != null || props["aria-labelledby"] != null;

    const duration = useFadeDuration(open);

    const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
      duration,
      initial: { opacity: 0 },
    });

    if (!isMounted) return null;

    return (
      <FloatingPortal>
        <div
          ref={mergeRefs(ref, refs.setFloating)}
          id={contentId}
          // A `role="dialog"` with no name is announced as an unnamed dialog.
          // The trigger is the thing the card is about, so it is the name.
          aria-labelledby={named ? undefined : triggerId}
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
