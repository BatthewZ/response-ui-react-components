# alert — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 1 · Alert — severity is carried by tint and nothing else (med)

`variantClassMap` (Alert.tsx:9-14) differs **only** in background/text/border colour
classes, and the render (Alert.tsx:25-31) emits no icon, no `sr-only` text and no
`data-*`. So `<Alert variant="error">Payment failed</Alert>` and the same string with
`variant="success"` produce **byte-identical accessibility-tree output** — same role, same
name, same text. Worse than `Meter`, which at least emits `data-status`.
**Fix:** emit a `data-variant` plus a caller-overridable visually-hidden severity prefix
alongside the tint. Pattern: *status by colour alone*.

### 2 · Alert — `aria-live="polite"` cancels `role="alert"` for every variant (med)

Alert.tsx:27-28 hard-codes `role="alert"` and then `aria-live="polite"`; an explicit
`aria-live` beats the role's implicit `assertive`. A form-submit error therefore queues
behind whatever the screen reader is already saying and is dropped entirely if the user
types or moves focus before the queue drains — so the one variant that exists to interrupt
cannot. Polite is defensible for `info`/`success`; the defect is that it is unconditional
and undocumented. `{...props}` at :30 sits after, so a caller *can* override it.
**Fix:** derive `aria-live` from `variant` (assertive for `error`/`warning`), keeping the
caller override intact.
