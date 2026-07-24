# Label

The text label for a form control. A native `<label>` pre-styled to the theme's
form-label treatment — body-2, semibold, primary foreground — so every field label
matches without you restating the classes.

<!-- example:Minimal -->
```tsx
<Label htmlFor="email">Email address</Label>
```
<!-- /example -->

| Prop        | Type                      | Default |
| ----------- | ------------------------- | ------- |
| `className` | `string`                  | —       |
| `ref`       | `Ref<HTMLLabelElement>`   | —       |
| …rest       | props of `<label>`        | —       |

Label adds **no props of its own** — it is a styled passthrough `<label>`, so `htmlFor`,
`id`, `children`, `onClick`, and every `aria-*` attribute work exactly as they do
natively. Its two sharp edges are both about association: it never auto-links to an
input, and it has no built-in required marker. See [Gotchas](#gotchas).

## Associating a label with a control

The default styling is only half the job — a label earns its keep by naming a control.
Match the label's `htmlFor` to the input's `id`:

<!-- example:Associated -->
```tsx
<Label htmlFor="work-email">Work email</Label>
<Input id="work-email" type="email" placeholder="you@company.com" />
```
<!-- /example -->

Now clicking the label focuses the input, and screen readers announce the label as the
field's name. This is your job in every case — [Input](input.md) and its `Field` wrapper
wire the *error*, never the label.

## Required fields

There is no `required` prop and no built-in asterisk. Compose the marker as children,
keep it `aria-hidden` so it isn't read as part of the name, and set `required` on the
control itself so assistive tech learns the field is mandatory:

<!-- example:Required -->
```tsx
<Label htmlFor="full-name">
  Full name <span aria-hidden="true">*</span>
</Label>
```
<!-- /example -->

## Wrapping the control

The other native association mode: wrap the control in the label and skip `htmlFor`/`id`
entirely. Handy for checkboxes and radios where the label sits beside the box.

<!-- example:WrappingAControl -->
```tsx
<Label>
  <input type="checkbox" /> Email me product updates
</Label>
```
<!-- /example -->

## Theme tokens

Label hard-codes no colour, size, or weight — every utility below resolves to a contract
variable, so overriding the variable re-tints every label at runtime with the rest of the
app. It has no `.css` file of its own; all three are Tailwind utilities in the `.tsx`.

| Where      | Utility          | Override           |
| ---------- | ---------------- | ------------------ |
| Colour     | `text-fg-primary` | `--C-TEXT-PRIMARY` |
| Type scale | `text-body-2`    | `--BodyText-2`     |
| Weight     | `font-semibold`  | `--Semibold-Weight` |

The type scale is responsive — `--BodyText-2` carries both a base value and a step at
the `≥40rem` (`sm`, ~640px) breakpoint, with its line-height paired, so the label steps
up there with no breakpoint utilities from you.

## Gotchas

- **No automatic input association.** Label is a bare native `<label>` — it knows nothing
  about any input. Link it explicitly with `htmlFor` matching the control's `id`, or wrap
  the control. Without one of those, clicking the label won't focus the field and screen
  readers won't announce it as the field's name. This holds **even inside a `Field`** —
  `Field` propagates the error state, not the label wiring.
- **No required marker.** There is no `required` prop and no built-in asterisk. Add the
  indicator yourself as children, and set `required` (or `aria-required`) on the control,
  not on the label.
- **`className` merges, it doesn't replace.** The class list runs through tailwind-merge,
  so `className="text-fg-muted"` overrides the default colour rather than appending a
  second conflicting one; unrelated classes are simply added.
- **Server-renderable.** No `"use client"`, no hooks — Label works directly in an RSC
  tree, like [Button](button.md).
- **No per-component CSS.** There is no `Label.css`. Both CSS imports are still required —
  the utilities above resolve to tokens from `@batthewz/response-ui-css`.

## Accessibility

A `<label>` gives a form control its accessible name, but only once associated — either
explicitly (`htmlFor`/`id`) or implicitly (wrapping the control). Label supports both
because it passes every attribute and child straight through; it adds no association of
its own, so an un-associated label is decorative text as far as assistive tech is
concerned.

Keep any required marker `aria-hidden` and signal "required" through the control's
`required`/`aria-required`, so the field's name is announced as "Full name" rather than
"Full name star".

Text is `--C-TEXT-PRIMARY`, the primary foreground, which the theme guarantees legible on
its standard surfaces.

## Related

[Input](input.md) · `Textarea` · `Field` · `FieldError` · `Checkbox` · `Radio` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
