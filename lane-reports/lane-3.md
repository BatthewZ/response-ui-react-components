# Lane 3 — Table, VirtualizedDataTable, AppShell, Tabs, Pagination, Stepper, StatCard, ProgressBar, ProgressRing, ActivityFeed

Working tree: `feat/v0.12.0`, from `b502c3a`. Ten components + `DataTable.tsx` where it renders
elements `Table.css` styled. Nothing in this lane was skipped.

## Verdicts

| Component | Verdict | Lines before → after | Declarations left | The single reason the survivor stayed |
| --- | --- | --- | --- | --- |
| **ProgressRing** | **DELETED** | 63 → 0 | 0 | — |
| **StatCard** | **DELETED** | 117 → 0 | 0 | — |
| **VirtualizedDataTable** | **DELETED** | 55 → 0 | 0 | — |
| **Pagination** | REDUCED | 98 → 23 | 1 | `all: unset` on the page button — a reset must be first-in-rule and must LOSE to a caller's class; as `[all:unset]` Tailwind sorts it last and it wipes both. |
| **ProgressBar** | REDUCED | 109 → 28 | 0 (1 `@keyframes`) | `@keyframes progress-bar-stripes` — no variant exists for a block. |
| **Tabs** | REDUCED | 226 → 102 | 12 | The strip's own box (its `overflow-x: auto` is what three live `probe:cascade-layer` rows measure a scrollbar off) + three `mask-image` rules that need a `-webkit-` twin each + `all: unset` on the tab. |
| **Table** | REDUCED | 277 → 132 | 15 | The leading-marker gradient — ONE rule shared by an element `Table` renders and one `DataTable` renders — plus the sort button's reset. |
| **Stepper** | REDUCED | 269 → 123 | 15 | The connector's six `calc()` positions over `--_stepper-gap` (AGENTS.md's own live instance of question 2) + `.stepper-indicator svg`, which styles the consumer's `icon`. |
| **ActivityFeed** | REDUCED | 205 → 158 | 29 | The rail: `--_activity-feed-dot-size` defined from another custom property, the `::before` connector, and two `> *` rules on consumer markup. |
| **AppShell** | REDUCED | 305 → 185 | 45 | The `@media (max-width: 639px)` block (no Tailwind `max-*` variant emits that query) and the three declarations it overrides + the section-title rule (a live `probe:cascade-layer` control) + two `@keyframes`. |

**1724 → 751 lines of CSS; three stylesheets deleted outright.** Every surviving file carries a
header comment naming each survivor and the question it fails.

## Public API changes

1. **`Table` context gains `stickyHeader`.** Internal only — no prop, no type change. It is what
   let `.table--sticky-header .table-head` and `… .table-header-cell` become ordinary utilities
   on the elements that carry them, instead of an `in-[…]:` variant that would match any
   ancestor and pin a nested table's head too.
2. **`VirtualizedDataTable`'s loading and empty headers now truncate.** Header truncation used to
   be scoped to `.table-virtual-scroll`, which only the data branch emits, so the three branches
   drew different headers — invisibly, because the divergence was in CSS and a live parity test
   compares class attributes only. `renderHeader()` is one block for all three states and now
   applies `truncate` in all three, which also stops the columns re-laying between the loading
   state and the loaded one. Body cells keep the old scoping: only the virtualised branch
   truncates them, and the empty branch's `EmptyState` must not be clipped.
3. **`Stepper`'s hidden status word uses Tailwind's `sr-only`** instead of a hand-rolled clip.
   Same declarations, `clip` where the hand-rolled copy used `clip-path`. The stylesheet's stated
   reason ("so the component keeps its rule that all of its styling lives in this file") is the
   rule this lane changed.
4. **`hover:` is now `@media (hover: hover)`-gated** on `Tabs.Tab`, `Pagination`'s page numbers,
   `Table.HeaderCell`, `AppShell.Toggle` and `AppShell.SidebarLink`. A hover wash no longer paints
   on a touch tap. That matches the rest of the package; documented in each spoke.
5. **`AppShell`'s toggle and sidebar link now honour `prefers-reduced-motion`.** Their colour
   transitions had no guard in `AppShell.css`; converting made `motion-reduce:transition-none` a
   one-word addition and leaving the two halves inconsistent was the worse option.
6. **No slot was added and none was renamed.** Nothing in this lane needed a new element.

## Refutations

