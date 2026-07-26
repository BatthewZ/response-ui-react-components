# Checkbox

A checkbox whose tick follows your accent colour with nothing to wire up. It is a thin
wrapper over the native `<input type="checkbox">` — every input prop passes straight
through, so `checked`, `onChange`, `name`, and `aria-*` behave exactly as they do
natively.

<!-- example:Minimal -->
```tsx
<label className="flex items-center gap-r2">
  <Checkbox defaultChecked />
  Email me about product updates
</label>
```
<!-- /example -->

| Prop        | Type                      | Default |
| ----------- | ------------------------- | ------- |
| `className` | `string`                  | —       |
| `ref`       | `Ref<HTMLInputElement>`   | —       |
| …rest       | props of `<input>`        | —       |

The `type` is fixed to `"checkbox"` and is the only input prop removed from the type;
everything else — `checked`, `defaultChecked`, `disabled`, `onChange`, `name`, `value`,
`required`, `aria-*` — spreads onto the underlying `<input>`. Checkbox adds **no** props
of its own, and no label: it has two sharp edges around theming and one around
`indeterminate`. See [Gotchas](#gotchas).

## Controlled

Pass `checked` with an `onChange` to own the state; omit both and pass `defaultChecked`
for an uncontrolled box (as in the example above).

<!-- example:Controlled -->
```tsx
<label className="flex items-center gap-r2">
  <Checkbox
    checked={subscribed}
    onChange={(e) => setSubscribed(e.target.checked)}
  />
  Send me the weekly summary
</label>
```
<!-- /example -->

## Disabled

`disabled` is a native passthrough — Checkbox adds no `disabled:` styling of its own, so
the greyed, non-interactive look is whatever the browser draws for the current
`color-scheme`.

<!-- example:Disabled -->
```tsx
<div className="flex flex-col gap-r2">
  <label className="flex items-center gap-r2">
    <Checkbox disabled />
    Currently unavailable
  </label>
  <label className="flex items-center gap-r2">
    <Checkbox disabled defaultChecked />
    Locked on by your plan
  </label>
</div>
```
<!-- /example -->

## Indeterminate

There is no `indeterminate` prop. It is a DOM property with no matching HTML attribute,
so React can't set it from JSX — reach for the forwarded `ref` and set it after mount.

<!-- example:Indeterminate -->
```tsx
<label className="flex items-center gap-r2">
  <Checkbox ref={ref} aria-label="Select all invoices" />
  Select all
</label>
```
<!-- /example -->

## Theme tokens

Checkbox has no `.css` file; every entry below is a Tailwind utility in the `.tsx` that
resolves to a contract variable, so overriding the variable re-tints the box with the
rest of the app.

| Where              | Utility                  | Override            |
| ------------------ | ------------------------ | ------------------- |
| Tick fill (checked) | `accent-accent`         | `--C-ACCENT`        |
| Box border         | `border-border-strong`   | `--C-BORDER-STRONG` |
| Corner radius      | `rounded-sm`             | `--RADIUS-SM`       |
| Focus ring         | `focus-visible:ring-border-focus` | `--C-BORDER-FOCUS`  |

The box is a fixed `size-4` (1rem) — a Tailwind spacing value, not a contract token, so
resize it with `className="size-…"` rather than a theme variable.

**The reliably-themed surface is the tick, not the box.** `accent-accent` sets the CSS
`accent-color` property, which browsers honour on native checkboxes across the board — so
the checked fill always follows `--C-ACCENT`. The `border-border-strong` and `rounded-sm`
utilities do **not** get the same guarantee: the component keeps the browser's native
checkbox (there is no `appearance-none`), and every current engine draws its own box and
ignores an author `border` / `border-radius` on it. Those two rows are reachable and would
re-tint if they rendered, but on a default-appearance checkbox they are widely a no-op.
See [Gotchas](#gotchas).

## Gotchas

- **The themed border and radius usually don't render.** Without `appearance-none` the
  checkbox stays a native control, and Chrome, Firefox, and Safari all draw their own box
  and ignore the `border-border-strong` / `rounded-sm` utilities. `size-4` (dimensions)
  and `accent-accent` (`accent-color`) do apply; the border and corner radius largely do
  not. If you need a fully custom box, add `appearance-none` and draw the check yourself.
- **The focus ring sits flush against the box.** It is a 2px `--C-BORDER-FOCUS` ring at
  `ring-offset-0`, so no gap is reserved and `--tw-ring-offset-color` is never painted. Open
  a gap with a `ring-offset-*` utility and you inherit that variable, which
  `@batthewz/response-ui-css` themes to `--C-SURFACE-0` — correct where the checkbox sits on
  surface-0, and a visible band of the wrong colour anywhere else.
- **The ring is `focus-visible:`, not `focus:`.** Like [Button](button.md), and unlike the
  text controls ([Input](./input.md), [Textarea](textarea.md)), a mouse click focuses the box
  without painting the ring — keyboard focus paints it. That is the browser's own
  `:focus-visible` rule, which grants a text field an indicator on click but not a checkbox.
- **`indeterminate` is not a prop.** Set it via the `ref` after mount (see above); passing
  it as a prop does nothing, because it is a DOM property with no HTML attribute.
- **No built-in label.** Checkbox renders a bare `<input>` — give it an accessible name
  yourself (see [Accessibility](#accessibility)).
- **No per-component CSS.** There is no `Checkbox.css`. The CSS imports from
  `@batthewz/response-ui-css` are still required — the utilities above resolve to its
  tokens.
- **Server-renderable.** No `"use client"` and no hooks, so it works directly in an RSC
  tree.

## Accessibility

Checkbox has no label of its own, so always give it an accessible name: wrap the box and
its text in one `<label>` (implicit association, as in every example here), pair a
sibling [Label](label.md) via `htmlFor`/`id`, or pass `aria-label` / `aria-labelledby` when the box
stands alone.

Keyboard and screen-reader behaviour is the browser's native checkbox: it is focusable,
toggles with `Space`, and exposes its checked / unchecked / mixed state to assistive tech.
For a tri-state box, setting `.indeterminate` also reports `aria-checked="mixed"` for free
— no extra ARIA needed.

The focus ring is `focus-visible:`, so it paints on keyboard focus and not on a pointer
click — the browser's rule for a control that is not text entry. Its colour is
`--C-BORDER-FOCUS` and it is drawn flush against the box.

## Related

[Radio](radio.md) · [Switch](switch.md) · [Field](field.md) · [Label](label.md) ·
[Input](./input.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
