# number-input — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 231 · NumberInput — the steppers throw away what you just typed (med)

`stepBy` seeds from `currentValue ?? min ?? 0` — the last *committed* value — and never consults
the draft, while both buttons `preventDefault` on `pointerdown` so the input never blurs and never
commits first. Measured: a field committed at `1`, type `99` (draft only), click the up chevron →
emits `2` and displays `"2"`; the typed `99` is gone. ArrowUp/ArrowDown do the same.
**Fix:** seed `stepBy` from `parseDraft(draft) ?? currentValue ?? min ?? 0`.

### 232 · NumberInput — a controlled `value` is not actually controlled (med)

`commit`/`stepBy` write the draft locally and reconciliation runs only when the `value` prop
*changes* (`prevValueRef.current !== currentValue`). A parent that declines to adopt the emitted
value never triggers it. Measured: `<NumberInput value={5} onValueChange={noop} />`, one press of
the up chevron → the field displays `"6"` **permanently** while the prop and `aria-valuenow` stay
`5`. Visible text and accessible value disagree forever, which is worse than either being wrong.
**Fix:** when controlled, derive the draft from the incoming value rather than `setDraft`-ing
unconditionally, or compare `parseDraft(draft)` to `value` on every render.

### 233 · NumberInput — `readOnly` stops the keyboard but not the buttons (med)

`readOnly` reaches the `<input>` through `...props` and blocks typing, but neither `stepBy` nor
the ArrowUp/ArrowDown branches consult it. Measured:
`<NumberInput readOnly defaultValue={3} onValueChange={fn} />` — clicking the up chevron emits
`4`, and ArrowUp then emits `5`. No `aria-readonly` is set either, so assistive tech is not told
the field is meant to be immutable. **Fix:** return early from `stepBy` and the arrow branches
when `readOnly`, and pass `aria-readonly`.

### 426 · NumberInput — an `Omit`ted `onChange` still lands, replacing the draft setter (med)

`onChange` is `Omit`ted at NumberInput.tsx:25, is not destructured out, and the element
sets `onChange={(e) => setDraft(e.target.value)}` at :146 before `{...props}` at :150.
A JSX **spread** performs no excess-property check, so
`<NumberInput {...form.field<number>("qty")} />` — the binding README.md:203 advertises —
compiles clean, replaces the draft setter, and writes the raw string into the store
(measured: `{"qty":"15"}`, a string in a number field). Two earlier hand-sweeps disagreed
about this component; the three-condition script in PLAN.md §2 settles it.
**Fix:** destructure `onChange` out and compose. Whether it should then be *honoured*
with the numeric value is the same owner decision as #245 — see PLAN.md §3.
