# CommandPalette

A ⌘K launcher: one flat array of commands in, a filtered, grouped, keyboard-driven list out,
rendered in a native `<dialog>` so the focus trap, the inert page behind it and the top-layer
stacking are the platform's job rather than yours. You supply the commands and the keybinding.

<!-- example:Minimal -->
```tsx
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
```
<!-- /example -->

| Prop           | Type                                              | Default                            |
| -------------- | ------------------------------------------------- | ---------------------------------- |
| `open`         | `boolean`                                         | — _(required)_                     |
| `onClose`      | `() => void`                                      | — _(required)_                     |
| `items`        | `CommandItem[]`                                   | — _(required)_                     |
| `filter`       | `(item: CommandItem, query: string) => boolean`   | case-insensitive substring over `label` + `keywords` |
| `placeholder`  | `string`                                          | `"Type a command or search…"`      |
| `emptyMessage` | `ReactNode`                                       | `"No results"`                     |
| `className`    | `string`                                          | —                                  |
| `ref`          | `Ref<HTMLDialogElement>`                          | —                                  |
| …rest          | `dialog` props, less `open`                       | —                                  |

`open` is required, so the palette is **always** controlled — it opens itself with
`showModal()` when the boolean flips to `true` and closes when it flips back. `onClose` fires
on Escape and after any selection; nothing shuts unless that callback moves your state.

### `CommandItem`

`CommandItem` is exported alongside the component, so you can type the array you build.

| Field       | Type            | What it does                                                                 |
| ----------- | --------------- | ---------------------------------------------------------------------------- |
| `id`        | `string`        | React key **only** — it never reaches the DOM, and selection tracks position, not id |
| `label`     | `string`        | The visible text, and the option's accessible name                            |
| `onSelect`  | `() => void`    | Runs on Enter or click, immediately followed by `onClose()`                    |
| `group`     | `string?`       | Header text; groups render in first-seen order                                |
| `icon`      | `ReactNode?`    | Leading slot, wrapped in `aria-hidden="true"`                                 |
| `shortcut`  | `string?`       | Trailing keycap chip, rendered with [Kbd](kbd.md)                             |
| `keywords`  | `string[]?`     | Extra terms the default filter matches, invisible on screen                    |
| `disabled`  | `boolean?`      | Renders dimmed, skipped by every navigation key, ignores clicks                |

## Opening it

**The ⌘K binding is yours.** CommandPalette registers no global key listener — it only reacts
to the `open` prop — so nothing opens it until you wire a shortcut up. That is deliberate:
which chord, which scope, and whether it toggles or only opens are app decisions. Here is the
usual version — and the `open`/`setOpen` every example on this page refers to:

```tsx
const [open, setOpen] = useState(false);

useEffect(() => {
  const onKey = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setOpen((wasOpen) => !wasOpen);
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
```

`preventDefault()` matters: Firefox and Safari both bind ⌘K to the address bar. Also render a
visible affordance — a search button in your header — because a keyboard-only entry point is
undiscoverable and unreachable on touch.

Opening resets the query to `""` and moves the highlight to the first selectable command, then
focuses the search input on the next animation frame. Closing does **not** reset anything; the
reset runs on the way in, so a reopened palette is always blank.

## Grouping and keywords

`group` is presentational banding — a `<li role="group">` with a header, in the order the
groups are first seen while scanning `items`. `keywords` are matched by the default filter but
never rendered, which is how "theme" or "dark mode" can find a command labelled "Appearance".

<!-- example:Grouped -->
```tsx
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
```
<!-- /example -->

