# ContextMenu

Per-object actions on the object itself: right-click anywhere inside the trigger region and a
`role="menu"` list opens at the pointer, in place of the browser's own menu. Reach for it when a
row, a card, or a canvas item has more actions than a toolbar can hold, and treat it as a
shortcut rather than the only route to them.

That last part is not a style preference. Read
[Opening it without a mouse](#opening-it-without-a-mouse) before you ship one: the right-click is
not the only gesture the platform fires for a context menu, and this component covers only some
of the rest.

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
and the Floating UI wiring. `ContextMenu.Trigger` is the region you right-click: a plain `<div>`
that registers itself as the anchor and listens for `contextmenu`. `ContextMenu.Content` is the
menu panel; it renders through Floating UI's `FloatingPortal` (so no ancestor's `overflow`,
`transform`, or `z-index` can clip it) and returns `null` while closed. Inside it,
`ContextMenu.Item` is one action, and `ContextMenu.Label` / `ContextMenu.Divider` are
non-interactive decoration.

| Part                  | Renders                             | Props                                                             |
| --------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `ContextMenu`         | nothing — a context provider        | `open?` · `onOpenChange?` · `defaultOpen?` · `children`            |
| `ContextMenu.Trigger` | `<div class="context-menu-trigger">` | all `div` props                                                   |
| `ContextMenu.Content` | `<div role="menu">`, portalled      | all `div` props                                                   |
| `ContextMenu.Item`    | `<button role="menuitem">`          | `index` · `icon?` · `disabled?` · `onSelect?` (+ all `button` props) |
| `ContextMenu.Divider` | `<hr role="separator">`             | all `hr` props                                                    |
| `ContextMenu.Label`   | `<span role="presentation">`        | all `span` props                                                  |

Every part except the root takes a `ref` and forwards the rest of its element's props, so
`className`, `id`, `data-*`, and `aria-*` all pass through. `Item` replaces the native
`onSelect` with its own `() => void`.

`index` is the one prop with no default and no safety net: it is the item's position in the
arrow-key/typeahead list, and you number them yourself, from `0`, in visual order.
`ContextMenu.Label` and `ContextMenu.Divider` are not in that list and take no `index`.

## Grouping the actions

<!-- example:GroupedActions -->
```tsx
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
```
<!-- /example -->

`icon` renders in a fixed 1rem slot before the label, tinted separately from the label text —
pass it `aria-hidden` so the item announces once. `ContextMenu.Label` is `role="presentation"`,
so it is a visual caption only: it groups nothing as far as assistive tech is concerned, and
`ContextMenu.Divider`'s `role="separator"` is what actually marks the break.

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
image as*, no spell-check suggestions, no browser-extension entries. There is no escape hatch in
the API; your own `onContextMenu` handler runs *after* the `preventDefault()`, so it cannot
decline it for a sub-region.

The trade is worth it where the region is a UI object with actions of its own — a file row, a
node on a canvas, a calendar event — and the browser's menu would offer nothing useful. It is a
bad trade wrapped around prose, code samples, images, or any input the user might want to copy
from, and around a whole page or layout shell. Scope the `Trigger` to the object, not to the
screen.

## Opening it without a mouse

`contextmenu` is not a mouse-only event: the platform also fires it from the **Menu key** and
**Shift+F10**, dispatched at `document.activeElement`. Listening for `onContextMenu` — which is
what this component does — gets those for free, but only if the event has somewhere to bubble
*from*. `Trigger` is a `<div>` and sets no `tabIndex`, so by default it can never be the focused
element itself. Wrap something focusable and the keyboard route works; wrap plain text, as the
shorter examples on this page do, and **there is no way to open the menu without a pointer at
all**.

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

