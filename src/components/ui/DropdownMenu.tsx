import {
  cloneElement,
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  isValidElement,
  type ReactElement,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FloatingFocusManager,
  FloatingPortal,
  type Placement,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
  useTransitionStyles,
  useTypeahead,
} from "../../hooks/use-floating";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  refs: ReturnType<typeof useFloating>["refs"];
  floatingStyles: React.CSSProperties;
  context: ReturnType<typeof useFloating>["context"];
  getReferenceProps: ReturnType<typeof useInteractions>["getReferenceProps"];
  getFloatingProps: ReturnType<typeof useInteractions>["getFloatingProps"];
  getItemProps: ReturnType<typeof useInteractions>["getItemProps"];
  listRef: React.MutableRefObject<(HTMLElement | null)[]>;
  listContentRef: React.MutableRefObject<(string | null)[]>;
  activeIndex: number | null;
  menuId: string;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) throw new Error("DropdownMenu compound components must be used within <DropdownMenu>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Root                                                              */
/* ------------------------------------------------------------------ */

interface DropdownMenuRootProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  placement?: Placement;
  children: React.ReactNode;
}

function DropdownMenuRoot({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  placement = "bottom-start",
  children,
}: DropdownMenuRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const menuId = useId();

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!isControlled) setUncontrolledOpen(v);
      onOpenChange?.(v);
    },
    [isControlled, onOpenChange]
  );

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listRef = useRef<(HTMLElement | null)[]>([]);
  const listContentRef = useRef<(string | null)[]>([]);

  const { refs, floatingStyles, context } = useFloating({
    placement,
    offsetPx: 4,
    open,
    onOpenChange: handleOpenChange,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });
  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
  });
  const typeahead = useTypeahead(context, {
    listRef: listContentRef,
    activeIndex,
    onMatch: setActiveIndex,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    click,
    dismiss,
    role,
    listNavigation,
    typeahead,
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
      getItemProps,
      listRef,
      listContentRef,
      activeIndex,
      menuId,
    }),
    [
      open,
      handleOpenChange,
      refs,
      floatingStyles,
      context,
      getReferenceProps,
      getFloatingProps,
      getItemProps,
      activeIndex,
      menuId,
    ]
  );

  return <DropdownMenuContext.Provider value={value}>{children}</DropdownMenuContext.Provider>;
}

/* ------------------------------------------------------------------ */
/*  Trigger                                                           */
/* ------------------------------------------------------------------ */

type DropdownMenuTriggerProps = ComponentPropsWithRef<"button"> & {
  /** When true, merges trigger props onto the single child element instead of wrapping in a <button>. */
  asChild?: boolean;
};

const DropdownMenuTrigger = forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
  function DropdownMenuTrigger({ children, className, asChild = false, ...props }, ref) {
    const { open, refs, getReferenceProps, menuId } = useDropdownMenuContext();
    const triggerProps = {
      // eslint-disable-next-line react-hooks/refs -- mergeRefs defers ref assignment to the returned callback
      ref: mergeRefs(ref, refs.setReference),
      "aria-expanded": open,
      "aria-haspopup": "menu" as const,
      "aria-controls": open ? menuId : undefined,
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
      <button className={cn("dropdown-menu-trigger", className)} {...triggerProps}>
        {children}
      </button>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */

type DropdownMenuContentProps = ComponentPropsWithRef<"div">;

const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  function DropdownMenuContent({ children, className, style, ...props }, ref) {
    const { refs, floatingStyles, context, getFloatingProps, menuId } = useDropdownMenuContext();

    const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
      duration: 150,
      initial: { opacity: 0 },
    });

    if (!isMounted) return null;

    return (
      <FloatingPortal>
        <FloatingFocusManager context={context} initialFocus={-1}>
          <div
            ref={mergeRefs(ref, refs.setFloating)}
            id={menuId}
            className={cn("dropdown-menu-content", className)}
            style={{ ...floatingStyles, ...transitionStyles, ...style }}
            {...getFloatingProps(props)}
          >
            {children}
          </div>
        </FloatingFocusManager>
      </FloatingPortal>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Item                                                              */
/* ------------------------------------------------------------------ */

interface DropdownMenuItemProps extends Omit<ComponentPropsWithRef<"button">, "onSelect"> {
  index: number;
  icon?: React.ReactNode;
  disabled?: boolean;
  onSelect?: () => void;
}

const DropdownMenuItem = forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  function DropdownMenuItem(
    { children, className, index, icon, disabled = false, onSelect, ...props },
    ref
  ) {
    const { setOpen, getItemProps, listRef, listContentRef, activeIndex } =
      useDropdownMenuContext();

    const handleSelect = useCallback(() => {
      if (disabled) return;
      onSelect?.();
      setOpen(false);
    }, [disabled, onSelect, setOpen]);

    const itemRef = useCallback(
      (node: HTMLButtonElement | null) => {
        listRef.current[index] = node;
        listContentRef.current[index] = node?.textContent ?? null;
      },
      [listRef, listContentRef, index]
    );

    return (
      <button
        ref={mergeRefs(ref, itemRef)}
        role="menuitem"
        className={cn("dropdown-menu-item", className)}
        aria-disabled={disabled || undefined}
        tabIndex={activeIndex === index ? 0 : -1}
        {...getItemProps({
          ...props,
          onClick(e: React.MouseEvent<HTMLButtonElement>) {
            props.onClick?.(e);
            handleSelect();
          },
        })}
      >
        {icon && <span className="dropdown-menu-item-icon">{icon}</span>}
        {children}
      </button>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Divider                                                           */
/* ------------------------------------------------------------------ */

type DropdownMenuDividerProps = ComponentPropsWithRef<"hr">;

const DropdownMenuDivider = forwardRef<HTMLHRElement, DropdownMenuDividerProps>(
  function DropdownMenuDivider({ className, ...props }, ref) {
    return (
      <hr
        ref={ref}
        role="separator"
        className={cn("dropdown-menu-divider", className)}
        {...props}
      />
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Label                                                             */
/* ------------------------------------------------------------------ */

type DropdownMenuLabelProps = ComponentPropsWithRef<"span">;

const DropdownMenuLabel = forwardRef<HTMLSpanElement, DropdownMenuLabelProps>(
  function DropdownMenuLabel({ children, className, ...props }, ref) {
    return (
      <span
        ref={ref}
        role="presentation"
        className={cn("dropdown-menu-label", className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Export                                                            */
/* ------------------------------------------------------------------ */

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger: DropdownMenuTrigger,
  Content: DropdownMenuContent,
  Item: DropdownMenuItem,
  Divider: DropdownMenuDivider,
  Label: DropdownMenuLabel,
});
