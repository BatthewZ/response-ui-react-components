# card — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 3 · Card — a themed fill with no paired ink inherits whatever an ancestor set (med)

**The row's stated mechanism was wrong and is corrected here.** Dark themes are the
*safe* case: `base.css` never sets a `color`, and `tech.css:5`/`grimdark.css:5` set
`color-scheme: dark`, so the UA supplies light ink. The real vector is a custom-property
override upstream — `MediaCard.css:48-55` re-points `--C-TEXT-PRIMARY: oklch(1 0 0)` scoped
to `.media-card__content`, and custom properties inherit. So
`<MediaCard.Content><Card><DescriptionList.Detail>` resolves that Detail's
`text-fg-primary` to white against Card's `bg-surface-0` = `oklch(1 0 0)` — **1:1,
invisible, in the default theme**.
**Fix:** pair the fill with `text-fg-primary` on Card (the ETHOS ink/fill rule), or scope
MediaCard's override to its own text nodes.

### 4 · Card — uses the surface step reserved for the top popover layer (med)

`docs/theme-contract.md:39` designates `--C-SURFACE-1` for cards; Card.tsx:36 paints
`bg-surface-0`. Measured: `--C-CANVAS` and `--C-SURFACE-0` are **byte-identical** in
`default` (both `oklch(1 0 0)`) and `events` (both `oklch(0.9895 0.009 78.28)`), so a Card
on the page canvas has *no fill boundary at all* — only `shadow-md` separates it. Nest a
Card inside `Dialog` (Dialog.tsx:47) or `HoverCard` (HoverCard.tsx:186), both also
`bg-surface-0`, and the two surfaces are identical in **all four** themes: the elevation
ramp collapses. Card also draws no border, though the contract assigns
`--C-BORDER-DEFAULT` to "cards, inputs".
**Fix:** move Card to `bg-surface-1` per the contract — but this **cannot ship alone**:
#206 measures surface-1-on-surface-0 at 1.02–1.07:1, so it needs a border or the ramp
retune to be visible at all.
