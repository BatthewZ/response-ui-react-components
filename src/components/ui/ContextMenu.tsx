"use client";
import { type ComponentPropsWithRef, forwardRef } from "react";

import { mergeRefs } from "../../util/merge-refs";
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

  return <MenuContext.Provider value={menu}>{children}</MenuContext.Provider>;
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
        // No base class: the region is a bare `<div>` nothing in the package
        // paints, so `className` is the whole styling surface rather than one
        // half of a merge. The `context-menu-trigger` hook that used to sit here
        // named a stylesheet that never existed.
        className={className}
        // The Menu key and Shift+F10 fire `contextmenu` at the *focused*
        // element, so a trigger that is not a tab stop can never be opened from
        // the keyboard. Set before the rest spread so a caller can override it.
        tabIndex={0}
        {...getReferenceProps({
          ...props,
          onContextMenu(event: React.MouseEvent<HTMLDivElement>) {
            event.preventDefault();
            // Triggers nest. Without this the event keeps bubbling and every
            // ancestor trigger opens its own menu too, each one `aria-hidden`ing
            // the others; only the innermost menu describes what was clicked.
            event.stopPropagation();
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
  GroupHeader: MenuGroupHeader,
});
