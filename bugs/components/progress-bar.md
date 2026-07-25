# progress-bar — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 201 · ProgressBar — `variant="gradient"` silently discards `color` (med)

`.progress-bar__fill--gradient` (line 56) sets the `background` **shorthand**, which resets
`background-color`, and is declared after `.progress-bar__fill--accent|success|warning|error`
(lines 39–53) at equal specificity. Class order in the DOM is irrelevant; source order decides.
So `<ProgressBar value={90} variant="gradient" color="error" />` paints the
`--C-ACCENT → --C-ACCENT-HOVER` ramp, not red — a bar that is meant to read as a failure reads as
normal progress. Both classes are present on the element (measured). **Fix:** make the gradient
rule set `background-image` only, or derive the ramp from the selected colour. If gradient is
meant to be accent-only, the fix is a type change so `color` cannot be passed with it.

### 202 · ProgressBar — `aria-valuenow` is not clamped (med)

The fill percentage is clamped into `[0, 100]` but `aria-valuenow` is the raw `value`. Measured:
`<ProgressBar value={150} max={100} />` renders `aria-valuenow="150"` next to
`aria-valuemax="100"` with a 100%-wide fill; `value={-10}` announces `-10` below
`aria-valuemin={0}`. The bar looks right and announces something impossible. `ProgressRing.tsx:35`
clamps the same input, so the two siblings behave differently. Same defect as `Meter` #22.
**Fix:** `Math.min(max, Math.max(0, value))` before it reaches ARIA.

### 203 · ProgressBar — `ProgressBar.Label` does not label anything (med)

`ProgressBar.Label` is a bare styled `<span>`: it emits no `id`, holds no context, and the root
sets no `aria-labelledby`. `<ProgressBar.Label>Uploading</ProgressBar.Label><ProgressBar
value={64} />` renders a `role="progressbar"` with **no accessible name** — a screen reader
announces "64" and nothing else. The sub-part's existence implies a wiring it never performs,
which is worse than having no sub-part at all. **Fix:** generate a shared id through a compound
context and `useId`, or require `aria-label` in the root's type the way `Meter` does.

### 204 · ProgressBar — `value={NaN}` renders a full bar (med)

`Math.min(100, Math.max(0, (NaN / 100) * 100))` is `NaN`, so the inline style is `width: NaN%`;
the CSSOM rejects it outright. Measured in jsdom: the fill renders as
`<div class="progress-bar__fill progress-bar__fill--accent"></div>` with `style.width === ""` and
no `style` attribute at all, leaving `width: auto` — which on a block child of a `width: 100%`
track is the entire track. So a `loaded / total` computation with `total === 0` shows a bar that
reads as **100% complete** at the exact moment nothing has happened, and `aria-valuenow="NaN"`
alongside it. **Fix:** `Number.isFinite(value) ? … : 0` in the percentage guard.

### 205 · ProgressBar — status by colour alone (med)

`color="success|warning|error"` swaps one `background-color` and emits nothing else: no
`data-status`, no `aria-valuetext`, no text alternative. Two bars at `value={96}` with
`color="success"` and `color="error"` produce byte-identical accessibility-tree output, so a
screen-reader or colourblind user cannot tell "backup complete" from "over quota". This is the
fourth-and-fifth-time instance of the recurring pattern at the top of this file, and it is worse
than `Meter` #21, which at least exposes `data-status`. **Fix:** emit a `data-color`/`data-status`
attribute and a default `aria-valuetext`, or document the colour as decorative only.

### 206-207 · ProgressBar — neither half of the bar is reliably visible (med ×2)

**#206.** The track is `--C-SURFACE-1`. Against `--C-SURFACE-0` (the `Card` surface, and equal to
`--C-CANVAS` in the two light themes) it measures **1.05:1** default, **1.03:1** `events`,
**1.02:1** `tech`, **1.07:1** `grimdark`; against `--C-CANVAS` directly, 1.05 / 1.03 / 1.08 /
1.17:1. So the unfilled remainder is invisible in every shipped theme and a bar at `value={10}`
is a short stub floating on nothing — the total the bar is measured *against* cannot be seen,
which is most of what a progress bar communicates.

**#207.** The other half fails in the other two themes. The default `accent` fill against that
same `--C-SURFACE-1` track measures **4.95:1** default and **14.56:1** `tech`, but **2.63:1** in
`events` and **2.77:1** in `grimdark` — under the 3:1 floor WCAG 1.4.11 sets for a graphical
object that carries meaning. Taken together, there is no shipped theme in which both the fill
edge and the track are comfortably legible.

**Fix:** move the track to a dedicated token (or `--C-SURFACE-2`, per #210, though that is only
marginally better), raise accent lightness in `events`/`grimdark`, and add a ratio guard over the
theme files — the same guard #51, #163 and #173 all want.

Ratios computed with an OKLCH→sRGB converter validated to exact hex against `#ff0000`/`#00ff00`/
`#0000ff`, using WCAG relative luminance; not sampled from a rendered page.
