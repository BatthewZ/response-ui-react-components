# Collapsible

One disclosure — a trigger and the panel it shows and hides — with a height transition
that needs no measured heights and no `max-height` guess. It is a behaviour primitive:
it wires the trigger to the panel, owns the open state, and animates the reveal, then
gets out of the way and inherits whatever look you give it.

<!-- example:Minimal -->
```tsx
<Collapsible>
  <Collapsible.Trigger>Shipping details</Collapsible.Trigger>
  <Collapsible.Content>Ships in 2–3 business days. Free over $50.</Collapsible.Content>
</Collapsible>
```
<!-- /example -->

**Anatomy.** `Collapsible` is a `<div>` that owns the open state and publishes it through
context. `Collapsible.Trigger` is the `<button>`: it reads that context for `aria-expanded`,
`aria-controls` and its `disabled` state, and toggles on click. `Collapsible.Content` is the
panel, carrying the generated `id` the trigger points at; it wraps your children in a second
`<div class="collapsible-content-inner">`, and that nesting is what makes the animation work —
see [The height animation](#the-height-animation). Both sub-parts read the root's context and
throw `"Collapsible compound components must be used within <Collapsible>"` without it.

| Part                  | Renders                     | Props                                   |
| --------------------- | --------------------------- | --------------------------------------- |
| `Collapsible`         | `<div>`                     | the four below, plus all `div` props    |
| `Collapsible.Trigger` | `<button type="button">`    | all `button` props                      |
| `Collapsible.Content` | `<div role="region">`       | all `div` props                         |

| Prop           | Type                       | Default |
| -------------- | -------------------------- | ------- |
| `open`         | `boolean`                  | —       |
| `defaultOpen`  | `boolean`                  | `false` |
| `onOpenChange` | `(open: boolean) => void`  | —       |
| `disabled`     | `boolean`                  | `false` |

`className`, `id`, `ref` and `aria-*` pass through on all three — but read
[Gotchas](#gotchas) before you pass `id` to `Collapsible.Content` or `Collapsible.Trigger`.

## When *not* to reach for it

**Prefer `<details>` / `<summary>` for static content.** The platform has a disclosure
widget, and it is better than this one in three concrete ways: it needs no JavaScript, so
it works before hydration and in an RSC tree with no client boundary; it is keyboard- and
screen-reader-correct without you checking; and when closed it genuinely does not render
its content, so nothing inside costs anything. `Collapsible` misses the first outright —
it is `"use client"` — matches the second only once hydrated, and matches the third only
halfway: its closed panel is `inert` rather than gone, so nothing inside is focusable or
announced, but all of it is still mounted and
still paying for itself. Reach for `Collapsible` when you need something `<details>`
can't give you: the open state as a React value driving other UI, a controlled panel you
open from elsewhere in the app, or the sliding height transition below.

**Prefer [Accordion](accordion.md) for a set.** `Collapsible` is exactly one disclosure with no
coordination — two of them side by side know nothing about each other, so both can be open
at once and neither closes the other. [Accordion](accordion.md) manages a group: it has a `mode` of
`"single"` or `"multiple"`, one shared value for which items are open, and arrow-key
navigation between the item triggers. If you find yourself lifting state to keep a stack of
`Collapsible`s mutually exclusive, you have re-implemented [Accordion](accordion.md) badly. Use
`Collapsible` for a standalone "show more" — one filter panel, one advanced-settings block,
one row's detail. For tabbed content that swaps rather than stacks, see [Tabs](tabs.md); for
content that floats over the page instead of pushing it down, [Popover](popover.md).

## Controlled and uncontrolled

Uncontrolled is the default — `defaultOpen` picks the initial state and the root tracks the
rest:

<!-- example:OpenByDefault -->
```tsx
<Collapsible defaultOpen>
  <Collapsible.Trigger>Advanced options</Collapsible.Trigger>
  <Collapsible.Content>Retry failed jobs automatically after 30 seconds.</Collapsible.Content>
</Collapsible>
```
<!-- /example -->

Pass `open` to control it. In controlled mode the trigger no longer changes anything by
itself: it calls `onOpenChange` with the state it *wants*, and nothing moves until you pass
a new `open` back down.

<!-- example:Controlled -->
```tsx
<Collapsible open={open} onOpenChange={setOpen}>
  <Collapsible.Trigger>{open ? "Hide" : "Show"} release notes</Collapsible.Trigger>
  <Collapsible.Content>
    <p>Fixed a focus trap in the date picker.</p>
  </Collapsible.Content>
</Collapsible>
```
<!-- /example -->

`onOpenChange` fires in **both** modes, so use it for analytics or lazy-loading without
giving up the uncontrolled convenience.

## Disabled

<!-- example:Disabled -->
```tsx
<Collapsible disabled>
  <Collapsible.Trigger>Billing history</Collapsible.Trigger>
  <Collapsible.Content>Available once your first invoice is issued.</Collapsible.Content>
</Collapsible>
```
<!-- /example -->

`disabled` sets the native `disabled` attribute on the trigger *and* short-circuits the
toggle, so neither a click nor a programmatic `.click()` on the button can open the panel.
It also puts `data-disabled` on the root for you to style against. It does **not** freeze
the panel: a `Collapsible` that is `defaultOpen` and `disabled` stays open, and a controlled
one still follows whatever `open` you pass.

## Styling

`Collapsible.css` styles the root (`width: 100%`) and the content wrapper, and nothing else.
There is no rule anywhere for `.collapsible-trigger` — the class is emitted purely as a hook
for you. Out of the box the trigger is therefore a bare browser `<button>` — UA font, UA
padding — with one exception: it carries the library's focus ring as a utility, so keyboard
focus is themed before you style anything (see [Accessibility](#accessibility)). That is
deliberate for a headless-ish primitive, but it means an unstyled `Collapsible` still looks
nothing like the rest of the library.

<!-- example:StyledTrigger -->
```tsx
<Collapsible className="rounded-md border border-border-default">
  <Collapsible.Trigger className="flex w-full items-center justify-between p-r5 text-body-2 text-fg-primary">
    Payment method
    <span aria-hidden="true">▾</span>
  </Collapsible.Trigger>
  <Collapsible.Content>
    <p className="p-r5 text-body-2 text-fg-secondary">Visa ending 4242 · expires 09/28</p>
  </Collapsible.Content>
</Collapsible>
```
<!-- /example -->

All three parts also expose `data-state="open" | "closed"`, so CSS can react to the state
without a class toggle — `.collapsible-trigger[data-state="open"] .chevron { rotate: 180deg }`
is the usual chevron.

## The height animation

The panel is a one-row CSS grid whose track goes from `0fr` to `1fr`, with `overflow: hidden`
on the inner wrapper; that `overflow` is what lets the grid item shrink below its content
size. There is **no `max-height` magic number and no JS measurement**, so a panel opens to
exactly its own height whatever that turns out to be — one line or a thousand — and content
taller than some guessed ceiling is never clipped, which is the failure mode of the
`max-height` approach.

Two consequences worth knowing. Interpolating `grid-template-rows` between `0fr` and `1fr`
is a relatively recent browser capability; where it is unsupported the panel snaps open and
closed instead of sliding, which degrades correctly. And because the transition is on the
grid track, the content inside does not fade or move independently — if you want a
staggered reveal you compose it inside `Collapsible.Content` yourself.

`Collapsible.css` ships a `prefers-reduced-motion: reduce` block that drops the transition to
`none`, so the panel opens instantly for users who ask for that.

## A closed panel is inert, not gone

Closing clips the panel to zero height **and** marks it `inert`. The `inert` half is what covers
reachability: while closed the panel takes no clicks, leaves the tab order, and drops out of the
accessibility tree, so focus cannot land on a control the user can't see. The attribute sits on
`Collapsible.Content` and not on the root, which would take the trigger with it and leave a
closed `Collapsible` with no way to open it from the keyboard. `hidden` and `display: none` are
not options here — either would kill the `grid-template-rows` transition.

What `inert` does *not* cover is everything else about being mounted. The children still render
on every pass, so effects keep running, images keep loading, and an `inert` form control is
still submitted with its form. If what you're avoiding is the cost of a closed panel rather than
its reachability, mount its contents on the open state yourself, which means controlling the
component:

<!-- example:GatedContent -->
```tsx
<Collapsible open={open} onOpenChange={setOpen}>
  <Collapsible.Trigger>Invoices</Collapsible.Trigger>
  <Collapsible.Content>
    {open && <a href="/invoices/2026">Download 2026 invoices</a>}
  </Collapsible.Content>
</Collapsible>
```
<!-- /example -->

The trade-off is that the child unmounts the instant you close, so the closing transition
collapses an already-empty box. For a panel of plain text there is nothing to fix — leave it
mounted and the reveal animates both ways.

## Theme tokens

`Collapsible` reads **no colour, type, spacing or radius token for anything it paints at
rest** — at rest it paints nothing. Three contract variables reach it: two that time the
reveal, and one for the trigger's focus ring.

| Where                       | Utility                           | Override                                          |
| --------------------------- | --------------------------------- | ------------------------------------------------- |
| Panel open/close transition | —                                 | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT` |
| Trigger focus ring          | `focus-visible:ring-border-focus` | `--C-BORDER-FOCUS`                                |

That is the whole table, and it is nearly the point: the component re-themes by *not* having
an opinion about anything except the one affordance a keyboard user cannot do without.
Everything visible — the trigger's ink, its padding, any border or surface around the panel —
comes from the `className`s you pass, so it picks up your theme the same way the rest of your
markup does. Under `prefers-reduced-motion` the transition itself is dropped — the two motion
variables still resolve, they just stop being animated.

## Gotchas

- **A closed panel is still mounted** — `inert` and clipped, not unmounted. See
  [A closed panel is inert, not gone](#a-closed-panel-is-inert-not-gone).
- **Don't pass `id` to `Collapsible.Content` — or to `Collapsible.Trigger`.** `{...props}`
  spreads last, so your `id` replaces the generated one while the trigger's `aria-controls`
  keeps pointing at the original — the association silently breaks. An `id` on the trigger
  breaks the other direction: the content's `aria-labelledby` keeps naming the old trigger
  `id`, un-naming the region. The same spread order applies everywhere: on
  the trigger a hand-written `aria-expanded` or `disabled` overrides the computed one, and on
  the content so do `role` and `inert` — passing `inert={false}` puts a closed panel's
  contents back in the tab order.
- **The trigger cannot be re-rendered as another component.** There is no `as` or `asChild`
  prop, and `Collapsible.Trigger` always renders its own `<button>`. Nesting a
  [Button](button.md) inside it would produce a `<button>` inside a `<button>` — invalid HTML.
  Put the classes on `Collapsible.Trigger` instead.
- **`defaultOpen` is read once, and the mode is locked on the first render.** Changing
  `defaultOpen` later does nothing, and a `Collapsible` that mounts without `open` stays
  uncontrolled for its whole life even if `open` appears later. Keep `open` present from the
  first render or don't use it.
- **Your `onClick` on the trigger can cancel the toggle.** The trigger calls your handler
  first and only toggles `if (!e.defaultPrevented)`, so `e.preventDefault()` is a supported
  way to veto a toggle in either direction — useful for "you have unsaved changes",
  surprising if you didn't expect it.
- **Client component.** The module carries `"use client"`, so all three parts are client
  components and none of them drops into an RSC tree without a boundary.
- **The root is `width: 100%`.** It always fills its container. Constrain it from the parent
  rather than expecting it to shrink-wrap the trigger.

## Accessibility

The trigger is a real `<button>` with an explicit `type="button"` — as every button this
library renders now is, so it will not submit an enclosing form — carrying `aria-expanded`
and an `aria-controls` that points at the panel's `useId`-generated `id`. Space and Enter
work because it is a button, not because of a key handler. `disabled` uses the native
attribute, so the trigger leaves the tab order entirely when disabled.

**The trigger draws the library's focus ring.** `Collapsible.css` still defines no
`:focus-visible` rule — there is no `.collapsible-trigger` rule for one to sit in — so the
ring arrives as a Tailwind utility on the `<button>` instead: the same 2px `--C-BORDER-FOCUS`
ring [Button](button.md) and [IconButton](icon-button.md) draw, re-tinting with your theme
and costing you nothing to opt into. Your own `focus-visible:ring-*` class on
`Collapsible.Trigger` still overrides it — `className` merges last.

**`aria-expanded` and the accessibility tree agree.** The trigger reports
`aria-expanded="false"` and the panel it names is `inert` while closed, so it leaves the
accessibility tree and the tab order together: a screen-reader user is told the section is
collapsed and cannot then read straight into it, and a keyboard user cannot Tab into a control
they can't see. The panel is still *mounted* while closed, which costs something else entirely —
see [A closed panel is inert, not gone](#a-closed-panel-is-inert-not-gone).

**The region is named by its trigger.** `Collapsible.Content` sets `role="region"` with an
`aria-labelledby` pointing at the trigger's generated `id` — the same pair
[Accordion](accordion.md) wires — so the panel announces as a landmark under the trigger's
own text. That makes the trigger's children the region's name: keep them textual, and note
that replacing either generated `id` breaks the pairing — see [Gotchas](#gotchas).

## Related

[Accordion](accordion.md) · [Stepper](stepper.md) · [Tabs](tabs.md) · [Popover](popover.md) · [Drawer](drawer.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
