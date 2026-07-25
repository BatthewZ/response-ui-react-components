# Tooltip

A short description that appears beside a control on hover or keyboard focus, anchored by
Floating UI so it flips and shifts to stay on screen. It **describes** the trigger — it never
names it, and nothing inside it can be clicked.

<!-- example:Minimal -->
```tsx
<Tooltip content="Exports every row, not just the current page">
  <Button type="button" variant="secondary">
    Export CSV
  </Button>
</Tooltip>
```
<!-- /example -->

| Prop        | Type                     | Default   |
| ----------- | ------------------------ | --------- |
| `content`   | `ReactNode` — required   | —         |
| `children`  | `ReactElement` — required, exactly one | — |
| `placement` | `Placement`              | `"top"`   |
| `delay`     | `number` (ms)            | `300`     |
| `offset`    | `number` (px)            | `8`       |

That is the entire surface. There is no `open`/`onOpenChange` (the component owns its own
state), no `className`, no `id`, no `disabled`, and no way to redirect its portal.
`TooltipProps` is internal, so a wrapper of your own re-declares the five props; `Placement`
**is** exported from the package barrel, so a variable holding one can be typed.

`children` is cloned, not wrapped — Tooltip renders no element of its own around the trigger,
so it never disturbs your layout. The clone is also where its sharpest edge lives; see
[Gotchas](#gotchas).

## A tooltip is a description, not a name

While open, Tooltip sets `aria-describedby` on the trigger pointing at the bubble, and gives
the bubble `role="tooltip"`. It never sets `aria-labelledby`. That distinction decides how you
use it:

- **`aria-describedby` feeds the accessible *description*.** Assistive tech announces it after
  the name, and several screen readers announce descriptions late, at reduced verbosity, or
  only on request. It is supplementary by construction.
- **The trigger must already have its own name.** Visible text supplies one. For an icon-only
  control, [IconButton](icon-button.md) demands an `aria-label`, and that label — not the
  tooltip — is what gets announced as the name.

So on the canonical target, an icon-only button, the tooltip text lands *on top of* a name that
already exists:

<!-- example:IconOnlyTrigger -->
```tsx
<Tooltip content="Archive conversation">
  <IconButton type="button" aria-label="Archive conversation">
    <Archive size={16} aria-hidden="true" />
  </IconButton>
</Tooltip>
```
<!-- /example -->

Keep the two strings identical, as above. A user may then hear the same phrase twice — the
name, then the description — which is mildly redundant. Two *different* phrases for one button
is worse. Worst of all is treating the tooltip *as* the label and leaving the trigger unnamed:
on a bare `<button>` that costs the control its accessible name outright, and on
[IconButton](icon-button.md#accessibility) an empty `aria-label` still compiles, so nothing
stops you.

## Where it lands

`placement` takes any of Floating UI's twelve values — `"top"`, `"top-start"`, `"top-end"`,
and the same three for `"right"`, `"bottom"`, `"left"`. It is a **preference, not a promise**:
the `flip` and `shift` middleware move the bubble when the viewport is tight, and an
`autoUpdate` loop keeps it anchored while you scroll or resize. There is no arrow.

<!-- example:Placement -->
```tsx
<Tooltip content="Reverts to the last saved revision" placement="top">
  <Button type="button" variant="secondary">
    Discard changes
  </Button>
</Tooltip>
<Tooltip content="Notifies every reviewer on the team" placement="right">
  <Button type="button" variant="secondary">
    Request review
  </Button>
</Tooltip>
<Tooltip content="Runs against the staging database" placement="bottom-start">
  <Button type="button" variant="secondary">
    Dry run
  </Button>
</Tooltip>
```
<!-- /example -->

`offset` is the gap between trigger and bubble in pixels.

## Timing

<!-- example:Timing -->
```tsx
<Tooltip content="Rebuilds the search index — takes about 30 seconds" delay={0} offset={12}>
  <Button type="button" variant="secondary">
    Reindex
  </Button>
</Tooltip>
```
<!-- /example -->

**One `delay` governs both directions.** Hover the trigger and the bubble appears after
`delay` ms; leave it and the bubble disappears after another `delay` ms. You cannot set the
two independently — the prop is a plain `number`, not Floating UI's `{ open, close }` object.
The default 300 ms is what stops a bubble flashing at every pointer that crosses the control,
and the matching close delay is the only grace period you get on the way out.

Keyboard focus is different: it opens the bubble **immediately**, with no delay, and only when
the browser treats the focus as visible (`:focus-visible`). Clicking the trigger with a mouse
therefore does not open it through the focus path — which is what you want, since hover has
already opened it.

Each Tooltip times itself. There is no delay group, so moving along a toolbar of six icon
buttons waits the full `delay` at every one.

## What can go in `content`

`content` is a `ReactNode`, so short markup is fine — emphasis, a line break, a
[Kbd](kbd.md) shortcut:

<!-- example:RichContent -->
```tsx
<Tooltip
  content={
    <span>
      Copy link <Kbd>⌘</Kbd> <Kbd>C</Kbd>
    </span>
  }
>
  <IconButton type="button" aria-label="Copy link">
    <Link2 size={16} aria-hidden="true" />
  </IconButton>
</Tooltip>
```
<!-- /example -->

**Nothing interactive.** The bubble is `pointer-events: none`, so a link or button inside it
can never be clicked; and because the bubble is portalled to the end of `<body>`, anything
focusable in it becomes a tab stop at the end of the document rather than after the trigger.
A user who tabs off the trigger lands there with no idea where "there" is. When you need
content the user can act on — a link, a button, a form — reach for [Popover](popover.md), which is built
to be entered.

## When the action is unavailable

The most valuable thing a tooltip can say is *why* a control is disabled — and a `disabled`
control is exactly the one that cannot tell you, because it is removed from the tab order.
Keep it focusable with `aria-disabled` and refuse the action yourself — the trigger below
attaches no handler at all, so clicking it does nothing:

<!-- example:UnavailableAction -->
```tsx
<Tooltip content="Only workspace owners can delete a workspace">
  <Button type="button" variant="danger" aria-disabled="true" className="opacity-50">
    Delete workspace
  </Button>
</Tooltip>
```
<!-- /example -->

This is the same trade [IconButton](icon-button.md#accessibility) documents. The dimming is
yours to supply — `disabled:opacity-50` is keyed off the real attribute, which you are no
longer setting.

## Theme tokens

Tooltip uses **no Tailwind utilities**. Every visual value lives in `Tooltip.css` under one
class, `.tooltip`, and reads contract variables directly.

| Where            | Override                                    |
| ---------------- | ------------------------------------------- |
| Bubble fill      | `--C-PRIMARY`                               |
| Bubble text      | `--C-TEXT-ON-PRIMARY`                       |
| Corners          | `--RADIUS-SM`                               |
| Drop shadow      | `--SHADOW-SM`                               |
| Type scale       | `--BodyText-2` · `--BodyText-2-line-height` |

The bubble paints its own background, so unlike most components here it is not at the mercy of
whatever surface it lands on — and `--C-TEXT-ON-PRIMARY` on `--C-PRIMARY` is precisely the
pairing the [theme contract](../theme-contract.md) defines for text on a primary fill.
Measured across the four shipped themes, the tooltip's own text clears WCAG AA comfortably:
14.6:1 (default), 14.8:1 (tech), 10.2:1 (grimdark), 5.7:1 (events). At every one of those
sizes this is normal-weight body text, so 4.5:1 is the bar it has to clear.

On the base scale `--BodyText-2` is responsive, stepping 0.8125rem → 0.875rem at the 40rem
breakpoint. Each shipped theme pins the line-height at `:root[data-theme=…]`, which outranks
the breakpoint rule, and `tech` pins the size as well — so the step only happens in the
default theme.

Five values are hard literals rather than contract variables: the padding (`0.25rem 0.625rem`),
the wrap width (`17.5rem`, with long words broken rather than overflowing), the stack level
(50), the suppressed pointer events, and the 150 ms fade, which is set inline from JavaScript
rather than in the stylesheet. None are themeable, and two of them have consequences worth
knowing — see [Gotchas](#gotchas).

## Gotchas

- **The child's own event handlers are composed, not replaced.** Tooltip passes your props
  through `getReferenceProps(children.props)` before cloning, so `onFocus`, `onBlur`,
  `onKeyDown`, `onPointerDown`, `onPointerEnter`, `onMouseMove` and `onMouseLeave` on the child
  all still fire alongside the tooltip's own. Your `ref` is merged too. (Before this was fixed
  those seven were overwritten and never fired, while the types said it all worked.)
- **The child's `aria-describedby` is preserved.** `aria-describedby` is a space-separated
  IDREF *list*, so wrapping a control that already points at a hint —
  `<Input aria-describedby="password-rules">` — keeps that association and **appends** the
  tooltip's id while it is open. The hint is still announced.
- **A trigger that ignores its props disables the whole thing, silently.** The clone hands
  down a `ref` and a set of handlers; a custom component that renders `<span>{children}</span>`
  without spreading them receives them and drops them, and the tooltip then never opens — no
  warning, no error. `children` is typed `ReactElement`, which does not catch this. Use a host
  element, or a component that forwards both props and `ref` (as
  [Button](button.md) and [IconButton](icon-button.md) do).
- **You cannot move the pointer into the bubble.** `.tooltip` sets `pointer-events: none`, so
  the bubble never receives a `mouseenter`; leaving the trigger starts the close timer and
  nothing cancels it. This keeps the bubble from ever swallowing a click, at the cost of WCAG
  1.4.13 — see [Accessibility](#accessibility).
- **Escape dismisses it, but not durably.** Press Escape and the bubble closes; move the
  pointer even slightly *without leaving the trigger* and it comes back after `delay` ms. To
  make it stay away you have to move off the trigger.
- **Inside a [Dialog](dialog.md) or [Drawer](drawer.md) it will be painted underneath.** Both
  use a native `<dialog>` with `showModal()`, which promotes them to the browser's top layer;
  the tooltip portals to a `<div>` at the end of `<body>`, which is not in the top layer, and
  no `z-index` can climb into it. Tooltip exposes no portal target, so there is no prop-level
  fix — don't rely on tooltips inside modals.
- **It is a client component.** `Tooltip.tsx` carries `"use client"`, so importing it opts its
  module into the client bundle. Unlike [Button](button.md) it is not itself usable as a server
  component — it is a client boundary, and both the bubble and the cloned trigger are painted
  on the client.
- **The bubble outlives the close by 150 ms.** It fades out rather than vanishing, so a test
  that asserts `queryByRole("tooltip")` is null immediately after an unhover will flake; wait
  for its removal instead.

## Accessibility

Tooltip gets the two hard parts right — it opens on keyboard focus, not just hover, and the
open/close timers are cleared on unmount, so a trigger that disappears mid-delay leaves nothing
pending — and then fails one of the three requirements of **WCAG 1.4.13, Content on Hover or
Focus**:

- **Dismissible — yes, with a caveat.** Escape closes the bubble from anywhere, without moving
  the pointer or focus. It re-opens on the next pointer movement over the trigger; see
  [Gotchas](#gotchas).
- **Hoverable — no.** The success criterion requires that the pointer can be moved over the
  additional content without it disappearing. `pointer-events: none` makes that impossible: the
  bubble cannot be hovered at all, and it closes `delay` ms after the pointer leaves the
  trigger regardless of where the pointer has gone. Content a user might need to read slowly,
  select, or magnify does not belong here.
- **Persistent — yes.** There is no auto-hide timer. The bubble stays for as long as the
  trigger is hovered or focused, and closes only on unhover, blur, Escape, or a pointer-down
  outside it.

Two more things to plan around:

- **There is no touch story at all.** The component registers hover and focus handlers and
  nothing else — no long-press, no tap-to-open, no pointer-type guard. On a phone, whatever you
  see comes from the browser's own emulated mouse events after a tap, and that same tap
  activates the trigger. Treat every tooltip as invisible on touch: never put information there
  that a user needs in order to decide what a control does.
- **The name still has to come from the trigger.** `role="tooltip"` is close to inert on its
  own — the association that matters is the `aria-describedby` this component sets while open.
  If the trigger has no accessible name, the tooltip does not supply one.

## Related

[IconButton](icon-button.md) · [Button](button.md) · [Kbd](kbd.md) · [Popover](popover.md) · [HoverCard](hover-card.md) ·
[Portal](portal.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
