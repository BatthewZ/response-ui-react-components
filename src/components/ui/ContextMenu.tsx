"use client";
import {
  type ComponentPropsWithRef,
  forwardRef,
  useMemo,
} from "react";

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

/**
 * ContextMenu reuses the existing `dropdown-menu-*` styles, so it ships no CSS
 * of its own.
 */
const CLASS_PREFIX = "dropdown-menu";

/* ------------------------------------------------------------------ */
/*  Root                                                              */
/* ------------------------------------------------------------------ */

interface ContextMenuRootProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function ContextMenuRoot({
  open,
  onOpenChange,
  defaultOpen = false,
  children,
}: ContextMenuRootProps) {
  // enableClick:false — a context menu opens via right-click (see Trigger), not
  // a left-click on the reference element.
  const menu = useMenuRoot({
    open,
    onOpenChange,
    defaultOpen,
    placement: "bottom-start",
    enableClick: false,
  });

  const value = useMemo<MenuContextValue>(
    () => ({ ...menu, classPrefix: CLASS_PREFIX }),
    [menu]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

/* ------------------------------------------------------------------ */
/*  Trigger                                                           */
/* ------------------------------------------------------------------ */

type ContextMenuTriggerProps = ComponentPropsWithRef<"div">;

const ContextMenuTrigger = forwardRef<HTMLDivElement, ContextMenuTriggerProps>(
  function ContextMenuTrigger({ children, className, onContextMenu, ...props }, ref) {
    const { setOpen, refs, getReferenceProps } =
      useMenuContext("ContextMenu.Trigger");

    return (
      <div
        // eslint-disable-next-line react-hooks/refs -- mergeRefs defers ref assignment to the returned callback
        ref={mergeRefs(ref, refs.setReference)}
        className={cn("context-menu-trigger", className)}
        {...getReferenceProps({
          ...props,
          onContextMenu(event: React.MouseEvent<HTMLDivElement>) {
            event.preventDefault();
            onContextMenu?.(event);
            // Recreate a fresh virtual reference at the cursor on every
            // right-click so re-opening at a new spot repositions the menu.
            const { clientX, clientY } = event;
            refs.setPositionReference({
              getBoundingClientRect: () => new DOMRect(clientX, clientY, 0, 0),
            });
            setOpen(true);
          },
        })}
      >
        {children}
      </div>
    );
  }
);

/* ------------------------------------------------------------------ */
/*  Export                                                            */
/* ------------------------------------------------------------------ */

export const ContextMenu = Object.assign(ContextMenuRoot, {
  Trigger: ContextMenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  Divider: MenuDivider,
  Label: MenuLabel,
});
