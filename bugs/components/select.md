# select — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 77 · Select — the dropdown arrow is black on every theme (med)

`Select.tsx:28` sets the chevron as a `background-image` data-URI whose SVG uses
`fill="currentColor"`. An SVG referenced as an image is its own document, so `currentColor`
resolves against *that* document's initial `color` — black — not the select's.
**Observed in Chromium and Firefox:** with the referencing element set to `rgb(255,0,0)`, the
chevron renders `rgb(0,0,0)` (1835 pure-black px, zero red). Under `data-theme="grimdark"`
(`color-scheme: dark`) it is black on a `rgb(15,15,15)` surface — **≈1.10:1**, against a theme
whose `--C-TEXT-PRIMARY` is `oklch(0.8285 0.0414 83.1)`. Chrome does not propagate `color-scheme`
into an SVG-as-image document.
**Failure scenario:** on the two dark themes the only affordance marking the control as a dropdown
is invisible. **Fix:** inject the token colour into the data-URI per theme, or use
`mask-image` + `background-color: var(--C-TEXT-PRIMARY)` so it inherits.
