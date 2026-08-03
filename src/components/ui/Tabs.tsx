"use client";
import {
  type AnimationEvent,
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  type KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { usePanelTransition } from "../../hooks/use-panel-transition";
import { composeEventHandlers } from "../../util/merge-props";
import { mergeRefs } from "../../util/merge-refs";
import { cn, type SlotClassNames } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type Variant = "underline" | "pill" | "enclosed";

type TabsContextValue = {
  activeValue: string;
  onValueChange: (value: string) => void;
  variant: Variant;
  baseId: string;
  /** The panel on screen — the outgoing one until its exit lands. */
  renderedValue: string;
  transitionClass: string | undefined;
  onPanelAnimationEnd: (event: AnimationEvent<Element>) => void;
  panelRef: (node: HTMLElement | null) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used within <Tabs>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Tabs (root)                                                        */
/* ------------------------------------------------------------------ */

type TabsProps = {
  defaultValue: string;
  /**
   * Controlled active tab. Controlled-ness is decided on the FIRST render and
   * never changes, so `value={v ?? undefined}` keeps the tabs controlled — a
   * later `undefined` falls back to `defaultValue` rather than switching mode.
   */
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: Variant;
} & Omit<ComponentPropsWithRef<"div">, "defaultValue">;

const TabsRoot = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    defaultValue,
    value: controlledValue,
    onValueChange,
    variant = "underline",
    className,
    children,
    ...props
  },
  ref
) {
  const baseId = useId();

  // Only `useControllableState` reads the raw prop; this ref is the mode lock's
  // one job here — keep feeding the hook a defined value once controlled, so a
  // later `value={undefined}` reads as `defaultValue` rather than a mode switch.
  const isControlledRef = useRef(controlledValue !== undefined);
  const [activeValue, setActiveValue] = useControllableState<string>({
    value: isControlledRef.current ? (controlledValue ?? defaultValue) : undefined,
    defaultValue,
    onChange: onValueChange,
  });

  // The panel swap — one beat out, one beat in — is `usePanelTransition`'s, and
  // `Wizard` drives its step panel with the same hook.
  const { renderedValue, transitionClass, onPanelAnimationEnd, panelRef } =
    usePanelTransition(activeValue);

  return (
    <TabsContext.Provider
      value={{
        activeValue,
        onValueChange: setActiveValue,
        variant,
        baseId,
        renderedValue,
        transitionClass,
        onPanelAnimationEnd,
        panelRef,
      }}
    >
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
});

/* ------------------------------------------------------------------ */
/*  Tabs.List                                                          */
/* ------------------------------------------------------------------ */

type TabsListProps = {
  /**
   * Class overrides for the internals this component renders. `className` is the
   * strip itself and `Tabs.Tab` reaches each tab, so the only element left is the
   * marker sliding under the active tab — which nothing else can address.
   *
   * Its `transform` and `width` are measured from the active tab and written as
   * inline style every layout, so a class here changes appearance and never
   * position.
   */
  classNames?: SlotClassNames<"indicator">;
} & ComponentPropsWithRef<"div">;

/**
 * `Tabs.css` keeps the strip's own box and the tab's `all: unset`, and says why
 * at source; everything else this component draws is here. Every BEM name
 * survives as a declaration-free marker (AGENTS.md §"Class names outlive their
 * declarations"), and each constant is one flat string literal because
 * `verify:component-docs` and `verify:focus-affordance` resolve hoisted
 * constants textually.
 *
 * `--MOTION-*` is in no Tailwind namespace, so the shift tokens are read as
 * custom properties in the bracket spelling — `ease-shift` generates nothing.
 * `hover:` compiles to `@media (hover: hover) { &:hover }`, so the hover tints
 * no longer paint on a coarse pointer; that matches the rest of the package.
 *
 * The variant-scoped rules that were `.tabs-list--enclosed .tabs-tab` and
 * friends are resolved in JS instead: `Tabs.Tab` already reads `variant` and its
 * own selected state from context, and an `in-[.tabs-list--pill]:` variant would
 * match ANY ancestor carrying the class — a Tabs nested inside a pill Tabs would
 * take the parent's skin.
 */
