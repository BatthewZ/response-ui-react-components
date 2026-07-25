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
import { cn } from "../../util/style";

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type CollapsibleContextValue = {
  open: boolean;
  toggle: () => void;
  disabled: boolean;
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
  const contentId = useId();

  const toggle = useCallback(() => {
    if (disabled) return;
    setOpen((prev) => !prev);
  }, [disabled, setOpen]);

  return (
    <CollapsibleContext.Provider value={{ open, toggle, disabled, contentId }}>
      <div
        ref={ref}
        className={cn("collapsible", className)}
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
    const { open, toggle, disabled, contentId } = useCollapsibleContext();

    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        disabled={disabled}
        data-state={open ? "open" : "closed"}
        className={cn("collapsible-trigger", className)}
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
    const { open, contentId } = useCollapsibleContext();

    return (
      <div
        ref={ref}
        id={contentId}
        role="region"
        data-state={open ? "open" : "closed"}
        // Collapsed content is only CSS-clipped (grid-template-rows: 0fr), so
        // without this its links stay tabbable and in the a11y tree. Same fix
        // as Accordion.Content; `hidden` would kill the rows transition.
        // Must sit here and not on the root, which would take the trigger with it.
        inert={!open}
        className={cn("collapsible-content", className)}
        {...props}
      >
        <div className="collapsible-content-inner">{children}</div>
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
