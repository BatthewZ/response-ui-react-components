# Consolidation — the five-lane CSS-to-utilities sweep

Merges `4178ea4`, `f0cc3bd`, `7ecb394`, `8b1a07e`, `0796197` on top of `a24f41d`. Nobody had run
the full suite or the cascade probe against the combined tree; this pass established what was
actually true, fixed what was red, fixed two guards, and merged the shared documents the lanes
were forbidden to edit.

---

## 1. Final gate status

Every gate named, run at the consolidated tree.

| Gate | Result |
| --- | --- |
| `bun run typecheck` | **green** (exit 0) |
| `bun run lint` | **green** (exit 0) |
| `bun run test` | **green — 116 files, 2593 tests, 0 failing** |
| `bun run build` | **green** |
| `bun run probe:cascade-layer` | **regressions 0 · inert 0 · accepted 3 · verified 16** — exactly baseline |
| `verify:directives` | OK — 83 client modules, 131 neutral |
| `verify:docs` | OK — 126 value exports documented |
| `verify:examples` | OK — 559 examples verified |
| `verify:component-docs` | OK — 90 spokes, **889** token claims resolved (was 882) |
| `verify:focus-affordance` | OK — **25** guarded controls (was 19) |
| `verify:no-css-imports` | OK — 340 files, 0 CSS imports |
| `verify:css-layering` | OK — 26 component imports, all `layer(components)` |
| `verify:token-mirror` | OK — 9 `@theme` names, all mirrored |
| `verify:omit-discipline` | OK — 148 omitted keys, 0 unprotected |
| `verify:chart-palette` | OK |
| `verify:example-themes` | OK — the examples remain deletable |
| `verify:slot-annotations` | OK — 444 attributes, 0 failing |
| `verify:bugs` | OK — 24 findings, anchors resolve |

**What was red when I arrived**, and nobody had seen:

- **4 failing tests** across 2 files. `bun run test` had not been run by any lane.
- **`verify:bugs`** — 9 structural violations (7 shifted anchors, 2 anchoring deleted stylesheets).
- Everything else was already green, including the cascade probe, which no lane had run.

The lanes' reports of red gates naming *other* lanes' files (`verify:component-docs` on 17 spokes,
`verify:focus-affordance` on `Tabs.tsx:435`) were **all stale** — resolved by the time the last
lane committed. Verified, not assumed.

---

## 2. Stylesheets and CSS removed

Commands, so each figure is reproducible.

```
# stylesheet count, before and after
git ls-tree -r a24f41d --name-only | grep '^src/.*\.css$' \
  | grep -v 'tokens.css\|styles.css\|examples/' | wc -l          #  44
find src -name '*.css' ! -name tokens.css ! -name styles.css \
  ! -path '*/examples/*' | wc -l                                 #  26

# lines
git ls-tree -r a24f41d --name-only | grep '^src/.*\.css$' \
  | grep -v 'tokens.css\|styles.css\|examples/' \
  | while read f; do git show "a24f41d:$f"; done | wc -l          # 5790
find src -name '*.css' ! -name tokens.css ! -name styles.css \
  ! -path '*/examples/*' -exec cat {} + | wc -l                   # 2971

# declarations — pipe either of the above through:
grep -cE '^\s*[a-zA-Z-]+\s*:.*;'                                  # 2048 -> 600
```

| Measure | Before (`a24f41d`) | After | Delta |
| --- | --- | --- | --- |
| Component stylesheets | 44 | **26** | −18 |
| CSS lines | 5,790 | **2,971** | −2,819 |
| CSS declarations | 2,048 | **600** | **−1,448 (−71%)** |

**Declarations is the honest headline, not lines.** Three files ended *larger* than they started
because a STAYS verdict's deliverable is prose — the header comment naming why each survivor could
not move. Line count understates the conversion by roughly a third.

`src/styles.css` was checked against disk: 26 `@import … layer(components)` lines, 26 component
stylesheets, **exact match**, plus the unlayered `tokens.css`. The one stylesheet on disk with no
import is `examples/example-theme-tuning.css`, which is deliberately not in the cascade.

