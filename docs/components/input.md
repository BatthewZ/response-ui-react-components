# Input

A text input styled to your theme. On its own it is a native `<input>` with sensible
defaults; dropped inside a `Field` it inherits that field's error state — the red border,
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

`error` is the only prop Input adds; everything else is a passthrough `<input>`. It has
two sharp edges worth knowing — the label is **not** auto-associated, and Input is not
server-renderable the way `Button` is. See [Gotchas](#gotchas).

## In a Field

`Field` owns the error. When it is invalid, Input reads `aria-invalid` and the id of the
`FieldError` from context automatically. The visible `Label`, however, is your job: pair
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

`error` **overrides** any `Field` it sits in — because the resolution is `error ??
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
| Focus ring & border | `focus:ring-border-focus` `focus:border-border-focus` | `--C-BORDER-FOCUS`           |
| Error border & ring | `border-status-error` `focus:ring-status-error`     | `--C-STATUS-ERROR`              |
| Padding             | `px-r4` `py-r5`                                      | `--R-SIZE-4` `--R-SIZE-5`       |
| Corner radius       | `rounded-md`                                        | `--RADIUS-MD`                   |
| Transition          | `duration-fast`                                     | `--DURATION-FAST`               |

The default border is `--C-BORDER-STRONG`, not `--C-BORDER-DEFAULT` — inputs sit a step
higher-contrast than card edges. The error state swaps the resting border and the focus ring
to `--C-STATUS-ERROR`; it does not tint the fill, and `focus:border-border-focus` survives
the swap, so a *focused* invalid input shows a focus-coloured border inside an error-coloured
ring.

## Gotchas

- **The `Label` is not auto-associated.** `Field` wires the *error* (`aria-invalid`,
  `aria-describedby`) through context, but nothing links a `Label` to the input. Set
  `Label htmlFor="x"` and `Input id="x"` yourself, or clicking the label won't focus the
  input and screen readers won't announce it as the field's name.
- **Not server-renderable.** Unlike `Button`, Input calls the `useFieldError` hook (it
  reads context), so it must run inside a Client Component. It ships **no** `"use client"`
  of its own, so rendering it directly from a Server Component with no client ancestor
  throws. In a normal client-side form tree this never comes up.
- **`error` overrides the field.** Resolution is `error ?? field.invalid`, so `error={false}`
  forces the input valid even inside an errored `Field`. Omit it to inherit.
- **`aria-describedby` needs a rendered `FieldError`.** Inside an errored `Field`, Input
  points `aria-describedby` at the field's error id; if you don't render `FieldError` (or
  give the error no content), that id resolves to nothing.
- **No per-component CSS.** There is no `Input.css`. Both CSS imports are still required —
  the utilities above resolve to tokens from `@batthewz/response-ui-css`.

## Accessibility

Input renders a bare `<input>` with no built-in label — always give it an accessible name,
via a `Field` + `Label` (with matching `htmlFor`/`id`), an `aria-label`, or
`aria-labelledby`.

When invalid it sets `aria-invalid="true"`, and inside a `Field` it also sets
`aria-describedby` to the `FieldError`. Note the error is signalled **visually** only by
the border and ring colour; pair it with a visible `FieldError` message so users who can't
perceive the colour still learn what's wrong.

Focus shows a 2px ring in `--C-BORDER-FOCUS` plus a matching border; it is a `focus:` ring,
not `focus-visible:`, so it appears on click as well as keyboard focus.

## Related

`Textarea` · `Field` · `Label` · `FieldError` · `NumberInput` · `SearchInput` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