Keep every member of a group **contiguous in the `items` array**. The rendered order is
grouped, but arrow keys walk the array's own order, and the two diverge the moment they
disagree — see [Gotchas](#gotchas).

## Icons and shortcuts

<!-- example:IconsAndShortcuts -->
```tsx
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
```
<!-- /example -->

`shortcut` is a **label, not a binding.** Rendering `"⌘N"` on a row does not register ⌘N;
that is a second `keydown` listener you write, exactly like ⌘K above. The chip is a
[Kbd](kbd.md), so it re-tints from Kbd's tokens rather than this component's.

## Disabled commands

<!-- example:DisabledCommands -->
```tsx
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
```
<!-- /example -->

A disabled row gets `aria-disabled="true"` and `data-disabled`, and every navigation key steps
over it in whichever direction you are travelling. If **every** item is disabled the input
drops its `aria-activedescendant` entirely and Enter does nothing — including not calling
`onClose`, so the palette stays open with no selection possible.

## Replacing the filter

<!-- example:CustomFilter -->
```tsx
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
```
<!-- /example -->

`filter` runs once per item per keystroke and receives the raw query, untrimmed and uncased —
the default does `query.trim().toLowerCase()` itself before comparing, and a replacement that
forgets to will not match anything after a space. Nothing special-cases the opening frame
either: a filter that returns `false` for `""` opens the palette straight onto its empty state.

Give the function a stable identity — module scope, or `useCallback` — or the highlight snaps
back to the first row on every parent render. Same for `items`. See [Gotchas](#gotchas).

## The empty state

<!-- example:CustomEmptyMessage -->
```tsx
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
```
<!-- /example -->

The empty message replaces the option list entirely, rendering as an `<li role="presentation">`
inside the listbox. Anything interactive you put in it stays outside the palette's own key
handling — the search input keeps DOM focus and the arrow keys only move between options — so a
link in there is reachable by pointer, or by pressing Tab once from the input.

## Sizing the panel

<!-- example:NarrowerPanel -->
```tsx
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
```
<!-- /example -->

The panel is `width: 100%` capped at `36rem`, pinned `12vh` from the top rather than centred.
Those are literals in `CommandPalette.css`, not tokens. `className` merges through
`tailwind-merge` and lands on the `<dialog>`, but this package's stylesheet declares no cascade
layer while Tailwind v4 puts utilities in `@layer utilities` — and unlayered author rules
outrank layered ones before specificity is consulted. So `max-w-[28rem]` alone loses to
`.command-palette`; `max-w-[28rem]!`, an inline `style`, or your own unlayered rule wins.
Utilities for properties the stylesheet never sets (`z-index`, `font-family`) apply normally.

## Theme tokens

Every colour, radius, size and duration in `CommandPalette.css` is a contract variable read
through `var()` — the component's `.tsx` carries no Tailwind utilities at all, only the
`command-palette` class names. Override any of these and the palette re-tints at runtime.

| Where                                                          | Override                                                          |
| -------------------------------------------------------------- | ----------------------------------------------------------------- |
| Panel surface                                                   | `--C-SURFACE-0`                                                   |
| Panel border · divider under the search box                     | `--C-BORDER-DEFAULT`                                              |
| Panel corners                                                   | `--RADIUS-LG`                                                     |
| Panel elevation                                                 | `--SHADOW-LG`                                                     |
| Backdrop scrim                                                  | `--OVERLAY-SCRIM-COLOR`                                           |
| Query text · option label                                       | `--C-TEXT-PRIMARY`                                                |
| Leading icon slot                                               | `--C-TEXT-SECONDARY`                                              |
| Placeholder · group header · empty message · disabled option    | `--C-TEXT-MUTED`                                                  |
| Highlighted option — wash · ring                                | `--C-SURFACE-2` · `--C-BORDER-FOCUS`                              |
| Search input focus ring                                         | `--C-BORDER-FOCUS`                                                |
| Option corners                                                  | `--RADIUS-MD`                                                     |
| Query type                                                      | `--BodyText-1` · `--BodyText-1-line-height`                       |
| Option and empty-message type                                   | `--BodyText-2` · `--BodyText-2-line-height`                       |
| Group header type                                               | `--BodyText-3` · `--BodyText-3-line-height` · `--Semibold-Weight` |
| Search box padding                                              | `--R-SIZE-4` (block) · `--R-SIZE-3` (inline)                      |
| List inset · group header padding                               | `--R-SIZE-6` · `--R-SIZE-5`                                       |
| Option padding · gap between groups                             | `--R-SIZE-5`                                                      |
| Icon-to-label gap                                               | `--R-SIZE-4`                                                      |
| Empty-message padding                                           | `--R-SIZE-3` · `--R-SIZE-5`                                       |
| Panel entrance                                                  | `--MOTION-DURATION-ENTER` · `--MOTION-EASE-ENTER`                 |
| Option highlight transition                                     | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT`                 |

All four spacing tokens sit on the responsive `r`-scale, and three step up at the 40rem
breakpoint: `--R-SIZE-3` (`1rem` → `1.5rem`), `--R-SIZE-4` (`0.75rem` → `1.25rem`) and
`--R-SIZE-5` (`0.5rem` → `0.75rem`). `--R-SIZE-6` is on the same scale but holds at `0.25rem`
either side, so the list's own inset never changes. The `--BodyText-*` steps are responsive too.

**The scrim does follow the theme**, unlike [Dialog](dialog.md#theme-tokens): `::backdrop` is
`var(--OVERLAY-SCRIM-COLOR, rgb(0 0 0 / 0.5))`, so the literal only applies when
`@batthewz/response-ui-css` is not loaded at all.

**Muted ink is hint-level, and here it carries real content.** `--C-TEXT-MUTED` on
`--C-SURFACE-0` measures 4.95:1 in the default theme, 4.85:1 in `events`, 5.23:1 in `grimdark`
and 4.87:1 in `tech` — clearing the 4.5:1 body-text floor in all four since `@batthewz/response-ui-css` **v0.10.1**, where
it read 2.10–2.59 before. It is still *visually* hint-level, so prefer the title for anything a
user must act on; but the group headers and the "No results" message are no longer under the
floor. Pass an `emptyMessage` node with your own ink if you want more weight than that.
Disabled rows compound it further — the same token at `opacity: 0.6` lands at 1.46–1.68:1 —
though an inactive control is exempt from the contrast minimum. See the
[theme contract](../theme-contract.md).

**Off the contract:** the `36rem` cap, the `12vh` offset, the `24rem` list `max-height`, the
`0.04em` header tracking and the `0.6` disabled opacity are literals, so re-theming changes the
palette's colour, spacing and timing but not its shape.

## Gotchas

- **The highlight's wash is a 1.1:1 nothing — the ring over it is the cue.** `background:
  var(--C-SURFACE-2)` over the panel's `--C-SURFACE-0` measures 1.10:1 in the default theme,
  1.08:1 in `events`, 1.08:1 in `tech` and 1.16:1 in `grimdark`, against a 3:1 floor for a
  non-text indicator, so `.command-palette-option[data-active]` also draws a 2px
  `--C-BORDER-FOCUS` outline at `-2px` offset. It comes from the attribute rather than
  `:focus-visible` because DOM focus never leaves the search input, so no pseudo-class can ever
  match the row. Against that wash the ring measures 3.34 / 3.15 / 13.70 / 3.15:1 (default /
  `events` / `tech` / `grimdark`) against `@batthewz/response-ui-css` **v0.10.1** — over the
  3:1 floor in every theme. It read 2.52 and 2.55 in `events` and `grimdark` before that
  release retuned `--C-BORDER-FOCUS`, which also carries the search input's own ring, so a
  custom theme retuning that token moves both at once.
- **Arrow keys walk the array, not the screen.** Grouping is a rendering pass over the same
  flat filtered list, but `activeIndex` moves through that flat list by ±1. With
  `[File-A, Edit-A, File-B]` the palette *renders* File-A, File-B, Edit-A — and ArrowDown from
  File-A highlights **Edit-A**, the third row on screen; ArrowDown again jumps back up to
  File-B. (Measured.) Keep each group's members adjacent in `items`.
- **The highlight resets when `items` or `filter` changes identity.** An effect keyed on the
  memoised filtered list snaps `activeIndex` back to the first selectable row. Both `items` and
  `filter` are dependencies of that memo, so an inline array literal or an inline arrow makes a
  new one on every render of the *parent* — arrow down twice, let the parent re-render for any
  unrelated reason, and you are back at row one. Hoist both to module scope, `useMemo` the
  array and `useCallback` the filter.
- **`className` utilities lose to `CommandPalette.css`.** Unlayered component CSS outranks
  Tailwind's layered utilities — see [Sizing the panel](#sizing-the-panel).
- **Nothing dismisses it but Escape and your own state.** There is no light dismiss, no
  `closedby` attribute, and no close button. A backdrop click targets the `<dialog>` element
  and no handler is attached, so it does nothing. Escape is intercepted correctly — the `cancel`
  listener calls `preventDefault()` first, so the element cannot close behind React's back — but
  an `onClose` that doesn't flip your boolean leaves the palette stuck open with no way out for
  a pointer user.
- **`onClose` occupies the native handler's name.** It is destructured out rather than spread,
  so you cannot subscribe to the DOM `close` event through the props. `onCancel` *is* spread and
  fires, but cannot opt out of the interception. Use the forwarded `ref` and `addEventListener`
  if you need the real `close`.
- **Every command is mounted while the palette is closed.** The `<dialog>` and the whole option
  list render on the very first pass, filter included; the browser just hides them with
  `dialog:not([open]) { display: none }`. So a 1000-command array is 1000 `<li>`s in the DOM and
  in the server-rendered HTML of a page nobody ever opens the palette on. Gate `items` on `open`
  yourself if that shows up in a profile. The same UA rule is why a `display` utility in
  `className` would unhide the closed panel.
- **Pointer movement steals the highlight.** Each option handles `onMouseMove`, so if the cursor
  happens to be resting over the list, the first pixel of movement after you arrow somewhere
  yanks the highlight to whatever is under the pointer.
- **The page behind still scrolls.** [Dialog](dialog.md) opts into the library's
  `no-body-scroll` class; this component does not, and the list sets no `overscroll-behavior`,
  so a wheel gesture past the end of the results scrolls the document underneath the scrim.
- **`item.id` is a React key and nothing else.** It never reaches the DOM — option ids are
  generated from `useId()` plus the item's index, and selection tracks that index. Two items in
  the same `group` sharing an `id` produce React's duplicate-key warning; across groups the
  collision is invisible, because each group renders its own list.
- **It's a client component.** The file carries `"use client"`. It server-renders as a closed
  `<dialog>` with the whole list inside it, and `showModal()` only runs in an effect — so a
  palette mounted with `open` already `true` appears one paint after hydration.

## Accessibility

The palette is the ARIA 1.2 combobox-with-listbox pattern, driven by **virtual focus**: DOM
focus stays on the search input the entire time, and `aria-activedescendant` names the
highlighted `<li role="option">`. That is what lets you keep typing while the highlight moves.
`showModal()` makes the rest of the document genuinely inert, so no `aria-modal` is set or
needed, and closing returns focus to whatever was focused before — both native.

- **Arrow keys, Home, End and Enter are handled; nothing else is.** Arrow wrapping runs both
  ways, Home and End jump to the first and last *selectable* rows, and all four skip disabled
  items. There is no Tab-to-select, no PageUp/PageDown, and no type-ahead beyond the query.
- **The highlight is drawn as a ring, because focus is virtual.** Its wash is 1.08–1.16:1 and
  carries nothing, so the row's `data-active` rule draws a `--C-BORDER-FOCUS` outline instead —
  3.15–13.70:1 depending on the theme, over the 3:1 floor in all four since
  `@batthewz/response-ui-css` v0.10.1 (it was 2.52–2.55 in `events` and `grimdark` before).
  See [Gotchas](#gotchas). The highlight is also gated on
  the same predicate as `aria-activedescendant`, so a palette whose rows are all disabled shows
  no cursor at all rather than one pointing at a row Enter would not act on.
- **You cannot give the search input an accessible name.** Rest props are spread on the
  `<dialog>`, not the input, so an `aria-label` you pass renames the *dialog*. The input carries
  no `aria-label`, no `aria-labelledby` and no `<label>`, which leaves it with only the
  browser's `placeholder` fallback for a name — and with nothing at all if you pass
  `placeholder=""`.
- **The dialog's name is overridable, the listbox's is not.** `aria-label="Command palette"` is
  written before the rest spread, so your own `aria-label` wins on the `<dialog>`. The
  listbox's `aria-label="Commands"` is hard-coded English with no prop reaching it — it will not
  localise.
- **No result count is announced.** Filtering swaps the DOM silently: there is no live region,
  so a screen-reader user who types four characters and reduces 50 commands to zero hears
  nothing at all, because the "No results" node is not announced either. Render your own
  `aria-live="polite"` counter alongside the palette if that matters.
- **Group nesting is not the shape ARIA specifies.** Options sit inside a plain `<ul>` (implicit
  `role="list"`) inside the `<li role="group">`, so the listbox does not directly own its
  options; support for position reporting varies. Ungrouped items get a `role="group"` wrapper
  too, with no accessible name.
- **Icons are hidden, shortcuts are not.** The `icon` slot is `aria-hidden="true"` — even an
  `aria-label` on your own glyph is suppressed — so anything meaning-bearing has to go in the
  `label`. The `shortcut` chip *is* part of the option's name, and with no separator between the
  two spans: an item labelled `"New project"` with `shortcut="⌘N"` computes an accessible name
  of `"New project⌘N"`. Glyph strings like that read unpredictably, so prefer plain words
  (`"Ctrl N"`) if your audience uses a screen reader.
- **Reduced motion is respected.** A `@media (prefers-reduced-motion: reduce)` block drops the
  panel animation, the backdrop fade and the option transition — unlike [Dialog](dialog.md),
  whose fade plays regardless.

## Related

[Dialog](dialog.md) · [Drawer](drawer.md) · [Kbd](kbd.md) · [DropdownMenu](dropdown-menu.md) ·
[SearchInput](search-input.md) · [Combobox](combobox.md) · [AppShell](app-shell.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
