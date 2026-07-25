# Row

Horizontal flexbox as one element. It lays its children out in a row with a themed
gap, vertical centering, and no wrapping — set any of those with a prop instead of
hand-writing a `className` full of flex utilities.

<!-- example:Minimal -->
```tsx
<Row>
  <Button variant="primary">Publish</Button>
  <Button variant="secondary">Save draft</Button>
</Row>
```
<!-- /example -->

| Prop        | Type                                                             | Default    |
| ----------- | ---------------------------------------------------------------- | ---------- |
| `gap`       | `"r1" \| "r2" \| "r3" \| "r4" \| "r5" \| "r6"`                    | `"r5"`     |
| `align`     | `"start" \| "center" \| "end" \| "stretch" \| "baseline"`        | `"center"` |
| `justify`   | `"start" \| "center" \| "end" \| "between" \| "around" \| "evenly"` | `"start"`  |
| `wrap`      | `boolean`                                                        | `false`    |
| `as`        | `ElementType`                                                    | `"div"`    |
| `className` | `string`                                                        | —          |
| `ref`       | `Ref` of the element `as` renders                               | —          |
| …rest       | props of `as`                                                   | —          |

`align`, `justify`, `gap`, `wrap`, and `as` are consumed by Row and cannot pass
through to the underlying element. Everything else does — `className`, `id`, `aria-*`,
`onClick`, and the rest. See [Gotchas](#gotchas).

## Align and justify

`align` is the cross axis (vertical, here), `justify` the main axis (horizontal). Row
defaults `align` to `center` — **not** the CSS `stretch` default — so mismatched-height
children line up on their centers unless you say otherwise.

<!-- example:Alignment -->
```tsx
<Row align="start">
  <img
    src="/avatars/jordan.png"
    alt="Jordan Lee"
    className="size-10 rounded-full"
  />
  <div>
    <p className="font-semibold">Jordan Lee</p>
    <p className="text-fg-secondary">Product designer · joined 2021</p>
  </div>
</Row>
```
<!-- /example -->

`justify` distributes children along the row. `between` is the workhorse — it pins the
outer children to the edges and is how you build a title-and-action bar without a
[Spacer](spacer.md).

<!-- example:Distribute -->
```tsx
<Row justify="between">
  <h2 className="text-h4">Team members</h2>
  <Button size="sm">Invite</Button>
</Row>
```
<!-- /example -->

## Gap

<!-- example:GapScale -->
```tsx
<Row gap="r6">
  <span>Draft</span>
  <span>In review</span>
  <span>Published</span>
</Row>
<Row gap="r1">
  <span>Draft</span>
  <span>In review</span>
  <span>Published</span>
</Row>
```
<!-- /example -->

`gap` is the only spacing knob and it takes an `r1`–`r6` step, not a pixel value. The
scale is **inverted and responsive**: `r1` is the widest step and `r6` the tightest, and
most steps grow on desktop — `r1`–`r5` step up at the 40rem breakpoint while `r6` stays
fixed at `0.25rem` — with no breakpoint utilities from you.

## Wrapping

By default a Row never wraps — children stay on one line and overflow a container too
narrow to hold them. Opt into wrapping when the child count is open-ended:

<!-- example:Wrapping -->
```tsx
<Row wrap gap="r4">
  <span>Design</span>
  <span>Engineering</span>
  <span>Marketing</span>
  <span>Sales</span>
  <span>Support</span>
  <span>Operations</span>
</Row>
```
<!-- /example -->

## Render as something else

<!-- example:AsNav -->
```tsx
<Row as="nav" gap="r3" aria-label="Primary">
  <a href="/dashboard">Dashboard</a>
  <a href="/projects">Projects</a>
  <a href="/settings">Settings</a>
</Row>
```
<!-- /example -->

`as` swaps the element and re-types `…rest`, so on `as="nav"` you get `<nav>`'s props
and on `as="ul"` you'd nest `<li>` children. The layout is unchanged; only the tag and
its semantics move.

## Theme tokens

Row reaches **no** colour, radius, shadow, or motion token — flex direction, alignment,
justification, and wrap are structural utilities with nothing to tint. Its one themeable
knob is the gap, which draws from the shared responsive spacing scale. Override an
`--R-SIZE-*` step and every `gap-r*` across the app — Row included — re-spaces at
runtime, at both breakpoints.

| Where               | Utility                                                    | Override                                                              |
| ------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| Gap between children | `gap-r1` `gap-r2` `gap-r3` `gap-r4` `gap-r5` `gap-r6`      | `--R-SIZE-1` `--R-SIZE-2` `--R-SIZE-3` `--R-SIZE-4` `--R-SIZE-5` `--R-SIZE-6` |

`--R-SIZE-*` lives in `@batthewz/response-ui-css`, is shared with every spacing utility
in the system, and carries a `@media (width >= 40rem)` step-up for most of its steps
(`r1`–`r5`; `r6` holds at `0.25rem`) — so re-tuning it moves Row's gap in lock-step with
all other `r`-scale spacing rather than in isolation.

## Gotchas

- **The `r`-scale is inverted.** `r1` is the *largest* gap and `r6` the *smallest* —
  the opposite of most numeric scales. The `r5` default is deliberately tight; reach for
  a lower number when you want more air.
- **`align` defaults to `center`, not `stretch`.** A bare flex container stretches
  children to equal height; Row centers them at their natural height. Pass
  `align="stretch"` if you were relying on the CSS default (e.g. to make sibling cards
  match heights).
- **Five prop names are reserved.** `gap`, `align`, `justify`, `wrap`, and `as` are
  omitted from the passthrough props, so on an element that has a native attribute of the
  same name — `align` is a (deprecated) HTML attribute, `wrap` is a real `<textarea>`
  attribute — Row's meaning wins and the native one is unreachable through this component.
- **No `flex-row-reverse`.** Row only ever renders `flex-row`; there is no prop to
  reverse it. Reorder in the DOM, or drop to a `className` if you truly need reversal.
- **Server-renderable.** No `"use client"`, so Row works directly in an RSC tree.

## Accessibility

A default Row is a `<div>` and adds no semantics — correct for pure layout. When the row
*is* something (navigation, a list, a toolbar), give it meaning with `as` (`as="nav"`,
`as="ul"`) rather than leaving a bare `<div>`.

Because Row never reverses its children, DOM order always matches visual order, so
reading order and tab order stay in sync — reorder the JSX, not the CSS, when the
sequence matters.

## Related

[Stack](stack.md) · [Center](center.md) · [Container](container.md) · [Spacer](spacer.md) · [Grid](grid.md) ·
[Divider](divider.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
