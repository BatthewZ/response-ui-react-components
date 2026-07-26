"use client";
import {
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  type KeyboardEvent,
  useCallback,
  useContext,
  useId,
  useRef,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { composeEventHandlers } from "../../util/merge-props";
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type Mode = "single" | "multiple";

/** Heading rank the trigger's wrapper renders at. */
export type AccordionHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

type AccordionContextValue = {
  openValues: string[];
  toggle: (value: string) => void;
  mode: Mode;
  headingLevel: AccordionHeadingLevel;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error("Accordion compound components must be used within <Accordion>");
  return ctx;
}

type ItemContextValue = {
  value: string;
  isOpen: boolean;
  disabled: boolean;
  triggerId: string;
  contentId: string;
};

const ItemContext = createContext<ItemContextValue | null>(null);

function useItemContext() {
  const ctx = useContext(ItemContext);
  if (!ctx) throw new Error("Accordion.Trigger/Content must be used within <Accordion.Item>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Accordion (root)                                                   */
/* ------------------------------------------------------------------ */

type AccordionProps = {
  mode?: Mode;
  defaultValue?: string | string[];
  /**
   * Controlled open set. Controlled-ness is decided on the FIRST render and
   * never changes, so `value={v ?? undefined}` keeps the accordion controlled —
   * a later `undefined` reads as "nothing open", not as a mode switch.
   */
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  /**
   * Heading rank the triggers render at, so they appear in a screen reader's
   * heading list under the right ancestor. @default 3
   */
  headingLevel?: AccordionHeadingLevel;
} & Omit<ComponentPropsWithRef<"div">, "defaultValue">;

/**
 * `mode` is a property of the whole open set, not just of `toggle`: a
 * `single` accordion seeded with two values rendered both panels open.
 */
function normalizeValues(val: string | string[] | undefined, mode: Mode): string[] {
  if (val === undefined) return [];
  const list = Array.isArray(val) ? val : [val];
  return mode === "single" ? list.slice(0, 1) : list;
}

const AccordionRoot = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  {
    mode = "single",
    defaultValue,
    value: controlledValue,
    onValueChange,
    headingLevel = 3,
    className,
    children,
    ...props
  },
  ref
) {
  // Only `useControllableState` reads the raw prop; this ref is the mode lock's
  // one job here — keep feeding the hook a defined value once controlled, so a
  // later `value={undefined}` is read as an empty set rather than a mode switch.
  const isControlledRef = useRef(controlledValue !== undefined);
  const [openValues, setOpenValues] = useControllableState<string[]>({
    value: isControlledRef.current ? normalizeValues(controlledValue, mode) : undefined,
    defaultValue: normalizeValues(defaultValue, mode),
    onChange: (next) => onValueChange?.(mode === "single" ? (next[0] ?? "") : next),
  });

  const toggle = useCallback(
    (itemValue: string) => {
      setOpenValues((prev) => {
        if (mode === "single") return prev.includes(itemValue) ? [] : [itemValue];
        return prev.includes(itemValue)
          ? prev.filter((v) => v !== itemValue)
          : [...prev, itemValue];
      });
    },
    [mode, setOpenValues]
  );

  return (
    <AccordionContext.Provider value={{ openValues, toggle, mode, headingLevel }}>
      <div ref={ref} className={cn("accordion", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
});

/* ------------------------------------------------------------------ */
/*  Accordion.Item                                                     */
/* ------------------------------------------------------------------ */

type AccordionItemProps = {
  value: string;
  disabled?: boolean;
} & Omit<ComponentPropsWithRef<"div">, "value">;

const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(function AccordionItem(
  { value, disabled = false, className, children, ...props },
  ref
) {
  const { openValues } = useAccordionContext();
  const isOpen = openValues.includes(value);
  // Generated, never interpolated from `value`: a value containing a space (or
  // any other separator) produced ids that silently broke `aria-controls` and
  // `aria-labelledby`.
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const contentId = `${baseId}-content`;

  return (
    <ItemContext.Provider value={{ value, isOpen, disabled, triggerId, contentId }}>
      <div
        ref={ref}
        className={cn("accordion-item", className)}
        data-state={isOpen ? "open" : "closed"}
        data-disabled={disabled || undefined}
        {...props}
      >
        {children}
      </div>
    </ItemContext.Provider>
  );
});

/* ------------------------------------------------------------------ */
/*  Accordion.Trigger                                                  */
/* ------------------------------------------------------------------ */

type AccordionTriggerProps = ComponentPropsWithRef<"button">;

const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  function AccordionTrigger({ className, children, onClick, onKeyDown, ...props }, ref) {
    const { toggle, headingLevel } = useAccordionContext();
    const { value, isOpen, disabled, triggerId, contentId } = useItemContext();
    const Heading = `h${headingLevel}` as const;

    function handleClick() {
      if (!disabled) {
        toggle(value);
      }
    }

    function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
      const accordion = e.currentTarget.closest(".accordion");
      if (!accordion) return;

      const triggers = Array.from(
        accordion.querySelectorAll<HTMLButtonElement>(".accordion-trigger:not(:disabled)")
      );
      const currentIndex = triggers.indexOf(e.currentTarget);
      if (currentIndex === -1) return;

      let nextIndex: number | undefined;

      switch (e.key) {
        case "ArrowDown":
          nextIndex = (currentIndex + 1) % triggers.length;
          break;
        case "ArrowUp":
          nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = triggers.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      triggers[nextIndex].focus();
    }

    return (
      // The trigger has to sit inside a heading or heading navigation skips
      // every section. The wrapper is presentation-only — `.accordion-heading`
      // strips the UA's own font and spacing.
      <Heading className="accordion-heading">
      <button
        ref={ref}
        id={triggerId}
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        disabled={disabled}
        className={cn("accordion-trigger", className)}
        onClick={composeEventHandlers(onClick, handleClick)}
        onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown)}
        {...props}
      >
        <span className="accordion-trigger-text">{children}</span>
        <svg
          className="accordion-chevron"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      </Heading>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Accordion.Content                                                  */
/* ------------------------------------------------------------------ */

type AccordionContentProps = ComponentPropsWithRef<"div">;

const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  function AccordionContent({ className, children, ...props }, ref) {
    const { isOpen, triggerId, contentId } = useItemContext();

    return (
      <div
        ref={ref}
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        data-state={isOpen ? "open" : "closed"}
        // Collapsed panels are only CSS-clipped; without this their descendants
        // stay tab-reachable and in the a11y tree.
        inert={!isOpen}
        className={cn("accordion-content", className)}
        {...props}
      >
        <div className="accordion-content-inner">{children}</div>
      </div>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});
