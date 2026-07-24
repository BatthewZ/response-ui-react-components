import { Copy, Link2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "./Button";
import { DropdownMenu } from "./DropdownMenu";

/** Every `Item` needs an `index` — 0-based, in the order the arrow keys should walk. */
export function Minimal() {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger type="button">Document actions</DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item
          index={0}
          onSelect={() => navigator.clipboard.writeText(window.location.href)}
        >
          Copy link
        </DropdownMenu.Item>
        <DropdownMenu.Item index={1} onSelect={() => window.print()}>
          Print
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

/** `Label` and `Divider` are decoration: no `index`, never focused, skipped by the arrow keys. */
export function LabelledGroups() {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger type="button">Pull request #42</DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>Edit</DropdownMenu.Label>
        <DropdownMenu.Item index={0} icon={<Pencil aria-hidden="true" />}>
          Rename branch
        </DropdownMenu.Item>
        <DropdownMenu.Item index={1} icon={<Copy aria-hidden="true" />}>
          Duplicate branch
        </DropdownMenu.Item>
        <DropdownMenu.Item index={2} icon={<Link2 aria-hidden="true" />}>
          Copy branch name
        </DropdownMenu.Item>
        <DropdownMenu.Divider />
        <DropdownMenu.Label>Danger zone</DropdownMenu.Label>
        <DropdownMenu.Item index={3} icon={<Trash2 aria-hidden="true" />}>
          Delete branch
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

/** A `disabled` item keeps its `index` and its place, but the arrow keys step over it. */
export function DisabledItem() {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger type="button">Deployment</DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item index={0}>Redeploy</DropdownMenu.Item>
        <DropdownMenu.Item index={1} disabled>
          Roll back — no previous build
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

/** Drive it yourself with `open` + `onOpenChange`, from `const [open, setOpen] = useState(false)`. */
export function Controlled() {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger type="button">Export {open ? "▴" : "▾"}</DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item index={0}>Download CSV</DropdownMenu.Item>
        <DropdownMenu.Item index={1}>Download XLSX</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

/** `asChild` merges the trigger wiring onto your own element instead of wrapping it. */
export function TriggerAsChild() {
  return (
    <DropdownMenu placement="bottom-end">
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" type="button">
          Account
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item index={0}>Profile settings</DropdownMenu.Item>
        <DropdownMenu.Item index={1}>Sign out</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

/** `placement` is only the preferred side — the menu flips and shifts to stay on screen. */
export function Placement() {
  return (
    <DropdownMenu placement="right-start">
      <DropdownMenu.Trigger type="button">Move to…</DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item index={0}>Backlog</DropdownMenu.Item>
        <DropdownMenu.Item index={1}>In progress</DropdownMenu.Item>
        <DropdownMenu.Item index={2}>Archive</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
