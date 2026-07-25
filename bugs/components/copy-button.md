# copy-button — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 68-69 · CopyButton — the copy can fail, and the confirmation may never be heard (med)

- **#68** Same build served over plain `http:` (LAN IP, intranet, staging without TLS) →
  `navigator.clipboard` is `undefined` → the guard returns → every click is a silent no-op with
  the button still reading "Copy". Identical outcome when `writeText` *rejects* (no transient
  user activation, cross-origin iframe without `clipboard-write`, some webviews) → a bare
  `catch` swallows it. `onClick` cannot substitute: it fires *before* the attempt and on both
  failing paths. **Fix:** an `onCopy(succeeded: boolean)` / `onError(err)` callback, or a
  failure state. (Note: React's own `onCopy` DOM prop *does* compile here and never fires for a
  programmatic `writeText` — a live trap for anyone reaching for it.)
- **#69** The `sr-only` `aria-live` span is a descendant of `<button>`, and WAI-ARIA 1.2 lists
  `button` among the roles with *Children Presentational: True*, so descendant semantics are not
  reliably exposed. **Fix:** render the region as a **sibling** of the button — which cannot be
  done from the call site, so only a code change can fix it.
