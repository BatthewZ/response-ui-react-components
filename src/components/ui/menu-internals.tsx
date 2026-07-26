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
import { cn } from "../../util/style";
import { useFadeDuration } from "./floating-motion";

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
  /** kebab-case class-name root, e.g. "dropdown-menu" or "context-menu". */
  classPrefix: string;
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
    const { open, refs, floatingStyles, context, getFloatingProps, menuId, classPrefix } =
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
            className={cn(`${classPrefix}-content`, className)}
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
}

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  function MenuItem({ children, className, index, icon, disabled = false, onSelect, ...props }, ref) {
    const { setOpen, getItemProps, listRef, listContentRef, activeIndex, classPrefix } =
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
        className={cn(`${classPrefix}-item`, className)}
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
        {icon && <span className={`${classPrefix}-item-icon`}>{icon}</span>}
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
    const { classPrefix } = useMenuContext("MenuDivider");
    return (
      <hr
        ref={ref}
        role="separator"
        className={cn(`${classPrefix}-divider`, className)}
        {...props}
      />
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Label                                                             */
/* ------------------------------------------------------------------ */

export type MenuLabelProps = ComponentPropsWithRef<"span">;

export const MenuLabel = forwardRef<HTMLSpanElement, MenuLabelProps>(
  function MenuLabel({ children, className, ...props }, ref) {
    const { classPrefix } = useMenuContext("MenuLabel");
    return (
      <span
        ref={ref}
        role="presentation"
        className={cn(`${classPrefix}-label`, className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);
