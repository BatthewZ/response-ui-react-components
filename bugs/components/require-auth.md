# require-auth — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 11 · RequireAuth — redirect re-fires every render (med)

`DefaultUnauthenticatedRedirect` navigates via `ref={(el) => el?.click()}` on a hidden
`<Link>`. The inline arrow is a new identity each render, so React detaches (null) then
re-attaches (node) it every commit, re-running `.click()` while `status` stays
`unauthenticated`. Masked by the default plain `<a>` (the hard nav tears the tree down), but
with a client-router adapter Link it fires navigation repeatedly → router churn/loops.
**Fix:** fire once from an effect with a ref guard, or use a real router `<Navigate>` via
`unauthenticatedFallback`.
