# slider — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 80 · Slider · RangeSlider — the handle is a fifth larger in Firefox (med)

`::-webkit-slider-thumb` defaults to `box-sizing: border-box`; `::-moz-range-thumb` defaults to
`content-box`. Both files declare a `1.25rem` box plus `border: 2px`, so the border lands *outside*
the box in Firefox only. Measured from the same stylesheet: **Chrome 144 → 20 × 20 px;
Firefox 146 → 24 × 24 px.** Preflight's `*, ::before, ::after { box-sizing: border-box }` does not
reach the pseudo-element (verified with Preflight present). The focus `box-shadow` is anchored to
the larger box, so focus geometry differs too. **Fix:** add `box-sizing: border-box` to both thumb
rules in `Slider.css` and `RangeSlider.css`.

*Bonus from the same investigation:* `slider.md` originally claimed Firefox covers the accent fill
with its default `::-moz-range-track`. **That is false** — pixel-sampled identical to Chromium in
Firefox 146 and 123. Both engines expose the input's own `background` as the track once
`appearance: none` is set. The claim came from `RangeSlider.css:111`'s stale comment (#88), and the
"fix" it implied would have painted a bar *over* the fill.

### 431 · Slider — the advertised `form.field()` binding corrupts the value silently (med)

`<Slider {...form.field<number>("vol")} />` compiles and runs without error, and the store
ends up holding `{"vol":"60"}` — a string in a number field. Because nothing throws, this
survives to whatever consumes the value: arithmetic coerces, `===` comparisons fail, and a
schema validating `number` rejects a form the user filled in correctly. Quieter than #429
and #430 and therefore more likely to ship.
**Also here:** `field()`'s `"aria-invalid": undefined` is spread after the computed
`fieldErrorProps` (Slider.tsx:53-60), overriding it — see #434.
**Fix direction is a door** — PLAN.md §3.
