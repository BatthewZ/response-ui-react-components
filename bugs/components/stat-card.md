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
