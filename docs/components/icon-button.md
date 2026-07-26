# IconButton

A transparent-backed `<button>` sized for a single glyph — toolbars, dismiss affordances,
row actions. Unlike a bare `<button>`, it **cannot compile without a name** — `aria-label`
or `aria-labelledby`, your choice. An empty one still satisfies the type, so the compiler's
guarantee is structural; a dev-time warning covers the rest.

<!-- example:Minimal -->
```tsx
<IconButton type="button" aria-label="Dismiss notification" onClick={dismiss}>
  <X size={16} aria-hidden="true" />
</IconButton>
```
<!-- /example -->

| Prop              | Type                                            | Default |
| ----------------- | ----------------------------------------------- | ------- |
| `aria-label`      | `string` — **required unless `aria-labelledby`** | —       |
| `aria-labelledby` | `string` — **required unless `aria-label`**      | —       |
| `children`        | `ReactNode` (your icon)                         | —       |
| `className`       | `string`                                        | —       |
| `ref`             | `Ref<HTMLButtonElement>`                        | —       |
| …rest             | every other `<button>` prop                     | —       |

## Naming the button

An icon carries no name, so the type demands one of the two ARIA name sources and accepts
either. Reach for `aria-labelledby` when the words already exist on the page — a section
heading a toolbar belongs to, a row's own cell — rather than restating them:

```tsx
<h2 id="filters-heading">Filters</h2>
<IconButton aria-labelledby="filters-heading">
  <SlidersHorizontal size={16} aria-hidden="true" />
</IconButton>
```

Pass both and `aria-labelledby` wins the accessible-name computation, so the `aria-label`
becomes the string nobody hears — keep them in sync or pass one.

## What it owns, and what it forwards

IconButton destructures exactly one prop — `className` — and spreads everything else onto
the element. So `type`, `disabled`, `onClick`, `form`, `name`, `value`, `data-*`, and any
`aria-*` land on the real `<button>` untouched, and `ref` points at the `HTMLButtonElement`
itself. The only thing it does with `className` is *merge* it: your utilities run through
`tailwind-merge`, so a padding or colour utility replaces the built-in one rather than
fighting it in the cascade.

**It is not a [Button](button.md) wrapper.** IconButton imports nothing from Button; it
renders its own `<button>` with its own class string. There is no `variant`, no `size`, and
no `as` — `<IconButton variant="ghost">` and `<IconButton as="a">` are both type errors.
When you need a variant, a label beside the icon, or an anchor, reach for
[Button](button.md) with an icon child instead.

## A row of actions

The typical use: repeated, low-emphasis actions where a text label would crowd the row.
Each button still carries its own name, because the icons cannot supply one.

<!-- example:Toolbar -->
```tsx
<div className="flex items-center gap-r6">
  <IconButton type="button" aria-label="Edit article">
    <Pencil size={16} aria-hidden="true" />
  </IconButton>
  <IconButton type="button" aria-label="Share article">
    <Share2 size={16} aria-hidden="true" />
  </IconButton>
  <IconButton type="button" aria-label="Delete article">
    <Trash2 size={16} aria-hidden="true" />
  </IconButton>
  <IconButton type="button" aria-label="More actions">
    <MoreHorizontal size={16} aria-hidden="true" />
  </IconButton>
</div>
```
<!-- /example -->

## Inside a form

IconButton defaults to `type="button"`, so a button inside a `<form>` does not submit it.
Be explicit on the action that *should* submit:

<!-- example:InsideAForm -->
```tsx
<form onSubmit={runSearch}>
  <Input name="q" aria-label="Search articles" placeholder="Search articles" />
  <IconButton type="button" aria-label="Clear search" onClick={clearQuery}>
    <X size={16} aria-hidden="true" />
  </IconButton>
  <IconButton type="submit" aria-label="Search">
    <Search size={16} aria-hidden="true" />
  </IconButton>
</form>
```
<!-- /example -->

