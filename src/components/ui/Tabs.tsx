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
import { usePrefersReducedMotion } from "../../hooks/use-reduced-motion";
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
  exitingValue: string | null;
  onExitComplete: () => void;
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
  const reducedMotion = usePrefersReducedMotion();

  // Only `useControllableState` reads the raw prop; this ref is the mode lock's
  // one job here — keep feeding the hook a defined value once controlled, so a
  // later `value={undefined}` reads as `defaultValue` rather than a mode switch.
  const isControlledRef = useRef(controlledValue !== undefined);
  const [activeValue, setActiveValue] = useControllableState<string>({
    value: isControlledRef.current ? (controlledValue ?? defaultValue) : undefined,
    defaultValue,
    onChange: onValueChange,
  });

  /* -- Exit coordination ------------------------------------------------ */
  const [exitingValue, setExitingValue] = useState<string | null>(null);
  const [prevActiveValue, setPrevActiveValue] = useState(activeValue);

  if (activeValue !== prevActiveValue) {
    setPrevActiveValue(activeValue);
    if (reducedMotion) {
      // Skip exit animation entirely — new panel shows instantly
      setExitingValue(null);
    } else if (exitingValue === null) {
      // No exit in progress — animate the old panel out
      setExitingValue(prevActiveValue);
    } else {
      // Rapid switch while an exit is in progress — skip the queued animation
      // and let the new active panel appear immediately
      setExitingValue(null);
    }
  }

  const onExitComplete = useCallback(() => {
    setExitingValue(null);
  }, []);

  return (
    <TabsContext.Provider
      value={{
        activeValue,
        onValueChange: setActiveValue,
        variant,
        baseId,
        exitingValue,
        onExitComplete,
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

const variantListClass: Record<Variant, string> = {
  underline: "tabs-list--underline",
  pill: "tabs-list--pill",
  enclosed: "tabs-list--enclosed",
};

const variantIndicatorClass: Record<Variant, string> = {
  underline: "tabs-indicator--underline",
  pill: "tabs-indicator--pill",
  enclosed: "tabs-indicator--enclosed",
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
        className={cn("tabs-indicator", variantIndicatorClass[variant], classNames?.indicator)}
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
  const { activeValue, onValueChange, baseId } = useTabsContext();
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
      className={cn("tabs-tab", className)}
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
  const { activeValue, baseId, exitingValue, onExitComplete } = useTabsContext();
  const reducedMotion = usePrefersReducedMotion();

  const isActive = activeValue === value;
  const isExiting = exitingValue === value;

  // Render if: exiting (fade-out), or active with no pending exit (fade-in)
  const shouldRender = isExiting || (isActive && exitingValue === null);
  if (!shouldRender) return null;

  const animClass = reducedMotion
    ? undefined
    : isExiting
      ? "fade-out"
      : "fade-in";

  function handleAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
    // Ignore bubbled animation events from children
    if (e.target !== e.currentTarget) return;
    if (isExiting) {
      onExitComplete();
    }
  }

  return (
    <div
      ref={ref}
      id={`${baseId}-panel-${value}`}
      role="tabpanel"
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn(animClass, "tabs-panel", className)}
      // `animationend` is not cancelable, so a caller's `preventDefault()` must not
      // be read as an opt-out — that would strand the exiting panel forever.
      onAnimationEnd={composeEventHandlers(onAnimationEnd, handleAnimationEnd, {
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
