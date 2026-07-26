# Handover

State of the bug work, the method that produced it, and the decisions still open. Written for
someone arriving cold.

## Where things are

| File                           | Holds                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| [`LEDGER.md`](./LEDGER.md)     | **27 open defects.** The work list. Every row believed true at source.                                                      |
| [`ARCHIVE.md`](./ARCHIVE.md)   | ~400 closed rows — fixed, declined, refuted. Ids never reused. Anchors deliberately not maintained.                         |
| [`AUDIT.md`](./AUDIT.md)       | 6 open findings about the _checking_ — gates, tests, the record. Not component defects.                                     |
| [`TAXONOMY.md`](./TAXONOMY.md) | What a row _is_ (kind) and who it hurts (harm). Work order comes from harm.                                                 |
| [`PLAN.md`](./PLAN.md)         | **Retired.** Kept only as a section map, because ~30 archived rows cite it by number. Do not rewrite it into a new plan.   |
| `../memory/`                   | Traps, testing failure modes, ledger failure modes. **Read `traps.md` before planning.**                                    |

Started at 320 open, then 64, then 24. Now **27**: the 2026-07 docs-reconcile wave closed #487
(df91fcd) but the v0.10.1 contrast sweep added #493 and the reconcile itself surfaced three new
lows (#494–#496) — the count went *up* because the reading got closer, not because the code got
worse. 2017 tests, all gates green, zero `unaudited` rows.

---

## How to work here

The method that took 320 → 64. It is not optional ceremony; each rule exists because skipping it
cost a pass.

**Partition by file ownership, not by name.** Five agents, ten-ish components each, chosen so no
two lanes touch the same file. `Avatar`/`AvatarGroup` share a file; the four menu components share
`menu-internals`; cross-component rows must land whole with one owner or they get half-closed.

**Agents never touch `bugs/`.** They report; the coordinator writes the record. Five agents editing
one ledger corrupts it. The coordinator also commits — lanes that commit interleave and contaminate
each other's staging.

**Verify at source before fixing.** A row is a claim. This file has carried a `confirmed · high`
row whose sentence was false, and 8 claims that measurement disproved. **Three of those died on the
docs, not the code** — the behaviour was documented contract and "fixing" it would have been the
breaking change. Reading the component's doc page is the cheapest refutation available.

**Harm order, not ledger order.** blocking → content-loss → exclusionary → portability →
contract-only. Depth beats coverage: a wrong fix is worse than an open row.

**Fail-first, observed.** No patch lands without the check seen red. Re-break it once after green.

**Say what is uncovered.** `vitest` runs with `css: false`, so _no test here can read a
stylesheet_. jsdom computes implicit ARIA roles regardless of the attribute, performs no layout,
synthesises no pointer path, and computes `animation-duration: auto`. Name the specific wall; a
suite that goes green over an untestable change is not evidence.

**Use the browser.** `playwright-cli --browser firefox|chrome` (Firefox 146 installed). It settled
a two-engine thumb divergence, 96px of stale parallax offset, a dead CSS rule, a 36px→21px chip and
an invisible border — all previously "unverifiable". Firefox blocks `file:` URLs (serve with
`python3 -m http.server`); `-s=<name>` for an isolated session; **validate the harness against a
predictable computed value before trusting a measurement**, and give any _null_ result a positive
control, because "nothing painted" is what a broken selector produces for free.

**Never `git add -u`** in a shared tree — it stages other lanes' in-flight files. Use
`git commit -F - -- <explicit paths>`.

**Re-anchor last, and read the list.** `node scripts/bugs-ledger.mjs --reanchor` slides line numbers
when code merely moved and prints the rows whose _content_ changed. Those need a human. Running it
to clear a red gate certifies rows as describing code they do not describe.

**Half-closed is not closed.** Say which half, in the row. A row filed `fixed` while its sentence is
still true is the most expensive error this record can carry, and it has happened.

---

## Running a parallel wave

Five lanes, ~10 components each, is the shape that worked twice. The coordinator is a real job, not
a dispatcher.

**Draw lanes by file, then check the seams.** Group by domain (forms, dates, tables, overlays,
media), then verify no two lanes share a file. The traps: components sharing one file
(`Avatar`/`AvatarGroup`), components sharing an internal (`Popover`/`HoverCard`/`DropdownMenu`/
`ContextMenu` → `menu-internals`), and rows whose Component cell names two or three components —
those must land whole with one owner or they get half-closed by a lane that owns half.

**Files no lane may touch**, because everyone needs them: `src/util/*`, `src/hooks/*`, every barrel
`index.ts`. Tell lanes to *use* them and report anything needing a change. Lanes will also all want
`CHANGELOG.md`, `memory/*` and `docs/components/README.md` — expect churn there and integrate it
yourself.

**Never launch a lane overlapping a running one.** Obvious, and still easy to get wrong when a
follow-up task names a single row: check which file that row lives in before spawning.

**Brief each lane with:** its exact rows, `TAXONOMY.md`, `memory/traps.md`, harm order, the browser,
"depth beats coverage", and an explicit *report, do not fix* channel for anything out of lane. Give
each lane the specific traps its rows will hit — a precedent to follow, a row that corrects itself,
a row whose own conclusion is suspect. Briefing from source beats briefing from your summary.

**A brief can be wrong, and saying so is a success.** One lane was told a fix was out-of-package,
with reasoning. It measured the reasoning, found the premise false, and did it anyway. Write briefs
whose premises are visible enough to challenge.

**Verify every report before recording it.** Two failure modes, both observed:

- *"All green" means green in that lane's scope, at that moment.* Two reports claimed a clean
  typecheck while the editor showed a dozen errors — both were right; the errors were other lanes
  mid-write. Re-run the checks yourself. Equally, do not trust a red you did not reproduce.
- *A lane reports a half-fix as a fix, without meaning to.* Several rows came back under FIXED with
  their second clause untouched. The work was described honestly; nobody re-read the **row's
  sentence**. Read the row, not the summary of the work.

**Some defects belong to no lane, and they are yours.** When a shared primitive's contract changes,
someone must walk its call sites — no per-component scope contains that question. Making `Spinner`
decoration-by-default was correct and silenced every consumer relying on it; one call site was
adapted because a lane happened to notice, and another shipped announcing nothing. Budget for a
seam-closing pass after every wave.

**Watch for lanes converging.** Two independently applied the same breaking type-union to different
components. Good for consistency, but it means two breaking changes in one release instead of one —
you only see it if you read the reports against each other.

**`gen-docs` rewrites every page on every run**, so two lanes running it will trip over each
other's pages. It can no longer *damage* an untargeted page — AUDIT #479 is fixed and the pattern
is now self-checked on every invocation — but the churn is still real. Have one owner run it.

**Sequence:** launch all lanes → as each lands, verify, commit its files by explicit path, integrate
its rows into the record → after the last one, re-anchor once and read the by-hand list. Do not
re-anchor mid-wave; you would stamp fingerprints against half-written files.

---

## Decisions the owner must make — 4 items

### 1 · A release call in `response-ui-css` — blocks nothing here, reaches every consumer

**DONE — `response-ui-css` v0.10.1 is published and this package depends on `^0.10.1`.**
`--C-BORDER-FOCUS` now clears WCAG 1.4.11 on SURFACE-0..2 in every theme: `events` 2.72 → 3.39 and
`grimdark` 2.96 → 3.66, with `default` and `tech` untouched because they already passed.

**The doc debt that came with it was far larger than the two pages predicted here**, and that
prediction was wrong because it inherited a lane's spot-check instead of sweeping. Thirteen pages
carried ratios asserted as current that the palette had made false — and not only from v0.10.1:
most were stale since **v0.10.0**, whose doc debt was never fully paid either. All corrected, each
naming the version it was measured against and what it read before. If a future release moves a
token, **sweep every page for the number, do not spot-check**: `docs/` ships to npm, so a stale
ratio is a false statement delivered to consumers, and several of these told readers a component
failed a floor it now clears.

What remains cross-package is in **#493**: `--C-SURFACE-3` is excluded from both retunes, so
`--C-BORDER-FOCUS` there is 2.74–2.97 in three themes and `--C-TEXT-MUTED` is 3.92–4.10 in all
four. That exclusion is deliberate upstream, so it is a scope question for the CSS package.

Two more cross-package items sit behind the same door: **#415**'s error half (`--C-STATUS-ERROR` on
its own `-BG` is 4.41 in default and `events`, and the same recipe is in `Badge`, `Alert`, `Toast`),
and **#384**'s "ink on an overlay" gap — there is no such token in the contract, so `text-white`
stays hard-coded. **#446** (heading weights) is the third.