---

## 3. Every breaking API change, in one list

1. **`RangeSlider`** root carries `data-invalid`; the invalid skin no longer keys off
   `[aria-invalid="true"]`.
2. **`Carousel.Track`** drag state is `data-dragging`, not `.carousel-track--dragging`.
3. **`CalendarBase`**'s caption button drops the `calendar-label` class
   (`"calendar-label calendar-label-button"` → `"calendar-label-button"`).
4. **`Spotlight.Image`** merges `imgProps.className` through `cn()` instead of spreading raw; and
   a third child of a `Spotlight` item that is neither `Image` nor `Content` now sorts **first**
   (`order: 0`) instead of last.
5. **`Stepper`**'s hidden status word uses Tailwind `sr-only` (`clip`, not `clip-path`).
6. **`Table`** gained an internal `stickyHeader` context; `.table--sticky-header .table-head` and
   `… .table-header-cell` are now utilities on the elements themselves.
7. **`VirtualizedDataTable`** lost its stylesheet; `table-layout: fixed` moved to `Table`'s
   `tableProps` hatch, and the loading/empty headers now truncate like the data one.
8. **`EmptyState`** sub-parts read `size` from context, not `[data-size]` descendant selectors —
   a nested `EmptyState` now keeps its own size.
9. **18 stylesheets deleted**; the declarations a `className` used to beat by layer order are now
   utilities that `cn()`'s tailwind-merge resolves instead. Every BEM class name survives as a
   declaration-free marker.
10. **Tailwind Preflight is now load-bearing** for `Rating`, `ThemeSwitcher` and `FileUpload`,
    which dropped their own resets. A build that disables Preflight sees UA button chrome.
11. **`hover:` is `@media (hover: hover)`-gated** on every converted control — it no longer fires
    on a coarse pointer. Affects menu items, breadcrumb links and ellipsis, `MediaCard`,
    `Tabs.Tab`, `Pagination`, `Table.HeaderCell`, `AppShell` toggle and sidebar links,
    `FileUpload` dropzone and five buttons, `SearchInput` clear, `MultiSelect` chip remove,
    `ThemeSwitcher` option, `Swimlane` "View all".
12. **`Hero` `size="full"`** is `min-h-dvh` with no `100vh` fallback.
13. **`MediaCard`** hover lift uses `translate`/`scale` properties, not the `transform` shorthand.

Behaviour **fixes** (not breaking, but visible): `FileUpload`'s Replace/Clear all buttons gained a
focus ring they never had; `RangeSlider`'s invalid state paints for the first time; a `Carousel`
end-of-rail arrow fades out instead of ghosting at 50%; `CalendarBase` lost a wholly inert rule;
`Tooltip`'s WCAG 1.4.13 test stopped being vacuous.

---

## 4. What I fixed, and the evidence each still goes red

### 4.1 Four failing tests

- **`src/util/focus.test.ts`** — `HAND_WRITTEN` flagged `FileUpload.tsx` for `border-border-focus`.
  Checked against the original: `FileUpload.css` used `--C-BORDER-FOCUS` for the **`:hover`** and
  **drag-over** borders long before conversion, so Lane 4's transposition was faithful and the
  regex was over-broad — in exactly the way the test's own docblock already carves out for
  `border-status-error`. Narrowed so `border-border-focus` is flagged only under a focus variant;
  `ring-border-focus` and `ring-status-error` are unchanged.
  **Red on purpose:** rewriting `hover:border-border-focus` → `focus:border-border-focus` in
  `FileUpload.tsx` fails the gate with `[ 'ui/FileUpload.tsx' ]`. Restored, green.
- **`menu-internals.test.tsx` ×3** — exact-equality class assertions Lane 2 did not rewrite when
  the icon box gained utilities. Rewritten to the `a24f41d` reference idiom (membership + junk
  guard + per-slot negative). The parity test now compares the **two entry points to each other**
  rather than to a literal, which is what its title claims and is strictly stronger.
  **Red on purpose:** dropping the `menu-item-icon` marker reddens 4 tests; injecting a junk token
  reddens the 2 junk guards. Restored, green.

