# Pagination

A numbered page bar for result sets too long to scroll — invoices, search hits, an audit
log. It renders a fixed number of slots however deep the set goes, so paging through 100
pages never changes the control's width, and it holds no state of its own: you own the
page number, it tells you when the user wants a different one.

<!-- example:Minimal -->
```tsx
<Pagination page={page} totalPages={12} onPageChange={setPage} />
```
<!-- /example -->

| Prop           | Type                            | Default                    |
| -------------- | ------------------------------- | -------------------------- |
| `page`         | `number` — **required**         | —                          |
| `totalPages`   | `number` — **required**         | —                          |
| `onPageChange` | `(page: number) => void` — **required** | —                  |
| `siblingCount` | `number`                        | `1`                        |
| `variant`      | `"full" \| "compact"`           | `"full"`                   |
| `showEdges`    | `boolean`                       | `true` when the effective variant is `compact` |
| `compactBelow` | `number` (px) \| `string` (CSS length) | —                   |
| `className`    | `string`                        | —                          |
| `ref`          | `Ref<HTMLElement>`              | —                          |
| …rest          | every `<nav>` prop except `children` | —                     |

**Controlled only.** There is no `defaultPage`, no internal page state, and no `useState`
anywhere in the component. `page` and `onPageChange` are both required; the component reads
`page` on every render and calls `onPageChange` with the number it wants next. Nothing
happens until you re-render with a new `page`.

**Nothing is clamped.** `onPageChange` is only ever guarded by the `disabled` attributes,
which come from `page <= 1` and `page >= totalPages`. Render a `page` of `7` against a
`totalPages` of `3` and Previous is enabled and reports `6` — out of range in, out of range
out, and no page marked current. Validate at your call site.

## How the page window works

With 100 pages you cannot render 100 buttons, so `Pagination` renders a fixed **slot
count** — `siblingCount * 2 + 5`, which is **7** at the default `siblingCount` of 1 — and
fills it three different ways depending on where you are:

| `page` (of 100) | Rendered row              | Why                                            |
| --------------- | ------------------------- | ---------------------------------------------- |
| 1               | `1 2 3 4 5 … 100`         | head block, right gap hides 94 pages           |
| 4               | `1 2 3 4 5 … 100`         | still head — the left gap would hide only 2–3  |
| 5               | `1 … 4 5 6 … 100`         | both gaps now hide 2+ pages                    |
| 50              | `1 … 49 50 51 … 100`      | middle                                         |
| 97              | `1 … 96 97 98 99 100`     | tail block                                     |
| 100             | `1 … 96 97 98 99 100`     | tail                                           |

The head and tail blocks are `siblingCount * 2 + 3` consecutive pages (5 by default), which
is exactly what keeps all three shapes the same width. An ellipsis is only substituted where
the gap hides **two or more** pages; a gap of one page renders that page's number instead,
which is why page 4 above still shows 2 and 3.

`siblingCount` is the one dial. `0` gives the narrowest usable row — five slots, reading
`1 … 50 … 100` mid-set — and each step up widens the row by two:

<!-- example:WindowSize -->
```tsx
<div className="flex flex-col gap-r5">
  <Pagination page={page} totalPages={100} siblingCount={0} onPageChange={setPage} />
  <Pagination page={page} totalPages={100} onPageChange={setPage} />
  <Pagination page={page} totalPages={100} siblingCount={2} onPageChange={setPage} />
</div>
```
<!-- /example -->

### When there aren't enough pages to window

If `totalPages <= siblingCount * 2 + 5` the window logic is skipped entirely and **every**
page renders, with no ellipsis — 7 of 7 is `1 2 3 4 5 6 7`. The count then tracks
`totalPages` rather than the slot count, but it still doesn't change as you page, so the
no-layout-shift property holds either way.

**One page** renders a single `1` button, marked `aria-current="page"`, with every arrow
disabled. **Zero pages** renders the `<nav>` and the `<ul>` holding nothing but the arrows,
all disabled — no numbers and no ellipsis, and `compact` still prints its readout, reading
`Page 1 of 0` at `page={1}`. The component never renders nothing, so if an empty result set
shouldn't show a pager, guard it yourself:

