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
      <button type="button" className={cn("dropdown-menu-trigger", className)} {...triggerProps}>
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
