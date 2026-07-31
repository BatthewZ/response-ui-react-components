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
import { cn, type SlotClassNames } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `Accordion.css` keeps two rules and says why; everything else this component
 * draws is here. Each constant is one flat string literal because the docs and
 * focus guards resolve hoisted constants textually and a composed one would not
 * resolve.
 *
 * `--MOTION-*` is in no Tailwind namespace, so the shift tokens are read as
 * custom properties: `ease-shift` and `duration-motion-duration-shift` both
 * generate nothing. The `[var(--X)]` spelling rather than v4's `(--X)` shorthand
 * is the package's existing idiom (`Button`'s gaps) and the one
 * `verify:component-docs` can resolve to a token; both compile identically.
 * `bun run scripts/probe-utility-exists.mjs` is the check.
 */
const triggerClasses =
  "box-border flex w-full cursor-pointer items-center justify-between px-r6 py-r4 text-body-2 font-semibold text-fg-primary transition-colors duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] hover:not-disabled:bg-surface-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-fg-muted focus-visible:rounded-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus";

/**
 * The outline is inset (`-outline-offset-2`) rather than one of `util/focus.ts`'s
 * ring recipes: the trigger is full-bleed and flush against the item's bottom
 * border, so an outward ring would paint over the divider and its neighbour.
 * Nothing here resets the UA outline, so `verify:focus-affordance` has no reset
 * to pair — this replaces the UA outline rather than removing it.
 */
const chevronClasses =
  "shrink-0 text-fg-secondary transition-transform duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] motion-reduce:transition-none";

/**
 * `grid-template-rows` animates between the two tracks; the inner element clips.
 * The open track is variant-scoped, so it wins on specificity
 * (`.data-\[state\=open\]\:grid-rows-\[1fr\][data-state="open"]`, 0,2,0) rather
 * than on where Tailwind happens to sort it.
 *
 * The typography sits here rather than on either element below it, because this
 * is what `className` addresses: it reaches the panel's content by inheritance,
 * so `<Accordion.Content className="text-body-1">` merges against it and wins.
 * On an inner element it would be a rule the caller cannot outrank, and their
 * class would land in the DOM and change nothing.
 */
const contentClasses =
  "grid grid-rows-[0fr] text-body-2 text-fg-secondary transition-[grid-template-rows] duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] data-[state=open]:grid-rows-[1fr] motion-reduce:transition-none";

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
      <div ref={ref} className={cn("accordion w-full", className)} {...props}>
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
        // `border-border-default` sets all four colours and `border-b` gives only
        // the bottom a width — Preflight zeroes the other three — so this paints
        // one divider, and the colour resolves through the contract by name.
        className={cn("accordion-item border-b border-border-default", className)}
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

type AccordionTriggerProps = {
  /**
   * Class overrides for the parts around the button. `className` and `ref` stay
   * on the `<button>` — it is the control, the `querySelector` target for arrow
   * navigation, and what every existing caller addresses — so these reach the
   * heading it has to sit inside and the two spans it wraps.
   */
  classNames?: SlotClassNames<"heading" | "triggerText" | "chevron">;
} & ComponentPropsWithRef<"button">;

const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  function AccordionTrigger(
    { className, classNames, children, onClick, onKeyDown, ...props },
    ref,
  ) {
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
      <Heading className={cn("accordion-heading", classNames?.heading)}>
      <button
        ref={ref}
        id={triggerId}
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        disabled={disabled}
        className={cn("accordion-trigger", triggerClasses, className)}
        onClick={composeEventHandlers(onClick, handleClick)}
        onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown)}
        {...props}
      >
        <span className={cn("accordion-trigger-text flex-1 text-left", classNames?.triggerText)}>
          {children}
        </span>
        <svg
          // Rotation is keyed off the component's own state rather than an
          // `in-aria-expanded:` variant, which matches ANY ancestor carrying the
          // attribute — an accordion rendered inside one would rotate every
          // chevron. The attribute is still on the button either way, so a
          // consumer sheet can still select on it.
          className={cn("accordion-chevron", chevronClasses, isOpen && "rotate-180", classNames?.chevron)}
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

type AccordionContentProps = {
  /**
   * Class overrides for the parts inside the panel. `className` and `ref` stay
   * on the animating box — it is what every existing caller addresses — so this
   * reaches the padded body, which is the only route to the panel's inset: the
   * inset cannot sit on either outer element, because both are collapsed to
   * zero height while the panel is closed and their padding would survive it.
   */
  classNames?: SlotClassNames<"body">;
} & ComponentPropsWithRef<"div">;

const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  function AccordionContent({ className, classNames, children, ...props }, ref) {
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
        className={cn("accordion-content", contentClasses, className)}
        {...props}
      >
        <div
          // slot:(a) the clipper, and the class is the whole of it: the outer
          // box animates `grid-template-rows` and this one clips. Varying
          // `overflow-hidden` is not a restyle — it is the open and close
          // transition stopping working.
          className="accordion-content-inner overflow-hidden"
        >
          <div className={cn("accordion-content-body px-r6 pb-r4", classNames?.body)}>
            {children}
          </div>
        </div>
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
