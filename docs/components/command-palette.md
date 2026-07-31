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
| `items`        | `CommandPaletteItem[]`                            | — _(required)_                     |
| `filter`       | `(item, query) => boolean`                        | case-insensitive substring over `label` + `keywords` |
| `children`     | `(args: CommandPaletteRenderArgs) => ReactNode`   | — (the standard row)               |
| `placeholder`  | `string`                                          | `"Type a command or search…"`      |
| `emptyMessage` | `ReactNode`                                       | `"No results"`                     |
| `searchLabel`  | `string` — accessible name of the search input    | `"Search commands"`                |
| `listLabel`    | `string` — accessible name of the listbox         | `"Commands"`                       |
| `statusMessage`| `(count: number) => string` — announced when the result count changes | `"N commands"` / `"1 command"` |
| `className`    | `string` — lands on the `<dialog>`, the panel itself | —                               |
| `classNames`   | `{ search?, input?, list?, group?, groupHeader?, empty?, itemIcon?, itemLabel?, itemShortcut? }` | — (see [Slots](#slots)) |
| `ref`          | `Ref<HTMLDialogElement>`                          | —                                  |
| …rest          | `dialog` props, less `open` / `children`          | —                                  |

`open` is required, so the palette is **always** controlled — it opens itself with
`showModal()` when the boolean flips to `true` and closes when it flips back. `onClose` fires
on Escape, on a press that lands on the scrim outside the panel, and after any selection;
nothing shuts unless that callback moves your state.

### `CommandPaletteItem`

`CommandPaletteItem` is exported alongside the component, so you can type the array you build.
It was called `CommandItem` before v0.12; the name now matches its component and the word
*item* that every list in this library uses for a repeated unit.

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

`group` renders a `<div role="group">` labelled by its header (`aria-labelledby`), in the
order the groups are first seen while scanning `items`. `keywords` are matched by the default
filter but
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

Group members need not be contiguous in `items`: rendering gathers them under the first
appearance of their group, and the arrow keys walk the **rendered** order, so the keyboard
and the screen always agree.

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
      onSelect: () => document.documentElement.setAttribute("data-theme", "midnight"),
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

The snap to the first row is keyed on the query itself, so an unstable `filter` or `items`
identity — an inline arrow or array literal remade on every parent render — does not reset
the highlight; wherever the user arrowed to survives unrelated re-renders.

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

The empty message replaces the option list entirely, rendering as a `<div role="presentation">`
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
  className="max-w-[28rem]"
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

The panel is `w-full` capped at `max-w-xl` (36rem), pinned `mt-[12vh]` from the top rather
than centred. Those are literals, not tokens. `className` merges through `tailwind-merge` and
lands on the `<dialog>`, so `max-w-[28rem]` on its own collapses the default and wins. It used
to need the important modifier (`max-w-[28rem]!`), because the stylesheet was unlayered and
out-ranked every utility before specificity was consulted.

## Composing a row

The default row is icon, label, keycap. When you want something else in it — an avatar, a
second line, a badge — pass a function as `children`. The palette calls it **once per row**
of the list it has already filtered, grouped and ordered, and you return a
`CommandPalette.Item`.

<!-- example:ComposedRow -->
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
      group: "Create",
      shortcut: "⌘N",
      onSelect: () => window.location.assign("/projects/new"),
    },
    {
      id: "billing",
      label: "Billing settings",
      group: "Settings",
      onSelect: () => window.location.assign("/settings/billing"),
    },
  ]}
>
  {({ item, active }) => (
    <CommandPalette.Item>
      <span className="flex-1 text-left">{item.label}</span>
      {item.shortcut != null && <Kbd>{item.shortcut}</Kbd>}
      {active && <span className="text-fg-muted">↵</span>}
    </CommandPalette.Item>
  )}
