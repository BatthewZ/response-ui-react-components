# Changelog

All notable changes to `@batthewz/response-ui-react-components` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Until 1.0.0, breaking changes will bump the **minor** version.

## [0.21.0] — 2026-08-11

### Added

- **`safeUrl` is now a public export.** It has always existed — the markdown parser has to judge a
  link whose source it did not write — but it was reachable only as an internal of
  `components/ui/markdown-parse`. It moves to `util/url` and is exported from the barrel and from
  `@batthewz/response-ui-react-components/util/url`.

  The reason it deserves to be public is that markdown is not the only place this library renders
  a URL it did not write, and it is the only place that asks. `Avatar`, `Hero`, `MediaCard` and
  `Spotlight` all take a `src` and pass it through unexamined — correctly, because in React the
  caller is the developer and sanitising a developer's own prop would be presumptuous. But a
  consumer whose URLs come from a CMS, an API or a model is in the parser's position, not the
  developer's, and had to write their own answer or reach into an internal path. Now they can ask
  the same question this library asks itself, and get the same answer.

  It judges the **scheme only**: an allowlist of `http:`, `https:`, `mailto:`, `tel:`, relative
  URLs, and `data:` for the six bitmap image types. It returns the URL, or `""` to refuse — the
  caller is expected to drop the element rather than emit an empty attribute, since an `<a>` with
  no `href` is not a link and an `<img>` with no `src` is not a broken image. It is not an origin
  policy and will not stop a link to a host you would rather it did not reach.

  `markdown-parse` re-exports it, so nothing importing it from there breaks.

## [0.20.0] — 2026-08-10

### Fixed

- **The `--TABLE-*`, `--C-TREND-*` and `--MEDIA-CAROUSEL-GAP` defaults now track a theme scoped to a
  subtree, not just one set at `:root`.** Each alias moved out of the `:root` block in
  `src/tokens.css` and into the place that reads it, as a `var()` fallback — the arbitrary utility
  values in `Table.tsx` / `DataTable.tsx` / `Carousel.tsx`, and the `@theme inline` entries the
  trend utilities are generated from.

  The two forms are not equivalent, and a table made it obvious. `var()` inside a custom-property
  *declaration* is substituted at the element the declaration applies to — `:root` — and descendants
  inherit the already-resolved value; re-pointing `--C-SURFACE-1` further down the tree never
  re-runs that substitution. So `--TABLE-HEAD-FILL: var(--C-SURFACE-1)` baked in the root theme's
  light surface, and a dark theme applied to a subtree (a `[data-theme]` wrapper, or the inline
  custom properties `@batthewz/response-ui-renderer` writes for `themeOverrides`) darkened the card
  and left the table's header band bright. `text-trend-up` failed the same way against a scoped
  `--C-STATUS-SUCCESS`, which is why `docs/theme-contract.md` said trend "tracks every theme
  automatically" while it tracked only root ones.

  Written as a fallback the derivation is re-evaluated at the element that paints, so a scoped theme
  carries the chrome with it. This is the same fix, and the same reasoning, as the
  `var(--sparkline-color, currentColor)` default documented in `docs/components/sparkline.md`.

  **Nothing moves where a theme is applied at `:root`** — every default resolves to the byte it did
  before. Two consequences if you reach past the utilities: these tokens are no longer declared, so
  `getComputedStyle(…).getPropertyValue("--TABLE-HEAD-FILL")` reports the empty string until you set
  one, and your own `var(--TABLE-HEAD-FILL)` with no fallback now resolves to nothing. Setting any
  of them still wins everywhere — the fallback only fires when the token is unset.

  **`--C-CHART-1..3` are deliberately excluded** and stay declared on `:root`. `docs/extending.md`
  documents `getComputedStyle(el).getPropertyValue("--C-CHART-1")` as the way to feed a charting
  library themable values, and undeclaring them would return the empty string there — a chart needs
  its colours in JS in a way a table's chrome never does. The scoped case given up is also the
  smallest of the set: overriding `--C-CHART-1` itself on a subtree already works, and a dark theme
  is already told to override `--C-CHART-1..5` directly, because the contract's ink values do not
  supply a legible dark ramp. Both `src/tokens.css` and `docs/theme-contract.md` record the
  exception.

### Changed

- `scripts/verify-component-docs.mjs` reads the fallback form. Its token map required
  `--alias: var(--target)` to close immediately, so an alias carrying a fallback vanished from the
  map and every utility resolving through it reported "resolves to no token in the contract"; and a
  token defaulted at its use site is now counted as defined, since that fallback *is* its
  declaration. A token sitting in a fallback is not attributed to the row that names the utility —
  it is what the row's token defaults to, not a second token the component reads — so genuine
  multi-token values like `bg-[linear-gradient(…,var(--C-ACCENT),var(--C-ACCENT-HOVER))]` are
  unaffected. Verified against the pre-change tree: same 915 claims resolved, and the
  arbitrary-value route the header tracks stayed live.
- `@batthewz/response-ui-css` dependency raised to `^0.15.0`, which carries the same fix for
  `--C-SELECTION` / `--C-TEXT-ON-SELECTION`.

## [0.19.0] — 2026-08-09

### Added

- **`chrome` on `Table`, `DataTable` and `VirtualizedDataTable` — which box mechanisms a table
  spends.** `"boxed"` (the default) keeps the outer frame, the filled header band and a rule
  under every row but the last. `"rules"` drops the frame and the band. `"plain"` drops the rules
  too and lets the density padding separate the rows.

  The case it exists for is a table inside something that already has a frame — a `Card` draws
  its own border, radius and shadow, so a `"boxed"` table inside one is two concentric borders a
  few pixels apart. `Card`'s and `Table`'s doc pages both say so now.

  Three things it deliberately does not touch. `striped` still bands whatever you turn it on for,
  in every chrome. A `selected` row keeps its wash and its leading marker — the marker is a
  `background-image`, so it composes with a chrome that paints no fill rather than depending on
  one. And the sortable header keeps its hover, press and focus affordances: a control you cannot
  see is a different defect from a table that draws too many boxes.

  `DataTable` carries it one step further: the detail row a `renderExpanded` opens is the largest
  contiguous block the component draws, so under the lighter chromes it drops its fill and lets
  its leading marker carry the relationship to the row above. `classNames.expandedCell` still
  puts a fill back.

- **`--TABLE-FRAME-COLOR`, `--TABLE-FRAME-RADIUS`, `--TABLE-RULE-COLOR`, `--TABLE-HEAD-FILL` and
  `--TABLE-DETAIL-FILL` — the inks a table draws box with, now themeable.** Every chrome reads
  them, **the default included**, and each defaults to the exact value that was hard-coded
  before it existed — so the rendering does not move. Verified in a browser: computed
  `border-color`, `border-radius` and `background-color` are identical to the previous literals
  on all four surfaces.

  They exist because `chrome` is a per-call-site lever and "all our tables feel boxy" is not a
  per-call-site problem. The alternative was retuning `--C-BORDER-DEFAULT` and `--RADIUS-MD`,
  which also move every card, input and divider in the app. These separate *how much box a table
  draws* from *how much border everything draws* — the distinction a heavy-ink theme actually
  needs, and one the universal contract cannot express. Set `--TABLE-FRAME-COLOR: transparent`
  and every table in the app loses its frame with no code change.

  Domain extensions, not contract tokens: the names encode a component, so they live in this
  package. They cascade by name, so a consumer theme overrides them exactly like contract tokens.
  There is deliberately no width token — a theme should not be able to change a table's box model
  and reflow the app.

  Consequence worth stating: `"boxed"` and `"rules"` now rule rows in the **same** ink. An earlier
  draft had `"rules"` soften the rule itself; measured across the shipped themes that softening
  was 1.05–1.10:1 against the surface, i.e. very nearly `"plain"` already, while doing real work
  only on heavy-ink themes. Rule weight is a theme decision, so it moved to the token, and the
  prop is left deciding which mechanisms exist rather than how heavy they are.

- **`TableChrome` is exported from `Table`** (not from the barrel), so the two data tables share
  one definition rather than re-spelling the union.

### Fixed

- **A pinned header takes the band back, in every chrome.** Two reasons, and the second is
  measured. `position: sticky` takes the head out of flow over rows that keep painting, so an
  unfilled one shows the data sliding through the column labels. And the head's *rule* does not
  survive scrolling: the table sets `border-collapse`, and in the collapsed model a browser paints
  collapsed borders with the table rather than with the row group, so a pinned `<thead>` translates
  away from its own rule — verified gone in both Chromium and Firefox while scrolled. `boxed` loses
  its rule identically and never showed it, because its fill survives the scroll.

  So the fill is a pinned head's only separation, and `rules`/`plain` re-add `--TABLE-HEAD-FILL`
  when — and only when — `stickyHeader` is on. An unpinned head is genuinely unfilled.

  Not chrome-varied, and worth knowing: the `--SHADOW-SM` each header cell casts when pinned.
  Chromium paints no `box-shadow` on a cell in the collapsed border model, so it is not a
  separation to rely on in any chrome.

- **An unrecognised `chrome` degrades to `"boxed"` instead of stripping all chrome.** A
  destructuring default fires only on `undefined`, so `chrome={null}` or a misspelling from an
  untyped caller reached the class maps as a missing key, rendering no frame, no rules and — worse
  — no fill on a pinned header. TypeScript callers could never reach this; not every caller is one.

- **`docs/components/table.md` and `docs/components/virtualized-data-table.md` described the
  striped row as the rung-2 surface.** It has been the rung-1 surface in code since before this
  release; the prose is now correct.

## [0.18.0] — 2026-08-09

### Changed

- **`Tooltip`'s `container` is now an override rather than the only route into a dialog.** There
  is nothing to pass for a tooltip inside `Dialog`/`Drawer`/`CommandPalette` any more. `container`
  still wins where you supply one, and **`container={null}` now means "no override"** instead of
  being forwarded to Floating UI — which read it as "wait for a root that never arrives" and
  rendered no bubble at all.

- **A dismissing toast now collapses its row, so the stack above it glides down instead of
  snapping.** The slide-out is unchanged. What changed is what happens after it: the card was
  gone but its row was not, so the whole gap came back in the single frame where the node
  unmounted, and every toast above it jumped. Each toast now sits in a wrapper that animates
  `grid-template-rows` from `1fr` to `0fr` over `--MOTION-DURATION-SHIFT`/`--MOTION-EASE-SHIFT`,
  delayed by `--MOTION-DURATION-EXIT` so it starts only once the slide has finished, and takes
  `-mt-r5` with it so the list's `gap-r5` closes too — a collapse that left the gap standing
  would just make the snap smaller. Measured in a browser: the column reaches its final height
  before the node is removed, so removal moves nothing.

  `min-h-0` rather than `overflow-hidden` is what lets the track reach zero. Both work by
  removing the grid item's automatic minimum size, but clipping would cut off the card's
  `shadow-lg` and the slide-out itself.

  Reduced motion keeps the previous behaviour exactly: `motion-safe:` scopes the collapse, so
  the row never shrinks under a card that (per `motion-reduce:animate-none`) never faded, and
  the provider drops the collapse from its removal wait to match.

  **A dismissing toast is therefore mounted for longer** — `--MOTION-DURATION-EXIT` plus
  `--MOTION-DURATION-SHIFT`, 700 ms on the default tokens against 200 ms before. Nothing visible
  lasts longer; the extra time is a collapsed, empty row. Tests that advanced a fake timer by a
  fixed amount to reach removal need the larger number.

### Added

- **`useFloating` returns a `portalRoot`** — the nearest `<dialog>` ancestor of the trigger, or
  `undefined` for `<body>`. The hook is exported, so this is an addition to the public surface;
  every floating component in the library passes it to `FloatingPortal`.

  The hook also now **promotes its floating element into the top layer when that root is a
  `<dialog>`**, which is what stops the dialog clipping it (below). If you build your own panel on
  `useFloating`, that happens without your asking: the element it positions gains
  `popover="manual"`, a `floating-top-layer` class, and `position: fixed` for as long as it is
  open inside a dialog, and gives all three back when it closes. The class carries a reset for the
  box the user agent attaches to `[popover]` and ships in `@layer components`, so your own
  utilities still out-rank it. Outside a dialog nothing is added and the strategy stays
  `absolute` — verified by measuring a control panel's geometry either side of the change.
- **`ToastProvider` gains a `classNames.item` slot** — the collapsing wrapper around each toast,
  and the route to the spacing between them. That spacing is now set in two places that have to
  agree (`gap-r5` on `list`, and the `-mt-r5` the wrapper collapses to), so retuning it means
  both: `{ list: "gap-r6", item: "motion-safe:data-[dismissing]:-mt-r6" }`.

### Fixed

- **Floating panels work inside `Dialog`, `Drawer` and `CommandPalette`.** Every component that
  portals a panel — `Popover`, `Tooltip`, `HoverCard`, `DropdownMenu`, `ContextMenu`, `Combobox`,
  `MultiSelect`, `ColorPicker`, `DatePicker`, `DateRangePicker` — sent it to `document.body`,
  which put it *under* a modal `<dialog>`'s top layer **and** inside `showModal()`'s inert
  subtree. A `Drawer` containing a `DropdownMenu` opened a panel that was positioned correctly,
  invisible, and took no clicks; nothing a consumer could pass fixed it. The panel now portals
  into the nearest `<dialog>` ancestor of its trigger, so it paints and hit-tests with the
  dialog. Measured in Chromium by `bun run probe:floating-in-dialog`, which drives a real click
  through to the component's own handler — painting above is *not* sufficient, since an inert
  subtree paints and still swallows the press.

  **Nothing to configure, and nothing changes outside a `<dialog>`:** with no dialog ancestor the
  panel still lands in `<body>`, in the same shape as before. (The portal target is resolved from
  the trigger, which the library learns on commit — so a panel rendered *already open* on its very
  first render appears one commit later than it used to, rather than in the wrong place. A panel
  opened by a click is unaffected: its trigger has been known since mount.) Any `<dialog>` counts, including one you
  wrote by hand — the ancestor is read off the trigger, not injected by our components.

  **A panel bigger than the dialog is not bounded by it.** Being a descendant of the dialog is
  what makes a panel visible and clickable, and on its own it would also make the dialog *clip*
  the panel — a modal `<dialog>` carries `overflow: auto` from the user agent stylesheet, so it
  is a scrollport, and Floating UI would correctly treat it as the clipping ancestor. So a panel
  inside a dialog also promotes **itself** into the top layer, with the `popover` attribute: that
  takes it out of every ancestor's clip while leaving it a *flat-tree* descendant of the dialog,
  so it stays interactive and never becomes inert. Its positioning strategy switches to `fixed`
  in the same step, because a top-layer element resolves against the viewport. Measured in
  Chromium: a 14-item menu inside a content-sized `Dialog` reaches **the same number of items as
  the identical menu with no dialog on the page at all**, which is the property the probe now
  asserts — parity, rather than a number that would go stale.

  On an engine without `popover` (it is Baseline 2024) both halves fall back together and you get
  the previous behaviour — the panel is a plain descendant of the dialog, visible and clickable,
  and bounded by it. Never nothing.

  **What is still true of very tall panels, dialog or no dialog:** `DropdownMenu`/`ContextMenu`
  set no `max-height`, so a menu with enough items is taller than the *viewport* and its last
  items fall below the fold. That is unchanged by any of the above and is the same on a bare
  page; it is tracked as finding #507.

  Two consequences worth knowing, both from the DOM parent changing. Inside a dialog the panel
  inherits from the `<dialog>` element rather than from `<body>`, so a custom property scoped to
  your `Dialog`/`Drawer` now reaches it. And **form association now depends on which side of the
  dialog your `<form>` is**: the panel is appended to the `<dialog>` itself, so a form rendered
  *inside* the dialog is the panel's sibling and its fields still need `form="<id>"` — but a form
  that *wraps* the `Dialog` is the panel's ancestor, and fields in a panel now reach its
  `FormData` where before they could not.

## [0.17.1] — 2026-08-08

### Fixed

- **The `lucide-react` peer range made the package uninstallable.** It was `^0.500.0`, and under
  npm's 0.x caret rule that resolves `>=0.500.0 <0.501.0` — a single minor. lucide-react has
  published every icon addition as a minor since, and is now past 1.0, so any consumer on a
  current version got a hard `ERESOLVE` failure rather than a warning:

  ```
  Could not resolve dependency:
  peer lucide-react@"^0.500.0" from @batthewz/response-ui-react-components@0.17.0
  ```

  The range is now `>=0.500.0 <2.0.0`. Nothing in the library's use of lucide changed — it imports
  named icon components, all of which survive 1.x under the same names. Verified by running the
  full suite against 1.30.0: 2792 tests and `tsc --noEmit` pass unchanged.

  The declared range is wider than the one dev dependency the suite pins, which is the gap that
  produced the bug. Both ends are now exercised deliberately rather than assumed.

## [0.17.0] — 2026-08-04

### Fixed

- **Every scrollport in the library is now a containing block**, which stops absolutely-positioned
  descendants escaping the scroll clip and stretching the page. Reported from a consuming app as
  "a huge empty space at the bottom of the site that grows the further you scroll a
  `VirtualizedDataTable`". The report's diagnosis of *this* defect was right in every particular,
  including the parts it flagged as guesses — verified by ablation, not just agreement: with the
  same table and the same 530 042px scroll range but every `Badge` rendered `statusLabel=""`, so
  no `sr-only` box exists, the page does not grow at all. (One of its four numbered symptoms,
  "console errors 2 → 0", is **not** this defect — a `position` declaration cannot resolve a
  console error, and that line almost certainly belongs to the separate placeholder-image change
  in the same report.)

  The mechanism, because the symptom is nowhere near the cause. An absolutely-positioned box with
  no offsets is laid out at its *static position* — but in the coordinates of its containing
  block, which is the nearest **positioned** ancestor. A scroll container that is `position: static`
  is not one, so two things happen at once: the box is not clipped by the scroller, and its
  coordinates are the scroller's **unscrolled** content coordinates. Scroll the scrollport and the
  escaped box is left sitting that far down the page. This library's visually-hidden text is
  `position: absolute` with no offsets — that is what `sr-only` *is* — and
  [Badge](docs/components/badge.md) renders one by default, so rendering a status column was enough
  to trigger it. The consumer did nothing wrong.

  Measured in Chromium at 375×800, before → after:

  | | before | after |
  | --- | --- | --- |
  | [VirtualizedDataTable](docs/components/virtualized-data-table.md), 10 000 rows, scrolled to the end — `documentElement.scrollHeight` | 530 060 | 800 |
  | [Table](docs/components/table.md), three rows, wide enough to scroll sideways — `documentElement.scrollWidth` | 620 | 375 |
  | [Carousel](docs/components/carousel.md).Track, 40 slides inside `AppShell.Main` — `.app-shell-main` `scrollWidth` | 11 266 | 4 000 |
  | [AppShell](docs/components/app-shell.md).Main, one Badge at the end of 4000px of content — `documentElement.scrollWidth` | 3 885 | 375 |

  **It was never virtualization-specific**, which is the part most likely to be missed: a plain
  `Table` hits it too, and `VirtualizedDataTable` only makes it spectacular because the escaped
  boxes sit at coordinates inside a ~530 000px scroll range. Five elements take `relative`, and
  they are not all the same severity — stated per element rather than as a count:

  - `.table-wrapper`, `Carousel.Track` and `.app-shell-main` — **page-stretching, measured above.**
  - `CommandPalette`'s results listbox — **real but bounded.** `children` composes a row's content,
    so a row can hold a `Badge`; row 200's visually-hidden word was laid out 200 rows below the
    panel. The open `<dialog>` is `position: fixed` with `overflow-hidden`, so the damage stopped
    at the panel instead of reaching the page. Not measured in a browser, unlike the three above.
  - `CodeBlock`'s `<pre>` — **preventive only, and it changes nothing today.** Its content is a
    `code` *string* rendered as in-flow line spans. It is here because the rule the new gate
    enforces is "every scrollport, no exceptions".

  `relative` rather than `contain` or a `transform`: it leaves `z-index` at `auto`, so no stacking
  context is created, and unlike those two it does **not** capture a consumer's `position: fixed`
  overlay.

  **It does change paint order, though, and an earlier draft of this entry wrongly said it did
  not.** No stacking context is not the same as no paint-order change: a positioned element with
  `z-index: auto` moves from step 4 of CSS 2.1 Appendix E (in-flow, non-positioned) to step 8
  (positioned descendants), and step 8 paints in tree order. So one of these five now paints
  **over** an earlier-in-tree positioned element that has no `z-index` of its own. Measured: a
  consumer's `position: sticky; top: 0` toolbar written above a `<Table>`, with no `z-index` — the
  ordinary way to write one — is `elementFromPoint`-topmost before the change and completely
  covered by the table after it. Nothing in the library regresses this way (its own overlapping
  parts all carry a `z-index`, and every floating element portals), but **your markup can**. The
  fix is one declaration on your own element: give it a `z-index`.

  **The trade, in both directions — this is why it is a minor and not a patch.** Nothing the
  library itself renders moves. But these five elements are now the containing block for
  `position: absolute` content **you** put inside them, and that is three changes, not one.
  Measured in Chromium at 375×800 on an overlay inside `AppShell.Main`:

  - **Origin.** It resolves against the scrollport rather than against whatever ancestor it
    previously reached (usually the viewport).
  - **It is now clipped.** An overlay overhanging the region's edge used to paint and hit-test
    outside it; at identical geometry it no longer does — `elementFromPoint` 20px above the
    region's top edge returned the overlay before and returns the navbar now.
  - **It now scrolls with the content.** `top: 0; right: 0` inside `AppShell.Main` used to sit
    still at `left: 255` through a 1500px horizontal scroll; it now travels with it, to
    `left: −1245`.

  If you were relying on any of those three, the fix is to position that element against an
  ancestor you control instead — or `position: fixed`, which is **unaffected**, since only
  `absolute` resolves against a `relative` ancestor.

### Added

- **Two new checks for this defect class, because the unit suite is blind to it.** jsdom applies no
  stylesheets and performs no layout, so all 2792 tests were green with all five instances in place
  *and* green after fixing them. `tsc` cannot see CSS, and a screenshot at rest misses it too,
  because it is the **scroll** that displaces the box.

  **`bun run probe:scrollport`** is the real one, and it is the check the bug report asked for:
  *"assert `document.documentElement.scrollHeight` is unchanged after scrolling a tall table's
  scrollport to its end."* It builds a fixture holding every scrollport-owning component in the
  library, renders it in Chromium at 375×800, enumerates what the **browser** treats as a
  scrollport, and asserts each is a containing block and that scrolling it to its end moves neither
  `scrollHeight` nor `scrollWidth`. `--self-test` forces every scrollport back to `static` and
  requires the probe to go red — it does, by +94 458px on the virtualized table. Not in
  `prepublishOnly`, matching `probe:cascade-layer`: it needs a globally-installed Playwright, and a
  missing one must never read as a pass.

  **`bun run verify:scrollport-containing-block`** is a cheap source-level lint that *is* in
  `prepublishOnly`. It reads both halves of the codebase — utilities in `className` and
  declarations in `.css` — pairs a scrollport with its containing block by element rather than by
  file, resolves class strings hoisted into module constants including across `import` edges, and
  reads `className` written as an object property (`getFloatingProps({ className: … })`) as well as
  as a JSX attribute; without those last two it silently reported OK over six real scrollports.

  **What the lint cannot do, stated plainly, because a gate with a false negative is worse than
  none.** It decides a layout property by matching text. It cannot see a scrollport styled through
  a descendant variant (`[&>ul]:overflow-y-auto` — where the parent's `relative` actually *hides*
  the defect), an element with no `className` at all, a class string built by a helper or by
  concatenation, or a consumer's unlayered `.table-wrapper { position: static }` out-ranking the
  utility from outside the package entirely. It rejects variant-prefixed positions (`print:relative`
  leaves the element static on every screen) and accepts `transform`/`contain` utilities, both of
  which it got wrong at first. Treat it as a spelling check and the probe as the measurement.

  `overflow: hidden` is deliberately out of scope for both, and the scripts' headers say why, so
  its absence does not read as an oversight.

### Changed

- **`VirtualizedDataTable`'s `rowHeight` guidance no longer offers a constant it cannot honour.**
  Examples that used `rowHeight={44}` at the default `comfortable` density now use `48` (44 renders
  45px rows), `README.md` included. But the substantive change is the advice, because the old
  recipe — "double the cell padding, add a line of text, round up" — cannot work:

  - **Row height moves with the viewport.** Cells set font-size via
    `text-[length:var(--BodyText-*)]`, which steps at `@media (min-width: 40rem)`, and the
    inherited line-height follows it. No single constant is right on both sides of that step.
  - **Cell content dominates, and this library's own components change it.**
    [Text](docs/components/text.md) applies `text-body-1`, which brings the *paired*
    `--BodyText-1-line-height` (2rem) with it — so a `<Text>` in a `render` makes a `comfortable`
    row **53px** against ~45px for the same row as a bare string. That is the reported case,
    reproduced exactly, and it means the `48` above is 5px short for it. There is no number this
    changelog can print that survives what you put in the cell.
  - **The failure is bounded, not unbounded** — an earlier draft of this entry said otherwise and
    was wrong. Both spacers are `index * rowHeight` and the index math divides by the same
    `rowHeight`, so the error cannot accumulate. Measured at `rowHeight={44}` over 10 000 rows:
    `scrollHeight` 440 072 against a nominal 440 045 — a 27px excess plus a few pixels of
    misalignment inside the mounted window, not the five-figure loss first claimed here. The last
    row stays reachable.

  So the docs now tell you to measure your own worst row rather than to copy a figure.
  **`rowHeight` remains declared-only:** nothing checks that what you declared matches what
  rendered. A dev-mode warning comparing a mounted `<tr>`'s height to `rowHeight` would catch every
  variant of this — theme, viewport, and cell content alike — and is the obvious next step, but it
  is a component behaviour change rather than a documentation fix and is not in this release.

## [0.16.0] — 2026-08-04

### Added

