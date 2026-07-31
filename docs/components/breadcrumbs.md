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
every remaining child itself** — you never have to write a separator. Each `Breadcrumbs.Item`
is one `<li>` that picks one of three inner elements from its props, in this order: a
`<span aria-current="page">` if you pass `current`, an adapter `Link` if you pass `href`,
and a plain `<span>` if you pass neither.

| Part                    | Renders                    | Props                                                                                  |
| ----------------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| `Breadcrumbs`           | `<nav>` around an `<ol>`   | `separator?: ReactNode` = `"/"` · `maxItems?: number` · `itemsBeforeCollapse?: number` = `1` · `itemsAfterCollapse?: number` = `1` · `classNames?: { list?, ellipsis? }` — see [Slots](#slots) · **required** `children` (+ all `nav` props) |
| `Breadcrumbs.Item`      | `<li>`                     | `href?: string` · `current?: boolean` · `classNames?: { current?, link?, text? }` — see [Slots](#slots) (+ all `li` props) |
| `Breadcrumbs.Divider`   | `<li role="presentation">` | — (all `li` props). Interleaved for you; render one yourself only to override a single gap — see [Gotchas](#gotchas). |

`className`, `id`, `aria-*` and `ref` pass through on all three — the root's `ref` is an
`HTMLElement` on the `<nav>`, the parts' an `HTMLLIElement` on the `<li>`. The `<ol>` and
the inner `<a>`/`<span>` take no props, but their **classes** are reachable through
`classNames`; see [Slots](#slots).

> **`Breadcrumbs.Divider` was `Breadcrumbs.Separator`.** Renamed because the package spends
> one word on a rule between siblings — `DropdownMenu.Divider`, `ContextMenu.Divider` and the
> top-level [Divider](divider.md) all used it already, and shipping a second word for one
> concept is the defect the rename exists to remove. This is breaking: rename the call site.
> The root's `separator` **prop** is unchanged — it is the glyph, not the element.

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
`usePathname`, is in the package README and `AGENTS.md`. Breadcrumbs itself reads
`usePathname` only to reset the ellipsis expansion on navigation — never to decide which
crumb is current; see [Gotchas](#gotchas).

## Slots

`className` addresses the `<nav>` on the root and the `<li>` on a crumb. `classNames`
addresses the elements neither of those reaches. Class strings only, and the keys are typed,
so a misspelled one is a compile error rather than a prop that does nothing.

| On                 | Slot       | Element                        | What it addresses                              |
| ------------------ | ---------- | ------------------------------ | ---------------------------------------------- |
| `Breadcrumbs`      | `list`     | `ol.breadcrumbs__list`         | the list itself — the flex row the crumbs sit in |
| `Breadcrumbs`      | `ellipsis` | `button.breadcrumbs__ellipsis` | the "Show more breadcrumbs" control, present only while `maxItems` is collapsing the trail |
| `Breadcrumbs.Item` | `current`  | `span.breadcrumbs__current`    | the end crumb, the one carrying `aria-current="page"` |
| `Breadcrumbs.Item` | `link`     | `a.breadcrumbs__link`          | a crumb rendered with `href`                    |
| `Breadcrumbs.Item` | `text`     | `span.breadcrumbs__text`       | a crumb with neither `href` nor `current`       |

```tsx
<Breadcrumbs classNames={{ list: "gap-r4" }}>
  <Breadcrumbs.Item href="/" classNames={{ link: "no-underline" }}>Home</Breadcrumbs.Item>
  <Breadcrumbs.Item current classNames={{ current: "font-semibold" }}>Acme</Breadcrumbs.Item>
</Breadcrumbs>
```

A crumb renders exactly one of `current`/`link`/`text`, chosen from its own props, so each
gets its own key rather than one that would silently move as a crumb becomes the last one.
The rule between crumbs takes no slot — it is `Breadcrumbs.Divider`, with its own `className`.

Prefer a token where the change is a value: the whole trail re-inks from the variables in
[Theme tokens](#theme-tokens), which reaches every breadcrumb rather than one call site.

## Theme tokens

`Breadcrumbs.css` is gone: every rule it held is now a Tailwind utility on the element it
paints, and each one resolves to a contract variable. Override any of these and the trail
re-tints with the rest of the app, at runtime, with no rebuild.

| Where                     | Utility                                                          | Override                                            |
| ------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| Link ink                  | `text-fg-secondary` · `hover:text-accent`                        | `--C-TEXT-SECONDARY` at rest · `--C-ACCENT` on hover |
| Non-link crumb ink        | `text-fg-secondary`                                              | `--C-TEXT-SECONDARY`                                 |
| Current crumb             | `text-fg-primary` · `font-semibold`                              | `--C-TEXT-PRIMARY` · `--Semibold-Weight`             |
| Separator ink             | `text-fg-muted`                                                  | `--C-TEXT-MUTED`                                     |
| Ellipsis at rest          | `text-fg-muted`                                                  | `--C-TEXT-MUTED`                                     |
| Ellipsis on hover         | `hover:text-fg-secondary` · `hover:bg-surface-2`                 | `--C-TEXT-SECONDARY` · `--C-SURFACE-2`               |
| Focus outline             | `focus-visible:outline-border-focus`                             | `--C-BORDER-FOCUS`                                   |
| Corners                   | `rounded-sm`                                                     | `--RADIUS-SM`                                        |
| Item gap · ellipsis inset | `gap-r6` · `px-r6`                                               | `--R-SIZE-6`                                         |
| Type                      | `text-body-2`                                                    | `--BodyText-2` · `--BodyText-2-line-height`          |
| Motion                    | `duration-[var(--MOTION-DURATION-SHIFT)]`                        | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT`    |

The easing is `ease-[var(--MOTION-EASE-SHIFT)]`; `--MOTION-*` sits in no Tailwind namespace,
so both halves of the motion pair are read as custom properties rather than by token name.

The trail sets **no background**: it inks text tokens onto whatever surface you drop it on.
`--R-SIZE-6` is the one rung of the responsive `r`-scale that holds at `0.25rem` on both
sides of the 40rem breakpoint, so the gaps between crumbs don't grow on desktop — but the
type does (`--BodyText-2` steps `0.8125rem` → `0.875rem`, its line-height `1.5rem` →
`1.75rem`), and so does the current crumb's weight, because `--Semibold-Weight` is itself
responsive (`500` → `600`). The link's colour transition and the ellipsis's colour and
background transitions are all dropped under `prefers-reduced-motion: reduce`.

The ellipsis button used to start from `all: unset` and rebuild itself in fourteen
declarations. It now carries no reset at all: Tailwind's Preflight already gives a
`<button>` every property that rule restated — `box-sizing`, `margin`, `padding`, `border`,
`background-color`, `font`, `letter-spacing`, `color`, `border-radius` and `appearance` —
which is the same thing [Button](button.md) has always relied on. A reset could not have
been transposed anyway: Tailwind sorts arbitrary-property utilities last, so `[all:unset]`
in a class list lands *after* the declarations it is meant to precede and wipes them.

Its `1.5em` min-width and `0.1em` letter-spacing stay `em`-relative literals rather than
contract variables, tracking `--BodyText-2` instead of being themeable in their own right.

## Gotchas

- **No adapter means a full page reload per crumb.** The default `Link` is a plain
  `<a href>`; in an SPA that is a document load, not a route change. See
  [Routing](#routing). The `Link` is also handed only `to` and a class name, so there is no
  way to ask for a history-replacing navigation from an `Item`.
- **`aria-current` is entirely on you.** Breadcrumbs reads the pathname only to key the
  ellipsis-expansion state — nothing compares an `href` to the location. Forget `current`
  on the last crumb and the trail announces as a row of links with no "you are here".
- **`current` beats `href`.** Pass both and the item renders the `<span aria-current="page">`;
  the `href` is silently dropped and the crumb is not clickable. Usually what you want for
  the current page, but it is a precedence rule, not a merge.
- **`maxItems` is a threshold, not a ceiling.** With the default window,
  `<Breadcrumbs maxItems={2}>` over four children still renders three slots —
  `first / … / last`. Size the visible trail with `itemsBeforeCollapse` and
  `itemsAfterCollapse`.
- **Overlapping windows collapse to no collapse.** The head and tail are clamped so they
  cannot overlap: when `itemsBeforeCollapse + itemsAfterCollapse` reaches the number of
  children there is nothing left to hide, so the full trail renders with no ellipsis rather
  than repeating the middle crumb on both sides of one. `maxItems={2} itemsBeforeCollapse={2}
  itemsAfterCollapse={2}` over three crumbs renders `A / B / C`.
- **Expanding is one-way *for the trail it was made on*, and resets for the next.** The
  ellipsis records **which** trail was expanded — the current pathname plus the crumbs' own
  React keys — rather than a boolean, so navigating to a different route collapses the trail
  again with no `key={pathname}` on your side and no remount. There is still no
  `expanded`/`onExpandedChange` prop and no way to re-collapse the *same* trail. Two edges
  worth knowing: the pathname comes from the [router adapter](../extending.md), which without
  a provider reads `window.location.pathname` at render — so a hash router that never changes
  the pathname is seen only through the crumb keys; and a trail whose crumbs carry no `key` of
  their own falls back to positional keys (`.0`, `.1`, …), which two same-length trails share.
  Key your crumbs and both cases are covered.
- **Rendering `Breadcrumbs.Divider` yourself overrides one gap.** The root interleaves its
  own separator between every pair of crumbs, and a `Breadcrumbs.Divider` you place is used
  *instead of* the automatic one for that gap rather than in addition to it — it is not
  counted as a crumb, so it does not push the trail toward `maxItems`, and it does not come
  out as three separators in a row. A separator with no crumb after it has no gap to sit in
  and is dropped; one that ends up next to the collapsed ellipsis loses to the root's, because
  the gap it was written for is hidden. To change *every* glyph, use the root's `separator`
  prop — this is for the one-off.
- **The `<ol>` and the inner elements take no *props*, and that half still holds.** Everything
  you pass lands on the `<nav>` or on an `<li>`, so there is still no `role` or `data-*` on the
  `<ol>` (see [Accessibility](#accessibility)) and no `target`, `rel` or `download` on a
  crumb's anchor. **The class half is now answered:** `classNames` reaches the `<ol>`, the
  expand control, and each of the three shapes a crumb's inner element takes — see
  [Slots](#slots). The root's own `.breadcrumbs` class still carries **no styling at all** —
  every utility lands on a `.breadcrumbs__*` part — so `className` on the root positions the
  block and a slot restyles the part.
- **Both sub-parts throw outside the root.** `Item` and `Divider` call the context hook
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
- **`list-style: none` can strip the list role, so the `<ol>` carries `role="list"`.** Hiding
  the markers in CSS drops the `list`/`listitem` semantics in Safari + VoiceOver, and rest
  props stop at the `<nav>`, so the role is set on the `<ol>` by the component — there is no
  escape hatch and none is needed. Note that the separator
  `<li>`s are `role="presentation"`, so they are not exposed as list items even where the
  role survives.
- **The ellipsis is a real button, with two gaps.** It is a `<button type="button">` — so it
  is keyboard-reachable and will not submit an enclosing form — labelled
  `"Show more breadcrumbs"`. But it carries no `aria-expanded`, so a screen reader is not told
  it is a disclosure control, and that label is a hard-coded English string with no prop to
  change it: it stays English in a localised app.
- **Muted ink clears AA on the usual surfaces, and one use of it is interactive.** Separators
  and the ellipsis button both paint `--C-TEXT-MUTED`, measured against
  `@batthewz/response-ui-css` **v0.10.1** at **4.85:1–5.23:1** on `--C-SURFACE-0` across the
  four measured themes — over AA's 4.5:1, where it read 2.10–2.59 before **v0.10.0** retuned that
  token. **On `--C-SURFACE-3` it still falls short at 3.92:1–4.10:1**, so a trail rendered on the
  deepest surface rung is under AA though over AA-large's 3:1. Decorative separators can live
  with that either way; the ellipsis is the one control on the trail a user has to find, so if
  you place breadcrumbs on `--C-SURFACE-3`, give it its own ink.
- **Nothing marks a crumb as clickable at rest.** A link and a plain text crumb are both
  `--C-TEXT-SECONDARY` with no underline; the underline and `--C-ACCENT` arrive only on hover.
  Only the current crumb is visually distinct (primary ink, semibold). If which crumbs
  navigate matters, restyle `.breadcrumbs__link` — a resting underline is the usual fix.
- **Focus is `:focus-visible` only** on both the link and the ellipsis: a 2px
  `--C-BORDER-FOCUS` outline at 2px offset, which paints outside the box and so never
  reflows the row.

Measured against the default theme and the worked examples; these numbers do not transfer to
your own theme — re-check them against your values.

## Related

[Pagination](pagination.md) · [Stepper](stepper.md) · [AppShell](app-shell.md) · [Tabs](tabs.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
