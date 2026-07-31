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
| `classNames`   | `{ list?, first?, prev?, next?, last?, page?, ellipsis?, info? }` — see [Slots](#slots) | — |
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

Nesting a pagination inside a filter `<form>` is safe. Every control it renders carries an
explicit `type="button"` — the four arrows through [IconButton](icon-button.md), the page
numbers directly — so clicking Next pages instead of submitting, and no arrow can become the
form's implicit submitter. Enter from inside a text field still fires your own submit button.

It takes no *part* in the form either: it has no `name`, contributes nothing to `FormData`,
and holds no state to reset. The page number is yours, not the form's, which is why keeping
the pager a sibling is still the clearer shape — the form owns the filters, you own the page:

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

## Slots

`className` addresses the `<nav>`; `Pagination` takes no children, so everything inside it is
this component's own. `classNames` is how you reach it. Class strings only, and the keys are
typed, so a misspelled one is a compile error rather than a prop that does nothing.

| Slot       | Element                          | What it addresses                             |
| ---------- | -------------------------------- | --------------------------------------------- |
| `list`     | `ul.pagination__list`            | the row the controls sit in                    |
| `first`    | the "First page" `IconButton`    | jump to page 1 — rendered only when `showEdges` |
| `prev`     | the "Previous page" `IconButton` | step back one                                  |
| `next`     | the "Next page" `IconButton`     | step forward one                               |
| `last`     | the "Last page" `IconButton`     | jump to the end — rendered only when `showEdges` |
| `page`     | every `button.pagination__page`  | the numbered buttons, in `full` only            |
| `ellipsis` | every `li.pagination__ellipsis`  | the gap markers, in `full` only                 |
| `info`     | `li.pagination__info`            | the "Page X of Y" readout, in `compact` only    |

```tsx
<Pagination
  page={page}
  totalPages={12}
  onPageChange={setPage}
  showEdges
  classNames={{ page: "rounded-full", first: "hidden sm:inline-flex", last: "hidden sm:inline-flex" }}
/>
```

**The four stepping controls take four keys, not one.** They share the class
`pagination__nav` today, but they are four different roles: hiding the edge jumps while
keeping the steps has no route under a single key, and that is exactly the override the
`showEdges`/`compactBelow` pair leaves you wanting.

`page` and `ellipsis` land on **every** instance — both are generated from `page` and
`totalPages`, so no key can name one. `first`, `last` and `info` render conditionally, so a
class on them is silent rather than wrong when the control is not on screen.

Prefer a token where the change is a value — the whole control re-inks from the variables in
[Theme tokens](#theme-tokens), which reaches every paginator rather than one call site.

## Theme tokens

All of Pagination's own styling lives in `Pagination.css` and reads contract variables
directly — there is not a single Tailwind utility in `Pagination.tsx`.

| Where                                    | Override                                          |
| ---------------------------------------- | ------------------------------------------------- |
| Page number and compact readout ink      | `--C-TEXT-SECONDARY`                              |
| Page number hover                        | `--C-SURFACE-2` · `--C-TEXT-PRIMARY`              |
| Current page fill · ink · weight         | `--C-ACCENT` · `--C-TEXT-ON-ACCENT` · `--Semibold-Weight` |
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

**How readable the current page is comes from your theme, not from here.** The fill is
`--C-ACCENT` and the ink is the partner the [theme contract](../theme-contract.md) names for
it, `--C-TEXT-ON-ACCENT` — the same pair [Tabs](tabs.md) and [Calendar](calendar.md) use for
their accent-filled selected states. Pairing them correctly is the whole of what a component
can do; the ratio that pairing yields is the theme's to set. Measured against
`@batthewz/response-ui-css` **v0.10.0**, the default theme and all three examples clear AA's
4.5:1 for body-size text: `tech` 14.84:1, `grimdark` 5.69:1, `default` 5.17:1, `events` 5.04:1. Two of
them used to fail — `events` at 2.80:1 and `grimdark` at 3.81:1 — and were repaired upstream
in the palette rather than here, `events` by darkening `--C-ACCENT` and `grimdark` by
inverting `--C-TEXT-ON-ACCENT` to dark ink on its lit red. That is the fix working as
intended: retinting the theme repairs every accent-filled control at once. Measured against
the default theme and the worked examples; these numbers do not transfer to your own theme —
re-check them against your values.

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

- **The current page keeps a tab stop and does nothing with it.** It stays an enabled
  `<button>` on purpose: native `disabled` would pull it out of the tab order *and* the
  accessibility tree, taking its `aria-current="page"` with it. So Tab lands there, and
  nothing happens — the click handler refuses to re-fire for the page already shown, so
  Enter, Space and a mouse click are all inert, and `cursor: default` says so. Budget one
  dead tab stop per pager; `onPageChange` never sees a no-op call.
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
  `useMediaQuery` is called whether or not `compactBelow` is set. That directive *is* the client
  boundary, so a server component can render `<Pagination>` directly; but unlike
  [Button](button.md) or [IconButton](icon-button.md) — which carry no directive and ship no
  JavaScript — its whole module ships to the browser.

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

[IconButton](icon-button.md) · [Button](button.md) · [Tabs](tabs.md) · [Table](table.md) ·
[DataTable](data-table.md) · [Stepper](stepper.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
