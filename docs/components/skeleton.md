# Skeleton

The placeholder that holds a piece of content's shape while it loads — a pulsing block you
size to the thing that's coming, so the layout doesn't jump when the data lands. Four
shapes, colour and corners straight off the theme contract, and a pulse that stops under
`prefers-reduced-motion`.

<!-- example:Minimal -->
```tsx
<Skeleton />
```
<!-- /example -->

| Prop        | Type                                                     | Default  |
| ----------- | -------------------------------------------------------- | -------- |
| `variant`   | `"text" \| "circular" \| "rectangular" \| "rounded"`      | `"text"` |
| `width`     | `string \| number`                                       | `"100%"` |
| `height`    | `string \| number`                                       | —        |
| `className` | `string`                                                 | —        |
| `style`     | `CSSProperties`                                          | —        |
| `ref`       | `Ref<HTMLSpanElement>`                                   | —        |
| …rest       | props of `span`, less `children`                         | —        |

`variant` picks the corner treatment — and, on `text` only, a `1em` height. Size otherwise
comes from `width` and `height`, which are written straight into the element's inline
`style`: a bare number becomes `px`, a string is used verbatim. That inline style is why
`width` cannot be set from a class and `height` usually can. See [Gotchas](#gotchas) —
`variant`, `width` and `height` each have a sharp edge.

## Skeleton or Spinner?

Both say "wait". They are not interchangeable.

| Reach for                | When                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Skeleton**             | You already know the shape of what's arriving — a list of rows, a profile card, a chart panel. It reserves that space, so nothing below it shifts on arrival. |
| [Spinner](spinner.md)    | You don't know the shape, or there is nothing to reserve: a button mid-submit, a full-page auth check, an action whose result replaces the view entirely. |

The tiebreaker is **layout stability**, not aesthetics. A skeleton that isn't the size of
the content it replaces buys you nothing a spinner wouldn't — you still get the reflow, you
just get it prettier. If you can't predict the size, use a spinner.

Two practical differences follow from that. Skeleton is plural by nature (a screen is
many of them), which is exactly what makes its baked-in `role="status"` a problem — see
[Accessibility](#accessibility). And Skeleton drops its animation under
`prefers-reduced-motion`; Spinner does not.

## Shapes and sizing

<!-- example:Variants -->
```tsx
<Skeleton variant="text" />
<Skeleton variant="rectangular" height="8rem" />
<Skeleton variant="rounded" height="8rem" />
<Skeleton variant="circular" width={40} height={40} />
```
<!-- /example -->

Only `text` carries a height of its own — `1em`, so it tracks the font size of whatever it
sits in. `circular`, `rectangular` and `rounded` leave height to you, and with none set they
compute to **0px** and render nothing visible. The element's one child is a visually hidden,
absolutely positioned label, so there is no in-flow content to give the box a height.

`circular` is `border-radius: 50%`, which is a circle only when the box is square. With the
default `width: "100%"` still in place, `<Skeleton variant="circular" height={40} />` is a
full-width ellipse — pass a matching `width`.

## Composing a skeleton screen

Several `text` skeletons with a ragged last line read as a paragraph:

<!-- example:TextBlock -->
```tsx
<div className="flex flex-col gap-r6">
  <Skeleton />
  <Skeleton />
  <Skeleton width="65%" />
</div>
```
<!-- /example -->

The flex wrapper is doing real work. Skeleton renders an `inline-block` `<span>`, so stacked in
normal flow each one takes a line box of its own — and the line box, not the box you sized, sets
the spacing. Tailwind's preflight puts `line-height: 1.5` on `html`, so a line holding a 16px
skeleton is 24px and three of them come out **72px** tall, not 48px. The surplus is the strut's
leading, which falls above *and* below each box rather than as descender space beneath it; force
`line-height: normal` and the same markup measures 60px. What moves the number is the inherited
line-height. A flex column takes the boxes out of inline layout entirely — the block above is
56px, which is 48px of skeleton plus two 4px `gap-r6` rows.

Beyond that, the job is arithmetic: mirror the real layout closely enough that the swap is
invisible.

<!-- example:CommentPlaceholder -->
```tsx
<Card>
  <div className="flex items-start gap-r5">
    <Skeleton variant="circular" width={40} height={40} />
    <div className="flex flex-1 flex-col gap-r6">
      <Skeleton width="35%" />
      <Skeleton />
      <Skeleton width="70%" />
    </div>
  </div>
</Card>
```
<!-- /example -->

## Announcing the wait

A skeleton screen is a dozen elements, and every one of them ships its own
`role="status"` live region labelled "Loading". Hide them and own the announcement yourself:

<!-- example:AnnounceOnce -->
```tsx
<div role="status" className="flex flex-col gap-r6">
  <span className="sr-only">Loading recent comments</span>
  <Skeleton aria-hidden width="35%" />
  <Skeleton aria-hidden />
  <Skeleton aria-hidden width="70%" />
</div>
```
<!-- /example -->

`aria-hidden` removes the element and its hidden label from the accessibility tree outright,
so the screen reader meets one region instead of twelve. This is the same shape as
[Spinner's labelled region](spinner.md#labelling-the-wait), and it carries the same caveat:
mounting a live region that already contains its text is not reliably announced. For a wait
the user must be told about, render the region up front and change what is inside it.

## Sizing with a class

`className` is appended through `cn`. None of the base classes are Tailwind utilities, so
`tailwind-merge` has nothing to collapse and a height utility simply lands — on the three
variants that have no height rule of their own:

<!-- example:SizedFromClassName -->
```tsx
<Skeleton variant="rounded" width="18rem" className="h-48" />
```
<!-- /example -->

Width is different, and the asymmetry is the thing to remember: `width` always reaches the
DOM as an inline style, and inline styles beat every class. `w-64` on a Skeleton is dead
code. See [Gotchas](#gotchas).

## Theme tokens

Every visible rule lives in `Skeleton.css` and reads contract variables directly, the way
[Tabs](tabs.md) and [ActivityFeed](activity-feed.md) do. The component's only Tailwind class
is `sr-only`, on the hidden label, which resolves to no token. Override these and every
placeholder in the app re-tints, at runtime, with no rebuild.

| Where                            | Override        |
| -------------------------------- | --------------- |
| Placeholder fill                 | `--C-SURFACE-2` |
| Corners, rectangular (base rule) | `--RADIUS-MD`   |
| Corners, text variant            | `--RADIUS-SM`   |
| Corners, rounded variant         | `--RADIUS-LG`   |

That is the whole contract surface, and three things are deliberately *outside* it:

- **The circular corner is a literal `50%`,** not a radius token. A theme that squares
  everything off (`grimdark` sets `--RADIUS-SM` and `--RADIUS-MD` to `0`) still gets round
  circular skeletons — correct here, but worth knowing it can't be turned off.
- **The pulse is hard-coded `1.5s ease-in-out infinite`,** and the reduced-motion resting
  state is a hard-coded `opacity: 0.7`. Neither reads `--MOTION-DURATION-*` or
  `--MOTION-EASE-*`, so re-timing a theme's motion leaves the pulse at exactly 1.5s.
- **The fill is a surface token, and nothing pairs with it.** Skeleton draws
  `--C-SURFACE-2` as a solid block with no border and no text colour, on whatever background
  it is dropped onto. Inside a `--C-SURFACE-2` container it is the same colour as its
  backdrop and disappears; mid-pulse, at `opacity: 0.4`, it fades toward the backdrop
  everywhere. Put skeletons on `--C-SURFACE-0`/`--C-SURFACE-1` — a
  [Card](card.md) is `--C-SURFACE-0` and works — or override the fill.

## Gotchas

- **Three of the four variants render nothing without a `height`.** `circular`,
  `rectangular` and `rounded` have no height rule, and the only child is an absolutely
  positioned `sr-only` span, so the box collapses to 0px. `<Skeleton variant="circular" />`
  is silently invisible. `text` is the exception (`1em`).
- **`width` can't come from a class.** It defaults to `"100%"` and is always emitted as an
  inline style, which outranks any utility — `w-64` and `w-full` never apply. Set the `width`
  prop, or `style`. `width={undefined}` just re-applies the `"100%"` default — to drop the
  inline width you have to go through `style`, which spreads last: `style={{ width: undefined }}`
  overwrites it with nothing and React omits the property, so a Skeleton with no `height` renders
  with no `style` attribute at all. (`max-w-*` is the exception that proves the rule: it sets a
  different property, so it clamps the inline `100%` and does work.)
- **`height` from a class works — except on `variant="text"`.** `height` reaches the inline
  style only when you pass it, so `className="h-48"` applies to the other three. On `text`,
  `.skeleton--text { height: 1em }` is unlayered component CSS and outranks Tailwind's
  `@layer utilities`, so the class loses and the box stays one line tall.
- **`style` beats both size props.** The caller's `style` spreads *after* `{ width, height }`,
  so `style={{ height: "2rem" }}` wins. Deliberate, and the escape hatch for `variant="text"`.
- **Every instance is a live region.** `role="status"` and `aria-label="Loading"` are on the
  element itself, not on a wrapper — N skeletons means N polite live regions all named
  "Loading". See [Accessibility](#accessibility).
- **The "Loading" text is hard-coded English and unreachable.** `children` is omitted from
  the prop type, so nothing you pass replaces the hidden label. `aria-label` from `…rest`
  replaces the *attribute* but leaves the text node in place; only `aria-hidden` takes the
  whole element — attribute and text node — out of the accessibility tree.
- **It is an `inline-block` `<span>`.** Stacked in normal flow each one takes a line box, so
  the inherited `line-height` sets the pitch, not the height you gave it — under Tailwind's
  `line-height: 1.5` three `text` skeletons are 72px, not 48px. Wrap them in a flex or grid
  container.
- **The package CSS import is required.** Unlike a utility-styled component, Skeleton has
  literally no appearance without `Skeleton.css` — it is pulled in by this package's
  `styles.css`, which consumers import alongside `@batthewz/response-ui-css`.
- **Server-renderable.** No `"use client"`, so it drops straight into an RSC tree.

## Accessibility

Skeleton is not treated as decoration by default. Each one renders
`<span role="status" aria-label="Loading">` wrapping a visually hidden `"Loading"` text
node — a named, polite live region per placeholder. That is a deliberate choice (a silent
placeholder tells a screen-reader user nothing at all), but it does not scale, and scaling
is the normal case for this component:

- **N placeholders, N regions.** A card with an avatar and three lines is four live regions,
  each named "Loading". Nothing tells the user *what* is loading, and nothing tells them when
  it finished — the regions simply vanish when the content arrives.
- **The name and the content say the same thing.** The element carries both
  `aria-label="Loading"` and a `"Loading"` text node — the identical string as the region's
  accessible name and as its contents, so an AT that surfaces both repeats it.
- **Your props win.** `…rest` spreads *after* `role` and `aria-label`, so both are
  replaceable; `className` and `style` are merged rather than replaced. `aria-hidden` is the
  only one that removes the hidden text along with everything else.

So the caller is left responsible for the announcement. The pattern that works is the one in
[Announcing the wait](#announcing-the-wait): `aria-hidden` on every Skeleton, one region of
your own describing what is loading. Do that and the "wall of empty boxes" problem goes away
— the boxes become what they look like, decoration.

**Motion.** `Skeleton.css` ships a `@media (prefers-reduced-motion: reduce)` block that sets
`animation: none` and pins `opacity: 0.7`, so a reader who has asked their OS for reduced
motion gets a static, still-visible placeholder rather than a 1.5s opacity cycle. This is the
library's normal behaviour — 23 component stylesheets carry the same guard — and it is the
concrete way Skeleton differs from [Spinner](spinner.md), whose `animate-spin` utility is
unguarded because it is a Tailwind utility with no stylesheet to put the guard in. If you are
choosing a loading affordance for a long wait and vestibular safety matters, that difference
is real.

**Contrast.** Once hidden, a skeleton is a decorative graphic, so WCAG 1.4.11's 3:1 rule for
meaningful non-text content doesn't apply. It still has to be *visible* to do its job, and
`--C-SURFACE-2` on a surface background is a deliberately low-contrast pairing — check it in
every theme you ship, especially at the `0.4` trough of the pulse.

## Related

[Spinner](spinner.md) · [ProgressRing](progress-ring.md) · [Meter](meter.md) ·
[Card](card.md) · `DataTable` · `Table` · `EmptyState` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