</CommandPalette>
```
<!-- /example -->

Three things this shape buys, and they are the reason it is a function rather than a
`renderItem` prop or a flat `<CommandPalette.Item>` you place yourself:

- **`items` stays the only writer of the list.** The palette filters, groups and numbers the
  rows; you write what is inside one. There is no second place a row can come from, so the
  keyboard order, the result count and the announced status cannot disagree with the screen.
- **`CommandPalette.Item` takes no data prop at all.** It reads the row it is from the call
  it was returned from — which is why it carries the `id`, `role="option"`,
  `aria-selected`, `aria-disabled`, the `data-active` the focus ring hangs off, the
  hover-tracking and the select-then-close handler without you supplying any of them.
  Rendered anywhere else it throws, rather than producing an option the palette does not
  know about.
- **The listbox structure stays the palette's.** A listbox owns its options directly or
  through a `role="group"` that is itself a direct child; the palette renders that scaffold
  and calls you inside it, so a composed row cannot break the ownership chain.

`args` is `{ item, index, active }` — `index` is the position in the rendered order, and
`active` is whether the row currently holds the virtual keyboard cursor.

**Return a `CommandPalette.Item`.** Returning a bare `<div>` gets you an element with no
role, no id and no handler: the row will paint and do nothing. That failure is visible on
the first keypress rather than silent.

## Slots

`className` is the `<dialog>` — the palette panel itself, which is the element carrying the
border, radius, shadow and `max-width`. The result row is reached through
`CommandPalette.Item`'s own `className`. Everything else is a slot:

| Slot           | Element                             | What it addresses                   |
| -------------- | ----------------------------------- | ----------------------------------- |
| `search`       | `div.command-palette-search`        | the search row and its bottom rule  |
| `input`        | `input.command-palette-input`       | the query field                     |
| `list`         | `div.command-palette-list`          | the scrolling `role="listbox"`      |
| `group`        | `div.command-palette-group`         | every group (applies to each)       |
| `groupHeader`  | `div.command-palette-group-header`  | every group heading                 |
| `empty`        | `div.command-palette-empty`         | the no-results row                  |
| `itemIcon`     | `span.command-palette-option-icon`  | the **default** row's leading glyph |
| `itemLabel`    | `span.command-palette-option-label` | the default row's text              |
| `itemShortcut` | `.command-palette-option-shortcut`  | the default row's [Kbd](kbd.md)     |

```tsx
<CommandPalette
  open={open}
  onClose={close}
  items={commands}
  classNames={{ list: "max-h-[18rem]", groupHeader: "text-fg-secondary" }}
/>
```

The keys are typed, so a misspelled one is a compile error rather than a prop that does
nothing. The three `item*` keys land on the elements the **default** row renders; if you
compose a row of your own, those elements are yours and the keys have nothing to reach.

There is no `item` key, because `CommandPalette.Item` already reaches that element and two
writers for one element is one too many. There is no key for the panel either — `className`
is it.

**Not a slot, deliberately.** The visually-hidden `role="status"` region that announces the
result count carries `sr-only` and nothing else. That class is the whole mechanism: a route
to it lets a caller drop it and print "7 commands" above the search field.

## Theme tokens

`CommandPalette.css` is down to its two `@keyframes` blocks — the one thing no utility can
express, because a utility sets properties on an element and a keyframe block has none.
Everything else is a Tailwind utility on the element it paints, and every colour, radius,
size and duration still resolves to a contract variable. Override any of these and the
palette re-tints at runtime.

| Where                                                          | Utility                                             | Override                                                          |
| -------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| Panel surface                                                   | `bg-surface-0`                                      | `--C-SURFACE-0`                                                   |
| Panel border · divider under the search box                     | `border-border-default`                             | `--C-BORDER-DEFAULT`                                              |
| Panel corners                                                   | `rounded-lg`                                        | `--RADIUS-LG`                                                     |
| Panel elevation                                                 | `shadow-lg`                                         | `--SHADOW-LG`                                                     |
| Backdrop scrim                                                  | `backdrop:bg-[var(--OVERLAY-SCRIM-COLOR,rgb(0_0_0_/_0.5))]` | `--OVERLAY-SCRIM-COLOR`                                   |
| Query text · option label                                       | `text-fg-primary`                                   | `--C-TEXT-PRIMARY`                                                |
| Leading icon slot                                               | `text-fg-secondary`                                 | `--C-TEXT-SECONDARY`                                              |
| Placeholder · group header · empty message · disabled option    | `placeholder:text-fg-muted` · `text-fg-muted`       | `--C-TEXT-MUTED`                                                  |
| Highlighted option — wash · ring                                | `data-active:bg-surface-2` · `data-active:outline-border-focus` | `--C-SURFACE-2` · `--C-BORDER-FOCUS`                   |
| Search input focus ring                                         | `focus-visible:outline-border-focus`                | `--C-BORDER-FOCUS`                                                |
| Option corners                                                  | `rounded-md`                                        | `--RADIUS-MD`                                                     |
| Query type                                                      | `text-body-1`                                       | `--BodyText-1` · `--BodyText-1-line-height`                       |
| Option and empty-message type                                   | `text-body-2`                                       | `--BodyText-2` · `--BodyText-2-line-height`                       |
| Group header type                                               | `text-body-3` · `font-semibold`                     | `--BodyText-3` · `--BodyText-3-line-height` · `--Semibold-Weight` |
| Search box padding                                              | `py-r4` · `px-r3`                                   | `--R-SIZE-4` (block) · `--R-SIZE-3` (inline)                      |
| List inset · group header padding                               | `p-r6` · `py-r6` · `px-r5`                          | `--R-SIZE-6` · `--R-SIZE-5`                                       |
| Option padding · gap between groups                             | `p-r5` · `mt-r5`                                    | `--R-SIZE-5`                                                      |
| Icon-to-label gap                                               | `gap-r4`                                            | `--R-SIZE-4`                                                      |
| Empty-message padding                                           | `py-r3` · `px-r5`                                   | `--R-SIZE-3` · `--R-SIZE-5`                                       |
| Panel entrance                                                  |                                                     | `--MOTION-DURATION-ENTER` · `--MOTION-EASE-ENTER`                 |
| Option highlight transition                                     | `duration-[var(--MOTION-DURATION-SHIFT)]`           | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT`                 |

