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

/** The two keyboard equivalents of a right-click. */
function isContextMenuKey(event: React.KeyboardEvent): boolean {
  return event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);
}

const ContextMenuTrigger = forwardRef<HTMLDivElement, ContextMenuTriggerProps>(
  function ContextMenuTrigger({ children, className, onContextMenu, onKeyDown, ...props }, ref) {
    const { setOpen, refs, getReferenceProps } =
      useMenuContext("ContextMenu.Trigger");

    return (
      <div
        ref={mergeRefs(ref, refs.setReference)}
        className={cn("context-menu-trigger", className)}
        // The Menu key and Shift+F10 fire `contextmenu` at the *focused*
        // element, so a trigger that is not a tab stop can never be opened from
        // the keyboard. Set before the rest spread so a caller can override it.
        tabIndex={0}
        {...getReferenceProps({
          ...props,
          onContextMenu(event: React.MouseEvent<HTMLDivElement>) {
            event.preventDefault();
            onContextMenu?.(event);
            // `MenuContent` mounts with `initialFocus={-1}`, so nothing moves
            // focus into the menu. Pointing it at the trigger keeps the
            // list-navigation and typeahead key handlers `getReferenceProps`
            // installs reachable; without this a right-click leaves
            // `activeElement` on `<body>` and the open menu takes no keys.
            event.currentTarget.focus();
            // Recreate a fresh virtual reference at the cursor on every
            // right-click so re-opening at a new spot repositions the menu.
            const { clientX, clientY } = event;
            refs.setPositionReference({
              getBoundingClientRect: () => new DOMRect(clientX, clientY, 0, 0),
            });
            setOpen(true);
          },
          onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
            onKeyDown?.(event);
            if (event.defaultPrevented || !isContextMenuKey(event)) return;
            // Suppress the browser's own menu so the key opens this one once,
            // not both.
            event.preventDefault();
            // Drop any cursor point left by an earlier right-click: a keyboard
            // open has no cursor, so it anchors on the trigger box instead.
            refs.setPositionReference(null);
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
