import { GitBranch, Moon, Plus, Settings, Trash2, Users } from "lucide-react";
import { useState } from "react";

import { Button } from "./Button";
import { CommandPalette } from "./CommandPalette";
import { Kbd } from "./Kbd";

/** Controlled by `open`. Selecting a command runs its `onSelect`, then `onClose`. */
export function Minimal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        items={[
          {
            id: "new-project",
            label: "New project",
            onSelect: () => window.location.assign("/projects/new"),
          },
          {
            id: "invite-teammate",
            label: "Invite teammate",
            onSelect: () => window.location.assign("/settings/members"),
          },
          {
            id: "billing",
            label: "Billing settings",
            onSelect: () => window.location.assign("/settings/billing"),
          },
        ]}
      />
    </>
  );
}

/**
 * `group` bands the list under headers, in first-seen order. `keywords` widen the default
 * filter beyond the label — typing "theme" finds "Appearance".
 */
export function Grouped() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        items={[
          {
            id: "go-projects",
            label: "Go to Projects",
            group: "Navigation",
            keywords: ["repos", "workspaces"],
            onSelect: () => window.location.assign("/projects"),
          },
          {
            id: "go-members",
            label: "Go to Members",
            group: "Navigation",
            keywords: ["people", "team", "seats"],
            onSelect: () => window.location.assign("/settings/members"),
          },
          {
            id: "new-branch",
            label: "New branch",
            group: "Workspace",
            keywords: ["git", "checkout"],
            onSelect: () => window.location.assign("/branches/new"),
          },
          {
            id: "appearance",
            label: "Appearance",
            group: "Workspace",
            keywords: ["theme", "dark mode", "contrast"],
            onSelect: () => window.location.assign("/settings/appearance"),
          },
        ]}
      />
    </>
  );
}

/**
 * `icon` fills a leading `aria-hidden` slot; `shortcut` renders as a keycap chip pinned to the
 * trailing edge. Neither is announced, so the `label` has to carry the whole meaning.
 */
export function IconsAndShortcuts() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        items={[
          {
            id: "new-project",
            label: "New project",
            icon: <Plus size={16} />,
            shortcut: "⌘N",
            onSelect: () => window.location.assign("/projects/new"),
          },
          {
            id: "new-branch",
            label: "New branch",
            icon: <GitBranch size={16} />,
            shortcut: "⌘B",
            onSelect: () => window.location.assign("/branches/new"),
          },
          {
            id: "invite-teammate",
            label: "Invite teammate",
            icon: <Users size={16} />,
            onSelect: () => window.location.assign("/settings/members"),
          },
          {
            id: "appearance",
            label: "Toggle dark mode",
            icon: <Moon size={16} />,
            shortcut: "⌘⇧D",
            onSelect: () => document.documentElement.setAttribute("data-theme", "grimdark"),
          },
        ]}
      />
    </>
  );
}

/**
 * A `disabled` command still renders, but Arrow/Home/End step over it and both Enter and a
 * click refuse to fire it — use it to show a command exists and say why it is unavailable.
 */
export function DisabledCommands() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        items={[
          {
            id: "new-project",
            label: "New project",
            icon: <Plus size={16} />,
            onSelect: () => window.location.assign("/projects/new"),
          },
          {
            id: "transfer-workspace",
            label: "Transfer workspace (owner only)",
            icon: <Settings size={16} />,
            disabled: true,
            onSelect: () => window.location.assign("/settings/transfer"),
          },
          {
            id: "delete-workspace",
            label: "Delete workspace (owner only)",
            icon: <Trash2 size={16} />,
            disabled: true,
            onSelect: () => window.location.assign("/settings/delete"),
          },
          {
            id: "billing",
            label: "Billing settings",
            onSelect: () => window.location.assign("/settings/billing"),
          },
        ]}
      />
    </>
  );
}

/**
 * `filter` replaces the built-in label-and-keywords substring match outright — here a
 * prefix-only match, so "bi" finds "Billing settings" but "set" no longer does.
 */
export function CustomFilter() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        filter={(item, query) =>
          item.label.toLowerCase().startsWith(query.trim().toLowerCase())
        }
        items={[
          {
            id: "billing",
            label: "Billing settings",
            onSelect: () => window.location.assign("/settings/billing"),
          },
          {
            id: "branches",
            label: "Branch settings",
            onSelect: () => window.location.assign("/settings/branches"),
          },
          {
            id: "members",
            label: "Member settings",
            onSelect: () => window.location.assign("/settings/members"),
          },
        ]}
      />
    </>
  );
}

/** `emptyMessage` takes any node, so the dead end can point somewhere. */
export function CustomEmptyMessage() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        placeholder="Search commands, projects and people…"
        emptyMessage={
          <span>
            Nothing matches. Press <Kbd>Esc</Kbd> to close, or browse the{" "}
            <a href="/docs/shortcuts">shortcut reference</a>.
          </span>
        }
        items={[
          {
            id: "new-project",
            label: "New project",
            onSelect: () => window.location.assign("/projects/new"),
          },
          {
            id: "billing",
            label: "Billing settings",
            onSelect: () => window.location.assign("/settings/billing"),
          },
        ]}
      />
    </>
  );
}

/**
 * The panel's 36rem cap lives in unlayered component CSS, so a plain `max-w-*` utility loses
 * to it. The `!` modifier is what makes the override stick.
 */
export function NarrowerPanel() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        className="max-w-[28rem]!"
        items={[
          {
            id: "new-project",
            label: "New project",
            onSelect: () => window.location.assign("/projects/new"),
          },
          {
            id: "billing",
            label: "Billing settings",
            onSelect: () => window.location.assign("/settings/billing"),
          },
        ]}
      />
    </>
  );
}
