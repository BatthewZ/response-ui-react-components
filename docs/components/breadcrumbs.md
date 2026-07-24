# Breadcrumbs

The "you are here" trail. A `<nav>` with an accessible name wrapping an ordered list,
with separators the screen reader never says, an `aria-current="page"` end crumb, and
optional collapsing so a deep path doesn't eat the header.

<!-- example:Minimal -->
```tsx
<Breadcrumbs>
  <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
  <Breadcrumbs.Item href="/customers">Customers</Breadcrumbs.Item>
  <Breadcrumbs.Item current>Acme Corp</Breadcrumbs.Item>
</Breadcrumbs>
```
<!-- /example -->

**Anatomy.** `Breadcrumbs` renders the `<nav aria-label="Breadcrumb">` and, inside it, the
`<ol class="breadcrumbs__list">`. It reads its `children` with `Children.toArray`, applies
the collapse window if you asked for one, then **interleaves a separator `<li>` between
every remaining child itself** — you never write the separators. Each `Breadcrumbs.Item`
is one `<li>` that picks one of three inner elements from its props, in this order: a
`<span aria-current="page">` if you pass `current`, an adapter `Link` if you pass `href`,
and a plain `<span>` if you pass neither.

| Part                    | Renders                    | Props                                                                                  |
| ----------------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| `Breadcrumbs`           | `<nav>` around an `<ol>`   | `separator?: ReactNode` = `"/"` · `maxItems?: number` · `itemsBeforeCollapse?: number` = `1` · `itemsAfterCollapse?: number` = `1` · **required** `children` (+ all `nav` props) |
| `Breadcrumbs.Item`      | `<li>`                     | `href?: string` · `current?: boolean` (+ all `li` props)                                |
| `Breadcrumbs.Separator` | `<li role="presentation">` | — (all `li` props). Interleaved for you; see [Gotchas](#gotchas) before rendering it yourself. |

`className`, `id`, `aria-*` and `ref` pass through on all three — the root's `ref` is an
`HTMLElement` on the `<nav>`, the parts' an `HTMLLIElement` on the `<li>`. The `<ol>` and
the inner `<a>`/`<span>` take nothing you pass; see [Gotchas](#gotchas).

## Separators

`separator` accepts any `ReactNode`, and whatever you give it is wrapped in a
`<span aria-hidden="true">` — so an icon needs no `aria-hidden` from you, and it inherits
the separator's muted ink through `currentColor`:

<!-- example:CustomSeparator -->
```tsx
<Breadcrumbs separator={<ChevronRight size={14} />}>
  <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
  <Breadcrumbs.Item href="/customers">Customers</Breadcrumbs.Item>
  <Breadcrumbs.Item current>Acme Corp</Breadcrumbs.Item>
</Breadcrumbs>
```
<!-- /example -->

## Collapsing a long trail

Without `maxItems` the list simply wraps (`flex-wrap: wrap`) onto a second line. Set
`maxItems` and any trail longer than that folds its middle behind an ellipsis button:

<!-- example:Collapsed -->
```tsx
<Breadcrumbs maxItems={4}>
  <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
  <Breadcrumbs.Item href="/customers">Customers</Breadcrumbs.Item>
  <Breadcrumbs.Item href="/customers/acme">Acme Corp</Breadcrumbs.Item>
  <Breadcrumbs.Item href="/customers/acme/invoices">Invoices</Breadcrumbs.Item>
  <Breadcrumbs.Item href="/customers/acme/invoices/2043">INV-2043</Breadcrumbs.Item>
  <Breadcrumbs.Item current>Line items</Breadcrumbs.Item>
</Breadcrumbs>
```
<!-- /example -->

`maxItems` is the **trigger**, not the number of crumbs you end up with. The collapsed row
is always `itemsBeforeCollapse` + the ellipsis + `itemsAfterCollapse`, whatever `maxItems`
says — those two props are the ones that size the result:

<!-- example:CollapseWindow -->
```tsx
<Breadcrumbs maxItems={4} itemsBeforeCollapse={2} itemsAfterCollapse={2}>
  <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
  <Breadcrumbs.Item href="/customers">Customers</Breadcrumbs.Item>
  <Breadcrumbs.Item href="/customers/acme">Acme Corp</Breadcrumbs.Item>
  <Breadcrumbs.Item href="/customers/acme/invoices">Invoices</Breadcrumbs.Item>
  <Breadcrumbs.Item href="/customers/acme/invoices/2043">INV-2043</Breadcrumbs.Item>
  <Breadcrumbs.Item current>Line items</Breadcrumbs.Item>
</Breadcrumbs>
```
<!-- /example -->

Both fences above set `maxItems={4}` over the same six crumbs. The first renders
`Home / … / Line items`; the second, `Home / Customers / … / INV-2043 / Line items`.

## Crumbs that aren't links

Omit both `href` and `current` for a level that has no page of its own — a grouping
segment you want in the trail but can't navigate to:

<!-- example:NonNavigableCrumb -->
```tsx
<Breadcrumbs>
  <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
  <Breadcrumbs.Item>Settings</Breadcrumbs.Item>
  <Breadcrumbs.Item current>Billing</Breadcrumbs.Item>
</Breadcrumbs>
```
<!-- /example -->

## Routing

`Breadcrumbs.Item` does **not** hard-code an `<a href>`. It calls `useLink()` and renders
whatever `Link` the router adapter supplies, passing your `href` as that component's `to`.
With no `RouterAdapterProvider` above it the adapter falls back to a plain `<a href>`, so
in a single-page app every crumb click is a **full document load** that throws away your
client state. Wrap the app once and the same markup routes client-side instead — `AppLink`
below is your router's own `Link` (react-router's, Next's, TanStack's) wrapped to take
`to` and `replace`:

<!-- example:WithRouterAdapter -->
```tsx
<RouterAdapterProvider value={{ Link: AppLink }}>
  <Breadcrumbs>
    <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
    <Breadcrumbs.Item href="/customers">Customers</Breadcrumbs.Item>
    <Breadcrumbs.Item current>Acme Corp</Breadcrumbs.Item>
  </Breadcrumbs>
</RouterAdapterProvider>
```
<!-- /example -->

This is the same one-time setup `AppShell.SidebarLink` and
[RequireAuth](require-auth.md)'s default redirect use; the full adapter recipe, including
`usePathname`, is in the package README and `AGENTS.md`. Breadcrumbs itself never calls
`usePathname` — see [Gotchas](#gotchas).

## Theme tokens

Breadcrumbs uses **no Tailwind utilities** — every rule lives in `Breadcrumbs.css` and
reads a contract variable directly, the way [Tabs](tabs.md) and
[ActivityFeed](activity-feed.md) do. Override any of these and the trail re-tints with the
rest of the app, at runtime, with no rebuild.

| Where                     | Override                                                            |
| ------------------------- | ------------------------------------------------------------------- |
| Link ink                  | `--C-TEXT-SECONDARY` at rest · `--C-ACCENT` on hover                |
| Non-link crumb ink        | `--C-TEXT-SECONDARY`                                                 |
| Current crumb             | `--C-TEXT-PRIMARY` · `--Semibold-Weight`                             |
| Separator ink             | `--C-TEXT-MUTED`                                                     |
| Ellipsis button           | `--C-TEXT-MUTED` at rest · `--C-TEXT-SECONDARY` and `--C-SURFACE-1` on hover |
| Focus outline             | `--C-BORDER-FOCUS`                                                   |
| Corners                   | `--RADIUS-SM`                                                        |
| Item gap · ellipsis inset | `--R-SIZE-6`                                                         |
| Type                      | `--BodyText-2` · `--BodyText-2-line-height`                          |
| Motion                    | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT`                    |

The trail sets **no background**: it inks text tokens onto whatever surface you drop it on.
`--R-SIZE-6` is the one rung of the responsive `r`-scale that holds at `0.25rem` on both
sides of the 40rem breakpoint, so the gaps between crumbs don't grow on desktop — but the
type does (`--BodyText-2` steps `0.8125rem` → `0.875rem`, its line-height `1.5rem` →
`1.75rem`), and so does the current crumb's weight, because `--Semibold-Weight` is itself
responsive (`500` → `600`). The link's colour transition and the ellipsis's colour and
background transitions are all dropped under `prefers-reduced-motion: reduce`.

The ellipsis button starts from `all: unset` and rebuilds itself from those tokens, so it
inherits nothing from a UA stylesheet — but its `1.5em` min-width and `0.1em`
letter-spacing are `em`-relative literals rather than contract variables, tracking
`--BodyText-2` instead of being themeable in their own right.

## Gotchas

- **No adapter means a full page reload per crumb.** The default `Link` is a plain
  `<a href>`; in an SPA that is a document load, not a route change. See
  [Routing](#routing). The `Link` is also handed only `to` and a class name, so there is no
  way to ask for a history-replacing navigation from an `Item`.
- **`aria-current` is entirely on you.** Breadcrumbs never reads the current URL — it does
  not call `usePathname`, and nothing compares an `href` to the location. Forget `current`
  on the last crumb and the trail announces as a row of links with no "you are here".
- **`current` beats `href`.** Pass both and the item renders the `<span aria-current="page">`;
  the `href` is silently dropped and the crumb is not clickable. Usually what you want for
  the current page, but it is a precedence rule, not a merge.
- **`maxItems` is a threshold, not a ceiling.** With the default window,
  `<Breadcrumbs maxItems={2}>` over four children still renders three slots —
  `first / … / last`. Size the visible trail with `itemsBeforeCollapse` and
  `itemsAfterCollapse`.
- **Overlapping windows duplicate a crumb.** The two slices are taken independently from
  the head and tail of the child list with no overlap check, so when
  `itemsBeforeCollapse + itemsAfterCollapse` reaches the number of children while collapse
  is active, a crumb renders on **both** sides of the ellipsis —
  `maxItems={2} itemsBeforeCollapse={2} itemsAfterCollapse={2}` over three crumbs produces
  `A / B / … / B / C`, with the duplicate carrying the same React key as the original. Keep
  the two windows summing below your shortest trail.
- **Expanding is one-way, and it sticks.** The ellipsis sets an internal `expanded` flag to
  `true` and there is no path back — no `expanded`/`onExpandedChange` prop, and no reset
  when `children` change. Keep one `Breadcrumbs` mounted across navigations and the first
  expansion leaves every later trail expanded too. `key={pathname}` on the root restores
  collapsing per page.
- **Don't render `Breadcrumbs.Separator` yourself.** The root already interleaves one
  between every child *and counts yours as a child*, so a hand-placed separator comes out
  as three separators in a row (`/ › /`) and pushes the trail closer to `maxItems`. It is
  on the public object because the root renders it internally; there is no composition that
  uses it correctly. Change the glyph with the root's `separator` prop.
- **The `<ol>` and the inner elements are unreachable.** Everything you pass lands on the
  `<nav>` or on an `<li>`; nothing you can pass reaches the list itself or the `<a>`/`<span>`
  inside a crumb. So there is no `role`, `className` or `data-*` on the `<ol>` (see
  [Accessibility](#accessibility)) and no `target`, `rel` or `download` on a crumb's anchor.
  The root's own `.breadcrumbs` class carries **no rules at all** — every declaration in
  `Breadcrumbs.css` targets a `.breadcrumbs__*` descendant — so `className` on the root
  positions the block but cannot restyle a crumb; use a descendant selector for that.
- **Both sub-parts throw outside the root.** `Item` and `Separator` call the context hook
  and throw `"Breadcrumbs compound components must be used within <Breadcrumbs>"`. Neither
  actually *uses* what the context carries — the check is the whole point of it — so wrapping
  them in your own components is fine as long as the root is somewhere above.
- **Client component.** `Breadcrumbs.tsx` opens with `"use client"` (the collapse state is a
  `useState`), so a server component can render it but it becomes a client boundary — and
  the router adapter it reads is a client module too.

## Accessibility

The landmark shape is right by default: a `<nav>` named `Breadcrumb`, a real `<ol>` so the
order is conveyed, and `aria-current="page"` on the crumb you mark `current`. The
`aria-label` is written *before* the rest props are spread, so passing your own `aria-label`
(or an `aria-labelledby`) overrides it — which you need if the page carries more than one
trail, or if the UI isn't in English.

- **Separators are not announced, and that is done the reliable way.** Each one is its own
  `<li role="presentation">` holding a `<span aria-hidden="true">`, so the glyph stays a real
  text node — it survives a stylesheet failing to load and it comes along when you select and
  copy the trail — while being removed from the accessibility tree. A reader hears
  "Home, Customers, Acme Corp", not "Home slash Customers slash Acme Corp". A CSS `::before`
  glyph would be the fragile alternative: Chrome, Firefox and Safari all expose generated
  content to assistive tech, inconsistently, and you cannot mark it `aria-hidden`. Compare
  [Kbd](kbd.md), where the separator between two keycaps is *meaning* and is therefore left
  audible — here it is punctuation, so it is hidden.
- **`list-style: none` can strip the list role, and you cannot patch it here.** The `<ol>`
  hides its markers in CSS, which in Safari + VoiceOver drops the `list`/`listitem` semantics —
  the same WebKit quirk that hits [ActivityFeed](activity-feed.md). ActivityFeed at least lets
  you pass `role="list"` through to its `<ol>`; this component's rest props stop at the
  `<nav>`, so there is no escape hatch. The `Breadcrumb` landmark and `aria-current` still
  carry the meaning; what you lose is "list, 3 items" counting. Note also that the separator
  `<li>`s are `role="presentation"`, so they are not exposed as list items even where the
  role survives.
- **The ellipsis is a real button, with two gaps.** It is a `<button type="button">` — so it
  is keyboard-reachable and will not submit an enclosing form — labelled
  `"Show more breadcrumbs"`. But it carries no `aria-expanded`, so a screen reader is not told
  it is a disclosure control, and that label is a hard-coded English string with no prop to
  change it: it stays English in a localised app.
- **Muted ink fails contrast, and one use of it is interactive.** Separators and the ellipsis
  button both paint `--C-TEXT-MUTED`, measured at 2.10:1–2.59:1 on `--C-SURFACE-0` across the
  four shipped themes and down to 1.75:1 on `--C-SURFACE-3` — under AA's 4.5:1 and AA-large's
  3:1 everywhere. Decorative separators can live with that; the ellipsis is the one control on
  the trail a user has to find, and it is below the legibility floor.
- **Nothing marks a crumb as clickable at rest.** A link and a plain text crumb are both
  `--C-TEXT-SECONDARY` with no underline; the underline and `--C-ACCENT` arrive only on hover.
  Only the current crumb is visually distinct (primary ink, semibold). If which crumbs
  navigate matters, restyle `.breadcrumbs__link` — a resting underline is the usual fix.
- **Focus is `:focus-visible` only** on both the link and the ellipsis: a 2px
  `--C-BORDER-FOCUS` outline at 2px offset, which paints outside the box and so never
  reflows the row.

## Related

`Pagination` · `Stepper` · `AppShell` · [Tabs](tabs.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
