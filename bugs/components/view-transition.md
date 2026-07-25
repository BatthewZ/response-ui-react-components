# view-transition — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 18 · ViewTransition — async navigation gets no transition (med)

`useViewTransition` calls `navigate` inside `startViewTransition` but discards its return
value and never awaits it. For an async router (navigation returns a promise) the transition
snapshot is taken and released before navigation completes, so there's no transition. **Fix:**
`await` the navigate result inside the transition callback.

### 19 · ViewTransition — ignores `prefers-reduced-motion` (med)

Neither `ViewTransition` nor `useViewTransition` checks `prefers-reduced-motion`; a
view-transition animation plays regardless. **Fix:** gate `startViewTransition` on the media
query, falling back to a plain synchronous navigate/update.
