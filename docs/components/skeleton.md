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
| `className` | `string`                                                 | —        |
| `children`  | `ReactNode` — visually hidden label; makes this one a `role="status"` | — |
| `ref`       | `Ref<HTMLSpanElement>`                                   | —        |
| …rest       | props of `span` (including `style`)                      | —        |

`variant` picks the corner treatment. **Size is `className`, both axes** — `w-64`, `h-48`,
`size-4`, `max-w-*`, all of it. There are no `width`/`height` props: a full-width default
(`w-full`) rides in the class list where `cn` collapses it against whatever `w-*` you pass,
and the default height stays in CSS (`.skeleton { height: 1em }`, in `@layer components`)
where a `h-*` utility out-ranks it. An inline `style` still beats both, which is the hatch
for a dimension you only know at runtime. See [Gotchas](#gotchas) — `variant` and the
one-line default height each have a sharp edge.

## Skeleton or Spinner?

Both say "wait". They are not interchangeable.

| Reach for                | When                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **Skeleton**             | You already know the shape of what's arriving — a list of rows, a profile card, a chart panel. It reserves that space, so nothing below it shifts on arrival. |
| [Spinner](spinner.md)    | You don't know the shape, or there is nothing to reserve: a button mid-submit, a full-page auth check, an action whose result replaces the view entirely. |

The tiebreaker is **layout stability**, not aesthetics. A skeleton that isn't the size of
the content it replaces buys you nothing a spinner wouldn't — you still get the reflow, you
just get it prettier. If you can't predict the size, use a spinner.

One practical consequence follows from that. Skeleton is plural by nature (a screen is
many of them), which is why it announces nothing until you give one of them `children` —
see [Accessibility](#accessibility). Spinner shares that default, and both drop their
motion under `prefers-reduced-motion`, so neither of those is a tiebreaker.

## Shapes and sizing

<!-- example:Variants -->
```tsx
<Skeleton variant="text" />
<Skeleton variant="rectangular" className="h-32" />
<Skeleton variant="rounded" className="h-32" />
<Skeleton variant="circular" className="w-10" />
```
<!-- /example -->

Every variant has a default height. The base rule sets `1em`, so a bare skeleton tracks
the font size of whatever it sits in — right for a line of text, and the reason
`rectangular` and `rounded` usually want an `h-*`, since a block placeholder one line tall
is rarely the shape you meant.

`circular` is `border-radius: 50%` with `aspect-ratio: 1` and `height: auto`, so its
height derives from its width and a circle stays circular — give it a width and nothing
else. That still holds now the width is a utility rather than an inline value: measured
in Chromium against the real built CSS, `.skeleton.skeleton--circular.w-10` is **40×40**,
the same square the old `width={40} height={40}` produced. Give it an `h-*` as well and
the ratio stops governing: `h-10` alone, with the `w-full` default still in the class
list, is a full-width ellipse. One dimension, not two.

## Composing a skeleton screen

Several `text` skeletons with a ragged last line read as a paragraph:

<!-- example:TextBlock -->
```tsx
<div className="flex flex-col gap-r6">
  <Skeleton />
  <Skeleton />
  <Skeleton className="w-[65%]" />
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
    <Skeleton variant="circular" className="w-10" />
    <div className="flex flex-1 flex-col gap-r6">
      <Skeleton className="w-[35%]" />
      <Skeleton />
      <Skeleton className="w-[70%]" />
    </div>
  </div>
</Card>
```
<!-- /example -->

## Announcing the wait

A skeleton screen is a dozen elements and one wait, so a skeleton is decoration by default:
`aria-hidden`, no role, nothing to announce. There are two ways to say what is loading, and
both end with exactly one region.

Give **one** skeleton in the group some `children` and it becomes the region, named in your
own language:

```tsx
<div className="flex flex-col gap-r6">
  <Skeleton className="w-[35%]">Chargement des commentaires…</Skeleton>
  <Skeleton />
  <Skeleton className="w-[70%]" />
</div>
```

Or own the region yourself and leave every skeleton decorative:

<!-- example:AnnounceOnce -->
```tsx
<div role="status" className="flex flex-col gap-r6">
  <span className="sr-only">Loading recent comments</span>
  <Skeleton aria-hidden className="w-[35%]" />
  <Skeleton aria-hidden />
  <Skeleton aria-hidden className="w-[70%]" />
</div>
```
<!-- /example -->

The explicit `aria-hidden` is redundant with the default and harmless — it is what the
example shipped before skeletons went silent. This is the same shape as
[Spinner's labelled region](spinner.md#labelling-the-wait), and it carries the same caveat:
mounting a live region that already contains its text is not reliably announced. For a wait
the user must be told about, render the region up front and change what is inside it.

## Sizing with a class

Both dimensions come from `className`, and they get there by two different routes — worth
knowing, because the routes are what make each one overridable:

<!-- example:SizedFromClassName -->
```tsx
<Skeleton variant="rounded" className="h-48 w-72" />
```
<!-- /example -->

**Width is a class the component ships and `cn` collapses.** `w-full` sits in the root
class list, so `tailwind-merge` sees your `w-72` conflict with it and drops the default
outright — one `width` declaration reaches the element, never two racing on source order.
That is why `size-4` works too: it conflicts with both `w-*` and `h-*`, so it replaces the
default and sets the other axis in the same class.

**Height is a declaration the component leaves to CSS.** Nothing emits a height, so
`.skeleton { height: 1em }` applies — and it is in `@layer components`, below Tailwind's
`@layer utilities`, so `h-48` beats it at any specificity.

Both are measured, not assumed. Against the real built CSS in Chromium, in a 400px column:
a bare skeleton is 400×16, `w-20` gives **80×16**, `h-48` gives **400×192**, `size-4` gives
**16×16**. Remove the `@layer components` and `h-48` measures 16px again; the `w-*` half is
newer — before the `width` prop was dropped, `w-20` alongside the inline `width: 100%`
default measured **400px**, which is the silent loss this API change exists to end.

`style` still outranks both — `style={{ width: 200 }}` measures 200px with `w-20` on the
same element. Reach for it when the number is genuinely dynamic; reach for a class the rest
of the time. See [Gotchas](#gotchas).

## Theme tokens

Every visible rule lives in `Skeleton.css` and reads contract variables directly, the way
[Tabs](tabs.md) and [ActivityFeed](activity-feed.md) do. The component emits two Tailwind
classes and neither resolves to a token: `w-full` on the root, and `sr-only` on the hidden
label it renders when you pass `children`. Override these and every placeholder in the app
re-tints, at runtime, with no rebuild.

| Where                            | Override        |
| -------------------------------- | --------------- |
| Placeholder fill                 | `--C-SURFACE-2` |
| Corners, rectangular (base rule) | `--RADIUS-MD`   |
| Corners, text variant            | `--RADIUS-SM`   |
| Corners, rounded variant         | `--RADIUS-LG`   |

That is the whole contract surface, and three things are deliberately *outside* it:

- **The circular corner is a literal `50%`,** not a radius token. A theme that squares
  everything off (the `grimdark` example sets `--RADIUS-SM` and `--RADIUS-MD` to `0`) still
  gets round circular skeletons — correct here, but worth knowing it can't be turned off.
- **The pulse tracks the theme's tempo; its resting opacity does not.** The duration is
  `calc(var(--MOTION-DURATION-SHIFT, 400ms) * 4)` — 1.6s on the token layer's default, and
  1.0s–2.4s across the worked examples — but the easing is a literal `ease-in-out` and the
  reduced-motion resting state is a literal `opacity: 0.7`. No opacity token exists in the
  contract to carry that last one.
- **The fill is a surface token, and nothing pairs with it.** Skeleton draws
  `--C-SURFACE-2` as a solid block with no border and no text colour, on whatever background
  it is dropped onto. Inside a `--C-SURFACE-2` container it is the same colour as its
  backdrop and disappears; mid-pulse, at `opacity: 0.4`, it fades toward the backdrop
  everywhere. Put skeletons on `--C-SURFACE-0`/`--C-SURFACE-1` — a
  [Card](card.md) is `--C-SURFACE-0` and works — or override the fill. Even there the step
  is small: **1.08–1.21:1** on rung 0 and **1.04–1.11:1** on rung 1.

## Gotchas

- **A one-line default height on block shapes.** Every variant falls back to the base
  rule's `1em` (`circular` to its aspect ratio), so nothing renders at 0px — but a
  `rectangular` or `rounded` placeholder without an `h-*` is a text-line-sized sliver,
  almost never the block you meant. Give a height class to anything that isn't a line of
  text.
- **`w-auto` is 0px wide, and that is the honest answer to "shrink to fit".** A Skeleton has
  no visible content — only an optional `sr-only` label, which is taken out of flow — so
  `width: auto` on an `inline-block` resolves to **0px**, measured. `w-fit` is the same. They
  are only useful where something else supplies the size: a flex or grid parent, `flex-1`, or
  a `min-w-*`. In normal flow they render nothing, silently. (This is also what the old
  `style={{ width: undefined }}` trick actually did — it dropped the inline `100%` and landed
  on `width: auto`, i.e. on nothing. It is gone with the props, and `w-64` now simply works.)
- **`style` beats every size class.** It is an ordinary `span` prop and goes inline, so
  `style={{ height: "2rem" }}` wins over `h-48` and `style={{ width: 200 }}` wins over `w-20`.
  Deliberate, and the escape hatch for a dimension computed at runtime — but it is also the
  one route a consumer's own `className` cannot get past, so prefer a class where you can.
- **`w-full` is a real utility in the class list, so `tailwind-merge` is now live here.** It
  was not before: none of the base classes were utilities, so `cn` had nothing to collapse.
  Now a `w-*` you pass *replaces* the default rather than joining it — which is the point,
  and worth knowing if you were relying on `cn` being a no-op.
- **A skeleton announces nothing unless you give it `children`.** By default it is
  `aria-hidden` with no role, so a card of four placeholders adds nothing to the
  accessibility tree. Passing `children` turns *that* one into a `role="status"` whose
  visually hidden text is what you passed — there is no built-in English string to translate.
  See [Accessibility](#accessibility).
- **It is an `inline-block` `<span>`.** Stacked in normal flow each one takes a line box, so
  the inherited `line-height` sets the pitch, not the height you gave it — under Tailwind's
  `line-height: 1.5` three `text` skeletons are 72px, not 48px. Wrap them in a flex or grid
  container.
- **The package CSS import is required.** Unlike a utility-styled component, Skeleton has
  literally no appearance without `Skeleton.css` — it is pulled in by this package's
  `styles.css`, which consumers import alongside `@batthewz/response-ui-css`.
- **Server-renderable.** No `"use client"`, so it drops straight into an RSC tree.

## Accessibility

Skeleton is decoration by default: `aria-hidden`, no role, no text. A card with an avatar
and three lines therefore adds *nothing* to the accessibility tree, which is the right
default — it is one wait, not four, and four regions each named "Loading" told a
screen-reader user less than one region does.

- **`children` promotes one skeleton to the announcement.** It renders as visually hidden
  text inside a `role="status"`, in whatever language you pass; the element drops its
  `aria-hidden` at the same time. Give it to one skeleton per group, not to all of them.
- **A region that mounts with its text already inside it may not be announced.** That is a
  general live-region caveat, not a Skeleton bug: for a wait the user must be told about,
  render your own region up front and change what is inside it — see
  [Announcing the wait](#announcing-the-wait).
- **Your props win.** `…rest` spreads *after* `role` and `aria-hidden`, so both are
  replaceable. `className` is merged through `cn`; `style` is not touched at all — the
  component writes none, so yours is the only one.

**Motion.** `Skeleton.css` ships a `@media (prefers-reduced-motion: reduce)` block that sets
`animation: none` and pins `opacity: 0.7`, so a reader who has asked their OS for reduced
motion gets a static, still-visible placeholder rather than an opacity cycle. This is the
library's normal behaviour — 23 component stylesheets carry the same guard, and
[Spinner](spinner.md), having no stylesheet to put one in, carries the equivalent
`motion-reduce:animate-none` utility instead. Either loading affordance is safe for a long
wait.

**Contrast.** Once hidden, a skeleton is a decorative graphic, so WCAG 1.4.11's 3:1 rule for
meaningful non-text content doesn't apply. It still has to be *visible* to do its job, and
`--C-SURFACE-2` on a surface background is a deliberately low-contrast pairing — check it in
every theme you ship, especially at the `0.4` trough of the pulse.

## Related

[Spinner](spinner.md) · [ProgressRing](progress-ring.md) · [Meter](meter.md) ·
[Card](card.md) · [DataTable](data-table.md) · [Table](table.md) · [EmptyState](empty-state.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
