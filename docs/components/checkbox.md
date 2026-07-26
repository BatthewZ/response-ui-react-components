# Checkbox

A checkbox whose tick follows your accent colour with nothing to wire up. It is a thin
wrapper over the native `<input type="checkbox">` — every input prop passes straight
through, so `checked`, `onChange`, `name`, and `aria-*` behave exactly as they do
natively — and inside a [Field](field.md) it picks up that field's `aria-invalid` and
`aria-describedby` on its own.

<!-- example:Minimal -->
```tsx
<label className="flex items-center gap-r2">
  <Checkbox defaultChecked />
  Email me about product updates
</label>
```
<!-- /example -->

| Prop        | Type                      | Default              |
| ----------- | ------------------------- | -------------------- |
| `error`     | `boolean`                 | the `Field`'s state  |
| `className` | `string`                  | —                    |
| `ref`       | `Ref<HTMLInputElement>`   | —                    |
| …rest       | props of `<input>`        | —                    |

The `type` is fixed to `"checkbox"` and is the only input prop removed from the type;
everything else — `checked`, `defaultChecked`, `disabled`, `onChange`, `name`, `value`,
`required`, `aria-*` — spreads onto the underlying `<input>`. `error` is the one prop
Checkbox adds, and it is the same one [Input](./input.md), [Select](select.md) and
[Textarea](textarea.md) take: it marks the box invalid without a [Field](field.md) around
it. There is no label: it has one sharp edge around theming and one around
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

## Inside a Field

Drop a Checkbox in a [Field](field.md) and it takes that field's invalid state and the id of
the rendered [FieldError](field-error.md) without a prop from you — the same wiring
[Input](./input.md) and [Select](select.md) get:

<!-- example:InField -->
```tsx
<Field error="Accept the terms to continue.">
  <label className="flex items-center gap-r2">
    <Checkbox name="terms" />
    I accept the terms of service
  </label>
  <FieldError />
</Field>
```
<!-- /example -->

Outside a [Field](field.md), `error` marks the box invalid on its own; inside one it
overrides the field — pass `error={false}` to opt a single box out of a field-wide error.

## Theme tokens

Checkbox has no `.css` file; every entry below is a Tailwind utility in the `.tsx` that
resolves to a contract variable, so overriding the variable re-tints the box with the
rest of the app.

| Where              | Utility                  | Override            |
| ------------------ | ------------------------ | ------------------- |
| Tick fill (checked) | `accent-accent`         | `--C-ACCENT`        |
| Focus ring         | `focus:ring-border-focus` | `--C-BORDER-FOCUS`  |

The box is a fixed `size-4` (1rem) — a Tailwind spacing value, not a contract token, so
resize it with `className="size-…"` rather than a theme variable.

**The themed surface is the tick, not the box.** `accent-accent` sets the CSS
`accent-color` property, which browsers honour on native checkboxes across the board — so
the checked fill always follows `--C-ACCENT`. The box itself is the browser's: there is no
`appearance-none` here, and Checkbox therefore ships no resting `border-*` or `rounded-*`
utility, matching [Radio](radio.md). It used to carry `border-border-strong` and
`rounded-sm`, and they never rendered — measured in Firefox 146 and Chrome 144, a native
checkbox paints byte-for-byte identically with and without them, checked or unchecked,
while the same declarations under `appearance: none` render fine. A table row for a
variable that cannot reach a pixel is worse than no row, so both are gone. If you want a
box you can theme, add `appearance-none` and draw the check yourself.

## Gotchas

- **The box is the browser's, so an author `border` / `border-radius` on it does nothing.**
  Without `appearance-none` the checkbox stays a native control: `size-4` (dimensions) and
  `accent-accent` (`accent-color`) apply, a border and corner radius do not — measured
  identical, not merely "widely a no-op". A `className` that adds them will not render
  either; add `appearance-none` alongside and draw the check yourself.
- **The focus ring sits flush against the box.** It is a 2px `--C-BORDER-FOCUS` ring at
  `ring-offset-0`, so no gap is reserved and `--tw-ring-offset-color` is never painted. Open
  a gap with a `ring-offset-*` utility and you inherit that variable, which
  `@batthewz/response-ui-css` themes to `--C-SURFACE-0` — correct where the checkbox sits on
  surface-0, and a visible band of the wrong colour anywhere else.
- **The ring is `focus:`, not `focus-visible:`.** Like [Input](./input.md) — and unlike
  [Button](button.md) — it appears on pointer clicks as well as keyboard focus. That is the
  point of the split: the browser's own `:focus-visible` rule grants a *text field* an
  indicator on click but not a checkbox, so keying the form controls on plain `:focus` is
  the only way to make a clicked checkbox ring like a clicked input.
- **The UA outline stays.** Checkbox adds no `outline-none`, so the browser's own focus
  outline is drawn alongside the ring. That is deliberate: the outline is contrast-adaptive
  and survives forced-colours mode, where a `box-shadow` ring does not.
- **`indeterminate` is not a prop.** Set it via the `ref` after mount (see above); passing
  it as a prop does nothing, because it is a DOM property with no HTML attribute.
- **No built-in label.** Checkbox renders a bare `<input>` — give it an accessible name
  yourself (see [Accessibility](#accessibility)).
- **No per-component CSS.** There is no `Checkbox.css`. The CSS imports from
  `@batthewz/response-ui-css` are still required — the utilities above resolve to its
  tokens.
- **Client component.** Reading [Field](field.md) context is a hook, so Checkbox carries
  `"use client"` like the other wired controls and needs a client boundary in an RSC tree.
  It was server-renderable before it read the field.

## Accessibility

Checkbox has no label of its own, so always give it an accessible name: wrap the box and
its text in one `<label>` (implicit association, as in every example here), pair a
sibling [Label](label.md) via `htmlFor`/`id`, or pass `aria-label` / `aria-labelledby` when the box
stands alone.

Keyboard and screen-reader behaviour is the browser's native checkbox: it is focusable,
toggles with `Space`, and exposes its checked / unchecked / mixed state to assistive tech.
For a tri-state box, setting `.indeterminate` also reports `aria-checked="mixed"` for free
— no extra ARIA needed.

Because the focus ring is `focus:` rather than `focus-visible:`, it shows on click as well
as keyboard focus. Its colour is `--C-BORDER-FOCUS` and it is drawn flush against the box
at `ring-offset-0`, so nothing paints in a gap. The browser's own outline is not removed,
so keyboard users get both indicators.

Inside an invalid [Field](field.md), Checkbox announces the state and the reason: it takes
`aria-invalid="true"` and an `aria-describedby` pointing at the rendered
[FieldError](field-error.md), so a screen-reader user hears the message on the control
rather than only when the alert fires. ARIA 1.2 supports `aria-invalid` on the `checkbox`
role, which is why this box carries it and [Radio](radio.md) — whose `radio` role does not —
carries the description alone.

## Related

[Radio](radio.md) · [Switch](switch.md) · [Field](field.md) · [Label](label.md) ·
[Input](./input.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
