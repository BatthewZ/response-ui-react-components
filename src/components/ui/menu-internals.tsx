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
 * Every element below carries a static `menu-*` class. The names are shared
 * rather than per-consumer on purpose: `DropdownMenu` and `ContextMenu` render
 * the identical markup from the identical components, so one family of names
 * describes it honestly and stays visible to Tailwind's scanner and to any
 * static reader. Only the two triggers, which each component renders itself, are
 * component-specific.
 *
 * The classes are now markers rather than selectors: everything the menu draws
 * is a utility in this file. `menu-internals.css` keeps one rule and says why.
 */

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * Each constant is one flat string literal because `verify:component-docs` and
 * `verify:focus-affordance` resolve hoisted constants textually and a composed
 * one would not resolve.
 *
 * Geometry stays in literal Tailwind rungs (`py-1`, `px-3`, `min-w-45`) rather
 * than the responsive `r`-scale, exactly as the stylesheet had it: the menu's
 * type steps at the 40rem breakpoint and its padding deliberately does not.
 */
const menuContentClasses =
  "z-40 min-w-45 rounded-md border border-border-default bg-surface-0 py-1 shadow-lg outline-none";

/**
 * No reset here. Preflight already gives a `<button>` `background-color:
 * transparent`, `border: 0 solid`, `font: inherit`, `color: inherit`, `margin`,
 * `padding` and `appearance: button` — checked in the compiled base layer — so
 * the stylesheet's `background: none`, `border: none` and `font: inherit` were
 * re-stating it. `Button.tsx` relies on exactly the same thing and carries no
 * reset either. `text-left` is NOT among them: the UA centres button text.
 *
 * The size is `text-[length:var(--BodyText-2)]`, not `text-body-2`, because the
 * rule set a size and no line-height — the row's height is the padding plus the
 * inherited leading, and `text-body-2` would have added `--BodyText-2-line-height`
 * and grown every row.
 *
 * `outline-none` writes `--tw-outline-style: none`, and every `outline-<width>`
 * utility reads that property back, so the ring needs `outline-solid` to set it
 * again — without it `focus-visible:outline-2` computes `outline-style: none`
 * and paints nothing. The hand-written `outline: 2px solid …` had no such
 * indirection, which is why the fourth class looks redundant and is not.
 *
 * The wash is identical in both states, so it can never distinguish focus from
 * hover however large the step gets; at rung 2 against the rung-0 panel it
 * measures 1.08–1.21:1, an order below the 3:1 a state indicator owes. The ring,
 * not the fill, carries focus. Inset, as `.app-shell-sidebar-link` uses for the
 * same full-width-row shape.
 */
const menuItemClasses =
  "flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[length:var(--BodyText-2)] text-fg-primary outline-none hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus aria-disabled:cursor-default aria-disabled:text-fg-muted";

/**
 * `em`, not `rem`: the row's own `--BodyText-2` steps at the theme's breakpoint,
 * and a rem box holds still while the label around it grows — the glyph reads a
 * size too large below the breakpoint and a size too small above it. Sized off
 * the text it labels, the ratio is whatever the theme's type scale says, under
 * any theme. As `Rating` and `StatCard` size theirs.
 *
 * The `> svg` rule that makes an icon fill this box is the one thing
 * `menu-internals.css` keeps; see its header.
 */
const menuItemIconClasses = "flex size-[1.125em] shrink-0 text-fg-secondary";

/** `border-none` is load-bearing: Preflight gives `<hr>` a 1px top border. */
const menuDividerClasses = "my-1 h-px border-none bg-border-default";

const menuGroupHeaderClasses =
  "block px-3 py-1.5 text-[length:var(--BodyText-3)] font-semibold text-fg-muted";

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
  /**
   * Where the menu is portalled — the nearest `<dialog>` ancestor of the
   * trigger, or `undefined` for `<body>`. See `useFloating`.
   */
  portalRoot: ReturnType<typeof useFloating>["portalRoot"];
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

  const { refs, floatingStyles, context, portalRoot } = useFloating({
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
    portalRoot,
  };
}

/* ------------------------------------------------------------------ */
/*  Content                                                           */
/* ------------------------------------------------------------------ */

export type MenuContentProps = ComponentPropsWithRef<"div">;

export const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(
  function MenuContent({ children, className, style, ...props }, ref) {
    const { open, refs, floatingStyles, context, getFloatingProps, menuId, portalRoot } =
      useMenuContext("MenuContent");

    const duration = useFadeDuration(open);

    const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
      duration,
      initial: { opacity: 0 },
    });

    if (!isMounted) return null;

    return (
      <FloatingPortal root={portalRoot}>
        <FloatingFocusManager context={context} initialFocus={-1}>
          <div
            ref={mergeRefs(ref, refs.setFloating)}
            id={menuId}
            className={cn("menu-content", menuContentClasses, className)}
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
        className={cn("menu-item", menuItemClasses, className)}
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
        {icon && <span className={cn("menu-item-icon", menuItemIconClasses, classNames?.itemIcon)}>{icon}</span>}
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
    return <hr ref={ref} role="separator" className={cn("menu-divider", menuDividerClasses, className)} {...props} />;
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
        className={cn("menu-group-header", menuGroupHeaderClasses, className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);
