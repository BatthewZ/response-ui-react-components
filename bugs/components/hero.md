# hero — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 160-163 · Hero — the scrim is unconditional, unbounded and untraversable (med ×4)

**#160 — the scrim eats clicks.** `.hero__overlay` is `position: absolute; inset: 0` with no
`pointer-events: none`, appended *after* `children`. `.hero__content` escapes it with
`position: relative; z-index: 10`; nothing else does. `<Hero><Button onClick={buy}>Buy tickets</Button></Hero>`
renders the button dimmed and every click hits the overlay; Tab+Enter still fires it, so it reads
as a mouse-only bug and passes any keyboard-driven test. **Fix:** add `pointer-events: none` to
`.hero__overlay`.

**#161 — `animate` advertises a stagger it cannot deliver.** `Hero.Content` composes
`ScrollReveal > Stagger`, but the entrance class (`fade-up`/`fade-in`/`scale-in`) lands on the
ScrollReveal element while `.stagger-item` carries `animation-delay` + `animation-fill-mode: both`
and **no `animation-name`** — a delay applied to nothing. `<Hero.Content animate className="flex gap-r4">`
with three children enters as one block with no cascade, *and* the flex row now lays out a single
ScrollReveal `<div>` instead of the three children, so the gap class silently stops working.
(Related: this run confirmed `stagger.css` does read `--stagger-delay`, so #17's feared *name
mismatch* does not exist — the prop is inert for a different reason, the `.stagger-item` rule
re-declaring the property on the item and shadowing the inherited value.) **Fix:** put the entrance
class on `.stagger-item`, or drop the Stagger wrapper from `Hero.Content`.

**#162 — the scrim is on when there is nothing to darken.** `overlay` defaults to `true`
irrespective of whether a `Hero.Background` exists. `<Hero><Hero.Content><Text>…</Text></Hero.Content></Hero>`
on the default theme over `--C-CANVAS` takes `--C-TEXT-PRIMARY` from a computed **17.74:1 to
4.46:1** — under the 4.5:1 AA floor — for a 50%-black rectangle that darkens nothing but the page.
**Fix:** default `overlay` to `false`, or gate the scrim on a background layer being present.

**#163 — nothing bounds the scrim against a bright image.** `--C-TEXT-ON-PRIMARY` is the only one
of the six contract text tokens that is light in all four themes, so it is what `Text color="on-primary"`
and `Button variant="ghost-inverse"` use over a hero. Composited over the shipped scrim on a pure
white image region it measures **2.89:1 in `events`** (0.45 alpha) and **3.98:1 default** — the
former below even the 3:1 large-text floor. The contract promises that token against `--C-PRIMARY`
*fill* only, and a scrimmed photograph is not that fill. **Fix:** darken `--OVERLAY-SCRIM-COLOR` in
`events` (0.45 → ~0.6), or add a contrast guard over the theme files.

All four contrast figures were computed with an OKLCH→sRGB converter validated to exact hex against
`#ff0000`/`#00ff00`/`#0000ff`, sRGB-space alpha compositing and WCAG relative luminance. #160 and
#161 are read from the source, the stylesheets and DOM paint order, not from a browser render.