<!-- example:ZeroPages -->
```tsx
<p>No invoices match these filters.</p>
<Pagination page={page} totalPages={0} onPageChange={setPage} />
```
<!-- /example -->

## Edge chevrons

`showEdges` adds jump-to-first and jump-to-last controls. It defaults to *off* for `full`,
where the numbers already reach both boundaries, and *on* for `compact`, where nothing else
does:

<!-- example:EdgeChevrons -->
```tsx
<Pagination page={page} totalPages={12} showEdges onPageChange={setPage} />
```
<!-- /example -->

## Compact

`variant="compact"` replaces the numbers with a `Page X of Y` readout — for a table footer,
a card, or anywhere the numbers won't fit:

<!-- example:Compact -->
```tsx
<Pagination page={page} totalPages={40} variant="compact" onPageChange={setPage} />
```
<!-- /example -->

`compactBelow` picks the layout by viewport instead. A number is treated as px, a string as
any CSS length, and either becomes a `(width < …)` media query watched by `useMediaQuery`:

<!-- example:CollapseOnNarrowViewports -->
```tsx
<Pagination page={page} totalPages={40} compactBelow="40rem" onPageChange={setPage} />
```
<!-- /example -->

It only ever collapses. Above the breakpoint you get `variant` as written, so
`variant="compact" compactBelow="40rem"` is compact at every width. With `compactBelow`
unset the hook is handed `"not all"`, a query that never matches, so it stays inert rather
than being conditionally called.

## Naming the region

The `<nav>` is labelled `Pagination`, but the rest props spread *after* that attribute, so
your own `aria-label` replaces it. Do that whenever a screen has more than one:

<!-- example:NamedRegions -->
```tsx
<div className="flex flex-col gap-r4">
  <Pagination
    aria-label="Invoices"
    page={invoicePage}
    totalPages={9}
    onPageChange={setInvoicePage}
  />
  <Pagination
    aria-label="Receipts"
    page={receiptPage}
    totalPages={4}
    onPageChange={setReceiptPage}
  />
</div>
```
<!-- /example -->

## Inside a form

The four arrow controls are [IconButton](icon-button.md)s rendered with **no `type`**, so
each one is a submit button. Nesting a pagination inside a filter `<form>` means clicking
Next submits the form. Keep it a sibling:

<!-- example:OutsideTheFilterForm -->
```tsx
<div className="flex flex-col gap-r4">
  <form>
    <Input name="q" aria-label="Search invoices" placeholder="Search invoices" />
    <Button type="submit">Apply filters</Button>
  </form>
  <Pagination page={page} totalPages={12} onPageChange={setPage} />
</div>
```
<!-- /example -->