- **[Wizard](docs/components/wizard.md) animates its step panel**, with the swap
  [Tabs](docs/components/tabs.md) panels already used: the outgoing step fades out, and only once
  that lands does the incoming step mount and fade in. Sequential rather than a cross-fade, so the
  two are never on screen together and the panel never holds both heights at once. Back animates
  like Next, and so does clicking an earlier marker in the header. Pressing **Finish** animates
  nothing — it moves the index past the last step without changing which panel is showing.

  Two consequences worth knowing, both documented under
  [Motion](docs/components/wizard.md#motion). The panel now remounts when the fade-out *finishes*
  rather than when the index changes, so an outgoing step keeps its state for the length of its
  exit; and the focus move that lands a screen-reader user on the new step waits for that panel,
  instead of announcing the old content under the new step's name. Under
  `prefers-reduced-motion: reduce` the exit is skipped outright, not shortened, and the new step
  mounts on the same tick as before.

  **This will break your tests before it breaks your app.** A test that presses Next and asserts
  the next step's content in the same tick now finds the outgoing step, because the incoming one
  has not mounted yet — this package's own `Wizard` suite failed in exactly four places on the way
  in. Either drive the assertion past the exit by firing `animationend` on `.wizard__content`
  (dispatch **both** `animationend` and `webkitAnimationEnd`; jsdom exposes no `AnimationEvent`
  constructor and React registers only one of the two names), or stub
  `prefers-reduced-motion: reduce` for the suite and keep the assertions synchronous. The second
  is what this package does, so that step-logic tests stay about step logic.

- **`usePanelTransition` is exported** — the machine behind both, so a flow you assemble yourself
  out of [`useWizard`](docs/components/wizard.md#usewizard--the-headless-core) and a
  [Stepper](docs/components/stepper.md) gets the identical two-beat swap rather than an
  approximation of it. It returns the value whose panel belongs on screen, the class for the
  current beat, the `animationend` handler that ends the exit, and a `panelRef` to attach;
  `{ enterClass, exitClass }` swaps the `fade-*` pair for any other animation classes.

- **A panel that is not going to animate swaps instantly**, in `Tabs` and `Wizard` alike. An exit
  exists to let an animation finish, so where none will run there is nothing to wait for: the
  swap lands in the same commit, before the browser paints, and the outgoing panel is never shown
  for a frame on its way out. Both components ask the browser directly (`getAnimations()` on the
  panel) rather than assuming one will run, which covers a consumer stylesheet winning with
  `animation: none !important` and the component sitting under a `display: none` ancestor when the
  value changes. An animation cut short mid-flight fires `animationcancel` rather than
  `animationend`, and either one now ends the exit.

  Worth knowing, because it reads the other way round: a Tailwind `animate-none` on the panel
  suppresses **nothing**. `fade-in` / `fade-out` come from `@batthewz/response-ui-css` unlayered,
  and unlayered CSS out-ranks `@layer utilities`, so the utility never wins — which makes the
  panel's animation the one declaration in this library a caller's `className` cannot beat. Both
  component docs now say so next to the "`className` wins" promise.

### Fixed

- **The first panel swap after mount had no exit animation** — in `Tabs`, on every first tab
  switch, for as long as the exit has existed. The outgoing panel's class reached the DOM and the
  browser never started the animation, so the content changed instantly and only then faded in;
  every later switch in that component's life animated correctly.

  The cause was the swap being held as two `useState` atoms updated together during render. React
  invokes a component more than once per update and discards the earlier invocations — reliably on
  the first update after mount — and the replay applied one setter and reverted the other, setting
  and clearing the exit inside a single frame. It is now one state atom written through a
  functional updater, so a replay converges on the same answer instead of losing half of it.

  Nothing could see this: the class was present, `getComputedStyle` reported the right animation
  name, duration and easing, and jsdom does not reproduce the replay, so the full suite stayed
  green with the defect in place. It was found by measuring `animationstart` / `animationend` in a
  real browser, which is the only instrument that can.

  A second instance of the same trap was found and fixed while hardening the above: outside the
  render loop a functional updater receives the **committed base**, not the state the render it is
  reacting to was built from, so the layout effect that ends an exit had to name an absolute
  target rather than undo whatever was in flight. That one was also invisible to the suite —
  verified by reverting it and watching all 75 relevant tests stay green.

## [0.15.0] — 2026-08-03

### Added

- **[Dialog](docs/components/dialog.md) takes `lightDismiss`**, closing on a press that both
  begins and ends outside the panel. Off by default, and the default is the decision: a modal
  that light-dismisses is one a misplaced press can throw away, which is right for something you
  are reading and wrong for a destructive confirmation or anything holding a half-finished form.
  Only the call site knows which it has.

  What it does is narrower than "close on a click outside", because the obvious spelling has two
  bugs. A press on the scrim is dispatched at the `<dialog>` element itself, so a containment
  test — `event.target === event.currentTarget`, or `useClickOutside`, which reaches for
  containment internally — is true for the scrim *and* for the panel's own `p-r2` padding; the
  tell has to be geometry, the pointer landing beyond the panel's border box. And keyed on the
  release alone, selecting text in the panel and dragging past its edge dismisses it and throws
  away what was being edited, because that click resolves to the dialog with coordinates
  outside. Both ends of the press are therefore required.

  `onClick` and `onPointerDown` are **composed rather than spread** for this, so passing either
  cannot silently delete the behaviour, and `preventDefault()` in yours is the opt-out. Those
  two props behave unlike every other prop on the element, and the doc says so.

- **`useLightDismiss` is exported**, which is the same behaviour as a hook for anything else the
  browser puts in the top layer. `CommandPalette` had this logic inline and now shares it, so
  the two cannot drift; it is also the answer to the trap `useClickOutside` sets on a modal
  `<dialog>`, where containment can never report "outside" and the hook silently never fires.

- **`DialogHeader` and `DialogBody`**, for the one piece of structure that cannot be assembled
  correctly from outside the component: a panel whose middle scrolls while its title and its
  actions stay put. `DialogHeader` renders a close control when given `onClose` (named through
  `closeLabel`, defaulting to "Close") and none when not — a panel that must be read to the end
  is entitled to withhold one. It is first in the DOM deliberately, because `showModal()` puts
  focus on the first focusable descendant, so a dismissal at the *end* of the content is also
  what decides where a scrolling panel opens: at the end of the content.

  `DialogBody` carries `min-h-0`, which is the load-bearing half — a flex item's floor is its own
  content, so without it the region grows to fit and pushes the panel past the viewport instead
  of scrolling inside it. It adds no padding of its own (the panel's `p-r2` is already the
  gutter) and is a containing block, because the library's visually-hidden text is
  `position: absolute` with no offsets and would otherwise escape the clip and stretch the page
  to the height of content scrolled out of sight.

### Changed

- **The Dialog panel is a flex column while it is open** — `open:flex open:flex-col`, and the
  qualifier is the whole point. A `display` an author declares beats the user agent's
  `dialog:not([open]) { display: none }` at any specificity, so the same two utilities without
  `open:` would render every closed dialog in the library inline on the page, in flow, with no
  backdrop and no top layer. The variant compiles to `:is([open], :popover-open, :open)`, so a
  closed panel matches nothing.

  Two consequences for existing call sites. Children of an open panel are flex items now rather
  than blocks; the base reset already zeroes margins, so spacing is unchanged, but a child
  relying on block-layout behaviour may not be. And a bare `display` utility in `className` no
  longer overrides the panel's own, since `open:flex` outranks it while the panel is open —
  `open:grid` and the like do.

- **`FormActions` no longer shrinks.** As a Dialog's footer it is a flex item beside a scrolling
  body, and a shortfall is distributed across every item, so the button row was squeezed by the
  content above it rather than the content scrolling. In normal flow, which is everywhere else it
  is used, `shrink-0` declares nothing.

## [0.14.1] — 2026-08-03

### Fixed

- **A long unbreakable run in [Markdown](docs/components/markdown.md) prose scrolled the whole
  page sideways at a phone's width.** A document carries runs no line break can fall inside — a
  scoped package name, a custom property, a bare URL — and one of them set its block's minimum
  width, pushing every ancestor past the viewport. Headings were the worst case and the one least
  likely to be caught: the responsive type scale multiplies the run by the largest step in it, so
  a string that is unremarkable in a paragraph overflows as an `<h1>`. Measured on a 375px column,
  a heading holding a scoped package name overflowed its box by 175px; it now wraps.

  `overflow-wrap: anywhere` on headings, paragraphs, list items and blockquotes — not
  `break-word`, because only `anywhere` also lowers the min-content contribution, which is what
  lets a `.markdown` inside a flex or grid parent shrink rather than push its container wide. In
  normal flow the two are indistinguishable; neither breaks a word that fits.

  **Tables and code blocks are deliberately excluded**, and their behaviour is unchanged. A long
  run in a cell should widen the table and let the wrapper's `overflow-x` scroll it — that is
  `Table`'s contract — and breaking the text there trades a scrollbar for a one-character column.
  `CodeBlock` is exempt by its own `white-space` and scrolls its `<pre>`. A caller who wants a
  cell to break can still say so through `classNames.table`.

## [0.14.0] — 2026-08-02

### Added

- **[Stepper](docs/components/stepper.md) animates its status change**, so advancing a flow
  reads as movement along the track rather than as a repaint — and
  [Wizard](docs/components/wizard.md) gets it for free, since it draws its header through
  `Stepper`. Two things move. The marker's ink, fill and ring, the rail behind it and the step
  title all **cross-fade** over `--MOTION-DURATION-SHIFT`. The marker's content **pulses once**:
  a fade from `opacity: 0` with a `0.5 → 1.02 → 1` scale over `--MOTION-DURATION-ENTER`, which
  marks exactly the markers that just changed. Both are dropped under
  `prefers-reduced-motion: reduce`, leaving the glyph at full opacity rather than stuck at zero.

  The pulse runs on a status change **and on first render**, so a stepper appearing mid-flow
  reads as arriving. It re-fires because the glyph is keyed on its status: a CSS animation
  restarts when it is applied to a *new* element, never when a second selector re-applies the
  same `animation-name` to the one already carrying it, so a `[data-status]` rule would have
  fired once and gone quiet for the rest of the flow. The key is on the glyph and not on the
  marker, so a clickable marker is never rebuilt under the user's own focus — with the cost
  that a caller's `icon` is remounted with it.

  The marker's ring **width** is deliberately not transitioned. The current step's ring is one
  pixel heavier than the rest, and at 1x device pixel ratio a circular border cannot draw a
  fraction of a pixel: measured on a centre scanline of the marker, Chrome held the ring at 2px
  for 395ms of a 400ms transition and flipped it to 3px in the final frame, landing a visible
  jump after every colour had already settled. Off the list, the width lands at t=0 under the
  cover of the pulse — which is also what that cue is for, since it is the half of "you are
  here" that survives greyscale.

- **`Stepper.Step` gains a `glyph` slot** — `span.stepper-glyph`, the box around the numeral or
  icon and the one the pulse scales. `classNames={{ glyph: "animate-none" }}` opts a step out of
  the pulse without reaching for a global motion token.

### Changed

- The clickable marker's hover feedback was a hard-coded `duration-150 ease-[ease]`, called out
  as a deviation in its own docs. It is now the same `--MOTION-DURATION-SHIFT` /
  `--MOTION-EASE-SHIFT` pair as every other colour transition in the package — one property
  cannot carry two timings, and hover and status both move `border-color`.

## [0.13.0] — 2026-08-02

### Added

- **`Markdown`** — renders a documented subset of Markdown as real components. Fenced blocks
  become [CodeBlock](docs/components/code-block.md), tables become
  [Table](docs/components/table.md), and everything else becomes the semantic element it should
  be, so a rendered document is the same design system as the rest of the app.

  The parser is hand-written and produces an **AST, never an HTML string** — there is no
  `dangerouslySetInnerHTML` in the path and no sanitizer to configure wrongly. URLs pass a
  scheme **allowlist** (`http`, `https`, `mailto`, `tel`, plus non-SVG `data:image/*`); a refused
  URL drops the element and keeps the author's text. Raw HTML renders as literal text, which is
  what lets type syntax like `Omit<ComponentPropsWithRef<"a">, "href">` survive a table cell.

  The subset is the contract and is written down in
  [docs/components/markdown.md](docs/components/markdown.md). Not supported, deliberately:
  reference links, setext headings, lazy continuation, indented code blocks, footnotes, task
  lists, raw HTML.

  Bounded against hostile input: nesting caps at 32 levels and a link label at 999 characters
  (CommonMark's own limit), so neither deep `>` runs nor long bracket runs can exhaust the stack
  or the main thread.

  **Prose is on the body scale, and the rhythm is one rule.** The foundation styles `h1`–`h6`
  but zeroes `p` and leaves its size alone, so a document measured 16px/24px — Preflight's
  `line-height: 1.5`, not the design language's. The root now carries `text-body-1`, which puts
  `--BodyText-1` and its paired line-height under paragraphs, list items and quotes at once;
  headings are unaffected, and so is `CodeBlock`, which pins its own leading. A
  [Table](docs/components/table.md) leaves cell line-height to inherit, so rows measured 9px
  taller inside a document — intended, since a table in a document keeps the document's rhythm,
  and `classNames.table` is the way back. Spacing is now a single inherited value,
  `--markdown-flow`, meaning "the space above me": one rule spends it for the whole document and
  every other rule only names a value. Not a `gap` — `gap` is uniform and flex margins add
  rather than collapse, so the heading asymmetry would return as `calc()` against no token.

  Ordered markers ask for **tabular figures** so their digit columns line up. Whether they get
  them is the theme's font's answer, not this component's: a face carrying a `tnum` table evens
  the columns exactly (`Inter` and `Space Grotesk` go from 0.9em of raggedness to zero), and a
  face without one — the default included — renders identically with the declaration and
  without. Markers are right-aligned regardless, so the periods align either way. The library
  does not swap the face to force the issue: that would put a second typeface in the middle of
  prose to fix a problem the consumer's own font choice decides.

- `Table` now also exports `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell` and
  `TableCell` as named exports. **Not** added to the barrel — `Table` stays the one public
  spelling. They exist because a directive-neutral module cannot dot into a `"use client"` one
  under RSC without throwing, and `Markdown` renders tables while staying server-renderable.
  See the `## RSC` note in [AGENTS.md](AGENTS.md).

## [0.12.0] — 2026-08-01

This release is the whole of the "sensible defaults, overridable" work: component CSS moved into
`@layer components` so a caller's utility wins, the two column-scale stylesheets were deleted in
favour of native Tailwind utilities, and every component gained a `classNames` slot API for the
internals `className` cannot reach.

**Why one release and not three.** The plan that drove this argued for shipping each phase
separately, so the version would land where the breakage actually is. That argument holds when the
phases can be published independently — here they could not be observed independently: all three
landed before anything was published, so no consumer ever saw an intermediate state, and cutting
two versions nobody could have installed would buy history rather than information. The breaking
surface is large and it is all in this one minor. Read the *Breaking* section in full before
upgrading.

### Breaking

- **This package's component CSS is now in `@layer components`, so `className` overrides
  work.** Every per-component import in `src/styles.css` carries `layer(components)` — there
  were 44 when this landed and there are 26 now, because the same release then moved most of
  that CSS into utilities (see *The stylesheets are mostly gone* below) — and Tailwind orders
  that layer **below** `@layer utilities`. `<StatCard className="flex-row
  border-0 bg-surface-2">` now does what it looks like it does, on every component — previously
  a utility touching any property a component stylesheet already set landed in the DOM, changed
  nothing and reported no error, and the documented workaround was the important modifier
  (`p-r1!`). Roughly 20 component pages said "a `className` cannot …"; all of them are answered.
  `src/tokens.css` stays unlayered: it carries `@theme inline`.

  **What you give up.** Your own unlayered stylesheet now beats ours without needing to be
  ordered after it — including a global `*:focus { outline: none }`, which will delete the
  library's focus rings. That is deliberate and there is no carve-out: writing that reset is an
  opt-out of focus visibility. The important modifier still works everywhere it did, and is now
  unnecessary nearly everywhere it was recommended.

- **`Timeline.Item` no longer emits the shared `fade-right` class.** Items carry
  `data-entering` instead — set by `ScrollReveal` for exactly the interval the entrance plays —
  and `Timeline.css` owns the whole `animation` shorthand, reading the same
  `--MOTION-DURATION-ENTER` / `--MOTION-EASE-ENTER` tokens and the same `@keyframes`. It had to:
  the foundation's `.fade-right` is unlayered, so from `@layer components` no rule here could
  re-point its `animation-name` and every card would have entered from the same side, sliding
  across the rail. If you key CSS or a test off `.timeline-item.fade-right`, key it off
  `.timeline-item[data-entering]`.

- **`Tabs` no longer styles its own scrollbar.** The 3px `::-webkit-scrollbar` height, the
  resting `transparent` thumb and the `:hover` thumb colour are deleted. From
  `@layer components` none of the three could win against `response-ui-css`'s universal
  `*::-webkit-scrollbar*` rules in any state, and defending them would have needed `!important`
  on a pseudo-element — which closes the override route completely, with not even an inline
  `style` left. Scrollbar appearance is the foundation's, app-wide; a scrollable tab strip now
  shows the same scrollbar as everything else, and the mask gradient remains the overflow cue.

- **`MasonryGrid`'s `gap` takes a spacing token, not a CSS length, and `--masonry-gap` is
  deleted.** `gap?: string` becomes `gap?: "r1" … "r6"` (default `"r4"`), the same `Gap` union
  `Grid`, `Row` and `Stack` already take — so `gap="1rem"` is now a compile error rather than a
  raw value slipping past the token scale. The rendered spacing is unchanged at the default:
  `gap-r4` compiles to `gap: var(--R-SIZE-4)`, which is byte-identical to the
  `var(--masonry-gap, var(--R-SIZE-4))` it replaces, and still steps up at the 40rem breakpoint.

  The gutter is now a `gap-r*` utility on the root and an `mb-r*` utility on each item, with
  `last:mb-0` for the trailing edge. One prop drives two properties on two elements because CSS
  multi-column has **no row-gap** — the space beneath an item was always a margin, and
  `--masonry-gap` was a single token feeding both halves. Splitting it into utilities means each
  half is now overridable from the call site (`className="gap-r1"` on the root,
  `className="mb-r1"` on an item), which the custom property never allowed.

  Two things go away with it. Setting `--masonry-gap` through `style` no longer does anything —
  pass `gap`, or put a `gap-*`/`mb-*` utility in `className`. And `className="mb-0"` on an item
  now works directly: the old docs told you it lost to unlayered component CSS and that you
  needed `mb-0!`, which stopped being true once the margin became a utility.

- **`Grid` and `MasonryGrid` ship no stylesheet, and `Grid`'s `columns` is a bounded union.**
  `Grid.css` and `MasonryGrid.css` are deleted; their column scales are native Tailwind
  utilities. `Grid.columns` goes from `number` to `1 | 2 | 3 | 4 | 5 | 6` — the exact range
  `Grid.css` shipped a rule for — so `columns={7}` is now a compile error (see *Fixed*).
  `MasonryGrid.columns` was already typed `1 | 2 | 3 | 4` and is unchanged.

  **The rendered layout is unchanged.** `grid-cols-n` compiles to
  `grid-template-columns: repeat(n, minmax(0, 1fr))`, byte-identical to the
  `repeat(var(--rui-grid-columns, 1), minmax(0, 1fr))` it replaces, so the
  wrap-instead-of-overflow promise survives; `columns-n` compiles to `columns: n`;
  `break-inside-avoid` to `break-inside: avoid`; and Tailwind's `sm`/`md`/`lg`/`xl` are the same
  40/48/64/80rem the two stylesheets hard-coded. The `rui-grid`, `masonry-grid` and
  `masonry-grid__item` class names all stay on their elements as declaration-free markers, so a
  consumer stylesheet, a devtools search and a non-React consumer of
  `@batthewz/response-ui-css` all still have one name to target.

  **Two things go away.** `--masonry-columns` and `--rui-grid-columns` no longer exist, so
  setting either through `style` does nothing — pass a `columns-*` / `grid-cols-*` utility in
  `className`, which reaches counts the props do not and is overridable per breakpoint, which
  the variables never were. And because the count is now one utility *per breakpoint*, a bare
  `className="grid-cols-2"` replaces the base step only: `columns={{ base: 1, md: 3 }}` plus
  `grid-cols-2` is two columns below `48rem` and three above. Name every step to override every
  step.

- **`StatCard.Trend`'s colour moves off `direction` onto a new `sentiment` axis.** The
  `.stat-card__trend--up` / `--down` classes no longer carry any colour — they mark
  direction and drive the arrow only. Colour now comes from
  `.stat-card__trend--positive` / `--negative` / `--neutral`. Direction's neutral class is
  renamed `--flat` so the two vocabularies can't alias. Anything overriding trend colour by
  class must retarget; anything reading `--up`/`--down` for the arrow is unaffected.
  Rendered output for existing markup is unchanged, because `sentiment` defaults to the
  direction-implied value.

- **`Sparkline`'s `bar` variant measures from zero.** Its default domain is widened to
  include zero (`Math.min(0, …)` / `Math.max(0, …)`) instead of starting at `min(values)`.
  Existing bar charts will re-render: the smallest datum is no longer a zero-height,
  invisible rect, and series in a narrow band far from zero now read as flat instead of as
  full-scale swings. `line` and `area` are unchanged — they encode position, not magnitude.
  Pass an explicit `min`/`max` to restore any previous framing.

- **`MediaCard.Image`'s `className`, `ref` and rest props now address the ratio box, and the
  `<img>` is reached through a new `imgProps` bag.** The box is the outermost element the
  subcomponent renders, so this is the package's house rule — `className` goes to the outermost
  element — applied to the one part that broke it: the box received *nothing*, had no override
  route at any level, and every prop flew past it into the picture it frames. `src` and `alt` stay
  `Image`'s own props and are written **after** the bag, so `imgProps` can neither re-point the
  picture nor erase the alt text; `imgProps.className` merges after `size-full object-cover`, so
  `object-contain` still beats the default. This is the split
  [`Spotlight.Image`](./docs/components/spotlight.md) already shipped and
  [`Hero.Background`](./docs/components/hero.md) gains in this release.

  **What breaks, and only half of it is loud.** The split is exact: every attribute that is
  `<img>`-only becomes a type error against the box's `div` props — `loading`, `srcSet`, `sizes`,
  `decoding`, `fetchPriority`, `crossOrigin`, `referrerPolicy`, `useMap`, `width` and `height` —
  so the compiler finds those ten for you. Every prop legal on **both** elements still compiles
  and now addresses the box: `className`, `style`, `ref`, `onLoad`, `onError`, and `id`/`title`/
  `aria-*`. Move them into `imgProps={{ … }}`, and grep — the compiler will not find them.

  **`ref` is the one to grep for first.** A `useRef<HTMLImageElement>` slips through because
  `HTMLImageElement` is structurally assignable to `HTMLDivElement` — the only member
  `HTMLDivElement` adds to `HTMLElement` is a deprecated `align`, which `HTMLImageElement` also
  carries — so the caller silently holds a `<div>` and `naturalWidth`/`naturalHeight` read
  `undefined`. No props type can close this one.

  **`onLoad`/`onError` still fire**, which is worth knowing before you go hunting for a dead
  handler: React attaches a listener for these non-delegated events directly to the `<img>` and
  then dispatches up its own component tree, so a handler on the box runs even though the DOM
  event never bubbles. What changes is `event.currentTarget`, which is now the `<div>` — and
  reading `.naturalWidth` off it is itself a compile error, so that half is loud.

- **`Skeleton`'s `width` and `height` props are deleted — geometry is `className`, both axes.**
  `width` defaulted to `"100%"` and always shipped as an inline `style`, which outranks any class
  in any layer, so `w-64` on a Skeleton never applied however this package's CSS was layered.
  `height` had no default, so `h-48` worked. One component, two geometry props, opposite answers,
  and nothing in the API saying which was which. Now `w-full` rides in the class list where `cn()`
  collapses it against whatever `w-*` you pass — one `width` declaration reaches the element, never
  two racing on source order — and the height default stays in CSS as `.skeleton { height: 1em }`
  in `@layer components`, where an `h-*` utility outranks it. Height is deliberately *not* moved
  into the class list: a utility there would out-rank `.skeleton--circular { height: auto }` and
  flatten every circle. Two mechanisms, one contract.

  **What breaks.** Both props are now type errors, so nothing changes silently. Translate them into
  classes: `width="65%"` → `className="w-[65%]"`, `height="8rem"` → `className="h-32"`,
  `width={40} height={40}` on a `circular` skeleton → `className="w-10"` and let the aspect ratio
  supply the other axis. `size-4` works too, since it conflicts with both `w-*` and `h-*`. An
  inline `style` still beats every class and is the hatch for a dimension only known at runtime.

  **The documented escape hatch never worked, which is worth more than the fix.**
  `style={{ width: undefined }}` was published as the way to drop the inline `100%` and shrink a
  Skeleton to fit its content. Measured, it produced a **0px** box, and always had: a Skeleton's
  only child is the `sr-only` label, which is out of flow, so `width: auto` on an `inline-block`
  resolves to zero. `w-auto` and `w-fit` measure the same and are documented as such — they are
  useful only where a flex/grid parent, `flex-1` or a `min-w-*` supplies the size.

- **`--progress-bar-fill` and `--progress-bar-fill-end` are deleted; the fill's colour is a `bg-*`
  utility.** The pair was declared on `.progress-bar__fill` — the element that *reads* it — and all
  four colour modifiers redeclared it on that same element, while `color` defaults to `"accent"`.
  A declaration on an element beats an inherited one at every cascade layer, so a theme setting
  either variable at `:root` was overwritten on **100%** of bars; measured, a consumer who set the
  pair got the unchanged default. Relocating the declaration to `.progress-bar` could not have
  fixed that either — the modifiers would still have shadowed it. So the route those two tokens
  advertised was already dead, and deleting them removes an advertisement, not a capability. The
  four `colorClass` entries now carry `bg-accent` / `bg-status-success` / `bg-status-warning` /
  `bg-status-error`, which **read** `--C-ACCENT` and `--C-STATUS-*` instead of shadowing them, so
  the theme route works where the token route never did. `variant="gradient"` composes an
  arbitrary `bg-[linear-gradient(…)]` per colour on top, reproducing the old ramp exactly rather
  than going through `bg-linear-to-*`, which would have changed the interpolation space to oklab.

  **What breaks.** The ten declarations of the pair — two on `.progress-bar__fill` and two on each
  of the four colour rules — are gone along with the rules that held eight of them, and setting
  either custom property now does nothing, which is what it already did. To re-tint every bar in
  the app, override `--C-ACCENT` / `--C-STATUS-*`; for one bar, pass `color`, or
  `classNames={{ fill: "bg-…" }}`, which beats both.
  `.progress-bar__fill--accent`/`--success`/`--warning`/`--error`/`--gradient`
  all stay on the element as **declaration-free marker classes**, so devtools, a consumer
  stylesheet and non-React consumers of `@batthewz/response-ui-css` still have one name per
  colour — but a stylesheet that *read* colour off one of them now finds an empty rule, and a
  stylesheet that sets one gets it, because a consumer's unlayered rule beats our utility. On a
  `gradient` bar the ramp and the colour are different tailwind-merge groups, so a
  `classNames.fill` of `bg-…` replaces the colour and **leaves the ramp**; pass `bg-none`
  alongside it, or use `color`.

- **`MultiSelect` and `CommandPalette` are compound components.** `MultiSelect` gains `.Content`,
  `.Item`, `.ItemIndicator`, `.Empty`, `.Tag` and `.TagRemove`; `CommandPalette` gains `.Item`. A
  listbox row, a chip, its remove button, the check mark and the "nothing matched" row each have an
  identity a consumer would address by name, and each had **no override route at all** — not a
  class, not a prop, not a ref. A map of slot keys would have been the wrong shape for the same
  reason: these are elements you want to *compose*, not merely re-class.

  **The data stays the component's.** `options` / `items` remains the single writer, and `children`
  is an optional **function** the root invokes over the list it has already filtered — so a caller
  maps rows and never authors them. Omit it and nothing changes: the default tree is the same
  composition, so a custom one cannot drift from it. The two functions differ in grain.
  `MultiSelect`'s is called once, with `{ options, selected }`; `CommandPalette`'s is called once
  **per row**, with `{ item, index, active }`.

  ```tsx
  <MultiSelect options={options} value={value} onValueChange={setValue}>
    {({ options, selected }) => (
      <>
        {selected.map(({ value, label }, index) => (
          <MultiSelect.Tag key={value} index={index} className="rounded-full">
            {label}
            <MultiSelect.TagRemove />
          </MultiSelect.Tag>
        ))}
        <MultiSelect.Content>
          {options.map((option) => (
            <MultiSelect.Item key={option.value} option={option}>
              <MultiSelect.ItemIndicator />
              {option.label}
            </MultiSelect.Item>
          ))}
        </MultiSelect.Content>
      </>
    )}
  </MultiSelect>
  ```

  Each subcomponent is an address into the root's own state, and says so out loud rather than
  rendering something wrong: `MultiSelect.Item` throws for an `option` that is not in the list it
  was handed, `.Tag` throws for an `index` outside the selection, `.TagRemove` and `.ItemIndicator`
  throw outside their parent, and `CommandPalette.Item` throws unless it came out of the children
  function — it carries the row's `id`, `role`, `aria-selected`, active state and select handler,
  none of which a caller can supply or get wrong. Consequently **no `item`, `panel` or `empty` slot
  ships on either component**: the subcomponent's own `className` is that route, and one element
  with two writers is one writer too many.

  **What breaks.** `CommandPalette`'s `children` used to be typed through from `<dialog>` and
  rendered *nothing* — the JSX children the component supplies itself always won. It is now
  `(args: CommandPaletteRenderArgs) => ReactNode`, so passing elements is a compile error: delete
  them, or turn them into the function. `MultiSelect` already refused `children`, so its root props
  are unchanged.

- **`MultiSelectOption` → `MultiSelectItem`, `CommandItem` → `CommandPaletteItem`.** Both are
  exported types and both are now the prop type of a subcomponent as well as an element of a data
  array, which is exactly when a name has to say which component it belongs to — `CommandItem` never
  did. **No alias is kept**, so the compiler finds every site: rename the `import type` and you are
  done. Neither shape changed a field.

- **`Breadcrumbs.Separator` is now `Breadcrumbs.Divider`.** One concept, two shipped words: the
  menus called the same thing `Divider`, and `Divider` is a top-level component in its own right.
  `<Breadcrumbs.Separator>` no longer exists, so this is a compile error rather than a silent
  fallthrough — which matters more than usual here, because the root detects a caller-rendered
  divider by **reference identity** (`child.type === BreadcrumbsDivider`) to pair it with the crumb
  it precedes. An element that is not literally that component is treated as a crumb, so a wrapper
  of your own around the old name would have gone quietly wrong. The root's `separator` **prop** is
  unchanged and keeps its name; only the subcomponent moved.

- **`DropdownMenu.Label` and `ContextMenu.Label` are now `.GroupHeader`.** `label` means
  *accessible name* everywhere else in this package — there are 30 `*Label` props saying so, and a
  `Label` component in `form/` — while this element is a heading over a group of menu items.
  `<DropdownMenu.Label>` → `<DropdownMenu.GroupHeader>`, same for `ContextMenu`; the props type and
  the rendered `<span role="presentation">` are unchanged. If you assert on the
  used-outside-a-provider error, its text moved with the name: `MenuLabel must be used within a menu
  provider` is now `MenuGroupHeader must be used within a menu provider`.

- **The menu surface's class names are `menu-*`, and `classPrefix` is deleted.** The five classes
  inside a menu panel were built at runtime from a context field —
  `` cn(`${classPrefix}-item`, className) `` — and both menus set that field to the same literal,
  `"dropdown-menu"`. So it was a generalisation with one value, **and it was already violated**:
  `ContextMenu` painted its panel, items, icons, dividers and headings with `dropdown-menu-*`
  classes named after the other component, plus one `context-menu-trigger` class **no stylesheet in
  this package ever defined**. Anyone styling a context menu from CSS was either targeting a class
  named for a component they were not using, or targeting one that did nothing.

  The five are now static and shared, in a new `menu-internals.css` that `styles.css` imports
  alongside the rest: `dropdown-menu-content` → **`menu-content`**, `-item` → **`menu-item`**,
  `-item-icon` → **`menu-item-icon`**, `-divider` → **`menu-divider`**, and `-label` →
  **`menu-group-header`** (the element renamed in the same pass, above). `DropdownMenu.css` keeps
  `.dropdown-menu-trigger` and nothing else; `context-menu-trigger` is **gone from the DOM** — the
  trigger carries only your `className` now.

  **What breaks.** A stylesheet or test selector for `.dropdown-menu-item`, `.dropdown-menu-content`,
  `.dropdown-menu-divider`, `.dropdown-menu-item-icon` or `.dropdown-menu-label` finds nothing:
  switch to the `menu-*` name, and note that the rule now applies to **both** menus, which is what
  it always did in practice. `.context-menu-trigger` has no replacement — put your own class on
  `<ContextMenu.Trigger className="…">`. Nothing about a menu's appearance changed. A concatenated
  class is also a class Tailwind's source scanner cannot see, so every static gate in this repo was
  blind to all five.

- **`TagInput`'s `className` now addresses the outermost element, and the bordered field box is
  `classNames.control`.** `TagInput` returns a block wrapping three things — the field box, the
  validation message and the polite announcer — and that block received *nothing*: it was
  unstyled, unreachable at any specificity, and a margin or width meant to cover the control
  *and* what it says about itself had nowhere to land. The docs' answer was to wrap the
  component in your own element. `className` reaches that block now, which is this package's
  house rule everywhere else, and the frame it used to reach is a slot under the same word
  `Select`, `NumberInput`, `DatePicker` and `MultiSelect` already spend on that element.

  **The edit is one line, and nothing warns you.** `<TagInput className="border-dashed" />`
  becomes `<TagInput classNames={{ control: "border-dashed" }} />`. Both spellings are valid
  props with valid types, so the compiler is silent and the utilities simply stop doing
  anything visible on the outer block — grep for `<TagInput` and move each `className` whose
  string was aimed at the frame. Merge order inside `control` is unchanged (base classes first,
  yours last), so a utility touching a property the frame already sets still replaces it, and a
  `className` genuinely meant for the whole control — `w-64`, `mt-r4` — is correct where it is
  and should be left alone.

  **`...props`, `ref` and the `id` do not move**, and deliberately: they stay on the text
  `<input>`, because `<label for>` binds only to labelable elements and the form store's
  focus-the-first-error path calls `.focus()` through that same `ref`. `classNames.input` and
  `classNames.tagRemove` are unchanged.

- **The stylesheets are mostly gone, and what a caller's `className` now beats changed with
  them.** Component CSS went from **44 stylesheets to 26** and from **2,048 declarations to
  600**; eighteen files were deleted outright. This is not a tidy-up you can ignore: a
  declaration that used to sit in `@layer components` and lose to your `className` at any
  specificity is now a Tailwind utility in the component's class list, and `cn()`'s
  tailwind-merge decides the winner instead of the cascade. **In practice you win more often,
  not less** — merge resolves your `p-8` against a base `p-r3` cleanly, where before an
  unrelated shorthand could still out-rank it — but the mechanism is different, and a
  `className` that relied on layer order rather than on being a recognised conflicting utility
  may now merge rather than override.

  **Every class name survives.** A deleted stylesheet leaves its BEM classes emitted as
  declaration-free markers, so a consumer stylesheet targeting `.stat-card__value`, devtools,
  and Astro/Rails consumers of `@batthewz/response-ui-css` all keep working. What changed is
  that those selectors no longer carry declarations of ours for you to fight.

  Files deleted: `Breadcrumbs`, `Button`, `Carousel`, `CodeBlock`, `Collapsible`, `Combobox`,
  `DropdownMenu`, `FileUpload`, `MediaCard`, `MultiSelect`, `ProgressRing`, `Rating`,
  `Spotlight`, `StatCard`, `Swimlane`, `ThemeSwitcher`, `VirtualizedDataTable`, `Wizard`. The
  26 that remain each carry a header comment naming why every surviving rule could not move —
  a `@keyframes` block, a UA pseudo-element, a reset that must come first in its rule, a
  `calc()` chain with no property to set, or an element you supply rather than we render.

- **Tailwind Preflight is now load-bearing, and it was not before.** `Rating`, `ThemeSwitcher`
  and `FileUpload` dropped their `all: unset` / `background: transparent` / `border: none`
  resets, because Tailwind Preflight already gives a `<button>` `font: inherit`,
  `color: inherit`, `background-color: transparent`, `border: 0 solid`, `border-radius: 0`,
  `box-sizing`, `margin: 0` and `padding: 0`. `Button` has always relied on exactly this and
  carried no reset; those three now share the exposure. **A build that disables Preflight will
  see UA button chrome behind the stars, the theme options and the upload actions.** If you
  disable Preflight, you need your own button reset.

- **`RangeSlider`'s root now carries `data-invalid`**, and its invalid skin is keyed off that
  rather than `[aria-invalid="true"]`. If you style `.range-slider[aria-invalid="true"]`,
  retarget `[data-invalid]`. The root never carried `aria-invalid` — see *Fixed*.

- **`Carousel.Track`'s drag state is `data-dragging`, not `.carousel-track--dragging`.** The
  class was applied imperatively with `classList.add` and modified declarations that are now
  utilities, so it could no longer win: `cursor-grab` in `@layer utilities` beats
  `cursor-grabbing` in `@layer components` whatever the DOM says. Retarget `[data-dragging]`.

- **`CalendarBase`'s month/year caption button drops the `calendar-label` class.** Its class
  attribute goes from `"calendar-label calendar-label-button"` to `"calendar-label-button"`.
  All six of `.calendar-label`'s declarations were already overridden by
  `.calendar-label-button` on the same element at equal specificity and later source order, so
  the class styled nothing and could not be made to. `button.calendar-label-button` is the name
  the docs have always used.

- **`Spotlight.Image` merges `imgProps.className` through `cn()`.** The `<img>` now carries
  `size-full object-cover` of its own, so your class merges after it rather than being spread
  raw — `object-contain` still wins. Its column alternation also moved from CSS `order` rules
  onto the elements: a third child of a `Spotlight` item that is neither `Spotlight.Image` nor
  `Spotlight.Content` now takes `order: 0` and sorts *first* instead of last.

- **`Stepper`, `Table` and `VirtualizedDataTable` changed internals a consumer stylesheet may
  have reached into.** `Stepper`'s hidden status word uses Tailwind's `sr-only` instead of a
  hand-rolled clip (`clip` where the copy used `clip-path`); `Table` gained an internal
  `stickyHeader` context so `.table--sticky-header .table-head` became utilities on the
  elements themselves; `VirtualizedDataTable` lost its stylesheet entirely, with
  `table-layout: fixed` moving to `Table`'s `tableProps` hatch.

- **`hover:` is now `@media (hover: hover)`-gated on every converted control.** A converted
  `:hover` rule compiles to `@media (hover: hover) { &:hover }`, so **it no longer fires on a
  coarse pointer** — a tap no longer latches a hover style on menu items, breadcrumb links and
  the breadcrumb ellipsis, `MediaCard`, `Tabs.Tab`, `Pagination`'s page numbers,
  `Table.HeaderCell`, `AppShell`'s toggle and sidebar links, `FileUpload`'s dropzone and five
  buttons, `SearchInput`'s clear button, `MultiSelect`'s chip remove, `ThemeSwitcher`'s option
  wash and `Swimlane`'s "View all". This matches every component that was already
  utility-based, and it is the behaviour the rest of the library has always had. If you relied
  on a touch tap producing the hover appearance, it no longer does.

- **`Hero` `size="full"` is `min-h-dvh` with no `100vh` fallback**, and **`MediaCard`'s hover
  lift uses the `translate`/`scale` properties rather than the `transform` shorthand** — the
  card rises by exactly `--MEDIA-CARD-HOVER-LIFT` rather than by that times the scale
  (0.005rem at the shipped values).

### Added

- **`classNames` — per-slot class overrides for a component's internals, and the exported
  `SlotClassNames<S>` type behind it.** `className` addresses the element a component renders;
  `classNames` addresses the elements it renders *inside* itself, as class strings keyed by
  slot. The keys are a union written out per component, so an unknown one is a compile error
  rather than a prop that silently does nothing, and there is deliberately no `root` key —
  `className` is the root.

  ```tsx
  <StatCard.Trend value={12.5} direction="up" classNames={{ trendIcon: "size-r3" }} />
  <SearchInput value={q} onChange={setQ} classNames={{ icon: "text-fg-secondary" }} />
  <Pagination
    page={page}
    totalPages={9}
    onPageChange={setPage}
    classNames={{ list: "gap-r6", page: "rounded-full" }}
  />
  ```

  **51 components and subcomponents take it, with 103 distinct slot keys reaching 168 elements** —
  the whole library in one pass, off a single frozen vocabulary, so one concept has one name
  everywhere: the framing box around a control is `control` wherever there is one, a repeated unit
  is `item`, a leading glyph inside a repeated unit is `itemIcon`, the filled half of a progress
  control is `fill`. Names that would have meant two things are banned outright rather than
  disambiguated per component — there is no `label` slot anywhere, because 30 `*Label` props
  already mean *accessible name* and `Label` is an exported component.

  Additive and a no-op on screen. Your slot class beats the component's base class for the same
  reason `className` does — the base class is in `@layer components` and yours is a utility.
  Not every internal gets a slot: an element whose class *is* a mechanism stays unreachable on
  purpose, and each component's doc page says which and why under its **Slots** heading. Where the
  right answer was not a class at all it is a subcomponent, a custom property, a `<thing>Props`
  bag or a `render*` prop instead — see the entries below.

- **`renderDay` on the calendars, `renderPreview` and `renderFile` on `FileUpload`.** Where the
  internals are loop-generated, no key can name one instance — a calendar renders 42 cells a month —
  and what a caller wants there is usually different *content* anyway: a dot on a booked day, a
  thumbnail with your own overlay. So those get a render prop rather than a slot.

  `renderDay` takes `{ date, status, outside, today, disabled, selected }` and replaces the day
  button's **children only** — the button, its `aria-*`, its keyboard handling and the
  `querySelector` markers focus management depends on all stay the component's. It ships on
  `Calendar`, `RangeCalendar` and `CalendarBase`, and deliberately **not** on `DatePicker` /
  `DateRangePicker`, which do not forward it.

  `FileUpload`'s two split by what is being previewed: `renderPreview` for images and video
  (`layout: "large"` for a lone one, `"grid"` for several), `renderFile` for every other file and
  for everything under `previewMode="compact"`. Both receive `{ file, previewUrl, index, remove,
  removeLabel, disabled }` — `index` is the position in the `files` prop, which is what
  `onRemoveFile` expects; `remove` is `undefined` unless you passed `onRemoveFile`; and `previewUrl`
  is absent on the first paint and for non-media files, because it is minted in an effect. The
  exported types are `FileUploadPreviewItem` and `FileUploadMediaPreviewItem`. The grid that holds
  them is still the component's, and still reachable through `classNames.list`.

  (`Calendar.css` is renamed `CalendarBase.css` in passing. A stylesheet here is owned by the module
  it sits beside, and this one sat beside `Calendar.tsx` while styling `CalendarBase`'s markup
  entirely — so the one signal of ownership the package has was pointing at the wrong component. No
  selector, no declaration and no custom property changed, and no supported import path exposed the
  file.)

- **`<thing>Props` bags for the elements that belong to another component.** `classNames` reaches
  what a component renders itself; where the target is a nested *component*, a class alone is not
  enough and the answer is a props bag, merged library-class-first. New: `tableProps` and
  `paginationProps` on `DataTable`, `tableProps` on `VirtualizedDataTable`, `badgeProps` on
  `TagInput`, `avatarProps` on `AvatarUpload`, and `imgProps` on `Hero.Background`. In every case
  the component's own contract wins over the bag — `DataTable` spreads `paginationProps` **before**
  `page` / `totalPages` / `onPageChange` (which is why the type `Omit`s them), `VirtualizedDataTable`
  keeps `aria-rowcount` and `aria-busy` for itself, and `TagInput` keeps the chip's
  `role="listitem"` — while a `className` inside the bag merges *after* the library's, so it wins.

  **`DataTable` and `VirtualizedDataTable` also take a `className` at last** (and
  `VirtualizedDataTable` a `style`). Both props types are closed objects that extend no DOM props,
  so there was previously no way to put a class on either root at all, at any level.
  `VirtualizedDataTable` now forwards all three through its loading and empty branches too, which
  used to drop them.

- **`FileUpload` publishes its dropzone state as `data-*` attributes.** `data-has-files`,
  `data-drag-over`, `data-uploading`, `data-success`, `data-error` and `data-disabled` sit on the
  root beside the `file-upload--*` modifier classes they mirror — neither replaces the other. The
  point is that state-keyed styling now goes through the one prop that already reaches that element:
  `className="data-drag-over:ring-2"`.

- **`Popover`, `HoverCard` and `Tooltip` render a pointer arrow, behind an opt-in `arrow` prop.**
  `arrow?: boolean`, default `false`, on `Popover.Content`, `HoverCard.Content` and `Tooltip`
  itself; the surface owns the ref, hands it to `useFloating`, and positions the element from
  floating-ui's own measurement, so a flip carries the arrow to the other edge.

  **This closes a hole rather than adding a feature.** `useFloating` has always exported an
  `arrowRef` option, wired to floating-ui's `arrow` middleware and documented on the Popover page —
  and no component in this package ever passed one, so a consumer could switch on a middleware that
  positions an element nothing renders. The doc said, in as many words, that there is no arrow
  element and nothing to position: a *cannot* that was true only because the library never built
  the half it owned. It is now the `arrow` prop's documentation, and `tooltip.md` and
  `hover-card.md` say the same.

  The arrow takes its `background-color` and `border` from `inherit`, not from a
  `--popover-arrow-*` token — the panel already publishes both, and a second writer would let a
  caller retint the fill and leave the border behind. A `bg-*` or `border-*` utility you put on
  `Popover.Content` therefore reaches the arrow for free, and it survives forced colours.
  `classNames.arrow` is there for size and shape: floating-ui *measures* the element, so a bigger
  arrow stays correctly positioned. Its offset is written **inline**, so a positioning utility in
  that slot loses — paint and geometry only. The element carries `aria-hidden` and a `data-side` of
  `top` / `right` / `bottom` / `left`, taken from the resolved placement, which is what the
  border-trimming rules key off and what you would key your own off: `.popover-arrow` and
  `.tooltip-arrow` are real classes, while `HoverCard` — which ships no stylesheet — dresses its
  arrow in utilities, so there `classNames.arrow` is the only route. `Tooltip` renders a second
  element only while `arrow` is set; with it off, everything below about it rendering one element
  still holds.

  `useFloating`'s own `arrowRef` option widens from `RefObject<Element>` to
  `RefObject<Element | null>`, so the `useRef<HTMLDivElement>(null)` you would actually write now
  type-checks without a cast. Existing calls are unaffected.

  **The two menus deliberately get no arrow.** `DropdownMenu` and `ContextMenu` share one hook, and
  `ContextMenu` positions against a virtual 0×0 rect at the cursor: an arrow there would point at
  nothing, and one shared surface cannot be arrowed for one of its two consumers without a prop
  that lies for the other.

- **`ScrollReveal` publishes `data-entering` and accepts `animation="none"`.** The attribute
  marks the entrance window — added on intersection, removed on `animationend` — so a stylesheet
  can key an animation off it without depending on a foundation class it cannot out-rank.
  `animation="none"` reveals with the marker and no entrance class, leaving the animation
  entirely to the caller.

- **`verify:css-layering` — a publish gate for "the CSS is still actually layered".** Every
  `@import "./components/*.css"` in `src/styles.css` must carry `layer(components)`, `tokens.css`
  must carry none, and an import the script cannot classify fails the run rather than being
  skipped. No allowlist. It exists because the entire `@layer components` change is one keyword
  repeated on 44 lines and **nothing read those lines**: `probe:cascade-layer` re-derives the
  import list from that file, strips whatever `layer()` is written there and adds its own, so it
  compares "unlayered" against "layered" whatever the file says; `tsc` cannot read CSS; and vitest
  stubs CSS imports to an empty string. Deleting the keyword from one import left all ten gates
  green while that component went back to out-ranking every caller utility. Made to fail on
  purpose three ways before being trusted. ([`scripts/verify-css-layering.mjs`](./scripts/verify-css-layering.mjs))

- **`verify:slot-annotations` — a publish gate for "every class on an element you cannot reach is
  a decision somebody made on purpose".** Every `className` attribute in production `src/` must
  either be *reachable* — its value mentions `className` or `classNames` — or carry a
  `// slot:(a|b|e) <reason>` comment saying why the consumer's route is somewhere else: (a) no
  route is owed because the class *is* the mechanism, (b) the route is a custom property because
  the override is a value, (e) the route is a `render*` prop because the element is
  loop-generated. An attribute it cannot classify is a **failure**, not a skip, and a run with
  zero annotations fails too, so it cannot pass vacuously. It rejects `slot:(c)`, `(d)` and `(f)`
  by name: each of those ends in a class merge, so a settled one is reachable and needs no
  comment. There is no allowlist. It reads **435 attributes — 332 reachable, 103 annotated,
  0 failing** — and it prints its own blind spots at every run, including the six
  props-getter sites (`className:` inside an object literal) it structurally cannot see. It found
  17 unclassified elements in six components no slot lane owned, invisible to types, to lint and
  to 2,507 tests. ([`scripts/verify-slot-annotations.mjs`](./scripts/verify-slot-annotations.mjs))

- **Forced-colours focus indicators for six more controls.** `focusOutlineResetControl` is now
  `not-forced-colors:focus:outline-none`, so in forced-colours mode the reset stands down and
  the browser's own outline survives. `Radio` keeps its `Highlight` outline (which the
  library's own `outline-none` utility would otherwise have deleted once layered — WCAG 2.4.7);
  `Input`, `Select`, `Textarea`, `OTPInput`, `Combobox` and `ColorPicker` gain an indicator they
  never had in that mode.

- **`highlight` on `Timeline.Item` and `ActivityFeed.Item`** — champions one entry so it reads
  first. The marker fills with the accent inked with its paired `on-*`, and gains a ring in the
  fill colour so it reads *bigger*: the fill carries which entry at a glance, the ring carries it
  again as width, which is the half that survives greyscale and a theme seating its accent near
  the surface. Hue alone would have been the colour-only pattern this library has closed rows
  against in `Alert`, `Badge`, `Toast` and `Meter`. On `Timeline` the card's hairline strengthens
  to `--C-BORDER-STRONG` as a supporting cue — a border token, because a hairline is a stroke on
  the surface where a fill token guarantees nothing. It works without an `icon` too: the default
  dot is already `--C-ACCENT`, so the ring is the entire cue there.

  The colours are **public custom properties** — `--timeline-highlight-fill` / `-ink` /
  `-border` and `--activity-feed-highlight-fill` / `-ink` — because a `className` cannot do this
  job: it reaches the item and nothing inside it, while one write of these inherits to markers
  the caller never renders. (Precedence is not the reason: with this package's CSS in
  `@layer components`, a caller's utility does beat it wherever a caller can put one.) The ring's
  *width* is deliberately private, so the non-colour half of the cue cannot be overridden away.

- **`sentiment` on `StatCard.Trend` and `StatCard.Sparkline`** — `"positive" | "negative" |
  "neutral"`, defaulting to the one implied by `direction`. `direction` states which way the
  number moved; `sentiment` states whether that is good news. Metrics where the two diverge
  — churn, latency, error rate, cost — can now show a down arrow with a minus sign in green.
  Previously colour rode `direction`, so the only way to green a falling metric was to claim
  it rose, which corrupted the arrow and the sign along with it.

- **`CommandPalette` light-dismisses.** A press that starts and ends on the scrim outside the
  panel calls `onClose`, so the palette is dismissable by pointer and by touch — Escape was the
  only route out, which is no route at all on a phone. "Outside" is the pointer landing beyond
  the panel's border box, and both ends of the press must land there, so a text selection dragged
  out of the search input does not close it. `onClick` and `onPointerDown` passed by a caller are
  now composed with the component's own rather than replacing them; `preventDefault()` on the
  click opts a press out.

- **`Tooltip` takes a `className`, which reaches the bubble.** It renders one element —
  `children` is cloned rather than wrapped, and the arrow above is off by default — and its props
  type was closed, so passing a class was
  a **TypeScript error**, not a prop that quietly did nothing. All ten `Tooltip.css` declarations
  on `.tooltip` therefore had no override route at any level, and four of them reach no theme
  variable either: the padding, the `max-width` wrap width, `word-wrap` and the `z-index`. Per
  instance was the only route those four could ever have, and there wasn't one. It merges through
  `cn("tooltip", className)`, and because the base class is in `@layer components` a utility
  touching a property `.tooltip` already sets replaces it. It is spread nowhere else — the cloned
  child is untouched, so this cannot reach the trigger.

- **Eight type-only exports, so this release's new props can be *named*.** Everything above
  shipped as a prop; a prop whose type has no public name is only half shipped, because a caller
  can pass an object literal at the call site but cannot write the wrapper component, the typed
  helper or the `satisfies` that puts the same value somewhere else.

  From the calendars: `CalendarDayRenderer` and `CalendarDayRenderArgs`, so `renderDay` can be
  declared apart from the JSX (`const renderDay: CalendarDayRenderer = …`); `DayStatus`, the
  selection shape a `renderDay` switches on, which was previously reachable only as
  `CalendarDayRenderArgs["status"]`; and `CalendarSlotClassNames`, the calendar slot map. All four
  are declared in `CalendarBase` and were reachable only through the deep
  `./components/ui/CalendarBase` subpath. `CalendarBase` itself stays internal — the barrel
  re-exports the four types and nothing else from it.

  From the overlays: `TooltipProps`, `PopoverContentProps`, `HoverCardContentProps` and
  `ToastProviderProps` — the four props types that gained `arrow` or `classNames` in this release
  and had no name to hang a `<MyTooltip {...props} />` on.

  Type-only and additive: no value export, no runtime import, nothing renders differently. Slot
  unions stay written inline at the component that owns the anatomy, which is what keeps a typo a
  compile error; `CalendarSlotClassNames` is named only because two components (`Calendar` and
  `RangeCalendar`) already alias one anatomy across module boundaries, and re-spelling it would
  fork it.

- **`Repeater` gains `itemActionProps` and `addButtonProps`, so its four buttons have a route.**
  `classNames.itemActions` reached the *cluster* the Move up / Move down / Remove controls sit
  in and never the controls themselves; the Add button had nothing at all. Both new props are
  prop bags rather than slot keys, because the targets are other components — `Repeater` adds no
  class of its own to any of them, so there is no base class for a class string to merge with,
  and what a caller most often wants on the Add button is its `variant`, which no class can
  change.

  ```tsx
  <Repeater
    form={form}
    name="links"
    defaultItem={() => ({ url: "" })}
    itemActionProps={{ className: "text-fg-muted" }}
    addButtonProps={{ variant: "ghost", size: "md" }}
  />
  ```

  `itemActionProps` applies to all three row controls on every row: the rows come from the array
  field, so no key can name the third one, and a bag cannot tell the three controls apart —
  where they must differ, render your own from the `remove` / `moveUp` / `moveDown` callbacks.
  What `Repeater` owns is `Omit`ted from both bags and re-set *after* the spread, so neither the
  type nor an untyped bag can rename a control, un-disable it or replace what it does: the
  accessible names, `disabled`, `onClick`, `type`, `ref` and `children`. `variant` and `size` on
  the Add button are written *before* the spread, because those two are defaults the bag is
  meant to replace.

### Changed

- **Tailwind Preflight is now a stated requirement, and the declarations that duplicated it are
  gone.** Every component already leaned on Preflight; the README now says so ("import
  `tailwindcss` whole, not just `tailwindcss/utilities`") and AGENTS.md carries the rule that a
  declaration only restating Preflight is deleted rather than converted. Removed as redundant: the
  sort button's `margin`/`padding`/`border`/`background`/`font`/`color` (its `text-align: inherit`
  and `cursor: inherit` stay — Preflight covers neither), `box-sizing` on `.calendar` and
  `.timeline-icon`, `border: none` on `.drawer`, `margin` on the three range inputs and
  `background: transparent` on the RangeSlider overlays, `margin` on `.accordion-heading`,
  `vertical-align` on `.sparkline`, and the `::-webkit-search-decoration` half of SearchInput's
  clear-affordance rule. Verified by a computed-style A/B in Chromium across every touched element:
  no rendered difference. The one computed delta is `border-style` moving from `none` to `solid` at
  a used width of `0px` on the sort button and drawer — invisible, and it makes a caller's
  `border-2` utility work on those elements where it previously computed to nothing.

- **`MultiSelect`'s control uses the shared `focusRingWithin` / `focusRingWithinError`
  recipes** from `src/util/focus.ts` instead of three local rules. Identical pixels, one writer.
  The rule that existed solely to win a deliberate specificity tie
  (`.multiselect-control--error:focus-within`) is gone, because tailwind-merge resolves the
  base/error pair at the call site instead.

- **`AppShell`'s toggle and sidebar link now honour `prefers-reduced-motion`.** Their colour
  transitions had no guard at all; converting made `motion-reduce:transition-none` a one-word
  addition, and leaving the two halves inconsistent was the worse option.

- **`VirtualizedDataTable`'s loading and empty headers now truncate**, like the data one. Header
  truncation used to be scoped to a class only the data branch emits, so the three states drew
  different headers — invisibly, because the divergence was in CSS and the parity test compares
  class attributes only. Columns no longer re-lay out between the loading state and the loaded
  one. Body cells keep the old scoping deliberately: only the virtualised branch truncates them,
  so the empty branch's `EmptyState` is not clipped.

- **`EmptyState`'s sub-parts read `size` from context** rather than from `[data-size]`
  descendant selectors. `data-size` is still written on the root as a marker; nothing reads it
  back. A **nested** `EmptyState` now keeps its own size — the utility form of the old selector
  (`in-[[data-size=sm]]:`) matches *any* ancestor and would have taken the outer one's step.

- **`CodeBlock` no longer guesses at one token two different ways.** Its stylesheet read
  `--BodyText-3` with two different literal fallbacks — `0.75rem` in the header and `0.8125rem`
  in the code — plus `var(--Semibold-Weight, 600)`. Both are now `text-body-3` / `font-semibold`.
  The fallbacks only ever applied when `@batthewz/response-ui-css` was not imported at all, which
  is not a supported configuration; two rules disagreeing about one token is the kind of drift
  that reads as intentional.

- **`DataTable`'s expanded detail row moved from `--C-SURFACE-3` to `--C-SURFACE-2`, and gained a
  3px `--C-BORDER-STRONG` bar down its leading edge.** The old rung was chosen so a detail row
  could never be mistaken for a zebra band, which is the right worry answered in the wrong
  channel: the detail row is the widest, tallest block the table draws, so the deepest rung under
  it made it the heaviest thing on screen, and in a theme that carries chroma into its lower rungs
  it read as a coloured slab rather than a recess. The fill now sits level with the band and the
  marker carries the distinction — the same trade `.table-row--selected` already makes, and one
  that does not depend on how far apart a theme spaces its rungs. The marker is the structural
  neutral rather than `--C-ACCENT` so that a row that is both selected and expanded stays legible
  as both. It is painted as a `background-image`, so `classNames.expandedCell` still replaces the
  fill and keeps the marker. The private `--_table-selected-marker-width` / `-side` pair is now
  `--_table-marker-width` / `-side`, shared by both markers so their width and side cannot drift.

### Fixed

- **`FileUpload`'s Replace and Clear all buttons had no focus indicator at all, and now have
  one.** Their rule opened with `all: unset`, which resets `outline-style` to its initial value
  of `none` — so two focusable `<button>`s shipped with no visible focus ring (WCAG 2.4.7). No
  gate could see it: `verify:focus-affordance` read `outline*` declarations and `all` was outside
  its vocabulary entirely. Dropping the reset restores the UA outline; the guard has since been
  taught the spelling and now covers six further controls that were invisible to it.

- **`RangeSlider`'s invalid state never painted.** The whole invalid skin — the fill's colour and
  both engines' thumb colour — was gated on `.range-slider[aria-invalid="true"]`, and the root
  has never carried that attribute: the component destructures it out of the rest props and
  merges it onto the two `<input>` thumbs, where assistive tech actually reads it. Three rules,
  never matched, for as long as the file existed, so an invalid `RangeSlider` painted exactly
  like a valid one. The root now mirrors the state as `data-invalid` and the skin keys off that.

- **A `Carousel` arrow at the end of the rail fades out again.** `.carousel-arrow[data-hidden]
  { opacity: 0 }` had been beaten by `IconButton`'s `disabled:opacity-50` from a layer above
  since this package's CSS was layered — `data-hidden` and `disabled` come from the same boolean
  — so the arrow rendered as a half-visible, non-interactive ghost with its `pointer-events:
  none` still alive. Its hover wash was also a dead rule: it had been rendering at 100% of
  `--C-SURFACE-2` rather than the intended 75% mix, and the documented behaviour is the opaque
  wash, so the source now agrees with the doc rather than the reverse.

- **`CalendarBase` shipped a rule that had been inert since the caption became a button.**
  `.calendar-label` and `.calendar-label-button` sat on the same element and the second restated
  all six of the first's declarations at equal specificity and later source order. Removed; see
  *Breaking*.

- **`Tooltip`'s WCAG 1.4.13 test asserted nothing.** It read `Tooltip.css` through a
  `?raw` import, which resolves to the **empty string** under this package's vitest config —
  every CSS module is stubbed, `?raw` included — so the assertion had been vacuously green for
  its whole life. It now asserts the bubble's real class list, which is the subject that can
  actually be checked from a test.

- **`SearchInput`'s placeholder sat underneath the magnifier, and `size="sm"` was the same
  height as `md` — both caused by the layer move above, and both caught before publish.**
  `SearchInput.css` declared the icon gutters (`2.25rem`, `2rem` at `sm`) and the small size's
  type and vertical padding, against the `px-r4`, `py-r5` and `text-body-2` of the
  [Input](docs/components/input.md) it renders. Those are utilities, so once this package's CSS
  moved into `@layer components` the component's own rules lost to them at any specificity, and
  the field fell back to `Input`'s padding: the text started at `--R-SIZE-4`, exactly the
  magnifier's own inset. Measured on the same source built both ways at 1280px — `padding-left`
  36px unlayered against 20px layered, with `sm` computing identically to `md` in every property
  once layered. The geometry is now spelled as utilities in `SearchInput.tsx`
  (`px-[2.25rem]`, and `px-[2rem] py-r6 text-body-3` at `sm`), where `px-*` is a single
  tailwind-merge group and therefore *replaces* `Input`'s value rather than racing it in the
  cascade. `classNames.input` still merges last, so your own `px-*` beats the gutter.
  `search-input__input--sm` is still emitted, now as a state hook carrying no rules of its own.
  Three of `search-input.md`'s statements were the inverse of what the browser computed — that
  the literals "out-specify" `px-r4`, that the `sm` step was "complete", and that the input's
  `width: 100%` came from `SearchInput.css` — and are corrected.

- **A menu item's `icon` overflowed its box and closed the gap to the label, at a size that
  ignored the theme's type scale.** `.menu-item-icon` sized the span the icon is wrapped in and
  stopped there. The wrapped content is arbitrary, and an `<svg>` carrying its own `width`/
  `height` attributes — every lucide-react icon renders 24px — is not resized by its parent's
  box: it painted past the 1rem span, ate the row's 0.5rem gap, and left the label sitting hard
  against the glyph. The box now sizes its direct `svg` child, as `Timeline` and `ActivityFeed`
  already do for theirs. Separately, that box was `1rem` while the row's font-size is
  `--BodyText-2`, which steps at the theme's breakpoint — so the glyph read one size too large
  below it and one size too small above it, and any theme rescaling its type moved the label
  without the icon. It is `em` now, so the ratio is whatever the type scale says, under any
  theme. Both apply to `DropdownMenu.Item` and `ContextMenu.Item`, which render the same
  internals.

- **`classNames.pickerGrid` could change the calendar quick-nav's column count and silently
  break its 2-D keyboard navigation.** The count lived twice — as a constant in
  `CalendarBase.tsx` that ArrowUp/ArrowDown stepped by, and as
  `grid-template-columns: repeat(3, 1fr)` in `CalendarBase.css` — kept in step by a comment.
  The new `pickerGrid` slot made the CSS half reachable, so
  `classNames={{ pickerGrid: "grid-cols-4" }}` rendered four columns while the arrow keys kept
  stepping three, with no error, no warning and nothing to notice. The constant is gone: the
  vertical step is now read off the grid's used track list at each press, so the track list is
  the only writer of the count and *any* route to it — a utility, an arbitrary property, your
  own stylesheet, a media or container query — moves the keyboard with the layout. Where no
  stylesheet reaches the element at all the component falls back to three, as before.

- **`CalendarSlotClassNames`' docblock claimed `DatePicker` and `DateRangePicker` alias it.**
  They do not, and never did: each declares its own union (`control`/`actions`/`panel` and
  `control`/`panel`) and hands the calendar an explicit prop list carrying no `classNames`, so
  the calendar inside a picker's popover has no slot route from the picker. The docblock ships
  to consumers through the generated `.d.ts`, which is why this is listed as a fix rather than a
  docs change. `docs/components/date-picker.md` and `date-range-picker.md` already stated the
  limitation correctly and are unchanged.

- **`DatePicker` applied `className` to its root raw, so a caller's own conflicting utilities
  did not resolve.** It was the one root in the package outside `cn()`: `className="p-r3 p-r5"`
  emitted both classes and left the stylesheet's order to decide which won, where every other
  component collapses the pair to `p-r5`. The root now merges through `cn()`. Nothing changes
  for a `className` that carries no internal conflict, and the element still has no base class
  of its own — `classNames.control`, `.actions` and `.panel` are unaffected.

- **`DataTable`, `ContextMenu.Trigger`, `Stagger`, `ViewTransition` and `Parallax` applied
  `className` raw for the same reason, and now merge through `cn()` too.** These were the rest of
  the shape `DatePicker` was the first instance of: a root that takes a caller's `className`
  straight onto the element, so `className="p-r3 p-r5"` emitted both classes and left the
  stylesheet's order to decide, where every other component in the package collapses the pair to
  `p-r5`. None of the five gains a base class — there was nothing to merge *with*, and the merge
  is not there for that; it is there so a caller's own conflicting utilities resolve last-wins.
  Nothing changes for a `className` that carries no internal conflict. `AnimatePresence` and
  `ScrollReveal` already did this, so the animation family is now uniform.

- **`--sparkline-color` was unreachable from a theme.** `Sparkline.css` declared the
  `currentColor` default *on* `.sparkline` — the element that reads it — and a declaration on
  an element beats an inherited one at every cascade layer, so setting the variable at `:root`,
  or on any ancestor, lost permanently. Only an inline `style` or an arbitrary-property utility
  on the chart itself could win, which is what the docs recorded as a limitation. The
  declaration is deleted; every read already carried `var(--sparkline-color, currentColor)`, so
  nothing changes for anyone who sets nothing, and the variable now inherits as a public write
  channel for anyone who does. If you were relying on a `:root` or ancestor value being ignored,
  it now applies.

- **`Grid` was importing its own stylesheet from `Grid.tsx` as well as from `src/styles.css`.**
  The JS-side copy was injected unlayered, where it out-ranked `@layer components`, so
  `<Grid className="grid-cols-2">` kept losing for any consumer resolving this package from
  source. Measured in the dev bundle: two `.rui-grid{` copies before, one after; three computed
  columns before, two after. `bun run verify:no-css-imports` now fails the build on any `.css`
  imported from a `.ts`/`.tsx`.

- **`<Grid columns={7}>` silently rendered one column.** `columns` was typed `number`, so any
  count outside 1–6 emitted a `rui-grid--base-7` class that no rule defined, and the grid fell
  back to a single column through `var(--rui-grid-columns, 1)` — no error at compile time, none
  at runtime. The bounded union makes it a type error. This is the same defect `MasonryGrid`
  closed for counts above 4.

- **`Stagger` writes its delay inline instead of duplicating a foundation rule.** The container
  resolves the step once into `--_stagger-step` and each item carries
  `--stagger-delay: var(--_stagger-step)`; `Stagger.css` is deleted. The old
  `--stagger-delay: inherit` rule won only on source order while this package was unlayered.
  All three documented delay sources still work in the same order, both reduced-motion
  mechanisms survive, and a change to the foundation's own `animation-delay` on `.stagger-item`
  now takes effect instead of being silently out-ranked.

- **`ScrollReveal` keeps its scripting-off cover.** `@media (scripting: none) { opacity: 1 }`
  now carries `!important`; without it the foundation's unlayered `opacity: 0` would win on
  layer and every reveal — including a hero's `<h1>` — would stay invisible for the life of the
  page with scripting off.

- **`Hero` keeps its stagger sequencing guard.** `animation-name: none` on a stagger item inside
  a still-hidden reveal is now `!important`, so an entrance supplied by hand-written markup does
  not run and get spent while the content is at `opacity: 0`. These two are the only
  `!important` declarations in the package; `AGENTS.md` records the test they had to pass.

- **A `Timeline` `icon` no longer has the rail running through it.** The rail is drawn *behind*
  the node, so a bare glyph with transparent gaps showed the line through itself, and the line
  read as passing over the final marker rather than terminating on it. An `icon` now lands in a
  `timeline-icon` **puck** — an opaque `--C-SURFACE-2` disc inked `--C-TEXT-SECONDARY`, exactly
  as `ActivityFeed`'s fallback marker and `Stepper`'s indicator already were. The puck also sizes
  the glyph (`density` steps disc and glyph together), so there is no `size` prop to hand-tune
  per density; direct `svg` children only, so wrapping your icon keeps you in control.

  **The rail moves out to make room, and only for pucks.** A 2rem disc centred on a rail
  `0.5rem` from the content edge would overhang the root and touch the card, so
  `--_timeline-line-offset` and `--_timeline-gutter` became `max()`es over the marker's own
  reach. A timeline of **dots is unchanged** — every dot size fits inside the two `--R-SIZE-*`
  steps those were stated as, so the `max()`es resolve to the same literals. Verified by browser
  measurement rather than arithmetic: rail position, gutter, marker edges, card width and card
  inset are identical across all six density × breakpoint combinations and across
  `card={false}`, `align="center"` and `align="right"`. A timeline of pucks indents its cards
  ~8–10px further, which is the room the disc needs; reserving that in every timeline instead
  would have moved the rail for everyone who never asked for an icon.

- **A `StatCard` sparkline no longer overflows the tile.** The slot capped itself with
  `max-height`, which clamps the wrapper but cannot resize an `<svg>` carrying its own
  `height` attribute — so the chart drew past the box and the overflow consumed the tile's
  entire bottom padding, leaving the line flush against the border. The cap is gone (height
  belongs to `Sparkline`'s `height` prop) and the slot is pinned with `margin-top: auto`, so
  a row of tiles lines its charts up regardless of how tall each one's text runs.

- **A `StatCard` sparkline fills the tile's width.** It rendered at the svg's intrinsic
  120px, covering roughly 60% of a 4-up tile and reading as a layout mistake.

- **The `area` fill bottoms out on the drawing area's floor, not the viewBox edge.** It
  closed at `height`, painting into the gutter `strokeWidth` reserves and putting the area's
  baseline `strokeWidth` px below every other variant's.

- **`Tooltip`'s fade ignored the theme.** It passed a literal `duration: 150` to
  `useTransitionStyles` while `Popover`, `HoverCard` and both menus read `--MOTION-DURATION-ENTER`
  / `-EXIT` through `useFadeDuration` — so it was the one floating surface whose tempo a consumer
  could not reach, and 0.9.0's fix for the other four went straight past it. It now reads the same
  tokens the same way. **Visible on every consumer:** the default theme sets `ENTER: 300ms` and
  `EXIT: 200ms`, so a tooltip fades in twice as slowly as the old literal and out a third slower.
  `useTransitionStyles` writes `transition-duration` **inline**, so no stylesheet rule and no
  `duration-*` utility can out-rank it — the token is not one channel among several, it is the
  only one, which is why the fade is a token and not a slot, and the docs now say so rather than
  merely recording the limitation.

  It also gains the reduced-motion behaviour it was missing: under
  `prefers-reduced-motion: reduce` the duration resolves to `0`, which drops the fade **and** the
  delayed unmount, since both are sized from this number. **If you hard-coded a wait for the
  bubble to disappear**, that delay is now whatever the consumer's theme says; the fallback stays
  150ms for SSR and for a page with no token layer.

## [0.11.0] — 2026-07-29

Requires `@batthewz/response-ui-css@^0.13.0`, which redefines the surface ramp. Read that
package's 0.13.0 entry first — everything here follows from it.

### Breaking

- **Cards are now the lightest surface in the theme, not a grey step below the page.** `Card`,
  `StatCard` and `Timeline.Card` move from `--C-SURFACE-1` to `--C-SURFACE-0`, which under the new
  ramp is the raised sheet — "white paper on a grey page" in a light theme, the lifted panel in a
  dark one.

  This reverts a change that had gone the other way for a real reason: rung 0 used to be
  byte-identical to `--C-CANVAS` in both shipped light themes, so a rung-0 card had no boundary
  against the page and was darkened to compensate. The CSS package has now separated the canvas from
  the ramp, so the boundary exists at the source and the card no longer has to pay for it by looking
  faded.

- **`AppShell` paints `--C-CANVAS`, not `--C-SURFACE-1`.** The shell root is the page floor, and
  under the new model the floor is not a rung at all. Painting it with a surface put it level with —
  and, once cards moved to rung 0, *above* — the navbar, sidebar and cards standing on it.

- **Rungs reassigned across the library** to match raised/recessed semantics. Anything overriding
  these by class or CSS should be re-checked:
  - → rung 0 (raised): `ErrorBoundary` fallback panel; `FileUpload`'s two floating remove buttons.
  - → rung 2 (recessed): every hover and active wash that sat on rung 1 — `DropdownMenu`, `Combobox`,
    `MultiSelect`, `Tabs` (enclosed + pill), `Accordion`, `Breadcrumbs`, `Pagination`,
    `ThemeSwitcher`; plus `Table` zebra rows, `Stepper` indicator chips, the `FileUpload` dropzone
    resting fill, and `AvatarGroup`'s `+N` overflow chip.
  - → rung 3 (deepest): every track — `ProgressBar`, `ProgressRing`, `Slider`, `RangeSlider`,
    `Switch`, `Meter`; the `ThemeSwitcher` group well; `FileUpload`'s drag-over state; and the
    `DataTable` expanded-row cell.

### Fixed

- **`Avatar`'s `offline` status dot no longer uses a surface rung.** Its siblings are semantic ink
  (`bg-status-success`, `bg-status-warning`) while it was `bg-surface-3`. That was survivable while
  rung 3 was the *lightest* rung in dark themes; once the ramp direction was pinned it would have
  become the darkest colour available, nearly invisible on a dark card and ringed by the lightest.
  A surface rung is never contrast-guaranteed against another surface — a border/text token is.
- **A `ProgressBar` inside a `Card` or `StatCard` is visible again.** Both painted `--C-SURFACE-1`,
  putting the track at exactly 1.00:1 against its container — the total the bar is measured against
  could not be seen at all. The track moved to rung 3 and the containers to rung 0, so the pair now
  measures 1.13–1.25:1.

### Changed

- Contrast figures quoted in source comments and component docs were re-measured against the new
  ramp geometry rather than reworded. The hover-wash step in particular improves from 1.02–1.07:1 to
  1.08–1.21:1, which retires the "no re-tint can rescue this" conclusion three of those comments
  carried — the wash now genuinely reinforces the ring instead of being a no-op, though it is still
  short of the 3:1 a non-text cue must clear on its own.

## [0.10.0] — 2026-07-29 — not documented

Published to npm and never recorded here. Nothing has been reconstructed for it after the fact: no
record of its contents was kept at release time, and inventing one would be worse than the gap —
the same call made for 0.6.0 through 0.8.2 below. The published tarball and this repository's
commit history between the 0.9.0 and 0.10.0 releases are the only account of what changed.

## [0.9.0] — 2026-07-28

> **Reading older entries below:** they say "the four shipped themes" and quote per-theme
> contrast tables. That phrasing predates this release. `default` is the only theme the design
> system defines; `events`/`grimdark`/`tech` are worked examples that nothing imports. The
> measurements are still accurate for the themes named — they were never a statement about
> yours.

### Breaking

- **The example themes are examples now, everywhere — and a gate keeps them that way.** `events`, `grimdark` and `tech` had quietly become load-bearing in four places, each locally reasonable, together meaning a consumer's own theme got a worse deal than three that happened to ship:

  1. **`src/tokens.css` contained `:root[data-theme="grimdark"|"tech"|"events"]` blocks** carrying lifted chart ramps and tuned `MediaCard` hover physics. A consumer's dark theme inherited the *light* `:root` chart ramp and got neither. Those blocks moved to `src/examples/example-theme-tuning.css`, exported as `@batthewz/response-ui-react-components/examples/theme-tuning` and imported by nothing. **This package's shipped CSS now names no theme at all** — `grep 'data-theme=' dist/styles.css` is empty.
  2. **The exported type `Theme` was the four example names.** Anyone writing `import type { Theme }` got a union that was simply wrong for their app, under the most authoritative name available. **Removed.** `ExampleTheme` replaces it, and says what it is.
  3. **`THEMES` was `useTheme`'s runtime default.** Renamed `EXAMPLE_THEMES` and moved to `src/examples/example-themes.ts`; nothing in the library reads it.
  4. **`ThemeSwitcher`'s `DEFAULT_LABELS` carried `satisfies Record<Theme, string>`**, making the three examples a compile-time obligation of a shipped component. Now `{ default: "Default" }`.

  **`useTheme()` with no arguments no longer filters.** It previously folded any `data-theme` value outside the four example names to `"default"` — which, once the example CSS is no longer auto-loaded, would mis-report *every* app-defined theme (bug #92's failure mode, widened to everyone). It now reports the attribute as it actually is, `setTheme` accepts any string, and `themes` returns `["default"]`. Pass `themes` to get a typed `setTheme` and registry folding, exactly as before.

  **`ThemeSwitcher` with no `themes` prop now offers only `default`** instead of the four example names. A switcher cannot know your themes and will not guess; one lonely option is the intended signal to pass `themes`.

  **Migration.** `import type { Theme }` → declare your own union (`type AppTheme = (typeof APP_THEMES)[number]`). `THEMES` → `EXAMPLE_THEMES`, and only in demos. Anywhere you relied on the four-theme default, pass `themes` explicitly — you almost certainly should have been already (#92). If you use the example themes with charts or `MediaCard`, add `@import "@batthewz/response-ui-react-components/examples/theme-tuning";` after `.../styles`.

  **New gate: `bun run verify:example-themes`** (wired into `prepublishOnly`). It fails the build if an example theme name reaches a CSS selector in shipped styles, a string literal in library code, the built `dist/styles.css`, or the foundation package's public entries. `src/examples/` and test files are the only exemptions. Prose may still discuss the examples — several component CSS files cite contrast measured against them, which is legitimate evidence.

  **`verify:chart-palette` now also reports the untuned case.** It measures what a theme inherits from the aliases alone, with no `--C-CHART-*` override — informational, never failing. That row is the evidence behind the theme-contract rule: `tech` collapses chart-1 and chart-2 to OKLab distance **0.000**, because it points `--C-ACCENT` and `--C-STATUS-SUCCESS` at the same neon green. Any theme reusing a colour across two contract tokens inherits that collision. Two parser bugs were fixed in the same pass: `@import` was stripped only to the first `;`, which a Google Fonts weight list (`wght@300;400;500`) breaks, and the leftover fragment landed in the next selector — silently dropping every token in a file that carries font imports.

  Requires `@batthewz/response-ui-css@^0.11.0`, which stops importing the example themes from its public entries and moves them to `examples/themes/`.

  **Release order is load-bearing:** publish `@batthewz/response-ui-css@0.11.0` first. Until it is on the registry, a clean checkout + install of this package resolves 0.10.1, whose public entry still imports the example themes — and `verify:example-themes` correctly fails on it, taking `prepublishOnly` with it.

- **A sortable `Table.HeaderCell` now renders a real `<button>` inside the `<th>`, and the tab stop moved onto it (#353).** Previously the `<th>` took `tabIndex={0}` and its own Enter/Space handler while keeping `role="columnheader"`, so nothing announced it as activatable. It is now `<th aria-sort aria-labelledby><button type="button">label + arrow</button></th>`. `role="columnheader"` is kept deliberately — ARIA permits `aria-sort` on `columnheader`/`rowheader` and nowhere else.

  **The documented composition contract survives.** The button carries *no handler*: its click bubbles to the `<th>`, where the same composed `onClick` runs — your handler first, `preventDefault()` still the opt-out — and Enter/Space arrive at that handler as the button's own activation, so a caller's `onKeyDown` still runs first and still opts out. The eight tests encoding that contract were kept, not rewritten.

  **What breaks.** (1) `getByRole("columnheader").focus()` no longer focuses anything interactive — focus the button. (2) A caller's `onClick` now *also* fires on the Enter/Space path, where it previously fired only on the pointer path. (3) The cell no longer sets `tabIndex`, so passing your own adds a second tab stop instead of overriding one. (4) A sortable cell computes `aria-labelledby` on the `<th>`; a rest prop of that name shadows it. (5) The focus ring moved from the whole cell to the button. (6) A sortable header's text is nested one to two levels deeper — `getByText` still resolves. **New prop:** `sortLabel` (default `"Sort by"`, `""` drops the words). ([`Table.tsx`](./src/components/ui/Table.tsx))

- **`ColorPicker`'s saturation/brightness square is now two sliders, not one, and the keyboard model changed (#287).** It was a single `role="slider"` with no `aria-valuenow`/`min`/`max` modelling two axes at once — a shape assistive tech cannot represent. It is now a `role="group"` holding one visually-hidden `<input type="range">` per axis, each with its own name and `aria-valuetext`, with the thumb as `aria-hidden` decoration. The component's own key handler is deleted; the browser owns the model.

  **What breaks.** Arrow keys move **1 point**, not 2%. `Home`/`End`/`PageUp`/`PageDown` now work (0/100 and ±10). The square is **two tab stops** rather than one, and switching axis is a Tab rather than an arrow. **Migration:** if you documented the old 2% step or scripted arrow presses against this control, both change. ([`ColorPicker.tsx`](./src/components/form/ColorPicker.tsx))

- **The calendar's visible month now follows a change of selection, and `defaultMonth` now beats a seeded selection (#310, #311).** Two halves of one decision about which of `month` and the selection owns the visible window.

  **What it fixes.** The displayed month was seeded once, by `useState`, so nothing connected a selection change to the view. Measured: re-rendering `<Calendar>` from `value={June 10}` to `value={September 3}` left the grid on **June, with no day marked selected anywhere** and the roving tab stop still on June 10 — and `onMonthChange` never fired, so a parent could not even detect it. Any date arriving from outside the grid hit this: a text field, a "next available slot" preset, a URL param. `RangeCalendar` had the same defect against `start ?? end`.

  The view now moves when the selection *changes* to a month that is off-screen, and fires `onMonthChange`. It is deliberately **edge-triggered**: a view that re-derived from the selection every render could never be paged away from. Navigate to July with the selection on June 10 and you stay in July.

  **A controlled `month` still wins.** The move becomes a *request* — `onMonthChange` is called with the month that would show the selection, exactly as the ‹ › buttons do — so a controlled caller handles user paging and selection-driven paging through one path.

  **What it breaks.** (1) If you drove `month` yourself purely to work around the old behaviour, you will now get an extra `onMonthChange` call for a move you were already making; it resolves to the same month, so honouring it is idempotent. (2) `defaultMonth` now wins over a seeded selection instead of losing to it — `<Calendar defaultMonth={June} defaultValue={20 Jan} />` opens on **June**, where it used to open on January. That inverts `CalendarBase`'s seed to `defaultMonth ?? focusAnchor ?? today`, which is what `Calendar.tsx` already advertised. Pass only one if you do not want the precedence.

  **Migration:** delete any `month`/`onMonthChange` pair you added *only* to keep the view on the selection. **Revert:** drop the `prevAnchorKey` block in [`CalendarBase.tsx`](./src/components/ui/CalendarBase.tsx) and restore the seed to `focusAnchor ?? defaultMonth ?? today`.

- **`DataTable`'s `rowKey`, `column.render` and `renderExpanded` now receive the index within the sorted dataset, not within the current page slice (#360).** Previously every page restarted at `0`, so a `render: (_, i) => i + 1` numbering column printed `1…10` on every page, and an index-based `rowKey` collided across pages — row 0 of page 2 showed as selected because row 0 of page 1 was.

  **This only changes client-paged tables** — the ones where you pass `pageSize` and let `DataTable` do the slicing. In server mode (`page` + `totalPages` + `onPageChange`, no `pageSize`) you hand over one page and never say how large a page is, so no offset is derivable and the index still restarts at `0`. The index counts the **sorted** order, which is the order on screen, not the original array position.

  **Migration:** if you compensated for the old behaviour by writing `i + (page - 1) * pageSize` in a callback, delete that arithmetic — it now double-counts. If you key off a real identifier, which the docs have always recommended, nothing changes. **Revert:** set `rowOffset` to `0` unconditionally in [`DataTable.tsx`](./src/components/ui/DataTable.tsx).

- **`Button`, `IconButton`, `DropdownMenu.Trigger`, `Popover.Trigger`, menu `Item`s and `ErrorBoundary`'s retry now default to `type="button"` — so a form whose Save button is a bare `<Button>Save</Button>` has no submitter at all.** This is the likeliest upgrade break in the release and, for most consumers, the only migration step.

  **What it fixes.** A bare `<button>` is `type="submit"`, so `<Button>Cancel</Button>` in a form footer submitted the form — and, sitting before the real submit, became the form's **default submitter**, the one Enter fires from inside a text field. Seven sites, six components, none of which set a type. `Button` only sets it when it actually renders a `<button>`; `as="a"` is unaffected. It goes before the rest spread, so `type="submit"` still wins from the call site. ([`Button.tsx`](./src/components/ui/Button.tsx), [`IconButton.tsx`](./src/components/ui/IconButton.tsx))

  **What it breaks.** The mirror case: any button that was relying on the implicit `type="submit"`. `<form onSubmit={…}><Input /><Input /><Button>Save</Button></form>` now has no submit button — clicking Save calls nothing, and Enter from inside a field does nothing either, because HTML performs implicit submission without a submitter only when the form has at most one field that blocks it. A one-input form therefore still submits on Enter and can hide the break; add a second input and it is silently dead. Nothing throws and nothing logs, so a typecheck and a render-only test will both stay green.

  **Migration:** put an explicit `type="submit"` on the one button that should submit each form, and leave every other button bare. Grep for `onSubmit=` and check each form has exactly one `type="submit"` beneath it. **Revert:** drop the default from the six components.

- **Controlled or uncontrolled is now decided on the first render and never revisited — so `value={x ?? undefined}` no longer silently hands the component back its own internal state, and a component mounted without the prop no longer starts obeying it later.** `Accordion` (`value`), `Tabs` (`value`), `Popover` (`open`), `AppShell` (`open` **and** `collapsed`) and `DataTable` (`page`). `useControllableState` and `DataTable`'s `sort` already worked this way; these are the six sites that bypassed it by recomputing `prop !== undefined` on every render.

  **What it fixes.** The bypass was live in both directions, measured by re-rendering with the prop `undefined` and then driving one interaction. Flipping *to* uncontrolled: the clicked `Accordion` section expanded, the clicked `Tab` selected itself and swapped the panel, the `Popover` trigger opened the popover, and both `AppShell` toggles moved the chrome — all from internal state the parent never saw and could not read back. Flipping *to* controlled: an uncontrolled component handed a `value` later discarded whatever the user had already done. On `DataTable`, a server-paged table whose parent ignored the requested page still moved its own slice from `["A","B"]` to `["E"]`.

  **What it breaks, silently.** Two shapes, neither of which throws or logs.

  1. **A parent that wrote `open={o ?? undefined}` and never wired the handler.** It used to work by accident — the `undefined` renders handed control back to internal state, so the component drove itself. Now the mode is fixed at mount, a later `undefined` reads as *empty* (`Accordion` `[]`, `Popover`/`AppShell` `false`, `Tabs` `defaultValue`, `DataTable` page `1`), and **the control is inert**: the trigger clicks and nothing opens. Pass `onOpenChange` / `onValueChange` / `onPageChange` and drive the state, or stop passing the prop at all.
  2. **A parent that mounts with the prop `undefined` and starts passing a value later** — a value that arrives with an async fetch is the common case. The component is uncontrolled for its whole life and now **ignores** that prop; your state says the drawer is open and the drawer is shut. Pass the prop from the first render (`open={o ?? false}`, not `o ?? undefined`), or remount with a changing `key` to re-decide.

  **Migration:** for each of the six props, make the first render decisive. If the component should be controlled, the prop must be defined on the first render *and* the matching `on*Change` must be wired. If it should not be, never pass the prop. `x ?? undefined` is the anti-pattern in both directions. **Revert:** move each `useRef(prop !== undefined)` back to a per-render `const`.

- **A prop removed by `Omit` is now a compile error rather than silence — `?: never` on seven props across seven components.** `Switch`'s `onChange`, `Rating`/`Calendar`/`RangeCalendar`/`CalendarBase`'s `onChange`, `DateRangePicker`'s `color`, and `AppShell.SidebarLink`'s `href`. **Anyone spreading a props bag that carries one of those keys now fails to build.** That is the loud half, and it is intended.

  **What it fixes.** `Omit` is erased at runtime, and TypeScript performs no excess-property check on a JSX spread of a *variable* — so `<Switch {...form.field("on")} />` delivered the very `onChange` the props type omitted, with `tsc` silent. A console-warning test could not see it either: every key involved is a real DOM attribute name, so React never warned. Measured, the damage ranged from nothing to a wrong destination: `DateRangePicker` rendered `color="red"` on its wrapper `<div>`; `Switch`/`Rating`/`Calendar`/`RangeCalendar`/`CalendarBase` put the handler on a host element React never fires it from (0 calls, before and after — the harm was that the binding typechecked); and `AppShell.SidebarLink` was the live one — `{...props}` lands after `to` on the adapter's `Link`, which renders `<a href={to} {...rest}>`, so a spread `href` **won the destination** and the link navigated somewhere else entirely.

  **What it breaks, and how quietly.** The type error is loud, and a build is the right place to find it. What is quiet is the runtime half, for callers TypeScript never checked — an untyped JS consumer, or props widened through `any`: each banned key is now destructured out, so it no longer reaches the element at all. If you were (accidentally) relying on a spread `href` overriding `SidebarLink`'s `to`, that link now goes where `to` says, with nothing to tell you it moved. `ProgressBar` and `StatCard.Trend`, which `Omit` `children`, were **refuted rather than fixed**: JSX element children are emitted after the spread, so a caller's value could never win. A characterisation test pins that.

  **Migration:** delete the key from the object you spread, or destructure it out before spreading. For `Switch`, `Rating` and the calendar family the change channel is `onCheckedChange` / `onValueChange` — `onChange` was never wired and declaring it would have produced a half-bound control that *looks* bound. For `SidebarLink`, the destination is `to`. **Revert:** drop the `?: never` declarations and the matching destructures.

- **`ring-offset-2` became `ring-offset-0` on every control that does not paint a fill.** Visual, on every consumer, with nothing in a typecheck or a render test to catch it. Eight hand-written Tailwind recipes across 13 sites collapse into one shared recipe (`src/util/focus.ts`), covering `Button`, `IconButton`, `Checkbox`, `Radio`, `Input`, `Select`, `Textarea`, `OTPInput`, `TagInput`, `AvatarUpload`, `Collapsible.Trigger` and `ErrorBoundary`'s retry. **The `focus:` / `focus-visible:` keying does not change** — an earlier cut of this release moved every control to `focus-visible:` and that was reverted before release; see below.

  **What it fixes.** Tailwind's ring offset paints a solid band of `--tw-ring-offset-color`, which `@batthewz/response-ui-css` themes to `--C-SURFACE-0` — correct only where the control happens to sit on surface-0, and a halo anywhere else. Offset 0 asks nothing of the offset colour, and it is what the CSS layer already does: its box-shadow rings are flush and its outline rings use the transparent `outline-offset`. Two live defects fell out of the unification: `Collapsible.Trigger` had **no focus affordance at all**, and `Select`/`Textarea`/`OTPInput` were missing the `focus:border` half of the error swap that `Input` had.

  **What the recipe deliberately does *not* unify: the keying.** Buttons ring on `focus-visible:` (`Button`, `IconButton`, `Collapsible.Trigger`, `ErrorBoundary`'s retry); native form controls ring on plain `focus:` (`Input`, `Select`, `Textarea`, `OTPInput`, `Checkbox`, `Radio`). That is a partition by element category, not drift — a browser matches `:focus-visible` on a clicked *text* field but not on a clicked checkbox, radio or `<select>`, so `:focus-visible` alone cannot say "every form control rings under the mouse, no button does". A cut of this release unified them onto `focus-visible:` on the reading that the split was accidental; the reading was wrong and the change was reverted. `TagInput`'s wrapper keeps `focus-within:` (it is not focusable, so `:focus-visible` can never match it) and `AvatarUpload` keeps `group-focus-visible:`.

  **What the offset does *not* change: a filled control.** `Button`'s `primary`, `secondary` and `danger` variants and `ErrorBoundary`'s retry keep `ring-offset-2` (`focusRingButtonFilled`), because there the band is load-bearing rather than decorative. Measured across the four shipped themes, the ring sits at **1.31:1** against `--C-STATUS-ERROR` and **1.76:1** against `--C-SECONDARY` — but never below **2.72:1** against the `--C-SURFACE-0` band. Dropping the offset on a fill would have made a focused `danger` button's ring almost invisible. A transparent control has no such problem (2.52:1 at worst against `surface-2`) and only gains a halo from the band, which is why the two cases now answer differently. An earlier cut of this release applied offset 0 to both; the filled case was never measured.

  **What it breaks.** The ring is now drawn flush against the control instead of 2px outside it, everywhere it used to reserve a gap *and does not paint a fill* (`IconButton`, `Checkbox`, `Radio`, `AvatarUpload`, `Button`'s `ghost` / `ghost-inverse` / `link`). Nothing throws, nothing logs, and a jsdom test asserts nothing about it, so only a visual-regression suite or a human will see it. Loud: any test or override written against the literal string `ring-offset-2` no longer matches, because that string is gone. **Migration:** if you were relying on the offset band to separate the ring from a busy background, draw it yourself with a `ring-offset-*` utility — and pass a `ring-offset-*` *colour* with it, or you inherit the themed `--C-SURFACE-0` band the offset removal exists to avoid. **Revert:** inline the eight original recipes back at their 13 call sites.

  One further change is worth naming because it was never announced: the same cut added `focus-visible:outline-none` to `Checkbox`, `Button`, `IconButton` and `Collapsible.Trigger`, none of which had ever reset the UA outline. That is reverted too — those four keep the browser's own outline alongside the house ring, which is contrast-adaptive and survives forced-colours mode where a `box-shadow` ring does not. `Input`, `Select`, `Textarea`, `OTPInput`, `Radio` and `ErrorBoundary`'s retry still replace it, as they always did.

- **Re-selecting the already-active `Tabs` tab is a no-op instead of an echo.** Clicking the tab you are already on, or arrowing back onto it, no longer calls `onValueChange`. **If you were treating `onValueChange` as "the user pressed a tab" rather than "the selected tab changed" — a refetch, an analytics event, a scroll-to-top — that call is simply gone, with nothing to signal its absence.** It falls out of `Tabs` moving onto `useControllableState`, whose change gate has refused no-op emissions since 0.9.0's `Object.is` note under **Changed**; a test pins it. **Migration:** move the side effect onto the tab's own `onClick`, which composes with the selection rather than replacing it. **Revert:** call `onValueChange` unconditionally in `Tabs.Tab`'s click handler.

- **`DataTable` and `VirtualizedDataTable`'s loading and empty states now render the *full* header, and `DataTable` keeps its `footer` and its pager in both.** The header was written three times in `DataTable` and twice in `VirtualizedDataTable`, and the copies had drifted; there is now exactly one `<Table.Head>` block in each file, used by every state.

  **What it fixes.** Measured before the fix with `selectable` + `renderExpanded` and a sortable column: the `DataTable` loading header had 0 checkboxes, `tabindex` `null`, `aria-sort` `null`, 0 sort icons and `textAlign` `""` — against 1 / 0 / `ascending` / 1 / `right` in the real header. The empty header rendered 3 `<th>` under a body cell spanning `colspan="4"`. And both states returned before `footer` and the pager: **a server-paged table whose current page came back empty lost its pagination entirely**, leaving the user no way back to page 2.

  **What it breaks.** The loading and empty states are now *more* than they were, and three consequences are worth reading before you upgrade. (1) The loading header carries a **live** select-all checkbox — clicking it during a refetch selects the keys of whatever is still in `data`, which for a consumer who leaves the previous page in place while fetching is the stale page. Empty `data` while loading and it toggles nothing. (2) The loading and empty headers carry live sort affordances, so a header is now activatable in states where it previously was not. (3) A test that counted `<th>`, or asserted no `nav[aria-label="Pagination"]` while empty, or asserted a stripped header, now fails — loudly, which is the good case. `DataTable`'s loading branch also gains the outer `<div>` the other two states already had. Separately, `DataTable`'s reset-to-page-1 on an uncontrolled sort change now goes through the same setter as every other page move, so it **notifies `onPageChange(1)`** where it used to mutate internal state behind the consumer's back; the change gate means it only fires when the page actually moves. **Revert:** restore the per-state header copies and the early returns.

- **`FileUpload` accepts `onDrop` again, and composes it instead of losing it — so a caller's `onDrop` no longer silences the drop pipeline.** The prop was declared `Omit<…, "onDrop">`, never destructured, and written before the rest spread, which is the worst of the three: `Omit` is erased at runtime and a JSX spread performs no excess-property check, so `{...bag}` carrying an `onDrop` typechecked, landed on the drop zone **after** the component's own handler, and replaced it. Dropping a file then fired the caller's handler and nothing else — `onFilesSelected` was never called, silently. `onDrop` is now a real prop, destructured, and run through `composeEventHandlers` like the `onClick` / `onKeyDown` / `onDragOver` / `onDragLeave` the same element already composed: yours runs first, the component's follows unless you call `preventDefault()`.

  **What it breaks.** The mirror case: **a caller who was relying on their own `onDrop` suppressing the built-in one now gets both**, so a drop selects files where it previously did not. `preventDefault()` in your handler is the opt-out. **Migration:** none unless you were suppressing; then add the `preventDefault()`. **Revert:** restore `"onDrop"` to the `Omit` union in `FileUpload.tsx`, drop it from the destructure, and write `onDrop={handleDrop}` on the drop zone. ([`FileUpload.tsx`](./src/components/ui/FileUpload.tsx))

- **`ProgressBar` now requires an accessible name in its type: one of `aria-label`, `aria-labelledby` or `aria-hidden` (#203).** A bar carries no text, and `ProgressBar.Label` cannot name it — the root omits `children`, so the label is the bar's *sibling* and no context can join them. The sub-part therefore implied a wiring it never performed: `<ProgressBar.Label>Uploading</ProgressBar.Label><ProgressBar value={64} />` announced "64" and nothing else. Since the association can only be made from the call site, the type asks for it. `Meter` already requires `aria-label` outright; a bar differs only in shipping a label sub-part to point at, which is why `aria-labelledby` is a first-class arm here and `aria-hidden` opts a decorative bar out.

  **What it breaks.** Any `<ProgressBar value={…} />` with none of the three is now a compile error (TypeScript names `aria-label`, the arm most callers want). Nothing changes at runtime — no attribute is added, defaulted or renamed, and an English default was deliberately not invented, since a wrong name announced confidently is worse than a compile error. **Migration:** add the name a screen-reader user needed anyway, or `aria-hidden` if the bar is decoration. **Revert:** drop `ProgressBarNameProps` from the `ProgressBarRootProps` intersection in [`ProgressBar.tsx`](./src/components/ui/ProgressBar.tsx).

- **`Repeater`'s `name` is now checked against the form's value type, and `defaultItem` is typed from it (#260).** `name: string` and `defaultItem: () => unknown` were unchecked, so a mistyped path compiled and quietly wrote a *second* array into the submitted values. `name` is now `ArrayPath<T>` — the dotted paths into `T` that land on an array, including one nested inside another (`sections.0.rows`) — and `defaultItem` returns that array's element type. A typo produces `TS2820` *with a "Did you mean" suggestion*; a non-array path errors; a wrong item shape produces `TS2741`. The types are ~35 lines local to `Repeater.tsx`: `useFieldArray` and `use-form.tsx` are untouched.

  **What breaks.** (1) **A generic wrapper over `Repeater` no longer compiles.** With `T` a naked type parameter the conditional stays deferred, so `function MyRepeater<T>(…) { return <Repeater<T> name={name} … /> }` fails, and TypeScript expands the conditional over three lines to explain why. Concrete-`T` call sites are unaffected. This is recorded as open finding #486 rather than left to be discovered. **The escape hatch meanwhile, documented on [`repeater.md`](./docs/components/repeater.md): wrap `useFieldArray` instead of `Repeater` when the value type is a type parameter.** (2) A path is enumerated to **three segments** of depth — a limit on what the type will enumerate, not on the form store. (3) A form declared as bare `Record<string, unknown>` yields `string` for `name` and `unknown` for the item, so it keeps compiling with its old (absent) checking. **Migration:** none for a call site whose form has a concrete value type. ([`Repeater.tsx`](./src/components/form/Repeater.tsx))

- **A date the pickers refuse now stays in the field instead of reverting (#330, #338).** Typing text `parseDateInput` cannot read, or a day `isDateDisabled` rejects, used to snap the field back to the committed value. It now keeps what was typed, so the entry can be corrected rather than retyped — and so the new message can quote text that is still on screen. The two halves are one decision: a sentence naming `31/31/2026` is incoherent once `31/31/2026` has vanished.

  **What breaks.** (1) The visible input's value after a refused blur or Enter is the typed text, not the formatted committed date — assertions and snapshots over that field change. The committed `Date`, the hidden `YYYY-MM-DD` input and `onValueChange` are all unaffected, which is the guarantee the old tests were actually buying, and they now assert it directly. (2) `Enter` on a draft that has already been refused and not edited since is no longer `preventDefault()`ed — it passes through to implicit form submission, where the field previously ate the key. (3) `DatePicker`'s root `<div>` no longer carries `relative`; the field row is now its own positioning context inside it. Anything you positioned absolutely against the root moves. `DateRangePicker`'s root keeps `relative`, but its floating anchor moved from the root to the field row. (4) Both pickers now render one always-mounted `aria-live="polite"` paragraph below the field(s), visually hidden while empty, so each control has one more DOM node than before. ([`DatePicker.tsx`](./src/components/form/DatePicker.tsx), [`DateRangePicker.tsx`](./src/components/form/DateRangePicker.tsx))

- **Table rows now publish selection to assistive tech: `aria-selected` and `data-selected` on `Table.Row`, and both data tables pass `selected` through only when `selectable` (#351).** Selection was an 8% accent wash and nothing else — `aria-selected` appeared zero times across `Table`, `DataTable` and `VirtualizedDataTable`. A `<tr>` inside a `<table>` maps to role `row`, which supports `aria-selected` in exactly that context — checked against `aria-query` *before* it was set — so no role change was needed and none was made: `role="grid"` would promise cell-level arrow-key navigation this component does not implement. The wash also gained a non-colour channel: a 3px `--C-ACCENT` bar on the row's inline-start edge, painted as a `background-image` because a `border-inline-start` on a `<tr>` joins collapsed-border conflict resolution and would reflow the row on selection; the direction flips under `:dir(rtl)`. Measured in Firefox 146, the wash alone reads 1.06–1.13:1 against neighbouring rows (in `grimdark` a selected row and a banded row are the same luminance); the marker measures **4.65 / 4.38 / 13.08 / 5.30** across the four themes, clearing WCAG 1.4.11 in all of them.

  **What breaks.** (1) `<Table.Row selected={false}>` now emits `aria-selected="false"` — a row that merely *declares* it is unselected claims the table has a selection model, so leave the prop off entirely where there is none. (2) Rows are now matched by `getByRole("row", { selected: true })`, and `[data-selected]` is a styling hook present only when true. (3) `DataTable` and `VirtualizedDataTable` pass `selected` only under `selectable`, so a table given `selectedKeys` **without** `selectable` no longer paints its selected rows at all, where it used to. (4) Any snapshot of a table row gains the attributes. A caller's own `aria-selected` still wins — both attributes sit before the rest spread. ([`Table.tsx`](./src/components/ui/Table.tsx), [`Table.css`](./src/components/ui/Table.css), [`DataTable.tsx`](./src/components/ui/DataTable.tsx), [`VirtualizedDataTable.tsx`](./src/components/ui/VirtualizedDataTable.tsx))

### Added

- **`Timeline` gains `align`, `density` and `card`, making it usable for dashboards.** The component only ever had one shape — a centre rail with cards alternating either side, sliding in as they scroll into view. That is a good marketing shape and a poor dashboard one: it reflows at `40rem`, wastes half of every row, and is the wrong rhythm for a feed you scan rather than read.

  **`align?: "left" | "center" | "right"`, default `"center"`.** `"center"` is exactly the existing behaviour, including its collapse to a left rail below `40rem` — a card inset to half of a 375px viewport has no room for a sentence. `"left"` and `"right"` are single-column at **every** width, so nothing reflows across the breakpoint. `"right"` is a true mirror: root padding, rail and the node's `translateX` all flip, and cards enter from the left rather than the right.

  Physical vocabulary (`left`/`right`, not `start`/`end`) because `Timeline.css` is physical, as is nearly all of this package — `start` would promise a `dir`-awareness nothing here honours. `side` was rejected for having no sibling precedent; `align` matches [`Hero`](./docs/components/hero.md) and the `DataTable` column prop.

  **`density?: "dense" | "comfortable" | "spacious"`, default `"comfortable"`.** The same vocabulary and the same default as [`Table`](./docs/components/table.md), deliberately: it is the package's existing density concept and inventing a second name for it would have cost a breaking change later. It retunes five spacing/size locals and **nothing else** — no density changes a selector, an offset or a type size. The rail's own position is deliberately outside the density group, so switching density changes the rhythm without sliding the rail sideways. Note the `r` scale is inverted (a higher number is a *smaller* value), the mistake logged as #341.

  **`card?: boolean`, default `true`.** `false` strips the border, the surface and the card's padding, hanging text straight off the rail; losing the padding is what pulls the first line up level with its dot. A **separate axis from `density` on purpose** — stacked borders read as noise at `dense`, but a flat timeline is just as legitimate at `spacious` and a dense *carded* one is a real thing too. Coupling them would have made two of those unreachable.

  All four props (with `animate`) are orthogonal; no combination is unreachable and none silently overrides another. There is deliberately **no `variant="dashboard"` preset** — `variant` already means a visual skin on `Button`, `Badge`, `Alert` and `Tabs`, and a preset would freeze one taste judgement into the public API.

  **Mechanically, this does not reintroduce #342.** The three props become `data-align` / `data-density` / `data-card` on the **root**, read by descendant selectors; no item is ever handed its own layout, so a fragment, a `.map` or a component rendering two items still cannot split an item's side from its entrance direction. Entrance direction remains a CSS `animation-name` re-point over the single `fade-right` class every item ships — now applied in the two places a card sits left of the rail (every item under `align="right"`, even items under `align="center"`) rather than one. The attributes sit before the rest-prop spread, matching the rest of the package, so a caller can still override them.

  Two visible knock-ons. `.timeline-title:last-child` now zeroes its `margin-bottom`, so a `title`-only entry no longer carries dead space beneath it — at `dense` that gap was most of the row. And the root now always emits the three `data-*` attributes, which will show up in consumer DOM snapshots. ([`Timeline.tsx`](./src/components/ui/Timeline.tsx), [`Timeline.css`](./src/components/ui/Timeline.css), [`timeline.md`](./docs/components/timeline.md))

- **`Timeline`'s vertical rhythm grouped the wrong things, at the default density — #341's failure mode in the pair #341 left alone.** The gap *under a title* was `--R-SIZE-2` while the gap *between two events* was `--R-SIZE-3`: `2rem` inside an entry against `1.5rem` between them at `40rem` and up. Proximity therefore read an entry's body as a preamble to the **next** event rather than as part of its own. The card border partly masked it, which is why it survived; `card={false}` does not, and it was immediately visible the first time two densities were put side by side.

  Fixed by removing the margin rather than retuning it: **the title now carries no `margin-bottom` at all**, and its separation from the body is the type scale's own leading. `--BodyText-2-line-height` is `1.5rem` on a `0.8125rem` font (`1.75rem` on `0.875rem` at `40rem` and up), so the half-leading below the title and above the body already separates them by roughly half a rem — the explicit margin was double-counting it. That leaves exactly **one** explicit gap inside an entry, `--R-SIZE-6` under the date, which is the tightest step the scale has; so the invariant now holds for any density whose between-events value is looser than that, which every step is. `--_timeline-title-gap` and the `.timeline-title:last-child` special case both went with it — with no margin there is no trailing space to suppress on a `title`-only entry.

  **This changes the default `comfortable` rendering**: the space under a title drops from `--R-SIZE-2` to zero-plus-leading (`2rem` → roughly `0.6rem` of visual gap at `40rem` and up). Entries with a body read noticeably tighter, and as one block. ([`Timeline.css`](./src/components/ui/Timeline.css))

- **`Timeline`'s dot sat above the first line of text under `card={false}`.** The node is pinned `top: 0` of its item, which lands it on the card's top *edge* — deliberate and correct while there is a card. Strip the card and there is no edge to sit on, so the dot floated above the date by half the difference between the dot and the line box: **10px at `dense`** (a `0.5rem` dot against a `1.75rem` line), 7px at `comfortable`, 6px at `spacious`.

  The node now takes the height of that first line box and centres inside it, which is exact for every dot size `density` produces **and** for an `icon` of any height, with no offset to re-derive — the same size-agnostic property that #344 established for the horizontal axis. The X transform is untouched, so `align="right"` keeps its mirror. Scoped to `card={false}`; the carded layout still aligns to the card edge.

  **Both ends of the rail move with it.** Each item draws its segment across its own box and the last one is suppressed, so the chain runs from the first item's top edge to the last item's top edge — which *was* the dot's position. Moving the dot without moving the rail made it overshoot above the first dot by half a line box and stop short of the last by the same, 14px each at `40rem` and up. The chain now shifts down by half a line box, with `bottom` going negative by the same amount so each segment still meets the next one's new start; it runs first-dot-centre to last-dot-centre exactly, at any density and any item height. The offset is held in one local, `--_timeline-first-line`, because the node centres *inside* it while the rail shifts by *half* of it — the #344 lesson about two rules that must land on one derived value.

  One known imprecision, taken deliberately: the line box used is the **date's**, which at `40rem` and up is `1.75rem` — identical to the title's, so the result is exact either way. Below `40rem` the title's box is `1.5rem`, so a *title-only* flat entry sits 2px low. Taking the exact value would mean `:has()`, which nothing in this package uses yet; moving the package's browser-support floor for 2px on one variant is not a trade worth making. ([`Timeline.css`](./src/components/ui/Timeline.css))

- **`FileUploadRejection` is now exported (#490).** The shape `onFilesRejected` hands you — `{ file: File; reason: "type" | "size" }` — was documented but not importable; it joins `FileUploadLabels` in the barrel. ([`FileUpload.tsx`](./src/components/ui/FileUpload.tsx))

- **Add/remove announcements on `TagInput` and `Repeater`, under one convention (#252, #262).** Neither component told a screen-reader user that anything had happened — no confirmation for Enter, Backspace, paste, or the remove button — and `TagInput`'s three silent refusals (`maxTags`, duplicate, `validateTag → false`) were invisible to everyone not looking at the field.

  **The convention, deliberately one and not two:** an announcement is a **function-valued prop** taking the values that need interpolating and returning the sentence, defaulted to English, with `""` returning nothing — and every announcement a component makes goes into a **single** always-mounted `sr-only role="status" aria-live="polite"` region. This is not new; it is `CommandPalette`'s `statusMessage?: (count: number) => string` plus `Repeater`'s own `removeLabel?: (index, count) => string`. A plain string prop cannot interpolate and a `labels` bag is for fixed control names, so neither fits a per-event sentence.

  New props: `TagInput.addAnnouncement` / `removeAnnouncement` / `rejectAnnouncement`, and `Repeater.addAnnouncement` / `removeAnnouncement`. A rejected add never announces "Added", and a paste that both adds and refuses joins the two sentences into **one** write, because a per-tag write leaves only the last one in the region. ([`TagInput.tsx`](./src/components/form/TagInput.tsx), [`Repeater.tsx`](./src/components/form/Repeater.tsx))

- **`ScrollReveal` no longer strands its content when the observer API is missing or scripting is off (#16).** Its default renders `opacity: 0` and only an `IntersectionObserver` cleared it, so a browser without that API showed nothing at all, permanently. It now feature-detects and reveals statically, and a new rule resolves the hidden class to `opacity: 1` under `@media (scripting: none)`. Both verified in Firefox against the real components, the second by toggling only `javaScriptEnabled` against an always-visible control.

  **Still not covered, and said plainly:** scripting *enabled* with a bundle that never executes — a hydration error, a blocked script — because the browser reports `scripting: enabled` either way and the reveal clears from an effect. Server-rendered HTML is likewise unchanged. `animate={false}` remains the only cover for those, and moving the reveal to a layout effect was considered and rejected: it would paint content pre-hydration that then vanishes, which is the exact flash the hidden state exists to prevent. `MasonryGrid`, `Timeline`, `Spotlight` and `Swimlane` all route through the shared primitive and inherit both fixes. ([`ScrollReveal.tsx`](./src/components/animation/ScrollReveal.tsx), [`ScrollReveal.css`](./src/components/animation/ScrollReveal.css))

- **`Stagger`'s delay can now be set from a consumer's own CSS, and `Hero`'s stagger actually fires (#17, #161).** Two halves of one dead feature. The foundation's `stagger.css` re-declares `--stagger-delay` on `.stagger-item` — the very element that reads it — so no ancestor value could ever reach it; and it sets `animation-delay` with **no `animation-name`**, so `Hero.Content animate`'s `ScrollReveal > Stagger` composition could never fire and the wrappers only added DOM depth.

  A new `Stagger.css` declares `--stagger-delay: inherit` on `.stagger-item` and re-reads it with the token as the `var()` fallback. Measured in Firefox on the real components: an ancestor-set `300ms` moved three items from `0s / 0.05s / 0.1s` to `0s / 0.3s / 0.6s`. `Hero.css` supplies the missing `animation-name` **scoped to Hero**, because `stagger.md` states that Stagger deliberately renders nothing that moves on its own and points callers at exactly this escape — a global rule would have contradicted its documented contract. Reduced motion re-checked after the fix: every item `animation-name: none`, zero running animations.

  **The cost, written into the CSS file as well as here:** two packages now declare `.stagger-item` and this one wins on source order, so a future change to the foundation's `animation-delay` will silently do nothing until these declarations are deleted. ([`Stagger.css`](./src/components/animation/Stagger.css), [`Hero.css`](./src/components/ui/Hero.css))

- **`mergeProps` and `composeEventHandlers` utilities** — the house answer to "a caller passed the same prop the component sets". A plain `{...props}` spread *replaces* an event handler rather than adding to it, which is the mechanism behind every "my `onClick` deleted the component's behaviour" defect in this library; until now the package had a shared merge strategy for refs (`mergeRefs`) and for class names (`cn`) but none for props or handlers, across **179 JSX spread sites** in `src/components/**` (an AST count over `JsxSpreadAttribute`, non-test; 166 of them excluding the `.examples.tsx` demos). `composeEventHandlers(theirs, ours)` runs both, the caller's first, so it can opt out with `preventDefault()`; pass `{ checkDefaultPrevented: false }` on events the DOM will not let you cancel (`animationend`, `transitionend`, `pointerleave`), where React still marks its synthetic event as prevented and honouring it would silently re-create the dropped-behaviour bug. `mergeProps(a, b)` does the same across a whole prop object — handlers compose, `className` merges through `cn`, `style` merges by key, `ref` merges through `mergeRefs`, and a `b` value of `undefined` no longer clobbers a defined `a`. ([`src/util/merge-props.ts`](./src/util/merge-props.ts))
- **`Grid` layout primitive** — equal-column responsive grid: `columns` takes a single count or per-breakpoint counts (`{ base: 1, md: 3 }`), and every cell in a row shares the row's height. Columns are `minmax(0, 1fr)`, so content shrinks and wraps rather than overflowing the cell — the failure mode of both a fixed-width column and `MasonryGrid` (which remains the tool for *unequal*-height, Pinterest-style layouts). Fills the gap between `Row`/`Stack` (flow, content-sized) and `MasonryGrid` (masonry) for uniform card grids. Polymorphic via `as`; `gap` on the design-token scale. ([`src/components/layout/Grid.tsx`](./src/components/layout/Grid.tsx), [`Grid.css`](./src/components/layout/Grid.css))
- **`useMediaQuery(query)` hook** — SSR-safe `matchMedia` subscription built on `useSyncExternalStore` (returns `false` on the server and in environments without `matchMedia`). Powers the calendars' single-month mobile collapse; exported for general use. ([`src/hooks/use-media-query.ts`](./src/hooks/use-media-query.ts))
- **Headless form orchestration (`useForm`)** — a store-backed, dependency-free form layer for the existing form controls. Validation is via [**Standard Schema**](https://github.com/standard-schema/standard-schema) (Zod, Valibot, ArkType, … all conform) — the consumer brings the validator, no runtime dependency is added. A single unified `field(name)` accessor binds BOTH native inputs and the library's controlled components (`Combobox`, `TagInput`, `Slider`, `Select`, …) — there is no register-vs-Controller split. For non-string values, annotate the bind: `field<string[]>("tags")`; `checked`-based controls (`Checkbox`, `Switch`) are wired via `watch`/`setValue` instead. Validation modes: `mode` (`onSubmit` | `onBlur` | `onChange` | `onTouched` | `all`), `reValidateMode` (`onChange` | `onBlur`), and `criteriaMode` (`firstError` | `all`). Manual/server errors (`setError`) always win and survive a validation pass; schema errors only surface once a field is touched/dirty or the form has been submitted, so errors never flash at fields the user hasn't reached. Also: `reset`/`resetField`, `trigger`, `clearErrors`, `focusFirstError` (`shouldFocusError` on by default), and a reactive external `values` prop that re-seeds the form when its identity changes. ([`src/components/form/use-form.tsx`](./src/components/form/use-form.tsx), [`form-store.ts`](./src/components/form/form-store.ts), [`standard-schema.ts`](./src/components/form/standard-schema.ts))
- **`FormProvider` + `Field`/`FieldError` auto-wiring** — `Field` now takes optional `name` and `error` props (backward compatible). Inside a `FormProvider`, `<Field name="x">` auto-wires that field's surfaced error into context, `<FieldError />` with no children renders the form-derived error (with `role="alert"` and `aria-describedby` wiring), and bound inputs reflect the error state via `aria-invalid`. ([`src/components/form/Field.tsx`](./src/components/form/Field.tsx), [`FieldError.tsx`](./src/components/form/FieldError.tsx))
- **Store-backed reactivity via `useSyncExternalStore`** — the component calling `useForm` re-renders on any change; `useFieldState(form, name)` and `useFormState(form)` give opt-in render isolation (re-render only when that field's slice / a form-level flag changes).
- **`useFieldArray`** — dynamic lists with stable keys (`id` survives reorders): `append`, `prepend`, `insert`, `remove`, `move`, `swap`, `update`, `replace`.
- **New form exports** — `useForm`, `useFieldArray`, `useFieldState`, `useFormState`, `useFormContext`, `FormProvider`, and types `FieldBindings`, `SubmitHelpers`, `UseFormOptions`, `FormApi`, `FieldArrayItem`, `UseFieldArrayReturn`, `FieldSnapshot`, `FormStateSnapshot`, `ValidationMode`, `ReValidateMode`, `StandardSchemaV1`, `InferInput`, `InferOutput`.
- **`MultiSelect`** — chip-filled multi-select over a closed set of `options`, with an inline search filter, full keyboard navigation (shared floating-ui wiring with `Combobox`), Backspace-to-remove, an optional `maxItems` cap, and `disabled` options. Array value; controllable. ([`src/components/form/MultiSelect.tsx`](./src/components/form/MultiSelect.tsx))
- **`ColorPicker`** — hex colour picker in a floating popover: a 2D saturation/value square (drag or arrow-key), a hue rail, a hex text field, and optional preset swatches. HSV is held internally so hue survives the greyscale extremes; the committed value is always a canonical `#rrggbb` string. Ships dependency-free `color` conversion helpers (`hexToRgb`, `rgbToHex`, `rgbToHsv`, `hsvToRgb`, `hsvToHex`, `hexToHsv`, `normalizeHex`, plus `Rgb`/`Hsv` types). ([`src/components/form/ColorPicker.tsx`](./src/components/form/ColorPicker.tsx), [`color.ts`](./src/components/form/color.ts))
- **`RangeSlider`** — dual-thumb numeric range slider built from two overlaid native `<input type="range">` thumbs (keyboard/focus/AT support for free). Keeps `[low, high]` ordered with a configurable `minDistance`; the actively dragged thumb stays on top so the gesture never hands off mid-stroke. Controllable. ([`src/components/form/RangeSlider.tsx`](./src/components/form/RangeSlider.tsx))
- **`Repeater`** — the UI layer over `useFieldArray`: one row per array entry with remove / optional reorder controls and an "Add" button, delegating each row's fields to a render-prop child. Owns no value of its own (state lives in the form store), so it composes with validation, reset, and submission like any other bound field. `min`/`max` bounds and `reorderable`. ([`src/components/form/Repeater.tsx`](./src/components/form/Repeater.tsx))
- **`Wizard` + `useWizard`** — a guided multi-step flow: the `Stepper` header tracks progress, the active step's `content` renders below, and a footer wires Back / Next (Finish on the last step). Step state is controllable for cross-step validation. `useWizard` is the headless controller (`next`/`back`/`goTo`, `isFirst`/`isLast`/`isComplete`) for fully custom layouts. ([`src/components/ui/Wizard.tsx`](./src/components/ui/Wizard.tsx))
- **`DataTable` expandable rows** — pass `renderExpanded` to give every row a leading expander toggle that reveals a full-width detail panel beneath it (accordion-animated, honours `prefers-reduced-motion`). Uncontrolled by default; pass `expandedKeys` + `onExpandedChange` to control. Composes with `selectable` — the detail cell spans the expander, selection, and data columns. ([`src/components/ui/DataTable.tsx`](./src/components/ui/DataTable.tsx))
- **`verify:focus-affordance` — a publish gate for "outline removed, nothing put back"** (WCAG 2.4.7). Nothing in the toolchain could see this class of defect: `tsc` cannot read CSS, jsdom applies no stylesheets, and vitest stubs CSS imports to an empty string, so no test in this package can assert anything about a rule in a `.css` file. The script pairs every `outline` reset in `src/components/**/*.css` with the JSX that carries the class, derives focusability from the source (native tag, `tabIndex`, `contentEditable`) rather than from a hand-kept list, and requires a focus-keyed replacement painted in `--C-BORDER-FOCUS` — on the element itself, on a pseudo-element under its `:focus-visible`, or on a `:focus-within` ancestor. `tabIndex={-1}` and `aria-activedescendant`-driven elements are printed as named exemptions rather than silently skipped, and a reset class it cannot locate in any `.tsx` is a violation, not a pass. It runs in `prepublishOnly`, and it found two live defects on its first full run — both fixed under **Fixed**, below. ([`scripts/verify-focus-affordance.mjs`](./scripts/verify-focus-affordance.mjs))
- **`verify:omit-discipline` — a publish gate for the `Omit` that isn't there at runtime.** `Omit<Props, "onChange">` is erased at compile time, and TypeScript performs no excess-property check on a JSX spread of a *variable* — so a component can declare a key omitted and still receive it, with `tsc` silent and React quiet (every key omitted in this package is a legitimate DOM attribute name, so there is no warning to catch). The gate is a syntactic TypeScript pass (`ts.createSourceFile`, no program) over `src/**`: for every `Omit<…, K…>` it requires `K` to be destructured out of the props parameter, re-set after the rest spread (JSX element children count for `children`), or allowlisted with a written justification. It handles `interface X extends Omit<…>`, which a `TypeReferenceNode`-only walk misses because an `extends` clause parses as an `ExpressionWithTypeArguments`. An explicit attribute written *before* the spread is reported as **weak**, not failed — that position means a spread value legitimately wins, which is how `type=` is written on `Checkbox`/`Radio`/`Slider`/`SearchInput`/`NumberInput`. It found 7 unprotected keys on the source it was written against; all seven are closed under **Breaking**, and it now reports 102 protected, 0 unprotected. `--check` gates the exit code, and it runs in `prepublishOnly`. ([`scripts/verify-omit-discipline.mjs`](./scripts/verify-omit-discipline.mjs))
- **One shared focus recipe — `src/util/focus.ts`.** Eight distinct hand-written Tailwind focus recipes across 13 sites become eight exported constants — the rings `focusRingButton`, `focusRingControl`, `focusRingControlError`, `focusRingWithin`, `focusRingWithinError`, `focusRingGroup`, and the two outline resets `focusOutlineResetButton` / `focusOutlineResetControl` that a site pairs with its ring when it replaces the UA outline. The `Button` / `Control` split in the names is the keying partition, spelled out so it cannot be re-read as drift and unified away. A control's ring is now a reference rather than a copy. Internal — not on the package barrel; the consumer-facing contract is still the `--C-BORDER-FOCUS` token. Each constant is deliberately **one flat string literal**: `verify:focus-affordance` resolves hoisted class constants textually, and a `${…}`-composed one would not resolve, blinding the guard to every site that consumes it. The two divergences the recipes had accumulated were decided rather than preserved — see the focus-ring entry under **Breaking**. ([`src/util/focus.ts`](./src/util/focus.ts))
- **`useControllableState` takes an opt-in `isEqual`.** The change gate added in this release was hardcoded to `Object.is` — reference equality, which is correct for scalars and a silent no-op for any value rebuilt on each commit (`Date`, ranges, sort tuples), where an unchanged value is a fresh object and re-emits. `isEqual` defaults to `Object.is`, so **every call site that does not opt in is unchanged**; only the two that do — `DatePicker` and `DateRangePicker`, with day-granular comparators — see different emission counts. It is read through a ref, so the setter's identity stays stable. See the picker entry under **Fixed**. ([`src/hooks/use-controllable-state.ts`](./src/hooks/use-controllable-state.ts))
- **`lint` — an ESLint gate, deliberately narrow.** Until now `tsc` was this package's only general static check, and it is blind by construction to the defect that shipped most often here: a JSX spread performs no excess-property check. The config enables exactly two rules — `react/jsx-key` (missing or duplicate iterator keys; four findings in the ledger) and `react-hooks/rules-of-hooks` (a conditional hook corrupts hook order for every later render in a library of ~80 hook-based components). `exhaustive-deps` was enabled, evaluated, and **dropped**: both of its findings were false positives whose suggested fix introduces a bug, and adopting a rule whose output you have to argue with is how a gate stops being read. Typed promise rules were probed too — `no-floating-promises` found nothing and `no-misused-promises` found only idiomatic async handlers, at 3× the runtime. The config sets `noInlineConfig`, so an `eslint-disable` comment cannot silence anything and is itself reported: this repo's "never suppress, only fix" rule is now mechanical rather than advisory. Adopting it removed **16 dead `eslint-disable` directives** from `src/`, some dating to the initial commit, every one written against a linter this package never had configured. ([`eslint.config.js`](./eslint.config.js))
- **`maxHeight` on `Table` and `DataTable` — the bound `stickyHeader` needs (#352, #361).** `stickyHeader` pins `<thead>` against the wrapper `<div>`, not the page: `.table-wrapper` sets `overflow-x: auto`, which makes its `overflow-y` compute to `auto`, so the wrapper is the header's scrollport — and it is content-height, so in ordinary block flow nothing ever scrolls past the header. `Table` callers could already bound it with `className`/`style`; `DataTable` accepts no `className`, `style`, `ref` or rest props at all, so its callers could not bound it by any route and `stickyHeader` was inert. `maxHeight?: number | string` (a number is px) sets an inline `max-height` on the wrapper on both components, and `DataTable` forwards it to `Table`, so one prop name means one thing in the whole family. An explicit `style={{ maxHeight }}` still wins over the prop. The earlier claim on the `DataTable` page — that the header could *never* pin — was too strong and is corrected: a height-bounded flex or grid parent already bounded the wrapper, because a scroll container's automatic minimum size is zero. ([`src/components/ui/Table.tsx`](./src/components/ui/Table.tsx), [`DataTable.tsx`](./src/components/ui/DataTable.tsx))
- **`defaultPage` on `DataTable` (#463).** `sort` had `defaultSort` and `page` had no twin, so "open this table on page 3, then let it manage itself" — a deep link, a restored scroll position — forced the caller to take full control of `page` + `onPageChange` and re-implement the paging the component already does. `defaultPage?: number` seeds the uncontrolled page on mount and is then ignored, exactly as `defaultSort` is: a controlled `page` overrides it, later changes to it do nothing, and the table goes on paging itself and reporting through `onPageChange`. ([`src/components/ui/DataTable.tsx`](./src/components/ui/DataTable.tsx))

- **`rejectMessage` on `DatePicker` and `DateRangePicker` (#330, #338).** `(reason: DateRejection, text: string) => string`, where `reason` is `"unparseable"` (the text could not be read) or `"unavailable"` (it named a day `isDateDisabled` refused, after clamping into `[min, max]`, so an out-of-range date still snaps in). Defaulted to English — `"31/31/2026 is not a date we can read."` / `"… is not available."` — and returning `""` shows nothing **without** giving up `aria-invalid`: `""` removes the word, not the state. The sentence is derived on render rather than stored, so changing `rejectMessage` or the locale reaches a refusal already on screen. **One channel, not two:** the type, the default and the message element live once in [`date-picker-internals.ts`](./src/components/form/date-picker-internals.ts). `DateRangePicker` tracks refusal *per endpoint* — `aria-invalid` lands on the field that caused it, and both sentences are written into a single shared paragraph in field order. ([`DatePicker.tsx`](./src/components/form/DatePicker.tsx), [`DateRangePicker.tsx`](./src/components/form/DateRangePicker.tsx))

- **Five accessible-name overrides on `ColorPicker`'s panel (#485).** `areaLabel` (`"Saturation and brightness"`), `saturationLabel`, `brightnessLabel`, `hueLabel` and `hexLabel` join the existing `panelLabel`; the five strings were hard-coded English with no override path, and the surface grew when #287 replaced one `role="slider"` with a named group holding two named inputs. Flat `<thing>Label` props rather than a `labels` bag, matching `RangeSlider`'s `minLabel`/`maxLabel`. **`""` deliberately does not remove these:** they are accessible names, and an empty one leaves the control unnamed rather than tidily silent. ([`ColorPicker.tsx`](./src/components/form/ColorPicker.tsx))

- **`Repeater` announces a reorder, through a new `moveAnnouncement` (#481).** Adding and removing announced (#262); moving a row said nothing — and because the Move/Remove control names are positional ("Move item 2 up"), every remaining control was silently renamed the instant a row moved. The default is `` (from, to, count) => `Moved item 2 to position 3 of 4.` ``, and it **names both ends on purpose**: a sentence carrying only the destination leaves that rename unexplained. It writes to the same single polite live region as the add/remove announcements, and `""` returns nothing. All three move paths route through one internal `moveRow` — both chevron buttons **and the render prop's own `moveUp`/`moveDown`** — so a custom row control announces too. A no-op move at either end announces nothing. **The control names deliberately stay positional** — documented contract with an existing override path (`moveUpLabel`/`moveDownLabel`); the docs now warn that replacing those means replacing `moveAnnouncement` too, or the two channels describe the same row differently. ([`Repeater.tsx`](./src/components/form/Repeater.tsx))

- **`Stepper` takes `statusLabels`, replacing the hard-coded `"completed"` and `"current step"` (#475).** The two phrases were built internally with no prop reaching them. `statusLabels` is a `Partial<Record<"done" | "active" | "upcoming", string>>` **merged over** the defaults, so `{ done: "abgeschlossen" }` translates one and leaves the other, `{ done: "" }` drops the word, and `{ upcoming: "not started" }` adds one to a status that is silent by default. It sits on the root because these are the same three words for the whole track — `Meter`'s exact shape, the sibling that already ships a status-keyed record merged over defaults. ([`Stepper.tsx`](./src/components/ui/Stepper.tsx))

- **`CodeBlock` takes a `copyButtonProps` bag, so the copy button's name, `copiedLabel`, `timeout` and `onCopyError` are finally reachable (#152).** The button was handed only `value` and a class, so every block's copy button was named "Copy" and nothing else about it could be set from the call site. One bag rather than a prop each — the same shape as `Spotlight`'s `imgProps`, `Swimlane`'s `viewAllProps` and `Table`'s `tableProps` — so `CodeBlock` does not grow a prop every time `CopyButton` gains one. `value` is deliberately not accepted: the button copies the block's own `code`, which is the point of the block. `className` is **merged** onto `code-block-copy` rather than replacing it. ([`CodeBlock.tsx`](./src/components/ui/CodeBlock.tsx))

- **`Toast` takes a `dismissLabel`, and it reaches the queue (#476).** The dismiss button's `aria-label="Dismiss"` was hard-coded with no prop reaching it. The new prop follows the file's own `statusLabel` / `statusIcon` convention and threads through `ToastOptions`, so `toast(msg, { dismissLabel })` reaches it — an override the primary entry point cannot get to is not an override path. **One deliberate departure from the house `""`-removes rule:** the button's only content is an `aria-hidden` glyph, so this label is its **only** accessible name — `dismissLabel=""` falls back to `"Dismiss"` rather than shipping an unnamed control. ([`Toast.tsx`](./src/components/ui/Toast.tsx), [`ToastContext.tsx`](./src/components/ui/ToastContext.tsx))

- **`AvatarUpload.errorTimeout` — the validation tooltip now clears itself (#386).** Default `5000`ms; `0` keeps it up until it is dismissed or the next file is chosen, which is the old behaviour. Named after `CopyButton`'s `timeout` and taking `ToastContext`'s `0`-means-never semantics rather than minting a third spelling. ([`AvatarUpload.tsx`](./src/components/ui/AvatarUpload.tsx))

- **Every fixed word `FileUpload` renders is now overridable (#420).** All seven strings were hard-coded English — "Drag & drop or", "browse", "Uploading...", "Replace", "Clear all", `Remove ${file.name}` and the empty dropzone's `aria-label="Upload file"` — and only the last was reachable, by accident, through the rest props. **Two existing conventions, no third:** the six static words go on a `labels` object with a `DEFAULT_FILE_UPLOAD_LABELS`, the shape `CalendarLabels` already ships; the one interpolated string becomes `removeFileLabel?: (file: File) => string`, the shape `TagInput` and `Repeater` use. A key you leave out keeps its default; `""` renders empty rather than falling back. **A caller's own `aria-label` still beats `labels.dropzone`** — rest props are spread last, asserted in both directions. ([`FileUpload.tsx`](./src/components/ui/FileUpload.tsx))

- **`AppShell.SidebarSection.titleAs` (#395).** `"h2"`–`"h6"`, defaulting to `"h2"` — the identical prop name, shape and default `Swimlane` already ships. A shell whose page already spends `h2` on its own sections wants `"h3"` here. ([`AppShell.tsx`](./src/components/ui/AppShell.tsx))

- **`DataTableProps` and `TableProps` are now exported, from their modules and from the `ui` barrel (#477).** `data-table.md` named `DataTableProps` in prose while a consumer wrapping the component could not import it, and `VirtualizedDataTableProps` was already exported — so the family was inconsistent in both directions. ([`DataTable.tsx`](./src/components/ui/DataTable.tsx), [`Table.tsx`](./src/components/ui/Table.tsx))

- **`ColumnDef.sortLabel` reaches the sort button's accessible name through either data table (#482).** #353 gave `Table.HeaderCell` a `sortLabel`, but both data tables construct their header cells for you, so a consumer of either had no route to it and shipped hard-coded English. One optional field on `ColumnDef` plus one line in each table's single `renderHeader()`. Defaults to `"Sort by"`; `""` drops the words and leaves the button named by the column alone; ignored on a column that is not `sortable`. ([`DataTable.tsx`](./src/components/ui/DataTable.tsx), [`VirtualizedDataTable.tsx`](./src/components/ui/VirtualizedDataTable.tsx))

- **`Timeline.Item` takes `titleAs`, and `title` is now `ReactNode` (#343).** The title was a hard-coded `<h3>` typed `string`, so neither the level nor the content shape could be changed — `Swimlane` already typed its own title as `ReactNode`, and this was the outlier. `titleAs` picks `h1`–`h6`, defaulting to `h3`. It can still only be a *heading*; making an entry a non-heading is out of reach and the page now says so. ([`Timeline.tsx`](./src/components/ui/Timeline.tsx))

### Changed

- **`docs/theme-contract.md` is now the component layer only — the base contract is `@batthewz/response-ui-css`'s, and is no longer restated here.** This page had grown into a near-complete second copy of the foundation's contract, and the two drifted in both directions rather than one being a superset of the other. Concretely: this copy still told theme authors to run `bunx @batthewz/response-ui-css theme-from-json`, **a CLI the foundation deleted in its 0.2.0** (that release's changelog lists removing the reference from its own contract; the copy here was never updated, and the foundation is now at 0.11.0 with no `bin` entry at all). In the other direction, "The contrast pairing" — base design-system truth, cited from six component pages — existed *only* here, so a theme author reading the foundation's contract never saw it. That section has moved upstream where it belongs.

  **What stayed:** the tokens this package actually defines in [`src/tokens.css`](./src/tokens.css) — `--C-TREND-*`, `--C-CHART-1..5`, `--MEDIA-CARD-HOVER-*` — their Tailwind mappings, and the `useTheme` registration step, which is React-side and has no foundation equivalent.

  **Links are unaffected.** Every anchor other pages pointed at (`#the-contrast-pairing`, `#surfaces-layered-backgrounds`, `#motion`, `#authoring-workflow`, `#dashboard--trend--chart`) still resolves; the base ones are now short redirect sections that state the rule in a sentence and link upstream for the full text. No component page needed editing.

- **`Card` draws a border, and `StatCard` moved onto the card rung — a fill step was doing a job only a border can do.** Two related corrections, both following from the surface ramp being a *nesting depth* rather than an elevation (see the matching `@batthewz/response-ui-css` entry).

  **`Card` gains `border border-border-default`.** Its fill is `--C-SURFACE-1`, and [`AppShell`](./src/components/ui/AppShell.css) paints its own body the same token — so a card inside the shell had **1.00:1** against its backdrop and was bounded by `shadow` alone, which on a dark theme is black on near-black. One surface step is 1.02–1.07:1 even in the un-collided case, so the fill was never going to be the edge. The border and the shadow both point the same way in every theme; the fill does not.

  **`StatCard` moves from `--C-SURFACE-0` to `--C-SURFACE-1`,** the rung the contract names for cards, and its icon chip follows from `--C-SURFACE-1` to `--C-SURFACE-2` to stay one rung further out. This is the same correction `Card` itself received in #4, left behind on the sibling: `--C-SURFACE-0` is byte-identical to `--C-CANVAS` in the default theme, and in both dark examples it sits *below* `--C-SURFACE-1` — so a tile nested in a `Card` read as a hole punched in it rather than a tile on it. StatCard already carried `--C-BORDER-DEFAULT`, so the tile stays bounded on the new rung.

  **Visual change, no API change.** Nothing gained or lost a prop. A caller overriding either component's fill via `className` is unaffected; a caller who wants no card border can pass `border-0`.

- **`Radio`'s focus ring is round, and Radio now paints its own circle to get there.** The ring is a `box-shadow`, which takes the element's `border-radius` — but not while the engine is drawing the control. Measured in Chrome 144 on a native-appearance radio: a `box-shadow` ring, an `outline`, and `outline: auto` **all render square around the circle**, with `border-radius: 50%` set or not. `appearance: none` is the only lever that changes it.

  So Radio takes it, and with it everything the UA was painting: `accent-accent` is gone (a no-op once nothing native is drawn) and `rounded-full`, `border-border-strong`, `bg-surface-0`, `checked:border-accent` and `disabled:opacity-50` stand in its place, with the selected dot drawn in the new [`Radio.css`](./src/components/form/Radio.css) as a `closest-side` `radial-gradient` — keyed to the box, so a `size-*` override rescales the dot instead of clipping it. Two more contract variables are readable as a result (`--C-BORDER-STRONG`, `--C-SURFACE-0`); the table in [`docs/components/radio.md`](./docs/components/radio.md) lists all four.

  **The element is untouched.** It is still `<input type="radio">`: role, checked state, `name`-based grouping and the native keyboard model all come from the platform exactly as before. Only the paint changed. [`Checkbox`](./src/components/form/Checkbox.tsx) keeps its native appearance — a square ring around a square box needs no such trade.

  **Two consequences worth knowing.** Radio now needs this package's `styles.css`, which it did not before — without it the dot never paints and a selected radio looks unselected. And forced-colours mode, which the docs previously called out as uncovered, now *is* covered: `Radio.css` restores a `Highlight` focus outline (forced colours sets `box-shadow: none`, erasing the ring) and repaints the dot in `CanvasText`, since forced colours substitutes background *colours* but leaves a gradient alone.

- **Five status components now carry a severity glyph, not just a tint (#1, #21, #44, #104).** `Alert`, `Badge`, `Toast` and `Meter` differed by colour alone, which WCAG 1.4.1 does not allow and a colourblind reader cannot use. Each variant now leads with its own lucide glyph — `CircleCheck` / `TriangleAlert` / `CircleX` / `Info` — so the variants differ in **shape**. Neutral arms (`default`, `ok`) stay iconless, matching the existing `statusLabel`.

  **No new dependency:** `lucide-react` is already a required peer, and 17 shipped components import it. **Nothing announces twice:** every glyph is `aria-hidden` with no `aria-label`, `role` or `<title>`, so the accessible name each of these rows already gained is untouched — re-breaking that reddens a test. **New prop `statusIcon`** (`statusIcons` on Meter), the exact twin of `statusLabel`, where `null` removes the glyph as `""` removes the word. Reachable through the toast queue too: `toast(msg, { statusIcon })`.

  Two measured consequences are documented rather than left to be found: Meter's glyph takes a grid track, so crossing a threshold narrows the segment run by ~2px per segment on a 256px meter; and Meter's warning glyph inks `--C-STATUS-WARNING` at 2.90:1 on `--C-SURFACE-2` in the default and `events` themes, which is the *same* shortfall its filled segments already had from the identical token — no regression, now written down. ([`Alert.tsx`](./src/components/ui/Alert.tsx), [`Badge.tsx`](./src/components/ui/Badge.tsx), [`Toast.tsx`](./src/components/ui/Toast.tsx), [`Meter.tsx`](./src/components/data-display/Meter.tsx))

- **`Stepper`'s active step is now drawn with a heavier ring, not only a different tint (#147).** `--_stepper-active-line-width` doubles the indicator's border on the active step. No text was added — `aria-current="step"` already covers assistive tech and a hidden word would make it announce twice. Verified in Firefox across all four themes (active 4px, done/upcoming 2px, every marker still exactly 32×32px) with a negative control that reproduced the defect on demand. `box-sizing: border-box` is now explicit on `.stepper-indicator`, because under content-box the thicker ring pushes the marker off the connector's centre line. ([`Stepper.css`](./src/components/ui/Stepper.css))

- **`TagInput` and `Repeater` announce add, remove and rejection (#252, #262).** See **Added** for the shared convention. `TagInput`'s chips also gain `role="list"`/`role="listitem"`.

- **`--C-CHART-1`, `-2` and `-3` now alias the theme contract instead of hard-coding colours, so the chart palette follows a retinted theme.** They were duplicated literals: `-1` of the default `--C-ACCENT`, `-3` of `--C-STATUS-WARNING`, and `-2` of a `--C-STATUS-SUCCESS` value that **had already gone stale** when `@batthewz/response-ui-css` retuned the green. They now read `var(--C-ACCENT)`, `var(--C-STATUS-SUCCESS)` and `var(--C-STATUS-WARNING)`.

  **What changes on screen.** In the **default** theme `chart-1` and `chart-3` are byte-identical to before and only `chart-2` moves, from the stale light green to the current one. In **`events`**, which never overrode the chart palette, all three now follow that theme — most visibly `chart-1`, which goes from a cool blue to the theme's orange accent. `grimdark` and `tech` override all five explicitly and are untouched.

  **`-4` and `-5` stay literal, and that is deliberate.** A categorical palette's whole job is that five series stay tellable apart, and the contract lets one theme give two roles the same value. Measured: pointing `-4` at the obvious candidate `--C-STATUS-INFO` collapses `chart-1`/`chart-4` to **OKLab distance 0.000** in the default theme, which sets `--C-STATUS-INFO` byte-identical to `--C-ACCENT`. Deleting `tech`'s override collapses `chart-1`/`chart-2` to **0.000**, because `tech` sets `--C-ACCENT` byte-identical to `--C-STATUS-SUCCESS`. Do not "finish the job".

  **Migration:** if you rely on a specific chart hue rather than on "five distinguishable series", set `--C-CHART-n` in your own theme — they cascade by name and always have. **If you ship a custom theme, note that overriding `--C-ACCENT` now moves `chart-1`;** if that lands it near another series, override the chart tokens too. ([`src/tokens.css`](./src/tokens.css), [`docs/theme-contract.md`](./docs/theme-contract.md))

- **New gate: `verify:chart-palette`.** Resolves `--C-CHART-1..5` per theme — following `var()` chains into the installed `@batthewz/response-ui-css` — and measures OKLab distance between every pair, failing if any drops below a collapse floor. It exists because the aliasing above makes a palette change in a package this one does not own able to silently merge two series, and **no test here could ever catch it**: `vitest` runs with `css: false`, so no test in this repo can read a stylesheet. It is a *collapse* guard, not a quality bar — the shipped palette already contains marginal pairs (~0.10–0.12) that it deliberately does not fail, because a floor set where it would fail on day one is a floor someone turns off. ([`scripts/verify-chart-palette.mjs`](./scripts/verify-chart-palette.mjs))

- **`useClickOutside`'s handler now receives the triggering event.** The signature widens from `() => void` to `(event: MouseEvent | TouchEvent) => void`. **Backward compatible** — a handler that takes no argument is still assignable, so no existing call site changes. It exists because the hook fires on `mousedown`/`touchstart` rather than `click`, which means a control that itself toggles the guarded element acts one event *later* and undoes the dismiss; the event is what lets a caller recognise its own trigger and stand down. `AppShell` is the first consumer (see `#387` under **Fixed**). ([`use-click-outside.ts`](./src/hooks/use-click-outside.ts))

- **`verify:focus-affordance` had two blind spots and now has neither.** It read `src/components/**/*.css` only, and derived focusability from static JSX attributes — so two whole defect classes passed under it. (1) **Tailwind utilities.** `outline-none` / `focus:outline-none` written in a `className` now needs a paired `*:ring-border-focus`, on the element itself or on a `focus-within:` ancestor. The reset and the ring may sit in different `cn()` arguments (`Radio`) or on different JSX nodes (`TagInput`'s wrapper), and either may be hoisted into a shared constant — a `const NAME = "…"` resolver follows `src/util/focus.ts` rather than being blinded by it. Comments are stripped first, so a doc cannot satisfy the check against the recipe's own docblock prose. (2) **`FloatingFocusManager`.** It gives a dialog panel holding no tabbable content `tabindex="0"` and focuses it; the gate now models that, ported from the library's own `handleTabIndex`. `.popover-content` had been printed as a named *exemption* on the grounds that it was never DOM-focused — while being the element that actually takes focus. The gate goes from **10 guarded controls to 18**, and it found `Popover.css` live on the first run of the new check (fixed under **Fixed**). ([`scripts/verify-focus-affordance.mjs`](./scripts/verify-focus-affordance.mjs))

- **The documented `{...form.field(name)}` binding now works on the nine controls where it used to crash or corrupt the store.** This is the headline fix of the release and it is a **minor** bump, because it makes a public type wider. `TagInput`, `DatePicker`, `DateRangePicker`, `MultiSelect`, `ColorPicker`, `Slider`, `RangeSlider`, `OTPInput` and `NumberInput` each `Omit`ted `onChange` from their public type to signal "do not pass this" — but **a JSX spread performs no excess-property check**, so `field()` delivered it anyway, `tsc` reported nothing, and the component broke at runtime. Measured before the fix: `TagInput` and `MultiSelect` threw `…​.map is not a function` on the first keystroke, `DatePicker` threw `d.getFullYear is not a function`, `OTPInput` wiped each keystroke (`1234` → `{"code":"4"}`), `NumberInput` *concatenated* the event value onto the store value (`{"qty":"57"}`), and `Slider`/`RangeSlider`/`DateRangePicker` wrote raw strings into number and object fields. `Slider` was the worst of them precisely because it looked fine: the UI rendered correctly while a string reached submission and schema validation.

  Each now **declares `onChange` with its own value type** — `(tags: string[])`, `(d: Date | null)`, `(hex: string)`, `(value: number)` and so on — fires it alongside `onValueChange`, and destructures it out so it never reaches a DOM element. The form layer needed no change: `extractValue` already passes a non-event through unchanged. **If you annotate the generic, annotate it with the type the control actually emits** — `NumberInput` needs `form.field<number | null>("qty")`, because it emits `null` when cleared. Nothing that worked before stops working; `onValueChange` is untouched. Breaks only a consumer depending on `onChange`'s DOM-event shape — a population that is crashing today. **Revert:** restore `"onChange"` to each `Omit` union and drop it from the destructure.

- **`AppShell.Main` renders `<main>` instead of `<div>`.** The shell exposed `banner` and `navigation` landmarks and no `main`, so landmark navigation could not reach the content and a skip link had nothing to target. `.app-shell-main` is styled by class, so no rule in this package depended on the tag — but **a consumer stylesheet targeting `div.app-shell-main` will stop matching**, and a consumer already wrapping the shell in their own `<main>` now has nested landmarks. **Revert:** change the element back in `AppShell.tsx`.

- **`aria-invalid` and `aria-describedby` are merged rather than overwritten** in `TagInput`, `DatePicker`, `Slider`, `RangeSlider` and `ColorPicker`. `field()` always emits the *key* `aria-invalid`, valued `undefined` when the field is valid, and a trailing spread used that `undefined` to erase the state the component had computed — a visible error message with `aria-invalid` absent. The component's value now wins where it has one and the caller's survives where it does not. Note the naive fix is wrong in the mirror direction and is guarded against: swapping the spread order erases the *caller's* value instead, and both directions are now tested.

- **`useControllableState` no longer notifies when the value did not change.** The setter now compares the resolved value with the current one (`Object.is`) and returns early when they match: no internal state update, no `onChange`. Previously any setter call notified unconditionally, so a component clamped at a bound re-emitted its unchanged value on every further press — `useWizard`'s `goTo(0)` at step `0` called `onStepChange(0)`, and the same shape appeared wherever a clamp could resolve to a no-op. If you were counting `onChange` calls as a proxy for interactions rather than for value changes, you will now see fewer. This fixes the hook and therefore every component that routes through it — 25 modules across `src/components/**` after this release's migrations, `NumberInput` among them: a press at a clamped bound is silent there too. The comparison is injectable as of the `isEqual` note under **Added**, for values that are rebuilt on every commit. ([`src/hooks/use-controllable-state.ts`](./src/hooks/use-controllable-state.ts))
- **A caller's event handler is now additive, where on five components it used to be a replacement.** Worth reading before upgrading. Previously, passing your own handler to `FileUpload`, `AvatarUpload`, `AppShell.Toggle`, `AnimatePresence` or `RangeCalendar` *deleted* the component's own — measured: `<FileUpload onClick={openMyModal} />` fired your handler and **never** opened the file picker. That was a defect (the component's only interaction was gone), and it is fixed. But if you relied on it as a suppression mechanism, the observable change is real: **`<FileUpload onClick={…} />` and `<AvatarUpload onClick={…} />` now open an OS file dialog where they previously did not.** The migration is one line — call `e.preventDefault()` in your handler, which suppresses the component's own behaviour on every cancelable event. Same shape for `<AnimatePresence onAnimationEnd={…} />` (was frozen mid-exit, now unmounts) and `<RangeCalendar onPointerLeave={…} />` (the hover-preview reset now runs); those two events are not cancelable, so there is no opt-out for them by design.

- **A disabled `DropdownMenu.Item` / `ContextMenu.Item` now fires nothing at all — including your own `onClick`.** The `disabled` guard lived inside the internal select handler, but the composed click handler ran the caller's `onClick` *before* it ever got there, so a greyed-out "Delete account" still fired its handler on click. The guard now sits at the event boundary, so a disabled item drops `onSelect`, the menu close and `props.onClick` together. Both menus share one `MenuItem` implementation, so both change. `aria-disabled` is deliberately kept over the native `disabled` attribute — menu items stay focusable, which is the convention *and* the reason nothing native was suppressing the click in the first place. **If you were relying on a disabled item still calling your handler, that call is gone.** ([`menu-internals.tsx`](./src/components/ui/menu-internals.tsx))
- **`ContextMenu.Trigger` is now a tab stop, opens from the keyboard, and takes focus when the menu opens.** Three changes to your page's focus behaviour, all from one defect: the trigger `<div>` set no `tabIndex`, so it could never be `document.activeElement` — and since the `ContextMenu` key and `Shift+F10` fire `contextmenu` at the *focused* element, the menu had no keyboard route in at all. The trigger now (1) carries `tabIndex={0}`, so it takes a Tab stop your layout did not have before; (2) handles `ContextMenu` / `Shift+F10` itself, anchoring on the trigger box rather than a cursor point, and calls `preventDefault()` so the browser's own menu does not open alongside it; and (3) takes focus on open, because `MenuContent` mounts with `initialFocus={-1}` and a right-click otherwise left `activeElement` on `<body>` with the open menu taking no keys at all — arrows and typeahead now work. `tabIndex` is set before the rest spread, so you can still override it. ([`ContextMenu.tsx`](./src/components/ui/ContextMenu.tsx))
- **`Wizard` step content is keyed by the active step, so it remounts on every step change.** The panel rendered the active step's `content` at a fixed position with no `key`, so React reconciled outgoing and incoming content against each other: any two steps whose content shared a root element or component type kept the *same* fiber and state bled across the step change — typing into step one's `<input>` and pressing Next showed that value in step two's differently-labelled input. The wrapper now carries `key={activeIndex}`. The cost is the other side of the same coin: **nothing inside a step's `content` survives leaving it** — a `useState` draft, a scroll position, an uncontrolled input's value are all gone when the user presses Back and returns. Hold anything that must persist across steps in the parent that renders the `Wizard`. ([`Wizard.tsx`](./src/components/ui/Wizard.tsx))
- **A collapsed `Accordion` panel is `inert`, so focusable content inside it leaves the tab order.** `Accordion.Content` renders unconditionally — `isOpen` only drove `data-state`, and the collapse is a `grid-template-rows: 0fr` clip — so links and buttons inside a closed section stayed Tab-reachable and exposed to screen readers while being invisible on screen. The panel now takes `inert` while closed. `hidden` / `display: none` were not options: either one kills the grid-rows transition. The panel is still **mounted**, so effects, subscriptions and form participation inside a closed section survive; it is only unreachable. ([`Accordion.tsx`](./src/components/ui/Accordion.tsx))
- **`Pagination` no longer calls `onPageChange` for the page you are already on, and the current page's ink changed token.** The current page was neutralised with `pointer-events: none`, which suppresses mouse hit-testing only — the button still took Tab, and Enter or Space still fired `onPageChange` with the page already displayed. The handler now refuses to re-fire for the current page and the CSS no longer blocks pointer events, so the button keeps its place in the tab order along with its `aria-current="page"`. Native `disabled` was rejected: it would pull the current page out of both the tab order *and* the a11y tree. Dropping `pointer-events: none` re-exposed the current page to `.pagination__page:hover`, which outranks `.pagination__page--current` on specificity, so hover is now scoped with `:not(.pagination__page--current)` and the current page takes `cursor: default`. Separately, its ink moved from `--C-TEXT-ON-PRIMARY` to `--C-TEXT-ON-ACCENT`, the contract's paired token for the `--C-ACCENT` fill it sits on: in the `tech` theme those two tokens are byte-identical, so the current page number rendered at 1.00:1 — invisible. Fixed here rather than by re-tinting the theme; both tokens are individually valid, the pairing was the bug. **If you count `onPageChange` calls rather than page changes, you will now see fewer.** ([`Pagination.tsx`](./src/components/ui/Pagination.tsx), [`Pagination.css`](./src/components/ui/Pagination.css))
- **`Intl.DateTimeFormat` instances are cached in `src/util/date.ts`, roughly halving the cost of a calendar render.** `formatDate` built a formatter per call, and it is called once per day cell to compose the accessible name — so a 42-cell month grid constructed 42 of them on every render, and `getMonthNames`, `getWeekdayNames`, `getMonthLabel` and `getDateFieldOrder` each built one more. Measured in Chrome: construction costs ~52µs against ~0.6µs to reuse an existing instance, an 84× gap, and it dominated the profile of a calendar click — `formatDate` was the second-largest self-time frame on the dev gallery, behind only React's own element creation. Formatters now come from a module-level cache keyed on locale plus *sorted* options, bounded at 64 entries with insertion-order eviction. Scripting per click fell from 22.9ms to 13.6ms for a lone `Calendar`, and from 105ms to 52ms on the gallery page that renders four. **No behaviour change:** an `Intl.DateTimeFormat` is immutable once constructed, so a shared instance formats identically to a fresh one, and sorting the key's entries means `{month, year}` and `{year, month}` resolve to one entry rather than two. `date.test.ts` covers both ways a cache can be wrong — keying two distinct requests together, and keying one request apart from itself — plus correctness once eviction begins. ([`src/util/date.ts`](./src/util/date.ts))
- **`Carousel` arrow keys only page when the carousel root itself has focus.** `keydown` bubbles and the root's handler had no `e.target` guard, so ArrowLeft/ArrowRight pressed in a text input, slider or listbox *inside a slide* were `preventDefault()`ed and paged the rail instead of moving the caret — the keystroke never reached the control the user was typing in. Guarded with the `e.target !== e.currentTarget` recipe `Tabs` and `AnimatePresence` already use. The root is its own tab stop, so keyboard paging stays reachable — but if you were paging from a focusable element inside a slide, you now have to Tab back out to the root. ([`Carousel.tsx`](./src/components/ui/Carousel.tsx))
- **`Rating`'s per-star accessible names change under `allowHalf`.** Every radio was named `position - 0.5`, so a `max={5}` rating offered "0.5 stars" through "4.5 stars" — never a "5 stars" option at all — and the *checked* radio was misnamed whenever the value was a whole star. Each radio is now named for the value it stands for: the stars read "1 stars" … "5 stars", and the checked one reads the value the component actually holds ("2.5 stars" at `value={2.5}`). Only `allowHalf` is affected; without it the names are unchanged. **Name-based queries and snapshots over a half-star `Rating` will need updating.** ([`Rating.tsx`](./src/components/ui/Rating.tsx))
- **The keyboard-active option in `Combobox`, `MultiSelect` and `CommandPalette` now draws a focus ring, and `AppShell`'s current sidebar link is re-inked.** Visual changes only, and **no token value changed** in either package — these are new rules against existing tokens. All three lists navigate *virtually*: DOM focus is pinned to the input and the option is named only by `aria-activedescendant`, so `:focus-visible` can never match the row and the keyboard cursor's only cue was a one-step surface wash — measured across the four shipped themes, `--C-SURFACE-1` on `--C-SURFACE-0` is 1.02–1.07:1 and `--C-SURFACE-2` is 1.08–1.16:1, which no re-tint can rescue. Each `[data-active]` rule now also draws the `2px solid var(--C-BORDER-FOCUS)` at `outline-offset: -2px` that the rest of the library draws on `:focus-visible`; the wash stays but is no longer load-bearing. `AppShell`'s current sidebar link inked `--C-ACCENT` over its own 10% accent wash, which made the current item the *least* legible one in the sidebar in three themes of four — the label now takes `--C-TEXT-PRIMARY` and the accent moves to a 1px inset outline (`box-shadow: inset 0 0 0 1px`), the marker recipe `Calendar`'s `[data-today]` already uses. **If you restyle any of these states, the cue is now the ring or the edge, not the fill.** ([`Combobox.css`](./src/components/form/Combobox.css), [`MultiSelect.css`](./src/components/form/MultiSelect.css), [`CommandPalette.css`](./src/components/ui/CommandPalette.css), [`AppShell.css`](./src/components/ui/AppShell.css))

- **`Popover`, `HoverCard`, `DropdownMenu` and `ContextMenu` fade on the theme's `--MOTION-DURATION-ENTER` / `-EXIT` instead of a 150ms literal, and not at all under reduced motion (#128).** The duration was frozen in the `.tsx` on all four surfaces, with no token and no reduced-motion guard, while the shipped themes set these tokens between 120ms and 500ms. **Visible on every consumer:** the default theme's `ENTER` is **300ms** where the literal was 150ms, so these surfaces fade twice as slowly there — the contract's own number, matching what `Drawer`, `CommandPalette` and `Toast` already do. The CSS route was genuinely closed — `useTransitionStyles` writes `transition-duration` *inline* — so the tokens are read the way `ToastContext` and `StatCard` already read `--MOTION-*`, falling back to 150ms when no token layer is present or during SSR. Under `prefers-reduced-motion: reduce` the duration resolves to `0`, which removes the fade **and** the delayed unmount. The tokens are re-read whenever `open` changes, so a runtime theme switch reaches the *next* open. ([`floating-motion.ts`](./src/components/ui/floating-motion.ts), [`Popover.tsx`](./src/components/ui/Popover.tsx), [`HoverCard.tsx`](./src/components/ui/HoverCard.tsx), [`menu-internals.tsx`](./src/components/ui/menu-internals.tsx))

- **`useRovingFocus`'s `setFocusedIndex` now moves DOM focus with the tab stop when the group already holds focus.** Previously it moved the tab stop only, and both in-package consumers hand-rolled the identical focus move beside it; that duplicated effect is deleted from `Rating` and `ThemeSwitcher`, whose behaviour is unchanged. The move is conditional on `document.activeElement` already being one of the registered elements, so calling the setter while the user is elsewhere on the page never pulls focus into the widget. **If you call `setFocusedIndex` from your own composite widget and move focus yourself alongside it, that move now happens twice; and while focus is inside the group you can no longer hold the tab stop and DOM focus apart deliberately.** ([`use-roving-focus.ts`](./src/hooks/use-roving-focus.ts))

- **`ColorPicker`'s panel no longer takes focus when it opens (#484).** `FloatingFocusManager` mounted with no `initialFocus`, so opening moved focus to the first tabbable — since #287 that is the Saturation range input, so the next arrow key committed a colour the user never asked for. It now passes `initialFocus={-1}`, the call `DatePicker` and `DateRangePicker` already make; ColorPicker was the sole outlier. Focus stays on the trigger, one `Tab` walks into the panel and lands on Saturation, and `Escape` still returns focus to the trigger. **If you assert `activeElement` after opening, or script arrow presses straight after an open, both change.** The shipped test is honest about its limits: `FloatingFocusManager`'s initial focus move does not happen under jsdom, so it passes with the fix removed and its comment leads with that, naming the browser measurement instead. ([`ColorPicker.tsx`](./src/components/form/ColorPicker.tsx))

- **`Select`'s chevron gutter moves from `pr-10` to `pr-r1`, back onto the responsive scale (#471).** `pr-10` is a frozen `2.5rem` on Tailwind's *default* spacing scale, not the `r`-scale the rest of the control's padding uses, so it never stepped up at `40rem` — measured in Firefox 146, it left 4px between the text box and the chevron at 1280px against 12px at 375px, tighter on the wider viewport. `r1` is the smallest rung clearing the inset plus the glyph's 16px at both steps, and it is the rung `DatePicker` already reserves for its icon cluster. **The reserved space changes on every `Select`:** `2.25rem` below `40rem`, `6rem` above it, where it was a flat `2.5rem`. The desktop surplus is the price of staying on the scale — a `calc()` over two rungs fits better, was shipped first and was reverted, because it resolves to no single token the repo's token-table guard can verify. If it costs you visible text, `className="pr-r2"` merges over it. ([`Select.tsx`](./src/components/form/Select.tsx))

- **`AvatarUpload`'s hover scrim reads `--OVERLAY-SCRIM-COLOR` (#384).** `bg-black/50` was a literal that no theme could reach, while `Drawer`, `AppShell`, `CommandPalette` and `Dialog` all read the contract's token; it is now `bg-[var(--OVERLAY-SCRIM-COLOR,rgb(0_0_0_/_0.5))]`, spelled exactly as `Dialog.tsx` spells it. **If you theme, the overlay's darkness changes**: the shipped themes set it to 0.45 / 0.7 / 0.8 where it was fixed at 0.5. **Half the row, deliberately, and the cost is measured rather than buried:** `text-white` and `border-white` stay — the contract has no "ink on an overlay" token, and `--C-TEXT-INVERSE` is near-black in `tech` and `grimdark`, so the glyph would vanish. Adopting the token makes one theme **worse** for the camera glyph (`events` goes 3.98:1 → 2.89:1, its scrim is only 45%); recorded on the doc page as an open cross-package row, not closed here. ([`AvatarUpload.tsx`](./src/components/ui/AvatarUpload.tsx))

- **`VirtualizedDataTable`'s scroller is now `table-layout: fixed`, and its cells truncate instead of wrapping (#376, #377).** Both were previously read off the cascade; both are now rendered. Under `auto` layout, scrolling a 56-character unbreakable token into a four-row window moved two columns from **640/606 to 1129/117** — even **with a `width` set on the `<th>`**, because under auto layout a column width is a suggestion the cells outvote. Under `fixed`, the same test holds the widths unchanged and `ColumnDef.width` finally means what the docs say. Separately, `rowHeight` is written as a `<tr>` height, which CSS treats as a *minimum*: one wrapping sentence produced a **93px** row and a 53px desync from the virtualiser's spacer arithmetic; with truncation the same case measures exactly `rowHeight` per row. **The trade, in both directions:** a column with no `width` now takes an equal share rather than sizing to its content, and long cell text is clipped with an ellipsis rather than wrapped. Both rules are scoped to the virtual scroller — `Table` and `DataTable` are unaffected. A `render` that must wrap can set `white-space: normal` on its own element, but its row grows and the spacer arithmetic drifts again. ([`VirtualizedDataTable.css`](./src/components/ui/VirtualizedDataTable.css))

- **An unsettled `StatCard.Value` count-up now holds two nodes: an `aria-hidden` ticking figure and an `sr-only` twin carrying the target (#6).** Until the observer fires — which is the whole time before the card scrolls into view — the element's only text was `format(from)`, usually `0`, so anything reading the page without scrolling it got the placeholder instead of the figure. The twin exists **only while the two disagree**: once the run lands the element is a single text node again. **What your tests may see:** mid-run, the value element contains two `<span>`s and `textContent` is their concatenation (`"0"` + `"500"`) — read the visible figure through `[aria-hidden="true"]` and the announced one through `.sr-only`. Four tests here that read `textContent` mid-run were repaired that way rather than deleted, because they had been asserting the defect's DOM shape. A settled card, and a card without `animateValue`, are unchanged. ([`StatCard.tsx`](./src/components/ui/StatCard.tsx))

- **`Sparkline`'s default accessible name describes the series instead of counting it, and `aria-hidden` is now a real decorative mode (#29).** The fallback was `Sparkline of 7 values` — a fact a sighted reader cannot see either. It is now `Sparkline: 4 values, 12 to 28, rising, low 12, high 28`, with direction read off the **ends** rather than the extremes, and named degenerate cases (`Sparkline: no data`, `Sparkline: one value, 7`, `level`). Still English, still overridable. `role="img"` was unconditional, so getting a chart that repeats a number printed beside it out of the accessibility tree took `role="presentation"` *and* still left a stray `aria-label` behind. **What your tests may see:** any assertion on the old string no longer matches; on a sparkline you pass `aria-hidden` to, there is now no `role` and no `aria-label`, so `getByRole("img")` no longer finds it; passing `aria-labelledby` suppresses the generated label entirely. An explicit `role` still wins outright — it rides the rest spread. ([`Sparkline.tsx`](./src/components/data-display/Sparkline.tsx))

### Fixed

- **`gen-docs` no longer silently deletes documentation.** Its example-marker regex spelled the fenced body as *optional*, so an **empty** ```` ```tsx ```` block left the lazy inner quantifier unable to find a closing fence before its own `<!-- /example -->`; it kept expanding — past that close marker, past every heading and paragraph after it — and terminated on the *next* example's closing fence. One injection then overwrote all of it. The only signal was an "unused example" error naming a **different** example, and `--check` afterwards compared against the damaged file and agreed with it, so the gate confirmed the damage instead of catching it. Because the generator rewrites every page on every run, it had already eaten a section of `scroll-reveal.md` — a file the person who ran it had never opened.

  The marker now terminates at the first `<!-- /example -->` with an unconstrained body, so no inner quantifier can fail and drag the match past a close marker, and a body still containing an opening marker is reported as an unclosed block rather than rewritten. **Coverage is provably unchanged** — old and new patterns both match exactly 541 blocks across `docs/components/*.md`. An `assertMarkerCannotSpanBlocks()` self-check runs on **every** invocation, including the write path, and throws before a file is opened; it lives in the script because `vitest.config.ts` includes only `src/**`, so a test elsewhere would never run with the suite. ([`scripts/gen-docs.mjs`](./scripts/gen-docs.mjs))

- **Four shipped doc pages carried contrast measurements that the `@batthewz/response-ui-css` v0.10.0 retune had made false.** `docs/` ships to npm, so these were wrong statements delivered to consumers rather than stale comments — and one gave actively bad advice. `swimlane.md` said its "View all" link fails AA in `events` and `grimdark` (2.72–2.52 / 2.96–2.55) where it now measures 4.89–4.53 / 5.69–4.90, and told readers to "treat `subtitle` as decorative" on the strength of a `--C-TEXT-MUTED` figure of "at most 2.59:1" that is now 4.95–4.50. `pagination.md` and `calendar.md` both said the accent-filled selected state fails AA in two themes (2.80 / 3.81) where it now measures 5.04 / 5.69. `calendar.md` also called the "today" ring "effectively invisible" at 1.41–1.79:1, where `--C-BORDER-STRONG` now measures 3.23–3.49:1 and clears the 1.4.11 floor. All corrected, each naming the version its measurement was taken against so the next reader can tell whether a number was re-checked or merely re-read. The `--C-BORDER-FOCUS` tables on `calendar.md` and `file-upload.md` were re-verified and are **still correct**, so they were left alone.

- **`Parallax` clears its transform on teardown, follows a viewport resize, and no longer parks a permanent compositor layer (#31, #32, #33).** Three defects in one scroll loop. (1) The offset is written imperatively to `el.style.transform`, so React never owned it and nothing undid it: turning `prefers-reduced-motion` on mid-scroll tore down the listener and **froze the layer wherever it had drifted to**. The effect's cleanup now resets the transform and the tracked offset together, so the layer returns to its layout position. (2) `viewportCenter` comes from `window.innerHeight` and only `scroll` recomputed it. Measured in Firefox: a viewport shrunk from 720px to 400px left a layer at `translateY(246px)` where `150px` was correct — **96px of stale drift**, held until the next scroll event. A `resize` listener now shares the same `requestAnimationFrame` throttle (0px drift, re-measured). (3) `will-change: transform` was set for the element's whole life, parking a compositor layer on every `Parallax` on the page whether or not it could move. It is now applied only while the wrapper is within 200px of the viewport, via an `IntersectionObserver`; where none exists the old lifetime hint remains, because a layer beats no layer. ([`Parallax.tsx`](./src/components/animation/Parallax.tsx))

- **Status conveyed by colour alone now has a text channel — the assistive-tech half of WCAG 1.4.1, and only that half (#1 `Alert`, #21 `Meter`, #44 `Badge`, #104 `Toast`, #205 `ProgressBar`).** Five status surfaces distinguished their variants with a `bg-*`/`text-*` swap and nothing else, so an error and a success with the same content produced byte-identical accessibility-tree output. Each now names its own state, with an English default and a prop that replaces it — the convention `prevLabel` / `viewAllLabel` / `charLabel` set in this release.

  `Alert`, `Toast` and `Badge` take `statusLabel` and render it as a visually-hidden first child ("Success", "Warning", "Error", "Information"); on `Alert` and `Toast` that lands inside the live region, so the severity is announced with the message. `Toast`'s is reachable from the queue too — `toast(msg, { variant: "error", statusLabel: "Fehler" })` — because a prop only a hand-rendered `<Toast>` can reach is not an override path. `Badge`'s `default` variant stays silent: it names no state. `""` drops the word wherever the visible label already says it.

  `Meter` and `ProgressBar` could not take a hidden child at all: ARIA makes the children of `role="meter"` and `role="progressbar"` presentational, so text inside them never reaches AT — the same rule that put `Avatar`'s presence-dot label in its accessible name. `Meter` appends the crossed threshold's word to `aria-label` ("Disk usage, Critical"), overridable per status through `statusLabels`. `ProgressBar` sets `aria-valuetext` to the percentage plus the word ("96%, Error"), overridable through `statusLabel` and, as before, replaceable outright from the call site; `color="accent"` names no status and stays silent.

  **What this does not fix.** Nothing visible changed, by design — no icons, no new glyphs, no retint. A sighted reader with a colour-vision deficiency still sees two chips that differ only in tint, so the visual half of 1.4.1 remains open on all five. `Stepper` (#147) was assessed and deliberately left alone: `aria-current="step"` already carries "you are here" to a screen reader, and a visually-hidden "current step" beside it would be announced twice. ([`Alert.tsx`](./src/components/ui/Alert.tsx), [`Badge.tsx`](./src/components/ui/Badge.tsx), [`Toast.tsx`](./src/components/ui/Toast.tsx), [`ToastContext.tsx`](./src/components/ui/ToastContext.tsx), [`Meter.tsx`](./src/components/data-display/Meter.tsx), [`ProgressBar.tsx`](./src/components/ui/ProgressBar.tsx))

- **The mobile drawer could be opened from `AppShell.Toggle` and never closed from it (#387).** `useClickOutside` fires on `mousedown`, `AppShell.Toggle` acts on `click`, and the toggle sits outside the `<aside>` the dismiss listener guards — portaled away from it entirely on mobile. So a second press closed the drawer on `mousedown` and the `click` a task later reopened it: measured, `onOpenChange` fired `false` then `true` and the drawer stayed mounted. `Escape` and a press on the scrim always worked; only the control that opened it did not.

  The dismiss listener now stands down when the press lands inside `[aria-controls="<sidebar id>"]` and lets that control answer. Keyed off `aria-controls` rather than a ref because the toggle renders in a sibling subtree and a shell may carry more than one. **If you ship a custom toggle, point its `aria-controls` at `AppShell.Sidebar`'s id** — the built-in one already does, and without it your button fights the dismiss the same way. A press anywhere else still closes on `mousedown`. ([`AppShell.tsx`](./src/components/ui/AppShell.tsx))

  Note the repro needs a task boundary between `mousedown` and `click`; dispatched in one microtask the close and reopen collapse into a single render and the bug hides. A `fireEvent` pair would have passed against the unfixed source.

- **A collapsed sidebar rail was a list of unnamed links (#388).** `.app-shell-sidebar[data-collapsed] .app-shell-sidebar-link-label` set `display: none`, which removes the label from the accessibility tree, and the lucide icon beside it marks its own `<svg>` `aria-hidden="true"`. That left the `<a>` with no name source at all — measured with the engine Testing Library uses, `"Dashboard"` expanded and `""` collapsed. The [`Tooltip`](./src/components/ui/Tooltip.tsx) wrapper did not rescue it: it contributes `aria-describedby`, a *description*, and only while open.

  The label now collapses to `sr-only` instead, applied in the component rather than the stylesheet, so it leaves the screen but stays in the tree and the name survives. The `display: none` rule is gone. ([`AppShell.tsx`](./src/components/ui/AppShell.tsx), [`AppShell.css`](./src/components/ui/AppShell.css))

- **`Popover` was a full focus trap, and its panel — the element that actually takes focus — had no focus ring.** Two defects, both closed by the extended `verify:focus-affordance` gate above. `FloatingFocusManager` ran with its default `modal={true}` on a component that is non-modal by design: while a popover was open, **every element under `<body>` outside the portal was marked `aria-hidden` and `inert`**, so a screen-reader user could not reach even the trigger that opened it, let alone the page it was anchored to — with no scrim and no scroll lock to tell a sighted user any of it was happening. `ColorPicker` and `DatePicker` already passed `modal={false}`; `Popover` now does too, and a test asserts the rest of the page stays reachable. Focus still lands on the panel afterwards, which is why the second half stays load-bearing: `.popover-content` sets `outline: none`, and the manager gives a panel with no tabbable content `tabindex="0"` and focuses it — so opening a text-only popover from the keyboard put focus somewhere with nothing drawn to show it. It now paints the house `2px solid var(--C-BORDER-FOCUS)` under that reset. ([`Popover.tsx`](./src/components/ui/Popover.tsx), [`Popover.css`](./src/components/ui/Popover.css))
- **Three more controls that reset an outline and painted nothing back, plus a slider ring that repainted a surface it could not know.** `Collapsible.Trigger` had no focus affordance at all — `.collapsible-trigger` is a styling hook with no rule behind it — and now carries the shared recipe. `ThemeSwitcher` was missing its `:focus-visible` outright; it takes an *inset* ring, like the sibling segmented control `.tabs-tab`, because the group pads its options by `0.125rem` and an outset ring would land on the group border. `Slider` and `RangeSlider` thumbs dropped the `0 0 0 2px var(--C-SURFACE-0)` gap from their focus ring: the thumb's own 2px border already separates the accent fill from the ring, so the gap only repainted the surface the control was *assumed* to sit on — wrong on any other layer. `RangeSlider`'s outline reset was scoped to `[aria-invalid]`, so only the invalid state suppressed the full-width UA box its transparent overlay inputs draw; it is unconditional now, matching `Slider`. And `ColorPicker`'s hue thumb no longer restates its resting `rgb(0 0 0 / 0.35)` hairline inside the focus ring — the ring is its own edge against the rail. ([`Collapsible.tsx`](./src/components/ui/Collapsible.tsx), [`ThemeSwitcher.css`](./src/components/ui/ThemeSwitcher.css), [`Slider.css`](./src/components/form/Slider.css), [`RangeSlider.css`](./src/components/form/RangeSlider.css), [`ColorPicker.css`](./src/components/form/ColorPicker.css))
- **The date, range and colour pickers each held one value twice, and the second copy re-emitted changes that never happened.** Each had a committed value with a hand-rolled, reference-based reconciliation bolted to a draft beside it, kept in sync by a ref and an effect. All three now hold **one** source of truth and derive the rest.

  `DatePicker`'s draft is a transient `string | null` override over text derived from the committed `Date`, cleared on every commit path; `lastFormattedRef` is gone. Measured: a **no-edit blur now emits 0** where it emitted 1, and an inline `value={new Date(…)}` no longer wipes in-progress typing when the parent re-renders for an unrelated reason. `DateRangePicker` is the same shape on both endpoints — draft `"06/1"` now survives an unrelated parent re-render, where it used to become `""` — with `lastRangeRef` deleted and `isSameDateRange` on the gate. `ColorPicker`'s three representations become one plus two derivations: the hex field derives from the committed hex, and **HSV derives from it too, believed only while it still round-trips to that hex**. That keeps hue and saturation alive at the greyscale extremes (where hex cannot carry them) without ever letting the panel outrun a parent that refused the commit — the desynchronised panel is gone, and moving the hue rail at brightness 0 no longer fires `onValueChange` with an unchanged `#000000`. `lastHexRef` and its effect are gone with it.

  One more closes by the same derivation: **a runtime `locale` change no longer rewrites the committed date.** Switching `en-US` → `en-GB` used to leave the field showing the old text, which the day-first parser then read back as a different day and committed on the next blur — a date the user never chose. The field now reformats on the switch, and a subsequent focus/blur emits 0. The gate comparators are day-granular on purpose: every producer in the family is (`parseDateInput` yields midnight, the calendar yields a grid day, `toISODate` submits a day). ([`DatePicker.tsx`](./src/components/form/DatePicker.tsx), [`DateRangePicker.tsx`](./src/components/form/DateRangePicker.tsx), [`ColorPicker.tsx`](./src/components/form/ColorPicker.tsx), [`date-picker-internals.ts`](./src/components/form/date-picker-internals.ts))
- **Four more exports reach the barrels** — `SortState` (so a controlled `DataTable`/`VirtualizedDataTable` sort no longer needs a deep import or a `Props["sort"]` lookup to be annotated), `AvatarUploadProps` and `AvatarUploadResult`, and the date helpers `toISODate` and `getMonthNames`. `verify:docs` covers neither class — type-only exports are optional to it, and the `date` module's helpers are summarised rather than enumerated — which is why these went missing without a gate noticing.
- **Taking keyboard focus no longer erases a control's invalid state.** Six controls painted their focus affordance at a specificity that beat their error affordance, so tabbing onto an invalid control repainted it with the focus colour — the error cue disappeared exactly while the user was on the field. `Input`, `Select` and `Textarea` had `focus:border-border-focus` surviving the error swap (`cn` now resolves it to `focus:border-status-error`); `Switch` and `Slider` wrote `:focus-visible` and `[aria-invalid="true"]` at identical specificity with focus second — `Slider`'s focus rule is `outline: none`, so it deleted the error outline outright; `ColorPicker`'s `:focus-visible` out-ranked its single-class `--error` regardless of order. Each now carries an explicit invalid-and-focused rule at higher specificity, so **both** signals stay legible: colour reports invalid, ring or outline width reports focus. Measured in a real engine, focused via keyboard with `:focus-visible` asserted alongside each reading. ([`Input.tsx`](./src/components/form/Input.tsx), [`Switch.css`](./src/components/form/Switch.css), [`Slider.css`](./src/components/form/Slider.css), [`ColorPicker.css`](./src/components/form/ColorPicker.css))
- **`useWizard`'s `goTo` no longer reports moves it did not make** — `goTo(0)` while already on step `0`, or any call that clamped back onto the current index, still fired `onStepChange` with the unchanged value. See the `useControllableState` note under **Changed**. ([`src/components/ui/Wizard.tsx`](./src/components/ui/Wizard.tsx))
- **The focus ring's offset colour is themed** — via `@batthewz/response-ui-css`, which now defaults `--tw-ring-offset-color` to `--C-SURFACE-0`. `Button`, `IconButton`, `Checkbox`, `AvatarUpload` and `ErrorBoundary` all used `ring-offset-2` with no offset colour set anywhere in either package, so all five showed a white halo between the control and its focus ring on the dark `grimdark` and `tech` themes. No change in this package was needed once the variable had a themed default — which is why it was fixed there rather than five times here.
- **`AnimatePresence` no longer unmounts early when a child animation ends** — `animationend` bubbles, and the unmount checked only the exit phase, not which element fired, so a spinner or skeleton animating inside an exiting panel cut the exit short. It now unmounts only on its own animation, matching `ScrollReveal` and `Tabs`, which both already guarded this. Your own `onAnimationEnd` still receives bubbled events, since it is an ordinary DOM handler on the wrapper — check `e.target === e.currentTarget` if you only want the wrapper's own. Note this defect was previously *masked* for anyone passing `onAnimationEnd`, because that prop used to replace the internal handler entirely; now that the two compose, the guard is what keeps the exit intact. ([`src/components/animation/AnimatePresence.tsx`](./src/components/animation/AnimatePresence.tsx))
- **`ToastProvider` no longer throws on the server** — it portalled its toast stack with a bare `createPortal(…, document.body)` in its render body, so touching `document` raised `ReferenceError: document is not defined` on any server render, including the first render of any Next.js App Router page that mounted the provider. It now goes through this library's own `Portal`, which already guards `typeof document === "undefined"` — so the provider server-renders its children and emits nothing for the stack. Browser behaviour is unchanged. Note the stack is still portalled unconditionally on the client, so hydrating a page that server-rendered without it is still a mismatch; scope the provider tightly or gate it behind a mounted flag. ([`src/components/ui/ToastContext.tsx`](./src/components/ui/ToastContext.tsx))
- **A caller's event handler no longer silently replaces a component's own** — five components set a handler on an element and then spread rest props onto the same element without destructuring that handler out, so passing your own **deleted** the component's behaviour instead of adding to it. Each now composes: yours runs first, then the component's. Fixed in `AnimatePresence` (a caller `onAnimationEnd` stopped the element ever unmounting), `CalendarBase`/`RangeCalendar` (`onPointerLeave` stopped the range hover preview ever clearing), `AvatarUpload` and `AppShell.Toggle` (`onClick`/`onKeyDown` stopped the file picker and the drawer toggle), and `FileUpload`, where a single spread sat after four handlers so one `onClick` removed every interaction the component had. On cancelable events, calling `preventDefault()` in your handler suppresses the component's own — a deliberate escape hatch, and deliberately absent on `animationend`/`pointerleave`, which cannot be cancelled. Relatedly, `AvatarUpload` and `FileUpload` stop their hidden file input's programmatic `click()` bubbling back into the clickable wrapper, which used to re-enter that wrapper's handler twice per click. ([`AnimatePresence.tsx`](./src/components/animation/AnimatePresence.tsx), [`CalendarBase.tsx`](./src/components/ui/CalendarBase.tsx), [`AvatarUpload.tsx`](./src/components/ui/AvatarUpload.tsx), [`AppShell.tsx`](./src/components/ui/AppShell.tsx), [`FileUpload.tsx`](./src/components/ui/FileUpload.tsx))
- **`AvatarUpload` no longer blanks the avatar when you pick a file without `onUpload`** — the optimistic `blob:` URL was revoked in the same tick it was handed to state, so React committed an already-dead `src`; the image failed to load, `Avatar` latched its internal load-error flag, and because that flag never resets the circle fell back to initials for the rest of the instance's life. One file pick permanently lost the photo. The URL is now released in effect cleanup — after the display stops pointing at it — covering the next pick, the post-upload swap, the fallback after a failed upload, and unmount. ([`src/components/ui/AvatarUpload.tsx`](./src/components/ui/AvatarUpload.tsx))
- **`ScrollReveal` and `Stagger` now forward the props their types advertise** — both are `as`-polymorphic and typed with the rendered element's full prop set, but neither spread its rest props, so `id`, `data-*`, `aria-*`, `tabIndex`, `style` and every event handler compiled cleanly and then vanished at runtime. They now reach the element. `className`, `style` and `ref` are *merged* with the component's own rather than replacing them, and `ScrollReveal` **composes** a caller's `onAnimationEnd` with its internal one instead of letting either win, so passing a handler can no longer strand the component mid-animation. This also repairs three components that spread their own public API through these two: `Swimlane`, `MasonryGrid.Item` and `Timeline.Item` all silently dropped every prop past `className`/`ref`/`children` on their default animating path — the path a test written the easy way never covers. ([`src/components/animation/ScrollReveal.tsx`](./src/components/animation/ScrollReveal.tsx), [`Stagger.tsx`](./src/components/animation/Stagger.tsx))
- **`TagInput` error state inside a `Field`** — `TagInput` now inherits its invalid state from a surrounding `Field` (matching `Input`/`Select`), so the error border and `aria-invalid` paint when the form marks the field invalid, not only via an explicit `error` prop. ([`src/components/form/TagInput.tsx`](./src/components/form/TagInput.tsx))
- **`SearchInput` double clear button** — `SearchInput` renders its own clear (`×`) button, but the underlying `<input type="search">` also exposed the browser's *native* clear affordance (WebKit/Chromium show one while the field is focused with text; legacy Edge/IE via `::-ms-clear`), so a focused field showed two `×`s. The native one is now suppressed, leaving only the component's own. ([`src/components/form/SearchInput.css`](./src/components/form/SearchInput.css))
- **Calendars are responsive / mobile-friendly** — `Calendar`, `RangeCalendar`, and the `DatePicker` / `DateRangePicker` popovers no longer overflow on narrow screens. On desktop a calendar holds its natural width (multi-month grids stay side by side, day cells stay compact, driven by `CalendarBase` exposing the month count to CSS via `--calendar-months`). Below the `40rem` breakpoint it fills its container and **collapses to a single, paged month** — the months no longer stack into a tall, scrollable column; instead the existing ‹ › navigation pages between them and the header month/year label becomes a tappable quick-jump. The day cells grow into comfortable touch targets, and the picker popovers take the viewport width (`w-[calc(100vw-1.5rem)]`, reverting to shrink-to-fit at `≥40rem`) so a date range is picked one full-width month at a time with **no nested scrollbar**. ([`src/components/ui/Calendar.css`](./src/components/ui/Calendar.css), [`src/components/ui/CalendarBase.tsx`](./src/components/ui/CalendarBase.tsx), [`src/components/form/DatePicker.tsx`](./src/components/form/DatePicker.tsx), [`src/components/form/DateRangePicker.tsx`](./src/components/form/DateRangePicker.tsx))
- **Two focusable controls reset their outline and painted nothing back.** `.command-palette-input` carried `outline: none` with no replacement rule anywhere, so the only element in a `CommandPalette` that ever holds DOM focus had no focus affordance at all; `.dropdown-menu-item` left roving keyboard focus with nothing but its hover wash to go on — the same wash in both states, measured 1.02–1.07:1 against the panel. Both now take the inset `2px solid var(--C-BORDER-FOCUS)` ring `.app-shell-sidebar-link` already used. Both were found by the new `verify:focus-affordance` gate on its first full run. ([`CommandPalette.css`](./src/components/ui/CommandPalette.css), [`DropdownMenu.css`](./src/components/ui/DropdownMenu.css))
- **`useFieldArray` errors and `touched` now follow their row through `remove`, `move`, `swap`, `insert` and `prepend`.** The store rewrote `values` and re-keyed the stable `arrayIds`, but left `schemaErrors`, `manualErrors` and `touched` keyed by the old dotted path (`links.0.url`) — so after a removal or a reorder the message, and the `aria-invalid` that goes with it, stayed pinned to whichever row inherited the index. Delete the invalid row and the *valid* row that slid up into its place was flagged instead, blocking a submit the user could not see anything wrong with. `commitArray` now remaps those keys through an old→new index map derived from the stable ids: a row that moved takes its state along, a row that was removed takes its state with it. No public type or API-shape change. ([`form-store.ts`](./src/components/form/form-store.ts))
- **`StatCard.Value` with `animateValue` no longer throws where `IntersectionObserver` is absent.** It constructed `new IntersectionObserver(…)` with no availability check, so `<StatCard.Value animateValue to={n} />` raised a `ReferenceError` in any browser or test environment without the API — `ScrollReveal` guards the identical call one directory over. Without an observer there is no scroll-into-view signal, so the value settles on `to` rather than freezing on the `from` placeholder. The guard stays inside the effect rather than the render, because `typeof IntersectionObserver` differs between server and client and deriving it during render would trade the throw for a hydration mismatch. (The observer is created in an effect, which never runs during server rendering, so SSR was never the failing case.) ([`StatCard.tsx`](./src/components/ui/StatCard.tsx))
- **A clickable `Stepper` indicator has an accessible name.** Its only content is the step number or an `aria-hidden` check glyph, so completed steps rendered as *unnamed* buttons and the rest announced a bare digit. Each clickable indicator now carries an `aria-label` built from the step's `title` plus its status — "Shipping, completed", "Payment, current step", or just the title for an upcoming step. The status has to be part of the name because `aria-current` sits on the `<li>`, not on the control, so it never reaches a screen reader on the button itself. Non-clickable indicators are unchanged. ([`Stepper.tsx`](./src/components/ui/Stepper.tsx))
- **`CommandPalette` no longer highlights a row it will not act on.** The highlight tested `index === activeIndex` while `aria-activedescendant` used a stricter predicate, so when nothing in the filtered list was selectable `activeIndex` stayed at `0` and the highlight landed on a disabled row that Enter would not act on and no screen reader could follow. The highlight now shares the same predicate. ([`CommandPalette.tsx`](./src/components/ui/CommandPalette.tsx))
- **`Timeline`'s vertical rhythm, two undefined ink tokens, and a set of theme-frozen type literals** — all in CSS, all invisible to `tsc` and to the test suite. `Timeline` read the descending `r`-scale as ascending in two rules: the gap **between two events** was `--R-SIZE-6` (`0.25rem`, flat at every width) while the gap between an entry's **date and its own title** was `--R-SIZE-1` (`2.25rem`, rising to `6rem` on desktop) — so a desktop timeline put the largest gap on the scale *inside* an entry and the smallest one between entries. They are now `--R-SIZE-3` and `--R-SIZE-6`, the roles `ActivityFeed` already gives that same pair. `Drawer` and `FileUpload` inked from `--C-TEXT-DEFAULT`, which no theme and no base layer in either package defines: an undefined custom property makes the whole declaration invalid at computed-value time, and for an inherited property like `color` that means `inherit`, so both took their ink from whatever ancestor last set one — inverse text on a section fill followed straight onto the drawer's own surface. Both now pin `--C-TEXT-PRIMARY`. And the hard-coded `font-weight: 600` / `500` and `font-size` literals in `AppShell`, `DropdownMenu`, `MultiSelect`, `Table` and `ThemeSwitcher` now read `--Bold-Weight` / `--Semibold-Weight` / `--BodyText-*`, so they follow a theme and step up at the `40rem` breakpoint like everything else. **Expect small visual movement** on those five components under a theme that moves its weights (`grimdark` sets bold to `700`), and on `AppShell`'s sidebar links, whose size now tracks `--BodyText-1` — identical at base, `1rem` from `40rem` up, `0.9375rem` in `tech` — where it was frozen at `0.875rem`. ([`Timeline.css`](./src/components/ui/Timeline.css), [`Drawer.css`](./src/components/ui/Drawer.css), [`FileUpload.css`](./src/components/ui/FileUpload.css), [`AppShell.css`](./src/components/ui/AppShell.css))
- **`useTheme`'s docblock claimed a persistence the package does not implement.** It read "Persists to localStorage". `setTheme` *writes* `localStorage["theme"]` (and clears the key for the default theme), but nothing in this package ever reads it back, so a user's choice is silently discarded on reload. Documentation-only correction — the behaviour is deliberately unchanged. Restoring a theme before first paint needs a blocking inline `<script>` in your document `<head>`, which this package does not ship. ([`use-theme.ts`](./src/hooks/use-theme.ts))
- **13 published component pages reconciled against the fixes that falsified them.** `docs/` is in the package `files`, so those pages shipped to npm telling readers to work around bugs that were already fixed. The `type="button"` default alone falsified six, and `form-actions` inverted outright — its sharp edge is now a *missing* `type="submit"`, not a stray submit. Also rewritten: `pagination` (token table, contrast figures recomputed from the four theme files, and the `pointer-events` gotcha), `accordion` (the residue of `inert` — still mounted, no longer reachable), `dropdown-menu` and `context-menu` (both stated that a disabled item still ran the caller's `onClick`), `wizard` (the state bleed is gone; the remount cost is the new thing to know), and `tag-input` / `otpinput` / `number-input`, whose prop tables still advertised `onChange` as `Omit`ted. Same pass corrected the `Pagination` example docblock, which still warned that its arrow buttons submit a surrounding form.

- **A date the pickers refuse now says so, where the failure used to be completely silent (#330, #338).** `DatePicker` reverted the field with no message; `DateRangePicker` had neither a message nor `aria-invalid`, which bites hardest on a `formatOptions` the parser cannot read back (`{ month: "2-digit", day: "2-digit" }` → `06/10`), where the *displayed* text is unparseable on both fields and any edit was discarded without a signal. A refusal now sets `aria-invalid` on the offending field, renders and politely announces a sentence naming which failure it was and quoting the text, and keeps the entry (see **Breaking**). Editing after a refusal clears the message immediately, so it never quotes text the user has already started correcting. **Uncovered:** the message id joins `aria-describedby` standalone but is overridden inside a `Field` that renders a `FieldError`, because `Input` recomputes it and `mergeProps` gives that value priority — filed separately as #489. ([`DatePicker.tsx`](./src/components/form/DatePicker.tsx), [`DateRangePicker.tsx`](./src/components/form/DateRangePicker.tsx))

- **A completed `Stepper` step in the default, non-clickable mode announced no status at all (#474).** Its check glyph is `aria-hidden` and no word replaced the numeral, so to assistive tech a done step and an upcoming step differed only by the numeral being *absent*. The clickable path already solved this through the indicator's accessible name; that solution was extended rather than duplicated — one status word, computed once, taking one of two carriers: the button's `aria-label` where there is a control to name, visually-hidden text inside the `<span>` where there is not. **The word is withheld from the active step**, whose state is already on the `<li>` via `aria-current="step"` — a second channel beside it would announce twice. Verified in a browser, because no test in this package can see it: the accessibility tree for a done step reads `listitem → img, generic: "completed"` with the word and `listitem → img` without. ([`Stepper.tsx`](./src/components/ui/Stepper.tsx), [`Stepper.css`](./src/components/ui/Stepper.css))

- **Removing a `TagInput` chip no longer drops focus to `<body>` (#480).** The remove button unmounted with the chip and nothing took focus back, so a keyboard user removing several tags was returned to the top of the document each time. `TagInput` now carries the pattern `Repeater` settled on: a pending-focus ref set by the chip's own `onClick`, and an effect resolving to the remove button now at the vacated index, else the one before it, else the **text input**. **Backspace deliberately does not move focus** — nothing the keyboard was pointing at unmounted there. **The commit-on-blur hazard is closed by construction:** focus moving *into* the input fires no blur, so the commit path is never on the restore route — asserted with `validateTag={() => false}`, where after removing the only chip the draft survives intact. ([`TagInput.tsx`](./src/components/form/TagInput.tsx))

- **Menu typeahead no longer swallows keys typed into a text control inside a trigger (#468).** `ContextMenu.Trigger` wraps arbitrary content, so a `<textarea>` inside one bubbles every key to the reference element where the menu's handlers are mounted — and `useTypeahead`'s reference handler `preventDefault`ed printable characters, so the keystroke never arrived. Same shape as #125, which fixed only the Arrow/Home/End half. #125's predicate is now split into a target-only half and a caret-key half, and **both** `useListNavigation` and `useTypeahead` go through one `skipReferenceKeys()` wrapper. Typeahead skips **every** key aimed at an `input` / `textarea` / `select` / `contenteditable`, because typeahead only ever consumes keys that control owns; the menu is still fully typeahead-able from the trigger itself. **Uncovered:** whether a real browser then delivers the character *into* the textarea — jsdom applies no text input from a synthetic `keydown`, so the assertion is the precondition, not the typing. ([`menu-internals.tsx`](./src/components/ui/menu-internals.tsx))

- **`Popover` and the menus read their panel id from Floating UI instead of minting a second one beside it (#469).** Both called `useId()` next to the id `useRole` actually puts on the element — two sources for one value. Both now read `context.floatingId`, `HoverCard`'s pattern. **Nothing changes on the rendered elements** — the trigger side already advertised the right id — but each root now calls one fewer `useId()`, so a snapshot pinning React-generated ids in a tree containing a `Popover` or a menu may shift. ([`Popover.tsx`](./src/components/ui/Popover.tsx), [`menu-internals.tsx`](./src/components/ui/menu-internals.tsx))

- **`Combobox`'s focused and invalid borders never painted (#483).** With `.combobox-input` focused, the ring drew `--C-BORDER-FOCUS` while `borderColor` stayed `--C-BORDER-STRONG`: `Combobox.css` declared `border` **unlayered**, and unlayered author CSS outranks every Tailwind utility whatever the specificity, so `focusRingControl`'s `focus:border-border-focus` could never apply — and the invalid border was inert for the same reason. The border moves to `border border-border-strong` in the `.tsx`, the fix `ColorPicker`'s hex field already used. Of the seven `focusRingControl` consumers this was the only affected one — the rest ship no stylesheet of their own. Re-broken by injecting the unlayered rule at runtime and watching the border revert; the stylesheet now carries a do-not-redeclare note. ([`Combobox.tsx`](./src/components/form/Combobox.tsx), [`Combobox.css`](./src/components/form/Combobox.css))

- **`AvatarUpload`'s `TResult` now reaches `onUploadComplete` (#383).** `AvatarUploadProps<TResult>` was generic, but the component was declared `forwardRef<HTMLDivElement, AvatarUploadProps>`, which erased the parameter — so a caller whose `onUpload` resolved `{ url, width, height }` still got a callback typed to `{ url }` and could not read a field beyond `url` without a cast. `AvatarUpload` is now a plain generic function component taking React 19's `ref` prop — the sibling answer, since `DataTable`, `VirtualizedDataTable` and `Repeater` are this package's other generic components and none is a `forwardRef`. **Nothing caller-visible changes shape:** `AvatarUploadProps` already carried `ref`, so `<AvatarUpload ref={…} />` compiles as before, and `ComponentRef<typeof AvatarUpload>` still resolves to exactly `HTMLDivElement`. The load-bearing gate here is `tsc`, not the test runner, and the test says so: restoring the `forwardRef` fails typecheck on a result field beyond `url`. ([`AvatarUpload.tsx`](./src/components/ui/AvatarUpload.tsx))

- **A cancelled file picker left `AvatarUpload`'s error message on screen forever (#386).** The tooltip cleared only on the next *completed* selection, so opening the picker and pressing Cancel left "File too large" sitting over whatever came next. `Escape` while the control has focus now clears it — including mid-upload — and **re-opening** the picker clears it whether or not that attempt reaches a file. The message also ran off both edges of the 4rem circle (`whitespace-nowrap` on an absolutely-positioned span gave a long `accept` list unbounded width); it is now `w-max max-w-[17.5rem] text-center`, capped at `Tooltip.css`'s own 17.5rem. **No visible close button, and that is structural:** the tooltip sits inside the `role="button"` root, whose descendants ARIA makes presentational, so nothing interactive may live in there. ([`AvatarUpload.tsx`](./src/components/ui/AvatarUpload.tsx))

- **`FileUpload` leaked an object URL per media file on every mount under StrictMode (#416).** The URLs were minted as a side effect inside `useMemo` — during render — so StrictMode's double render created two per file and committed only the second map; worse, the `<img src>` was left pointing at a URL the cleanup **had already revoked**, while the twin leaked. Minting moved into an effect with cleanup, keyed on each **`File`'s identity** rather than the array's, so an inline `files={[file]}` finds the same `File` objects across re-renders and reuses their URLs; a mount-only effect releases the live set on teardown. A new map is published only when the contents actually move, so an unchanged set keeps `<img src>` byte-identical. **Side benefit:** `URL.createObjectURL` no longer runs during render, so a server render with `files` present can no longer throw. **The cost, documented rather than found later:** minting after commit means a media preview paints one frame with its image element absent before the URL lands. ([`FileUpload.tsx`](./src/components/ui/FileUpload.tsx))

- **`AppShell.SidebarSection` titles are headings, and they survive the collapsed rail (#395).** `title` rendered as a `<div>`, so sidebar groups were invisible to heading navigation; the collapsed rail then hid them with `display: none`, which takes an element out of the accessibility tree. The title is now a heading (`titleAs`, default `<h2>`) and the collapsed rail hides it with `sr-only`. **Caught by measurement, not by reasoning:** making it a heading exposed the label to the CSS package's `h1`–`h6` base rules, and the row went **22px → 72px in all four themes** with the face changing in three of them — `line-height: normal` and `font-family: inherit` are pinned on the title class and re-measured back to 22px, byte-identical to the old `<div>`, with the reason written into the CSS so nobody deletes it. ([`AppShell.tsx`](./src/components/ui/AppShell.tsx), [`AppShell.css`](./src/components/ui/AppShell.css))

- **The `Timeline` rail no longer overhangs the last dot, and a custom `icon` sits on the rail rather than beside it (#344, #345).** The rail was one `.timeline::before` pinned `top: 0; bottom: 0` on the root while every dot sits at `top: 0` of its own item, so it ran past the final dot for the whole height of the last card — **270px of overhang** at 1280px, now **0**: the segment is per-item and suppressed on `:last-child`, `ActivityFeed`'s shape. The node's offset subtracted half of the *default* dot size, which centres the default dot and nothing else — a `2rem` icon's centre sat 9px off the rail; centring on the rail's midpoint with `translateX(-50%)` is size-agnostic, and every node centre now measures identically. **Side effect, deliberate:** a child that is not a `Timeline.Item` draws no segment and so leaves a gap in the rail, where the old root-level rail ran behind it. ([`Timeline.css`](./src/components/ui/Timeline.css))

- **A `Timeline` card's entrance direction can no longer disagree with the side it lands on (#342).** The side is CSS `:nth-child` and the direction was the React index, so a fragment child desynchronised them — `Children.toArray` does not descend into a fragment while the DOM does. Fixed by removing the second source rather than teaching the index about fragments: the context no longer carries an index, every item ships one entrance class, and `Timeline.css` flips the animation on the same `:nth-child(even)` rule that flips the card's side. ([`Timeline.tsx`](./src/components/ui/Timeline.tsx), [`Timeline.css`](./src/components/ui/Timeline.css))

- **An expanded `Breadcrumbs` trail collapses again on a route change (#139).** Expansion was a boolean set once with nothing to unset it, so a single `<Breadcrumbs>` kept mounted across navigations stayed expanded for the life of the page. The state now records *which* trail was expanded — the pathname plus the crumbs' own React keys — so a new route starts collapsed, with no effect, no remount and no `key={pathname}` asked of the caller. **Limits, documented rather than left to be discovered:** a hash router that never changes `pathname` is seen only through the crumb keys, and positional keys are shared by two trails of the same length. ([`Breadcrumbs.tsx`](./src/components/ui/Breadcrumbs.tsx))

- **A caller-rendered `Breadcrumbs.Separator` now replaces the automatic separator for its gap instead of being wrapped in two more (#146).** The root interleaved its own separator around every child, so the exported sub-part rendered `/ › /` and had no correct direct use. It is now paired with the crumb it precedes — one separator, not three — and is **not counted as a crumb by the collapse arithmetic**, which is what `maxItems` means. If you rendered custom separators alongside `maxItems`, the collapse threshold now counts crumbs where it used to count list items. ([`Breadcrumbs.tsx`](./src/components/ui/Breadcrumbs.tsx))

- **The shipped reference docs no longer describe this release's bugs as current behaviour.** The docs pass deliberately recorded pre-fix behaviour in each page's Gotchas; as the fix waves closed several hundred findings, roughly 245 of those sentences went stale across more than 60 pages — the worst telling readers the library *could not* do something it now does: name a `Swimlane` or `Wizard` landmark, keep a `Tooltip` open across the gap, heading-navigate an `Accordion`, give a `MasonryGrid` item semantics. Every one of the 90 component pages was re-verified sentence-by-sentence against source and reconciled; claims describing still-open findings were deliberately left standing, and every contrast figure was re-measured against `@batthewz/response-ui-css` v0.10.1. Two example files had drifted the same way and were rewritten: `Accordion`'s heading example no longer nests a manual `<h3>` inside the built-in heading wrapper, and `ColorPicker`'s naming example no longer folds the hex into `aria-label` now that the trigger appends it itself.

## [0.6.0] through [0.8.2] — not documented

Five versions — 0.6.0, 0.7.0, 0.8.0, 0.8.1 and 0.8.2 — were published to npm and none was recorded here, so this file jumps from 0.5.0 to 0.9.0. Nothing has been reconstructed for them after the fact: no record of their contents was kept at release time, and inventing one would be worse than the gap. The published tarballs and this repository's commit history between the 0.5.0 and 0.8.2 releases are the only account of what changed.

A sixth version, **0.8.3, was bumped in `package.json` but never published**. Whatever 0.8.3 carried is part of 0.9.0 above.

## [0.5.0] — 2026-06-13

### Added

- **`VirtualizedDataTable`** — a row-virtualizing data table for large datasets (10,000+ rows). Only a small window of rows is mounted in the DOM, so scrolling stays smooth and memory stays flat. Built on the same `Table` primitive and `ColumnDef` contract as `DataTable`, sharing its sort comparator and cycle logic (extracted to [`src/components/ui/data-table-utils.ts`](./src/components/ui/data-table-utils.ts) as a single source of truth). Fixed/uniform `rowHeight`; the `Table` root doubles as the scroll container so the sticky header pins for free. Optional `onEndReached` for infinite/lazy loading. Select-all spans the **entire** dataset (vs `DataTable`'s page-scoped select-all). Use it instead of `DataTable` when you want continuous scrolling rather than pagination.
- **`useVirtualRows` hook** — table-agnostic, dependency-free fixed-height windowing primitive (`src/hooks/use-virtual-rows.ts`). Tracks scroll offset and viewport height (passive `scroll` listener + `ResizeObserver`) and returns the row slice to mount plus top/bottom spacer heights.

## [0.4.0] — 2026-06-13

### Added

- **18 new ui/form components** — `Switch`, `Slider`, `NumberInput`, `TagInput`, `OTPInput`, `Combobox`, `DatePicker` (form); `CodeBlock`, `CopyButton`, `Kbd`, `Rating`, `Collapsible`, `CommandPalette`, `ContextMenu`, `HoverCard`, `Drawer`, `Stepper`, `Calendar` (ui).
- **`components/data-display` group** — a discoverable home for dashboard primitives: `Sparkline`, `ProgressRing`, `Meter`, `DescriptionList`, `ActivityFeed`. (Existing `StatCard`, `Timeline`, `Table`, `DataTable` stay where they are.)
- **`StatCard.Sparkline` slot and `StatCard.Trend` format** — `StatCard` now composes the new `Sparkline` primitive as a slot, and `StatCard.Trend` takes an optional `format(value)` for custom delta rendering.
- **`useControllableState` hook** — controlled/uncontrolled state helper, used by the new interactive components.
- **Date utilities** (`src/util/date.ts`) — `addDays`, `addMonths`, `buildMonthGrid`, `clampDate`, `formatDate`, `getDateFieldOrder`, `getMonthLabel`, `getWeekdayNames`, `isAfter`, `isBefore`, `isSameDay`, `parseDateInput`, `startOfDay`, `startOfMonth` — backing `Calendar` and `DatePicker`.
- **RSC support** — interactive modules ship a `"use client"` directive so the components work in React Server Component frameworks (Next.js App Router, etc.). Pure presentational components (Button, Text, layout) stay server-renderable. A `verify:directives` script enforces dist mirroring and a secret-free invariant.

### Changed

- **DataTable** — Date- and nullish-aware sorting; `defaultSort` for uncontrolled initial sort; client-side `pageSize` pagination (table slices and derives pages itself); a footer slot.
- **Domain tokens now owned by this package** — `response-ui-css` is the universal contract and no longer mints data-viz / single-component tokens. This package now OWNS its trend (`--C-TREND-*`), chart (`--C-CHART-1..5`), and media (`--MEDIA-ASPECT-POSTER`, `--MEDIA-CARD-HOVER-*`, `--MEDIA-CAROUSEL-*`) tokens in [`src/tokens.css`](./src/tokens.css) — imported first by `styles.css`, including their `@theme inline` mappings and per-theme (grimdark/tech/events) re-tuning. Since `@batthewz/response-ui-tw-merge` no longer carries `trend-*`/`chart-*` in its built-in color list, the exported `cn` is now built with `createCn({ theme: { color: [...] } })` so those utilities (`text-trend-up`, `bg-chart-3`, …) still dedupe. `MediaCard`'s landscape/square ratios now read the contract's renamed `--ASPECT-WIDE`/`--ASPECT-SQUARE`.
- **Dependency bump** — `@batthewz/response-ui-css` `^0.5.0` → `^0.6.0` (renames its generic aspect ratios to `--ASPECT-WIDE`/`--ASPECT-SQUARE` and sheds the relocated domain tokens). `@batthewz/response-ui-tw-merge` `^0.1.0` → `^0.1.1` (its `createCn`/`mergeExtension` types now accept the top-level `theme` key that this package's domain-token `createCn` relies on).

## [0.3.0] — 2026-06-11

### Added

- **Self-relative Tailwind `@source` in [`src/styles.css`](./src/styles.css)** — importing `@batthewz/response-ui-react-components/styles` now registers this package's own sources with Tailwind v4, so the utility classes used inside the components are generated under any node_modules layout (hoisted npm, bun's isolated store, pnpm, linked workspaces). Previously scanning relied on sideways `@source` globs inside `@batthewz/response-ui-css`, which silently matched nothing under isolated stores — adopters needed a manual `@source "../../node_modules/@batthewz/response-ui-react-components/src/**/*.{ts,tsx}"` workaround. That workaround can now be removed.
- **Declaration maps** (`.d.ts.map`) — consumers' go-to-definition now lands in the real `src/*.tsx` source, which ships in the tarball alongside `dist/`.

### Changed

- **`@batthewz/response-ui-css` dependency bumped `^0.2.0` → `^0.5.0`** — the old caret range could never resolve to newer published releases (0.x caret semantics), leaving transitive installs behind. Now tracks the latest css release (0.5.0, which pairs with this release's self-relative `@source`).
- **Local/linked development now resolves `dist/` like published installs do** (see the packaging fix below) — run `bun run build` (or `vite build --watch`) after editing source when consuming the package via a link.

### Fixed

- **Published packaging: the `exports` map now actually points at `dist/` (`.js` + `.d.ts`).** Previously `main`/`types`/`exports` pointed at raw `src/*.ts(x)` and the dist mappings lived in `publishConfig` — but overriding entry points via `publishConfig` is a pnpm-only feature that npm/bun publish silently ignore. Published consumers were served raw TSX (working only where esbuild prebundles `node_modules`, e.g. Vite) and typechecked the library's source instead of `.d.ts` stubs, while the entire built `dist/` shipped as dead weight. The dead `publishConfig` overrides are removed; a `prepack` build guards against stale `dist` in tarballs.
- **Deep subpath imports (`./components/*`, `./hooks/*`) are now live on the published package** — on 0.2.1 they only existed in the ignored `publishConfig` block, so the README's documented `…/components/ui/Button` import never resolved from npm.

## [0.2.1] — 2026-06-05

### Added

- **`createCn(extension?)` export** — ergonomic factory for apps that add custom tokens on top of the design system. Sourced from [`@batthewz/response-ui-tw-merge@0.1.0`](../response-ui-tw-merge/CHANGELOG.md). Safe against the "forgot to spread" footgun the older `tailwindMergeExtension` spread pattern had.
- **`mergeExtension(extension?)` export** — low-level helper for power users who drive `extendTailwindMerge` themselves.

### Changed

- **`prepublishOnly` hook added** — `bun run build && bun run typecheck && bun run test`. Prevents shipping a stale `dist/` or a build that doesn't pass tests/typecheck.
- **`publishConfig.access`** set to `"public"` explicitly so a fresh-clone publish can't accidentally ship a private package.

### Notes

`0.2.0` published with a hard dep on `@batthewz/response-ui-tw-merge@^0.1.0` that did not yet exist on npm — installs of 0.2.0 fail to resolve until `@batthewz/response-ui-tw-merge@0.1.0` publishes. Upgrade to `0.2.1` once tw-merge is on npm.

## [0.2.0] — 2026-06-05

### Breaking

- **Per-component CSS now ships from this package and requires an additional CSS import.** Consumers must add a second `@import` to their app CSS:

  ```css
  /* src/app.css — before */
  @import "@batthewz/response-ui-css";

  /* src/app.css — after */
  @import "@batthewz/response-ui-css";
  @import "@batthewz/response-ui-react-components/styles";
  ```

  Order matters: each per-component file reads `var(--…)` tokens defined by `response-ui-css`, so the foundation has to load first. Without the second import, components render with utility classes only and visual implementations (accordion grid animation, popover surface, pagination layout, etc.) are missing.

  **Why this changed:** the per-component CSS files (Accordion, AppShell, Button, Carousel, DropdownMenu, EmptyState, FileUpload, Hero, MasonryGrid, MediaCard, Pagination, Popover, ProgressBar, SearchInput, Skeleton, Spotlight, StatCard, Swimlane, Table, Tabs, ThemeSwitcher, Timeline, Tooltip — 24 files) are visual implementations of React components in *this* package. Co-locating them with their `.tsx` makes ownership clear, lets the React component own its visual contract end-to-end, and keeps `@batthewz/response-ui-css` honest as a framework-agnostic design-system foundation.

### Added

- **`./styles` subpath export** — single CSS entry point that `@imports` all 24 per-component CSS files in stable order. See [`src/styles.css`](./src/styles.css).
- **Co-located component CSS** — `src/components/ui/Accordion.css` next to `Accordion.tsx`, `src/components/form/SearchInput.css` next to `SearchInput.tsx`, etc. (24 files total).
- **`copyCssAssets` Vite plugin** in [`vite.config.ts`](./vite.config.ts) — globs `src/**/*.css` and copies to `dist/` at build time, so the `./styles` export resolves correctly in published consumers.
- **`createCn(extension?)` re-export** — ergonomic factory for apps that add custom tokens on top of the design system. Sourced from [`@batthewz/response-ui-tw-merge@0.1.0`](../response-ui-tw-merge/CHANGELOG.md), now a required dep. Safe against the "forgot to spread" footgun the older `tailwindMergeExtension` spread pattern had.
- **`mergeExtension(extension?)` re-export** — low-level helper for power users who drive `extendTailwindMerge` themselves.
- **Live demo link** in the README pointing at <https://ai-website-starter.benmatthews-it.workers.dev/demo>.

### Changed

- **README "Use" section** now documents both required CSS imports with the order-matters note.
- **AGENTS.md** gained a "CSS layout" section explaining the co-location convention and the workflow for adding CSS to a new component (create `MyComponent.css` next to `MyComponent.tsx`; add an `@import` line to `src/styles.css`; build copies it to `dist/` automatically).
- **AGENTS.md hard-requirements section** updated: now lists both CSS imports and clarifies that `@batthewz/response-ui-css` is a regular dependency (auto-installed), not a peer dependency, while the consumer's `@import` is still manual (Tailwind v4 needs to see it in the consumer's CSS graph).

### Removed

- Stale "ThemeEditor in the showcase" reference from [docs/theme-contract.md](./docs/theme-contract.md) — no `ThemeEditor` or showcase component exists in this package.

### Migration guide

1. **Update your app CSS** to add the second import:

   ```css
   @import "@batthewz/response-ui-css";
   @import "@batthewz/response-ui-react-components/styles";
   ```

2. **No code changes required** — all component imports, props, and class names are unchanged. If your build hot-reloads CSS, it should pick up the new import immediately.

3. **If you wrote custom CSS** that depended on classes like `.accordion-trigger`, `.popover-content`, etc. being available from `@batthewz/response-ui-css` alone, those classes now come from `@batthewz/response-ui-react-components/styles`. The class names themselves are unchanged.

## [0.1.0] — Initial release

Initial public release.
