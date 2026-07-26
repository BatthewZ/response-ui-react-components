# popover — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 117 · Popover — a non-modal popover applies full modal semantics (med)

Popover.tsx:191 renders `<FloatingFocusManager context={context}>` with no `modal`
prop, and `@floating-ui/react` defaults `modal = true`. Probed DOM with the popover open:
the entire app root becomes `<div aria-hidden="true" data-floating-ui-inert>` — **the
trigger included** — plus two `data-floating-ui-focus-guard data-type="inside"` spans that
trap Tab inside the panel. So a screen-reader user cannot read the page behind a popover
that advertises `aria-haspopup="dialog"` and is not meant to be modal.
**Fix, as applied** (`6ed0ad3`): `Popover.tsx:197` is now
`<FloatingFocusManager context={context} modal={false}>`, matching `ColorPicker` and `DatePicker`,
with `useDismiss` kept and a test covering it. `modal` is still not exposed publicly — a caller who
wants the modal variant has no route to it, which is a smaller open gap this row does not track.

**The triage note above still stands, and only the Popover line was fixed.** #114 (high), #124 and
#131 anchor on the *other* call site, `menu-internals.tsx:179`, and are untouched. Fixing one line
did not fix the other — do not close them from this row.

Related: focus still lands on the panel afterwards, which is why #129's replacement ring on
`.popover-content` is load-bearing rather than decorative.
