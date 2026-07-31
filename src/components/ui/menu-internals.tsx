"use client";
import {
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
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
import { cn, type SlotClassNames } from "../../util/style";
import { useFadeDuration } from "./floating-motion";

/*
 * Every element below carries a static `menu-*` class, painted by
 * `menu-internals.css`. The names are shared rather than per-consumer on
 * purpose: `DropdownMenu` and `ContextMenu` render the identical markup from the
 * identical components, so one family of names describes it honestly and stays
 * visible to Tailwind's scanner and to any static reader. Only the two triggers,
 * which each component renders itself, are component-specific.
 */

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

export interface MenuContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  refs: ReturnType<typeof useFloating>["refs"];
  floatingStyles: React.CSSProperties;
  context: ReturnType<typeof useFloating>["context"];
  getReferenceProps: ReturnType<typeof useInteractions>["getReferenceProps"];
  getFloatingProps: ReturnType<typeof useInteractions>["getFloatingProps"];
  getItemProps: ReturnType<typeof useInteractions>["getItemProps"];
  listRef: React.RefObject<(HTMLElement | null)[]>;
  listContentRef: React.RefObject<(string | null)[]>;
  activeIndex: number | null;
  /** `string | undefined` because Floating UI types its own id that way. */
  menuId: string | undefined;
}

export const MenuContext = createContext<MenuContextValue | null>(null);

/**
 * Reads the nearest menu context. Throws a clear, component-specific error when
 * used outside of a provider so misuse fails loudly.
 */
export function useMenuContext(componentName: string): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error(`${componentName} must be used within a menu provider`);
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Root wiring                                                       */
/* ------------------------------------------------------------------ */

export interface UseMenuRootOptions {
  /** Controlled open state. Controlled iff `!== undefined`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  placement?: Placement;
  /** Distance in px between reference and floating element. */
  offsetPx?: number;
  /**
   * Wire `useClick` so the reference element toggles the menu on click.
   * Defaults to `true` (DropdownMenu behaviour). ContextMenu sets this `false`
   * since it opens via right-click / a client point instead.
   */
  enableClick?: boolean;
}

/** Keys a text-entry control moves its own caret with. */
const CARET_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

/**
 * True when the key was aimed at a control that owns its own text entry.
 * `ContextMenu.Trigger` wraps arbitrary content, so a `<textarea>` inside one
 * bubbles every key it receives to the reference element, where the menu's own
 * handlers are mounted.
 */
function targetIsTextEntry(event: React.KeyboardEvent<Element>): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

/**
 * `useListNavigation` `preventDefault`s Arrow/Home/End on the reference, which
 * freezes the caret of a text control inside the trigger (#125).
 */
function keyBelongsToTextEntry(event: React.KeyboardEvent<Element>): boolean {
  return CARET_KEYS.has(event.key) && targetIsTextEntry(event);
}

/** The shape both guarded interactions share. */
type MenuInteraction = ReturnType<typeof useTypeahead>;

/**
 * Wraps only Floating UI's own reference `onKeyDown`, so `useInteractions`
 * still composes anything the trigger passes in.
 */
function skipReferenceKeys(
  interaction: MenuInteraction,
  shouldSkip: (event: React.KeyboardEvent<Element>) => boolean
): MenuInteraction {
  const reference = interaction.reference;
  const onKeyDown = reference?.onKeyDown;
  if (typeof onKeyDown !== "function") return interaction;
  return {
    ...interaction,
    reference: {
      ...reference,
      onKeyDown(event: React.KeyboardEvent<Element>) {
        if (shouldSkip(event)) return;
        onKeyDown(event);
      },
    },
  };
}

/**
 * Encapsulates the Floating UI + interactions wiring shared by every menu
 * surface: positioning, controllable open state, dismiss, role="menu", list
 * navigation, and typeahead. Returns everything a provider needs to build a
 * {@link MenuContextValue}.
 */
export function useMenuRoot(options: UseMenuRootOptions = {}) {
  const {
    open: controlledOpen,
    onOpenChange,
    defaultOpen = false,
    placement = "bottom-start",
    offsetPx = 4,
    enableClick = true,
  } = options;

  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listRef = useRef<(HTMLElement | null)[]>([]);
  const listContentRef = useRef<(string | null)[]>([]);

  const { refs, floatingStyles, context } = useFloating({
    placement,
    offsetPx,
    open,
    onOpenChange: setOpen,
  });

  // The id the panel will actually carry. `useRole` supplies its own `id`
  // through `getFloatingProps`, and that spread wins on the element — so
  // minting a second id here would be a second source for one value, which is
  // what #127 caught a reader assuming their way through (#469).
  const menuId = context.floatingId;

  const click = useClick(context, { enabled: enableClick });
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

  const guardedListNavigation = useMemo(
    () => skipReferenceKeys(listNavigation, keyBelongsToTextEntry),
    [listNavigation]
  );

  // Every key, not just the caret set: a printable character aimed at a text
  // control is that control's text, and typeahead `preventDefault`s it while
  // the menu is open — so the letter never arrives (#468). The menu is still
  // fully typeahead-able from the trigger itself, which is not a text control.
  const guardedTypeahead = useMemo(
    () => skipReferenceKeys(typeahead, targetIsTextEntry),
    [typeahead]
  );

  // Tab must not leave an open menu behind. A mouse-opened menu holds no
  // tabbable item, so the browser moves focus straight past it and the menu
  // stays open with focus somewhere else entirely.
  const tabDismiss = useMemo(
    () => ({
      reference: {
        onKeyDown(event: React.KeyboardEvent<Element>) {
          if (event.key === "Tab") setOpen(false);
        },
      },
      floating: {
        onKeyDown(event: React.KeyboardEvent<Element>) {
          if (event.key === "Tab") setOpen(false);
        },
      },
    }),
    [setOpen]
  );

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    click,
    dismiss,
    role,
    guardedListNavigation,
    guardedTypeahead,
    tabDismiss,
  ]);

  return {
    open,
    setOpen,
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
  };
}

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */

