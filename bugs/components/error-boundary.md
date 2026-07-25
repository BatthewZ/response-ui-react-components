# error-boundary — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 34 · ErrorBoundary — raw Tailwind defaults in the fallback (med)

The error fallback is styled with `text-2xl font-bold mb-2`, `mb-6`, and `px-4 py-2` —
Tailwind's built-in type and spacing scales, not the design system's. ETHOS is explicit that
a raw default like `text-sm`/`p-4` is exactly what tokens exist to replace. Consequence: the
one screen a user sees when the app has already failed is the one screen that ignores the
theme — it won't re-scale with `--BodyText-*`/`--H*` or re-space with `--R-SIZE-*`.
**Fix:** `text-h4` (or similar) and the `r*` spacing steps.
*Found incidentally while building the dev examples gallery, not by a docs pass —
ErrorBoundary has no spoke yet, so treat this as a head start on its page.*
