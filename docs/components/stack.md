# Stack

Vertical flexbox as one element. It lays its children out in a column with a themed gap
from the shared spacing scale — no `flex flex-col gap-*` className at the call site, no
margins on the children, and one prop to change the rhythm of the whole column.

<!-- example:Minimal -->
```tsx
<Stack>
  <h2 className="text-h4">Notification settings</h2>
  <p className="text-fg-secondary">Choose how we reach you about account activity.</p>
  <p className="text-fg-secondary">Security alerts are always delivered, whatever you pick.</p>
</Stack>
```
<!-- /example -->

| Prop        | Type                                          | Default |
| ----------- | --------------------------------------------- | ------- |
| `gap`       | `"r1" \| "r2" \| "r3" \| "r4" \| "r5" \| "r6"` | `"r4"`  |
| `as`        | `ElementType`                                 | `"div"` |
| `className` | `string`                                      | —       |
| `ref`       | `Ref` of the element `as` renders             | —       |
| …rest       | props of `as`                                 | —       |

That is the entire API. Stack reads three names off the props — `gap`, `as` and
`className` — and everything else (`id`, `aria-*`, `data-*`, `onSubmit`) reaches the
rendered element untouched. `className` is the one it does something with: rather than
land on the element beside Stack's own classes, it is merged into them. Note what is
*missing*:
there is no `align` or `justify`, so cross-axis work goes through `className`. See
[Gotchas](#gotchas).

## Which layout primitive

Stack is the smallest of the layout set and the one you reach for most. The others exist
because a column with one gap is not always the answer:

| You want                                                    | Reach for                     |
| ----------------------------------------------------------- | ----------------------------- |
| A column with one consistent gap                             | Stack                         |
| A single line of children, with alignment control            | [Row](row.md)                 |
| Uniform tiles — equal widths, equal row heights              | [Grid](grid.md)               |
| Content sitting dead centre in a region                      | [Center](center.md)           |
| A capped reading measure and page gutters                    | [Container](container.md)     |
| Two clusters shoved to opposite ends of one line             | [Spacer](spacer.md)           |

Two boundaries worth drawing precisely:

- **A card grid is [Grid](grid.md)'s job, not Stack's.** A Stack of [Row](row.md)s — or a
  wrapping Row — sizes each cell to its content, so widths go ragged and nothing lines up
  from one line to the next. `Grid columns={{ base: 1, md: 3 }}` gives equal-width columns
  and equal-height rows, which is what makes card footers align. Reach for `MasonryGrid`
  only when you actually want uneven heights.
- **Stack and [Container](container.md) compose rather than compete.** Container caps the
  measure and adds the horizontal gutter; Stack sets the vertical rhythm inside it.
  `<Container><Stack gap="r1">…</Stack></Container>` is the standard page body, and neither
  one does the other's job.

## Gap

<!-- example:NestedRhythm -->
```tsx
<Stack gap="r1">
  <Stack gap="r5">
    <h2 className="text-h4">Billing</h2>
    <p className="text-fg-secondary">Manage your plan and payment method.</p>
  </Stack>
  <Stack gap="r5">
    <h2 className="text-h4">Team</h2>
    <p className="text-fg-secondary">Invite teammates and set their roles.</p>
  </Stack>
</Stack>
```
<!-- /example -->

`gap` is the only spacing knob, and it takes an `r1`–`r6` step rather than a pixel value.
The scale is **inverted** — `r1` is the widest step and `r6` the tightest — so nesting a
wide-gap Stack around tight-gap ones is how you build hierarchy without a single margin.

The gap sits strictly *between* children: Stack adds no padding of its own, and no space
above the first child or below the last. Padding is the container's job. Because the
spacing lives on the parent rather than as margins on the children, inserting, removing,
or reordering a child never leaves a stray margin behind.

## Cross-axis alignment

<!-- example:CrossAxisAlignment -->
```tsx
<Stack className="items-start">
  <p>Deleting a workspace removes every project and integration inside it.</p>
  <Button variant="danger">Delete workspace</Button>
</Stack>
```
<!-- /example -->

Stack renders a bare `flex flex-col`, so `align-items` stays at the flex default and
children **stretch to the Stack's full width**. That is usually what you want — inputs and
[Card](card.md)s in a settings panel should share an edge — but it also means a lone
[Button](button.md) spans the entire column. Stack has no `align` or `justify` prop, so
pass `items-start`, `items-center`, or `items-end` through `className` instead. Main-axis
distribution works the same way, with a caveat: in a column, `justify-*` only has anything
to distribute once the Stack is taller than its contents.

## Render as something else

<!-- example:AsForm -->
```tsx
<Stack as="form" gap="r5" onSubmit={createWorkspace}>
  <Label htmlFor="workspace-name">Workspace name</Label>
  <Input id="workspace-name" defaultValue="Acme HQ" />
  <Button type="submit">Create workspace</Button>
</Stack>
```
<!-- /example -->

`as` swaps the tag and re-types `…rest` with that element's props. The rest props are
genuinely spread onto the rendered element, so handlers, `id`, `data-*`, and `aria-*` all
arrive — the type and the runtime agree here.

## Centring a column

<!-- example:CenteredColumn -->
```tsx
<Center className="min-h-screen">
  <Stack gap="r5" className="items-center">
    <Spinner />
    <p className="text-fg-secondary">Restoring your session…</p>
  </Stack>
</Center>
```
<!-- /example -->

[Center](center.md) is a flex *row*: hand it several children and they sit side by side,
centred as a group. Hand it a single Stack and you get a centred column — the splash
screen, empty state, and full-page loader recipe.

## Theme tokens

Stack reaches no colour, radius, shadow, or motion token: a column with a gap has nothing
to tint. Its one themeable value is that gap, drawn from the shared responsive spacing
scale — so overriding an `--R-SIZE-*` step re-spaces every Stack in the app at runtime,
in lock-step with every other `r`-scale utility rather than in isolation.

| Step | Utility  | Override     | Below 40rem | 40rem and up |
| ---- | -------- | ------------ | ----------- | ------------ |
| `r1` | `gap-r1` | `--R-SIZE-1` | 2.25rem     | 6rem         |
| `r2` | `gap-r2` | `--R-SIZE-2` | 1.25rem     | 2rem         |
| `r3` | `gap-r3` | `--R-SIZE-3` | 1rem        | 1.5rem       |
| `r4` | `gap-r4` | `--R-SIZE-4` | 0.75rem     | 1.25rem      |
| `r5` | `gap-r5` | `--R-SIZE-5` | 0.5rem      | 0.75rem      |
| `r6` | `gap-r6` | `--R-SIZE-6` | 0.25rem     | 0.25rem      |

**Five of the six rungs step up; the sixth does not.** All six are re-declared inside a
`@media (width >= 40rem)` block in `@batthewz/response-ui-css` — but `--R-SIZE-6` is
re-declared to the same `0.25rem` it already had, so only five of them change. Five gaps
grow on desktop with no breakpoint utilities from you; `r6` holds at `0.25rem` at every
width. It is the hairline step, and a hairline that grew would stop reading as one. Treat
`gap="r6"` as fixed and the rest as responsive.

## Gotchas

- **The `r`-scale is inverted.** `r1` is the *largest* gap and `r6` the *smallest* — the
  opposite of most numeric scales. The `r4` default sits mid-scale; go to a lower number
  when you want more air. Don't assume it matches its neighbours either: [Row](row.md)
  defaults to `r5` while Stack and [Grid](grid.md) default to `r4`.
- **Children stretch to full width by default.** Flexbox's own `align-items` default, not
  a choice Stack makes — but it surprises people who expect content-width children. See
  [Cross-axis alignment](#cross-axis-alignment).
- **No reverse prop.** Stack only ever renders `flex-col`. `className="flex-col-reverse"`
  does win the merge (`cn` drops `flex-col`), but then DOM order no longer matches visual
  order — reorder the JSX instead.
- **`className` wins over the defaults.** `cn` merges by utility group, so a passed class
  in the same group replaces the base one: `className="flex-row"` quietly turns a Stack
  into a row, and `className="gap-0"` silently beats whatever the `gap` prop said. Handy
  for one-offs, easy to do by accident.
- **No `min-w-0`, so a nested Stack can push its parent wide.** Stack renders `flex
  flex-col` and nothing else — it never sets `min-width: 0`. Drop one inside a
  [Row](row.md) (or any flex row) and it becomes a flex item with the CSS default
  `min-width: auto`, which refuses to shrink below its content's minimum: one long
  unbroken string — a URL, a hash, a filename — holds the whole column open and overflows
  the Row. [Grid](grid.md) heads this off for its own cells with `minmax(0, 1fr)`; Stack
  has no equivalent, so pass `className="min-w-0"` (plus `truncate` or `break-all` on the
  offending child) whenever the content is not guaranteed to wrap.
- **No per-component CSS.** There is no `Stack.css`; it is styled entirely from utility
  classes. The `@batthewz/response-ui-css` import is still required, and so is this
  package's own `styles.css` — the latter registers `@source "../src/**/*.{ts,tsx}"`, which
  is what makes Tailwind emit Stack's `gap-r*` classes into the consumer's build.
- **Server-renderable.** No `"use client"`, so Stack drops straight into an RSC tree.

## Accessibility

A default Stack is a `<div>` with no role — correct for pure layout, and it adds nothing to
the accessibility tree. When the column *is* something, say so with `as` rather than leaving
a bare div. The three usual choices do not all behave the same way — two need a second prop
before the semantics actually land:

- **`as="form"`** stands on its own — you get the browser's native submit behaviour and the
  element's own semantics, no extra props required.
- **`as="ul"`** (with `<li>` children) wants an explicit `role="list"`. Stack unconditionally
  applies `display: flex`, and changing a list's `display` away from the list defaults is the
  same class of quirk that makes Safari + VoiceOver drop `list`/`listitem` semantics —
  [ActivityFeed](activity-feed.md) documents it for its own `<ol>`, and it is a known caveat
  for `<dl>` in this library too. `role` passes straight through, so write
  `<Stack as="ul" role="list">` when "list, N items" navigation matters.
- **`as="section"`** is not a landmark by itself. Per HTML-AAM a `<section>` maps to `region`
  only when it has an accessible name; without one it maps to `generic` — the same bare div
  you were trying to avoid. Name it: `<Stack as="section" aria-labelledby="billing-heading">`
  (or `aria-label`).

Stack itself never reorders its children — it has no reverse prop — so DOM order matches
visual order and reading order stays in sync with tab order. Reorder the JSX, not the CSS,
when the sequence matters.

## Related

[Row](row.md) · [Grid](grid.md) · [Center](center.md) · [Container](container.md) ·
[Spacer](spacer.md) · [Divider](divider.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