### 2 · Public API surface — #486, #491, #492, #61, #490

Five rows that are decisions about what this package promises, not defects:

- **#486** — narrowing `Repeater`'s `name` to a typed path (#260) means a *generic wrapper* over
  `Repeater` no longer compiles. Exporting a `RepeaterName<T>` alias fixes it, at the cost of one
  barrel line and one more public type. Concrete call sites are unaffected.
- **#492** — `README.md:132` claims "the props type of every component" is exported. Most are not.
  Either export them or narrow the sentence; no gate can see this, because `verify-docs` checks
  exports→docs and never docs→exports.
- **#491** — `AGENTS.md` says "Components are forwardRef." Four are now generic function components
  instead, because `forwardRef` erases a type parameter.
- **#61** — re-scoped this wave from a missing token to an **API** gap: `Avatar`'s ring lives on an
  inner status dot that `className` cannot reach, so there is no override path at all.
- **#490** — `FileUploadRejection` is documented but not exported from the barrel.

### 3 · Two shipped defaults that need an owner, not a measurement

- **#470** — `useRovingFocus` is a *published* hook whose `onKeyDown`, `focusedIndex`, `loop` and
  `orientation` have **no in-package consumer**. The handler is correct code for toolbars and
  menubars and wrong for the two radiogroups that use the hook, and `theme-switcher.md` documents
  that split as intentional. Deleting the unused surface is a breaking change to public API.
