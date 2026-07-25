# popover — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 117 · Popover — a non-modal popover applies full modal semantics (med)

Popover.tsx:191 renders `<FloatingFocusManager context={context}>` with no `modal`
prop, and `@floating-ui/react` defaults `modal = true`. Probed DOM with the popover open:
the entire app root becomes `<div aria-hidden="true" data-floating-ui-inert>` — **the
trigger included** — plus two `data-floating-ui-focus-guard data-type="inside"` spans that
trap Tab inside the panel. So a screen-reader user cannot read the page behind a popover
that advertises `aria-haspopup="dialog"` and is not meant to be modal.
**Fix:** pass `modal={false}` (keeping `useDismiss`), and expose `modal` publicly if
callers need the modal variant. **Triage together with #114 (high), #124 and #131** — all
four anchor on a `FloatingFocusManager` rendered without `modal`, at Popover.tsx:191 and
menu-internals.tsx:179. Fixing one line does not fix the other.