### 4.2 `scripts/verify-focus-affordance.mjs` — three changes

**(a) Per-file constant map.** `buildConstStrings` pooled every value bound to an identifier across
the whole package. Now scoped per file and widened only along real `import` edges, so
`util/focus.ts` and `layout/shared.ts` still resolve at every consumer.

**(b) `isOutlineReset` learns `all`.** `all: unset|initial|revert|revert-layer` resets
`outline-style` to `none` without the word `outline` appearing, so `OUTLINE_DECL` never handed it
to `isOutlineReset` at all.

**(c) The CSS-reset half now accepts a Tailwind ring.** This one was **not in the brief and was
necessary**: teaching (b) immediately surfaced two violations on `.pagination__page` and
`.tabs-tab`, both of which *do* have `focus-visible:outline-border-focus` — in the `.tsx`. The
CSS half only ever consulted CSS rings. After the sweep the common shape is a reset surviving in
the stylesheet (it must be first-in-rule) with the ring as a utility, so the halves are paired by
**element**, not by file. Without (c) the gate would have failed two correct components and taught
the next author to put the reset back into the class list.

**Evidence, each break run against the old script for contrast:**

| Break | Old script | New script |
| --- | --- | --- |
| Strip Pagination's focus ring, leave `all: unset` in CSS | `OK` — **blind** | `NO AFFORDANCE .pagination__page` |
| Restore the `panelClasses` collision between `Tabs.tsx` and `ColorPicker.tsx` | **false** `NO AFFORDANCE Tabs.tsx:435` | `OK` |
| A same-named constant in another file lends a **ring** to an element that has none | `OK` — **silently passes** | `NO AFFORDANCE Tabs.tsx:435` |

The third row is the one that matters: it is the direction that leaves a real control with no focus
indicator while the gate prints OK. All three restored; guard green.

**Coverage went 19 → 25 guarded controls.** The six newly covered are `Switch`, `Pagination`,
`Tabs` and three `CalendarBase` rules — all `all: unset`, all previously invisible.

**Lane 2/3's claim reproduces exactly.** Restoring the `panelClasses` collision produces the false
`Tabs.tsx:435` violation verbatim on the pre-fix script.

### 4.3 `scripts/verify-component-docs.mjs` — the prefix gap, done properly

Added `aspect` to `PREFIX_NAMESPACES` (Lane 2's ask; both `--aspect-wide` and `--aspect-square`
exist in the foundation).

The geometry prefixes needed more care, and Lane 1's warning was correct: that list's polarity is
deliberately unforgiving — an item matching a prefix and resolving to nothing is an **error**,
which is what makes an invented `bg-nonexistent` fail rather than pass as prose. Adding
`size`/`w`/`h`/`min-*`/`max-*` there would have reddened every `w-full` and `max-w-90` in the docs.
They went into a **second list with inverted polarity**: an item counts as a utility only *if it
resolves*, so `size-r5` becomes checkable and `w-full` stays prose exactly as before. By
construction this can only resolve more rows, never redden one.

**Put to use:** the four spokes that had worked around the gap in prose now tabulate their tokens —
`tooltip.md` (`size-r5`), `progress-bar.md` (`h-r6/r5/r4`), `stat-card.md` (`size-r2`), `tabs.md`
(`top-r6`, `bottom-r6`, `rounded-t-md`). **Claims checked went 882 → 889.**

**Red on purpose:** changing `tooltip.md`'s arrow row to claim `--R-SIZE-3` fails with both
`claims --R-SIZE-3 but Tooltip neither reads it …` and `` `size-r5` resolves to `--R-SIZE-5`, not
listed in its row ``. Restored, green.

### 4.4 `bugs/LEDGER.md` — 9 violations

Two rows anchored deleted stylesheets and seven had shifted. `--reanchor` handles a shift; it
cannot handle a deleted file, and **it must not be trusted for a row whose content changed** — it
restamps the fingerprint, which makes the gate bless a row that may now describe different code.
That is the exact failure mode the ledger's own header warns about, so all five content-changed
rows were hand-verified against source and re-anchored deliberately, with the fingerprints computed
rather than stamped by the tool.

