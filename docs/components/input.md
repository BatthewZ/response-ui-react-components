# Input

A text input styled to your theme. On its own it is a native `<input>` with sensible
defaults; dropped inside a [Field](field.md) it inherits that field's error state — the red border,
`aria-invalid`, and the description link — from context, with no extra props.

<!-- example:Minimal -->
```tsx
<Input type="email" placeholder="you@company.com" aria-label="Work email" />
```
<!-- /example -->

| Prop        | Type                          | Default                 |
| ----------- | ----------------------------- | ----------------------- |
| `error`     | `boolean`                     | `Field` state, else `false` |
| `className` | `string`                      | —                       |
| `ref`       | `Ref<HTMLInputElement>`       | —                       |
| …rest       | props of `<input>`            | —                       |

`error` is the only prop Input adds; everything else is a passthrough `<input>`. One
sharp edge worth knowing — the label is **not** auto-associated. See [Gotchas](#gotchas).

## In a Field

[Field](field.md) owns the error. When it is invalid, Input reads `aria-invalid` and the id of the
[FieldError](field-error.md) from context automatically. The visible [Label](label.md), however, is your job: pair
its `htmlFor` with the input's `id`.

<!-- example:InField -->
```tsx
<Field error="Enter a valid email address.">
  <Label htmlFor="work-email">Work email</Label>
  <Input id="work-email" type="email" defaultValue="ada@" />
  <FieldError />
</Field>
```
<!-- /example -->

## Error state

Set `error` directly to style a standalone input as invalid.

<!-- example:ErrorState -->
```tsx
<Input error defaultValue="not-an-email" aria-label="Work email" />
```
<!-- /example -->

`error` **overrides** any [Field](field.md) it sits in — because the resolution is `error ??
field.invalid`, passing `error={false}` forces the input valid even inside an errored
field. Omit the prop entirely to inherit the field.

## Disabled

<!-- example:Disabled -->
```tsx
<Input disabled defaultValue="locked@company.com" aria-label="Work email" />
```
<!-- /example -->

## Native attributes

Input spreads every remaining prop onto the `<input>`, so `type`, `min`, `autoComplete`,
`onChange`, and the rest work exactly as they do natively.

<!-- example:Types -->
```tsx
<Input
  type="password"
  placeholder="Password"
  aria-label="Password"
  autoComplete="current-password"
/>
<Input type="number" min={1} max={99} placeholder="Quantity" aria-label="Quantity" />
<Input type="search" placeholder="Search orders" aria-label="Search orders" />
```
<!-- /example -->

## Theme tokens

Input hard-codes no colour, radius, or timing — every utility below resolves to a
contract variable, so overriding the variable re-tints the input at runtime with the rest
of the app. It has no `.css` file of its own; all of these are Tailwind utilities in the
`.tsx`.

| Where               | Utility                                             | Override                        |
| ------------------- | --------------------------------------------------- | ------------------------------- |
| Text                | `text-body-2` `text-fg-primary`                     | `--BodyText-2` `--C-TEXT-PRIMARY` |
| Placeholder         | `placeholder:text-fg-muted`                         | `--C-TEXT-MUTED`                |
| Fill                | `bg-surface-0`                                      | `--C-SURFACE-0`                 |
| Disabled fill       | `disabled:bg-surface-3`                             | `--C-SURFACE-3`                 |
| Border              | `border-border-strong`                              | `--C-BORDER-STRONG`             |
| Focus ring & border | `focus:ring-border-focus` `focus:border-border-focus` | `--C-BORDER-FOCUS` |
| Error border & ring | `border-status-error` `focus:ring-status-error` | `--C-STATUS-ERROR`          |
| Padding             | `px-r4` `py-r5`                                      | `--R-SIZE-4` `--R-SIZE-5`       |
| Corner radius       | `rounded-md`                                        | `--RADIUS-MD`                   |
| Transition          | `duration-fast`                                     | `--DURATION-FAST`               |

The default border is `--C-BORDER-STRONG`, not `--C-BORDER-DEFAULT` — inputs sit a step
higher-contrast than card edges. The error state swaps the resting border and the focus ring
to `--C-STATUS-ERROR`; it does not tint the fill. The swap covers `focus:border-*` too, so a
*focused* invalid input stays error-coloured throughout rather than showing a focus-coloured
border inside an error-coloured ring.

## Gotchas

- **The [Label](label.md) is not auto-associated.** [Field](field.md) wires the *error* (`aria-invalid`,
  `aria-describedby`) through context, but nothing links a [Label](label.md) to the input. Set
  `Label htmlFor="x"` and `Input id="x"` yourself, or clicking the label won't focus the
  input and screen readers won't announce it as the field's name.
- **Client Component, self-declared.** Input calls the `useFieldError` hook (it reads
  context), so it runs on the client — but it ships its own `"use client"`, so importing
  it straight from a Server Component works; React draws the boundary for you.
- **`error` overrides the field.** Resolution is `error ?? field.invalid`, so `error={false}`
  forces the input valid even inside an errored [Field](field.md). Omit it to inherit.
- **`aria-describedby` needs a rendered [FieldError](field-error.md).** Inside an errored [Field](field.md), Input
  points `aria-describedby` at the error element a [FieldError](field-error.md) actually mounted; if you
  don't render one (or the error has no content), the attribute is simply omitted — no
  dangling id, but no announced message either.
- **No per-component CSS.** There is no `Input.css`. Both CSS imports are still required —
  the utilities above resolve to tokens from `@batthewz/response-ui-css`.

## Accessibility

Input renders a bare `<input>` with no built-in label — always give it an accessible name,
via a [Field](field.md) + [Label](label.md) (with matching `htmlFor`/`id`), an `aria-label`, or
`aria-labelledby`.

When invalid it sets `aria-invalid="true"`, and inside a [Field](field.md) it also sets
`aria-describedby` to the [FieldError](field-error.md). Note the error is signalled **visually** only by
the border and ring colour; pair it with a visible [FieldError](field-error.md) message so users who can't
perceive the colour still learn what's wrong.

Focus shows a 2px ring in `--C-BORDER-FOCUS` plus a matching border; it is a `focus:` ring,
not `focus-visible:`, so it appears on click as well as keyboard focus.
`not-forced-colors:focus:outline-none` removes the browser's own outline, which is why the ring
has to be there — every native form control in the library is keyed this way, and
[Button](button.md) is not.

**In forced-colours mode the reset stands down and the browser's own outline stays.** The reset is `not-forced-colors:focus:outline-none`. It has to be: the ring is a `box-shadow`, which forced colours forces to `none`, so an unqualified reset would leave the control with no focus indicator at all in exactly the mode where indicators matter most (WCAG 2.4.7). Standing the reset down there is new — this control previously had no forced-colours affordance.

## Related

[Textarea](textarea.md) · [Field](field.md) · [Label](label.md) · [FieldError](field-error.md) · [NumberInput](number-input.md) · [SearchInput](search-input.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
