import { Copy, Download, Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "./Button";
import { ContextMenu } from "./ContextMenu";

/** Right-click anywhere in the `Trigger` region. Every `Item` needs its own 0-based `index`;
 *  `onSelect` runs the action and closes the menu. `starred` is `useState(false)`. */
export function Minimal() {
  const [starred, setStarred] = useState(false);

  return (
    <ContextMenu>
      <ContextMenu.Trigger>
        <p>Q3-forecast.xlsx {starred ? "★" : null}</p>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item index={0} onSelect={() => setStarred(true)}>
          Add to favourites
        </ContextMenu.Item>
        <ContextMenu.Item index={1} onSelect={() => setStarred(false)}>
          Remove from favourites
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  );
}

/** `Label` and `Divider` take no `index` and are never focused — only `Item`s are counted. */
export function GroupedActions() {
  return (
    <ContextMenu>
      <ContextMenu.Trigger>
        <p>Q3-forecast.xlsx</p>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Label>Q3-forecast.xlsx</ContextMenu.Label>
        <ContextMenu.Item index={0} icon={<Pencil size={16} aria-hidden="true" />}>
          Rename
        </ContextMenu.Item>
        <ContextMenu.Item index={1} icon={<Copy size={16} aria-hidden="true" />}>
          Duplicate
        </ContextMenu.Item>
        <ContextMenu.Item index={2} icon={<Star size={16} aria-hidden="true" />}>
          Add to favourites
        </ContextMenu.Item>
        <ContextMenu.Divider />
        <ContextMenu.Item index={3} icon={<Download size={16} aria-hidden="true" />}>
          Download a copy
        </ContextMenu.Item>
        <ContextMenu.Item index={4} icon={<Trash2 size={16} aria-hidden="true" />}>
          Move to trash
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  );
}

/** A `disabled` item keeps its `index` and its row; arrow keys step over it, typeahead does not. */
export function DisabledItem() {
  return (
    <ContextMenu>
      <ContextMenu.Trigger>
        <p>Q3-forecast.xlsx — shared with you, view only</p>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item index={0}>Duplicate</ContextMenu.Item>
        <ContextMenu.Item index={1} disabled>
          Rename
        </ContextMenu.Item>
        <ContextMenu.Item index={2} disabled>
          Move to trash
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  );
}

/** Wrap something focusable, or there is no keyboard route in: the Menu key and Shift+F10 fire
 *  `contextmenu` at the focused element, and ArrowDown on it opens the menu too. */
export function KeyboardReachable() {
  return (
    <ContextMenu>
      <ContextMenu.Trigger>
        <Button type="button" variant="ghost">
          Q3-forecast.xlsx
        </Button>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item index={0}>Rename</ContextMenu.Item>
        <ContextMenu.Item index={1}>Duplicate</ContextMenu.Item>
        <ContextMenu.Item index={2}>Move to trash</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  );
}

/** Controlled by `const [open, setOpen] = useState(false)`. Right-click still supplies the
 *  position; opening it yourself anchors the menu under the trigger box instead. */
export function Controlled() {
  const [open, setOpen] = useState(false);

  return (
    <ContextMenu open={open} onOpenChange={setOpen}>
      <ContextMenu.Trigger>
        <p>Q3-forecast.xlsx</p>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item index={0}>Rename</ContextMenu.Item>
        <ContextMenu.Item index={1}>Duplicate</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  );
}

/** The trigger is a plain block `div`, so its whole box is the right-click target — give it a
 *  size and a visible edge when the region is emptier than the menu it carries. */
export function SizedRegion() {
  return (
    <ContextMenu>
      <ContextMenu.Trigger className="rounded-md border border-border-default p-r3">
        <p>Drop files here, or right-click for options</p>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item index={0}>Upload from this device</ContextMenu.Item>
        <ContextMenu.Item index={1}>Import from Google Drive</ContextMenu.Item>
        <ContextMenu.Item index={2}>Paste from clipboard</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  );
}