- **#495 `MediaCard`** — the finding **survived the conversion verbatim**, checked not assumed:
  `motion-reduce:hover:translate-none motion-reduce:hover:scale-100` still has no `focus-within:`
  twin, so a keyboard user who asked for reduced motion still gets the movement. Re-anchored to
  `MediaCard.tsx:52`.
- **#415 `FileUpload`** — a contrast finding; the pairing, the condition and the ratio are
  unchanged by the conversion. Re-anchored to `FileUpload.tsx:935`.
- **#205, #397, #478** — re-anchored to the live code with dated notes.

**One thing found in passing and stated rather than fixed:** #478's *headline* claims the
ProgressBar track paints `--C-SURFACE-1`. It does not, and has not since `52b3aea` moved it to
`--C-SURFACE-3` — well before this sweep. The row's own 2026-07-29 entry supersedes the headline
correctly, so the row is sound; the note now says to read the headline as history. Not adjudicated
further: the row also covers Table/Card/StatCard neighbours, which is a separate measurement.

---

## 5. Shared documents merged

- **`memory/css-to-utilities.md`** — 186 → 390 lines, deduplicated from four lanes. The opening
  cascade section is **corrected** (see below). New/extended: spellings that lie
  (`font-[var(--X)]` is `font-weight`; `font-mono` is Tailwind's stack, not the theme's; `cn()`
  does not resolve `inset-0` against `inset-y-*`), `> *` generalising to `> tag`, media-query
  variants sorting last, Preflight's form-element rule, `!important` utilities beating unlayered
  rules, dead rules that look live, `?raw` under vitest, the two guard bugs, the docs-guard prefix
  fix, and adjudication-as-deliverable.
- **`memory/README.md` §12** — corrected. It said Tailwind emits arbitrary-property utilities
  *last* in `@layer utilities`. Measured position: they sort last among **bare** utilities but
  **before variant utilities**, which still out-rank them at 0,2,0. The Accordion conclusion is
  unaffected; the sentence was not. **Numbering re-checked: no duplicates.** The two gaps
  (39→51, 82→96) are byte-identical to `a24f41d` — the file has not changed since — so they
  pre-date the sweep and are not a renumbering artefact.
- **`AGENTS.md`** — both wrong rows corrected, not deleted. The "element this package does not
  render" row loses the `VirtualizedDataTable.css` instance (the cells were reachable all along
  through `<Table.Cell>`, which forwards `className`) and gains the three svg rules that really
  are blocked. The `ScrollReveal` row now says **reach, not impossibility** —
  `noscript:opacity-100!` does beat the unlayered rule. Two new rows added: shorthand `inherit`
  (Lane 1) and UA pseudo-elements (Lane 4 — judged earned; it is four files and three of them are
  focus-guard-covered controls). Question 5 promoted into "The test".
- **`PLAN-overridability.md` §2b** — the deletable-seven row is **discharged**: 5 deleted, 2
  refuted. `Tooltip` and `Popover` come off the list, and the row's open note about the arrow
  blocks is answered **no** — needing an arbitrary property *is* the blocker. Method stated,
  lines and declarations quoted separately per that document's own rule. `ScrollReveal` got its
  own row with the corrected reasoning. The §6 cost/benefit paragraph is marked **superseded**
  with the measured outcome beside its forecast.
- **`SLOT-VOCABULARY.md`** — **no slot added, renamed or removed** by any lane; all five reported
  this independently. Added a dated note that the 18 deleted stylesheets' class names all survive
  as markers, so every anatomy ruling and every class name it cites still holds, and that the
  `<Component>.css:NN` citations are historical by design.
- **`CHANGELOG.md`** — folded into the existing unreleased `0.12.0` entry rather than a new one,
  since nothing was published in between. Names every breaking change above, the Preflight
  dependency, and the coarse-pointer hover change with the full component list. Corrected the
  "All 44 per-component imports" sentence, which had become false.

---

## 6. Loose ends

