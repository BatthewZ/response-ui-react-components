# search-input — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 221 · SearchInput — `disabled` protects the typing, not the value (med)

`disabled` and `readOnly` stay in `...props` and are spread onto the `<Input>` only. The clear
`<button>` is rendered on `{value && …}` alone and is never disabled. Measured:
`<SearchInput value="oklch" onChange={fn} disabled />` renders `input.disabled === true` and
`button.disabled === false`; clicking the X fires `onChange("")` **and** `onClear()`. `readOnly`
behaves identically, and Escape clears a `readOnly` field too. The one destructive action on the
control is the one `disabled` does not cover, with no type-level hint that it won't.
**Fix:** destructure `disabled`/`readOnly` out of `...props` and gate both the button render and
`handleClear` on `!disabled && !readOnly`.

### 222 · SearchInput — a hard-coded `aria-label` silently defeats your `Label` (med)

`aria-label="Search"` is set unconditionally at line 55. `aria-label` outranks an associated
`<label for>` in the accessible-name computation, so the documented wiring does nothing. Measured
with `dom-accessibility-api`: `<Label htmlFor="q">Search orders</Label>` beside
`<SearchInput id="q" …/>` computes a name of `"Search"`. Every instance on a page therefore
shares one untranslated English name, and a page with two search fields has two identically named
searchboxes. `aria-labelledby` does win (measured `"Search orders"`), so there is a workaround —
but only for callers who know to reach for it. **Fix:** default `aria-label` only when neither
`aria-label` nor `aria-labelledby` was supplied, and prefer no default at all when an `id` is
given. An instance of the hard-coded-English pattern with a second, worse consequence.

### 223 · SearchInput — the clear button vanishes under the focus it holds (med)

The button only renders while `value` is truthy, so activating it unmounts it. Measured: Tab to
the clear button and press Enter — `value` becomes `""`, the `{value && …}` branch removes the
button, and `document.activeElement` is `document.body`. The next Tab restarts at the top of the
document rather than continuing after the field (WCAG 2.4.3). **Fix:** refocus the input inside
`handleClear` through the forwarded ref, or render the button always and hide it with
`visibility`.

### 224 · SearchInput — one Escape clears the field *and* closes the dialog (med)

`handleKeyDown` calls `handleClear()` on Escape and then neither `preventDefault()` nor
`stopPropagation()`. Measured: an ancestor `onKeyDown` receives the event with
`defaultPrevented === false`. Inside `Dialog` — a native `<dialog>` opened with `showModal()` and
closed by the browser's Escape close request — typing a query and pressing Escape both empties the
box and dismisses the dialog, so the user loses the search *and* the surface it was on. **Fix:**
call `e.preventDefault()` when the field actually had content, so the first Escape only clears.

### 225 · SearchInput — the clear affordance is below the graphical-contrast floor (med)

`.search-input__clear` inks `--C-TEXT-MUTED` on the field's `--C-SURFACE-0` fill. Computed from
the shipped OKLCH values: **2.54:1** default, **2.45:1** `events`, **2.59:1** `grimdark`,
**2.10:1** `tech` — all under the WCAG 1.4.11 3:1 minimum, and the glyph is the control's only
visual affordance. The ink reaches `--C-TEXT-PRIMARY` on `:hover` only, not on `:focus-visible`,
and the hover wash (`--C-SURFACE-2` on `--C-SURFACE-0`) is **1.10:1**, so the wash contributes
nothing. **Fix:** ink it `--C-TEXT-SECONDARY` at rest (measured 7.56 / 7.40 / 5.76 / 5.95:1 on the
same fill), or give the button a border.
