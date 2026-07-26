# Textarea

A multi-line text field styled to your theme. On its own it is a native `<textarea>` with
sensible defaults — a ~6.25rem minimum height and a vertical resize handle; dropped inside a
[Field](field.md) it inherits that field's error state — the red border, `aria-invalid`, and the
description link — from context, with no extra props.

<!-- example:Minimal -->
```tsx
<Textarea placeholder="Share your feedback…" aria-label="Feedback" />
```
<!-- /example -->

| Prop        | Type                          | Default                     |
| ----------- | ----------------------------- | --------------------------- |
| `error`     | `boolean`                     | `Field` state, else `false` |
| `className` | `string`                      | —                           |
| `ref`       | `Ref<HTMLTextAreaElement>`    | —                           |
| …rest       | props of `<textarea>`         | —                           |

`error` is the only prop Textarea adds; everything else is a passthrough `<textarea>`. It
has two sharp edges worth knowing — the label is **not** auto-associated, and Textarea is
not server-renderable the way [Button](button.md) is. See [Gotchas](#gotchas).

## In a Field

[Field](field.md) owns the error. When it is invalid, Textarea reads `aria-invalid` and the id of the
[FieldError](field-error.md) from context automatically. The visible [Label](label.md), however, is your job: pair its
`htmlFor` with the textarea's `id`.

<!-- example:InField -->
```tsx
<Field error="Tell us a little about yourself.">
  <Label htmlFor="bio">Bio</Label>
  <Textarea id="bio" rows={4} placeholder="A sentence or two…" />
  <FieldError />
</Field>
```
<!-- /example -->

## Error state

Set `error` directly to style a standalone textarea as invalid.

<!-- example:ErrorState -->
```tsx
<Textarea error defaultValue="Too short." aria-label="Bio" />
```
<!-- /example -->

`error` **overrides** any [Field](field.md) it sits in — because the resolution is `error ??
field.invalid`, passing `error={false}` forces the textarea valid even inside an errored
field. Omit the prop entirely to inherit the field.

## Disabled

<!-- example:Disabled -->
```tsx
<Textarea disabled defaultValue="Comments are closed for this thread." aria-label="Comment" />
```
<!-- /example -->

## Sizing and resize

The box starts at least ~6.25rem tall and users can drag it taller (never wider) with the
built-in `resize-y` handle. Every native `<textarea>` attribute passes through, so `rows`
sets the initial height and `maxLength`, `onChange`, and the rest behave exactly as they do
natively.

<!-- example:Sizing -->
```tsx
<Textarea rows={8} maxLength={500} placeholder="Up to 500 characters…" aria-label="Description" />
```
<!-- /example -->

## Theme tokens

Textarea hard-codes no colour, radius, or timing — every utility below resolves to a
contract variable, so overriding the variable re-tints the textarea at runtime with the rest
of the app. It has no `.css` file of its own; all of these are Tailwind utilities in the
`.tsx`.

| Where               | Utility                                             | Override                          |
| ------------------- | --------------------------------------------------- | --------------------------------- |
| Text                | `text-body-2` `text-fg-primary`                     | `--BodyText-2` `--C-TEXT-PRIMARY` |
| Placeholder         | `placeholder:text-fg-muted`                         | `--C-TEXT-MUTED`                  |
| Fill                | `bg-surface-0`                                      | `--C-SURFACE-0`                   |
| Disabled fill       | `disabled:bg-surface-3`                             | `--C-SURFACE-3`                   |
| Border              | `border-border-strong`                              | `--C-BORDER-STRONG`               |
| Focus ring & border | `focus-visible:ring-border-focus` `focus-visible:border-border-focus` | `--C-BORDER-FOCUS` |
| Error border & ring | `border-status-error` `focus-visible:ring-status-error` | `--C-STATUS-ERROR`            |
| Padding             | `px-r4` `py-r5`                                      | `--R-SIZE-4` `--R-SIZE-5`         |
| Corner radius       | `rounded-md`                                        | `--RADIUS-MD`                     |
| Transition          | `duration-fast`                                     | `--DURATION-FAST`                 |

The default border is `--C-BORDER-STRONG`, not `--C-BORDER-DEFAULT` — inputs sit a step
higher-contrast than card edges. The error state swaps the resting border and the focus ring
to `--C-STATUS-ERROR`; it does not tint the fill. The swap covers `focus-visible:border-*` too, so a
*focused* invalid textarea stays error-coloured throughout rather than showing a
focus-coloured border inside an error-coloured ring.

The minimum height is the one dimension a theme can't touch: it is a fixed `min-h-[6.25rem]`
(≈100px) arbitrary value, not a token. Override it with your own `className` if you need a
taller or shorter floor.

## Gotchas

- **The [Label](label.md) is not auto-associated.** [Field](field.md) wires the *error* (`aria-invalid`,
  `aria-describedby`) through context, but nothing links a [Label](label.md) to the textarea. Set
  `Label htmlFor="x"` and `Textarea id="x"` yourself, or clicking the label won't focus the
  textarea and screen readers won't announce it as the field's name.
- **Not server-renderable.** Unlike [Button](button.md), Textarea calls the `useFieldError` hook (it
  reads context), so it must run inside a Client Component. It ships **no** `"use client"`
  of its own, so rendering it directly from a Server Component with no client ancestor
  throws. In a normal client-side form tree this never comes up.
- **`error` overrides the field.** Resolution is `error ?? field.invalid`, so `error={false}`
  forces the textarea valid even inside an errored [Field](field.md). Omit it to inherit.
- **`aria-describedby` needs a rendered [FieldError](field-error.md).** Inside an errored [Field](field.md), Textarea
  points `aria-describedby` at the field's error id; if you don't render [FieldError](field-error.md) (or
  give the error no content), that id resolves to nothing.
- **No per-component CSS.** There is no `Textarea.css`. Both CSS imports are still required —
  the utilities above resolve to tokens from `@batthewz/response-ui-css`.

## Accessibility

Textarea renders a bare `<textarea>` with no built-in label — always give it an accessible
name, via a [Field](field.md) + [Label](label.md) (with matching `htmlFor`/`id`), an `aria-label`, or
`aria-labelledby`.

When invalid it sets `aria-invalid="true"`, and inside a [Field](field.md) it also sets
`aria-describedby` to the [FieldError](field-error.md). Note the error is signalled **visually** only by the
border and ring colour; pair it with a visible [FieldError](field-error.md) message so users who can't
perceive the colour still learn what's wrong.

Focus shows a 2px ring in `--C-BORDER-FOCUS` plus a matching border, keyed on
`focus-visible:`. That does not cost you the click case: browsers treat a text field as
always warranting a focus indicator, so the ring still appears when you click into the
textarea, not only when you Tab to it.

## Related

[Input](input.md) · [Field](field.md) · [Label](label.md) · [FieldError](field-error.md) · [NumberInput](number-input.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