- `Sparkline.css:22` stale `StatCard.css` comment — **fixed**, and it now says where the
  declarations went.
- `dev/DashboardDemo.tsx:341` false `.theme-switcher` comment — **fixed**; the wrapper is kept but
  no longer justified by a rule that does not exist.
- `Table.css:76` cited `Carousel.css`, `Collapsible.test.tsx:185` cited `Collapsible.css` — both
  **fixed**.
- `docs/components/virtualized-data-table.md` described `VirtualizedDataTable.css` as two live
  rules in its Theme-tokens section — **rewritten**; that was a real doc bug the lane left.
- Every other `X.css` mention is deliberate prose ("`X.css` is gone") or a historical citation in
  `PHASE1-*.md` / `SLOT-VOCABULARY.md`, left in place on purpose.
- `docs/components/activity-feed.md` was **uncommitted** in the working tree — Lane 3 left it
  behind. Included here.
- **Integrity check:** `md5sum` across every `.ts`/`.tsx`/`.css` in `src` and `dev` found **zero
  duplicate file bodies**, so no stray write survives anywhere. Every non-test `.tsx` declares its
  own component (the four apparent misses are kebab-case modules and one `class`). `ColorPicker.tsx`
  and `CommandPalette.tsx` each contain their own component.

---

## 7. Open, with recommendations

1. **A test still cannot assert stylesheet content.** Measured directly: a `?raw` glob of
   `Tabs.css` yields length **0**; the same glob of `Tabs.tsx` yields **15947**. So Lane 1's claim
   reproduces, and the important qualification is that it is **CSS-specific, not `?raw`-general** —
   the two surviving `?raw` uses (`focus.test.ts`, `AppShell.test.tsx`) read `.tsx` and are live.
   No vacuous CSS assertion remains: `Tooltip`'s was rewritten and `ProgressBar.test.tsx`
   documents the limitation instead of pretending. **Recommend:** leave it. Enabling
   `test: { css: true }` or adding `@types/node` is a config decision with a blast radius well
   past this sweep, and the instruments that *can* see CSS (`verify:*`, `probe:cascade-layer`)
   already cover the invariants that matter.
2. **`Popover.css`'s arrow block was never converted and is now ruled, not examined.** Lane 1 and
   Lane 2 reached the same verdict from opposite ends and I folded it into `AGENTS.md`, but no
   lane owned the file's remaining 64 lines the way Lane 1 owned Tooltip's 55. **Recommend:** a
   short follow-up pass on `Popover.css` alone, expecting no change.
3. **Three `all: unset` sites are now guarded but still unconverted** by owner-blocked reasons —
   `Switch` and `Radio` because `scripts/probe-cascade-layer.mjs`'s fixtures are hand-written HTML
   that pins their focus rings, and `Slider`/`ColorPicker` because of vendor pseudo-elements.
   **Recommend:** if either is ever wanted, the fixture in `scripts/` has to carry the component's
   real class string *first*, and `switch-ring-vs-consumer-reset` carries a recorded owner
   decision that must not be silently re-accepted.
4. **Lane 3 protected two rules for the probe's benefit** — `.tabs-list`'s `overflow-x` and
   `.app-shell-sidebar-section-title`'s padding. Both are still there and both probe rows still
   pass. This is correct but worth knowing: two declarations stayed because a *fixture* needs
   them, not because the cascade does. **Recommend:** leave until someone wants those files
   finished, then update the fixtures in the same commit.
5. **`verify:bugs` is not in `prepublishOnly`** by deliberate design (it guards `bugs/`, which is
   not published). It was red on arrival and nobody noticed. **Recommend:** keep it out of the
   publish chain, but add it to whatever runs at the land gate, because a five-lane sweep is
   exactly the shape that shifts anchors.
6. **A stale-cross-reference gate does not exist.** I found the rotted `X.css:NN` references by
   grep. **Recommend:** the check is about ten lines — extract `[A-Za-z]+\.css` from `src`,
   `docs` and `*.md`, and assert the file exists in `src` or in `response-ui-css` — and it would
   have caught four of the five loose ends in §6 automatically.
