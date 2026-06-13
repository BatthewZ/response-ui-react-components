"use client";
import {
  cloneElement,
  type ComponentPropsWithRef,
  forwardRef,
  isValidElement,
  type ReactElement,
  useMemo,
} from "react";

import { type Placement } from "../../hooks/use-floating";
import { mergeRefs } from "../../util/merge-refs";
import { cn } from "../../util/style";
import {
  MenuContent,
  MenuContext,
  type MenuContextValue,
  MenuDivider,
  MenuItem,
  MenuLabel,
  useMenuContext,
  useMenuRoot,
} from "./menu-internals";

const CLASS_PREFIX = "dropdown-menu";

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

  const value = useMemo<MenuContextValue>(
    () => ({ ...menu, classPrefix: CLASS_PREFIX }),
    [menu]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
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
      // eslint-disable-next-line react-hooks/refs -- mergeRefs defers ref assignment to the returned callback
      ref: mergeRefs(ref, refs.setReference),
      "aria-expanded": open,
      "aria-haspopup": "menu" as const,
      "aria-controls": open ? menuId : undefined,
      ...getReferenceProps(props),
    };

    if (asChild && isValidElement(children)) {
      return cloneElement(children as ReactElement<Record<string, unknown>>, {
        ...triggerProps,
        className: cn(
          (children.props as Record<string, unknown>).className as string | undefined,
          className
        ),
      });
    }

    return (
      <button className={cn("dropdown-menu-trigger", className)} {...triggerProps}>
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
  Label: MenuLabel,
});
