# radio — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 73 · Radio — keyboard focus is invisible (high)

`Radio.tsx:16`'s full class list is `size-4 accent-accent focus:outline-none`. Tailwind 4.3.0
compiles `focus:outline-none` to `outline-style: none`, and nothing replaces it: Radio has no
`.css`, `@batthewz/response-ui-css` ships no `:focus-visible` base rule (its only "focus" hit is
`--color-border-focus`), and Preflight's `:-moz-focusring { outline: auto }` sits in `@layer base`,
which loses to `@layer utilities`.

**Measured, not reasoned.** With `:focus-visible` forced true, the rendered pixel diff is
**0 of 3600 px in Chromium *and* Firefox**. The same radio with the class removed changes 182 px
(Chromium) / 306 px (Firefox).

**Failure scenario:** a keyboard user tabs into any radio group on any theme. Nothing on screen
changes. They cannot see which option has focus, and therefore cannot predict what the arrow keys
will do — while arrow keys in a radio group also *change the selection*. WCAG 2.4.7 (AA) failure,
and it also fails in forced-colours mode: `outline-none` emits no forced-colors fallback, unlike
`outline-hidden`, which carries `@media (forced-colors: active){outline:2px solid transparent}`.
**Fix:** drop `focus:outline-none` and add `focus-visible:ring-2 focus-visible:ring-border-focus`
— verified to render (144/188 px change) and matching the `:focus-visible` pattern already used by
Slider, Switch, ColorPicker, Rating and eight more.
