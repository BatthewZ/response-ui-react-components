# empty-state — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 156-157 · EmptyState — the icon never resizes, and the description is illegible (med)

**#156.** `.empty-state__icon` sets `font-size` per size and no `width`/`height`, and nothing in
this package or in `@batthewz/response-ui-css` sizes a descendant `svg` of it.
`renderToStaticMarkup(<EmptyState size="lg"><EmptyStateIcon><Inbox /></EmptyStateIcon></EmptyState>)`
emits `<svg width="24" height="24">`, and the markup is **byte-identical** at `size="sm"` apart
from the `data-size` attribute — so `size` visibly moves the padding, gap and title while the icon
sits still. Every default `lucide-react` icon carries those attributes. **Fix:** add
`.empty-state__icon > svg { width: 1em; height: 1em; }`, exactly as `ActivityFeed.css:90` and
`Stepper.css:103` already do.

**#157.** `.empty-state__description` — the only place a blank state explains itself — inks
`--C-TEXT-MUTED`: 2.54:1 default, 2.45:1 `events`, 2.10:1 `tech`, 2.59:1 `grimdark` against
`--C-SURFACE-0`, where AA body text needs 4.5:1. The same token inks the icon (line 36). This is a
component-level instance of #51, but logged medium rather than low because unlike a disabled menu
item (#130) the text is load-bearing instruction. **Fix:** ink the description
`--C-TEXT-SECONDARY` (which never drops below 4.45:1), or darken `--C-TEXT-MUTED` upstream.