1. **AGENTS.md §"What stays", row "an element this package does not render", is wrong about
   `VirtualizedDataTable.css`.** The row reads: *"`VirtualizedDataTable.css` styles `.table-cell`
   / `.table-header-cell`, which `Table.tsx` renders."* `VirtualizedDataTable.tsx` renders seven
   of them itself, through `<Table.Cell>` / `<Table.HeaderCell>`, both of which merge a
   `className` — and one call site was already using that route (`className="w-10"`). The rule
   that was genuinely blocked by question 1 was `table-layout: fixed` on the `<table>`, whose
   only route is `Table`'s `tableProps` hatch — which this component populates itself, so it was
   not blocked either. **The whole file is now deleted.** Proposed replacement wording is below.

2. **`.table-virtual-scroll { overflow-y: auto }` was dead code, not a rule.** The same element
   always carries an inline `overflowY: "auto"`, which beats a class at every layer, and the
   loading and empty branches never carry the class at all. Deleted rather than transposed.

3. **`.table-body` was an empty rule** holding only a "base styles" placeholder comment. Free
   deletion; the class is still emitted as a marker.

4. **`max-sm:` and `max-[639px]:` are both wrong for AppShell's mobile branch, measured.**
   `bun run scripts/probe-utility-exists.mjs --css 'max-[639px]:hidden' 'max-sm:hidden'` emits
   `@media (width < 639px)` and `@media (width < 40rem)`. The stylesheet needs `max-width: 639px`
   (`width <= 639px`) to mirror `MOBILE_VIEWPORT_QUERY`. Tailwind has no `<=` media form, so the
   block stays — and with it the three base declarations it overrides, since a base in
   `@layer utilities` would sit above a media override in `@layer components`.

5. **`verify:focus-affordance` resolves class constants by identifier GLOBALLY across modules,
   so two files with the same `const` name pool their class strings.** This lane hit it live:
   naming Tabs' panel constant `panelClasses` made the gate report `outline-none` on
   `Tabs.tsx`'s `<div role="tabpanel" tabIndex={0}>` — a **false violation**, resolved from
   `ColorPicker.tsx`'s unrelated `panelClasses`. It fails loudly in that direction and goes
   **blind** in the other: a real reset with no ring is exempted the moment any other module
   defines a same-named constant containing a ring token. `grep -rhoE '^const [A-Za-z_$][\w$]*'
   src/components --include=*.tsx | sed 's/^const //' | sort | uniq -d` currently lists **42**
   duplicated top-level names, including `panelClasses`, `contentClasses`, `toggleClasses`,
   `rootClasses`, `iconClasses`, `labelClasses`, `valueClasses` and `trackClasses`. This lane's
   constants were renamed to component-scoped names (`tabsPanelClasses`, `stepContentClasses`,
   `appShellToggleClasses`, …) as a workaround; the gate itself is untouched and unaware.

6. **`verify:component-docs` cannot resolve `size-*`, `h-*`, `w-*`, `top-*`, `bottom-*` or
   `rounded-t-*` to a token**, because `PREFIX_NAMESPACES` covers only
   `p/px/py/pt/pb/pl/pr/m/mx/my/mt/mb/ml/mr/gap` for spacing and bare `rounded-` for radius. Four
   spokes in this lane therefore name a token in prose rather than in the table — the precedent
   `tooltip.md` already set for `size-r5`. This is the guard under-reporting, not the docs.

## Proposed edits to shared documents (NOT made — consolidation agent, please apply)

### `AGENTS.md` §"What stays", row 4 ("an element this package does not render")

Replace the second live-instance sentence. Current:

> `VirtualizedDataTable.css` styles `.table-cell` / `.table-header-cell`, which `Table.tsx` renders (`grep -rn 'table-cell' src/components/ui/Table.tsx`).

Proposed:

> `Stepper.css`'s `.stepper-indicator svg` — that svg is the caller's `icon` node, and as
> `[&_svg]:size-4` it would emit at 0,1,1 in `@layer utilities` and start beating the caller's own
> 0,1,0 class (`grep -n 'stepper-indicator svg' src/components/ui/Stepper.css`).
> **`VirtualizedDataTable.css` used to be cited here and the citation was wrong**: the component
> renders those cells itself through `<Table.Cell>` / `<Table.HeaderCell>`, both of which merge a
> `className`, and it populates `Table`'s `tableProps` hatch too — so nothing in that file was
> blocked by this question, and the file is gone. *Rendering the element through a subcomponent
> that forwards `className` is still rendering it.*

### `AGENTS.md` §"What stays", row 5 ("the read site is not a property")

Add the second live instance beside `--_stepper-gap`:

> `--_activity-feed-dot-size: var(--_activity-feed-aside-width)` — a custom property defined from
> another custom property, with no property anywhere for a utility to set
> (`grep -n 'dot-size' src/components/data-display/ActivityFeed.css`).

### `memory/css-to-utilities.md` — new section

