# Handover

State of the bug work, the method that produced it, and the decisions still open. Written for
someone arriving cold.

## Where things are

| File                           | Holds                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| [`LEDGER.md`](./LEDGER.md)     | **64 open defects.** The work list. Every row believed true at source.                                                      |
| [`ARCHIVE.md`](./ARCHIVE.md)   | ~400 closed rows — fixed, declined, refuted. Ids never reused. Anchors deliberately not maintained.                         |
| [`AUDIT.md`](./AUDIT.md)       | 7 open findings about the _checking_ — gates, tests, the record. Not component defects.                                     |
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

**`gen-docs` rewrites every page on every run**, so one lane running it can damage a file it has
never opened (AUDIT #479). After any lane runs it, re-read the pages *other* lanes own.

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

### 2 · Palette / contrast — #173 #241 #315 #319 #415 #465 #466 (+ #446)

**The retune shipped.** `response-ui-css` `b237be3`, released as **v0.10.0**, and this package
already depends on `^0.10.0` — the release chain is done. 11 values, lightness-only (hue and chroma
byte-identical), all four targets met in all four themes, no pairing regressed PASS→FAIL.
**Re-measure the seven rows above against the shipped tokens and archive the ones that now pass**;
they were written against the old values.

The grimdark `--C-TEXT-ON-ACCENT` inversion (light parchment → dark parchment on lit red) is part of
that release. It was forced, not chosen: once accent is bright enough to read as ink on SURFACE-2,
no light on-accent value reaches 4.5:1 — even white is 3.66:1.

**One item did not ship and is still open.** `--C-BORDER-FOCUS` is a duplicated literal of the *old*
accent, not a `var()` reference, so the retune left it behind:

| theme | `--C-BORDER-FOCUS` on SURFACE-0 | `--C-ACCENT` it used to mirror |
| --- | --- | --- |
| `events` | **2.72** (needs 3.0) | 4.89 |
| `grimdark` | **2.96** (needs 3.0) | 5.69 |

So the focus ring now fails WCAG 1.4.11 *and* no longer matches the accent in two shipped themes.
**Recommend fixing** — it is a contrast failure in its own right, and leaving it turns a contrast fix
into a visual inconsistency. Same technique, one value per theme. Consider making it a `var()` so
the next retune cannot desync it again.

Also unresolved: `--C-CHART-1`/`-2` in _this_ package's `src/tokens.css` hard-code the old accent and
success values and will not track the retune. Second copy of a value that should be one.

Deliberately left failing, outside the original brief: success ink on SURFACE-2 (4.31–4.35), accent
ink on SURFACE-3 (4.10 / 4.26, consistent with the muted-text precedent's SURFACE-3 exclusion).

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
- **AUDIT #479 is live and dangerous**: `gen-docs.mjs` silently deletes doc sections when an example
  fence is empty, its only signal names a _different_ example, and `--check` then agrees with the
  damaged file. It has already eaten a page its author never touched. Re-read every page you own
  after running it.
- **AUDIT #473**: `verify:omit-discipline` misattributes a nested prop bag's `Omit` to the component.
  One exemption is recorded with its reasoning; the pattern (`viewAllProps`, `imgProps`,
  `tableProps`) is spreading, so the scan should be bound to the component's own props type.
- **README claim.** `README.md:3` sells "~80 accessibility-first React 19 components" while
  accessibility rows remain open. Either close them or qualify the line — the cheapest integrity fix
  on this list.
