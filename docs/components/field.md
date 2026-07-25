# Field

The wrapper that turns a label, a control, and an error message into one accessible
group. It stacks them in a column, resolves the field's error — from an explicit prop or,
inside a `FormProvider`, from the form store by `name` — and publishes the `aria-invalid` /
`aria-describedby` wiring on context for the control inside to pick up, so you don't repeat
it on every input. Every control in the form module picks it up bar two — [Radio](radio.md) and
[Checkbox](checkbox.md), which read no context at all.

<!-- example:Minimal -->
```tsx
<Field error="Enter a valid email address.">
  <Label htmlFor="email">Work email</Label>
  <Input id="email" type="email" defaultValue="ada@" />
  <FieldError />
</Field>
```
<!-- /example -->

| Prop        | Type                  | Default |
| ----------- | --------------------- | ------- |
| `name`      | `string`              | —       |
| `error`     | `ReactNode`           | —       |
| `className` | `string`              | —       |
| `ref`       | `Ref<HTMLDivElement>` | —       |
| …rest       | props of `div`        | —       |

Field renders a plain `<div>`; `name` is omitted from the native `div` props and
repurposed as the form-field key. It resolves the error, but it does **not** associate the
[Label](label.md) with the control — that wiring is still yours. See [Gotchas](#gotchas).

## Wire it to a form

With a `name` and a `FormProvider` above it, Field subscribes to that field's error in the
form store and re-renders when it changes — no `error` prop, and the [FieldError](field-error.md) fills in
from validation:

<!-- example:FormWired -->
```tsx
<FormProvider form={form}>
  <Field name="email">
    <Label htmlFor="email">Work email</Label>
    <Input id="email" type="email" {...form.field("email")} />
    <FieldError />
  </Field>
</FormProvider>
```
<!-- /example -->

Outside a `FormProvider`, `name` has nothing to read and silently no-ops; pass `error`
directly instead.

## Rich error content

`error` is a `ReactNode`, not a string, so a message can carry a link or formatting. The
same value flows to the [FieldError](field-error.md) and marks the field invalid:

<!-- example:RichError -->
```tsx
<Field
  error={
    <>
      That username is taken. <a href="/help/usernames">See naming rules</a>.
    </>
  }
>
  <Label htmlFor="username">Username</Label>
  <Input id="username" defaultValue="ada" />
  <FieldError />
</Field>
```
<!-- /example -->

## Custom layout

The wrapper is a `flex flex-col` column with a `gap-r6` between rows. Override it through
`className` when a field wants a different shape — an inline checkbox and label, say:

<!-- example:HorizontalLayout -->
```tsx
<Field className="flex-row items-center gap-r4">
  <Checkbox id="terms" />
  <Label htmlFor="terms">I accept the terms of service</Label>
</Field>
```
<!-- /example -->

## Theme tokens

Field paints nothing of its own — no colour, border, or radius. The colours you see in a
field group come from its children ([Label](label.md), [FieldError](field-error.md), the control). The one token
Field itself reads is the gap between its stacked rows:

| Where                   | Utility  | Override     |
| ----------------------- | -------- | ------------ |
| Gap between field rows  | `gap-r6` | `--R-SIZE-6` |

`--R-SIZE-6` is the tightest step on the `r`-scale and is intentionally flat — `0.25rem` at
both the base and the 40rem breakpoint — so this row gap stays constant while the rest of
the layout scales up at 40rem. The token is still re-declared inside the 40rem block, so to
change it you have to override it at both breakpoints (see
[Theme contract](../theme-contract.md)) or, for a one-off, set a different `gap-*` in
`className`.

## Gotchas

- **`name` only does something inside a `FormProvider`.** With no provider above it the
  form lookup returns nothing and `name` no-ops. It also never reaches the DOM — Field
  omits the native `div` `name` and uses it purely as the store key.
- **Field does not associate the [Label](label.md) with the control.** It generates an id, but only
  for the error — it never wires `htmlFor`/`id` between a [Label](label.md) and the input. Set
  `htmlFor` on the [Label](label.md) and a matching `id` on the control yourself, or the control has
  no accessible name from its label.
- **`aria-describedby` can dangle.** A control is described-by the error whenever *it* is
  invalid, but the error element only exists when a [FieldError](field-error.md) actually has content. Mark
  a control invalid on its own (e.g. `<Input error>`) inside a Field that has no error and
  renders an empty [FieldError](field-error.md), and the control's `aria-describedby` points at an id that
  is not in the DOM. Keep the two in sync — drive the invalid state and the [FieldError](field-error.md)
  content from the same `error`.
- **An empty [FieldError](field-error.md) renders `null`.** It only paints when there's content (its own
  children, or the field's resolved error), so it's safe to leave in the tree
  unconditionally — it costs nothing until there's a message.
- **Client component.** Field is `"use client"` (context, `useId`, a store subscription),
  so it needs a client boundary in an RSC tree — unlike Button, it can't render directly
  on the server.

## Accessibility

The error is rendered by [FieldError](field-error.md) as a `<p role="alert">`, so assistive tech announces
it when it appears.

Controls read the field context to pick up their state: eleven of the package's own controls
— Input, Textarea, Select, Combobox and Switch among them — take `aria-invalid` and
`aria-describedby` from the field automatically, and DatePicker, DateRangePicker, NumberInput
and SearchInput inherit both through the Input they render. [RangeSlider](range-slider.md) is the one partial:
it reads the same hook but forwards only `aria-invalid`, onto its wrapper, and discards the
`aria-describedby` — so nothing there points at the message. Two controls do not.
[Radio](radio.md) and [Checkbox](checkbox.md) read no context and take no `error` prop, so
inside an errored Field they are neither marked invalid nor linked to the message. The
Checkbox in [Custom layout](#custom-layout) above is there for the layout; give that Field an
error and its ARIA would still have to be set by hand. A plain, un-wrapped `<input>` gets
none of it either — Field wires nothing onto arbitrary children, so the control itself has to
consume the context.

Field is not a `fieldset` or `role="group"` and adds no label of its own. For a set of
controls that needs one accessible name — a radio group, an address block — wrap them in
your own `<fieldset>` with a `<legend>`; Field won't. And label-to-control association is
manual, per Gotchas.

## Related

[Label](label.md) · [FieldError](field-error.md) · [Input](input.md) · [FormActions](form-actions.md) · `FormProvider` / `useForm` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
