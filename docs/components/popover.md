# Popover

A panel anchored to a control and opened by a click — a filter form, a share sheet, a
notifications list. Floating UI positions it, flips it away from viewport edges and portals
it clear of any clipping ancestor; you supply the trigger and the contents.

<!-- example:Minimal -->
```tsx
<Popover>
  <Popover.Trigger>Deploy details</Popover.Trigger>
  <Popover.Content aria-label="Deploy details">
    <p>Deployed to production 20 minutes ago by Ada Lovelace.</p>
    <Button type="button" variant="link">
      View build log
    </Button>
  </Popover.Content>
</Popover>
```
<!-- /example -->

**Anatomy.** `Popover` is a provider and renders **no element of its own** — it holds the open
state and the Floating UI context, nothing more. `Popover.Trigger` is the anchor: it renders a
`<button class="popover-trigger">`, carries the click handler, and holds the ARIA that ties it
to the panel. `Popover.Content` is the panel; it renders through Floating UI's `FloatingPortal`
into a `<div>` at the end of `<body>`, and is **unmounted while closed** — so its children do
not exist in the DOM until you open it.

| Part              | Renders             | Props                                                                          |
| ----------------- | ------------------- | ------------------------------------------------------------------------------ |
| `Popover`         | nothing             | `open?` · `onOpenChange?` · `defaultOpen?` · `placement?` · `offset?` · `children` |
| `Popover.Trigger` | `<button>`          | `asChild?` (+ all `button` props)                                              |
| `Popover.Content` | `<div>` in a portal | all `div` props                                                                |

The root's six props are its **whole** type — it takes no `className`, `style`, `id` or `ref`,
because there is no element to put them on:

| Prop           | Type                      | Default                |
| -------------- | ------------------------- | ---------------------- |
| `open`         | `boolean`                 | — _(uncontrolled)_     |
| `onOpenChange` | `(open: boolean) => void` | —                      |
| `defaultOpen`  | `boolean`                 | `false`                |
| `placement`    | `Placement`               | `"bottom"`             |
| `offset`       | `number`                  | `8`                    |
| `children`     | `ReactNode`               | — _(required)_         |

`Placement` is Floating UI's type — `"top"`, `"right"`, `"bottom"`, `"left"`, each with an
optional `-start` / `-end` suffix — re-exported from this package's barrel next to the
`useFloating` wrapper.

## Popover vs Dialog vs Tooltip

| Component            | Opened by         | Blocks the page       | May hold controls |
| -------------------- | ----------------- | --------------------- | ----------------- |
| **Popover**          | click             | no scrim, no scroll lock | yes            |
| [Dialog](dialog.md)  | your `open` state | yes — natively modal  | yes               |
| `Tooltip`            | hover / focus     | no                    | **no**            |

Reach for **Popover** when the content is interactive but secondary: a filter form, a column
picker, a share sheet. Reach for [Dialog](dialog.md) when the task has to be finished or
abandoned before the page carries on — it calls `showModal()`, so the page behind it is
genuinely inert and the panel paints in the browser's top layer. Reach for [Tooltip](tooltip.md) for a short
label on hover or focus, and put no control in one: a hover target is unreachable by keyboard
and by touch. [HoverCard](hover-card.md), [DropdownMenu](dropdown-menu.md) and [ContextMenu](context-menu.md) are the same family with different
open gestures and, for the menus, a different keyboard model.

