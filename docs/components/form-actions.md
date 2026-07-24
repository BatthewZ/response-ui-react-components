# FormActions

The footer row for a form. It right-aligns the Save/Cancel pair, sets a consistent gap
between them, and spaces the row off the last field — so every form in the app ends the
same way without you hand-writing the same flex utilities under each one.

<!-- example:Minimal -->
```tsx
<FormActions>
  <Button type="button" variant="secondary">
    Cancel
  </Button>
  <Button type="submit">Save changes</Button>
</FormActions>
```
<!-- /example -->

| Prop        | Type                  | Default |
| ----------- | --------------------- | ------- |
| `className` | `string`              | —       |
| `ref`       | `Ref<HTMLDivElement>` | —       |
| …rest       | props of `div`        | —       |

That is the whole surface — FormActions adds **no props of its own**. Its layout is the
fixed class list `flex flex-row justify-end gap-r5 pt-r4`, and `className` is the intended way
to change it. Everything else reaches the `<div>` untouched: `id`, `style`, `data-*`, `aria-*`,
and event handlers all spread through.

## Why not a Row?

[Row](row.md) does the same flexbox job with knobs for `gap`, `align`, `justify`, `wrap`,
and `as`. FormActions has none of them, and that is the point: it is a **named, consistent
Row for form footers**, so "which side, how much gap, how far below the fields" is answered
once in one file instead of at every call site.

It is not built on Row, and the two differ beyond the alignment: FormActions adds `pt-r4`
of top padding, which Row has no prop for, and it leaves `align-items` at the CSS `stretch`
default where Row centers its children. Use Row when a footer genuinely needs a different
shape; the value of this component is that it never varies.

## Button order and `type`

FormActions never reorders its children and never inspects them — `justify-end` packs them
against the end of the row without changing their sequence, so **DOM order is visual order
is tab order**, and the last button in your JSX is the right-most one on screen.

It also sets no `type` on anything it contains, and neither does [Button](button.md). That
matters more here than anywhere else in the library, because this row lives inside a
`<form>`, where a `<button>` with no `type` attribute is `type="submit"`:

- `<Button>Cancel</Button>` in a form footer **submits the form**.
- The form's *first* submit button is also its implicit submitter — the one Enter fires from
  inside a text field. Put an untyped Cancel first and Enter runs Cancel.

So every non-submitting action needs an explicit `type="button"`, and only the action you
actually want taken gets `type="submit"` — the same one that earns the `primary` variant
([Pick a variant](button.md#pick-a-variant)).

<!-- example:InAForm -->
```tsx
<form onSubmit={handleSubmit}>
  <Field error="Enter a valid email address.">
    <Label htmlFor="billing-email">Billing email</Label>
    <Input id="billing-email" type="email" defaultValue="ada@" />
    <FieldError />
  </Field>
  <FormActions>
    <Button type="button" variant="secondary">
      Cancel
    </Button>
    <Button type="submit">Save changes</Button>
  </FormActions>
</form>
```
<!-- /example -->

## Realign

<!-- example:SplitAlignment -->
```tsx
<FormActions className="justify-between">
  <Button type="button" variant="danger" onClick={deleteInvoice}>
    Delete invoice
  </Button>
  <Button type="submit">Save changes</Button>
</FormActions>
```
<!-- /example -->

`className` runs through tailwind-merge, so `justify-between` **replaces** `justify-end`
rather than appending a second, conflicting justification. The same holds for the spacing:
`gap-r3` or `pt-r6` override the defaults. Utilities from a group the component doesn't set
— `flex-wrap`, `border-t` — are simply added.

## Theme tokens

FormActions draws nothing. It has no `.css` file, and no colour, border, radius, shadow, or
motion utility appears in its source — it only positions. The two tokens it reads are both
spacing steps:

| Where                   | Utility  | Override     |
| ----------------------- | -------- | ------------ |
| Gap between the actions | `gap-r5` | `--R-SIZE-5` |
| Padding above the actions | `pt-r4` | `--R-SIZE-4` |

Both are steps on the shared responsive `r`-scale from `@batthewz/response-ui-css`, so they
grow at the 40rem breakpoint with no breakpoint utilities from you — the gap goes
`0.5rem → 0.75rem`, the padding above the footer `0.75rem → 1.25rem`. That padding is what
FormActions *contributes*, not necessarily the separation you end up seeing: a parent that
sets its own `gap` adds to it, so those numbers hold exactly only when the parent contributes
none — see [Gotchas](#gotchas). Because the scale is
**inverted** (`r1` is the widest step, `r6` the tightest), `r5` is the *tighter* of the two:
the buttons sit closer to each other than the row sits to the last field, at both
breakpoints. Overriding either variable re-spaces every `gap-*`/`p*` on that step across the
app, not just this footer.

## Gotchas

- **It sets no `type` on your buttons.** A bare `<button>` inside a form is a submit button
  — see [Button order and `type`](#button-order-and-type). This is the one sharp edge here.
- **`pt-r4` doubles inside a gapped parent.** [Stack](stack.md) defaults to `gap="r4"` and
  takes `as`, so `<Stack as="form">` — the natural way to build a form with this library —
  already puts an `r4` between its children, and FormActions then adds `pt-r4` on top of it.
  The separation becomes `1.5rem → 2.5rem`, twice what [Theme tokens](#theme-tokens) lists.
  Pass `className="pt-0"` and let the parent own the spacing, or use a bare `<form>` as the
  [example above](#button-order-and-type) does.
- **It never wraps.** There is no `flex-wrap`, so a footer with more buttons than the
  container can hold overflows instead of moving to a second line. Add
  `className="flex-wrap"` for open-ended action sets.
- **Children stretch to equal height.** No `items-*` utility is set, so flexbox's `stretch`
  default applies: put a `size="sm"` and a `size="lg"` Button in one footer and both render
  at the taller one's height. Pass `className="items-center"` for natural heights.
- **`border-t` draws *above* the space, not below it.** [Realign](#realign) offers `border-t`
  as an additive utility, but the `r4` is **padding**, so the rule paints at the element's own
  top edge — flush against the last field, with the full `0.75rem → 1.25rem` sitting between
  the rule and the buttons. That is the reason to reach for a [Divider](divider.md) as a
  sibling before the footer instead: as its own element it takes spacing on either side, from
  the parent's gap or from a margin utility you pass it.
- **Server-renderable.** No `"use client"` and no hooks, so FormActions works directly in an
  RSC tree.

## Accessibility

FormActions is a plain `<div>` with no role, no label, and no semantics of its own — correct
for a layout wrapper. The buttons inside carry their own accessible names, and a form's
action row needs no extra grouping to be understood.

It adds no `tabindex` of its own — reorder the JSX, not the CSS, when the sequence matters.
What a keyboard user hits with Enter, though, is decided by button `type`, not by the row:
see [Button order and `type`](#button-order-and-type).

## Related

[Field](field.md) · [Label](label.md) · [FieldError](field-error.md) · [Button](button.md) ·
[Row](row.md) · [Stack](stack.md) · [Divider](divider.md) · `FormProvider` / `useForm` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
