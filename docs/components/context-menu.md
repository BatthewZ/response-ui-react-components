# ContextMenu

Per-object actions on the object itself: right-click anywhere inside the trigger region and a
`role="menu"` list opens at the pointer, in place of the browser's own menu. Reach for it when a
row, a card, or a canvas item has more actions than a toolbar can hold, and treat it as a
shortcut rather than the only route to them.

That last part is not a style preference. Read
[Opening it without a mouse](#opening-it-without-a-mouse) before you ship one: the keyboard
gestures the platform fires for a context menu are wired, but the tab stop they arrive on is a
bare `<div>` with no accessible name and no focus style until you give it one.

<!-- example:Minimal -->
```tsx
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
```
<!-- /example -->

**Anatomy.** `ContextMenu` renders no DOM of its own — it is a provider holding the open state
and the Floating UI wiring. `ContextMenu.Trigger` is the region you right-click: a `<div>` that
registers itself as the anchor, sets `tabIndex={0}` so it can be focused, and listens for
`contextmenu` plus the two keys that stand in for it. `ContextMenu.Content` is the
menu panel; it renders through Floating UI's `FloatingPortal` (so no ancestor's `overflow`,
`transform`, or `z-index` can clip it — bar a `<dialog>` it is opened inside, which it is
portalled *into* and therefore bounded by; see [Popover](popover.md#gotchas)) and returns
`null` while closed. Inside it,
`ContextMenu.Item` is one action, and `ContextMenu.GroupHeader` / `ContextMenu.Divider` are
non-interactive decoration.

| Part                     | Renders                                                | Props                                                             |
| ------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------- |
| `ContextMenu`            | nothing — a context provider                           | `open?` · `onOpenChange?` · `defaultOpen?` · `children`            |
| `ContextMenu.Trigger`    | `<div>` — no class of its own                          | all `div` props                                                   |
| `ContextMenu.Content`    | `<div role="menu" class="menu-content">`, portalled     | all `div` props                                                   |
| `ContextMenu.Item`       | `<button role="menuitem" class="menu-item">`            | `index` · `icon?` · `disabled?` · `onSelect?` · `classNames?` (+ all `button` props) |
| `ContextMenu.Divider`    | `<hr role="separator" class="menu-divider">`            | all `hr` props                                                    |
| `ContextMenu.GroupHeader`| `<span role="presentation" class="menu-group-header">`  | all `span` props                                                  |

Every part except the root takes a `ref` and forwards the rest of its element's props, so
`className`, `id`, `data-*`, and `aria-*` all pass through. `Item` replaces the native
`onSelect` with its own `() => void`.

`index` is the one prop with no default and no safety net: it is the item's position in the
arrow-key/typeahead list, and you number them yourself, from `0`, in visual order.
`ContextMenu.GroupHeader` and `ContextMenu.Divider` are not in that list and take no `index`.

## Grouping the actions

<!-- example:GroupedActions -->
```tsx
<ContextMenu>
  <ContextMenu.Trigger>
    <p>Q3-forecast.xlsx</p>
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.GroupHeader>Q3-forecast.xlsx</ContextMenu.GroupHeader>
    <ContextMenu.Item index={0} icon={<Pencil aria-hidden="true" />}>
      Rename
    </ContextMenu.Item>
    <ContextMenu.Item index={1} icon={<Copy aria-hidden="true" />}>
      Duplicate
    </ContextMenu.Item>
    <ContextMenu.Item index={2} icon={<Star aria-hidden="true" />}>
      Add to favourites
    </ContextMenu.Item>
    <ContextMenu.Divider />
    <ContextMenu.Item index={3} icon={<Download aria-hidden="true" />}>
      Download a copy
    </ContextMenu.Item>
    <ContextMenu.Item index={4} icon={<Trash2 aria-hidden="true" />}>
      Move to trash
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu>
```
<!-- /example -->

`icon` renders in a `1.125em` box before the label, tinted separately from the label text — pass
it `aria-hidden` so the item announces once. The box sizes the glyph, so an icon set's own
dimensions do not need hand-tuning to fit, and `em` keeps it in proportion to the row's type
across the 40rem breakpoint and under a theme that rescales its own. That box is the one part of an item no prop
otherwise reaches, so it has a slot: `classNames={{ itemIcon: "…" }}`. See
[Slots](#slots). `ContextMenu.GroupHeader` is `role="presentation"`, so it is a visual caption
only: it groups nothing as far as assistive tech is concerned, and `ContextMenu.Divider`'s
`role="separator"` is what actually marks the break.

A `disabled` item is `aria-disabled`, not natively `disabled` — it keeps its `index`, its row,
and its place in the accessibility tree. Arrow keys step over it; typeahead does not (see
[Gotchas](#gotchas)).

<!-- example:DisabledItem -->
```tsx
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
```
<!-- /example -->

## The trigger region

`Trigger` is a `<div>` with no styling of its own, so it is block-level and as wide as its
container — the *whole box* is right-clickable, not just the text in it. That is usually what
you want for a row or a card, but it means an empty-looking area is silently live, and users
get no cue that a right-click does anything. Give the region a visible edge, or put the same
actions somewhere discoverable as well.

<!-- example:SizedRegion -->
```tsx
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
```
<!-- /example -->

## Where the menu opens

Every right-click builds a fresh Floating UI *virtual* reference — a zero-size `DOMRect` at the
event's `clientX`/`clientY` — and the panel is placed `bottom-start` against it with a 4px
offset. So it opens 4px below the cursor with its start edge aligned to it, not against the
trigger's box, and right-clicking a second spot moves it there without closing it first. Neither
the placement nor the offset is configurable: unlike [DropdownMenu](dropdown-menu.md), the root takes no
`placement` prop.

Near a viewport edge the shared `flip()` and `shift({ padding: 8 })` middleware take over — the
menu flips above the cursor when it would overflow the bottom, and slides back inward to keep an
8px margin at the sides. It is repositioned by `autoUpdate` while open.

Those coordinates are captured once, at click time, and the closure that reports them never
updates. The menu also does not close on scroll — `useDismiss` is left at its
`ancestorScroll: false` default — so scrolling with the menu open separates it from the thing it
was opened on. Native context menus close instead; if that matters, close it yourself on scroll.

## Suppressing the browser menu

`Trigger` calls `event.preventDefault()` on every `contextmenu` before it does anything else.
That is the whole reason a custom context menu can exist — and it is a real cost, paid across the
entire trigger region: no *Copy*, no *Paste*, no *Inspect*, no *Open link in new tab*, no *Save
image as*, no spell-check suggestions, no browser-extension entries. There is no escape hatch on
this path; your own `onContextMenu` handler runs *after* the `preventDefault()`, so it cannot
decline it for a sub-region. (The keyboard path is the other way round — see
[Opening it without a mouse](#opening-it-without-a-mouse).)

The trade is worth it where the region is a UI object with actions of its own — a file row, a
node on a canvas, a calendar event — and the browser's menu would offer nothing useful. It is a
bad trade wrapped around prose, code samples, images, or any input the user might want to copy
from, and around a whole page or layout shell. Scope the `Trigger` to the object, not to the
screen.

## Opening it without a mouse

`contextmenu` is not a mouse-only event: the platform also fires it from the **Menu key** and
**Shift+F10**, dispatched at `document.activeElement`. `Trigger` covers both. It sets
`tabIndex={0}` on its `<div>`, so the region is a tab stop and can *be* `document.activeElement`,
and it handles those two keys itself rather than waiting for a synthesised `contextmenu` — with
`preventDefault()` on the keydown, so the browser's own menu does not open alongside this one.
A keyboard press has no cursor point, so it clears any position reference an earlier right-click
left behind and the panel anchors on the trigger's box instead.

Your own `onKeyDown` runs **first** here and can veto: call `preventDefault()` in it and the
component leaves the key alone. That is the opposite of the `contextmenu` path, where the
suppression happens before your handler ever sees the event — see
[Suppressing the browser menu](#suppressing-the-browser-menu).

The tab stop you get by default is a bare `<div>` with no class at all — whatever you pass as
`className` is the whole of it — and a `<div>` takes no accessible name from its own text the way
a button does, so a keyboard user arrives at an unnamed region wearing only the browser's default
focus ring. Wrapping a real control gives it both, and is the shape to reach for:

<!-- example:KeyboardReachable -->
```tsx
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
```
<!-- /example -->

A focusable child buys a third route: Floating UI's list navigation is wired to the trigger, so
ArrowDown or ArrowUp on that child opens the menu as well — anchored under the trigger box, since
no pointer coordinates exist. That is also a hazard; see [Gotchas](#gotchas). It costs one extra
tab stop, because the region itself is already one. `tabIndex` is written *before* the rest
spread, so `<ContextMenu.Trigger tabIndex={-1}>` takes the wrapper back out of the tab order and
leaves the child as the only stop.

What happens *after* it opens is wired too, but not by the focus manager. That is still
configured `initialFocus={-1}`, so opening the menu never moves focus into the panel. What makes
the open menu take keys is that focus is on the trigger — a right-click focuses it before
opening, and a keyboard open never left it — and the trigger is exactly where
`getReferenceProps` installs the list-navigation and typeahead handlers. So after a right-click,
ArrowDown moves into the first item and typing jumps to the item you typed (both measured).
Escape closes from anywhere, because that listener is on the document.

## Controlling it yourself

`open` + `onOpenChange` make it controlled; `defaultOpen` seeds the uncontrolled version. The
mode is locked on the first render, and while controlled the component never updates its own
state — it only calls `onOpenChange`, so ignoring that callback means the menu never opens.

<!-- example:Controlled -->
```tsx
<ContextMenu open={open} onOpenChange={setOpen}>
  <ContextMenu.Trigger>
    <p>Q3-forecast.xlsx</p>
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.Item index={0}>Rename</ContextMenu.Item>
    <ContextMenu.Item index={1}>Duplicate</ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu>
```
<!-- /example -->

Opening it programmatically is legitimate, but understand what it anchors to: with no right-click
yet, there is no virtual reference and the menu falls back to the trigger's own box. After the
first right-click that reference sticks — nothing on the programmatic path clears it, so a later
`setOpen(true)` reuses the last cursor position, wherever on the page that was. Only a keyboard
open resets it: the Menu key and Shift+F10 drop the reference before opening, so they always
anchor on the trigger box.

## Slots

`className` reaches every part that renders one, and each subcomponent merges it after the
library class. On the trigger there is no library class to merge with — the `<div>` carries
your classes and nothing of ours. It still goes through `cn()`, which is not a formality with
no base class present: `className="p-r3 p-r5"` resolves to `p-r5` here, the way it does on
every other component in the package, rather than emitting both and leaving the stylesheet's
order to pick. The one element no prop reached was the box the `icon` goes into, so
`ContextMenu.Item` takes a `classNames` object for it. Class strings only, and the keys are
typed, so a misspelled one is a compile error rather than a prop that does nothing.

| Slot       | Element                | What it addresses                                            |
| ---------- | ---------------------- | ------------------------------------------------------------ |
| `itemIcon` | `span.menu-item-icon`  | the `1.125em` box around `icon`, on every item that has one   |

```tsx
<ContextMenu.Item index={0} icon={<Trash2 />} classNames={{ itemIcon: "text-status-error" }}>
  Move to trash
</ContextMenu.Item>
```

There is no slot for the panel, the row, the divider or the group heading: `ContextMenu.Content`,
`.Item`, `.Divider` and `.GroupHeader` already reach those through their own `className`. And
**no slot can
carry the fade timing** — the enter/exit duration is written inline by the shared floating-motion
hook, so a `duration-*` or `transition-*` utility on the panel is silently dead however it
arrives; retime it with `--MOTION-DURATION-ENTER` / `--MOTION-DURATION-EXIT`.

## Theme tokens

ContextMenu has no CSS file of its own. Its panel, items, dividers and group headings are
rendered — and now painted — by `menu-internals.tsx`, which carries the shared `menu-*` class
names (`menu-content`, `menu-item`, `menu-item-icon`, `menu-divider`, `menu-group-header`) as
declaration-free markers plus the Tailwind utilities that draw them.
[DropdownMenu](dropdown-menu.md) renders the identical components and therefore the identical
utilities, so a change there retints **both** at once. The full table lives with
[DropdownMenu](dropdown-menu.md); in summary: `bg-surface-0` and `border-border-default` for
the panel with `rounded-md` and `shadow-lg`, `text-fg-primary` at
`text-[length:var(--BodyText-2)]` for item labels, `bg-surface-2` for the hover/focus row with
a 2px `outline-border-focus` ring on `:focus-visible`, `text-fg-secondary` for item icons, and
`text-fg-muted` for disabled items and for the `text-[length:var(--BodyText-3)]` group heading.

`menu-internals.css` survives with exactly one rule, `.menu-item-icon > svg`, which makes an
icon fill its box. It stays in CSS on purpose: as `[&>svg]:size-full` it would emit at
specificity 0,1,1 from `@layer utilities` and start beating a `size-4` you put on your own
icon, where from `@layer components` your class wins.

**Those classes used to be `dropdown-menu-*`, and they were rendered from a shared prefix both
menus set to `"dropdown-menu"`.** A ContextMenu was therefore styled — and could only be
restyled — through classes named after the other component, while its trigger carried a
`context-menu-trigger` class no stylesheet anywhere defined. If you have CSS targeting either of
those, retarget it: `.dropdown-menu-*` becomes `.menu-*`, and the trigger has no class of its own
to hook, so give it one through `className`. The `menu-*` names are markers now rather than
selectors, but they are still in the DOM and a rule you write against them still wins —
unlayered CSS out-ranks `@layer utilities`.

Two things are *not* on the contract. The panel's geometry — its `py-1`, the items' `py-1.5
px-3`, the `gap-2` icon gap, a `min-w-45` minimum width and `z-40` — is literal Tailwind rungs
rather than the responsive `r`-scale, so the item **type** steps up at the 40rem breakpoint
with the rest of the app while the padding around it does not. And the
part ContextMenu owns is unthemeable by design: the 4px pointer offset is a number in
`menu-internals.tsx`, tied to no token. The open/close opacity fade is **not** — it reads
`--MOTION-DURATION-ENTER` / `--MOTION-DURATION-EXIT` (150ms when no token layer is present) and
drops to `0` under `prefers-reduced-motion: reduce`. See the
[theme contract](../theme-contract.md).

## Gotchas

- **`index` is hand-numbered, and a duplicate is warned about, not fixed.** The numbers, not
  the DOM, are the arrow-key and typeahead order. Two items sharing an index overwrite each
  other in the navigation list, and the loser becomes unreachable by keyboard while still
  rendering and still clicking — a `console.warn` names both items when it happens, but the
  menu ships broken all the same. Numbering out of visual order makes the arrows jump around
  the menu. Gaps are
  the harmless case — a missing index is treated like a disabled item and skipped. Renumber
  whenever you insert an item, and for generated items use the array index.
- **A `disabled` item is still clickable, and the click does nothing.** `aria-disabled` keeps
  the item focusable — the menu pattern wants it there — so nothing native suppresses the
  click. The item's own handler drops it instead, before `onSelect`, before your `onClick`, and
  before the close, so the menu stays open and no effect runs. (Before this was fixed, your
  `onClick` ran first and fired exactly as if the item were enabled.)
- **Typeahead reaches disabled items.** Arrow navigation skips anything `aria-disabled`, but
  typing the first letters of a disabled item's label still focuses it — a dead row you can
  land on but not activate.
- **A text control inside the trigger keeps its own keys, and loses the menu's.** Floating UI's
  list-navigation and typeahead handlers are attached to the *trigger*, so every key pressed
  inside it bubbles to them: the arrow keys were `preventDefault()`ed (freezing the caret of a
  wrapped [Textarea](textarea.md), [Select](select.md) or slider) and printable characters were
  swallowed as a typeahead query while the menu was open. Both are now skipped when the key is
  aimed at an `input`, `textarea`, `select` or `contenteditable`. The trade is the other
  direction: with the caret in such a control, the arrow keys and typeahead do **not** drive the
  open menu — move focus to the trigger itself (a right-click does this for you) to navigate it.
- **Nested triggers open only the innermost menu.** The `contextmenu` handler stops
  propagation as well as preventing the default, so a right-click on an inner `Trigger` never
  reaches an outer one. (Before this was fixed both panels mounted, each one's focus manager
  marking the other `aria-hidden`.) Nesting still buys you nothing — prefer one trigger per
  object.
- **Right-clicking the open menu shows the browser's menu.** `Content` does no
  `preventDefault()` of its own, so the native menu appears on top of yours; the custom menu
  stays open behind it.
- **The sub-parts are literally [DropdownMenu](dropdown-menu.md)'s.** `ContextMenu.Item` and `DropdownMenu.Item`
  are the same component object, distinguished only by which provider they find at runtime. The
  practical consequences: styling `.menu-item` restyles both, and rendering one outside
  any menu throws `"MenuItem must be used within a menu provider"` — the internal name, not the
  one you wrote.
- **Touch is whatever the browser gives you.** There is no long-press handling in the code — only
  `onContextMenu`. Mobile browsers synthesise `contextmenu` from a long press in most cases, so
  the menu often works on touch, but the delay, the haptics, and whether it fires at all are the
  platform's call, and suppressing the default also suppresses the native text-selection and
  image callouts. Don't make a touch-critical action reachable only this way.
- **It's a client component.** Both `ContextMenu.tsx` and `menu-internals.tsx` carry
  `"use client"`, so importing any part opts the module into the client bundle.

## Accessibility

The parts carry the right roles — `menu` on the panel, `menuitem` on each item, `separator` on
the divider — and the trigger gets `aria-haspopup="menu"` plus a live `aria-expanded` and
`aria-controls`, on an element the keyboard can actually reach. What the markup does not cover
is a name for that element, and what the focus manager does with focus around it.

- **Keyboard access is wired.** The region is a tab stop, the Menu key and Shift+F10 open the
  menu from it, and arrows and typeahead reach the panel after a right-click open as well as a
  keyboard one — see [Opening it without a mouse](#opening-it-without-a-mouse). The one
  exception is deliberate: with focus inside a text control the trigger wraps, those keys stay
  with the control (see [Gotchas](#gotchas)). Still treat a context menu as a
  shortcut for actions that exist somewhere else too: it is a gesture most users never try.
- **The tab stop has no name and no focus style of its own.** `tabIndex={0}` puts a `<div>` in
  the tab order, but a `<div>` takes no accessible name from its own text the way a button does,
  nothing sets an `aria-label` for you, and the element carries no class the package styles — it
  carries only your `className`. So a keyboard user arrives at an unnamed region wearing only the
  browser's default ring. Wrap a real control, or give the trigger an `aria-label` and a focus
  style yourself.
- **A right-click moves focus, and close returns it to the trigger.** The `contextmenu` handler
  focuses the trigger `<div>` before opening — that is what leaves the open menu able to take
  keys — and the focus manager returns focus there on close. So closing does not put focus back
  where it was *before* the gesture; for a mouse user who was typing elsewhere, the caret is
  gone. A keyboard open leaves focus wherever it already was inside the trigger, and that is what
  it restores.
- **The menu is named after the whole trigger.** Floating UI labels the panel `aria-labelledby`
  the trigger element, so the menu's accessible name is *all* of the trigger's text. Over a
  paragraph or a card that is a long, useless name; give `Content` its own `aria-label` when the
  region holds more than a short title.
- **The page behind is hidden, but not inert.** The focus manager runs in its default modal mode:
  while the menu is open every other element is marked `aria-hidden="true"`, so assistive tech
  sees only the menu. It is *not* marked `inert`, so the page behind stays clickable and
  focusable — a mismatch that is only safe because outside clicks dismiss the menu first.
- **Escape always works**, from anywhere, because the dismiss listener is on the document. So
  does an outside press: dismissal is on `pointerdown`, which means a right-click outside the
  trigger closes this menu and opens the browser's own in one gesture.

## Related

[DropdownMenu](dropdown-menu.md) · [Popover](popover.md) · [Tooltip](tooltip.md) · [Portal](portal.md) · [Button](button.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
