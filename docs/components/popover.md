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
into a `<div>` at the end of the nearest `<dialog>` ancestor of the trigger, or the end of `<body>` when there is none, and is
**unmounted while closed** — so its children do not exist in the DOM until you open it.

| Part              | Renders             | Props                                                                          |
| ----------------- | ------------------- | ------------------------------------------------------------------------------ |
| `Popover`         | nothing             | `open?` · `onOpenChange?` · `defaultOpen?` · `placement?` · `offset?` · `children` |
| `Popover.Trigger` | `<button>`          | `asChild?` (+ all `button` props)                                              |
| `Popover.Content` | `<div>` in a portal | `arrow?` · `classNames?` (+ all `div` props)                                   |

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

Popover is non-modal all the way down: nothing on screen dims, the page keeps scrolling, the
panel paints at an ordinary `z-index` (inside a [Dialog](dialog.md) or [Drawer](drawer.md) it
paints in the top layer, because it is portalled into the dialog and rides along with it), and its **focus management is non-modal too** —
`FloatingFocusManager` runs with `modal={false}`, so Tab leaves the panel, nothing outside it
is marked `aria-hidden` or `inert`, and the trigger stays readable while the panel is open.
Focus still *moves* into the panel on open and comes back on close. See
[Accessibility](#accessibility). (Until 0.9.0 the manager ran with its `modal` default of
`true` — a full trap on a surface with no scrim to justify one.)

## Placement and viewport edges

Positioning comes from `src/hooks/use-floating.ts`, a thin wrapper that fixes the middleware
stack for every floating component in the library:

- **`offset(offsetPx)`** — the gap between trigger and panel. `8` unless you pass `offset`.
- **`flip()`** — when the preferred side has no room, the panel moves to the **opposite** side;
  if your placement carries an alignment, the opposite alignment is tried as well. It never
  rotates onto the perpendicular axis, so `bottom` becomes `top`, never `right`.
- **`shift({ padding: 8 })`** — slides the panel along the other axis so it stays at least 8px
  inside the viewport. This is what saves a `bottom-end` popover on a narrow phone.
