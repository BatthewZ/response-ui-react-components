# field — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 23 · Field — dangling `aria-describedby` (med)

A control marked invalid (via context) emits `aria-describedby` pointing at the FieldError's
id, but when no error is actually rendered the referenced element doesn't exist — a dangling
reference some screen readers announce as "described by (nothing)". **Fix:** only emit the
`aria-describedby` id when the error node is present.

### 440 · FieldError — an explicit `id` silently breaks the wiring (med)

`FieldError.tsx:23` renders `id={idProp ?? field?.errorId}`, so a caller-supplied `id` wins.
But the controls inside the `Field` are wired from context and keep pointing
`aria-describedby` at `field.errorId`, which is now on no element at all. Passing
`<FieldError id="my-error" />` therefore *removes* the description it looks like it is
naming — the opposite of the intent.

Surfaced while fixing #434: `RangeSlider.examples.tsx` carried
`aria-describedby="meeting-length-error"` + `<FieldError id="meeting-length-error" />` as a
workaround for RangeSlider cherry-picking only `aria-invalid` out of the field error props.
Once the merge was corrected the workaround became a dangling reference, which is how this
was found — an example written around one defect exposing another.

**Fix:** either keep the generated id on the element and add the caller's as an extra IDREF,
or publish the id through context so controls follow it. Do not simply drop `idProp`; the
prop is public.
