"use client";
import {
  type ComponentPropsWithRef,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
} from "react";

import { useControllableState } from "../../hooks/use-controllable-state";
import { focusRingButton } from "../../util/focus";
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Classes                                                            */
/* ------------------------------------------------------------------ */

/**
 * `Collapsible.css` is gone — everything it drew is here. One flat string
 * literal, because the docs and focus guards resolve hoisted constants
 * textually and a composed one would not resolve.
 *
 * `grid-template-rows` animates between the two tracks and the inner element
 * clips. The open track is variant-scoped, so it wins on specificity
 * (`.data-\[state\=open\]\:grid-rows-\[1fr\][data-state="open"]`, 0,2,0) rather
 * than on where Tailwind happens to sort it against the base's 0,1,0.
 *
 * `--MOTION-*` is in no Tailwind namespace, so the shift tokens are read as
 * custom properties; `ease-shift` generates nothing. The `[var(--X)]` spelling
 * rather than v4's `(--X)` shorthand is the package's idiom and the one
 * `verify:component-docs` resolves to a token. Both compile identically.
 */
const contentClasses =
  "grid grid-rows-[0fr] transition-[grid-template-rows] duration-[var(--MOTION-DURATION-SHIFT)] ease-[var(--MOTION-EASE-SHIFT)] data-[state=open]:grid-rows-[1fr] motion-reduce:transition-none";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type CollapsibleContextValue = {
  open: boolean;
  toggle: () => void;
  disabled: boolean;
  triggerId: string;
  contentId: string;
};

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

function useCollapsibleContext() {
  const ctx = useContext(CollapsibleContext);
  if (!ctx) throw new Error("Collapsible compound components must be used within <Collapsible>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Collapsible (root)                                                 */
/* ------------------------------------------------------------------ */

type CollapsibleProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
} & ComponentPropsWithRef<"div">;

const CollapsibleRoot = forwardRef<HTMLDivElement, CollapsibleProps>(function Collapsible(
  { open: controlledOpen, defaultOpen = false, onOpenChange, disabled = false, className, children, ...props },
  ref
) {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const contentId = `${baseId}-content`;

  const toggle = useCallback(() => {
    if (disabled) return;
    setOpen((prev) => !prev);
  }, [disabled, setOpen]);

  return (
    <CollapsibleContext.Provider value={{ open, toggle, disabled, triggerId, contentId }}>
      <div
        ref={ref}
        className={cn("collapsible w-full", className)}
        data-state={open ? "open" : "closed"}
        data-disabled={disabled || undefined}
        {...props}
      >
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
});

/* ------------------------------------------------------------------ */
/*  Collapsible.Trigger                                                */
/* ------------------------------------------------------------------ */

type CollapsibleTriggerProps = ComponentPropsWithRef<"button">;

const CollapsibleTrigger = forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  function CollapsibleTrigger({ className, children, onClick, ...props }, ref) {
    const { open, toggle, disabled, triggerId, contentId } = useCollapsibleContext();

    return (
      <button
        ref={ref}
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        disabled={disabled}
        data-state={open ? "open" : "closed"}
        // `.collapsible-trigger` is a styling hook with no rule behind it, so the
        // ring has to be a utility or a keyboard user gets the UA outline only (#95).
        className={cn("collapsible-trigger", focusRingButton, className)}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) toggle();
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Collapsible.Content                                                */
/* ------------------------------------------------------------------ */

type CollapsibleContentProps = ComponentPropsWithRef<"div">;

const CollapsibleContent = forwardRef<HTMLDivElement, CollapsibleContentProps>(
  function CollapsibleContent({ className, children, ...props }, ref) {
    const { open, triggerId, contentId } = useCollapsibleContext();

    return (
      <div
        ref={ref}
        id={contentId}
        role="region"
        // A region with no name is an unnamed landmark — the trigger is the only
        // thing that names it, so it has to carry an id. `Accordion.Content`
        // wires the same pair.
        aria-labelledby={triggerId}
        data-state={open ? "open" : "closed"}
        // Collapsed content is only CSS-clipped (grid-template-rows: 0fr), so
        // without this its links stay tabbable and in the a11y tree. Same fix
        // as Accordion.Content; `hidden` would kill the rows transition.
        // Must sit here and not on the root, which would take the trigger with it.
        inert={!open}
        className={cn("collapsible-content", contentClasses, className)}
        {...props}
      >
        <div
          // slot:(a) the clipper, and the class is the whole of it: the outer
          // box animates `grid-template-rows` and this one clips. Varying
          // `overflow-hidden` is not a restyle — it is the open and close
          // transition stopping working.
          className="collapsible-content-inner overflow-hidden"
        >
          {children}
        </div>
      </div>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const Collapsible = Object.assign(CollapsibleRoot, {
  Trigger: CollapsibleTrigger,
  Content: CollapsibleContent,
});