- **`arrow()`** — centres a pointer triangle on the trigger, and reports how far off-centre it
  had to sit once `shift()` has moved the panel. `Popover` always hands the wrapper its
  `arrowRef`, so the middleware is live; whether anything is *drawn* is the `arrow` prop's
  decision. See [The arrow](#the-arrow).

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

## The arrow

`<Popover.Content arrow>` draws a pointer triangle on the panel edge that faces the trigger.
It is **off by default** and is the one thing on this page that changes what is painted, so
adding it is a decision rather than an upgrade.

<!-- example:Arrow -->
```tsx
<Popover placement="top">
  <Popover.Trigger>Build status</Popover.Trigger>
  <Popover.Content arrow classNames={{ arrow: "size-r4" }} aria-label="Build status">
    <p>All 412 checks passed on 4f21a9c.</p>
  </Popover.Content>
</Popover>
```
<!-- /example -->

- **It follows a flip.** The edge is chosen from the *resolved* placement, not the one you
  asked for, so a `top` popover pushed to `bottom` moves its arrow to the top edge with it. The
  element carries `data-side="top" | "right" | "bottom" | "left"` naming that edge.
- **It is centred on the trigger, and stays inside the panel.** `arrow()` reports the offset
  after `shift()` has run, so the arrow tracks the trigger along the panel rather than sitting
  at a fixed midpoint.
- **It takes the panel's own paint.** `background-color` and `border` are `inherit`, so it
  follows `--C-SURFACE-0` / `--C-BORDER-DEFAULT` — and follows a `bg-*` or `border-*` you put on
  `Popover.Content` instead. There is deliberately no `--popover-arrow-*` variable: one that
  could be set without the panel's own would let the two drift apart.
- **Resize it with `classNames.arrow`**, not with a token. The middleware measures the element,
  so `classNames={{ arrow: "size-r4" }}` stays correctly centred and correctly seated. See
  [Slots](#slots).
- **It is `aria-hidden`,** so it changes nothing about the panel's name or description.
- **Forced colours are fine.** Both `inherit`s resolve to whatever the substituted palette gave
  the panel, so the arrow stays a continuation of the panel outline rather than a shape painted
  in a colour the palette no longer contains.

One edge worth knowing: the middleware is given no corner padding, so an arrow anchored to a
trigger at the very end of a long panel can sit against the panel's `--RADIUS-MD` corner. Keep
`placement` centred (`"top"`, `"bottom"`) rather than `-start` / `-end` when the arrow matters.

## Slots

`className` addresses the element each part renders. `classNames` addresses the elements a part
renders *inside* itself — class strings only, and the keys are typed, so a misspelled one is a
compile error rather than a prop that does nothing.

| Part               | Slot    | Element                    | What it addresses                          |
| ------------------ | ------- | -------------------------- | ------------------------------------------ |
| `Popover.Content`  | `arrow` | `div.popover-arrow`        | the pointer triangle, present only under `arrow` |

```tsx
<Popover.Content arrow classNames={{ arrow: "size-r4" }} aria-label="Build status" />
```

The slot class is merged after the base class, and both survive the merge — `cn()` resolves
conflicts between utilities, not between a utility and a component class. A utility touching a
property `.popover-arrow` already sets (`width`, `height`, `background-color`) replaces it
rather than stacking with it, because the base class lives in `@layer components` and yours does
not.

**Deliberately not slots.** `Popover.Trigger` and `Popover.Content` are subcomponents, so their
own `className` already reaches them — a slot beside a subcomponent would be a second writer for
one element. And **there is no slot for the fade**: `useTransitionStyles` writes
`transition-duration` as an inline style, so a `duration-*` utility on the panel, in a slot or
inlined from CSS is silently dead no matter where it is written. That tempo is
`--MOTION-DURATION-ENTER` / `--MOTION-DURATION-EXIT` and nothing else.

## Controlled

Uncontrolled is the default: `defaultOpen` sets the initial state and the component tracks the
rest. Pass `open` to take over — and pass `onOpenChange` with it, because a controlled Popover
writes no state of its own. A `<Popover open={false}>` with no `onOpenChange` can never be
opened by any interaction.

**The mode is decided on the first render and never revisited.** `open` defined on that render
makes the Popover controlled for its whole life, and a later `undefined` reads as *closed*
rather than as a handover — so `open={o ?? undefined}` stays controlled. `open` `undefined` on
the first render makes it uncontrolled for its whole life, and an `open` supplied later is
ignored. See [Gotchas](#gotchas).

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

`Popover.css` is down to the arrow. The trigger and the panel are Tailwind utilities in
`Popover.tsx`, each resolving to a contract variable.

| Where         | Utility                  | Override             |
| ------------- | ------------------------ | -------------------- |
| Panel surface | `bg-surface-0`           | `--C-SURFACE-0`      |
| Panel border  | `border-border-default`  | `--C-BORDER-DEFAULT` |
| Corners       | `rounded-md`             | `--RADIUS-MD`        |
| Elevation     | `shadow-lg`              | `--SHADOW-LG`        |
| Focus ring    | `focus-visible:outline-border-focus` | `--C-BORDER-FOCUS` |

Four variables is the whole contract. The rest of the panel's appearance is off it:

- **No text colour is set.** The panel inks whatever it inherits — and it inherits from the
  element it is portalled into, not from the JSX ancestor you wrote it inside. That is `<body>`
  normally, and the enclosing `<dialog>` when there is one. Either way a `color` (or any custom
  property) scoped to a wrapper `<div>` does not reach it.
  Scope theme overrides on `:root` or on the panel itself. This is the general portal caveat
  that [Portal](portal.md) documents, and it applies here for the same reason.
- **Padding is a literal** `0.75rem 1rem`, not the responsive `r`-scale, so it does not step up
  at the 40rem breakpoint the way [Dialog](dialog.md)'s `p-r2` does.
- **`z-index: 40` is a literal**, the same layer [DropdownMenu](dropdown-menu.md), [Combobox](combobox.md), [MultiSelect](multi-select.md) and
  [ColorPicker](color-picker.md) sit on. [Tooltip](tooltip.md) (50) and [AppShell](app-shell.md)'s mobile sidebar (49 scrim, 50 panel)
  paint above a popover; anything in the browser's top layer — [Dialog](dialog.md),
  [Drawer](drawer.md) — is above all of it regardless of `z-index`. That is not a problem for a
  popover *inside* one: it is portalled into the dialog, so it paints and hit-tests with the
  dialog's own subtree rather than under it. (The panel is a descendant of a top-layer element,
  not itself in the top layer — which is why the dialog's box still bounds it, below.)
- **The fade reads the theme, and is dropped under reduced motion.** The open/close opacity
  transition takes its duration from `--MOTION-DURATION-ENTER` / `--MOTION-DURATION-EXIT`,
  read from `:root` at runtime (the measured themes set these between 120ms and 500ms), and
  falls back to 150ms when no token layer is present. Under
  `prefers-reduced-motion: reduce` the duration is `0`, which removes the fade *and* the
  delayed unmount. The value has to be read in JS rather than written in CSS:
  `useTransitionStyles` writes `transition-duration` as an inline style, and an inline
  declaration outranks any stylesheet rule. It is re-read on each open, so switching theme at
  runtime reaches the next one.
- **`.popover-trigger` paints nothing.** It lays the button out `inline-flex w-fit` and
  reads no token, which is why `asChild` with a [Button](button.md) looks like a Button and
  the default trigger looks like text. It carries **no reset**: Preflight already gives a
  `<button>` the `background`, `border`, `padding` and `font: inherit` the old rule restated,
  and a reset could not have been transposed anyway — Tailwind sorts arbitrary-property
  utilities last, so `[font:inherit]` in a class list would beat your `className` instead of
  losing to it.
- **`.popover-content` sets `outline: none` and then paints the ring back** under
  `:focus-visible` — a `2px solid var(--C-BORDER-FOCUS)` outline at `outline-offset: 2px`,
  the house recipe. That rule is load-bearing rather than decorative: the panel is the
  element that actually takes focus when its content holds no tab stop. See
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
- **A popover inside a [Dialog](dialog.md) or [Drawer](drawer.md) lands inside it**, and there
  is nothing to configure. `showModal()` puts the dialog in the top layer with the rest of the
  document inert, so a panel appended to `<body>` would paint underneath it *and* take no
  clicks — being in the top layer is not enough on its own, because inertness is a separate
  mechanism. The panel is therefore portalled into the nearest `<dialog>` ancestor of the
  trigger, which answers both. Any `<dialog>` counts, including one you wrote by hand.
  (Form association depends on which side of the dialog your `<form>` is. The panel is appended
  to the `<dialog>` itself, so a form you rendered *inside* the dialog is the panel's **sibling**
  and its fields still need `form="<id>"` — but a form that *wraps* the Dialog is the panel's
  **ancestor**, and fields in the panel now reach its `FormData` where before they could not.)
- **Inside a dialog the panel is bounded by that dialog's box.** `dialog:modal` carries
  `overflow: auto` in the user agent stylesheet, so a modal dialog is a scrollport — and
  Floating UI, correctly, treats it as the clipping ancestor, so `flip` and `shift` keep the
  panel inside the dialog rather than inside the viewport. A panel that fits is unaffected,
  which is the common case. One that does not is clamped to the dialog's leading edge and the
  overflow becomes the dialog's *scrollable* area rather than being painted.
  **Height is the axis that costs you something real.** A [Drawer](drawer.md) is full-height so
  it never shows this, but a [Dialog](dialog.md) is as tall as its content, and
  [DropdownMenu](dropdown-menu.md)/[ContextMenu](context-menu.md) set no `max-height` (unlike
  [Combobox](combobox.md), which caps its list). Measured in Chromium: of a 14-item menu inside
  a 260px-tall Dialog, a click reaches **1 item of 14**. Width is milder — at a 375px viewport a
  [DatePicker](date-picker.md) panel is 351px inside a 337px Drawer and loses the 22px past the
  edge. Give the dialog room, cap the panel's height yourself, or keep a large panel out of a
  small dialog. Tracked as finding #506.
- **`open` without `onOpenChange` freezes it — and the mode is fixed at mount.** A first render
  with `open` defined makes the component fully controlled for its life: it writes no state of
  its own, so with no handler (or a handler that ignores the value) the trigger clicks and
  nothing opens. Nothing throws and nothing logs. The mirror is just as quiet: mount without
  `open` and the component is uncontrolled forever, so an `open` you start passing later — after
  a fetch resolves, say — is **ignored** while your state says otherwise. Pass `open` from the
  first render or not at all; `open={o ?? undefined}` keeps whatever that render decided.
- **Tabbing out of the panel closes it.** With non-modal focus management, moving focus to an
  element unrelated to the popover dismisses it (`closeOnFocusOut` is on by default), so a
  panel is not a place to park focus. Escape and an outside click do the same thing more
  obviously.
- **The panel outlives `open` by the exit duration** (`--MOTION-DURATION-EXIT`, 150ms with no
  token layer, `0` under reduced motion). `useTransitionStyles` keeps it mounted for the exit
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

**It is not modal, to the keyboard or to assistive technology — and that matches what it looks
like.** `FloatingFocusManager` is rendered with `modal={false}`, so while the popover is open
**Tab walks out of the panel** and carries on into the page, and **nothing outside the portal is
marked `aria-hidden` or `inert`** — the trigger stays readable, `aria-expanded` and all, and a
screen-reader user can still browse the page the panel is anchored to. That is deliberate:
nothing about the component's appearance — no scrim, no scroll lock — would tell a sighted user
a trap was in force, and [Dialog](dialog.md) is the component in this library that is *meant*
to be modal. (This shipped wrong until 0.9.0: the manager ran with its `modal` default of
`true`, so opening a popover put the entire rest of the document behind `aria-hidden` +
`inert` — the trigger included — and a screen-reader user could not reach even the control
that had opened it. Live regions were exempt, so a [Toast](toast.md) still announced.)

**Dismissal is click-outside, Escape, and focus-out.** `useDismiss` runs with its defaults: an
outside `pointerdown` closes, and Escape closes from a `keydown` listener on `document`, so it
fires wherever focus happens to be. `closeOnFocusOut` is on by default and is live now that the
manager is non-modal, so **moving focus to an unrelated element also closes the panel** — which
is what tabbing past its last control does. Ancestor scrolling never dismisses — the panel just
follows the trigger.

**The panel is focusable, and it draws a ring.** `.popover-content` sets `outline: none`, and
`.popover-content:focus-visible` puts the house `2px solid var(--C-BORDER-FOCUS)` outline back
at `outline-offset: 2px`. That rule matters because of the `tabIndex` behaviour above: open a
popover whose content has nothing tabbable — a plain paragraph — and the focus manager gives the
panel `tabindex="0"` and focuses it, so the panel *is* where the keyboard is. Without the
replacement rule there would be nothing drawn to show it, which is exactly what shipped before
`verify:focus-affordance` learned to model this case.

## Related

[Dialog](dialog.md) · [Drawer](drawer.md) · [Portal](portal.md) · [Tooltip](tooltip.md) · [HoverCard](hover-card.md) ·
[DropdownMenu](dropdown-menu.md) · [ContextMenu](context-menu.md) · [Combobox](combobox.md) · [Button](button.md) ·
[FormActions](form-actions.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
