# stagger — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 10 · Stagger — rest props dropped at runtime (high)

`Stagger` destructures `{ staggerDelay, className, children, as: Tag }` with no `...rest` and
renders `<Tag className=…>` — anything else the type advertises is dropped. Confirmed by
inspection. **Fix:** `...rest` → `<Tag {...rest}>`.

### 17 · Stagger — `staggerDelay` may no-op (med)

`staggerDelay` sets an inline `--stagger-delay` custom property. Whether it affects timing
depends on the stagger CSS actually reading `var(--stagger-delay)` — the token layer defines
both `--stagger-delay` and `--motion-stagger-delay`, so a name mismatch would make the prop
inert. **Audit:** confirm the `.stagger-*` rules consume `--stagger-delay`.
