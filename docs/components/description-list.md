# DescriptionList

Key/value pairs rendered as a real `<dl>`/`<dt>`/`<dd>` — aligned in a two-column grid
or stacked in a single column, and re-tinted by your theme without a line of CSS from you.

<!-- example:Minimal -->
```tsx
<DescriptionList>
  <DescriptionList.Term>Name</DescriptionList.Term>
  <DescriptionList.Detail>Ada Lovelace</DescriptionList.Detail>
  <DescriptionList.Term>Role</DescriptionList.Term>
  <DescriptionList.Detail>Principal Engineer</DescriptionList.Detail>
  <DescriptionList.Term>Joined</DescriptionList.Term>
  <DescriptionList.Detail>March 2021</DescriptionList.Detail>
</DescriptionList>
```
<!-- /example -->

**Anatomy.** `DescriptionList` is the `<dl>` and owns the layout. `DescriptionList.Term`
is the `<dt>` label; `DescriptionList.Detail` is the `<dd>` value. Children flow in
source order — nothing binds a term to its detail beyond that order, so a term and the
detail(s) that follow it read as a pair. In the default horizontal layout the two-column
grid places one `Term` in the label column and one `Detail` in the value column per row.

| Part                     | Renders | Props                            |
| ------------------------ | ------- | -------------------------------- |
| `DescriptionList`        | `<dl>`  | `layout?` (+ all `dl` props)     |
| `DescriptionList.Term`   | `<dt>`  | — (+ all `dt` props)             |
| `DescriptionList.Detail` | `<dd>`  | — (+ all `dd` props)             |

Unlike some compounds, the sub-parts read **no context** — they are just pre-styled
`<dt>`/`<dd>` elements, so they never throw when used outside a `DescriptionList` and can
be wrapped in your own components freely. `className`, `id`, and `aria-*` pass through on
all three. `layout` is the only bespoke prop, and it lives on the root only.

## Layout

`horizontal` (default) is a `max-content 1fr` grid — the label column is exactly as wide
as its widest term, and every value starts at the same x. `vertical` stacks each label
above its value, which suits narrow columns and long values.

<!-- example:Vertical -->
```tsx
<DescriptionList layout="vertical">
  <DescriptionList.Term>Shipping address</DescriptionList.Term>
  <DescriptionList.Detail>
    12 Rue de Rivoli, 75001 Paris, France
  </DescriptionList.Detail>
  <DescriptionList.Term>Delivery window</DescriptionList.Term>
  <DescriptionList.Detail>Tue 24 – Thu 26 June</DescriptionList.Detail>
</DescriptionList>
```
<!-- /example -->

## Multiple details per term

A `Term` may own more than one `Detail` — valid `<dl>` semantics. Stack them with
`vertical`; in `horizontal` the extra details wrap under the label column (see
[Gotchas](#gotchas)).

<!-- example:MultipleDetails -->
```tsx
<DescriptionList layout="vertical">
  <DescriptionList.Term>Phone numbers</DescriptionList.Term>
  <DescriptionList.Detail>Home — (555) 010 2938</DescriptionList.Detail>
  <DescriptionList.Detail>Work — (555) 771 0043</DescriptionList.Detail>
</DescriptionList>
```
<!-- /example -->

## Rich values

`Detail` is a plain `<dd>`; it renders any node. The base `text-body-2` / `text-fg-primary`
styling sits underneath, so an inner element can re-colour or re-weight just its own text.

<!-- example:RichDetail -->
```tsx
<DescriptionList>
  <DescriptionList.Term>Invoice</DescriptionList.Term>
  <DescriptionList.Detail>
    <a href="/invoices/INV-2043" className="text-accent underline">
      INV-2043
    </a>
  </DescriptionList.Detail>
  <DescriptionList.Term>Status</DescriptionList.Term>
  <DescriptionList.Detail>
    <span className="text-status-success">Paid</span>
  </DescriptionList.Detail>
</DescriptionList>
```
<!-- /example -->

## Theme tokens

DescriptionList ships no CSS file — every colour, type step, and gap is a Tailwind
utility that resolves to a contract variable. Override the variable and the list
re-tints with the rest of the app, at runtime, no rebuild.

| Where              | Utility                        | Override                          |
| ------------------ | ------------------------------ | --------------------------------- |
| Term (label) ink   | `text-fg-secondary`            | `--C-TEXT-SECONDARY`              |
| Term type + weight | `text-body-3` `font-semibold`  | `--BodyText-3` `--Semibold-Weight` |
| Detail (value) ink | `text-fg-primary`              | `--C-TEXT-PRIMARY`                |
| Detail type        | `text-body-2`                  | `--BodyText-2`                    |
| Row / stack gap    | `gap-r5`                       | `--R-SIZE-5`                      |

The horizontal grid adds a **column** gap between term and detail via `gap-x-r3`
(`--R-SIZE-3`) and reuses `--R-SIZE-5` for its row gap through `gap-y-r5`; vertical
uses the single `gap-r5` above. All three ride the responsive `r`-scale, so the gaps
step up at the 40rem breakpoint with the rest of the spacing system. The type steps
(`--BodyText-*`) are responsive the same way — the list is slightly larger on desktop
with no breakpoint utilities from you. DescriptionList sets **no background**: it inks
`--C-TEXT-PRIMARY`/`--C-TEXT-SECONDARY` on whatever surface it is dropped onto, and the
[contrast contract](../theme-contract.md) guarantees both against every `surface-*` token.

## Gotchas

- **Horizontal misaligns a term's second detail.** The layout is a two-column grid with
  default row auto-flow, so children fill left-to-right, top-to-bottom. One `Term` + one
  `Detail` lands cleanly, but a **second** `Detail` wraps into the *label* column of the
  next row and shifts every following pair. For multi-value entries use `layout="vertical"`,
  or fold the values into a single `Detail`.
- **A long term widens every value.** The label column is `max-content` across the whole
  grid, so the single widest `Term` sets where *all* values begin. One long label pushes
  every value right. Switch to `vertical` when labels vary a lot in length.
- **Order is the only pairing.** Nothing type-checks or enforces that a `Detail` follows
  its `Term`; a stray `Detail` before any `Term`, or a `Term` with no `Detail`, renders
  without complaint and just looks wrong.
- **No per-component CSS.** There is no `DescriptionList.css`; all styling is utilities
  from `@batthewz/response-ui-css`, so its stylesheet import is still required.
- **Server-renderable.** No `"use client"` — it drops straight into an RSC tree.

## Accessibility

Native `<dl>`/`<dt>`/`<dd>` give you the `term` and `definition` roles for free — no ARIA
is added or needed, and the pairing is conveyed by the elements themselves.

One caveat: this component sets `display: grid`/`flex` on the `<dl>`. In some Safari +
VoiceOver versions that drops the list/group semantics of the `<dl>` as a whole (the same
issue that affects a styled `<ul>`), though the per-item `term`/`definition` roles on
`<dt>`/`<dd>` are preserved. If the *grouping* announcement matters for your audience,
verify it in VoiceOver.

## Related

[StatCard](stat-card.md) · [DataTable](data-table.md) · [Card](card.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
