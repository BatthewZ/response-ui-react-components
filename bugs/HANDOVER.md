# Handover

State of the bug work, the method that produced it, and the decisions still open. Written for
someone arriving cold.

## Where things are

| File                           | Holds                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| [`LEDGER.md`](./LEDGER.md)     | **64 open defects.** The work list. Every row believed true at source.                                                      |
| [`ARCHIVE.md`](./ARCHIVE.md)   | ~400 closed rows — fixed, declined, refuted. Ids never reused. Anchors deliberately not maintained.                         |
| [`AUDIT.md`](./AUDIT.md)       | 6 open findings about the _checking_ — gates, tests, the record. Not component defects.                                     |
| [`TAXONOMY.md`](./TAXONOMY.md) | What a row _is_ (kind) and who it hurts (harm). Work order comes from harm.                                                 |
| [`PLAN.md`](./PLAN.md)         | **Stale.** Clusters sized against a 466-row file; most are now closed. Rewrite or retire it before trusting a number in it. |
| `../memory/`                   | Traps, testing failure modes, ledger failure modes. **Read `traps.md` before planning.**                                    |

Started at 320 open. 1868 tests, all gates green, zero `unaudited` rows.

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

## Decisions the owner must make — 26 rows blocked

### 1 · Colour-alone visual cue — #1 #21 #44 #104 #147 #205

AT half is done (hidden text / accessible name / `aria-valuetext`, all overridable). What remains is
that a sighted colourblind user sees variants differing only in tint. One decision, applied six
times; do not let six agents invent six visual languages.

| Option                              | Pro                                                                               | Con                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Icon per severity                   | Fully closes 1.4.1; the convention users expect                                   | Needs an icon set; adds SVGs or a dependency to six components                |
| Shape/weight/border differentiation | No new dependency; works for Stepper (#147), whose AT channel is already complete | Weaker signal; per-component design work                                      |
| Accept and document                 | Zero work                                                                         | Keeps a known 1.4.1 gap in a package whose README sells "accessibility-first" |

### 2 · Palette / contrast — RESOLVED except one release call

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

### 3 · Public API — #24 #287 #353

The owner has authorised adding props pre-1.0. These are larger than a prop:

| Row                  | What it needs                                                                   | Pro                                          | Con                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #24 Field↔Label      | `Field` publishes a `controlId`; `Label` and the three text controls consume it | Closes the last structural a11y gap in forms | Touches Label + Input/Select/Textarea. The tempting Field-only route is _actively wrong_ — `mergeProps` would override a caller's explicit `id` on every wired control |
| #353 sortable `<th>` | APG shape: `<th aria-sort><button>`                                             | Correct semantics                            | Moves the tab stop and handlers off the `<th>`, breaking a documented composition contract eight tests encode                                                          |
| #287 ColorPicker     | React-Aria ColorArea shape: `role="group"` + two hidden range inputs            | Correct 2-axis keyboard model                | A redesign of the panel, ~a day. `aria-valuenow` alone does **not** fix it                                                                                             |

**Two breaking type changes already shipped** this wave — `ProgressBar` and `IconButton` now require
an accessible name. Correct pre-1.0; note they arrived from two lanes converging independently.

### 4 · Shared-primitive defaults — #16, #252/#262

- **#16** — `ScrollReveal` renders `opacity: 0` by default, so a page whose JS never runs shows
  nothing. `animate={false}` opts out. Auto-revealing when `IntersectionObserver` is absent is a
  one-line change **not made**: it flips a shared default and breaks a sibling's test. Owner's call.
- **#252 / #262** — TagInput and Repeater both need add/remove announcements with overridable words.
  One convention, two components. Cheap once decided; do not solve it twice with two prop shapes.

### 5 · Cross-package, not fixable here — #17 (consumer half) #61 #67 #161 #446

Each needs a token or rule in `response-ui-css`: a `--stagger-delay` fallback instead of a
re-declaration, a themeable ring token, an opacity token, `stagger.css`'s missing `animation-name`,
heading weight tokens. Bundle them with the palette release or decline them explicitly.

### 6 · #75 — re-scope before archiving

Its `aria-describedby` half is fixed; its `aria-invalid` half is **refuted** (ARIA 1.2 does not
support it on `radio`). The row as written asks for a defect. Rewrite the sentence, then archive.

---

## Work needing no decision — ~38 rows

Runnable as a wave of 4–5 lanes on the existing method. Suggested partition by file ownership:

- **Tables / data-display** — #351 #376 #377 #342 #343 #344 #345 #139 #146 #477 #6 #29 #8
- **Media / upload / shell** — #383 #384 #386 #395 #397 #416 #420 #182 #194 #196
- **Overlays / menus** — #128 #468 #469 #476 #152
- **Forms / small UI** — #260 #293 #330 #338 #470 #471 #474 #475 #66 #61(if in-package route found)
- **Docs-truth** — #467 (published page contradicts the component and misstates a11y), #478
  (ProgressBar track vs Card, 1.00:1 — needs a token choice across two components)

`#344`/`#345` (Timeline rail) need a browser; they were left because no test here can read CSS.

---

## Housekeeping

- **`PLAN.md` is stale.** Its cluster sizes describe the 466-row file. Rewrite against the current
  64 or retire it; a stale plan is believed.
- **`dist/` is stale**, so `verify:directives` fails for reasons unrelated to source (AUDIT #472).
  Run `bun run build` before trusting it.
- **AUDIT #479 is FIXED** — `gen-docs.mjs` no longer deletes doc sections when an example fence is
  empty. The marker now terminates at the first close marker, an unclosed block is reported instead
  of rewritten, and `assertMarkerCannotSpanBlocks()` runs on every invocation *including the write
  path*, so the pattern cannot regress silently. Old and new patterns match the same 541 blocks, so
  nothing else moved. **The generator still rewrites every page on every run**, which remains a
  reason not to have two lanes run it — but a run can no longer damage a page it did not target.
- **AUDIT #473**: `verify:omit-discipline` misattributes a nested prop bag's `Omit` to the component.
  One exemption is recorded with its reasoning; the pattern (`viewAllProps`, `imgProps`,
  `tableProps`) is spreading, so the scan should be bound to the component's own props type.
- **README claim.** `README.md:3` sells "~80 accessibility-first React 19 components" while
  accessibility rows remain open. Either close them or qualify the line — the cheapest integrity fix
  on this list.