> ## A gate that resolves constants by name resolves them across every file
>
> `verify-focus-affordance.mjs` builds one global identifier → string-literal map, to a fixpoint,
> over every non-test module. Two files declaring `const panelClasses` therefore share a value.
> Measured: naming Tabs' panel constant `panelClasses` produced a **false NO AFFORDANCE violation**
> on `Tabs.tsx`'s `<div role="tabpanel" tabIndex={0}>`, resolved from `ColorPicker.tsx`'s
> `outline-none`. The loud direction is survivable. The quiet one is not: a real reset with no ring
> is silently exempted the moment any other module defines a same-named constant carrying a ring
> token, and the gate prints OK. 42 top-level `const` names are currently duplicated across
> `src/components`. Until the resolver is scoped per module, **name a hoisted class constant after
> its component** (`tabsPanelClasses`, not `panelClasses`) — the collision is invisible in both
> directions otherwise.
>
> ## The docs guard's utility→token map is prefix-limited, and the gap is geometry
>
> `verify-component-docs.mjs`'s `PREFIX_NAMESPACES` resolves spacing only through
> `p*`/`m*`/`gap`, so `size-r2`, `h-r5`, `w-r6`, `top-r6` and `bottom-r6` name a real token and
> resolve to nothing; `rounded-t-md` looks for `--radius-t-md` and misses too. A row naming one
> fails with "resolves to no token in the contract", which reads like the utility is wrong. The
> established answer is `tooltip.md`'s: state the token in prose beside the table and say why it is
> not a row. Four spokes in the Lane 3 set now do that.

### `CHANGELOG.md`

Three stylesheets deleted (`ProgressRing.css`, `StatCard.css`, `VirtualizedDataTable.css`); seven
reduced to a stated core. The five behaviour changes under "Public API changes" above are the ones
a consumer can see; #2 and #4 are the two worth a headline.

## Anything a consolidation agent must resolve

- **`probe:cascade-layer` was not run** (the brief reserves it). Two fixtures were deliberately
  protected rather than broken: `.tabs-list`'s `overflow-x: auto` (rows `tabs-scrollbar-height`,
  `tabs-scrollbar-thumb-color`, `tabs-thumb-hover-inert` measure `::-webkit-scrollbar` on a
  `<div class="tabs-list">` with no other class — without the rule the element does not scroll and
  the pseudo-element has nothing to report) and `.app-shell-sidebar-section-title`'s `padding`
  (rows `control-sronly-sectiontitle-padding` and `control-sectiontitle-padding-unopposed`, the
  second of which asserts `padding-left: 12px` on an element carrying only that class). Both rules
  therefore STAYED, against the pull of the sweep. If the owner would rather convert them, the
  fixture markup in `scripts/probe-cascade-layer.mjs` has to gain the utilities first.
- **`src/components/data-display/Sparkline.css:22` now carries a stale comment** — *"`StatCard.css`
  also selects `.sparkline`; that file belongs to StatCard."* `StatCard.css` is deleted and the
  `display: block; width: 100%` it applied is handed to `Sparkline` through the `className`
  StatCard already forwards. Sparkline is Lane 4's file; the line wants deleting.
- **`Wizard` is unaffected but should be re-read.** It renders `Stepper` and its tests select
  `button.stepper-indicator`; that class is still emitted (now beside its utilities) and
  `Wizard.test.tsx` passes unchanged. `docs/components/wizard.md` needed no edit —
  `verify:component-docs` is green on it.
- **`AGENTS.md`'s `@keyframes` count** is still "8 blocks in 5 files" and still correct: this lane
  moved none and deleted none (`ProgressBar` ×1, `AppShell` ×2 all survive).
- **`src/styles.css` lost three import lines** (ProgressRing, StatCard, VirtualizedDataTable), each
  removed as a single-line targeted edit. `verify:css-layering` reports 26 component imports.

## Gates

`typecheck` (lane files clean; `ColorPicker`/`Tooltip` errors in the tree are another lane's
in-flight work), `lint`, `verify:component-docs`, `verify:slot-annotations`, `verify:docs`,
`verify:css-layering`, `verify:no-css-imports`, `verify:focus-affordance`, `verify:example-themes`
— all green. 487 tests across the twelve affected files pass.

**Break-then-fix, per the house rule.** Two new invariants were each broken on purpose and watched
go red before being restored: swapping the striped/selected argument order in `Table.Row`'s `cn()`
reddened exactly `Table > keeps the selection wash on a row that is also banded` (a test added for
it), and dropping `p-0` from `expandedCellClasses` reddened exactly
`DataTable > leaves every base class alone when no slot is passed`.