A focusable child buys a second route too: Floating UI's list navigation is wired to the trigger,
so ArrowDown or ArrowUp on that child opens the menu as well — anchored under the trigger box,
since no pointer coordinates exist. That is also a hazard; see [Gotchas](#gotchas).

The other half of the problem is what happens *after* it opens. The focus manager is configured
`initialFocus={-1}`, so opening the menu never moves focus into it — focus stays exactly where it
was, which after a right-click on plain content is `<body>`. Escape still closes it, because that
listener is on the document, but ArrowDown, Home/End, and typeahead are delivered to the focused
element, and that element is neither the menu nor the trigger — so they do nothing at all. The
menu is keyboard-operable only when focus was already inside the trigger when it opened; one
ArrowDown then moves into the first item.

If the region has no focusable content of its own, `tabIndex` passes straight through to the
trigger `<div>`, and `<ContextMenu.Trigger tabIndex={0}>` fixes all three problems at once: the
region enters the tab order, Shift+F10 and the Menu key fire at it, arrow keys reach the menu,
and on close focus returns to the trigger instead of being dropped. Give it a visible focus style
and an accessible name to go with it.

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
first right-click that reference is set for good — a later programmatic open reuses the last
cursor position, wherever on the page that was.

## Theme tokens

ContextMenu has no CSS file of its own, and its `.tsx` uses no Tailwind utilities. It sets
`CLASS_PREFIX = "dropdown-menu"`, so its panel, items, dividers, and labels render the exact
`.dropdown-menu-*` classes that [DropdownMenu](dropdown-menu.md) does and are painted by `DropdownMenu.css`, which
`src/styles.css` imports for the package. Overriding the menu's look means overriding those rules
— and doing so retints **both** components at once. The full table lives with [DropdownMenu](dropdown-menu.md); in
summary, that stylesheet reads `--C-SURFACE-0` and `--C-BORDER-DEFAULT` for the panel with
`--RADIUS-MD` and `--SHADOW-LG`, `--C-TEXT-PRIMARY` at `--BodyText-2` for item labels,
`--C-SURFACE-1` for the hover/focus row, `--C-TEXT-SECONDARY` for item icons, and
`--C-TEXT-MUTED` for disabled items and for the `--BodyText-3` group label.

Two things are *not* on the contract. The panel's geometry — its `0.25rem 0` padding, the items'
`0.375rem 0.75rem`, the `0.5rem` icon gap, an `11.25rem` minimum width and `z-index: 40` — is
hard literals in that stylesheet rather than the responsive `r`-scale, so the item **type** steps
up at the 40rem breakpoint with the rest of the app while the padding around it does not. And the
parts ContextMenu owns are unthemeable
by design: the 4px pointer offset and the 150ms open/close opacity fade are numbers in
`menu-internals.tsx`, tied to no `--DURATION-*` token, and the fade is not dropped under
`prefers-reduced-motion`. The trigger's own `context-menu-trigger` class is a naming hook only —
nothing in the package styles it. See the [theme contract](../theme-contract.md).

## Gotchas

- **`index` is hand-numbered and unchecked.** The numbers, not the DOM, are the arrow-key and
  typeahead order, and nothing validates them. Two items sharing an index overwrite each other in
  the navigation list, and the loser becomes unreachable by keyboard while still rendering and
  still clicking. Numbering out of visual order makes the arrows jump around the menu. Gaps are
  the harmless case — a missing index is treated like a disabled item and skipped. Renumber
  whenever you insert an item, and for generated items use the array index.
- **A `disabled` item still runs your `onClick`.** The item's own handler calls your `onClick`
  first and *then* checks `disabled`, so `onSelect` is skipped and the menu stays open, but a
  raw `onClick` fires exactly as if the item were enabled. Put the action in `onSelect`.
- **Typeahead reaches disabled items.** Arrow navigation skips anything `aria-disabled`, but
  typing the first letters of a disabled item's label still focuses it — a dead row you can
  land on but not activate.
- **ArrowUp/ArrowDown inside the trigger are taken.** The list-navigation hook is attached to the
  trigger, and it calls `preventDefault()` on the main-axis arrow keys. Wrap a
  [Textarea](textarea.md), a [Select](select.md), or a slider in a `Trigger` and its up/down keys
  stop working — they open the context menu instead. Keep interactive controls out of the trigger
  region, or put the trigger on a wrapper that excludes them.
- **Nested triggers open both menus.** The handler prevents the default but never stops
  propagation, so a right-click on an inner `Trigger` bubbles to an outer one and both panels
  mount. Worse, each one's focus manager marks the other `aria-hidden`, so a screen reader is
  offered neither. Don't nest them.
- **Right-clicking the open menu shows the browser's menu.** `Content` does no
  `preventDefault()` of its own, so the native menu appears on top of yours; the custom menu
  stays open behind it.
- **The sub-parts are literally [DropdownMenu](dropdown-menu.md)'s.** `ContextMenu.Item` and `DropdownMenu.Item`
  are the same component object, distinguished only by which provider they find at runtime. The
  practical consequences: styling `.dropdown-menu-item` restyles both, and rendering one outside
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
`aria-controls`. What is underneath those is weaker than the markup suggests.

- **Keyboard access is conditional, and can be zero.** See
  [Opening it without a mouse](#opening-it-without-a-mouse). A trigger wrapping only
  non-focusable content has no keyboard route in, and one opened by right-click cannot be
  navigated by keyboard afterwards — Escape is the only key that reaches it. Make the trigger or
  its contents focusable, and treat a context menu as a shortcut for actions that also exist
  somewhere focusable, never as the only way to reach them.
- **Focus is not restored to where it was.** On close, focus goes to the trigger if the trigger is
  itself tabbable, and otherwise to the *first* tabbable element inside it — not the one the user
  was on when they opened the menu. With no tabbable descendant either, `.focus()` is called on
  the non-focusable trigger `<div>`, does nothing, and focus is left on `<body>`, so the next Tab
  restarts from the top of the document.
- **`aria-haspopup` lands on an element nobody can focus.** The trigger announces itself as
  having a menu, but by default it sets no `tabIndex` and is not in the tab order, so a keyboard
  user never arrives there to hear it. It is discoverable only by browsing the page with a screen
  reader.
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