- **#66** — restoring `w-*` on `Skeleton` requires **layering this package's component CSS**, which
  was measured: unlayered CSS behaves identically to the inline default (1280px both ways), and only
  `@layer` works (320px). But the unlayered behaviour is a contract stated on ~12 doc pages with
  documented escape hatches, so layering is a `styles.css`-wide packaging decision plus a doc sweep.

### 4 · #8 — decide what a `<dl>` should expose

Grounded in the installed `aria-query` this wave: `role="list"` would own **zero** listitems
(`dt`→`term`, `dd`→`definition`), there is **no** role to restore (`elementRoles` has no `dl` entry
and ARIA 1.3's `associationlist` family is absent from the shipped vocabulary), and `role="group"`
plus a name would be valid but changes what the element *is* in every browser — including those
that get it right today. The three facts are on `description-list.md`. This needs a decision, not
another investigation.


### The palette re-measurement, in full — supporting detail for §1

**Re-measured 2026-07-26 against the installed v0.10.0, by two independently written converters,
each validated at white-on-black = 21.0000 and against WebAIM reference pairs, and cross-checked
against browser-painted pixels (Firefox 146 and Chrome both clip out-of-gamut channels identically,
0/255 delta).** Both agreed on every pairing.

**Archived — these five rows' sentences are no longer true:** #173, #241, #319, #465, #466. Each
closed on the upstream retune, which is these rows working as designed rather than being refuted.
Their doc pages carried the stale ratios as *measured claims* and `docs/` ships to npm, so
`swimlane.md`, `pagination.md` and `calendar.md` were corrected in the same pass.

**Still open, with corrected numbers and — in two cases — a corrected door:**

- **#315** (Calendar range wash) — 1.24 / 1.18 / 1.34 / 1.20, not the row's stale 1.08–1.16. **The
  row's "cross-package" framing is wrong.** The entire surface ramp spans only ~1.2 end to end in
  every theme, so *no* palette retune can reach 3:1 without destroying what the ramp is for. The fix
  is here: the band needs a non-surface channel.
- **#415** (FileUpload status ink) — **the success half closes** (4.57 in all four themes) and **the
  error half inverts**: the row cleared its error twin using ratios measured against the very
  backdrop it had just proved the message never sits on. Against the real backdrop it is 4.41 in
  default and events. The same recipe is in `Badge.tsx:17`, `Alert.tsx:12`, `Toast.tsx:19`.
  Cross-package — `--C-STATUS-ERROR` needs the same lightness-only move the success green got.
- **#478** (ProgressBar track) — 1.00:1 confirmed exactly. Its unverified `DataTable` clause is now
  verified and **its mechanism was wrong**: the collision is with `.table-row--striped`, not a Card.
  And the in-family precedent does not solve it — no surface token clears 3:1 against `--C-SURFACE-1`
  in any theme; the widest step available is 1.25.
- **#446** — factual claims all re-verified against installed v0.10.0. Stands unchanged.

#### The one thing needing the owner: a release call

`--C-BORDER-FOCUS` **has already been fixed** in the `response-ui-css` working tree — commit
`2b41af9`, "fix(themes): the focus ring meets 1.4.11 in events and grimdark". It was deliberately
left unreleased: `package.json` stays at 0.10.0 and the entry sits under *Unreleased*, its message
saying "The release call, and the dependent's range, are the owner's."

Verified here, reading both trees:

| theme | shipped v0.10.0 (S0/S1/S2) | source HEAD after `2b41af9` |
| --- | --- | --- |
| `events` | **2.72 / 2.63 / 2.52** — fails | **3.39 / 3.29 / 3.15** — passes |
| `grimdark` | **2.96 / 2.77 / 2.55** — fails | **3.66 / 3.43 / 3.15** — passes |

`default` (3.68/3.52/3.34) and `tech` (14.84/14.56/13.70) already passed and were correctly left
alone — the default theme's ring differs from its accent in lightness, chroma *and* hue, so the
"stale copy" story never applied to it.

**So the fix is correct, verified, and reaching nobody.** It is not in the published artifact this
package resolves, so every consumer still gets a focus ring that fails 1.4.11 in two shipped themes.
The remaining work is not engineering:

1. **Bump and publish `response-ui-css`** (0.10.1 — it is a fix, no contract change).
2. **Bump this package's dependency range** to match, per the repo-root `CLAUDE.md` rule.
3. Then update `calendar.md` and `file-upload.md`, whose `--C-BORDER-FOCUS` tables are **currently
   correct** and become false the moment that release lands.

Worth doing at the same time, and still absent: **a contrast gate in `response-ui-css`.** Every ratio
in this work came from throwaway scripts. A gate asserting each theme clears its floors would have
caught the original desync, and catches it for `_theme-template.css` and every future theme. This
package now has `scripts/verify-chart-palette.mjs` as a worked example of the shape.

#### Resolved without needing the owner

`--C-CHART-1`/`-2`/`-3` in this package's `src/tokens.css` were duplicated literals — `-1` of the
default accent, `-2` of the *pre-retune* success (already stale), `-3` of the warning. They now read
`var(--C-ACCENT)` / `var(--C-STATUS-SUCCESS)` / `var(--C-STATUS-WARNING)` and track the theme.

The aliasing deliberately **stops at three**, and that partition is now gated by
`scripts/verify-chart-palette.mjs`, which measures OKLab separation across all four themes. Both
exceptions were measured, not reasoned: pointing `-4` at `--C-STATUS-INFO` collapses chart-1/chart-4
to **0.000** in the *default* theme (which sets INFO byte-identical to ACCENT), and deleting `tech`'s
literal override collapses chart-1/chart-2 to **0.000** (it sets ACCENT byte-identical to SUCCESS).
A dark theme also needs the whole ramp lifted to ~0.65–0.78 lightness, which contract ink values do
not supply. Do not "finish the job" by aliasing the other two.



## What is left — 24 rows

All of it is `low` or `med`; nothing blocking, nothing content-loss. The shape of the remainder:

- **9 rows are decisions**, listed above (#486 #491 #492 #61 #490 #470 #66 #8, plus the release call).
- **5 are cross-package** and cannot be fixed here: #415 #384 #446 #67 #17's consumer half.
- **4 are SSR/no-JS clauses** on the reveal family — #16 #182 #194 and #196's overscan — each
  measured this wave and each correctly left, with the rejected alternative recorded in the row.
- **#397** is confirmed structurally unfixable without a build step; do not re-attempt it.
- The rest are small and self-contained: #487 #488 #489 #481's naming clause, #478, #205.

**#205 is the one worth reading before touching:** it is the only member of the colour-only status
family still open, and the ledger carries the measurement showing why a glyph cannot work — the
`role="progressbar"` element *is* the track, 4/12/20px with `overflow: hidden`, and the root `Omit`s
children while Label/Value are siblings with no context joining them.


## Housekeeping

- **`dist/` is stale**, so `verify:directives` fails for reasons unrelated to source (AUDIT #472).
  Run `bun run build` before trusting it.
- **AUDIT #479 is FIXED** — `gen-docs.mjs` no longer deletes doc sections when an example fence is
  empty. The marker now terminates at the first close marker, an unclosed block is reported instead
  of rewritten, and `assertMarkerCannotSpanBlocks()` runs on every invocation *including the write
  path*, so the pattern cannot regress silently. Old and new patterns match the same 541 blocks, so
  nothing else moved. **The generator still rewrites every page on every run**, which remains a
  reason not to have two lanes run it — but a run can no longer damage a page it did not target.
- **AUDIT #473 now has two instances**: `verify:omit-discipline` misattributes a nested prop bag's
  `Omit` to the component — `Swimlane.href` and now `CodeBlock.value`, each exempted in `ALLOWLIST`
  with its reasoning. The pattern (`viewAllProps`, `imgProps`, `tableProps`, `copyButtonProps`) is
  spreading, so the scan should be bound to the component's own props type. **AUDIT #488** is the
  companion blind spot in `verify-component-docs`, and it is worse than under-reporting: it pushed a
  shipped fix (#471) off a better-fitting gutter onto one the gate could see.
- **README claim — materially better, deliberately not edited.** `README.md:3` sells "~80
  accessibility-first React 19 components". When that note was first written, six of the most-used
  status components failed WCAG 1.4.1 by conveying severity through colour alone; **five of those
  six are now closed** (#1 #21 #44 #104 #147), along with the sortable-header semantics (#353), the
  two-axis colour slider (#287), typeahead swallowing typed text (#468), table selection semantics
  (#351) and the sidebar heading gap (#395). The line is a positioning claim the owner owns, so it
  was left alone rather than rewritten by a fix pass — but the honest current position is: **one
  known 1.4.1 gap remains (#205, and the ledger carries the measurement showing a glyph cannot fit
  in a 4px track), one semantics question is open (#8), and the remaining contrast items are waiting
  on a `response-ui-css` release rather than on this package.**