The entrance is an arbitrary `animation` shorthand naming the keyframes and both motion
tokens — `animate-[command-palette-in_var(--MOTION-DURATION-ENTER)_var(--MOTION-EASE-ENTER)]`,
and its `backdrop:` twin — because `--MOTION-*` sits in no Tailwind namespace and there is no
`ease-enter` or `duration-enter` to write. Reduced motion drops both with
`motion-reduce:animate-none`.

All four spacing tokens sit on the responsive `r`-scale, and three step up at the 40rem
breakpoint: `--R-SIZE-3` (`1rem` → `1.5rem`), `--R-SIZE-4` (`0.75rem` → `1.25rem`) and
`--R-SIZE-5` (`0.5rem` → `0.75rem`). `--R-SIZE-6` is on the same scale but holds at `0.25rem`
either side, so the list's own inset never changes. The `--BodyText-*` steps are responsive too.

**The scrim does follow the theme**, unlike [Dialog](dialog.md#theme-tokens): `::backdrop` is
`var(--OVERLAY-SCRIM-COLOR, rgb(0 0 0 / 0.5))`, so the literal only applies when
`@batthewz/response-ui-css` is not loaded at all.

**Muted ink is hint-level, and here it carries real content.** `--C-TEXT-MUTED` on
`--C-SURFACE-0` measures 4.95:1 in the default theme, 4.85:1 in `events`, 5.23:1 in `grimdark`
and 4.87:1 in `tech` — clearing the 4.5:1 body-text floor in all four measured themes since `@batthewz/response-ui-css` **v0.10.1**, where
it read 2.10–2.59 before. It is still *visually* hint-level, so prefer the title for anything a
user must act on; but the group headers and the "No results" message are no longer under the
floor. Pass an `emptyMessage` node with your own ink if you want more weight than that.
Disabled rows compound it further — the same token at `opacity: 0.6` lands at 1.46–1.68:1 —
though an inactive control is exempt from the contrast minimum. Measured against the default
theme and the worked examples; these numbers do not transfer to your own theme — re-check
them against your values. See the [theme contract](../theme-contract.md).

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
  3:1 floor in every theme measured. It read 2.52 and 2.55 in `events` and `grimdark` before that
  release retuned `--C-BORDER-FOCUS`, which also carries the search input's own ring, so a
  custom theme retuning that token moves both at once.
- **Arrow keys walk the rendered order, and the highlight tracks position, not id.**
  `activeIndex` moves ±1 through the grouped order the screen shows, so keyboard and screen
  agree; but the index is positional, so if `items` itself changes while the palette is open,
  the highlight stays on the same *row*, whatever command now occupies it. (It snaps back to
  the first selectable row whenever the query changes.)
- **`className` utilities beat the component's own.** They merge through `cn()` at the call
  site, so a conflicting utility collapses the default rather than racing it. It used to lose
  and need the important modifier — see [Sizing the panel](#sizing-the-panel).
- **Light dismiss is handled in React, not by `closedby`.** A press on the scrim is dispatched
  at the `<dialog>` itself, so "outside" is measured as the pointer landing beyond the panel's
  own border box — padding you add in `className` still counts as inside. Both ends of the
  press must land there, so dragging a selection out of the input and releasing on the scrim
  keeps the palette open. It requests the close through `onClose` like everything else; an
  `onClose` that doesn't flip your boolean still leaves the palette stuck open.
- **`onClose` occupies the native handler's name.** It is destructured out rather than spread,
  so you cannot subscribe to the DOM `close` event through the props. `onCancel` *is* spread and
  fires, but cannot opt out of the interception. Use the forwarded `ref` and `addEventListener`
  if you need the real `close`.
- **Your `onClick` / `onPointerDown` are composed, not replaced.** Both run first, and calling
  `preventDefault()` on the click is the opt-out from light dismiss for that press. Every other
  `dialog` prop still overwrites the component's own.
- **Every command is mounted while the palette is closed.** The `<dialog>` and the whole option
  list render on the very first pass, filter included; the browser just hides them with
  `dialog:not([open]) { display: none }`. So a 1000-command array is 1000 option `<div>`s in the
  DOM and in the server-rendered HTML of a page nobody ever opens the palette on. Gate `items`
  on `open` yourself if that shows up in a profile. The same UA rule is why a `display` utility
  in `className` would unhide the closed panel.
- **Pointer movement steals the highlight.** Each option handles `onMouseMove`, so if the cursor
  happens to be resting over the list, the first pixel of movement after you arrow somewhere
  yanks the highlight to whatever is under the pointer.
- **Body scroll is locked the same way [Dialog](dialog.md)'s is.** The panel carries the
  `no-body-scroll` class, which pairs with the `body:has(…)` rule in
  `@batthewz/response-ui-css`'s base layer, and the list sets `overscroll-behavior: contain`
  so a wheel past the end of the results stays off the page. Ship without that base import
  and the page scrolls behind the scrim again.
- **`item.id` is a React key and nothing else.** It never reaches the DOM — option ids are
  generated from `useId()` plus the item's index, and selection tracks that index. Two items in
  the same `group` sharing an `id` produce React's duplicate-key warning; across groups the
  collision is invisible, because each group keys its own children.
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
  3.15–13.70:1 depending on the theme, over the 3:1 floor in all four measured themes since
  `@batthewz/response-ui-css` v0.10.1 (it was 2.52–2.55 in `events` and `grimdark` before).
  See [Gotchas](#gotchas). The highlight is also gated on
  the same predicate as `aria-activedescendant`, so a palette whose rows are all disabled shows
  no cursor at all rather than one pointing at a row Enter would not act on.
- **The search input is named by `searchLabel`.** It carries `aria-label="Search commands"`
  by default; pass the prop to rename or localise it. An `aria-label` in the rest props
  renames the *dialog* instead — rest props land on the `<dialog>`, not the input — so the
  prop is the only route. `placeholder` is back to being a hint, not the accessible name.
- **The dialog and the listbox are both nameable.** `aria-label="Command palette"` on the
  `<dialog>` is written before the rest spread, so your own `aria-label` wins there; the
  listbox's name comes from `listLabel` (default `"Commands"`). Both defaults are English, so
  pass both when you localise.
- **The result count is announced.** A visually-hidden `role="status"` `aria-live="polite"`
  region is mounted for the palette's whole life and re-renders `statusMessage(count)` on
  every change — "3 commands", then "No results" territory as "0 commands". Pass
  `statusMessage` to rephrase or localise it; it is empty while the palette is closed.
- **Group nesting is the shape ARIA specifies.** Options are direct children of the listbox,
  or of a `role="group"` that is itself a direct child, each group labelled by its header via
  `aria-labelledby`. Ungrouped items get no wrapper at all, so nothing unnamed sits between
  the listbox and its options.
- **Icons are hidden, shortcuts are not.** The `icon` slot is `aria-hidden="true"` — even an
  `aria-label` on your own glyph is suppressed — so anything meaning-bearing has to go in the
  `label`. The `shortcut` chip *is* part of the option's name, and with no separator between the
  two spans: an item labelled `"New project"` with `shortcut="⌘N"` computes an accessible name
  of `"New project⌘N"`. Glyph strings like that read unpredictably, so prefer plain words
  (`"Ctrl N"`) if your audience uses a screen reader.
- **Reduced motion is respected.** A `@media (prefers-reduced-motion: reduce)` block drops the
  panel animation, the backdrop fade and the option transition.

## Related

[Dialog](dialog.md) · [Drawer](drawer.md) · [Kbd](kbd.md) · [DropdownMenu](dropdown-menu.md) ·
[SearchInput](search-input.md) · [Combobox](combobox.md) · [AppShell](app-shell.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