One caveat before you file Popover under "non-modal": nothing on screen dims, the page keeps
scrolling, and the panel paints at an ordinary `z-index` — but its **focus management is
modal**, and that is not something the API lets you turn off. See
[Accessibility](#accessibility).

## Placement and viewport edges

Positioning comes from `src/hooks/use-floating.ts`, a thin wrapper that fixes the middleware
stack for every floating component in the library:

- **`offset(offsetPx)`** — the gap between trigger and panel. `8` unless you pass `offset`.
- **`flip()`** — when the preferred side has no room, the panel moves to the **opposite** side;
  if your placement carries an alignment, the opposite alignment is tried as well. It never
  rotates onto the perpendicular axis, so `bottom` becomes `top`, never `right`.
- **`shift({ padding: 8 })`** — slides the panel along the other axis so it stays at least 8px
  inside the viewport. This is what saves a `bottom-end` popover on a narrow phone.
- **`arrow()`** — added only when the wrapper is given an `arrowRef`. `Popover` passes none, so
  there is no arrow element and nothing to position.

`whileElementsMounted: autoUpdate` keeps all of that live: the panel re-anchors on scroll, on
resize, and when either element changes size.

So a popover near a viewport edge needs nothing from you. What it *does* need is a sensible
`placement`, because flip never leaves the axis you chose — and a height budget, because the
stack has no `size()` middleware: a panel taller than the viewport is not capped. Give tall
content its own `max-height` and `overflow-y: auto`.

<!-- example:Placement -->
```tsx
<Popover placement="right-start" offset={16}>
  <Popover.Trigger>Columns</Popover.Trigger>
  <Popover.Content aria-label="Visible columns">
    <Checkbox id="column-author" defaultChecked />
    <Label htmlFor="column-author">Author</Label>
    <Checkbox id="column-duration" />
    <Label htmlFor="column-duration">Duration</Label>
  </Popover.Content>
</Popover>
```
<!-- /example -->

## Controlled

Uncontrolled is the default: `defaultOpen` sets the initial state and the component tracks the
rest. Pass `open` to take over — and pass `onOpenChange` with it, because the component stops
writing its own state the moment `open` is defined. A `<Popover open={false}>` with no
`onOpenChange` can never be opened by any interaction.

<!-- example:Controlled -->
```tsx
<Popover open={open} onOpenChange={setOpen}>
  <Popover.Trigger>Filter deploys</Popover.Trigger>
  <Popover.Content aria-label="Filter deploys">
    <p>Showing failed deploys from the last 7 days.</p>
    <FormActions>
      <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button type="button" onClick={() => setOpen(false)}>
        Apply filters
      </Button>
    </FormActions>
  </Popover.Content>
</Popover>
```
<!-- /example -->

## Using your own trigger element

`asChild` clones the single child element and merges the trigger wiring onto it instead of
rendering the built-in `<button class="popover-trigger">`. The merge is a real one: colliding
event handlers **compose** (the child's runs first and may `preventDefault()` to skip the
popover's), `ref`s merge, `className` merges through `cn()`, and `style` merges by key. Props
the trigger does not set — `href`, `variant`, your `type` — pass straight through. ARIA the
trigger owns (`aria-expanded`, `aria-haspopup`, `aria-controls`) wins over the child's, because
it describes state the child cannot know.

<!-- example:AsChild -->
```tsx
<Popover>
  <Popover.Trigger asChild>
    <Button type="button" variant="secondary">
      Share report
    </Button>
  </Popover.Trigger>
  <Popover.Content aria-label="Share report">
    <p>Anyone with the link can view Q3 revenue.</p>
    <Button type="button" variant="link">
      Copy link
    </Button>
  </Popover.Content>
</Popover>
```
<!-- /example -->

## Inside a form

One trap, and it belongs to the portal rather than the trigger: a field inside the panel is
**not a descendant of the form**, so it never reaches `FormData` and never takes part in
validation. Reattach it with the `form` attribute pointing at the form's `id` — the platform's
own answer to exactly this problem.

The trigger needs nothing from you. `Popover.Trigger` renders an explicit `type="button"`, so
opening the popover cannot submit the form and the trigger cannot become its implicit
submitter. The `type="button"` on the trigger below is therefore redundant — it stays because
it still does something: `type` is set *before* the rest spread, so a trigger that genuinely
should submit can still ask for it.

<!-- example:InsideAForm -->
```tsx
<form id="deploy-settings">
  <Label htmlFor="branch">Branch</Label>
  <Input id="branch" name="branch" defaultValue="main" />
  <Popover>
    <Popover.Trigger type="button">Advanced options</Popover.Trigger>
    <Popover.Content aria-label="Advanced options">
      <Label htmlFor="retries">Retry attempts</Label>
      <Input
        id="retries"
        name="retries"
        type="number"
        defaultValue={3}
        form="deploy-settings"
      />
    </Popover.Content>
  </Popover>
  <FormActions>
    <Button type="submit">Save changes</Button>
  </FormActions>
</form>
```
<!-- /example -->

## Naming the panel

The panel is a `role="dialog"` and takes no name from its contents, so an unlabelled popover
announces as just "dialog". `aria-label` is enough for a short one; when the panel already has
a heading, point `aria-labelledby` at it and let the two stay in sync.

<!-- example:NamedByHeading -->
```tsx
<Popover placement="bottom-end">
  <Popover.Trigger>Notifications</Popover.Trigger>
  <Popover.Content aria-labelledby="notifications-title">
    <h3 id="notifications-title">Notifications</h3>
    <p>Ada Lovelace approved Pull request #42.</p>
    <p>The nightly deploy to staging failed.</p>
  </Popover.Content>
</Popover>
```
<!-- /example -->

## Theme tokens

Popover uses **no Tailwind utilities at all** — `Popover.tsx` sets two class names and nothing
else, and every painted value lives in `Popover.css`, reading the contract variables directly.

| Where         | Override             |
| ------------- | -------------------- |
| Panel surface | `--C-SURFACE-0`      |
| Panel border  | `--C-BORDER-DEFAULT` |
| Corners       | `--RADIUS-MD`        |
| Elevation     | `--SHADOW-LG`        |

Four variables is the whole contract. The rest of the panel's appearance is off it:

- **No text colour is set.** The panel inks whatever it inherits — and because it is portalled
  to `<body>`, that is the document's colour, not the colour of the JSX ancestor you wrote it
  inside. A `color` (or any custom property) scoped to a wrapper `<div>` does not reach it.
  Scope theme overrides on `:root` or on the panel itself. This is the general portal caveat
  that [Portal](portal.md) documents, and it applies here for the same reason.
- **Padding is a literal** `0.75rem 1rem`, not the responsive `r`-scale, so it does not step up
  at the 40rem breakpoint the way [Dialog](dialog.md)'s `p-r2` does.
- **`z-index: 40` is a literal**, the same layer [DropdownMenu](dropdown-menu.md), [Combobox](combobox.md), [MultiSelect](multi-select.md) and
  [ColorPicker](color-picker.md) sit on. [Tooltip](tooltip.md) (50) and [AppShell](app-shell.md)'s mobile sidebar (49 scrim, 50 panel)
  paint above a popover; anything in the browser's top layer — [Dialog](dialog.md),
  [Drawer](drawer.md) — is above all of it regardless of `z-index`.
- **The fade is hard-coded.** `useTransitionStyles(context, { duration: 150, initial: { opacity: 0 } })`
  is written in the `.tsx`, resolving to no `--MOTION-*` variable, so retiming the library's
  motion does not retime this one — and it carries no `prefers-reduced-motion` guard.
- **`.popover-trigger` paints nothing.** It resets the button (`background: none`, `border:
  none`, `padding: 0`, `font: inherit`) and lays it out `inline-flex`. It reads no token, which
  is why `asChild` with a [Button](button.md) looks like a Button and the default trigger looks
  like text.
- **`.popover-content` sets `outline: none`** — which matters, because the panel is focused. See
  [Accessibility](#accessibility).

## Gotchas

- **Fields in the panel are outside your form.** The portal puts them at the end of `<body>`,
  so they are absent from `FormData` and from the form's validity check. Use `form="<id>"`.
- **`asChild` composes with the child rather than overwriting it.** The clone goes through
  `mergeProps`, so a colliding handler **runs alongside** the trigger's own — the child's first,
  and it can skip the popover's behaviour by calling `preventDefault()`. The child's `ref` is
  merged too, so a `<Button ref={btnRef}>` inside `asChild` populates `btnRef.current`;
  `className` merges through `cn()` and `style` merges by key. Putting the handler and ref on
  `Popover.Trigger` itself still works and is equivalent. (Before this was fixed the child lost
  `onClick`, `onKeyDown`, `onPointerDown`, `onMouseDown` and its ref, silently.)
- **A popover inside a [Dialog](dialog.md) lands outside it.** `FloatingPortal` appends the
  panel to `<body>`, and a `<dialog>` opened with `showModal()` puts itself in the top layer
  with the rest of the document inert — so the panel paints under the dialog and takes no
  clicks. Nest a popover in a [Drawer](drawer.md) or a [Dialog](dialog.md) and it will look
  broken. Inline the content instead.
- **`open` without `onOpenChange` freezes it.** Defining `open` switches the component to fully
  controlled: it stops writing its own state, so with no handler the popover never moves.
- **The panel outlives `open` by 150ms.** `useTransitionStyles` keeps it mounted for the exit
  fade, so a test that asserts the content is gone immediately after a close will still find it.
  It is unmounted for good once the transition finishes.
- **Opening a second popover closes the first.** The click is an outside `pointerdown` for the
  first one. Two popovers cannot be open at once unless you keep them both controlled and
  ignore the close.
- **Scroll is never locked.** The page behind keeps scrolling and `autoUpdate` re-anchors the
  panel as it moves. That is right for a non-modal surface; if the page should freeze, you want
  a [Dialog](dialog.md).
- **It's a client component,** and the panel is absent from server-rendered HTML even when you
  ask for it. `"use client"` puts the module in the client bundle, and `useTransitionStyles`
  reports the panel unmounted on the first pass — so `<Popover defaultOpen>` server-renders as
  the trigger alone, already carrying `aria-expanded="true"` and an `aria-controls` pointing at
  an element that is not there yet. The panel appears one paint after hydration.

## Accessibility

**On the trigger.** `aria-expanded` tracks the state, `aria-haspopup="dialog"` is always
present, and `aria-controls` is set **only while open**, pointing at the panel's `id`. Give
`Popover.Content` your own `id` and `aria-controls` follows it.

**On the panel.** `role="dialog"`, from `useRole(context, { role: "dialog" })`; a `role` you
pass yourself wins. `tabIndex` is managed: `-1` when the panel has tabbable children, `0` when
it has none, so the panel is always reachable itself.

**It has no accessible name.** Nothing is derived from the children, so label it — every example
on this page does. See [Naming the panel](#naming-the-panel).

**Focus moves, and comes back.** Opening focuses the first tabbable descendant, or the panel
itself when there is none. Escape and a second click on the trigger both return focus to the
trigger; dismissing by clicking elsewhere leaves focus on whatever you clicked.

**It is modal to the keyboard and to assistive technology, though nothing on screen says so.**
`FloatingFocusManager` is rendered with its defaults, and its `modal` default is `true`. Two
consequences while the popover is open: **Tab cycles inside the panel** and cannot reach the
rest of the page, and **every other element under `<body>` is given `aria-hidden="true"`** —
the trigger included, so a screen-reader user cannot re-read its `aria-expanded` while the panel
is open, and cannot browse the page it is anchored to. Live regions (`[aria-live]`,
`[role="status"]`, `<output>`) are exempt, so a [Toast](toast.md) still announces. Nothing about the
component's appearance — no scrim, no scroll lock — tells a sighted user this is happening, and
[Dialog](dialog.md) is the component in this library that is *meant* to be modal. Floating UI's
`modal={false}` is the fix and `Popover` does not expose it.

**Dismissal is click-outside and Escape — not focus-out.** `useDismiss` runs with its defaults:
an outside `pointerdown` closes, and Escape closes from a `keydown` listener on `document`, so
it fires wherever focus happens to be. Focus-out does *not* close the popover: that path is
disabled whenever the focus manager is modal, on the assumption that the trap makes it
unreachable. Ancestor scrolling never dismisses either — the panel just follows the trigger.

**The panel's focus ring is removed.** `.popover-content` sets `outline: none`. Open a popover
whose content has nothing tabbable — a plain paragraph — from the keyboard, and focus lands on
the panel with nothing drawn to show where it went. Pass a `className` with a focus style, or
put a focusable control in the panel.

## Related

[Dialog](dialog.md) · [Drawer](drawer.md) · [Portal](portal.md) · [Tooltip](tooltip.md) · [HoverCard](hover-card.md) ·
[DropdownMenu](dropdown-menu.md) · [ContextMenu](context-menu.md) · [Combobox](combobox.md) · [Button](button.md) ·
[FormActions](form-actions.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
