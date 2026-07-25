# tabs — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 423 · Tabs — a caller's `onClick`/`onKeyDown` replaces selection and arrow navigation (med)

`Tab` sets `onClick` and `onKeyDown` and then spreads `{...props}` after them
(Tabs.tsx:295) without destructuring either name out, so `<Tabs.Tab onClick={track}>`
typechecks and then **replaces** selection: the tab never activates, and because
`onKeyDown` carries the roving-focus model, a caller's `onKeyDown` also removes arrow-key
navigation across the tablist. Same shape as the fixed #13/#316/#390/#407.
**Fix:** destructure both names out and compose, per `Collapsible.Trigger`
(Collapsible.tsx:82,94) — caller first, then the component's own, skipped on
`e.defaultPrevented`. Assert Enter/Space as well as click; a click-only test hides the
keyboard half (#126, #350).

### 424 · Tabs — a caller's `onAnimationEnd` on `TabPanel` strands the exit transition (med)

`TabPanel` sets `onAnimationEnd` and spreads `{...props}` after it (Tabs.tsx:345), so a
caller's handler replaces the internal one — which is the only thing that fires
`onExitComplete`. This is exactly #13's failure in a second component, and it is why that
one was fixed at the shape rather than the call site.
**Fix:** compose, as #13 now does in AnimatePresence.tsx. **Do not** add a
`defaultPrevented` opt-out: `animationend` is not cancelable, so honouring it would
invent a fake escape hatch that re-creates this bug by design.
**Testing trap:** `fireEvent.animationEnd` reaches nothing in this repo — see
CONTRIBUTING.md's Testing section for the dual-name dispatch that does.