const variantListClass: Record<Variant, string> = {
  underline: "tabs-list--underline border-b border-border-default",
  pill: "tabs-list--pill",
  enclosed: "tabs-list--enclosed border-b border-border-default",
};

/**
 * The tab, minus the `all: unset` that stays in `Tabs.css`. `box-border` and the
 * rest rebuild the control the reset clears, each now as a class a caller's
 * `className` out-ranks individually.
 *
 * The focus outline is inset (`-outline-offset-2`) rather than one of
 * `util/focus.ts`'s ring recipes: tabs sit flush against the strip's bottom
 * border and each other, so an outward ring would paint over both. Nothing here
 * resets the UA outline, so there is no reset for `verify:focus-affordance` to
 * pair — this replaces the UA outline rather than removing it.
 */
const tabClasses =
  "box-border relative z-1 inline-flex items-center justify-center px-r3 py-r5 cursor-pointer text-body-2 font-semibold text-fg-secondary whitespace-nowrap transition-[color,background-color] duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none hover:not-disabled:text-fg-primary disabled:text-fg-muted disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus";

/**
 * The enclosed tab's chrome: a folder tab whose bottom edge is the strip's own
 * border, hence `border-x border-t` rather than `border` plus a `border-b-0`
 * that would depend on Tailwind's emission order to win.
 */
const tabEnclosedClasses = "border-x border-t border-transparent rounded-t-md -mb-px";

/**
 * Selected, per variant. `pill` inverts its ink over the accent fill;
 * `enclosed` claims rung 0 and rings itself; `underline` and the base take the
 * accent ink.
 *
 * The base `.tabs-tab` sets `color` too, so this is a base-vs-modifier pair —
 * both halves converted, and the modifier passed AFTER the base so
 * tailwind-merge resolves it the modifier's way at the call site.
 */
const tabSelectedClass: Record<Variant, string> = {
  underline: "text-accent",
  pill: "text-[var(--C-TEXT-ON-ACCENT,var(--C-TEXT-INVERSE))]",
  enclosed: "text-fg-primary bg-surface-0 border-border-default",
};

/**
 * The hover wash, unselected tabs only — a selected pill would lose its
 * indicator and a selected enclosed tab its rung-0 fill. Rung 2 (recessed), not
 * 0: the selected tab claims rung 0, so an unselected hover has to sit on the
 * recessed side to read as "not selected". `underline` gets none: a background
 * there would obscure the sliding marker.
 */
const tabHoverClass: Record<Variant, string | undefined> = {
  underline: undefined,
  pill: "hover:not-disabled:bg-surface-2 hover:not-disabled:rounded-md",
  enclosed: "hover:not-disabled:bg-surface-2",
};

const tabsPanelClasses = "pt-r3";

const tabsIndicatorClasses =
  "absolute bottom-0 left-0 pointer-events-none transition-[transform,width] duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none";

const variantIndicatorClass: Record<Variant, string> = {
  underline: "tabs-indicator--underline h-0.5 bg-accent",
  pill: "tabs-indicator--pill top-r6 bottom-r6 h-auto rounded-md bg-accent",
  enclosed: "tabs-indicator--enclosed -bottom-px h-0.5 bg-surface-0",
};

