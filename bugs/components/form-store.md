# form-store — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 256 · form-store — array mutations strand validation errors at the old index (high)

`commitArray` rewrites `values` and re-keys `arrayIds`, but `schemaErrors`, `manualErrors` and
`touched` are keyed by dotted path (`links.0.url`) and are never re-indexed. Measured on a two-row
form whose row 0 is invalid: submit → one `"URL is required"` message rendered. Remove row 0 → the
surviving row is the *valid* one (`"https://example.com"`), yet the message is still rendered
under it **and** that row's `<input>` now carries `aria-invalid="true"`. Reorder is symmetric:
after Move down on row 0 the values are `["https://example.com", ""]` while `aria-invalid` reads
`["true", null]` — the error stayed at index 0 and is now attached to the valid row while the
genuinely invalid one looks clean. It self-corrects only when validation next runs (a keystroke
under the default `reValidateMode: "onChange"`, or the next submit), so the wrong state is
visible for exactly as long as the user does nothing. Surfaced through `Repeater`, but the defect
is in the store and affects every consumer of `useFieldArray`.
**Fix:** re-index `schemaErrors` / `manualErrors` / `touched` inside `commitArray` alongside
`arrayIds`.
