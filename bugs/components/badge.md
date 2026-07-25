# badge — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 44 · Badge — status carried by colour alone (med)

`Badge`'s five variants differ only in `bg-status-*-bg` / `text-status-*`; no icon, no label,
no `role`, no `aria-*`. **Failure scenario:** a CI summary renders
`<Badge variant="success">12</Badge>` beside `<Badge variant="error">3</Badge>` — a screen
reader announces only "12" and "3", and in greyscale (or to a red/green-deficient viewer) both
paint as near-identical light chips, so the pass/fail distinction is lost entirely. **Fix:**
emit an `sr-only` variant word (or an `aria-hidden` icon plus `sr-only` text) inside the span
for every non-`default` variant. `badge.md` documents the workaround — put the meaning in the
label — but the component should not require it.
