# DropdownMenu

A button that opens a floating list of actions — anchored to the trigger, portalled clear of any
clipping ancestor, and navigated the way a menu should be: arrow keys between items, Home and
End to the ends, typeahead by first letter, and Escape back to the trigger.

<!-- example:Minimal -->
```tsx
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
```
<!-- /example -->

**Anatomy.** `DropdownMenu` renders **no DOM of its own** — it is a context provider that owns
the open state and the Floating UI wiring. `DropdownMenu.Trigger` is the anchor and the toggle.
`DropdownMenu.Content` is the floating `role="menu"` surface; it renders through Floating UI's
`FloatingPortal` into `<body>`, so it escapes `overflow: hidden` and stacking contexts without a
[Portal](portal.md) of your own. Everything inside it is your composition: `DropdownMenu.Item`s
are the focusable actions; `DropdownMenu.Divider` and `DropdownMenu.Label` are decoration.

| Part                   | Renders                                                             | Props                                                             |
| ---------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `DropdownMenu`         | nothing — a context provider                                        | `open?` · `onOpenChange?` · `defaultOpen?` · `placement?` · `children` |
| `DropdownMenu.Trigger` | `<button class="dropdown-menu-trigger">`, or your own element       | `asChild?` (+ all `button` props)                                 |
| `DropdownMenu.Content` | `<div role="menu">`, portalled                                       | all `div` props                                                   |
| `DropdownMenu.Item`    | `<button role="menuitem">`                                           | `index` · `icon?` · `disabled?` · `onSelect?` (+ `button` props)   |
| `DropdownMenu.Divider` | `<hr role="separator">`                                              | all `hr` props                                                    |
| `DropdownMenu.Label`   | `<span role="presentation">`                                         | all `span` props                                                  |

