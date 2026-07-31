# Tooltip

A short description that appears beside a control on hover or keyboard focus, anchored by
Floating UI so it flips and shifts to stay on screen. It **describes** the trigger — it never
names it, and it should hold nothing interactive.

<!-- example:Minimal -->
```tsx
<Tooltip content="Exports every row, not just the current page">
  <Button type="button" variant="secondary">
    Export CSV
  </Button>
</Tooltip>
```
<!-- /example -->

| Prop         | Type                     | Default   |
| ------------ | ------------------------ | --------- |
| `content`    | `ReactNode` — required   | —         |
| `children`   | `ReactElement` — required, exactly one | — |
| `placement`  | `Placement`              | `"top"`   |
| `delay`      | `number` (ms)            | `300`     |
| `offset`     | `number` (px)            | `8`       |
| `container`  | `HTMLElement \| null`    | `<body>`  |
| `className`  | `string`                 | —         |
| `arrow`      | `boolean`                | `false`   |
| `classNames` | `{ arrow?: string }`     | —         |

That is the entire surface. There is no `open`/`onOpenChange` (the component owns its own
state), no `id`, and no `disabled` — and no rest spread, so anything not in that table is a
compile error rather than a prop that quietly does nothing. `container` redirects the portal —
the prop to reach for inside a [Dialog](dialog.md) or [Drawer](drawer.md); see
[Gotchas](#gotchas). `className` reaches the bubble and nothing else; see [Slots](#slots).
`TooltipProps` is internal, so a wrapper of your own re-declares the props; `Placement` **is**
exported from the package barrel, so a variable holding one can be typed.

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
`autoUpdate` loop keeps it anchored while you scroll or resize. Pass `arrow` for a pointer back
at the trigger — see [The arrow](#the-arrow).

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
The default 300 ms is what stops a bubble flashing at every pointer that crosses the control;
on the way out you get the matching close delay, plus a safe-polygon corridor that keeps the
bubble open while the pointer travels onto it.

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

**Keep it non-interactive anyway.** The pointer can reach the bubble — `safePolygon()` keeps
it open across the gap — so a link inside it is technically clickable with a mouse. But the
bubble is portalled to the end of `<body>` by default, so anything focusable in it becomes a
tab stop at the end of the document rather than after the trigger. A user who tabs off the
trigger lands there with no idea where "there" is. When you need
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

## The arrow

`arrow` draws a pointer triangle on the bubble edge that faces the trigger. It is **off by
default** and is the one thing on this page that changes what is painted.

<!-- example:Arrow -->
```tsx
<Tooltip content="Runs on every push to main" arrow className="max-w-r1">
  <Button type="button" variant="secondary">
    Nightly build
  </Button>
</Tooltip>
```
<!-- /example -->

- **It follows a flip.** The edge comes from the *resolved* placement, so a `top` tooltip pushed
  to `bottom` moves its arrow with it. The element carries `data-side="top" | "right" |
  "bottom" | "left"` naming that edge, and stays centred on the trigger after `shift()` has run.
- **It takes the bubble's own paint.** `background-color` and `border` are `inherit`, so it
  follows `--C-PRIMARY` and any border a theme gives `.tooltip` — which today is none. There is
  deliberately no arrow variable: one that could be set without the bubble's own would let the
  two drift apart.
- **Resize it with `classNames.arrow`**, not with a token. The middleware measures the element,
  so `classNames={{ arrow: "size-r4" }}` stays correctly centred and correctly seated. See
  [Slots](#slots).
- **It is `aria-hidden`,** so the bubble's text is still exactly what gets announced.
- **Forced colours are fine.** Both `inherit`s resolve to whatever the substituted palette gave
  the bubble.

## Slots

`className` addresses the bubble — the only element Tooltip constructs, since `children` is
cloned rather than wrapped. `classNames` addresses what the bubble renders inside itself: class
strings only, with typed keys, so a misspelled one is a compile error rather than a prop that
does nothing.

| Slot    | Element              | What it addresses                                |
| ------- | -------------------- | ------------------------------------------------ |
| `arrow` | `div.tooltip-arrow`  | the pointer triangle, present only under `arrow`  |

```tsx
<Tooltip content="Runs on every push to main" arrow classNames={{ arrow: "size-r4" }}>
  <Button type="button" variant="secondary">Nightly build</Button>
</Tooltip>
```

`className` is what makes the four values below that no theme variable reaches — the padding,
the wrap width, `word-wrap` and the stack level — overridable per instance. Before it existed
they had no route at *any* level. The slot class and `className` are both merged after the base
class and both survive it: `cn()` resolves conflicts between utilities, not between a utility
and a component class. A utility touching a property `.tooltip` already sets replaces it,
because the base class lives in `@layer components` and yours does not.

**There is no slot for the fade, and there cannot be one.** `useTransitionStyles` writes
`transition-duration` as an inline style, so a `duration-*` utility on the bubble — in a slot, in
`className`, or inlined from CSS — is silently dead wherever it is written. That is why the tempo
is a **token**, not a slot: `--MOTION-DURATION-ENTER` and `--MOTION-DURATION-EXIT` are the only
channel that can reach it, and a theme setting them reaches every floating surface at once.

## Theme tokens

Tooltip paints in Tailwind utilities, each resolving to a contract variable. Because they
sit in `@layer utilities`, a `className` on the bubble or a `classNames.arrow` of your own
beats every one of them.

| Where            | Utility               | Override                                    |
| ---------------- | --------------------- | ------------------------------------------- |
| Bubble fill      | `bg-primary`          | `--C-PRIMARY`                               |
| Bubble text      | `text-fg-on-primary`  | `--C-TEXT-ON-PRIMARY`                       |
| Corners          | `rounded-sm`          | `--RADIUS-SM`                               |
| Drop shadow      | `shadow-sm`           | `--SHADOW-SM`                               |
| Type scale       | `text-body-2`         | `--BodyText-2` · `--BodyText-2-line-height` |

The arrow's box is `size-r5`, so `--R-SIZE-5` sizes it too. It is not a row above because
`verify:component-docs` cannot resolve a `size-*` utility to a token — the table would claim
something the gate could not check.

The bubble paints its own background, so unlike most components here it is not at the mercy of
whatever surface it lands on — and `--C-TEXT-ON-PRIMARY` on `--C-PRIMARY` is precisely the
pairing the [theme contract](../theme-contract.md) defines for text on a primary fill.
Measured across the default theme and the three worked examples, the tooltip's own text
clears WCAG AA comfortably: 14.6:1 (default), 14.8:1 (tech), 10.2:1 (grimdark), 5.7:1
(events). At every one of those sizes this is normal-weight body text, so 4.5:1 is the bar it
has to clear. Measured against the default theme and the worked examples; these numbers do
not transfer to your own theme — re-check them against your values.

On the base scale `--BodyText-2` is responsive, stepping 0.8125rem → 0.875rem at the 40rem
breakpoint. Each example theme pins the line-height at `:root[data-theme=…]`, which outranks
the breakpoint rule, and `tech` pins the size as well — so the step only happens in the
default theme.

Three values are hard literals rather than contract variables: the padding (0.25rem 0.625rem,
as py-1 / px-2.5), the wrap width (17.5rem, with long words broken rather than overflowing)
and the stack level (z-50). None are themeable, but all three are reachable **per instance**
through `className` — see [Slots](#slots). Two have consequences worth knowing — see
[Gotchas](#gotchas).

**The fade is themeable, and only through the token.** It reads `--MOTION-DURATION-ENTER` on open
and `--MOTION-DURATION-EXIT` on close, falling back to 150 ms when no token layer is present. It is
set inline from JavaScript, so no stylesheet rule and no utility can outrank it — the token is the
whole channel. Under `prefers-reduced-motion: reduce` it drops to 0, which removes the fade and the
delayed unmount together.

The arrow adds no variable of its own: it inherits the bubble's fill and border, so it re-tints
with `--C-PRIMARY` and needs no separate row above.

**One rule survives in `Tooltip.css` — the arrow's `border: inherit`, and the four
`[data-side]` rules that trim it.** It is a shorthand, so its only utility form is the
arbitrary property `[border:inherit]`, and Tailwind emits arbitrary properties *after* every
named `border-*` utility at the same specificity: as a class it would beat a
`classNames={{ arrow: "border-primary" }}` of yours instead of losing to it. From
`@layer components` it loses, which is the point of the declaration. `border-inherit` is not
a substitute — that is `border-color: inherit` only, and cannot carry a width or a style.

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
- **Escape dismisses it, but not durably.** Press Escape and the bubble closes; move the
  pointer even slightly *without leaving the trigger* and it comes back after `delay` ms. To
  make it stay away you have to move off the trigger.
- **Inside a [Dialog](dialog.md) or [Drawer](drawer.md) it paints underneath — unless you pass
  `container`.** Both use a native `<dialog>` with `showModal()`, which promotes them to the
  browser's top layer; by default the tooltip portals to a `<div>` at the end of `<body>`,
  which is not in the top layer, and no `z-index` can climb into it. Pass the dialog element
  (or any node inside it) as `container` and the bubble portals into the top layer with it.
- **It is a client component.** `Tooltip.tsx` carries `"use client"`, so importing it opts its
  module into the client bundle. Unlike [Button](button.md) it is not itself usable as a server
  component — it is a client boundary, and both the bubble and the cloned trigger are painted
  on the client.
- **The bubble outlives the close by `--MOTION-DURATION-EXIT`** (150 ms with no token layer, 0 under
  `prefers-reduced-motion: reduce`). It fades out rather than vanishing, so a test that asserts
  `queryByRole("tooltip")` is null immediately after an unhover will flake — and the delay is
  whatever the *consumer's theme* says, not a constant you can hard-code a wait for. Wait for its
  removal instead.

## Accessibility

Tooltip gets the hard parts right — it opens on keyboard focus, not just hover, and the
open/close timers are cleared on unmount, so a trigger that disappears mid-delay leaves nothing
pending — and it meets all three requirements of **WCAG 1.4.13, Content on Hover or Focus**:

- **Dismissible — yes, with a caveat.** Escape closes the bubble from anywhere, without moving
  the pointer or focus. It re-opens on the next pointer movement over the trigger; see
  [Gotchas](#gotchas).
- **Hoverable — yes.** `safePolygon()` keeps the bubble open while the pointer crosses the gap
  from trigger to bubble, and the bubble itself can be hovered — so content can be read
  slowly, selected, or magnified. It closes `delay` ms after the pointer leaves both.
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
