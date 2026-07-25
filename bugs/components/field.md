# field — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 23 · Field — dangling `aria-describedby` (med)

A control marked invalid (via context) emits `aria-describedby` pointing at the FieldError's
id, but when no error is actually rendered the referenced element doesn't exist — a dangling
reference some screen readers announce as "described by (nothing)". **Fix:** only emit the
`aria-describedby` id when the error node is present.