**`index` is required on every `Item` and you assign it by hand.** It is not a display detail:
the number is the item's slot in the keyboard-navigation array, so it must be unique, count from
`0`, and run in the order you want the arrow keys to walk. `DropdownMenu.Divider` and
`DropdownMenu.Label` take no `index` and are skipped by the counter. Getting this wrong is the
single easiest way to break the component — see [Gotchas](#gotchas).

The root's only styling hook is what its children carry: `DropdownMenu` itself takes no
`className`, no `ref`, and no rest props. The other five all forward the props of the element
they render.

## Structure: labels, dividers, icons

<!-- example:LabelledGroups -->
```tsx
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
```
<!-- /example -->

`icon` is rendered into a fixed 1rem box before the label, so glyphs line up down the menu
regardless of the icon set. The items here pass no `onSelect` at all — an item without a handler
is still a working, focusable menu item, and choosing it still closes the menu.

## Disabled items

<!-- example:DisabledItem -->
```tsx
<DropdownMenu>
  <DropdownMenu.Trigger type="button">Deployment</DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item index={0}>Redeploy</DropdownMenu.Item>
    <DropdownMenu.Item index={1} disabled>
      Roll back — no previous build
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>
```
<!-- /example -->

`disabled` sets `aria-disabled="true"` and makes the item's click a no-op — the guard sits at
the event boundary, so it stops your `onClick` as well as `onSelect`. It never sets the native
`disabled` attribute, so the item is still in the DOM and still hit-testable. It also keeps its
`index` — number around it, not through it. The arrow keys **skip** disabled items, so a
disabled item is visible but not keyboard-reachable; typeahead can still land on one.

## Controlled and uncontrolled

Uncontrolled is the default: `defaultOpen` seeds it and the menu manages itself. Pass `open` and
`onOpenChange` to drive it. `onOpenChange` fires in **both** modes and for every internal open
and close — trigger click, item select, Escape, outside press — so it doubles as an
"about to open" hook while uncontrolled.

The mode is decided by `open !== undefined` **on the first render only**, and locked from then
on. Mounting with `open={undefined}` and supplying a boolean later leaves the menu permanently
uncontrolled, with your `open` ignored; start controlled from the first render.

<!-- example:Controlled -->
```tsx
<DropdownMenu open={open} onOpenChange={setOpen}>
  <DropdownMenu.Trigger type="button">Export {open ? "▴" : "▾"}</DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item index={0}>Download CSV</DropdownMenu.Item>
    <DropdownMenu.Item index={1}>Download XLSX</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>
```
<!-- /example -->

## Triggering from your own element

The default trigger is an unstyled `<button>` — no border, no padding, `font: inherit` — so it
takes whatever shape you give it. When you want a real [Button](button.md) or an
[IconButton](icon-button.md) instead, `asChild` merges the wiring onto that element rather than
nesting a button inside a button.

<!-- example:TriggerAsChild -->
```tsx
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
```
<!-- /example -->

`asChild` **merges** the trigger wiring into your child rather than overwriting it. Colliding
event handlers compose — the child's runs first and may `preventDefault()` to skip the menu's —
and the child's `ref`, `className` and `style` are merged rather than replaced. Putting handlers
and the ref on `DropdownMenu.Trigger` itself is equivalent. See [Gotchas](#gotchas).

## Placement

<!-- example:Placement -->
```tsx
<DropdownMenu placement="right-start">
  <DropdownMenu.Trigger type="button">Move to…</DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item index={0}>Backlog</DropdownMenu.Item>
    <DropdownMenu.Item index={1}>In progress</DropdownMenu.Item>
    <DropdownMenu.Item index={2}>Archive</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>
```
<!-- /example -->

`placement` (default `"bottom-start"`) accepts any Floating UI placement. It is a preference,
not a guarantee — the menu flips to the opposite side and shifts along the cross axis to stay in
the viewport, and it repositions on scroll and resize. The 4px trigger gap is fixed and not
exposed as a prop.

## Keyboard and focus

Measured against the component, not assumed:

| Key                             | With focus on the trigger                | With focus inside the menu                        |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------- |
| `ArrowDown`                     | opens, focuses the **first** item        | next enabled item, wrapping to the first          |
| `ArrowUp`                       | opens, focuses the **last** item         | previous enabled item, wrapping to the last       |
| `Enter`                         | opens, focuses the first item            | runs `onSelect`, closes, focus returns to trigger |
| `Home` / `End`                  | —                                        | first / last enabled item                         |
| Printable characters            | —                                        | typeahead to the first item whose text matches    |
| `Escape`                        | —                                        | closes, focus returns to the trigger              |
| `Tab`                           | **closes the menu**, focus moves on      | **closes the menu**                               |

Only the item you last landed on is in the tab order (`tabIndex=0`, everything else `-1`) — the
standard roving-focus arrangement — and until you land on one, *every* item is `-1`. Clicking the
trigger a second time closes the menu; clicking anywhere outside closes it and leaves focus
wherever you clicked.

`Space` is deliberately absent from the table. Nothing in `DropdownMenu` or the shared menu
internals handles it — no `Space` keydown or keyup of its own, and no `preventDefault` on
either — so activation falls through to the browser's native `<button>` behaviour, a path this
library has not measured. Don't read the `Enter` row as covering it. Floating UI's typeahead is
the only thing that ever intercepts a `Space`, and only mid-search: while a still-matching
search string is in flight it swallows the key so the space extends the string.

## Theme tokens

DropdownMenu uses **no Tailwind utilities** — every rule lives in `DropdownMenu.css` and reads
contract variables directly, the way [Tabs](tabs.md) and [ActivityFeed](activity-feed.md) do.
Override any of these and the menu re-tints with the rest of the app, at runtime, with no
rebuild.

| Where                     | Override                                                          |
| ------------------------- | ----------------------------------------------------------------- |
| Menu surface              | `--C-SURFACE-0` · `--C-BORDER-DEFAULT` · `--RADIUS-MD` · `--SHADOW-LG` |
| Item label                | `--C-TEXT-PRIMARY` · `--BodyText-2`                               |
| Item hover / focus wash   | `--C-SURFACE-1`                                                   |
| Item focus ring           | `--C-BORDER-FOCUS`                                                |
| Item icon                 | `--C-TEXT-SECONDARY`                                              |
| Disabled item label       | `--C-TEXT-MUTED`                                                  |
| Divider rule              | `--C-BORDER-DEFAULT`                                              |
| Section label             | `--C-TEXT-MUTED` · `--BodyText-3` · `--Semibold-Weight`           |

`--BodyText-2` and `--BodyText-3` are responsive and step up at the 40rem breakpoint, so menu
type grows on desktop with no work from you.

Several values are **not** on the contract and cannot be themed: item padding
(`0.375rem 0.75rem`), the icon gap (`0.5rem`), the icon box (`1rem`), the menu's `min-width`
(`11.25rem`), the divider's `1px` rule, and the surface `z-index` (`40`). Override
`.dropdown-menu-label` in your own CSS if any of those matter. The trigger sets no colour at
all: it inherits the surrounding font and
ink, which is what makes `asChild` and a bare trigger both look right.

The whole surface is styled from a single `dropdown-menu-*` class family, and [ContextMenu](context-menu.md)
deliberately reuses it — restyle these classes and both components move together.

## Gotchas

- **`index` is manual, and a duplicate eats an item.** Two `Item`s with the same
  `index` write to the same navigation slot; the later one wins and the earlier one becomes
  permanently unreachable by keyboard. The menu looks and clicks unchanged, but a
  `console.warn` names both items when a duplicate claims a slot. Rendering
  items from an array is the risky case: index by the *rendered* position
  (`items.map((item, i) => <DropdownMenu.Item index={i} …>)`) **after** any filtering, never by
  an id or by the source array's position.
- **Arrow-key order is `index` order, not DOM order.** They are two independent lists. If the
  numbers don't match the visual order, the focus ring jumps around the menu.
- **`onSelect` cannot cancel the close.** It takes no event and its return value is ignored;
  `setOpen(false)` runs immediately after it, every time. There is no way to keep the menu open
  after a selection — for a multi-select or a filter menu, use a controlled `open` and force it
  back to `true`.
- **A disabled item is still a `<button>` you can click — it just does nothing.** `disabled`
  is `aria-disabled`, not the native attribute, deliberately: the item has to stay focusable to
  follow the menu pattern. So the click still reaches the component, and the component drops it
  before anything runs — `onSelect`, your own `onClick`, and the close. Nothing to guard at the
  call site. (Before this was fixed, `disabled` gated `onSelect` only and a raw `onClick` ran on
  every click.)
- **`asChild` keeps the child's own event handlers and its `ref`.** The trigger wiring is cloned
  onto your element through `mergeProps`, so a colliding handler composes instead of being
  replaced: put an analytics `onClick` on the button inside `asChild` and both the handler and
  the menu run, the child's first. `preventDefault()` in your handler is the opt-out. The
  child's `ref` is merged with `DropdownMenu.Trigger`'s own forwarded ref, so a
  `<Button ref={btnRef}>` inside `asChild` populates `btnRef.current`. `className` merges through
  `cn()`, `style` merges by key, and `data-*` passes through. ARIA the trigger owns
  (`aria-expanded`, `aria-haspopup`, `aria-controls`) still wins, because it reports state the
  child cannot know.
- **The trigger defaults to `type="button"`.** A `DropdownMenu` inside a `<form>` opens the
  menu without also submitting the form. Items set it too, so they are safe by construction
  rather than by the accident of being portalled outside the form.
- **Your `style` on `Content` overrides the positioning.** Inline styles are merged *after*
  Floating UI's, so a stray `position`, `top`, `left`, or `transform` breaks the anchoring
  outright. Size and colour there if you must; leave placement alone.
- **The menu unmounts when closed.** `Content` renders `null` until it is open (plus the exit
  fade — `--MOTION-DURATION-EXIT`, 150ms with no token layer, `0` under reduced motion), so
  anything inside it — component state, an uncontrolled input, a mounted chart —
  is destroyed and rebuilt on every open. Keep state above the menu.
- **It's a client component.** Both `DropdownMenu.tsx` and the shared `menu-internals.tsx` carry
  `"use client"`, so importing it pulls the module into the client bundle; it cannot be used
  directly in an RSC tree.
- **Sub-parts throw outside the root, under their internal names.** Every part reads menu
  context and throws if it can't find one — but only the trigger reports itself as
  `"DropdownMenu.Trigger must be used within a menu provider"`. The other four are shared with
  [ContextMenu](context-menu.md) and name themselves after the shared implementation, so a stray
  `DropdownMenu.Item` throws `"MenuItem must be used within a menu provider"` and
  `Content`/[Divider](divider.md)/[Label](label.md) throw as `MenuContent`/`MenuDivider`/`MenuLabel`. Grep for those
  names, not the ones in your JSX.

## Accessibility

The trigger is `aria-haspopup="menu"` with `aria-expanded` and `aria-controls` pointing at the
surface; the surface is `role="menu"` labelled by the trigger's own text, and each `Item` is a
`role="menuitem"` in a roving tab order. Escape and every selection return focus to the trigger.
Items are skipped by the arrow keys when `aria-disabled`, which is Floating UI's default. That
is the menu-button pattern implemented properly — with four things still to know:

- **The focus ring is real, but thin in two themes.** `.dropdown-menu-item` resets the UA
  outline and paints the same `--C-SURFACE-1` wash it uses for hover — **1.02:1 to 1.07:1**
  against `--C-SURFACE-0`, which on its own is no indicator at all — so a `:focus-visible` rule
  puts a 2px `--C-BORDER-FOCUS` outline back at `-2px` offset. Against that wash it measures
  **3.52 / 3.29 / 14.56 / 3.43:1** (default / `events` / `tech` / `grimdark`) against
  `@batthewz/response-ui-css` **v0.10.1**, clearing the 3:1 that WCAG 2.2 SC 1.4.11 asks of a
  focus indicator in all four measured themes. `events` and `grimdark` read 2.63 and 2.77 before
  that release, which retuned `--C-BORDER-FOCUS` in exactly those two. Measured against the
  default theme and the worked examples; these numbers do not transfer to your own theme —
  re-check them against your values. Re-tint `--C-BORDER-FOCUS` rather than overriding this
  rule.
- **`Tab` closes the menu, as the APG menu-button pattern asks.** A `Tab` or `Shift+Tab`
  keydown on the trigger or inside the menu closes it rather than leaving it open behind. The
  case that made this matter: a menu opened **with the mouse** has no focused item, so focus
  is still on the trigger and Tab moves straight past the menu — before this was fixed, that
  left an open menu stranded on screen with focus somewhere else entirely.
- **Muted ink clears AA, but still reads as hint-level.** Disabled items and
  `DropdownMenu.Label` both paint `--C-TEXT-MUTED` on `--C-SURFACE-0` at **4.85:1 to 5.23:1**
  since `@batthewz/response-ui-css` **v0.10.0**, where it measured 2.10–2.59 and failed AA outright. It is legible now; it is
  still the quietest ink in the contract, so weigh that before putting something load-bearing in
  a section label.
- **The open menu hides the whole page from assistive tech.** `Content` renders
  `FloatingFocusManager` with its defaults, and `modal` defaults to `true`, so while the menu is
  open every other element under `<body>` is given `aria-hidden="true"` — the trigger included.
  A screen-reader user cannot browse the page the menu is anchored to, or re-read the trigger,
  until it closes. It is **not** marked `inert`: floating-ui only does that when
  `outsideElementsInert` is set, and that defaults to `false`. So the page behind is hidden from
  assistive tech but still reachable by pointer — a mismatch that is only safe because an
  outside press dismisses the menu first. This is the same line [ContextMenu](context-menu.md) inherits, and it
  is not exposed as a prop. Nothing on screen — no scrim, no scroll lock — signals it.

Two smaller notes. `DropdownMenu.Label` is `role="presentation"` and is wired to nothing: it
does not name the menu, does not group the items after it, and is not guaranteed to be
announced — treat it as a visual hint, and if a group genuinely needs a name, put it in the
trigger. And `icon` is
rendered exactly as you pass it with no accessible name of its own, so mark decorative glyphs
`aria-hidden="true"` as the examples above do.

## Related

[ContextMenu](context-menu.md) · [Popover](popover.md) · [Tooltip](tooltip.md) · [CommandPalette](command-palette.md) · [Select](select.md) ·
[Button](button.md) · [Portal](portal.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