## Disabled

<!-- example:Disabled -->
```tsx
<IconButton type="button" aria-label="Move item up" disabled>
  <ChevronUp size={16} aria-hidden="true" />
</IconButton>
```
<!-- /example -->

`disabled` is the plain native attribute — the component adds no logic around it. It blocks
the click, drops the button to 50% opacity, and switches the cursor to `not-allowed`.

## Size and colour

There is no `size` prop; padding is the whole sizing story, and the padding utility you pass
wins the merge:

<!-- example:BiggerTarget -->
```tsx
<IconButton type="button" aria-label="Play episode" className="p-r3">
  <Play size={24} aria-hidden="true" />
</IconButton>
```
<!-- /example -->

The glyph is drawn in `currentColor` by icon sets like `lucide-react`, and the button inks
itself `text-fg-secondary`, so one `text-*` utility retints the icon and the button together:

<!-- example:Retinted -->
```tsx
<IconButton type="button" aria-label="Remove from cart" className="text-status-error">
  <Trash2 size={16} aria-hidden="true" />
</IconButton>
```
<!-- /example -->

## Theme tokens

IconButton is styled entirely with Tailwind utilities — there is no `IconButton.css`. Every
colour, radius, spacing, and timing value below resolves to a contract variable, so changing
the theme retints and reflows it with no rebuild.

| Where                           | Utility                           | Override             |
| ------------------------------- | --------------------------------- | -------------------- |
| Glyph ink (and `currentColor`)  | `text-fg-secondary`               | `--C-TEXT-SECONDARY` |
| Hover background                | `hover:bg-surface-2`              | `--C-SURFACE-2`      |
| Pressed background              | `active:bg-surface-3`             | `--C-SURFACE-3`      |
| Focus ring colour               | `focus-visible:ring-border-focus` | `--C-BORDER-FOCUS`   |
| Corner radius                   | `rounded-md`                      | `--RADIUS-MD`        |
| Padding — the entire hit area   | `p-r5`                            | `--R-SIZE-5`         |
| Transition                      | `duration-fast`                   | `--DURATION-FAST`    |

**No background at rest.** Only hover and press paint; at rest the button is transparent and
inks onto whichever surface it was dropped on. That is what lets it sit inside a
[Card](card.md), a [Toast](toast.md), or a table row without a wrapper — but it also means the resting
contrast is between `--C-TEXT-SECONDARY` and *your* background, not one the component controls.

**The padding is responsive.** `--R-SIZE-5` steps `0.5rem → 0.75rem` at the 40rem breakpoint,
so the same button is physically larger on desktop with no breakpoint utilities from you. It
is also the only thing setting the button's size — see [Gotchas](#gotchas).

**Four values are literals, not contract variables.** The press scale (`active:scale-95`), the
disabled dimming (`disabled:opacity-50`), the focus ring's 2px width, and its transparent rest
colour are all hard-coded — reasonable, since none of them are values a theme needs to own. The
ring's *offset* is `ring-offset-0`, so it draws flush against the button and never paints
`--tw-ring-offset-color` at all.

## Gotchas

- **Defaults to `type="button"`.** Dropping an IconButton into a form for a non-submitting
  job — clear a field, remove a row, dismiss a banner — no longer submits the form. Pass
  `type="submit"` explicitly when you do want it to.
- **`aria-label=""` compiles, and warns.** The type requires the *prop*, not a meaningful
  *value*, and TypeScript cannot say "non-empty string" about a value it only knows as
  `string` — so an empty literal, and a variable that is empty on some renders, both pass the
  compiler. IconButton checks at render instead: with no `aria-labelledby` and an
  `aria-label` that is empty or whitespace, it `console.warn`s that the button has no
  accessible name. That is a diagnostic, not a guard — the button still renders, unnamed.
