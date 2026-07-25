# input — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 27 · Input — hook without `"use client"` (med · caveat)

`Input` imports and calls `useFieldError` from `./Field` but ships no `"use client"`
directive, so a React Server Component importing it directly would fail. **Caveat:**
`verify-directives` passes on it — which means either the hook is context-only (tolerated) or
the directives guard doesn't model context-only hooks. Audit both the component *and* the
guard's coverage.
