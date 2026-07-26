# stat-card — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 5 · StatCard — `animateValue` renders a permanently stale number (med · recommend high)

**The row understates this: the value is wrong, not merely un-animated.** The
`hasAnimated` ref (StatCard.tsx:50) latches `true` on first intersection and is never
reset. A changed `to` re-runs the effect and re-observes (deps at :106), but the callback
short-circuits at :71 — `if (!entry.isIntersecting || hasAnimated.current) return;`.
Measured in vitest: render `to={100}` renders "100"; rerender `to={250}` **still renders
"100"**. Any polled or refetched metric displays the first value it ever saw, indefinitely.
**Fix:** reset `hasAnimated.current = false` at the top of the effect body.
**Recommend upgrading to high** — this is silent data staleness on a dashboard primitive,
not a missing animation.

### 460 · StatCard.Trend — the "spread `children` displaces the arrow" claim is **false** (med · refuted)

Same claim, same mechanism and same disproof as #459, one component over: `StatCardTrendProps` is
`Omit<ComponentPropsWithRef<"span">, "children">` (`StatCard.tsx:147`) with no destructure, so a
spread `children` was said to replace the trend arrow and the formatted value.

It cannot. JSX element children are emitted *after* the spread in the object the JSX runtime builds,
so `Trend`'s own arrow and value always win.

**Measured:** `<StatCard.Trend value={12} direction="up" {...{children:"HIJACKED", "data-testid":"trend"}}/>`
renders `textContent` `"+12%"` and still contains the arrow `<svg>`. Pinned by a characterisation
test in `StatCard.test.tsx` (`2006872`).

**No fix is needed.** Filed as its own row rather than folded into #459 per the ledger preamble's
do-not-merge rule: different component, different anchor, different test. Note this is *not* related
to #5/#6, which are about `animateValue` on `StatCard.Value`.