export type MenuContentProps = ComponentPropsWithRef<"div">;

export const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(
  function MenuContent({ children, className, style, ...props }, ref) {
    const { open, refs, floatingStyles, context, getFloatingProps, menuId } =
      useMenuContext("MenuContent");

    const duration = useFadeDuration(open);

    const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
      duration,
      initial: { opacity: 0 },
    });

    if (!isMounted) return null;

    return (
      <FloatingPortal>
        <FloatingFocusManager context={context} initialFocus={-1}>
          <div
            ref={mergeRefs(ref, refs.setFloating)}
            id={menuId}
            className={cn("menu-content", className)}
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

export interface MenuItemProps extends Omit<ComponentPropsWithRef<"button">, "onSelect"> {
  index: number;
  icon?: React.ReactNode;
  disabled?: boolean;
  onSelect?: () => void;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * row itself, so the only slot is the box the `icon` prop is rendered into —
   * the one element in a menu no caller could reach at all, because the icon is
   * handed over as content and the box around it is ours. The union is written
   * out here so an unknown key is a type error rather than a silently ignored
   * one.
   */
  classNames?: SlotClassNames<"itemIcon">;
}

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  function MenuItem(
    { children, className, classNames, index, icon, disabled = false, onSelect, ...props },
    ref
  ) {
    const { setOpen, getItemProps, listRef, listContentRef, activeIndex } =
      useMenuContext("MenuItem");

    const handleSelect = useCallback(() => {
      onSelect?.();
      setOpen(false);
    }, [onSelect, setOpen]);

    const itemRef = useCallback(
      (node: HTMLButtonElement | null) => {
        const previous = listRef.current[index];
        if (node && previous && previous !== node && previous.isConnected) {
          // `index` is caller-assigned, so nothing stops two items claiming the
          // same slot. The later one wins the slot and the earlier becomes
          // permanently unreachable by arrow key and by typeahead — say so,
          // because the menu still looks and clicks correctly.
          console.warn(
            `MenuItem: duplicate index ${index}. "${previous.textContent ?? ""}" and ` +
              `"${node.textContent ?? ""}" claim the same list slot, so the first is ` +
              `unreachable from the keyboard. Item indices must be unique and contiguous.`
          );
        }
        listRef.current[index] = node;
        listContentRef.current[index] = node?.textContent ?? null;
      },
      [listRef, listContentRef, index]
    );

    return (
      <button
        ref={mergeRefs(ref, itemRef)}
        type="button"
        role="menuitem"
        className={cn("menu-item", className)}
        aria-disabled={disabled || undefined}
        tabIndex={activeIndex === index ? 0 : -1}
        {...getItemProps({
          ...props,
          onClick(e: React.MouseEvent<HTMLButtonElement>) {
            // `aria-disabled` keeps the item focusable (menu a11y convention),
            // so nothing native suppresses the click — every effect, including
            // the caller's own `onClick`, has to be gated here.
            // preventDefault as well as returning: without it the DOM default
            // survives, and a disabled item wrapping an <a href> still
            // navigates. Native `disabled` would cover both but costs the
            // focusability the aria-disabled convention exists to preserve.
            if (disabled) {
              e.preventDefault();
              return;
            }
            props.onClick?.(e);
            handleSelect();
          },
        })}
      >
        {icon && <span className={cn("menu-item-icon", classNames?.itemIcon)}>{icon}</span>}
        {children}
      </button>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Divider                                                           */
/* ------------------------------------------------------------------ */

export type MenuDividerProps = ComponentPropsWithRef<"hr">;

export const MenuDivider = forwardRef<HTMLHRElement, MenuDividerProps>(
  function MenuDivider({ className, ...props }, ref) {
    // Reads nothing from context; called for the outside-a-provider throw, which
    // is documented behaviour for every part of a menu.
    useMenuContext("MenuDivider");
    return <hr ref={ref} role="separator" className={cn("menu-divider", className)} {...props} />;
  }
);

/* ------------------------------------------------------------------ */
/*  Group header                                                      */
/* ------------------------------------------------------------------ */

export type MenuGroupHeaderProps = ComponentPropsWithRef<"span">;

export const MenuGroupHeader = forwardRef<HTMLSpanElement, MenuGroupHeaderProps>(
  function MenuGroupHeader({ children, className, ...props }, ref) {
    // As above: context is read only for the outside-a-provider throw.
    useMenuContext("MenuGroupHeader");
    return (
      <span
        ref={ref}
        role="presentation"
        className={cn("menu-group-header", className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);