See [Gotchas](#gotchas) for the full damage; there is no prop that fixes it from the call
site.

## Theme tokens

All of Pagination's own styling lives in `Pagination.css` and reads contract variables
directly — there is not a single Tailwind utility in `Pagination.tsx`.

| Where                                    | Override                                          |
| ---------------------------------------- | ------------------------------------------------- |
| Page number and compact readout ink      | `--C-TEXT-SECONDARY`                              |
| Page number hover                        | `--C-SURFACE-1` · `--C-TEXT-PRIMARY`              |
| Current page fill · ink · weight         | `--C-ACCENT` · `--C-TEXT-ON-PRIMARY` · `--Semibold-Weight` |
| Page number focus ring                   | `--C-BORDER-FOCUS`                                |
| Page number corners                      | `--RADIUS-SM`                                     |
| Number and readout type                  | `--BodyText-2` · `--BodyText-2-line-height`       |
| Ellipsis ink                             | `--C-TEXT-MUTED`                                  |
| Row gap · number padding                 | `--R-SIZE-6`                                      |
| Readout padding · touch row gap          | `--R-SIZE-5`                                      |
| Hover and ink transition                 | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT` |

**The arrows are not in that table.** They are [IconButton](icon-button.md)s and take their
colour, radius, padding, and timing from
[IconButton's own token set](icon-button.md#theme-tokens). The `pagination__nav` class
Pagination puts on them does exactly one thing: raise `min-width`/`min-height` to `2.75rem`
under `@media (pointer: coarse)`. On a mouse-driven device that class matches no rule at
all. The same is true of the root `pagination` class — it is a bare hook for your own CSS;
the `<ul>` inside it does all the layout.

**The current page pairs the wrong two tokens.** `--C-ACCENT` is the fill, but the ink is
`--C-TEXT-ON-PRIMARY` — the variable the [theme contract](../theme-contract.md) defines as
"text drawn on `--C-PRIMARY` fill". The partner it names for an accent fill is
`--C-TEXT-ON-ACCENT`, which is what [Tabs](tabs.md) and `Calendar` use for their own
accent-filled selected states. In three of the four bundled themes the two variables hold
the same value, so the mistake is invisible (default measures 5.17:1 there; `events` 2.80:1
and `grimdark` 3.81:1 both fail AA, but they fail identically with the correct token — a
theme problem, not this component's). In `tech` they differ: its `--C-TEXT-ON-PRIMARY` is
byte-identical to its `--C-ACCENT`, so the current page number is painted in its own
background colour at a measured **1.00:1** and is invisible. `--C-TEXT-ON-ACCENT` there
would give 14.84:1.

**The numbers fade more slowly than the arrows beside them.** A number's hover transition
runs on `--MOTION-DURATION-SHIFT` — 400ms by default, 250ms in `tech`, 600ms in `grimdark` —
while the chevrons in the same row use IconButton's `--DURATION-FAST` at 100ms. `Pagination.css`
does ship a `prefers-reduced-motion: reduce` block that kills its own transition — but the
arrows also carry IconButton's `active:scale-95` press animation, which has no such guard,
so reduced-motion users still get a shrink on pointer-down.

**Responsive steps.** `--R-SIZE-5` goes `0.5rem → 0.75rem` at the 40rem breakpoint, so the
compact readout's padding and the touch row gap widen on desktop; `--R-SIZE-6` sits on the
same scale but holds at `0.25rem`, so the row gap and the number padding do not.
`--BodyText-2` and `--Semibold-Weight` both step up at 40rem as well.

**The geometry is hard literals, not contract variables.** The slot box (`2rem` min-width
and height), its touch-device counterpart (`2.75rem`), the focus outline's 2px width and 2px
offset, and the ellipsis letter-spacing are all fixed. So is `font-variant-numeric:
tabular-nums` on the numbers, which is load-bearing: equal-width digits plus a constant slot
count is what actually stops the row twitching as you page from 9 to 10.

## Gotchas

- **The arrows submit an enclosing form; the numbers don't.** `Pagination.tsx` renders its
  four icon buttons (lines 116, 129, 178, 191) with no `type`, and a `<button>` without one
  is `type="submit"`. Its own page-number `<button>` *does* set `type="button"`
  (line 153) — the component is inconsistent with itself. Drop a pagination into a
  filter `<form>` and clicking Next submits the form instead of paging. Worse, on page 1 the
  Previous arrow is `disabled` and the numbers are `type="button"`, which makes **Next the
  form's default submitter** — the button Enter fires from inside any text field in that
  form. Nothing at the call site fixes it: `type` would land on the `<nav>`, not the
  buttons. Render the pagination outside the form.
- **The current page is invisible in the `tech` theme.** Its accent fill is paired with the
  wrong ink variable, measured at 1.00:1 — see [Theme tokens](#theme-tokens). Until it is
  fixed, patch the one rule rather than the variable, which [Tooltip](tooltip.md) and
  `Stepper` also read: `.pagination__page--current { color: var(--C-TEXT-ON-ACCENT); }`.
- **The current page number stays clickable by keyboard.** It is styled with
  `pointer-events: none` rather than being `disabled`, so the mouse can't reach it but Tab
  still can, and Enter or Space there calls `onPageChange` with the page you are already on.
  Make your handler idempotent.
- **The ellipsis is inert text, not a control.** It is an `<li aria-hidden="true">` holding a
  `<span>…</span>`. It is not focusable, not clickable, and not announced — there is no
  jump-to-page affordance and no way to add one. If users need to reach page 47 of 100
  directly, pair this with your own input.
- **A pager renders even when there is nothing to page.** `totalPages` of `0` or `1` still
  produces a named `<nav>` landmark. Guard the render.
- **`page` is never validated.** No clamping, no rounding, no warning — see the note under
  the props table.
- **The compact readout is hard-coded English.** `Page X of Y` is a literal in the JSX, and
  `children` is `Omit`ted from the prop type, so there is no prop and no slot to translate or
  reword it — a localised app has no supported way to change that string.
- **First paint is never compact.** `useMediaQuery` is backed by `useSyncExternalStore` with
  a server snapshot of `false`, so a `compactBelow` pagination renders `full` on the server
  and for the hydration render, then swaps to `compact` immediately after. Expect a flash of
  the wide layout on narrow devices.
- **Client component.** `Pagination.tsx` opens with `"use client"` — unconditionally, since
  `useMediaQuery` is called whether or not `compactBelow` is set. It cannot be rendered in an
  RSC tree without a client boundary, unlike [Button](button.md) or
  [IconButton](icon-button.md).

## Accessibility

The structure is the one WAI-ARIA asks for: a `<nav>` with an accessible name, wrapping a
`<ul>` whose `<li>`s hold one control each, with `aria-current="page"` on the current page's
button.

- **The landmark is named, and renameable.** `aria-label="Pagination"` is set by the
  component and overridden by anything you pass, because the rest props spread after it. Two
  unnamed pagination landmarks on one screen are indistinguishable in a landmarks list, so
  name them — see [Naming the region](#naming-the-region).
- **`aria-current="page"` is set in the `full` variant only.** In `compact` there is no
  current-page element to carry it, and the `Page 2 of 40` readout is a plain `<span>`, not a
  live region. A screen-reader user who activates Next in compact mode hears nothing about
  where they landed unless you announce it yourself.
- **The four arrows are named and distinguishable** — `First page`, `Previous page`,
  `Next page`, `Last page`, set by Pagination, not by you. That satisfies
  [IconButton](icon-button.md)'s compile-time `aria-label` requirement without any work at
  the call site; it also means the names are not overridable, so they stay English.
- **The chevrons don't double-announce.** Pagination doesn't mark them `aria-hidden`, but
  `lucide-react` adds `aria-hidden="true"` to any icon rendered without children or an a11y
  prop, so the rendered `<svg>` is hidden from assistive tech regardless.
- **Number buttons read as "Page 3", not "3".** The `aria-label` is longer than the visible
  `3`, but it *contains* it, so WCAG 2.5.3 (Label in Name) is satisfied and voice control
  still works on the visible digit.
- **`list-style: none` can strip the list role.** As with any styled list, Safari + VoiceOver
  drops `list`/`listitem` semantics from a `<ul>` whose markers are removed. The component
  adds no `role="list"`, and the `<ul>` is internal, so you cannot restore it from the
  outside — `className` and rest props land on the `<nav>`.
- **Target size.** A number slot is `2rem` tall and at least `2rem` wide — 32px, which clears
  WCAG 2.5.8 (24×24, AA) but not 2.5.5 (44×44, AAA). Under `@media (pointer: coarse)` the
  numbers, the ellipsis and the arrows are all raised to `2.75rem`, so touch devices get the
  AAA target without you configuring anything.
- **Focus is visible on both control types.** `.pagination__page` sets `all: unset`, which
  would remove the UA outline, and puts back a 2px `--C-BORDER-FOCUS` outline at 2px offset
  on `:focus-visible`; the arrows use IconButton's focus ring. Both are outline/ring-based,
  so focusing never reflows the row.
- **Disabled arrows leave the tab order,** as the native attribute always does — on page 1,
  Tab skips straight past Previous to the numbers.

## Related

[IconButton](icon-button.md) · [Button](button.md) · [Tabs](tabs.md) · `Table` ·
`DataTable` · `Stepper` · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
