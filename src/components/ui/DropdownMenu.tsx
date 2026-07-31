"use client";
import {
  cloneElement,
  type ComponentPropsWithRef,
  forwardRef,
  isValidElement,
  type ReactElement,
} from "react";

import { type Placement } from "../../hooks/use-floating";
import { mergeProps } from "../../util/merge-props";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";
import {
  MenuContent,
  MenuContext,
  MenuDivider,
  MenuGroupHeader,
  MenuItem,
  useMenuContext,
  useMenuRoot,
} from "./menu-internals";

/**
 * The trigger paints nothing: it lays a `<button>` out and gets out of the way,
 * which is what makes `asChild` with a `Button` look like a Button and the bare
 * trigger look like the text around it.
 *
 * `DropdownMenu.css` is gone rather than reduced. Its rule was three resets
 * (`background: none`, `border: none`, `padding: 0`, `font: inherit`) and two
 * positive declarations, and a reset cannot be transposed into a class list —
 * Tailwind sorts arbitrary properties last, so `[font:inherit]` would beat a
 * caller's `className` instead of losing to it. The escape is enumeration rather
 * than transposition: Preflight already gives a `<button>` every one of those
 * four (checked in the compiled base layer — `background-color: transparent`,
 * `border: 0 solid`, `margin`/`padding: 0`, `font: inherit`), which is the same
 * thing `Button.tsx` relies on while carrying no reset of its own. So only the
 * two positive declarations were left to move.
 */
const dropdownTriggerClasses = "inline-flex w-fit cursor-pointer";

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
  open,
  onOpenChange,
  defaultOpen = false,
  placement = "bottom-start",
  children,
}: DropdownMenuRootProps) {
  const menu = useMenuRoot({ open, onOpenChange, defaultOpen, placement });

  return <MenuContext.Provider value={menu}>{children}</MenuContext.Provider>;
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
    const { open, refs, getReferenceProps, menuId } = useMenuContext("DropdownMenu.Trigger");
    const triggerProps = {
      ref: mergeRefs(ref, refs.setReference),
      "aria-expanded": open,
      "aria-haspopup": "menu" as const,
      "aria-controls": open ? menuId : undefined,
      ...getReferenceProps(props),
    };

    if (asChild && isValidElement(children)) {
      // `cloneElement` overwrites props rather than merging them, so spreading
      // `triggerProps` bare would discard the child's own handlers and ref.
      return cloneElement(
        children as ReactElement<Record<string, unknown>>,
        mergeProps(children.props as Record<string, unknown>, {
          ...triggerProps,
          className,
        })
      );
    }

    return (
      <button
        type="button"
        className={cn("dropdown-menu-trigger", dropdownTriggerClasses, className)}
        {...triggerProps}
      >
        {children}
      </button>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Export                                                            */
/* ------------------------------------------------------------------ */

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger: DropdownMenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  Divider: MenuDivider,
  GroupHeader: MenuGroupHeader,
});
