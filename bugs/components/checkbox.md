# checkbox — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 25 · Checkbox — focus ring offset hard-codes white (med)

`focus:ring-offset-2` with no `ring-offset-color` uses Tailwind's default `#fff`, so on a
dark theme the focus ring sits on a white halo instead of the surface. Not theme-paired.
**Fix:** set `ring-offset-color` to a surface token (e.g. `ring-offset-surface-1`).

### 76 · Checkbox — never consumes the Field context (med)

Identical to #75: Checkbox.tsx:1-3 imports only `cn`, no `useFieldError` anywhere in
the file, and the `<input type="checkbox">` at :12-21 emits no error ARIA. So
`<Field error="You must accept the terms"><Checkbox/></Field>` shows a visible error on a
control that reports itself valid. Worth its own block only because the two files are
independent — a fix to Radio does not reach here.
**Fix:** spread `useFieldErrorProps()` onto the input ahead of `{...props}`. Note this
element also carries #25/#35 (`focus:ring-offset-2` with no `ring-offset-color`), so both
should land in one pass.
