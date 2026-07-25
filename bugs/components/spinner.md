# spinner — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 38 · Spinner — continuous rotation ignores `prefers-reduced-motion` (med)

`animate-spin` on `Spinner.tsx:7` is unconditional; there is no `Spinner.css`, and the
`prefers-reduced-motion` blocks in `@batthewz/response-ui-css` are all class-scoped
(`.fade-*`, `.scale-*`, `.morph-*`, `.stagger-item`, `.scroll-reveal-hidden`,
`::view-transition-*`) — none touch `animate-spin`. **Failure scenario:** a user with OS
"Reduce motion" enabled opens any loading state → a ring rotates at `spin 1s linear infinite`
for as long as the wait lasts, including `RequireAuth`'s full-page gate. **Fix:**
`motion-reduce:animate-none` compiles and wins the cascade (verified), but leaves a static
broken ring — a `motion-reduce:animate-pulse` or an opacity pulse is the better fallback.

### 39 · Spinner — the accessible text is hard-coded English and unreachable (med)

The `sr-only` span renders the literal `"Loading"`, and `SpinnerProps` omits `children`.
**Failure scenario:** a French app has no supported way to change it —
`<Spinner>Chargement…</Spinner>` fails to compile (`Omit<…, "children">`), and
`<Spinner aria-label="Chargement" />` sets only the accessible *name* while the live region's
text content stays "Loading", so the user gets two competing strings. **Fix:** add
`label?: string` defaulting to `"Loading"` and render it in the `sr-only` span.