- **One size only.** The component sets no `min-width` or `min-height`, so the hit area is
  purely your icon's box plus `p-r5`. A 16px icon yields a 32px target below the 40rem
  breakpoint and 40px above it. Size the target deliberately for touch — see
  [Accessibility](#accessibility).
- **The focus ring reserves no gap.** `focus-visible:ring-offset-0` draws it flush against
  the button, which is what an IconButton needs: the offset gap is a solid band of
  `--tw-ring-offset-color`, themed to `--C-SURFACE-0` by `@batthewz/response-ui-css`, and an
  IconButton is transparent at rest and lands on whatever surface you drop it on. Pass a
  `ring-offset-*` utility to open one anyway and you will see that band wherever the button
  is not sitting on surface-0. [Button](button.md), [Checkbox](checkbox.md),
  [ErrorBoundary](error-boundary.md) and [AvatarUpload](avatar-upload.md) share the same
  recipe.
- **The press animation is guarded.** `active:scale-95` shrinks the button on pointer-down,
  and `motion-reduce:active:scale-100` holds it still for anyone who asked for less motion
  (WCAG 2.3.3). Both utilities have the same specificity, so the guard wins on source order —
  Tailwind emits the `scale-100` rule after the `scale-95` one, and Firefox was measured
  pressing to `0.96` normally and to `1` under the reduced-motion query.
- **Server-renderable.** No `"use client"` directive and no hooks, so it drops straight into
  an RSC tree — including inside a server-rendered form.

## Accessibility

**The type enforces that a name source exists; a render-time check enforces that it says
something.** `IconButtonProps` is a two-member union — `aria-label` required, or
`aria-labelledby` required — intersected with `ComponentPropsWithRef<"button">`. A property
is optional in an intersection only when it is optional in *every* member, so the required
half of whichever member you match wins over the optional version React's `AriaAttributes`
contributes: passing neither, or `undefined`, is a compile error. What the compiler cannot
see is an empty *value*, so IconButton warns at render when it would have no name; see
[Gotchas](#gotchas).

- **Hide your icon.** IconButton renders `children` untouched and adds no `aria-hidden`. Icon
  sets that expose a `<title>` or `role="img"` will be announced on top of your label, so mark
  the glyph `aria-hidden="true"` — as [CopyButton](copy-button.md), [Carousel](carousel.md), and [Repeater](repeater.md) do inside this
  package. ([Toast](toast.md) and [Pagination](pagination.md) don't need to: `lucide-react` sets `aria-hidden="true"`
  itself on any icon rendered with no children and no a11y prop, and Toast's hand-rolled `<svg>`
  exposes no name either. Give a lucide icon an `aria-label` or a `<title>` child and it stops
  hiding itself — that is exactly when you need to mark it up yourself.)
- **Target size.** 32px below the 40rem breakpoint clears WCAG 2.5.8 (24×24, AA) but not 2.5.5
  (44×44, AAA). For touch-first surfaces, raise the padding rather than the icon size, so the
  glyph stays optically consistent with the rest of the toolbar.
- **Focus behaves like [Button](button.md#accessibility)** — `focus-visible` only, and a
  Tailwind ring is a `box-shadow`, so focusing never reflows the layout no matter what the
  ring does. `ring-transparent` at rest is a colour placeholder, not reserved space: on focus
  the ring's spread grows from 2px to 4px and a further 2px offset shadow paints beneath it.
  The unset offset colour is shared with Button, not an IconButton exception.
- **`disabled` removes the control from the tab order,** as the native attribute always does.
  A disabled icon-only button is therefore unreachable by Tab, though it stays in the
  accessibility tree — a screen reader's browse cursor still finds it and reads the name along
  with the disabled state. Fine for a transient state, worse when the reason matters. If the
  user needs to discover *why* it is unavailable, keep it enabled with `aria-disabled` and a
  no-op handler.

## Related

[Button](button.md) · [CopyButton](copy-button.md) · [Toast](toast.md) · [Pagination](pagination.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