const TabsList = forwardRef<HTMLDivElement, TabsListProps>(function TabsList(
  { className, classNames, children, ...props },
  forwardedRef
) {
  const { activeValue, variant, baseId } = useTabsContext();
  const listRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    transform: string;
    width: string;
  }>({ transform: "translateX(0px)", width: "0px" });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const { scrollLeft, scrollWidth, clientWidth } = list;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  const updateIndicator = useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const activeTab = list.querySelector<HTMLButtonElement>(
      `#${CSS.escape(`${baseId}-tab-${activeValue}`)}`
    );
    if (!activeTab) return;

    setIndicatorStyle({
      transform: `translateX(${activeTab.offsetLeft}px)`,
      width: `${activeTab.offsetWidth}px`,
    });
  }, [activeValue, baseId]);

  useLayoutEffect(() => {
    updateIndicator();
    updateScrollState();
  }, [updateIndicator, updateScrollState]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const observer = new ResizeObserver(() => {
      updateIndicator();
      updateScrollState();
    });
    observer.observe(list);
    list.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      observer.disconnect();
      list.removeEventListener("scroll", updateScrollState);
    };
  }, [updateIndicator, updateScrollState]);

  return (
    <div
      ref={mergeRefs(forwardedRef, listRef)}
      role="tablist"
      className={cn("tabs-list", variantListClass[variant], className)}
      data-scroll-left={canScrollLeft}
      data-scroll-right={canScrollRight}
      {...props}
    >
      {children}
      <span
        className={cn(
          "tabs-indicator",
          tabsIndicatorClasses,
          variantIndicatorClass[variant],
          classNames?.indicator
        )}
        style={indicatorStyle}
        aria-hidden="true"
      />
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Tabs.Tab                                                           */
/* ------------------------------------------------------------------ */

type TabsTabProps = {
  value: string;
  disabled?: boolean;
} & Omit<ComponentPropsWithRef<"button">, "value">;

const TabsTab = forwardRef<HTMLButtonElement, TabsTabProps>(function TabsTab(
  { value, disabled = false, className, onClick, onKeyDown, ...props },
  ref
) {
  const { activeValue, onValueChange, baseId, variant } = useTabsContext();
  const isSelected = activeValue === value;

  function handleClick() {
    if (!disabled) {
      onValueChange(value);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const tablist = e.currentTarget.closest('[role="tablist"]');
    if (!tablist) return;

    const tabs = Array.from(
      tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')
    );
    const currentIndex = tabs.indexOf(e.currentTarget);
    if (currentIndex === -1) return;

    let nextIndex: number | undefined;

    switch (e.key) {
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case "ArrowLeft":
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const nextTab = tabs[nextIndex];
    nextTab.focus();
    // Auto-activate on focus (WAI-ARIA recommended)
    const nextValue = nextTab.dataset.value;
    if (nextValue) {
      onValueChange(nextValue);
    }
  }

  return (
    <button
      ref={ref}
      id={`${baseId}-tab-${value}`}
      role="tab"
      type="button"
      data-value={value}
      aria-selected={isSelected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      className={cn(
        "tabs-tab",
        tabClasses,
        variant === "enclosed" && tabEnclosedClasses,
        isSelected ? tabSelectedClass[variant] : tabHoverClass[variant],
        className
      )}
      onClick={composeEventHandlers(onClick, handleClick)}
      onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown)}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------ */
/*  Tabs.Panel                                                         */
/* ------------------------------------------------------------------ */

type TabsPanelProps = {
  value: string;
} & Omit<ComponentPropsWithRef<"div">, "value">;

const TabsPanel = forwardRef<HTMLDivElement, TabsPanelProps>(function TabsPanel(
  { value, className, children, onAnimationEnd, ...props },
  ref
) {
  const { baseId, renderedValue, transitionClass, onPanelAnimationEnd, panelRef } =
    useTabsContext();

  // Exactly one panel is on screen at a time: the leaving one while its exit
  // runs, the active one otherwise. Every other panel returns null, so a
  // panel's state is discarded when you switch away from it.
  if (value !== renderedValue) return null;

  return (
    <div
      ref={mergeRefs(ref, panelRef)}
      id={`${baseId}-panel-${value}`}
      role="tabpanel"
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn(transitionClass, "tabs-panel", tabsPanelClasses, className)}
      // `animationend` is not cancelable, so a caller's `preventDefault()` must not
      // be read as an opt-out — that would strand the exiting panel forever.
      onAnimationEnd={composeEventHandlers(onAnimationEnd, onPanelAnimationEnd, {
        checkDefaultPrevented: false,
      })}
      {...props}
    >
      {children}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
});
