# Plan — "sensible defaults, overridable"

**✔ PHASES 1 AND 2 ARE CLOSED. Phase 3 is next, and its cascade precondition is met.** This
package's component CSS is in `@layer components`, so `<StatCard className="flex-row">` works today
on every component; `Grid.css` and `MasonryGrid.css` are deleted and both column scales are native
Tailwind utilities behind a bounded `columns` union. `scripts/probe-cascade-layer.mjs` measures
**0 regressions, 0 inert rows, 3 accepted deltas and 16 verified rows** across 19 rows. Both phases'
lessons are in `memory/gates.md` and `memory/README.md`; their settled outcomes are rows in §13.

```
bun run probe:cascade-layer     # regressions: 0  inert: 0  accepted: 3  verified: 16
bun run verify:css-layering     # 44 component imports, all layer(components); tokens.css unlayered
```

**Phase 3's remaining blocker is the slot vocabulary (§10), and it is now written down.**
`SLOT-VOCABULARY.md` is the frozen naming contract, the per-family slot tables, the ban list with
every reason re-verified at source, and the owner rulings taken since this plan was written. **It is
authoritative; this plan points at it and does not restate it** (`memory/README.md` §20 — a plan
restating what already lives somewhere authoritative is a second source of truth, not diligence).

## How to read this document

It states what is true now, in the imperative. There is nothing to read defensively and no
struck-out text to step around.

- **Every quantitative claim carries the command that reproduces it.** A bare number in this file is
  a bug in this file. Re-run rather than trust: this document's numbers have been wrong before,
  including numbers measured correctly and then mis-transcribed into the sentence beside them.
- **Numbers whose value depends on how you count say so, and name the method.** A method-dependent
  number quoted bare is how this plan previously sized work off a figure no method reproduces.
- **`◆ DECISION` marks something the owner must settle.** They block. They are collected in §3.
- **`▲ ONE-WAY DOOR` marks a choice that becomes permanent public API.** Freeze it before fan-out.
- Refuted claims are not kept here. **§13 lists what has been settled** and where the reasoning
  lives, so nobody re-derives it. `bugs/ARCHIVE.md` #497/#498 own the Phase 0 detail in full.

---

## 0. Before you start

**Run this first:**

```
bun run probe:cascade-layer
```

**It passes** — `regressions: 0, inert: 0, accepted: 3, verified: 16` — and reading its 19 rows is
still the fastest way into this problem, because each row's `note` carries the collision it
reproduces and how to make it come back red. It is the only instrument in the repo that can see this
class of bug: `vitest` stubs CSS to `""` and jsdom applies no stylesheets, so every other gate is
blind to the cascade.

Two things in that output a newcomer will misread:

- **The first section still prints a build error, and that is the *pass* condition.** It proves
  `@import "./styles.css" layer(components)` cannot compile — `@source` may not be nested — which is
  why the 44 per-component imports each carry `layer()` instead. It is a measurement, not a failure.
- **`accepted: 3` is not `verified: 3`.** An accepted row is a *changed* value the owner signed off,
  pinned to that value. Read each one's reason before anything else: they are the rows whose green
  means "decided", not "safe" (§3a, and the two `hero-*` rows).

**Then run `bun run verify:css-layering`.** It is ~130 lines, half of them the reason why, and it
asserts the one thing Phase 1 actually did — `layer(components)` on every component import, and none
on `tokens.css`. The probe **cannot** assert that: it re-derives the import list from
`src/styles.css` and adds `layer()` *itself* to build its layered variant, so deleting
`layer(components)` from a real import leaves the probe green and every other gate silent.

### The five things that will bite you

1. **Phase 1 is closed, and it was not mechanical.** The eight measured regressions are gone, and
   *how* is the part to read before touching anything CSS-shaped. **Five of the eight were fixed by
   stopping the collision rather than winning it** — `Timeline` stopped emitting the foundation's
   entrance class, `Stagger`'s stylesheet was deleted outright, `Tabs` deleted three scrollbar
   declarations across two rows, and `Radio`'s competing utility was taught to stand down. **Two took
   an `!important`**, which `AGENTS.md` fences with an explicit admission test. **One was accepted.**
   `memory/README.md` §22 is the generalisation; §13 carries the outcomes row by row.
2. **`classNames` is now a valid API, and it was not before.** Before Phase 1 every slot would have
   been a prop that appears in the DOM, changes nothing, and reports no error. That premise is
   deleted, which is what unblocks Phase 3 — see §4a for why `memory/affordances.md`'s objection to
   this exact API dissolved rather than being mistaken.
3. **`src/styles.css` is owned, and stays owned — with one carve-out.** Phase 1 was the single
   serial commit that layered the individual imports; Phase 5 prunes the file. `@source` cannot be
   nested, so the aggregate import can never carry `layer()`. No lane edits it **except to delete
   the `@import` line of a stylesheet it deleted in the same commit** — an import pointing at a
   missing file does not compile, so a phase that deletes a stylesheet has no choice (§7 item 10).
   `verify:css-layering` fails the build if a lane silently un-layers an entry, and its headline
   count is the number to compare against the run before, not against a number written here.
4. **A class string a test asserts is the *input*, not the outcome.** `vitest` stubs CSS to `""`, so
   `toHaveClass("grid-cols-3")` passes for a typo, for a class no build generates, and for a class
   that generates something else. Phase 2's real instrument was one Tailwind build containing both
   markups, diffed by `getComputedStyle` — and it has a contamination trap of its own (§6 Phase 2).
5. **Do not "fix" the house rule into symmetry.** `className` → outermost element; `...props` stays
   on the focusable control. This was reversed once and had to be withdrawn: `<label for>` binds
   only to labelable elements, `div.focus()` is a no-op so `focusFirstError()` dies silently, and an
   `inputProps` hatch restores neither `mergeProps` nor `SearchInput`'s `id` guard. The asymmetry
   looks wrong and is correct. See §4b.

### Sequencing

```
Phase 1  ──►  Phase 2  ──►  Phase 3  ──►  Phase 5 (release)
✔ CLOSED      ✔ CLOSED      (lanes,
(owned        (2 files       fan-out)     Phase 4 is not a project — it is a
 styles.css)   deleted)                   standing convention, and it is now
                                          written down: AGENTS.md, "Decision:
                                          what stays in CSS…". No lanes, no
                                          completion criterion.
```

**The prize is Phases 1–3.** Phase 1 alone made `<StatCard className="flex-row">` work. Stop after
3 and the package is coherent and the feature is delivered.

---

## 1. The goal

A consumer can use any component with no arguments and get a sensible result, **and** override any
visual decision it makes without reaching for a stylesheet:

```tsx
<StatCard>…</StatCard>
<StatCard className="flex-row items-center border-0 bg-surface-2">…</StatCard>
```

Before Phase 1 the first worked everywhere and the second worked only on components with no `.css`
file. **That inconsistency — not the CSS itself — was the defect.** Phase 1 removed it for
`className`; Phase 3 removes it for internals via `classNames`. Phase 4 exists to reduce the CSS —
a separate, optional goal that neither phase depends on.

### Guiding principle

> Do the right thing today to make tomorrow better. Prioritise the project long-term over what is
> convenient now. The package is pre-v1, so a breaking API change is an acceptable price for the
> correct design — it will never be cheaper than it is today.

Concrete consequence for the §5 triage: **do not default to (c) slot because it is less
disruptive.** Where an internal element has real identity, (d) compound is right even though it
breaks the API.

---

## 2. What is true today

### 2a. The cascade

| Fact | Re-check with |
| --- | --- |
| This package's component CSS is imported **in `@layer components`**, which Tailwind orders **below** `@layer utilities` — so a caller's utility beats a component rule at any specificity. `tokens.css` is deliberately the one unlayered import: it carries `@theme inline`. | `bun run verify:css-layering` → `44 component imports, all layer(components); tokens.css unlayered`. Then `node scripts/probe-cascade-layer.mjs --keep` and walk the built CSS: `.flex-col` and `.sr-only` resolve inside `@layer utilities`; `.stat-card` and `.timeline-item` resolve inside `@layer components`; the foundation's `.scroll-reveal-hidden` resolves **unlayered**. (**`grep -c 'layer(' src/styles.css` is a trap, not the check.** It returns **47** against 44 imports, because the file's own header prose mentions the token on three lines — `grep -n 'layer(' src/styles.css \| grep -v '^[0-9]*:@import "\./components'` → 3. **Filtering those three with `grep -v '@import'` finds only two of them**, because one of the prose lines quotes an `@import`; filter on the import *shape*, not the word. The two halves move independently, so the number is not the import count and never was. `verify:css-layering` parses the imports and classifies every one; quote *its* headline.) |
| The foundation is **almost entirely unlayered** — 2 `@layer` blocks, both `@layer base`, across the whole package. So it out-ranks everything this package writes, and the property-intersection surface is the whole of `response-ui-css`, not just its animation files. | `grep -rn '@layer' ../response-ui-css/src/` → `base.css:48`, `responsive/text.css:114` (the third hit, `base.css:44`, is the comment explaining the first). |
| **3 rules in 2 files** still name a class the foundation owns, down from 7 in 4. Each was left deliberately and is measured by a probe row; the other four were deleted, because a rule that can never win again is dead CSS that looks live. | `grep -rn 'stagger-item\|scroll-reveal-hidden\|\.fade-\|\.scale-in\|\.scale-out' src --include=*.css` → **rule** lines `Hero.css:99` and `:119`, `ScrollReveal.css:32`. Method: every other hit in that output is a comment. `Stagger.css` no longer exists and `Timeline.css`'s two entrance rules are keyed on `[data-entering]`, an attribute this package emits, not on a foundation class. |
| Token-backed utilities compile to `var()`, so **runtime re-theming survives inlining**. | `.bg-surface-0{background-color:var(--C-SURFACE-0)}` in the built CSS. |
| Arbitrary custom properties generate, land in `@layer utilities`, and dedupe per property name. | `cn("[--X:a]","[--X:b]")` → `[--X:b]`; `cn("[--A:1]","[--B:2]")` → both. |
| A token override and the utility reading it coexist. | `cn("[--C-TEXT-PRIMARY:red]","text-fg-primary")` → both retained. |
| Variant-scoped utilities do **not** dedupe against bare ones. An override must match the variant. | `cn("in-[.timeline]:mt-r5","mt-0")` → both kept. |
| Tailwind v4 is **already a hard requirement**; no non-Tailwind consumer exists to break. | `AGENTS.md:16`. `diff src/styles.css dist/styles.css` → identical: unresolved `@import`s, live `@source`, zero generated rules. |
| The package's written policy already **is** inline utilities. | `grep -n 'styling boundary is Tailwind utilities' AGENTS.md`: *"The library's styling boundary is Tailwind utilities + design tokens."* (Cited as `AGENTS.md:400` before Phase 3 grew the file; the line moved, the sentence did not.) |
| `cn()` accepts the clsx **conditional-object** form. This is why `className` must not be overloaded to take a slot object (§4a). | `cn({"border-0":true,"bg-surface-2":false})` → `"border-0"`. |

**Do not cite byte offsets in compiled CSS.** The previous version of this table did; every one of
them is now wrong, because the offsets move on each build while the claim stayed true. Cite a
command that recomputes the answer.

### 2b. Payload size — method-dependent, so state the method

Two legitimate denominators: **all of `src`** (47 `.css` files, 6,032 lines) and **component
siblings only** (44 files, 5,832 lines). The all-`src` reading includes `styles.css`, `tokens.css`
and `examples/example-theme-tuning.css`.

```
find src -name '*.css' | wc -l                      # 47
cat $(find src -name '*.css') | wc -l               # 6032
grep -c '^@import "\./components' src/styles.css    # 44  — the components-only denominator
# components-only line total: iterate that import list
cat $(grep -o '^@import "\./components[^"]*"' src/styles.css \
      | sed 's/@import "//; s/"$//; s|^\./|src/|') | wc -l    # 5832
```

**The components-only file count is the same number `verify:css-layering` asserts**, which is what
keeps the two from drifting: a file that is not imported from `src/styles.css` is not in the
cascade, so it is not in this table either. `Stagger.css` left both when Phase 1 deleted it, and
`Grid.css` and `MasonryGrid.css` when Phase 2 did; `menu-internals.css` joined both in Phase 3, and
`Calendar.css` → `CalendarBase.css` was a rename and moved neither count.

> **Every figure in the table below was re-derived at HEAD, and each method was re-checked against a
> known answer first.** The tree that carried the previous figures is `0a61e01` (46 files / 5,948
> lines); running each method over `git archive 0a61e01 src` returns that tree's numbers exactly —
> 2,192 / 2,150 declarations, 632 / 648 rules, 23.6% / 13.2% / 12.3%, 51 blank-in-comment lines, 218
> lines and 113 declarations in the deletable seven. A method that cannot reproduce a known answer is
> not the method that produced it.

| Measure | Value | Caveat |
| --- | --- | --- |
| Declarations | **2,207** all-`src` / **2,165** components-only | Method: strip `/* */`, count `;` at brace depth ≥ 1. Verified exact for this codebase — no block omits its trailing `;`, no `;` inside `url()`/`content`. **The method is checkable against two known answers:** over `git archive 81888c2 src` it returns the pre-Phase-2 figures (2,247 / 2,205); over `git archive 0a61e01 src` it returns the figures this row used to carry (2,192 / 2,150). Both exactly. Reproduce components-only by iterating the `@import` list with `/@import\s+"(\.\/[^"]+\.css)"[^;\n]*;/` — **`"\s*;` matches nothing now the imports carry `layer(components)`, and prints a silent `0`.** |
| Rules | **637** selector rules, or **653** counting `@keyframes` steps | Never quote 653 bare. Same method check: 685 / 701 over `81888c2`, 632 / 648 over `0a61e01`. Method: count `{` whose prelude does not begin `@`; a block nested inside `@keyframes` is a step, not a selector rule. Phase 2 deleted 53 rules, 50 of them the two column scales. |
| Comments / blank | **24.1%** / **13.2%** | Method: mask `/* */` spans, then count lines that retain any masked character as comment, and lines blank outside a comment as blank. **The old "this caveat is now inert — there are zero blank lines inside comment blocks" claim is false, and was false when written.** There are **55** of them at HEAD (51 at `0a61e01`, unchanged across Phase 2), so the two readings genuinely differ: counting them as blank gives **13.2%**, not counting them gives **12.3%**. The figure above is the first reading. **A blank line inside a comment carries no masked *character*, so a mask-any-character test cannot see it — test the comment state at the line's position instead, or this row silently reads zero.** Combined **37.3%** of the payload is not CSS, and every phase so far has pushed that up: they add explanation faster than they remove rules. |
| Fully deletable by inlining | **DISCHARGED — 5 of 7 deleted, 2 refuted.** The remaining list is **0 files**. | **The list was `{Tooltip,Popover,Wizard,ThemeSwitcher,DropdownMenu,Button,Collapsible}` and the CSS-to-utilities sweep re-took the membership judgement it says had never been re-taken.** Method, so the figures are reproducible: `git show a24f41d:src/components/ui/<F>.css \| wc -l` for lines, and the same piped through `grep -cE '^\s*[a-zA-Z-]+\s*:.*;'` for declarations. **Five went entirely** — Wizard 23 lines / 11 declarations, ThemeSwitcher 42 / 23, DropdownMenu 12 / 7, Button 1 / 0 (comment only), Collapsible 35 / 7: **113 lines and 48 declarations, all now zero.** **Two are refuted and must come off the list rather than be carried forward.** `Tooltip` (57 → 55 lines, 24 → 9 declarations) and `Popover` (72 → 64, 30 → 14) both keep exactly one irreducible rule — `border: inherit` on the arrow — plus the `[data-side]` rules that exist only to qualify it. **This answers the row's own open note with a NO.** The note read *"Anyone re-taking it starts with the two arrow blocks, whose `border: inherit` shorthand has no Tailwind utility short of an arbitrary property."* Needing an arbitrary property **is** the blocker, not a detail of it: `[border:inherit]` compiles, but Tailwind sorts arbitrary properties after every *bare* named utility at equal specificity, so as a class it would beat `classNames.arrow` — the one thing that slot exists for — instead of losing to it. `border-inherit` is no escape either; it is `border-color: inherit` only and cannot carry the inherited width and style. (The `[data-side]` rules were never the blocker: a variant utility emits later *and* out-ranks at 0,2,0.) Both files now carry that reasoning in a header comment. **`Grid.css` and `MasonryGrid.css` left this list because Phase 2 deleted them**, which is where 137 of the old 355 lines and 55 of the old 168 declarations went. **`ScrollReveal.css` came off it for a different reason** and must not go back on — see the row's own entry below. Quote lines *or* declarations, never mixed. |
| `ScrollReveal.css` — off the deletable list, and the stated reason was wrong | **1 declaration in 35 lines.** Stays. | It is `opacity: 1 !important` inside `@media (scripting: none)`. The reason this row used to give — *"no utility can replace it, because `noscript:opacity-100` lands in `@layer utilities` and loses to the foundation's unlayered `.scroll-reveal-hidden`"* — is true of the spelling it names and **false as a general claim**. Probed against this repo's real Tailwind: `noscript:opacity-100!` emits `opacity: 100% !important` inside `@layer utilities`, and an important declaration beats a non-important one across the author origin **whatever the layer**, so it *does* win and *would* delete the file. **It is rejected on reach, not on cascade.** The CSS rule covers every `.scroll-reveal-hidden` in the document, including markup an Astro/Rails consumer hand-authors against the foundation's vocabulary; a utility covers only what React renders. Narrowing a *visibility* guarantee — the one thing this declaration exists to make unconditional — is not worth 35 lines. Keep it off the list for **that** reason, and add the word *ordinary* to any sentence of the form "no utility can beat the foundation here". |
| Convert mechanically | **~80%** | Bucket A + B. **An estimate, not a measurement** — the bucketing is a judgement call and is not derivable from the repo. Robust to the denominator; do not present as measured, and do not restate it as a count of declarations, which is what made the previous figure look measured. |

`Timeline.css` is the cleanest illustration of why lines mislead: **582 lines, 115 declarations,
50.3% comment** (`wc -l src/components/ui/Timeline.css`, plus the declaration and comment methods
above run over that one file) — a layout contract that would not survive being spread across six
class strings. It grew by 53 lines in Phase 1 while gaining one declaration, which is the same point
from the other direction. **This is the file's only measurement in this document**; a second one further down said
529 / 114 / 50.9% and was stale by Phase 1's own doc sweep. One measurement, stated once.

### 2c. Component counts — reading-dependent, and the old numbers were not reproducible

```
# .tsx under src/components, excluding *.test.tsx and *.examples.tsx
281 total − 96 test − 90 examples = 95;  44 have a sibling .css, 51 do not
# excluding three non-components (use-form, router-adapter, menu-internals)
92;  43 with CSS, 49 without
# the sibling test, spelled out — a module has a sibling iff X.css sits beside X.tsx
for f in $(find src/components -name '*.tsx' ! -name '*.test.tsx' ! -name '*.examples.tsx'); do
  [ -f "${f%.tsx}.css" ] && echo "$f"; done | wc -l          # 44
```

**The 50/50 split is gone, and it was never the finding.** `Stagger.css` moved it to 45/47, Phase
2's two deletions moved it again to 43/52, and Phase 3's `menu-internals.css` moved it back to 44/51
— which is exactly how much weight a "50/50" observation could ever bear. The durable statement is
the absolute one: **fewer than half** of this package's components have a sibling stylesheet, and
Phase 1 made that fact stop mattering for `className`.

**The three counts agree at 44, and that is worth checking rather than assuming.** 44 is the
`verify:css-layering` headline, the components-only denominator in §2b, and the sibling count in the
95-module reading above — because every component stylesheet sits beside its module and is imported
from `src/styles.css`. Verified as set equality, not just as a matching integer: the sibling list and
the `@import` list are byte-identical.

```
for f in $(find src/components -name '*.tsx' ! -name '*.test.tsx' ! -name '*.examples.tsx'); do
  [ -f "${f%.tsx}.css" ] && echo "${f%.tsx}.css"; done | sed 's|^src/||' | sort > /tmp/sib
grep -o '^@import "\./components[^"]*"' src/styles.css \
  | sed 's|@import "\./||; s|"$||' | sort > /tmp/imp
diff /tmp/sib /tmp/imp      # no output
```

**The 92-module reading is the one that disagrees, and it is measuring something else — by design.**
It excludes three modules as non-components, and since Phase 3 one of them, `menu-internals.tsx`, has
a sibling stylesheet in the cascade. So that reading yields **43** with CSS against a
`verify:css-layering` headline of **44**, and the single-file gap *is* `menu-internals.css`. Neither
number is wrong; they answer different questions ("how many components ship CSS" vs "how many
stylesheets are in the cascade"), and the discrepancy is now the difference between them. Quote the
95-module reading whenever the number has to line up with the gate.

**A count of `.css` files under `src` is *not* any of these numbers**: that is 47, because
`styles.css`, `tokens.css` and `examples/example-theme-tuning.css` have no sibling module.

**There is no reading of this repo that yields ~155 components.** The ceiling is **98** — PascalCase
value symbols re-exported from the seven barrels under `src/components/*/index.ts`, `type` exports
excluded — and the plausible range is 92–98. (**The "105" this sentence used to carry is dropped: no
method tried reproduces it**, and 98 is stable across `81888c2`, `0a61e01` and HEAD. The refutation
does not depend on which figure is right — every reading is far below 155.)

```
cat src/components/{ui,form,data-display,layout,animation,guards,router}/index.ts \
  | tr '\n' ' ' | grep -oE 'export \{[^}]*\}' | tr ',{}' '\n\n\n' \
  | sed 's/export//; s/.* as //; s/^ *//; s/ *$//' \
  | grep -E '^[A-Z][A-Za-z0-9]*$' | sort -u | wc -l      # 98
```

Any percentage built on ~155 is unmeasurable — which includes the old "~87 clean of ~155" coverage
figure. **Do not quote a coverage percentage
for the gap list.** Use the absolute count of verified gaps, and verify each at source first (§7).

**The test-blast-radius number is not reproducible and must not be used for lane sizing.** Readings
range 34–99 across seven definitions:

```
find src -name '*.test.ts*' | wc -l                                  # 116  total
grep -rl 'toHaveClass\|className' src --include=*.test.tsx | wc -l   #  89  simple grep
```

**Test files referencing a class an authored `.css` defines: 54 (exact-token) or 63 (substring).**
Method, and it has to be stated because the two readings differ by nine files: collect every class
selector appearing outside a **declaration** body in every `.css` under `src` bar `styles.css` and
`tokens.css` — a selector nested inside `@media`/`@supports`/`@container` is still a selector, and a
naive brace-depth test drops it and quietly loses four names and one test file — (**332 distinct
names**, of which **105** carry `__`); then count test files whose text contains one of those names
as a whole `[A-Za-z_][\w-]*` token (exact) or anywhere at all (substring). Run over `git archive
81888c2 src` the same code returns **53 / 63** and over `git archive 0a61e01 src` it returns
**51 / 61** with **335** distinct names and **110** carrying `__` — the figures this paragraph used
to carry, exactly, which is how the method was checked. Note that the substring half never
reproduced the "92" it once sat beside: **that 92 matched no method tried here and has been dropped
rather than re-quoted**; the spread it was illustrating is real and is the point, but an
unreproducible bound is not evidence of it.

Pick a method, write it down, run it, quote both together. **17** test files assert a `__`-form
class that a `.css` file actually defines (12 before Phase 3, 13 before Phase 2) — that one is exact
under the method above and is the narrow reading; it is not the lane-sizing figure.

### 2d. Descendant-capable variants, by specificity

The decision-relevant fact about each is its **specificity**, because that is what decides whether a
consumer can override it. All measured from compiled output; all land in `@layer utilities`.

| Variant | Generated selector | Specificity | Verdict |
| --- | --- | --- | --- |
| `in-[…]` | `:where(.parent) .in-\[…\]\:x` | **(0,1,0)** | **House answer for parent-state-keyed child styling.** `:where()` zeroes the parent; the class lives on the child, so `cn(base, className)` applies there. No `group` class needed. |
| `*` | `:is(.x\:*>*)` | **(0,1,0)** | Direct children the component does not render. |
| `**` | `:is(.x\:** *)` | **(0,1,0)** | All descendants. |
| `not-[…]` | `.x:not(:disabled):hover` | (0,1,0) | Replaces the `:hover:not(…)` chains in Calendar/Pagination/Accordion. |
| `nth-[…]`, `first`, `odd`, … | `.x:nth-child(…)` | (0,1,0) | Structural position. |
| `[&::-webkit-slider-thumb]` | `.x::-webkit-slider-thumb` | (0,1,1) | Fine — no child element to class, so repeating the variant is natural, and it dedupes. All **18** vendor pseudo-element rules can move (see below). |
| `group-*` | `.x:is(:where(.group)[data-…] *)` | (0,2,0) | Works, but `in-[…]` is strictly better. |
| `[&_.child]:` | `.\[\&_\.child\]\:x .child` | **(0,2,0)** | **Banned.** A consumer's class on the child is (0,1,0) in the same layer and loses. Relocates the bug and makes it unreadable. |

These v4 variants all generate correctly and are available: `has-[…]`, `not-has-[…]`, `in-[…]`, `*`,
`**`, `before:`/`after:`, `backdrop:`, `starting:`, `placeholder:`, `marker:`, `selection:`, `file:`,
`rtl:`/`ltr:`, `motion-reduce:`, `forced-colors:`, `contrast-more:`, `pointer-coarse:`, `noscript:`,
`print:`, `supports-[…]`, `open:`, `inert:`, `autofill:`, `details-content:`, `@container`/`@md:`.

**Vendor pseudo-element rules: 18, not 21.** Method: count rule blocks (not selectors — `SearchInput`
groups two per block, twice) whose prelude contains `::-webkit-`, `::-moz-` or `::-ms-`, with
comments stripped so `Tabs.css`'s prose about the rules it deleted is not counted as rules.
**21 was correct when taken and is now anchored to a dead tree**: it reproduces exactly over
`git archive 81888c2^ src`, and Phase 1 deleted `Tabs.css`'s three scrollbar rules (§13). 18 is
stable across `81888c2`, `0a61e01` and HEAD, so nothing since Phase 1 has moved it. The selector
reading is 20 at HEAD and 23 at `81888c2^`; quote the rule reading, and say which.

```
grep -rn '::-webkit-\|::-moz-\|::-ms-' src --include=*.css | grep -c '{'   # 18
```

The `{` filter is what drops the seven selector-continuation and comment lines — including
`Tabs.css`'s three comment lines describing the rules Phase 1 deleted. Without it the same grep
returns 25.

**Genuinely immovable: only `@keyframes`** — 8 animation bodies (Sparkline ×2, AppShell ×2,
CommandPalette ×2, ProgressBar, Skeleton), and that count is unchanged since `81888c2^`. There is no
variant for a `@keyframes` block.

```
grep -rn '@keyframes' src --include=*.css | grep -c '{'    # 8 — the `{` discards the one comment hit
```

Two things are *judgement calls*, not impossibilities, and must be labelled as such: Timeline's
6-deep lazy derivation graph (`--_timeline-marker-radius` → `-line-offset` → `-gutter` → `-rail-x`),
kept in CSS because it is the component's layout contract and belongs in one readable place; and
Timeline's `:has()` pair, which moves fine once restructured (§4c).

**Container queries are available and unused, and adopting them is out of scope** — a behaviour
change, not a transposition. Record as follow-up.

---

## 3. Decisions

### 3a. ✔ DECIDED: focus rings are layered with everything else

**The decision.** Focus rings move into `@layer components` with the rest of this package's CSS.
There is no carve-out and no `!important`. A consumer's unlayered `*:focus{outline:none}` is allowed
to beat our ring: writing that reset is an opt-out of focus visibility, and the package does not
fight it with a precedence trick.

**One precedence regime, no exceptions to police** — which is the whole point of Phase 1, and the
reason the alternative (keeping ~29 declarations unlayered) was rejected despite being the safer
short-term move. The scale of what is being handed over:

```
grep -rn 'outline: 2px solid var(--C-BORDER-FOCUS)' src | wc -l      # 29 declarations
grep -rln 'outline: 2px solid var(--C-BORDER-FOCUS)' src | wc -l     # across 21 files
```

#### ⚠ What this decision does **not** cover

**It covers exactly one probe row: `switch-ring-vs-consumer-reset` — a *consumer-authored* reset
beating our ring.** The probe now records it as `accepted (owner decision)` with that scope written
into the row itself.

**It did not cover `radio-forced-colors-focus-outline`, and that row was fixed rather than
accepted.** It looked identical in the output (2px → 0px) and was a completely different mechanism:
the competitor was **our own `focus:outline-none` utility**, not a consumer's. `@layer components`
sits **below** `@layer utilities`, so our own utility deleted our own forced-colors outline — WCAG
2.4.7 for high-contrast users, caused entirely in-package.

**The fix was to stop the two rules competing, not to rank one over the other.**
`focusOutlineResetControl` (`src/util/focus.ts`) is now `not-forced-colors:focus:outline-none`, so
the reset stands down in the one mode where the outline is the only affordance left. No `!important`,
no carve-out — and it closed the same gap for the six other controls sharing the recipe, which had no
forced-colours indicator at all. `Radio.css` states the whole thing at source; find it by content,
not by line number:

```
grep -n 'Nothing competes with this rule' src/components/form/Radio.css
grep -n 'not-forced-colors' src/util/focus.ts
```

> **Two rows, same numbers, opposite dispositions.** A reader taking "focus rings are layered, the
> consumer wins, accepted" and stopping there would have left Radio broken. The distinction is the
> mechanism, not the measurement — `memory/gates.md` carries it as a lesson.

#### Consequences, all discharged

1. **Recorded in `AGENTS.md`** with its reason, under *"Decision: focus rings are layered, and a
   consumer's reset may win"* — status flipped from "decided, not yet in effect" to **in effect**.
2. **The gate needed extending, and has been.** The probe's only pass state used to be
   `before === after`, which would have left this row red for ever and made "probe green"
   unsatisfiable. It now supports `expectAfter` + `accepted`, with two guards that refuse to run:
   an `expectAfter` without a stated `accepted` reason, and an `expectAfter` equal to `expectBefore`.
   **An accepted row still fails if it drifts off its pinned value** — accepting a change is not
   excusing the row from measurement. Both guards were verified to exit non-zero.
3. **The focus-ring-width question is a separate follow-up** (§11, which carries the two
   reproducible sizings and drops the unreproducible "~76") and must not be merged into this one. A
   focus-ring width and a rule stroke are different concepts sharing a literal.
4. **`verify:focus-affordance` cannot see any of this.** It checks *source pairing* — a reset implies
   a replacement — so it stays green while the replacement stops painting. Do not add a focus-ring
   assertion to it and believe the ring is covered.

   **Measured counter-case, and it inverts the shape of the warning.** The guard *did* need
   extending — not with a focus assertion, but with a **variant it could no longer parse**. The
   `Radio` fix made `focusOutlineResetControl` read `not-forced-colors:focus:outline-none`, and
   `STATE_NEUTRAL_VARIANT` did not list `not-forced-colors`, so the guard stopped recognising the
   string as a reset at all and silently dropped all seven `focusRingControl` sites out of coverage.
   Un-widen it and measure:

   ```
   node scripts/verify-focus-affordance.mjs                       # OK — 18 focusable control(s) … exit 0
   # delete `forced-colors|not-forced-colors` from STATE_NEUTRAL_VARIANT, then:
   node scripts/verify-focus-affordance.mjs                       # OK — 11 focusable control(s) … exit 0
   ```

   **Green and blind, not red.** The exit code is 0 both times; the only signal is the coverage count
   in the headline, and only if you compare it against the run before. So the rule is not "never
   touch this guard" — it is: **a guard's summary line is evidence only against its previous value,
   and after widening a guard's vocabulary you make it fail on purpose *through the widened path*.**
   `memory/gates.md` carries it as a lesson.

### 3b. ✔ DECIDED and DONE: `--masonry-gap` is deleted, the gap is utilities

**Shipped.** `gap?: string` → `gap?: Gap` (`"r1"…"r6"`, default `"r4"`), from the same
`layout/shared.ts` every other grid uses. The root carries `gapMap[gap]`; each item carries
`blockGapMap[gap]` + `last:mb-0`, passed down through the Context `MasonryGrid` already had.
`--masonry-gap` no longer exists.

`MasonryGrid.css` went 83 → 81 lines and 25 → **22 declarations**, and that residue is what Phase 2
then deleted outright. **Enumerated rather than counted, because two summaries of it disagreed:**

```
git show 81888c2:src/components/ui/MasonryGrid.css | grep -c -- '--masonry-columns:'   # 20
```

**20** rules defining `--masonry-columns` (4 counts × 5 breakpoints), **1** `columns:
var(--masonry-columns, 1)` reading it on `.masonry-grid`, and **1** `break-inside: avoid` on
`.masonry-grid__item`. 20 + 1 + 1 = 22. **"21 column-scale declarations" and "`--masonry-columns` is
20 rules" (§4c) are the same measurement counted two ways** — 21 folds the read in with the 20
writes; 20 counts only the writes. Neither is wrong and the pair is unreadable, so the split above
is the one this document states.

**Why one prop had to become two utilities on two elements.** CSS multi-column has **no row-gap**
between items in a column, so the block-direction half of a "gap" is a `margin-bottom` on the child.
That is what `--masonry-gap` was really doing: one token feeding two properties across two elements.

**Verified, not assumed:**

- `gap-r4` → `gap: var(--R-SIZE-4)` and `mb-r4` → `margin-bottom: var(--R-SIZE-4)`, compiled against
  the real token chain — **byte-identical to the defaults they replaced**
  (`var(--masonry-gap, var(--R-SIZE-4))`), and still responsive, since `--spacing-r4` *is*
  `var(--R-SIZE-4)`.
- `last:mb-0` generates `.last\:mb-0:last-child` at **(0,1,1)** against the block gap's **(0,1,0)**,
  both in `@layer utilities` — so the trailing-gap reset wins on specificity. **This needed no Phase 1
  dependency**, because it *deletes* the unlayered competitor instead of layering it. The CSS comment
  claiming the reset "has to live here" was true only while `.masonry-grid__item` was unlayered.
- The bounded union caught all four raw-length call sites at compile time (2 examples, 2 tests) — loud,
  not silent.

**Breaking, and what breaks:** a consumer passing a raw length (`gap="1rem"`) now gets a type error,
and one setting `--masonry-gap` through `style` loses that channel. Both were off-ethos anyway — the
docs' own examples were passing raw `rem` values. The replacement is strictly better: `gap` takes
tokens, and **either half is independently overridable from the call site** (`className="gap-r1"` on
the root, `className="mb-r1"` on an item), which a single custom property could never offer.

> **This is where §4c's token rule comes from — the rule lives there, not here.** "Parent sets, child
> reads" is *not* on its own a reason to keep a token. `--masonry-gap` fails §4c because the
> **component** was its only writer: `MasonryGrid` renders both elements *and* takes a `gap` prop, so
> the value already had a channel and the token was pure indirection. Read §4c for the rule; this
> section is only the worked example that produced it. Do **not** restate it here as "the same
> component renders both elements" — that reading deletes `--timeline-highlight-fill`, which
> `TimelineItem` also renders both ends of (`grep -n 'timeline-icon\\|timeline-dot\\|timeline-card' src/components/ui/Timeline.tsx`) and which stays.

---

## 4. Decisions already made

### 4a. The slot API: a separate `classNames` prop

```ts
export type SlotClassNames<S extends string> = Partial<Record<S, string>>;
```

**Not an overloaded `className`**, for three measured reasons:

1. **`className` accepting an object already means something.** `cn({"border-0": true})` is the
   clsx conditional-object form. Two object semantics in one prop means
   `className={{"border-0": isActive}}`, written from habit, becomes a silently-ignored slot named
   `border-0`. No type error, no warning.
2. **It fights an existing gate.** Components type props as `ComponentPropsWithRef<…>` where
   `className: string`. Overloading needs `Omit<…, "className">` broadly, and
   `scripts/verify-omit-discipline.mjs` exists precisely because `Omit` is compile-time-only and
   leaks through spreads.
3. **Autocomplete.** Tailwind IntelliSense and `prettier-plugin-tailwindcss` detect `className="…"`
   and `cn(…)`. `classNames` is the established name (MUI, Mantine, HeadlessUI) so community editor
   configs already cover it; an object under `className` is a bespoke shape nothing knows.

Also: **no `$` prefix** (the keys are already in their own namespace), **no `slots`** as a name (it
means content slots in react-aria and component substitution in MUI), and **no
`extractSlotClassNames` helper** — a per-component inline type gives slot-name autocomplete and
makes a typo a *type error* rather than a silent no-op.

**Rules:**

- **No `classNames.root`.** `className` is the root, full stop. Two writers for one element is
  `CLAUDE.md` rule 3.
- **`classNames` carries class strings only.** Keep the existing `<thing>Props` hatch where a caller
  needs handlers or `aria-*`. A general `slotProps` invites consumers to wire `onClick` into
  internals and couple hard to the element tree.
- **Prefer a token over a slot.** If the override is a *value*, expose a token the consumer sets
  inline (`[--stepper-progress-color:…]`). Add a slot only when the consumer must change **which
  utilities apply** — display, flex-direction, or a property the component never declared.
  - **Expose the pair, not the fill.** A fill token guarantees contrast only against its paired
    `on-*` ink. A fill hook without its ink hook invites a caller to set one and inherit a glyph
    colour chosen for a different background. Expose both; document that they move together.
  - **Keep the non-colour part of a cue private.** If an emphasis cue is a colour *and* a width and
    both are overridable, a caller can reduce it to colour alone and reintroduce the colour-only
    defect the width existed to prevent.

#### `<thing>Props` is the two-level answer

`classNames` reaches elements **this** component renders. When the target is **another component**,
the shipped pattern is a props hatch: library base class first, caller's last.

```tsx
cn("code-block-copy", copyButtonProps?.className)   // the correct form
// grep -n 'code-block-copy' src/components/ui/CodeBlock.tsx   (cited as :22,76 — both rotted)
```

`grep -n viewAllProps src/components/ui/Swimlane.tsx` (cited as `:57`) and `Table.tsx:70`
(`tableProps`) match. **`grep -n imgProps src/components/ui/Spotlight.tsx` (cited as `:111`) does
not** — it spreads `imgProps` onto an `<img>` that carries no library class and performs no `cn()`
merge.

> **Settled as the carve-out, and it is no longer an exception.** "No library class ⇒ raw spread is
> fine" is the rule, stated in `SLOT-VOCABULARY.md` §13.1, and the prop's docblock must say so.
> **Five hatches now spread class-free** — `Spotlight.imgProps`, `TagInput.badgeProps`,
> `DataTable.paginationProps`, `Repeater.itemActionProps` and `Repeater.addButtonProps`. The
> denominator is method-dependent, so state which: **9 distinct hatch names across 13 declaration
> sites** (`imgProps` is declared by three components, `tableProps` by three).
>
> ```
> grep -rhoE '\b[a-zA-Z]+Props\?:' src/components --include=*.tsx | grep -v '\.test\.' | sort -u | wc -l   # 9
> grep -rnE  '\b[a-zA-Z]+Props\?:' src/components --include=*.tsx | grep -v '\.test\.\|\.examples\.' | wc -l  # 13
> ```
> The framing "three plus an exception" was wrong even when written: `paginationProps` was already
> class-free and uncounted. **Adding a base class purely so there is something to merge with is the
> wrong repair** — that is §13.1's correction, and it applies to roots as much as to hatches.

Worst uncovered cases, all needing a hatch rather than a slot: `DataTable` → `Table` (its root is a
bare classless `<div>` and `DataTableProps` has no `className` at all), `VirtualizedDataTable`
(hardcodes both `className` and an inline `style`), `DataTable` → `Pagination` → `IconButton` (three
levels), and `TagInput` → `Badge` (the chips carry no hook whatsoever).

#### Why `memory/affordances.md` rejects this API, and why that is not a contradiction

That file says of this exact design that a `classNames={{…}}` object *"is an API that only looks like
it works here"*, because the component CSS is unlayered and so `bg-*` and `border-*` *"land in the
DOM, change nothing, and report no error."*

**It was right, and its premise is precisely the fact Phase 1 deleted.** The objection did not
dissolve because it was mistaken — it dissolved when the CSS moved into `@layer components`. **That
has now happened, so `classNames` is a valid API and Phase 3 is unblocked.** Leave the note in
`memory/affordances.md` standing with its premise named: it is a correct account of what the API is
worth *when the component CSS is unlayered*, which is the state any future package here starts in.

### 4b. The house rule

- **`className` → the outermost element the component renders.** Uncontroversial. The two worked
  cases, both cited by line number originally and both repointed by content:
  - `DatePicker` applied `className` raw, with no `cn()`, so that element had no base class
    (`DatePicker.tsx:280`). **Fixed** — `grep -n 'cn(className)' src/components/form/DatePicker.tsx`
    now lands on the root with the reason written beside it.
  - `TagInput`'s return opened on a bare `<div>` receiving *nothing*, so the true outermost element
    was both unstyled and unreachable (cited as `TagInput.tsx:378`). **✔ FIXED — owner ruled, and it
    was breaking.** `className` now lands there (`grep -n 'cn(className)' src/components/form/TagInput.tsx`)
    and the bordered field box is `classNames.control`, the same word `Select`, `NumberInput`,
    `DatePicker` and `MultiSelect` already spend on that element. **The migration is silent**:
    `className` and `classNames.control` are both valid props with valid types, so a string aimed at
    the frame simply stops painting — grep `<TagInput` rather than trusting the compiler. `...props`,
    `ref` and the `id` did **not** move; they stay on the `<input>` for the reasons below.
- **`...props` → the focusable control. Unchanged from today.** Do not move a11y-bearing attributes
  to satisfy symmetry.
- **The layout box gets `classNames.control`** (and `wrapperProps` if it needs more than classes).

**Why the symmetric version was withdrawn.** Measured in this repo's own jsdom:

- `<Label htmlFor="x">` + `<div id="x"><input/></div>` → `getByLabelText` **throws**. `<label for>`
  binds only to labelable elements. `docs/components/date-picker.md` alone ships ten
  `<Label htmlFor>` + `<DatePicker id>` pairs.
- `div.focus()` leaves `activeElement` unchanged, so **`focusFirstError()`
  (`form-store.ts:362-369`) becomes a silent no-op** after a failed submit. WCAG 2.4.3 / 3.3.1. The
  causal link is the **`ref`**, not the `id`: the registry is keyed by `field()`'s `ref` callback
  (`use-form.tsx:197`), and `ref`/`id`/`...props` travel together.
- `field()` returns exactly seven keys and **no `id`** — `name`, `value`, `onChange`, `onBlur`,
  `ref`, `aria-invalid`, `disabled` (`grep -n 'const field = useCallback' -A14 src/components/form/use-form.tsx`;
  cited as `:205-217`). The control's `id` is 100%
  consumer-supplied and on three of four components it travels via `...props`.
- An `inputProps` hatch does **not** restore `mergeProps` (a plain spread re-introduces the
  documented `aria-invalid: undefined` erasure bug) or `SearchInput`'s named guard, which keys off
  `id !== undefined` *"because a default name outranks an associated `<label for>`."*

`DateRangePicker` puts `ref`, `className` and `...props` all on the outermost element — but it
**does not generalise**: it has two focusable inputs and therefore no single control, a constraint
the others lack. `ColorPicker` documents the split deliberately and is a written refutation of the
symmetric reading, not evidence for it. Both anchors (`DateRangePicker.tsx:316`,
`ColorPicker.tsx:228-239`) rotted in Phase 3; find them by content —
`grep -n '{\.\.\.props}' src/components/form/DateRangePicker.tsx` (one hit — `ref`, `className` and
the rest on one `<div>`) and `grep -n 'Rest props go to the trigger' src/components/form/ColorPicker.tsx`,
which is the comment that documents the split.

### 4c. The token rule

> **Ask who writes the token, not how many times it is read.**
>
> **Delete** it when the **component is the only writer**: its definition is a bare baseline token,
> and every element that reads it is one this component renders. It renders them, so it can put the
> utility on each one — the token is buying nothing but indirection. Skip the middle man:
> `--stat-card-gap: var(--R-SIZE-5)` then `gap: var(--stat-card-gap)` is `gap-r5`.
>
> **Keep** it when it is a **consumer write channel** — one write by the caller has to reach elements
> the caller cannot put a class on, and no prop already carries the value — **or** when a `calc()`
> reads it, because there is no property there for a utility to set.

**This applies forward, not just to the list below.** Do not author a new component-scoped custom
property whose definition is a bare baseline token and whose only readers are elements the component
itself renders. That is the `--masonry-gap` shape (§3b), and it is cheaper to not write than to
delete. The same question decides both cases, so ask it at the point of writing.

**"Single-use alias" was the previous wording, and use-count is not the discriminator.** It spares
`--masonry-gap` (1 def / 2 uses), which §3b deleted, and it deletes `--calendar-month-gap` (1 def /
2 uses), which the rule above keeps. §13 carries the row.

**Delete — component is the only writer, and every read is a property a utility can set.** Each is
1 def / 1 use, verified individually rather than counted:

```
grep -rn -- '--_activity-feed-gutter\|--_activity-feed-gap\|--_timeline-date-gap\|--MEDIA-CAROUSEL-GAP' src
```

| Token | Sole read | Becomes |
| --- | --- | --- |
| `--_activity-feed-gutter` | `ActivityFeed.css` — the `column-gap` on `.activity-feed-item` | `gap-x-r5` |
| `--_activity-feed-gap` | `ActivityFeed.css` — the `padding-bottom` on the same rule | `pb-r3` |
| `--_timeline-date-gap` | `Timeline.css` — the `margin-bottom` on `.timeline-date` | `mb-r6` |
| `--MEDIA-CAROUSEL-GAP` | `Carousel.css:26` — `gap` | `gap-r5` |

(`--spacing-r1`…`-r6` bridge the scale, so every `r*` utility above resolves to the same
`var(--R-SIZE-n)` the token held: `grep -n -- '--spacing-r' ../response-ui-css/src/responsive/spacing.css`
— six lines, cited as `:30-37` before the foundation file shifted.)

**`--MEDIA-CAROUSEL-GAP` needs its own justification, because it looks like a keep and is not.** It
is SCREAMING_CASE, it lives in `tokens.css`, and `grep -n 'MEDIA-CAROUSEL-GAP' docs/components/carousel.md`
(two lines — the token table row and the tuning paragraph; `:199,212` before Phase 3 grew the page)
documents it to consumers as a theme token — three signals that say "consumer write channel". It fails anyway, on
the part of the test that matters: the element reading it is **directly addressable**.
`Carousel.Track` is a compound subcomponent that merges an incoming class
(`grep -n 'cn("carousel-track", className)' src/components/ui/Carousel.tsx`; cited as
`Carousel.tsx:338`, now `:357`), so the caller already writes
`<Carousel.Track className="gap-r3">` and needs no token to reach it. **That route works now** —
before Phase 1 the unlayered `.carousel-track` beat the utility, which is why this was blocked; it is
not any more, so the only thing still holding it is that deleting the token is Phase 3/4 work.
Deleting it edits those two doc lines; per-component contract item 8, answer the prose, do not
delete it.

**Keep — consumer channels, `calc()` inputs, and computed values.** Several of these *are* baseline
aliases; that is why the alias test had to go.

- **`calc()` inputs — `--_stepper-gap`, `--calendar-col-gap`, `--calendar-month-gap`.** A value read
  by a `calc()` has no property to convert to, so deleting it inlines the baseline `var()` at each
  call site and the shared value stops being shared.
  - `--_stepper-gap` — 1 def / 2 uses, both in the connector-inset calc (`Stepper.css:242,243`).
  - `--calendar-col-gap` — 1 def / 1 use, and that use is **inside `--calendar-month-width`'s calc**.
    It is never applied as a `column-gap` anywhere, so there was never a utility to convert it to.
    The file is `CalendarBase.css` now (§5 renamed it); find both by content, not by the `Calendar.css:19,22`
    this used to cite: `grep -n -- '--calendar-col-gap' src/components/ui/CalendarBase.css`.
  - `--calendar-month-gap` — 1 def / 2 uses, **split across both kinds**: the `--calendar-ideal-width`
    calc and a real `gap` property. **A token with even one `calc()` reader is not convertible
    piecemeal** — writing `gap-r4` at the `gap` while the calc keeps reading the token forks one
    value into two sources, which is `CLAUDE.md` rule 3. Convert both or neither.
    `grep -n -- '--calendar-month-gap' src/components/ui/CalendarBase.css` prints the def and both
    reads; the `Calendar.css:27` / `:111` this used to cite are gone with the filename.
- `--_timeline-card-padding`, `--_timeline-item-gap` — **3 defs each, 1 use each.** These are the
  **density axis**: three values selected by `[data-density]` on the root, applied to a descendant.
  Convertible via `in-[[data-density=dense]]:p-r5` but that is 6 variant-scoped classes, not "use
  the baseline utility." Keep, or convert deliberately with the cost stated.
- **Computed:** the Timeline derivation chain, `--_stepper-active-line-width` (`calc(× 1.5)`),
  `--calendar-month-width`/`-ideal-width` (`--calendar-months` is set by JS),
  `--_table-marker-side` (gradient flipped by `:dir(rtl)`, and shared by the selected row and the expanded detail row).

  > **"Computed" is not the discriminator — *where it is read* is.** This bucket lost two entries
  > that only looked computed. The keep clause spares a token *"because there is no property there
  > for a utility to set"*, i.e. one consumed **inside another custom property's definition**.
  > `--progress-bar-fill-end`'s only read was inside `background-image` — a property, and a utility
  > can take the whole declaration, `color-mix()` and all — so it was **deleted**, not kept.
  > `--sparkline-color` was deleted too: every read already carried an identical
  > `var(…, currentColor)` fallback, so the declaration was pure shadowing. Ask what property the
  > read sits in; do not stop at "it has a `calc()` or a `color-mix()` in it."

  **`--stagger-delay` is no longer on this list, and the reason is instructive.** It was kept for
  *"`inherit` as a mechanism"* — `Stagger.css` declared `--stagger-delay: inherit` so an ancestor's
  value could reach `animation-delay`. That declaration won only because this package was unlayered;
  from `@layer components` it lost to the foundation's own `.stagger-item`, and the mechanism died.
  It was **deleted, not defended**: `Stagger.tsx` writes a private `--_stagger-step` on the
  container, whose value is the reference `var(--stagger-delay, var(--MOTION-STAGGER-DELAY))`, and
  each item carries an inline `--stagger-delay: var(--_stagger-step)`. `Stagger.css` no longer
  exists. **The token survives as a consumer write channel; what died was the `inherit` trick.** A
  mechanism that depends on a precedence accident is not a mechanism, and this is the worked example
  (`memory/README.md` §22).

  ```
  grep -rn -- '--_stagger-step' src/components/animation/Stagger.tsx
  ```
- **Consumer write channels:** `--timeline-highlight-fill`/`-ink`/`-border`,
  `--activity-feed-highlight-fill`/`-ink`, `--stepper-progress-color`, and now `--stagger-delay`
  (above). The **consumer** writes once, on the root or an item, and the value reaches internals the
  consumer has no way to put a class on — `--timeline-highlight-fill` 1 def / 2 reads,
  `--activity-feed-highlight-fill` 1 def / 2 reads, `--stepper-progress-color` 1 def / 3 reads. No
  prop carries any of them.

  **The discriminator is who writes it, not who renders it.** These components *do* render the
  elements that read these tokens — `TimelineItem` renders `.timeline-dot`/`.timeline-icon`/
  `.timeline-card` itself (`grep -n 'timeline-icon\\|timeline-dot\\|timeline-card' src/components/ui/Timeline.tsx`). Rendering them would let the component apply its
  own default as a utility; it would not give the **caller** one write that lands on all of them. A
  per-element slot cannot do that either — it is N writes, and the caller has to know the anatomy.

  **✔ Their comments are rewritten — this item is discharged, and §13 carries the outcome.** Four
  sites, not three, and the fourth was never on this list: `Timeline.css`, `Timeline.tsx`,
  `ActivityFeed.css` and `ActivityFeed.tsx`. **`Stepper.css` needed no change** — it never made the
  layering claim; it says *"override per instance to re-skin the track"*, and the false sentence
  lived in the two files that *cite* `--stepper-progress-color` as sharing their contract. The two
  `.tsx` sites are JSDoc on public props, so they ship to consumers through the generated `.d.ts`,
  which is why a prose error there is worse than one in a stylesheet.

  ```
  grep -rn 'only override route that works' src docs   # 0 — the claim is gone from all four
  ```
- **Domain token layer:** `tokens.css` is kept **for its semantic indirections and its `@theme
  inline` bridge** — not automatically for every line in it. `--C-TREND-UP: var(--C-STATUS-SUCCESS)`
  is a semantic indirection (a trend is not a status); `--MEDIA-CAROUSEL-GAP` living there does not
  exempt it from the delete rule.

**✔ DONE in Phase 2 — deleted, because they reimplemented a native Tailwind scale.**
`--masonry-columns` → `columns-*`; `--rui-grid-columns` → `grid-cols-*`. Both tokens are gone and so
are both stylesheets. What they were:

```
git show 81888c2:src/components/ui/MasonryGrid.css | grep -c -- '--masonry-columns:'    # 20
git show 81888c2:src/components/layout/Grid.css    | grep -c -- '--rui-grid-columns:'   # 30
grep -rn -- '--masonry-columns:\|--rui-grid-columns:' src                               # 0
```

**50 rules, and they were the single largest block of custom-property-only rules in the package** —
also a single-source-of-truth violation (`CLAUDE.md` rule 3), which is what made it the highest
value-to-risk change in the plan. The old sentence sized this as "50 of the 64 rules whose
declarations are exclusively custom properties"; the **50** reproduces exactly, the **64** does not
— the nearest method (innermost selector blocks, every declaration starting `--`) returns 63 at
`81888c2`, 13 at `0a61e01`, and **9** now. **The residual 9 is the number to carry forward, and 64 is
not to be re-quoted**: it is method-dependent, off by one under every method tried, and nothing
depends on it. (The residue fell 13 → 9 across Phase 3, which deleted `--progress-bar-fill`/`-fill-end`
and `--sparkline-color` and split the menus' custom-property block out of `DropdownMenu.css`.)

**The conversion cost more than a token swap, and §13 carries why.** Tailwind scans source text, so
the class names could not be built from a template literal; the table had to be written out, which
bounded the prop (`memory/README.md` §24). And a lookup table keyed on the caller's input silently
drops the `var(--…, 1)` default the stylesheet also carried — see §6 Phase 2.

**Timeline's `:has()` pair moves, and improves.** They currently depend on *authored source order* as
a tie-break, which utilities cannot reproduce — but `not-has-[…]` generates, so the pair restructures
into mutually exclusive conditions and the order dependence disappears. The file's own comment warns
"ORDER AND SPECIFICITY BOTH MATTER HERE." `memory/affordances.md` warns that equal-specificity
`:has()` rules relying on source order are **deliberate** and that "the next person simplifies the
'redundant' part and silently inverts the precedence." Restructuring **satisfies that intent** by
removing the tiebreak rather than relying on it — but the note must move with the code, not be
deleted as obsolete.

**Flag, don't fix: ~14 raw magic numbers.** Already tokens-ethos violations hiding inside CSS.
Inlining makes them **visible** (`w-[2rem]`), which is uncomfortable and correct — a reviewer must
not read it as the migration *introducing* raw values. `--_activity-feed-aside-width: 2rem`,
`--_activity-feed-icon-size: 1rem`, `--calendar-day-size: 2.25rem`, `--app-shell-navbar-height:
3.5rem`, `--_stepper-indicator-size: 2rem`, `--_timeline-dot-size: 0.875rem`,
`--_timeline-marker-size: 1.75rem`, `--_timeline-glyph-size: 1rem`, `--MEDIA-CAROUSEL-PEEK: 3rem`,
`--BUTTON-GAP-SM/MD/LG`, and `MediaCard.css`'s six raw `oklch(1 0 0…)` overrides of **contract**
tokens (`grep -c oklch src/components/ui/MediaCard.css` → 6; four are bare `oklch(1 0 0)` and two
carry an alpha, so a grep for the exact literal returns 4 and understates it). Every named token
above still exists with the value quoted — `grep -rn -- '--_activity-feed-aside-width\|--calendar-day-size\|--app-shell-navbar-height\|--_stepper-indicator-size\|--_timeline-dot-size\|--MEDIA-CAROUSEL-PEEK\|--BUTTON-GAP' src/tokens.css src/components`.
The **~14** is a flag, not a census: Timeline's three density steps redeclare dot/marker/glyph, so a
strict occurrence count is higher.

### 4d. Footguns — verified live instances

**Never write a themeable token default as an inline arbitrary property.** Custom properties resolve
per element, and a declaration on the element beats an inherited one from `:root` — *regardless of
cascade layer*.

```tsx
<div className="[--stat-card-gap:var(--R-SIZE-5)]">   // ✗ permanently un-themeable
```

A consumer's theme setting `--stat-card-gap` at `:root` now silently loses, forever. Arbitrary
properties are a **consumer-side** tool. Component-side, use them only for values genuinely derived
per instance **from a prop**. Themeable defaults stay in CSS at `:root` — or better, the component
writes `gap-r5` and exposes no token. **Test: if the inline value's inputs do not include a prop, it
is not a per-instance derivation and does not qualify.**

| Site | Mechanism | Effect |
| --- | --- | --- |
| `grep -n CHEVRON_SIZE src/components/form/NumberInput.tsx` — four hits: the module constant, the inline `style` that builds the padding from it, and the two chevron icons (cited as `:171-175` and `:44`; both rotted) | inline `style` custom property from `CHEVRON_SIZE`, a **module constant** | A frozen default wearing a computed value's clothes: unthemeable and un-overridable. Move the default to CSS, or write the padding as a utility. |
| `git show 0a61e01:src/components/ui/Skeleton.tsx \| sed -n '34p;44p'` (both props are deleted, so the live file has no anchor; the sha is the tree the citation `Skeleton.tsx:34,44` was taken at, where it is still exact) | inline `style` **geometry** — `width = "100%"` defaulted, `height` **not** defaulted | ✔ **FIXED.** Both props are **deleted**; geometry is `className`, with `w-full` in the class list so `cn()` collapses it against a caller's `w-*`. Height keeps `.skeleton { height: 1em }` in `@layer components` — deliberately, because making it a utility would out-rank `.skeleton--circular { height: auto }` and break circles. So the two axes reach `className` by different mechanisms (class-list collapse vs layer precedence) and the *contract* is finally uniform. `style` still wins, as the hatch for a runtime-computed value. |
| `git show fadcd60:src/components/ui/ProgressBar.css \| sed -n '35,37p'` (the pair is deleted, so the live file has no anchor; the sha is the one the measurement below was taken at) | declared `--progress-bar-fill`/`-fill-end` **on `.progress-bar__fill`** | ✔ **FIXED — but not the way this row said.** "Move to `.progress-bar`" **could never have worked**, and the row gave the reason one clause earlier without following it: all four colour modifiers redeclare the pair on the reading element and `color` defaults to `"accent"`, so *every* instance overwrote the relocated base. Measured: at `fadcd60` a consumer setting the pair at `:root` got the unchanged default — **the documented override route was already dead**. Both tokens are now **deleted** and the fill colour is a `bg-*` utility, which *reads* the theme var instead of shadowing it. §13 carries the refutation. |
| `grep -n 'DELIBERATELY NOT declared here' src/components/data-display/Sparkline.css` — the comment that replaced the declaration says what it was and why it must not come back (cited as `Sparkline.css:10-13`) | declared `--sparkline-color` on `.sparkline` | ✔ **FIXED in Phase 3** by deleting the declaration — every read already carried an identical `var(…, currentColor)` fallback, so it is byte-identical where nothing sets the property and now reachable from a theme. **Check this row's shape before trusting any other "move the declaration up" fix**: it worked here only because *nothing else redeclared it*. Where a variant or a prop-driven modifier redeclares on the reading element, relocation is a no-op — see the `ProgressBar` row above, which is the same prescription and was refuted. |

**Fade timing on floating surfaces is unreachable by `className` at all.**
`grep -n 'cannot be supplied from CSS' src/components/ui/floating-motion.ts` (cited as `:9-16`)
documents it at source: `useTransitionStyles` writes `transition-duration` **inline**, and *"the
value cannot be supplied from CSS while that hook owns it."* A `transition-*` or `duration-*` utility
added to such a panel — by `className`, by `classNames`, or inlined from CSS — is **silently dead**.
Fade tempo is reachable only through `--MOTION-DURATION-*`. **Four importers now** — `Popover`,
`HoverCard`, `menu-internals` (both menus inherit it, so one edit point covers them) and, since
Phase 3, `Tooltip`. Re-derive rather than trust the count:

```
grep -rln 'floating-motion' src --include=*.tsx --include=*.ts | grep -v '\.test\.'
```

> **`Tooltip` was the fourth, and it was the interesting one.** It did *not* import the hook — it
> passed a literal `duration: 150` to `useTransitionStyles`, so its tempo ignored
> `--MOTION-DURATION-*` entirely while every other floating surface read it. The count "three, not
> four" was true and was also the tell: the file the reader would expect to be there was the one
> component whose fade a theme could not reach. **A count that excludes something is worth asking
> *why* about, not just recording.** Fixed, and pinned by `Tooltip.test.tsx`'s `fade timing` block.

**`grep -n 'size-full' src/components/ui/AvatarUpload.tsx`** (cited as `:267`) renders the inner
`<Avatar size={size}>` with `size-full` in its class list, and `cn("size-16","size-full")` →
`size-full`, so tailwind-merge drops the class `size` mapped to. The accurate finding is narrow:
**one redundant utility, no visual consequence.** `size` still drives
`initialsTextMap` (`grep -n 'initialsTextMap' src/components/ui/Avatar.tsx`; cited as
`Avatar.tsx:24-31`), and `AvatarUpload`'s own `containerSizeMap` is
value-identical, so the geometry is unchanged. **A lane told "the `size` prop is dead" would delete
it and break initials sizing.**

---

## 5. Triage — not every gap is slot-shaped

Each verified gap resolves to **one of six**, and a lane must say which before writing code.

| | Resolution | Tell |
| --- | --- | --- |
| **a** | Not a gap | No caller `className` can reach that element, and the value is not something a consumer would vary. A bare static class here is correct. |
| **b** | Token | The override is a *value*. Expose `--component-*`, set inline by the consumer. |
| **c** | Slot | The consumer must change *which utilities apply* on an element this component renders. |
| **d** | Compound subcomponent | The element has independent identity a consumer would address by name, **and** it has *no* override path at all. |
| **e** | Render prop | The element is **loop-generated**, so no name can address one instance — and what the consumer wants is different *content*, not a different class. |
| **f** | Just `className` | The component renders **one** element and it has no `className` prop at all. §4b's house rule already answers it: add `className` and merge it on that element. No slot, no compound, no rest spread. |

**(f) was missing, and its absence pushed a lane toward (d).** `Tooltip` is the worked case: 1 class literal, all 10 `Tooltip.css` declarations unreachable, and a passed `className` was a **TypeScript error** because the props type is closed. Under a five-way table the only bucket that fits "the element has independent identity and no override path" is (d) — which prescribes a compound rewrite for a component that renders a single `<div>`. The right answer was the cheapest one: give it `className`. Ask (f) before (d), always: **a missing prop is not a missing subcomponent.**

**Apply the loop test first.** Are the internals loop-generated? If yes, (d) is *structurally
impossible* — no compound API can name "the 15th cell" — and the answer is **(e)**.

**▲ ONE-WAY DOOR: classify before coding.** High slot count means the element tree *is* the API, but
the resolution may be (d), (e), or a mix. **`CalendarBase` is the worked case, and it settled as
15 × (c) + 1 × (e) — not a compound.** The anatomy, re-derived; the `.tsx` and `.css` name sets are
identical, which is what makes either command sufficient:

```
grep -oE '\.calendar[a-zA-Z-]*' src/components/ui/CalendarBase.css | sort -u      # 17 names
```

**17 names on 16 non-root names on 15 non-root elements** — one element carries two
(`"calendar-label calendar-label-button"`), which is the whole of the old 16-vs-15 discrepancy.
Three cardinalities, enumerated rather than counted:

- **Once per calendar (6):** `-header`, `-label-button`, `-months`, `-footer`, `-today-button`,
  `-picker-grid`.
- **Per month grid (4):** `-month`, `-month-caption`, `-grid`, `-weekdays`. A real third case —
  `renderMonthGrid` runs once per *visible month*, caller-controlled and 1 by default, forced to 1
  below `40rem`.
- **Per loop iteration (5):** `-picker-cell` (12/picker), `-weekday` (7/month), `-week` (6/month),
  `-cell` and `-day` (42/month each).

**Every one of the 15 keys is merged *inside* its map, from one `classNames?.<key>` read.** No index,
no predicate, no per-date map. So nothing in the shipped API addresses one instance — the thing the
loop test forbids — and the repeated-element keys are exactly the *applied-to-every-instance* case
this section already allows.

> **What the earlier "6 slots + 3 + `renderDay`, not 15" prediction got wrong — and it was not the
> count.** Its *category* held completely. It failed on **what `renderDay` can reach**: the prop is
> invoked in the **children position of the day button** (`grep -n 'renderDay ? renderDay' src/components/ui/CalendarBase.tsx`),
> so it renders that button's contents and nothing else. It cannot reach `-weekday`, `-week`,
> `-cell`, `-month`, `-month-caption`, `-grid`, `-weekdays` or `-picker-cell` — eight of the nine
> elements the prediction assigned to it, one of which is not even in a day grid. A weekday header is
> not a day. **So the prescription routed at most 9 of 15 elements and left six with no override path
> at all**, which is this section's own definition of a gap: it would have manufactured the (d)
> pressure it was written to relieve. The census errors that produced it are in §13.

**Sibling asymmetry is a LEAD, not proof.** `memory/affordances.md`: which element a caller's
`className` addresses is a **per-component** answer, and a non-compound component whose sibling is
compound will look asymmetric for a legitimate reason — the compound sibling's caller addresses the
inner element directly through a sub-component. So the tell needs a second test: **does the element
have *no* override path, or merely a *different* one?** Only the first is a (d). Cheap disproof:
render with a caller class and read the class list. If it landed on the root, the real question is
whether the inner element has any route — a different finding with a different owner. **Check the
component's own doc first**; for `MultiSelect` it already states where `className` lands.

Two hard constraints found at source, both of which a lane would otherwise break:

- **`.calendar-picker-cell` and `.calendar-day` are `querySelector` targets** driving focus
  management, plus a third query keyed on `[data-day]`. These are *behavioural markers*: append to
  them, never replace them. All three anchors (`CalendarBase.tsx:174`, `:366`, `:348`) rotted in
  Phase 3 — `grep -n 'querySelector' src/components/ui/CalendarBase.tsx` returns exactly the three.
- **`Calendar.css` had no owning component, and the rename shipped.** It styled `CalendarBase`'s
  markup entirely while only `src/styles.css` imported it — neither `Calendar.tsx` nor
  `RangeCalendar.tsx` did. It is `CalendarBase.css` now: `grep -n Calendar src/styles.css` returns
  the one `CalendarBase.css` import. **Every citation into `Calendar.css` anywhere in this document
  has been repointed by content, never by adjusting the line number** (§13's last row).

**`FileUpload` is a (d), but not as 27 slots.** **27** is the count of `file-upload__*` element
classes it emits — `grep -oE '"file-upload__[a-zA-Z-]*"' src/components/ui/FileUpload.tsx | sort -u | wc -l`,
unchanged at `0a61e01` (the root and the six `--` state modifiers are excluded, which is what
distinguishes it from the 34 distinct literals in the file). Its internals mostly live inside
**three already-separate private components** — `MediaPreviewLarge`, `MediaPreviewGrid`,
`FilePreviewItem` (`grep -n 'function MediaPreview\|function FilePreviewItem' src/components/ui/FileUpload.tsx`;
cited as `:220`, `:285`, `:344`, all taken at `0a61e01` and all rotted) — selected by internal
`previewMode`/MIME logic (`grep -n previewMode src/components/ui/FileUpload.tsx`; cited as `:489-500`,
dispatched `:655`/`:670`/`:688`) that the consumer cannot predict. A flat 27-key map would be a window onto
three element trees that may not even render. Right design: export those three (or take
`renderPreview`/`renderFile`), **plus** small slots for the dropzone chrome the root always renders,
**plus** keep the root state modifiers as `data-*` so consumers write `data-drag-over:*` variants.

### ▲ ONE-WAY DOOR: triage (d) candidates, each with its proving sibling

| Component | Internals | Proved by |
| --- | --- | --- |
| `MultiSelect` | 10 | **✔ ruled (d) by the owner.** `Combobox` does **not** prove it — see below. The shape that does is in `SLOT-VOCABULARY.md` §10.1 |
| `ColorPicker` | 12 (largest in `form/`) | `Combobox` — trigger+panel is compound-shaped |
| `CommandPalette` | 10 + a `renderOption` closure a consumer could not replace (`git show 0a61e01:src/components/ui/CommandPalette.tsx \| sed -n '338p'`; the closure is gone — the ruling below shipped and `CommandPalette.Item` replaced it) | **✔ ruled (d) by the owner**, for consistency of one anatomy under one mechanism. `DropdownMenu` exposes `Trigger`/`Content`/`Item`/`Divider`/`GroupHeader` for *the same anatomy*, from JSX instead of an array — and `Trigger` is the piece `CommandPalette` most conspicuously lacks |
| `Tooltip` | 1 literal, and at `0a61e01` all **10** `Tooltip.css` declarations were unreachable (`git show 0a61e01:src/components/ui/Tooltip.css`). The file is **24** declarations now, because owner ruling 4's opt-in arrow landed there | `Popover` — identical hook, portal and fade, with the API present |
| `Repeater` | 5, per-row identity | `Combobox.Item`; also needs a `ref`/rest channel regardless |

**The `Internals` column needed a method and did not have one.** It is now: distinct class names in
the component's sibling stylesheet, **excluding the root and the `--` state modifiers** —
`grep -oE '\.multiselect[a-zA-Z_-]*' src/components/form/MultiSelect.css | sort -u`, and the same
shape per component. That reproduces `MultiSelect`'s **10** exactly, which is why it is the method
stated; under it `ColorPicker` is **12** (not 13) and `CommandPalette` is **10** (not 11), and both
have been corrected above. `Repeater`'s 5 is a different unit — it has no stylesheet, so it is
`grep -c 'className={' src/components/form/Repeater.tsx`. **Say which unit a lane-sizing count is
in**; these two are not comparable.

**`Combobox` was the wrong proving sibling for `MultiSelect`, and the correction changes what a lane
builds.** The subcomponents exist, but `ComboboxRootProps` has **no required data prop at all** — it
is eleven optional props plus `children`, and its option data exists only as registrations from its
own children:

```
sed -n '93,106p' src/components/form/Combobox.tsx        # 11 optional props + children
```

So the sibling proves a listbox compound is **achievable**; it proves nothing about coexisting with a
required `options` prop, which was the entire difficulty. A lane that copies `Combobox` inherits a
design with no answer for the filter, the chip labels or the cap. **`SLOT-VOCABULARY.md` §10.1 and
§15.12 carry the shape that does answer it** — one writer for the option list, children invoked as a
function over the root's own filtered list. §13 carries the refutation.

**Severity precision on `Tooltip` and `Repeater`:** a passed `className` is **not** silently dropped
at runtime — the props types are closed (`git show 0a61e01:src/components/ui/Tooltip.tsx | sed -n '26,38p'`,
`git show 0a61e01:src/components/form/Repeater.tsx | sed -n '77,127p'` — both anchors were taken
there and neither survives Phase 3, which added `className` to both; the live type has moved twice
since, so read it by name — `sed -n "/^type RepeaterProps/,/^};/p" src/components/form/Repeater.tsx`
— because adjusting the number is the wrong repair), so it is a
**TypeScript error**: loud, at compile time. The defect is *"there is no override path"*, not *"the
override path is broken."* That is the same distinction that sank both Phase 0 claims (§10). Do not
re-inflate it. (`SLOT-VOCABULARY.md` §15.6 narrows this further: it holds for `Tooltip` and not for
`Repeater`.)

---

## 6. Phases

Each phase is independently shippable, and **Phases 1–3 deliver nearly all the consumer-facing value
before a single component's CSS is inlined.**

### Phase 1 — `@layer components` — ✔ CLOSED

This package's component CSS is in `@layer components`: **44 individual imports** in `src/styles.css`
each carry `layer(components)`, and `tokens.css` deliberately carries none. The aggregate import
cannot carry it, and that is measured rather than asserted:

```
node scripts/probe-cascade-layer.mjs      # first section proves it — the build error IS the pass
  @import "./styles.css" layer(components);  →  Error: `@source` cannot be nested
grep -c '^@import "\./components' src/styles.css      # 44
bun run verify:css-layering                           # asserts the layer keyword on every one
```

(The `@source "../src/**/*.{ts,tsx}"` at the end of `src/styles.css` is what cannot be nested —
`grep -n '@source' src/styles.css`.) **One serial commit owned that file**, and it also owned
`Grid.tsx`'s `import "./Grid.css"` — the only CSS import in the JS graph, which the bundler injected
**unlayered** where it out-ranked the layered copy. `verify:no-css-imports` now gates that half;
`verify:css-layering` gates this one.

**Why this had to precede Phase 4 and could not follow it.** Partial inlining is *not order-neutral*:
every declaration moved into a utility drops out of unlayered precedence into `@layer utilities`,
i.e. **below** the rules still in the same file. A file going from 53 rules to 9 doesn't just shrink
— its remaining 9 start winning fights they used to lose. Phase 1 collapses three interacting
precedence axes (unlayered-vs-layered, specificity, source order) down to one, which is what makes
incremental conversion safe.

#### What the probe says now, and what it said then

The row set was **9 hand-written rows, then 11, then 19** — the growth is the finding, not a
bookkeeping detail (see the `Hero.css` note below). Re-run it rather than reading this block:

```
bun run probe:cascade-layer
   regressions: 0
   inert:       0
   accepted:    3
   verified:    16
```

**19 rows** (3 + 16). The eight original regressions and their dispositions, each with a §13 row:

| Original regression | Disposition |
| --- | --- |
| `timeline-even-animation` — alternating entrance direction inverted | **Fixed by deleting the collision.** `Timeline` stopped emitting the foundation's `.fade-right` (`ScrollReveal animation="none"`) and owns the whole `animation` shorthand, keyed on `[data-entering]` — an attribute `ScrollReveal` emits for exactly the entrance window. `:nth-child` stays the single source of side *and* direction (#342). Three new rows pin the base direction, the timing and the reduced-motion guard, because Timeline now owns all three. |
| `stagger-ancestor-inherit` — the `--stagger-delay: inherit` mechanism died | **Fixed by deleting the collision.** `Stagger.tsx` writes `--_stagger-step` on the container and an inline `--stagger-delay: var(--_stagger-step)` on each item. `Stagger.css` is gone. |
| `radio-forced-colors-focus-outline` — WCAG 2.4.7, our own utility beating our own rule | **Fixed by standing the utility down.** `not-forced-colors:focus:outline-none`. No `!important`, no carve-out — §3a. |
| `scrollreveal-no-js-opacity` — content permanently invisible with scripting off | **`!important`**, one declaration, inside `@media (scripting: none)`. Passes the `AGENTS.md` admission test: a visibility invariant, gated behind an environment nobody styles into. |
| `tabs-scrollbar-height`, `tabs-scrollbar-thumb-color` | **Accepted, and the losing rules deleted.** §13. |
| `hero-stagger-animation-name` | **Accepted** — the colliding class is hand-authored, and a consumer's explicit entrance is right to beat Hero's aesthetic default. |
| `hero-reveal-hidden-animation-none` | **`!important`** — a *timing* guard, not an opinion, which is why it takes one and the row above does not. |

**Three probe rows to hand-check rather than skip, and two of them are new.**
`switch-ring-vs-consumer-reset` is joined by `hero-stagger-animation-name` and
`hero-reveal-shown-animation-name`. All three are accepted, so all three are pinned to a *changed*
value — the only shape of green a fixture error and a correct measurement both produce. The two
`hero-*` acceptances also carry a **forward dependency, written into the row itself**: their premise
is *"nothing this package renders can put a class on a `.stagger-item`"*, and the moment Phase 3
gives `Stagger` a `classNames.item` that premise stops holding. **Revisit them in the same commit
that ships it.**

#### The search is property-intersection, not class-name overlap

`Tabs.css` vs the foundation's universal `*::-webkit-scrollbar` is the proof: there is **no shared
class name**, so a class-overlap search structurally cannot find it. **The search must be: for every
declaration in this package, find every *unlayered* foundation rule that sets the same property and
can match the same element — including universal selectors and pseudo-elements.** Record direction
per rule; some inversions are no-ops. And note from §2a that the foundation is unlayered almost
everywhere, so `tokens/`, `themes/`, `responsive/` and the rest of `base.css` are all in scope.

#### `Hero.css` — found by search, not by the original row list

The probe's first nine rows were hand-listed and missed these. They were found by grepping the source
for foundation-owned class names — which returned **7 rules in 4 files** then and returns **3 rules
in 2 files** now (§2a). Four of the seven stopped naming a foundation class: `Stagger.css`'s two went
with the file, and `Timeline.css`'s two were re-keyed onto `[data-entering]`, an attribute this
package emits. Two of the original seven are Hero's, inside
`@media (prefers-reduced-motion: no-preference)`, and **both are still there**:

```
grep -n 'hero__content .stagger-item\|scroll-reveal-hidden .stagger-item' src/components/ui/Hero.css
```

```css
.hero__content .stagger-item { animation-name: fade; … }                     /* (0,2,0) */
.hero__content .scroll-reveal-hidden .stagger-item { animation-name: none !important }   /* (0,3,0) */
```

**The collision is conditional, and that is what decided the two opposite dispositions.** The
foundation's own `.stagger-item` ships **no `animation-name`** — only `animation-delay` and
`animation-fill-mode`. So Hero's rules invert only when the item *also* carries a foundation
`.fade-*` class, whose `animation` shorthand does set the name — and **nothing this package renders
can put a class on a `.stagger-item`**, so that markup is hand-authored. Find the reasoning at
source: `grep -n 'THE CONSUMER PICKS THE ENTRANCE' src/components/ui/Hero.css`.

- The **plain fade** is an aesthetic default. `fade` → `slide-up, fade` when a consumer writes an
  explicit `.fade-up`, and an explicit instruction beating a default *is* the Phase 1 prize.
  **Accepted**, with a third row (`hero-reveal-shown-animation-name`) added so the pair state the
  whole contract instead of drifting into disagreeing.
- The **hidden-state null** is a timing guard. `none` → `slide-up, fade` would run the entrance while
  the content is still `opacity: 0`, spending it before the reveal fires — the precise failure the
  keying exists to prevent, since `ScrollReveal` drops the entrance class on `animationend` while the
  hidden class is removed once and stays removed. **`!important`**, and the comment beside it says
  why this one and not the sibling rule above it.

**The lesson that outlived the rows:** a hand-written row list is an allowlist, and the rows nobody
thought of are the ones that ship. Derive the row set from a search over source and assert its count.
`memory/gates.md`: a new gate's exemptions are where the next bug lives.

#### Of the nine "deliberate precedence" sites, what each turned into

**All eight originally-cited lines were comments, not rules** — the honest framing was *nine places
documenting reliance on being unlayered*. Line numbers are omitted deliberately: four of these files
were rewritten, and `memory/ledger.md` records that adjusting a rotted number is the wrong repair.
Grep for the content.

| Site | Outcome |
| --- | --- |
| `Radio.css` | comment → real inverting rule. **Fixed** — `not-forced-colors:` on the reset; the comment now explains that nothing competes with the outline *by arrangement*. |
| `Stagger.css` | comment → real inverting rule. **File deleted**; the mechanism moved inline into `Stagger.tsx`. |
| `Combobox.css`, `ColorPicker.css` | documented a deliberate **absence** ("do not declare `border` here again"). Nothing to convert; comments answered. |
| `Timeline.css`, `ActivityFeed.css` | custom-property fan-out notes. Custom properties resolve per element, so layering never affected the mechanism — but both claimed the token was *"the only override route that works"*, which layering falsified. **Comments rewritten** (§4c), together with the two `.tsx` docblocks that ship the same claim to consumers. |
| `MasonryGrid.css` | **Already gone** — the rule it annotated was deleted with `--masonry-gap` (§3b). |
| `AppShell.css` | not a regression, and the control that said so had no teeth. Replaced by `control-sronly-sectiontitle-padding`, which **can** move: it reddens if the `[data-collapsed]` rule is deleted as dead code, or if the `sr-only` ⟺ `collapsed` coupling in the TSX breaks. |
| `ScrollReveal.css` | missing from the original list, and the a11y/no-JS one. **`!important`**, with the admission test written beside it. |

#### Two regressions had a cheaper foundation-side fix — and it was not taken

Both remain **out of bounds** and are recorded in §11 as follow-ups, not as work. `memory/README.md`
§6: scope is this package only, *not even to add a script*, and that boundary was crossed once and
reverted in full.

```
grep -n 'stagger-delay' ../response-ui-css/src/animations/stagger.css   # no fallback in the var()
grep -n 'prefers-reduced-motion' ../response-ui-css/src/animations/scroll-reveal.css
```

The second is the sharper one: `.scroll-reveal-hidden { opacity: 0 }` is owned by `response-ui-css`,
and that file already carries a `prefers-reduced-motion` escape, so a `@media (scripting: none)`
sibling beside it is ~4 lines — **and would let `ScrollReveal.css` and its `!important` be deleted
outright.** That trade is written into `ScrollReveal.css` itself, so nobody reads the `!important` as
the only possible answer.

**Precedent worth reading:** `../response-ui-css/CHANGELOG.md:263` and the `@layer base` block in
`../response-ui-css/src/base.css` record the foundation package making this exact decision
deliberately, *"Verified by walking the CSSOM for the rule and asserting its enclosing layer."*

**Gate:** `bun run probe:cascade-layer`. Two CSS builds differing only by `layer(components)`, diffed
by `getComputedStyle` across four emulated environments. It exits non-zero on any unexplained change
**and on any inert row**, because a probe that measured nothing is worse than one that failed.

**Plus `bun run verify:css-layering`, which is the gate the probe cannot be.** The probe strips
whatever `layer()` `src/styles.css` carries and re-adds its own, so it compares "no layer" against
"layer" regardless of the real file — delete `layer(components)` from a component import and the
probe stays green, `typecheck`, `lint` and **2,547** tests stay green (`npx vitest list | grep -c ' > '`
— collected cases, which is not the same unit as a runner summary line; the `2079` this sentence
carried had no command and is superseded), and the component silently goes
back to beating every caller utility. **Phase 1's whole result was one token repeated on one line per component stylesheet,
and until this script nothing read those lines.** Made to fail on purpose three ways before being
trusted: a component import with the keyword removed, `tokens.css` with the keyword added, and the
unmodified tree.

**What would prove Phase 1 wrong, and how to make it go red:** flip one converted rule back and
confirm its probe row reddens. Every row's `note` says which edit does it — and for the rows that are
now controls over deleted declarations, the edit is *re-adding* the rule. Three traps in reading the
output:

- The probe counts `unmeasurable` (engine reports nothing for a pseudo-element) into `inert`. **Never
  read either as safe** — an inert row is a failure *of the probe*, and it is worse than a red one
  because it gets cited.
- **The three accepted rows are the ones to re-check by hand, not the ones to skip.** They are the
  only rows whose pass state is a changed value, so they are the only place where a fixture error and
  a correct measurement produce the same green.
- **An edit to a `.tsx` cannot redden any probe row.** The fixture is hand-authored HTML in the
  script; no row renders React. A `Timeline.tsx` or `Stagger.tsx` regression shows up in
  `Timeline.test.tsx` / `Stagger.test.tsx`, which assert the emitted `data-entering` and the inline
  custom properties — that is the *other* half of the gate, and it exists because these fixes moved
  behaviour out of CSS and into markup.

### Phase 2 — the two column-scale files — ✔ CLOSED

`Grid.css` and `MasonryGrid.css` are **deleted**; both column scales are native `grid-cols-*` /
`columns-*`, and `columns` is a bounded union on both — `Grid` 1–6, `MasonryGrid` 1–4, each bound
drawn from the scale its own stylesheet shipped rather than invented. The two equivalences were
verified against Tailwind's own source before anything was deleted. **Cite the deleted files through
`git show`, never as live paths:**

- `minmax(0,1fr)` is **byte-identical**: Tailwind's `grid-cols` handler emits
  `repeat(${n}, minmax(0, 1fr))`, matching
  `git show 81888c2:src/components/layout/Grid.css | grep -n 'grid-template-columns'`. The word-wrap
  promise in `AGENTS.md` survives untouched — `grep -n 'minmax(0, 1fr)' AGENTS.md`.
- Breakpoints **match exactly** — `tailwindcss/theme.css:327-330` = 40/48/64/80rem vs
  `git show 81888c2:src/components/layout/Grid.css | grep -n 'width >='`, and nothing in
  `response-ui-css` overrides `--breakpoint-*`.

**The shape of the change, and why it was not a token swap.** `columnClasses` was a *function*
pushing template strings into an array, so there was no static map to swap: Tailwind finds candidates
by scanning source **text**, and `` `rui-grid--${bp}-${count}` `` generates nothing. The table had to
be written out, one literal per cell, and that is what bounds the prop. **The loop is shared and the
tables are not** — `src/components/layout/shared.ts` owns `columnClasses`, and each component owns
its own table because the table names that component's utility prefix (`memory/README.md` §24).

**It fixed a silent bug, and on the way it introduced two of its own.** `columns={7}` used to emit a
class no rule defined and fall back to one column through `var(--rui-grid-columns, 1)`, with no error
at compile time or run time; it is now a compile error. But **the first implementation ported the
`var()` *read* and dropped its *default***, twice — a different bug wearing the same green tests.
Both are fixed and both are pinned; the falsifier below is where they were caught, and it is written
out in full because the falsifier this section originally carried could not have caught either.

#### What would have proved Phase 2 wrong — and what the first version of that answer missed

The original falsifier was *"assert the class string for `columns={3}`, and assert `columns={7}` is a
type error."* **Both were satisfied by code that had already shipped two layout regressions**, so it
is recorded here in full rather than repaired quietly:

1. **Assert the class string for `columns={3}`.** Necessary, not sufficient — a class-string
   assertion is a test of the *input*. `vitest` stubs CSS to `""`, so it passes for a typo, for a
   class no build generates, and for a class that generates something else.
2. **Assert `columns={7}` is a type error.** Also necessary. `Grid.test.tsx` / `MasonryGrid.test.tsx`
   do it as a conditional-type assertion checked by `typecheck`, failing in both directions.
3. **Assert that a `columns` object with no `base` key still emits the base step.** *This is the one
   the first two cannot reach.* The deleted stylesheets read their scale through `var(--…, 1)` on
   every root, which answered two questions: what the caller asked for **and** what happens where
   they asked for nothing. A lookup table keyed on the caller's input answers only the first, so
   `columns={{ md: 3 }}` emitted no base class at all, and the element fell back to the CSS
   **initial** value rather than the stylesheet's default: `grid-template-columns: none` instead of
   `repeat(1, …)`, and `column-count: auto` instead of `1`. An implicit `auto`-sized track is not a
   `minmax(0, 1fr)` one, so a long unbreakable word widens the grid past its container instead of
   wrapping. **Enumerate the fallbacks in a deleted stylesheet as declarations in their own right.**
4. **Assert the out-of-union count still lands on the base cell.** The union closes the *typed* door,
   not the untyped one, and a count with no cell in the table emits no class at all — no track
   definition, no multi-column context, overflow: strictly worse than the `var(--…, 1)` behaviour it
   replaced. `columnClasses` falls back to the `1` cell. Both test files pin it with a deliberate
   `@ts-expect-error` on the prop, which is the assertion rather than a suppression: the directive
   itself fails if TypeScript ever stops rejecting the value.

**The instrument, and its trap.** None of 1–4 can see a *pixel*, and the class string is the input to
the thing under test. The measurement that closes it is one Tailwind build containing the deleted
stylesheet **and** the new utilities, both markups on one page, `getComputedStyle` diffed across a few
viewport widths so the breakpoints fire — one build and one page, so there is no build-to-build
variance. **Two things it needs, and neither is optional:**

- **Take the "after" class string from the component** (`renderToStaticMarkup`, read the `class`
  attribute), never from your own fingers. A hand-retyped fixture measures what the author believed.
- **▲ Rename the deleted stylesheet's selectors in the probe's copy.** §12 retains the BEM class as a
  declaration-free marker, so the new markup carries the very selector the deleted stylesheet
  defines — and inside a single build that stylesheet is still loaded. The new side then silently
  inherits every declaration the utilities failed to replace, and the probe reports "no difference"
  for exactly the cases it exists to catch. **A deliberate-mismatch teeth-check still passes**,
  because that row's difference does not depend on the leak. Renaming turned a clean 30-reading run
  into two real regressions on the same code. `memory/gates.md` carries both halves.

### Phase 3 — seams + `classNames`

Adds `classNames` per §4a and applies the house rule per §4b, to each verified gap. **Purely additive
and visually a no-op** — and, crucially, **fully testable in jsdom**: asserting
`classNames={{control:"sentinel"}}` lands `sentinel` on the right element needs no stylesheets.

**Every lane verifies its gaps at source before acting.** The gap list is a search result, not a
finding. A lane that "fixes" a non-gap costs more than one that misses a real one, because the fix
lands in public API. In particular, confirm a caller's `className` can actually *arrive* at the
element: **a bare static class on an element no caller `className` reaches is not a defect.**

**Its Phase 1 precondition is met** (§0 constraint 2), so the blocker was the slot vocabulary
(§10), not the cascade — and **that vocabulary is now frozen in `SLOT-VOCABULARY.md`**, with the
per-family tables, the ban list re-verified at source, and the anatomy of every ruling. The two
items its §14.2 records as *still open* have since been ruled on by the owner and are listed in §10
here; **where the two documents disagree on a decision's status, this list is the later one, and
`SLOT-VOCABULARY.md` is still authoritative for the anatomy each ruling implies.** One carry-over:
the two accepted `hero-*` probe rows are pinned on the premise that
nothing this package renders can put a class on a `.stagger-item`. **Giving `Stagger` a
`classNames.item` falsifies that premise**, so re-examine those two rows in the same commit.

**Gate:** one slot-override test per slot-bearing component, plus the re-scoped
`verify:slot-annotations` (§7).

**What would prove Phase 3 wrong:** for each new slot, delete the `cn()` merge and confirm the
slot-override test reddens. A slot that passes its test with the merge removed is not wired up.

### Phase 4 — a standing convention, **not a campaign** — ✔ DELIVERABLE WRITTEN

> **Not "optional polish we'll probably do" — *not a project*.** The rule is: **when you touch a
> component for another reason, prefer utilities.** No lanes, no sweep, no completion criterion.

**Its one deliverable — the CSS/utility boundary written down with its reason — is discharged.** It
lives in `AGENTS.md` under *"Decision: what stays in CSS, what becomes a utility, and how to tell
which you are looking at"*: the ruling, the categories that stay with a live instance and a command
each, the four-question test, and the a11y precedent as its falsifier. **It is authoritative and is
deliberately not restated here** (`memory/README.md` §20). The reason it was mandatory is unchanged:
without it the next reader reads the leftover CSS as unfinished work and "finishes" it.

The cost/benefit is why there is no project: **~1,770 mechanical edits** — §2b's "convert
mechanically ~80%" against its 2,207 declarations, and that 80% is an estimate, not a measurement —
to fully delete **7 files, 4.0% of the CSS by line and 4.6% by declaration**, buying consistency
only, after Phases 1–3 have already delivered every capability. **The ratio has moved twice.** Phase
2 improved it (the pre-Phase-2 reading was ~1,800 edits for 5.8% / 7.5%) by taking the two files with
the best ratio in the package: 137 lines and 55 declarations deleted for two lookup tables. Phase 3
worsened it again — the seven grew from 218 lines to 242 while their declarations fell from 113 to
102, because the opt-in arrow CSS is verbose and the menu split moved declarations *out* of
`DropdownMenu.css` into a file that is not on this list. **Both halves are re-derived in §2b and this
sentence does not measure them again.**

> **SUPERSEDED — the project happened, and the estimate above is now history rather than a
> forecast.** The paragraph is kept because its *method* and its ratio-moved-twice narrative are
> still the record of how the decision was taken. What it predicted is not what occurred: a
> five-lane sweep converted the package rather than the deletable seven, and the measured outcome
> is **44 stylesheets → 26** (18 deleted), **5,790 → 2,971 lines**, **2,048 → 600 declarations** —
> reproduce with `git ls-tree -r a24f41d --name-only \| grep '^src/.*\.css$' \| grep -v
> 'tokens.css\|styles.css\|examples/'` against the same `find` over the working tree, piped
> through `wc -l` and `grep -cE '^\s*[a-zA-Z-]+\s*:.*;'`. That is 71% of all declarations, not
> 4.6%, because the sweep did not restrict itself to whole-file deletion. **The "consistency only"
> judgement was also refuted in passing:** the sweep found and fixed four dead declarations, two
> of which were live visible defects, a never-painting `RangeSlider` invalid state, and two
> focusable buttons with no focus indicator at all.

> **The *membership* of the seven was a judgement taken at `81888c2`; it has now been re-taken.**
> Five of the seven are deleted and two — `Tooltip` and `Popover` — are **refuted** and stay, on
> their arrow's `border: inherit`. §2b's row carries the figures and the reasoning; this sentence
> does not measure them again.

And there is recorded precedent that this exact shape of refactor ships a11y regressions:
**`memory/traps.md:85-163` records a `1.31:1` focus ring on `<Button variant="danger">`, shipped by
the pass whose entire purpose was making the focus ring consistent.** A sweep motivated by
consistency that broke the thing it was making consistent, with every gate green. That is this
phase's own future, written down in advance, and the written decision carries it as its falsifier.

Stop where a wall of utilities would be less legible than the CSS it replaced. `Timeline.css` is the
clearest case — **§2b measures it once (582 lines, 115 declarations, 50.3% comment) and this sentence
does not measure it again.** The figure that stood here (529 / 114 / 50.9%) was stale by Phase 1's
own doc sweep, and two measurements of one file is how a document ends up disagreeing with itself.
`src/util/focus.ts` already documents itself as the utility-side counterpart to the `:focus-visible`
rules in component CSS — **a hybrid is this package's established, gated pattern, not a compromise.**

### Phase 5 — serial cleanup and release

Prune dead `@import`s from `src/styles.css`, reconcile the docs, ship.

**The doc sweep, enumerated rather than estimated.** The previous version sized this with two figures
that do not hold:

```
grep -rliE 'unlayered|no Tailwind utilit' docs AGENTS.md | wc -l     # 36 files
# of those, occurrences inside a "## Gotchas" section:               # re-derive; the 14/28 reading
#   below was taken before Phase 1 rewrote 20 of these pages
```

**36, not 38** — Phase 1's doc sweep answered the clause in 20 component pages, so the *population*
moved and the sub-count with it. Re-derive the Gotchas half before sizing anything from it: the
remaining mentions are now mostly *correct* prose about the foundation being unlayered, which is the
opposite of the drift the 14/28 reading was measuring. The historical note stands: **14, not 21** —
the 21 was the count of files mentioning `unlayered` at all, and the two got conflated.

And **"~20 more are falsified and contain no CSS at all, so a CSS-shaped sweep cannot find
them" does not hold**: only **3 of 91** component docs contain zero CSS mention — `date-picker.md`,
`field.md` and `repeater.md` (`for f in docs/components/*.md; do grep -qi css "$f" || echo "$f"; done`;
`ls docs/components/*.md | wc -l` → 91). **The membership moved and the count with it**: the reading
this sentence carried was 2, naming `field.md` and `parallax.md`, and `parallax.md` has since gained
a CSS mention while `date-picker.md` and `repeater.md` lost theirs. The real falsified-and-CSS-free
set is small enough to **enumerate**, and starts with `repeater.md` (0 CSS mentions, 5 internals to
restructure — `grep -c 'className={' src/components/form/Repeater.tsx` → 5; the two static
`className="…"` attributes it also carries are the `sr-only` announcer and its wrapper).

**The other half of that sentence has been discharged and moves to §13**: `multi-select.md:45` stated
the *absence* of a subcomponent as design intent, and the page now records that as a superseded
earlier version.

Why this matters beyond bookkeeping: `memory/README.md` §16 — prose describing a footgun reads as a
*decision*, and the next reader treats the workaround as the API. Answer the prose; do not delete it.

**The terminology collision this plan created is closed**, and the `classPrefix` doc question with
it. Both were discharged in Phase 3; §13 carries the outcomes and the commands that show it.

**Release shape: ship per phase.** "Each phase is independently shippable" and "one deliberate
`0.12.0`" cannot both hold, and the breaking surface is too large for one minor anyway: compound
rewrites, `Grid.columns` and `MasonryGrid.columns` unions, `MasonryGrid.gap`, `classPrefix`
deletion, the `className` reroute. Phase 1 as its own release with its own probe, Phase 2 as its own
— **its breaking surface is now known and closed**: two `columns` props narrowed from `number`, one
`gap` narrowed from `string`, and two custom properties (`--masonry-gap`, `--masonry-columns`) plus
`--rui-grid-columns` withdrawn as `style` channels. Let the version land where the breakage actually
is.

---

## 7. Definition of done — per phase

| Phase | Done when | Shippable alone? |
| --- | --- | --- |
| **1 ✔ CLOSED** | §3a recorded in `AGENTS.md`; `probe:cascade-layer` shows **zero regressions and zero inert rows** (accepted deltas allowed, each pinned to its `expectAfter`); the property-intersection search recorded with direction per rule; `src/styles.css` owned by this one commit — **and with it `Grid.tsx`'s `import "./Grid.css"`**, because a stylesheet reached through the JS graph is injected unlayered and defeats the file's entire purpose for that one component; **and the two gates that make the result assertable**, `verify:no-css-imports` (the JS door) and `verify:css-layering` (the registry door) | yes — and it alone made `<StatCard className="flex-row">` work |
| **2 ✔ CLOSED** | `Grid.css` deleted; `MasonryGrid.css` deleted (its gap already landed — §3b); `columns={7}` proven to be a type error rather than a silent 1-column fallback, **and** proven to still land on the base cell when it arrives from untyped JS; **every deleted declaration accounted for by name** (item 2 below applies to Phase 2 as much as to 3/4); **and the computed-style measurement, because a class string is the input and not the outcome** — one Tailwind build carrying the deleted stylesheet and the new utilities, both markups on one page, `getComputedStyle` diffed across viewport widths, with the "after" string taken from the component and **the deleted stylesheet's selectors renamed in the probe's copy** so §12's retained marker class cannot leak declarations onto the new side (§6 Phase 2). A teeth-check passing does **not** clear that trap | yes |
| **3** | items **3–9** below, per component; slot vocabulary frozen first (§10, `SLOT-VOCABULARY.md`) | yes, per family |
| **4** | items 1–5 below, per file. **Its one non-per-file deliverable — the CSS/utility boundary written down with its reason — is ✔ done**, in `AGENTS.md` under *"Decision: what stays in CSS, what becomes a utility, and how to tell which you are looking at"*; that section is authoritative and §6 does not restate it | yes, per file — **and abandonable at any point** |

> **"Green" now means zero regressions and zero inert rows — not zero changes.** §3a accepted one
> measured change, so the probe has an `expectAfter` + `accepted` mechanism. Two things to hold onto:
> an accepted row is **pinned**, so it fails if it drifts off its value; and `accepted` is never a
> place to park a row you have not decided about. If you find yourself adding one to get to green,
> that is the gate working and you have a decision to make, not a config line to write.

**Phase 3/4 per-component contract, for the lane agent and the verifier:**

1. **CSS**: sibling `.css` deleted, or reduced to immovable residue only — with a header comment
   naming why each surviving rule cannot move.
2. **Every declaration accounted for, by name.** List each declaration from
   `git show <base>:src/…/X.css` with its disposition: → utility `foo`, → token `--bar`, or →
   dropped because Z. **Not a count.** `memory/README.md` §5: *a claim that counts instances instead
   of naming them cannot be audited.* This is the verifier's primary artifact.
3. **Seams**: every element carrying a class literal is either reachable via `className` (root) or
   `classNames.<slot>`, **or annotated with its triage letter and the reason** — (a) no caller
   `className` can reach it and the value is not something a consumer would vary, or (b) the
   override is a value and a token carries it. Slot names declared in the props type.

   **The annotation half is not a loophole, it is the point.** Read literally — "every literal is
   reachable" — this item contradicts §5 (a) and §6 Phase 3, which both say a bare static class on an
   unreachable element is *correct*. A lane cannot satisfy a verifier holding the literal reading
   except by inventing slots for non-gaps, which §6 says costs more than missing a real one because
   the mistake lands in public API. §8's `verify:slot-annotations` already assumes this shape: it
   gates the *decidable* half (does a caller's `className` flow here) and takes the judgement half
   from the annotation.
4. **House rule**: `className` → outermost element; `...props` → the focusable control (§4b).
5. **`cn()` wherever a caller `className` can arrive.** *Not* "no bare-string classNames anywhere."
   **The two readings differ by more than an order of magnitude and only one is a house pattern:**

   ```
   grep -rn 'className: "' src --include=*.tsx | grep -v '\.test\.\|\.examples\.' | wc -l   # 0
   ```

   **Zero** in production. The three this item used to name — `MultiSelect.tsx:337`, `:370`,
   `ColorPicker.tsx:289` — were the props-getter object-literal form with a *string* initialiser, and
   Phase 3 converted every one to `cn(…)`. The form itself has not gone away: there are **6**
   props-getter sites, all `className: cn(…)`, and §8's gate names them in its own output because it
   structurally cannot see them. **That is why this grep was always the wrong instrument** — it
   matched only string literals, so it under-reported the shape it was pointing at even when it
   returned 3.

   ```
   bun run verify:slot-annotations | sed -n '/BLIND SPOT/,/^$/p'   # names all 6, with file:line
   ```

   The broad reading is still an order of magnitude larger:

   ```
   grep -rno 'className="[^"{]*"' src/components --include=*.tsx \
     | grep -v '\.test\.\|\.examples\.' | wc -l          # 98, across 34 files
   ```

   Led by `FileUpload` (21), `DataTable` (8), `Toast` (6), `Rating` (6). It was **238 across 50
   files** at `0a61e01`; Phase 3 more than halved it by giving the internals `classNames` merges.
   **This one moves under active Phase 3 lanes** — it read 97/33 an hour earlier in the same session
   — so re-run it rather than quoting the figure. **Never generalise the props-getter sites into "a
   small containable pattern," and never sweep the ~98 as if it were the defect** — most of them are on internal elements no caller `className`
   reaches, which is triage (a). The requirement is item 3, reachability; `cn()` is how you satisfy it
   once a seam exists.
6. **Tokens**: §4c applied. Retained tokens documented as public; no themeable default written as an
   inline arbitrary property (§4d).
7. **Tests**: class-asserting tests updated, **plus one slot-override test per slot-bearing
   component.** Size this from a method you state and run (§2c) — not from a remembered number.
8. **Docs**: `docs/components/<name>.md` theme-token prose rewritten (not deleted); slots table
   added; `*.examples.tsx` still compiles. Beware the docs generator: an **empty** ```` ```tsx ````
   fence swallows every heading and fence up to the next example's closing fence, and the only signal
   is an `unused example` error naming a *different* example. Put a placeholder line in a new fence
   and diff the page's heading list afterwards.
9. **Gates green**: `typecheck`, `lint`, `test`, and all **13** `verify:*` — the count is
   `node -e 'console.log(Object.keys(require("./package.json").scripts).filter(s=>s.startsWith("verify:")).length)'`,
   not a memory. Plus `probe:cascade-layer` at zero regressions and zero inert for anything
   CSS-shaped.
10. **`src/styles.css` untouched — with one carve-out, because the literal rule cannot hold.**
    Phase 1 owns the file and Phase 5 prunes it, so no lane edits it *to change how something is
    layered*. But **a phase that deletes a stylesheet must delete its `@import` in the same commit**:
    an `@import` pointing at a missing file does not compile, so "untouched" and "Phase 2" are not
    both satisfiable. That is the whole carve-out — remove the line, change nothing else, and
    `verify:css-layering`'s headline count moves by exactly the number of files deleted. It moved
    45 → 43 in Phase 2, which is the shape of a legitimate edit here. **The mirror-image edit is also
    legitimate and has now happened**: Phase 3 split the shared menu sheet out, adding
    `menu-internals.css` and one `@import` line, so the headline moved 43 → 44. Both directions are
    "one line per file, nothing else changed" — `for s in 81888c2 0a61e01 HEAD; do git show
    $s:src/styles.css | grep -c '^@import "\./components'; done` → 45, 43, 44. Any movement that is
    *not* a file appearing or disappearing is not.
11. **Cross-lane seam pass.** After a family's lanes merge, one pass re-reads the *seams between*
    them — a slot named consistently inside two lanes can still disagree across them, and each
    lane's gates were green. Precedent: `memory/README.md` §14.
12. **`git status` comes back empty — and it is not sufficient on its own.** No scratch files, no
    `--keep` build directories, no half-reverted probe. `scripts/.cascade-probe/` and `dev/dist/`
    are **gitignored and therefore invisible to `git status`**; check for and remove them
    explicitly. Prior waves shipped exactly this with every gate green.

**Not on the list: paint confirmation.** No gate here can see a *pixel* — vitest stubs CSS to `""`
and jsdom applies no stylesheets. Phase 1's failures are **computed style**, and the probe sees
those. Anything genuinely paint-shaped (gradients, blend, sub-pixel geometry) is a human in the dev
gallery, explicitly rather than by implication — and note the gallery mounts every example at once,
so a console full of red and a page that swallows clicks are **not** signals about your change until
you have established what that tab does on a clean checkout.

---

## 8. Gates

| Gate | Asserts | Status |
| --- | --- | --- |
| `probe:cascade-layer` | Two CSS builds differing only by `layer(components)` produce identical computed styles across four emulated environments — **except** rows carrying an owner-accepted `expectAfter`, which are pinned to their decided value | **Built**, **19 rows** (3 accepted + 16 verified). Not in `prepublishOnly` — it needs Playwright and two vite builds; run on demand and in any PR touching CSS. **It cannot see whether `src/styles.css` still says `layer(components)`** — see the two rows below. |
| `verify:css-layering` | Every `@import "./components/*.css"` in `src/styles.css` carries `layer(components)`, `tokens.css` carries none, and an import it cannot classify is a failure rather than a skip | **Built**, in `prepublishOnly`. ~130 lines, no allowlist. It exists because Phase 1's entire result is one keyword repeated on one line per component stylesheet (44 today) and **nothing read those lines**: the probe strips whatever `layer()` is there and adds its own, and jsdom applies no stylesheets, so a one-line deletion reverted the phase with every other gate green. Made to fail on purpose three ways. |
| `verify:no-css-imports` | No `.ts`/`.tsx` under `src/` imports a `.css` file | **Built**, in `prepublishOnly`. The other door into the same invariant: a stylesheet reached through the JS graph is injected **unlayered**, out-ranks `@layer components`, and the probe — which builds no JS — reports the layering healthy while the real bundle disagrees. That was live in `Grid.tsx`. |
| `verify:token-mirror` | Every name declared in **any `@theme` block under `src/`** appears in `createCn`'s theme lists in `src/util/style.ts`, **and the reverse** — a name in `createCn` that no `@theme` block declares is also a failure. Namespace-aware: each `@theme` name is split into its Tailwind namespace and resolved against a tailwind-merge theme key, longest-prefix-first, with the 19 namespaces read at runtime from the installed `getDefaultConfig().theme` rather than transcribed; a name matching no namespace fails rather than being skipped | **Built**, in `prepublishOnly`. No allowlist; zero blocks and zero checked names are both failures. Made to fail on purpose seven ways. Headline: `bun run verify:token-mirror` → `OK (9 @theme name(s) in src/tokens.css, all mirrored in createCn, none stale; 1 namespace(s): color)`. **Its stated rationale was wrong and the row below records why** — the gate is right, the reason given for it was not. |
| `verify:slot-annotations` | Every `className` JSX attribute in production `src/` is either **reachable** (its initialiser mentions `className` or `classNames?.`) or **annotated** `// slot:(a\|b\|e) <reason>`. Anything else — including anything the parser cannot classify — fails. | **Built**, in `prepublishOnly`. No allowlist. Zero annotated sites is a failure, so it cannot pass vacuously. |

> **`verify:token-mirror`'s stated rationale is refuted by measurement, and the gate survives it.**
> This section used to say that *"tailwind-merge's arbitrary-property and standard class groups are
> generic, so a **named token value** added to `tokens.css` and not to `createCn` is the only real
> drift. Gate that and nothing more."* **For the only namespace this package currently uses, that is
> false.** tailwind-merge's default `color` scale accepts anything, so `createCn()` and
> `createCn({theme:{color:[…the 9 names…]}})` produce identical output on every colour pair tried —
> **8,640 pairs, 0 differences** (16 colour-taking prefixes × the 9 tokens × 20 neighbours, both
> orders, plus a variant-scoped form). What makes that a finding rather than a null result is the
> controls: the default `spacing` and `text` scales are *not* generic, so
> `cn("p-gutter","p-r3")` and `cn("text-display","text-fg-primary")` genuinely do merge differently
> with and without their theme entry. **The honest statement is: the mirror is load-bearing for any
> non-colour namespace, and documentation-grade for `color`.** The drift named above is not the drift
> that exists. §13 carries the row.
>
> ```
> node -e 'const{getDefaultConfig}=require("tailwind-merge");console.log(Object.keys(getDefaultConfig().theme).length)'   # 19 namespaces
> # then diff createCn() against createCn({theme:{color:[…]}}) over the colour cross-product,
> # with p-gutter/p-r3 and text-display/text-fg-primary as the two controls that must differ
> ```

**The letter set is a rule, not a list.** The gate settles on `(a)`, `(b)` and `(e)` and **rejects `(c)`, `(d)`, `(f)` by name**, because the question each letter answers is *does the consumer's need have a route somewhere other than this attribute?* — (a) none is owed, (b) a custom property, (e) a `render*` prop. The other three all **end** in a `className` merge, here or at a subcomponent, so a settled one is already *reachable* and a comment claiming otherwise is refuted by the code. That decides letters nobody has invented yet, which an enumerated allowlist could not.

**What it cannot do, and the docblock says so at every run:** reachability is a **name match on the attribute initialiser, not data flow** — `const cls = cn("x", className)` then `className={cls}` reads unreachable (a loud false alarm), and `const className = "static"` in scope reads reachable (the one **silent** false pass). The **props-getter form is invisible** to it — `className:` inside an object literal is not a `JsxAttribute`; there are **6** such sites, named in its own output, and §7 item 5's grep could never have counted them because it matches only string-literal initialisers (it returned "exactly 3" then and returns 0 now, while the shape it was pointing at has been 6 sites throughout — the same 6 at `81888c2`, `0a61e01` and HEAD). And it cannot tell an honest `(a)` from a lazy one: `// slot:(a) static class` passes. **The reason has to say what a consumer would break by getting a route** — that stays a review question, and no gate can read it.

**Current reading:** `bun run verify:slot-annotations` → `435 className attributes under src/ — reachable: 332  annotated: 103 (a:78 b:6 e:19)  failing: 0`.

> **The two built rows above are the same lesson twice, and it is worth naming.** Both gates guard
> one invariant — *this package's CSS reaches the bundle exactly once, through `src/styles.css`, in
> `@layer components`* — and neither was written until after a defect in its half had already
> shipped or nearly shipped. Both have the profile §8 asks for below: small, no allowlist, cannot be
> satisfied by a lie. They are deliberately **two scripts**, because they fail for unrelated reasons
> and are fixed in unrelated files, and `memory/gates.md` says to split a red gate's failures before
> fixing any of them.

### Why `verify:slot-reachability` was re-scoped

Written literally — "every class literal must be reachable" — it failed **274 of 425** `className`
JSX attributes at the tree it was designed against, and needed an allowlist roughly **twice the size
of the clean set it guards**, which is the exact anti-pattern `verify-focus-affordance.mjs`'s own
header warns against. The flaw is conceptual: it conflates two questions.

> **The "~300 of 478 literals" this paragraph carried does not reproduce, and it is dropped.** Under
> the shipped gate's own method — `node scripts/verify-slot-annotations.mjs <root>`, which takes a
> root argument, so it runs against `git archive 0a61e01 src` unmodified — the pre-Phase-3 reading is
> `425 className attributes, reachable: 151, failing: 274`, identical at `81888c2`. No method tried
> here yields 478; "class literals" and "`className` attributes" are different units (one attribute
> can hold several literals) and the plan never said which it meant. **The argument does not depend
> on the figure** — 274 against 151 is the same 2:1 shape the sentence rests on. That shape has since
> inverted, and it inverted *because the prescribed order was followed*: at HEAD the gate reports
> **332 reachable against 103 annotated**, because step (1) below — ship `classNames` — happened.
> The literal gate would now need an allowlist a third the size of the clean set, and it is still the
> wrong gate for the reason given below rather than for the ratio.

| Question | Decidable by a parser? |
| --- | --- |
| *Does a caller `className` flow to this element?* | **Yes**, ~90% of the time — a data-flow question |
| *Should it?* | **No** — that is the (a)–(e) triage, which is judgement |

Feasible order: **(1)** ship `classNames`; **(2)** land the triage as source annotations, so the
judgement is recorded where the element is; **(3)** gate the decidable half. That gate is small, has
no allowlist, and cannot be satisfied by a lie.

**It needs class literals to be statically visible, so the runtime-built names had to go — and they
have.** `grep -rn classPrefix src` returns **0**: the mechanism is deleted, `menu-internals.tsx`
emits five static `menu-*` literals, and `menu-internals.css` defines them. The names are
`SLOT-VOCABULARY.md` §8.2's. §13 carries the outcome and the anchors, which are all dead.

### What a green gate here does not mean

Read `memory/gates.md` in full before resting on any tick. The three that bear hardest on this work:

- **A gate can be structurally incapable of failing.** Once per phase, make a gate fail on purpose
  and watch it go red. "The gate is green" and "the gate can still fail" are two separate
  observations, and only the second is evidence.
- **A new gate's exemptions are where the next bug lives.** `verify:focus-affordance` documents
  honestly that it inspects stylesheets only — and a high-severity defect sat in exactly that blind
  spot. The `Hero.css` gap above is this lesson recurring.
- **Split a red gate's failures before fixing any of them.** Conflating a script's blind spot with
  real drift produces a script loosened until it hides the drift.

---

## 9. Lanes

**Lanes are derived from structural family, not from a count**, because the same analysis that groups
components also finds the (d) candidates and fixes the slot vocabulary across siblings. **All
families' vocabularies are now settled and frozen in `SLOT-VOCABULARY.md` §7**, which also finds
that this section's four families do not partition the package — it lists **ten**, summing to the
same 95 modules §2c counts. Take the family list from there, not from the four names below.

**Hard dependencies — same lane, or serialize:**

| Cluster | Why |
| --- | --- |
| `CalendarBase` + `Calendar` + `RangeCalendar` + `DatePicker` + `DateRangePicker` | `CalendarBase` owns **16** internal classes all four consume (`grep -oE '\.calendar[a-zA-Z-]*' src/components/ui/CalendarBase.css \| sort -u \| wc -l` → 17, minus `.calendar` itself; the "15" this row carried is the §5 arithmetic that does not re-derive) |
| `Table` + `DataTable` + `VirtualizedDataTable` | `VirtualizedDataTable.css` selectors reach **into `Table`'s markup** |
| `menu-internals.tsx` + `DropdownMenu` + `ContextMenu` | shared `menu-*` literals in `menu-internals.css` (§8; it was `classPrefix` before Phase 3 deleted the mechanism) |
| `Avatar` + `AvatarGroup` + `AvatarUpload` | `AvatarUpload` overrides the inner `Avatar`'s className |
| `Sparkline` + `StatCard` | `StatCard.Sparkline` wraps `Sparkline` |

Softer affinity, worth keeping together for convention consistency: the **16** modules under
`src/components` importing `src/util/focus.ts` —
`grep -rl 'util/focus' src/components --include=*.tsx --include=*.ts | wc -l`. **State which 16**:
that reading includes three `*.test.tsx`; the production-module reading is **13**
(`… | grep -v '\.test\.'`). Both are stable across `81888c2`, `0a61e01` and HEAD. **Do not drop the
`--include`** — three `.css` files mention `util/focus` in comments, and without it the same grep
returns 19.

**Size lanes by declaration count, not component count.** `FileUpload` is 53 rules and 208
declarations; `Tooltip` is 6 rules and 24 (it was 1 rule and 10 declarations before owner ruling 4's
arrow landed there — `git show 0a61e01:src/components/ui/Tooltip.css`). An over-stuffed lane is where
a verifier starts rubber-stamping.

**Use `isolation: "worktree"` per lane.** Five agents in one tree each running `typecheck` will see
each other's half-finished edits and chase phantom failures.

**Settle the convention before any fan-out** (§10 vocabulary). Phase 3 starts with the written
convention plus one worked reference component — `StatCard`: 5 subcomponents, one known unreachable
wrapper, small enough to judge ergonomics on.

**Re-measure anything a lane hands back, especially when it came back looking exact.**
`memory/README.md` §18: a four-way parallel survey produced the sharpest findings of a pass *and*
most of its inflated numbers. This document's own history is the case study.

---

## 10. ▲ ONE-WAY DOOR: slot vocabulary — ✔ FROZEN in `SLOT-VOCABULARY.md`

Freeze this before any fan-out. When this section was written `grep -rn classNames src/components`
returned **zero**, so the vocabulary was the whole public API — greenfield, and permanent once
shipped. Five agents inventing names in parallel would have produced
`wrapper`/`container`/`outer`/`root`/`box` for one concept. **That grep now returns ~800 and climbs
while Phase 3 lanes land** (806 at the time of writing): the
vocabulary is frozen and Phase 3 is spending it, so the freeze is a constraint on new names rather
than a description of an empty field. §13 carries the row.

> **`SLOT-VOCABULARY.md` is the contract; this section is the summary that produced it.** Every
> name, every per-family table, the ban list with each reason re-verified at source, and eleven
> claims from this plan it could not reproduce all live there. **Read it before writing a slot
> name**, and do not copy it back into this file (`memory/README.md` §20).

### ✔ Owner rulings taken since this section was written

Recorded here because this is where a reader meets the vocabulary. **The detail — anatomy, prop
shapes, which slots stop shipping, which doc lines change — is in `SLOT-VOCABULARY.md` and is
deliberately not restated.**

| # | Ruling | Consequence, and where the detail lives |
| --- | --- | --- |
| 1 | **`MultiSelect` becomes a compound** — `.Content` / `.Item` / `.ItemIndicator` / `.Empty` / `.Tag` / `.TagRemove`, render-prop-shaped so `options` stays the sole writer of the data. | **Reverses the "zero (d)" implication of §5's triage.** The `CLAUDE.md` rule 3 objection is engineered around, not waived. **`MultiSelect`'s `item` / `panel` / `empty` slots must not ship** — §1.5a there makes subcomponent and slot mutually exclusive. `SLOT-VOCABULARY.md` §10.1, §7.1, §11. |
| 2 | **`CommandPalette` also becomes a compound**, for consistency: one anatomy under one mechanism. | Closes the second item its §14.2 lists as open. `SLOT-VOCABULARY.md` §10.2. |
| 3 | **`Breadcrumbs.Separator` → `.Divider`; `DropdownMenu.Label` / `ContextMenu.Label` → `.GroupHeader`.** | Both are breaking renames and both move an internal identity check, not just a name. `label` stays **hard-banned** as a slot name in every family. `SLOT-VOCABULARY.md` §8.5, §8.8. |
| 4 | **`arrowRef` is covered** — the arrow element is actually rendered, behind an opt-in `arrow` prop on the floating surfaces. | **Reverses the ban below**, whose stated reason was that no such element is rendered. The name is **narrowed, not un-banned**: still banned for a direction control, granted to the floating-surface pointer. **`docs/components/popover.md` would have become a *false cannot* the moment this shipped** — `memory/README.md` §21, the worst doc-rot shape — and it did not: the page documents the arrow (`grep -n 'The arrow' docs/components/popover.md`). The `:85` this row cited is now the `arrow()` middleware bullet. `SLOT-VOCABULARY.md` §4, §3.3. |
| 5 | **`MultiSelectOption` / `CommandItem` are being harmonised** before Phase 3 authors the compound props types. | Ruling 1 makes the type name *more* public, not less — it moves from a data-prop element type to a subcomponent prop type. Do it first or the rename gets more expensive. `SLOT-VOCABULARY.md` §14.2. |

**Banned names, with reasons. This list matters as much as the chosen names.**

> **`SLOT-VOCABULARY.md` is authoritative for this list; the table below is a summary and has already
> drifted once.** It carried `header`/`footer`/`closeButton` as a package-wide ban after §3.5 of that
> file had scoped them to the overlay family, and `arrow` as banned after decision 4 narrowed it. Both
> are corrected in place below. `memory/README.md` §20: a plan restating what already lives somewhere
> authoritative is a second source of truth, not diligence — **read the vocabulary, not this table**,
> and when they disagree the vocabulary wins.

| Banned | Why |
| --- | --- |
| `root` | §4a — `className` is the root. |
| `wrapper`, `container`, `outer`, `box`¹ | The four names independent lanes would each invent for **`control`**. |
| `content` | Reserved as a *compound subcomponent* name — `Combobox.Content` ships (`grep -n 'Content: ComboboxContent' src/components/form/Combobox.tsx`; the `:537-542` this row used to cite is now `:538-543`, which is why it is a grep). A component gets `Content` the subcomponent **or** `panel` the slot, never both. |
| **`label`** | **Hard flag.** `*Label` props already mean *accessible name*, and there are **30 distinct ones**, not the handful previously listed — `grep -rhoE '^\s+[a-z][a-zA-Z]*Label\?:' src/components \| sort -u`. It also collides with the exported `Label` component (`form/index.ts:48`). |
| `chip` | `TagInput`'s public vocabulary is already "tag" (`maxTags`, `validateTag`, `TagRejection`). |
| `adornment`, `prefix`/`suffix` | MUI vocabulary; these elements are `icon` + `affordance` here. |
| `announcer` | `sr-only role="status"` regions — one each in `TagInput.tsx` and `Repeater.tsx` (`grep -rn 'role="status"' src/components/form/TagInput.tsx src/components/form/Repeater.tsx`; cited as `TagInput.tsx:471` and `Repeater.tsx:308`, both rotted in Phase 3). Exposing invites a consumer to drop `sr-only`. Triage **(a)**. |
| `arrow` | **Narrowed by owner ruling 4, not lifted.** The stated reason — *"no such element is rendered"* — was false twice over: `Carousel` renders `.carousel-arrow` today, and the floating surfaces render one under ruling 4. It stays banned as a name for a **direction control** (use `prev`/`next`/`first`/`last`) and is granted to the **floating-surface pointer**. |
| `backdrop`/`scrim` | `::backdrop` takes no class. **(b) token** — `--OVERLAY-SCRIM-COLOR` exists in `response-ui-css/src/tokens/overlay.css:2` (still exact). |
| `header`/`footer`/`closeButton` | **Overlay family only — see `SLOT-VOCABULARY.md` §3.5, which is authoritative.** The reason is a fact about `Dialog`/`Drawer` (they render `{children}` only, so that structure is consumer-supplied), not about the words: `CalendarBase`, `CodeBlock` and `Wizard` each render a real header/footer element and each legitimately names it. Three lanes reached that independently. |

¹ `box` is permitted for exactly one thing: `OTPInput`'s N homogeneous entry boxes.

> **`arrowRef` is public API, not dead code — and owner ruling 4 has now chosen "cover it".**
> `grep -n 'arrow' src/hooks/use-floating.ts` (cited as `:17,23,29`; the import, the `arrowRef`
> option and the middleware wiring have all moved) wires the floating-ui `arrow` middleware behind
> it, nothing in this package passed it, *and* `useFloating` is exported (`src/hooks/index.ts:10` →
> `src/index.ts`; still exact) with the option documented in `docs/components/popover.md` (cited as
> `:85`). A consumer can activate it. Deleting it would have been a **breaking change**, not a
> dead-code removal; the choice was cover it or document it as unsupported, and it is covered. **The
> doc sentence that said there is no arrow element has been rewritten** — the page now documents the
> `arrow` prop and `classNames.arrow` — so the false cannot did not ship. §13 carries the row.

**Cross-family collision, settled:** the menus call the leading glyph `item-icon`, the form family
proposed `itemIndicator` for the check mark, and `SearchInput`/`Toast` use `icon` for a leading
glyph. These are **two concepts** — a leading glyph and a selection indicator — and the two-concept
reading is **confirmed** at source. `SLOT-VOCABULARY.md` §8.1 carries the ruling and refines the
prescription; §15.2 and §15.3 record that this paragraph's own survey missed two of the six usages
and got the `SearchInput`/`Toast` half wrong. Take the names from there.

---

## 11. Out of scope

- **Playwright *paint* baselines.** `memory/traps.md:373-376` records a screenshot run producing a
  contradiction from sub-pixel rasterisation. That objection is valid **for Phase 4 only**. It was
  once applied to Phase 1 as well, on the grounds that "regressions are visible in the gallery" —
  which was wrong on every count: the gallery renders **zero** environment states, so Radio's ring
  and ScrollReveal's no-JS failure are structurally unobservable there; Timeline's alternation
  appears once, as a single ~300ms IntersectionObserver-fired slide above 40rem, unreplayable without
  a reload; and Stagger's regressing path has no gallery coverage at all, because every example uses
  the `staggerDelay` prop, which writes the var inline and beats every layer. **The right instrument
  was computed style** — no baseline store, no rasterisation, no determinism work. When declining an
  instrument, name the question it would answer and check that your objection is about *that*
  question.
- **Every other package in the repo — `response-ui-css`, `response-ui-tw-merge`,
  `response-ui-renderer`.** This plan changes **this package only.** That includes the two follow-up
  scales below, and the cheaper foundation-side fixes for Stagger and ScrollReveal (Phase 1), which
  are genuinely cheaper and still out of bounds. `memory/README.md` §6: scope is this package only,
  *not even to add a script*, and that boundary was crossed once and reverted in full.
  - **Downstream consumers are not this plan's problem, but the version bump is.** `CLAUDE.md`'s
    dependency rule means whoever ships a version here bumps the packages that depend on it. That is
    a release step, not a design input, and nothing in this plan should be shaped by it.
- **`VirtualizedDataTable`'s cross-component selectors** as an *architectural* fix. The migration
  exposes the coupling; untangling it is its own work.
- **Container queries.** Available and unused; adopting them is a behaviour change.
- **100% CSS elimination.** Achievable except `@keyframes`, but not the goal. The end state is a
  documented hybrid.

### Recorded follow-ups (do not fix here)

- **The wrapper/inner silent residue is a three-component question, and no `Omit` answers it.**
  `MediaCard.Image`, `Hero.Background` and `Spotlight.Image` share one shape:
  `Omit<ComponentPropsWithRef<"div">, "children">` on the box plus an `imgProps` bag for the
  `<img>`. Every `<img>`-exclusive attribute is a loud call-site error (`loading`, `srcSet`,
  `sizes`, `decoding`, `fetchPriority`, `crossOrigin`, `referrerPolicy`, `useMap`, `width`,
  `height` — measured by compiling a throwaway `.tsx` under the project `tsc`, not by reasoning).
  Every prop legal on **both** elements still compiles and addresses the box: `className`,
  `style`, `ref`, `onLoad`/`onError`, `id`/`title`/`aria-*`.

  **`ref` is the only genuine defect, and it is unreachable by any props type.**
  `RefObject<HTMLImageElement>` is assignable to `Ref<HTMLDivElement>` because `HTMLDivElement`
  adds only the deprecated `align` over `HTMLElement`, so a caller silently holds the wrong
  element and reads `undefined` off it. `Omit` cannot close it — `Omit` is compile-time only and
  leaks through spreads (§4a reason 2), so `<MediaCard.Image {...bag} />` would still deliver the
  prop silently.

  **Do not classify this as "the override path is broken" (§5).** `imgProps` is a complete working
  route, and `onLoad`/`onError` re-pointed to the box still **fire**: React attaches a listener
  for these non-delegated events directly to the target element and dispatches up its own fiber
  tree, so only `event.currentTarget` changes — and reading `.naturalWidth` off it is itself a
  compile error. Pinned by `MediaCard.test.tsx`. If this is ever taken it is one decision across
  all three components, and it needs a mechanism `Omit` does not provide.

- **▲ Two foundation-side fixes for Phase 1, both cheaper than what shipped, both out of bounds.**
  Recorded so nobody reads the in-package answers as the only possible ones — and so nobody takes
  them without a decision, because `memory/README.md` §6's boundary was crossed once and reverted in
  full.
  - `../response-ui-css/src/animations/stagger.css` reads `var(--stagger-delay)` with **no fallback**.
    Writing `var(--stagger-delay, var(--MOTION-STAGGER-DELAY))` there would have made the whole
    `--_stagger-step` indirection in `Stagger.tsx` unnecessary.
  - `../response-ui-css/src/animations/scroll-reveal.css` owns `.scroll-reveal-hidden { opacity: 0 }`
    and already carries a `prefers-reduced-motion` escape. A `@media (scripting: none)` sibling
    beside it is ~4 lines — **and would let `ScrollReveal.css` and its `!important` be deleted
    outright.** That is one of the package's two `!important` declarations removed by a change on the
    other side of a boundary we chose not to cross.

  Both would need a `response-ui-css` release and a dependency bump here (`CLAUDE.md`'s one-way
  dependency rule), which is the real price and is not a design input.
- **One rule-width scale** (5 tokens, the rail family: `--_timeline-line-width`,
  `--_timeline-highlight-ring`, `--_stepper-line-width`, `--_activity-feed-line-width`,
  `--_activity-feed-highlight-ring` — all five still `2px` — plus `--_table-marker-width: 3px`
  for the table marker) **and, separately, a focus-ring-width question.** Two different concepts
  sharing a literal; §3a touches the second directly. Do not merge them.

  **The "~76 sites" this bullet carried is dropped — no method reproduces it.** The reproducible
  readings, both stated with their method: **41** ring-width sites (32 `outline: 2px` declarations in
  CSS plus 9 `outline-2`/`ring-2` utilities in production `.ts`/`.tsx`), or **62** if the 21
  `outline-offset: 2px` declarations are counted as the same literal, which is a different concept
  and probably should not be.

  ```
  grep -rn 'outline: 2px' src --include=*.css | wc -l                              # 32
  grep -rno 'outline-2\|ring-2\b' src --include=*.ts --include=*.tsx \
    | grep -v '\.test\.' | wc -l                                                   #  9
  grep -rn 'outline-offset: 2px' src --include=*.css | wc -l                       # 21
  grep -rn -- '--_timeline-line-width:\|--_timeline-highlight-ring:\|--_stepper-line-width:\|--_activity-feed-line-width:\|--_activity-feed-highlight-ring:\|--_table-marker-width:' src   # 6
  ```
- **No overlay z-index scale.** `Popover.css:17` = 40, `menu-internals.css:15` = 40 (it was
  `DropdownMenu.css:18` before Phase 3 split the menu sheet out), `Tooltip.css:11` = 50,
  `grep -n 'z-50' src/components/ui/ToastContext.tsx` (cited as `:212`), and `HoverCard` sets
  **nothing** (no `HoverCard.css` at all). Four values, one absence, no shared contract. Needs one
  `--OVERLAY-Z-*` scale in `response-ui-css`. Re-derive the whole set with
  `grep -rn 'z-index' src --include=*.css` rather than trusting the four.
- **`AGENTS.md` is false about `Repeater`.** The sentence — *"`DataTable`, `VirtualizedDataTable`,
  `Repeater` and `AvatarUpload` are plain function components taking React 19's `ref` prop"* — is at
  `grep -n "React 19's \`ref\` prop" AGENTS.md` (cited as `:392`; the file grew and it is now further
  down). `RepeaterProps` (`grep -n 'type RepeaterProps' src/components/form/Repeater.tsx`; cited as
  `Repeater.tsx:77-127`; read it by name with
  `sed -n "/^type RepeaterProps/,/^};/p" src/components/form/Repeater.tsx`, since the end line has
  moved twice this phase and chasing it is the wrong repair) is still a closed type — no `ref`, no
  `ComponentProps` intersection, no rest spread, and the
  signature destructures none. `<Repeater ref={…}>` is a type error. **The false sentence in
  `AGENTS.md` has been corrected**; what stays out of scope is *giving `Repeater` a `ref`*.
  **Check `DataTable` and
  `VirtualizedDataTable` against that same sentence before trusting it** — `AvatarUpload` does
  document its `ref`, so the bullet is only partly wrong.
- **Verbatim duplication:** `grep -n 'mt-r6 text-body-3 text-status-error' src/components/form/TagInput.tsx`
  (cited as `:463`) duplicates `date-picker-internals.ts:69` (still exact).
  `DatePicker` and `DateRangePicker` both import the constant; TagInput is the sole drifter. Import it.
- **`Dialog` and `Drawer` are near-identical twins with divergent mechanisms** — `Dialog` fully
  inlined with a `backdrop:` utility and `animate-fade-in`; `Drawer` a 125-line CSS with
  `@starting-style` + `allow-discrete`; `CommandPalette` uses `@keyframes` for the same job. Three
  answers to one problem. Unifying them is the decision that cluster exists to force.
- **Unmeasured:** whether a consumer's `backdrop:` override dedupes against a stacked
  `backdrop:starting:` one. §2d's caveat says variant-scoped utilities never dedupe across differing
  variants. Measure before relying on it.

---

## 12. Retained by design: the BEM hook classes

Strip the declarations, **keep the class names** as declaration-free markers alongside the utilities.
Costs nothing — the strings are already there — and buys:

- **"Restyle every StatCard at once"** from plain consumer CSS, which being unlayered beats the
  utilities. **This is the same mechanism as §3a's hazard, pointing the other way.** Do not price
  only the direction you like: the cascade quirk that lets a consumer restyle every card is the
  quirk that lets them delete every focus ring.
- Devtools legibility against a wall of utilities.
- The class-asserting tests keep passing.
- Astro/Rails consumers of `response-ui-css` keep the same target names — the cherry-picking ethos.

**It is not free, and Phase 2 paid the bill.** `rui-grid` and `masonry-grid` are now
declaration-free markers, and retaining them is exactly what contaminates a one-build A/B: the new
markup still matches the deleted stylesheet's selector, so inside a probe that loads both, the new
side inherits whatever the utilities failed to replace and the probe agrees with you. **Any lane
converting a stylesheet must rename the old selectors in its probe's copy** (§6 Phase 2). The
retention is still right; the measurement has to be built knowing about it. It also means each
retained marker should be **commented at the site as a marker**, or the next reader deletes it as a
class that styles nothing — both Phase 2 components carry that comment.

---

## 13. Settled — do not re-derive

| Claim | Outcome | Where the reasoning lives |
| --- | --- | --- |
| `AppShell` overwrites the consumer icon's `className` (cited as `AppShell.tsx:396`) | **Refuted.** `icon` is `LucideIcon` — a *component*, not an element — so the class is handed over as a prop and there is nothing to overwrite. The prescribed `cn()` fix is a provable no-op. `grep -n 'icon?: LucideIcon' src/components/ui/AppShell.tsx` is the anchor; the docblock beside it now states the same conclusion at source. | `bugs/ARCHIVE.md` #497 |
| `MultiSelect`'s two inner paths discard an incoming `className` (cited as `MultiSelect.tsx:337,370`) | **Refuted.** The caller's `className` is destructured and merged onto the root (`grep -n 'cn("multiselect", className)' src/components/form/MultiSelect.tsx`; the `:98` / `:256` this row cited are rotted); nothing arrives on the two inner paths, so nothing is discarded. What survives is a *different* finding: those elements had no prop-level route at all, which is §5 (d) work — owner ruling 1's compound. | `bugs/ARCHIVE.md` #498 |
| "No utility can redefine inherited tokens for a subtree" | **False.** `[--C-TEXT-PRIMARY:var(--C-TEXT-INVERSE)]` generates and inherits normally. `MediaCard` moves. | §2d |
| "Vendor pseudo-elements are a lateral move" | **False.** `cn("[&::-webkit-slider-thumb]:size-r5","…:size-r3")` → `size-r3`. All **18** rules can move — the 21 was correct when taken, at `81888c2^`, and Phase 1 deleted `Tabs.css`'s three scrollbar rules out from under it. §2d states the counting method and the two readings (18 rules / 20 selectors). | §2d |
| "Timeline's `:has()` rules can never move" | **Overstated.** `not-has-[…]` generates, so the pair restructures into mutually exclusive conditions and improves. | §4c |
| "`> *` reaching caller-supplied children is immovable" | **False.** The `*` variant is `:is(& > *)` at (0,1,0). `ActivityFeed`'s `.activity-feed-aside > *` moves and *improves* — the current selector is (0,3,0) and unbeatable. | §2d |
| "We need a gate asserting tw-merge knows every utility" | **Mostly unnecessary.** Only a *named token value* can drift. **The gate was built anyway, and this outcome is now itself refuted — see the row below.** | §8 `verify:token-mirror` |
| "A named token value added to `tokens.css` and not to `createCn` is the only real drift" | **Refuted by measurement, and the gate survives the refutation.** For `color` — the only namespace this package currently uses — tailwind-merge's default scale accepts anything, so adding the 9 `@theme` names to `createCn` changes **nothing**: 8,640 colour pairs tested (16 colour-taking prefixes × 9 tokens × 20 neighbours, both orders, plus a variant-scoped form), **0 differences**. The controls are what make that a finding rather than a null result: `cn("p-gutter","p-r3")` and `cn("text-display","text-fg-primary")` *do* differ with and without their theme entry, because the default `spacing` and `text` scales are not generic. **The mirror is load-bearing for any non-colour namespace and documentation-grade for `color`** — which is the opposite of "gate that and nothing more", and is why the shipped gate is namespace-aware and bidirectional rather than a `tokens.css`-only name check. | §8 |
| "A component needing 15–27 slots is really a compound" | **Refuted by `CalendarBase`.** High slot count means the element tree is the API, but the resolution may be (d), (e), or a mix. | §5 |
| "`arrowRef` is dead code; delete it" | **Refuted twice over.** It is exported, documented public API — and the ban on the name `arrow` that rested on *"no such element is rendered"* was false even before owner ruling 4, because `Carousel` renders `.carousel-arrow` today. Ruling 4 covers `arrowRef` and narrows the ban to direction controls. | §10; `SLOT-VOCABULARY.md` §3.3, §4 |
| "`Hero.css` is a cross-package collision site" | **Confirmed by measurement**, and the hidden-state rule is worse than predicted — the entrance fires while the reveal is still hidden, so it is spent before the content appears. Found by grepping for foundation-owned class names, not by the hand-written probe list. It is the one that took an `!important`; its sibling four lines above was accepted instead. | §6 Phase 1 |
| "Hero's plain-fade rule loses to any foundation `.fade-*` class" | **Imprecise as stated, and the precision decided the disposition.** The foundation's `.stagger-item` sets no `animation-name`, so the collision needs a `.fade-*` class *on the item* — real, but conditional on markup **a consumer authors**, since nothing this package renders can put a class there. That is why it was accepted rather than fixed: an explicit consumer instruction beating an aesthetic default is the feature. The acceptance is scoped to that premise and must be revisited when `Stagger` gains a slot. | §6 Phase 1 |
| Byte offsets into compiled CSS as evidence for the unlayered claim | **Self-invalidating.** The claim survives re-checking; every offset moved with the build. Cite the command. | §2a |
| "`--masonry-gap` is a genuine inherited fan-out, so the token rule spares it" | **Refuted.** The fan-out was real, but the *component* was the token's only writer — `MasonryGrid` renders both elements and takes a `gap` prop — so the value already had a channel. Deleted. | §3b |
| A token is deleted when it is a **single-use alias** of a baseline token | **Refuted — the wording could not decide its own lists.** Use-count is not the discriminator. It spares `--masonry-gap` (1 def / 2 uses), which was deleted, and it deletes `--calendar-month-gap` (1 def / 2 uses), which is kept. It also gave opposite verdicts to two tokens of one shape: `--_stepper-gap` kept as a `calc()` input while `--calendar-col-gap` — whose *only* reader is a `calc()` — sat on the delete list. Replaced by "who writes it". | §4c |
| The fan-out keep-clause turns on **who renders** the reading elements | **Refuted, and stated in two inverted forms.** §4c said "children the consumer never renders"; §3b said "children the consumer renders and the component never sees". Neither survives `--timeline-highlight-fill`: `TimelineItem` renders `.timeline-dot`/`.timeline-icon`/`.timeline-card` itself (`grep -n 'timeline-icon\\|timeline-dot\\|timeline-card' src/components/ui/Timeline.tsx`), so the §3b form deletes a token both sections keep. The clause turns on **who writes** — a consumer channel stays, a component-only default goes. | §4c |
| `--calendar-col-gap` and `--calendar-month-gap` are deletable baseline aliases | **Re-verdicted to keep.** `--calendar-col-gap`'s only reader is `--calendar-month-width`'s calc (`grep -n -- '--calendar-col-gap' src/components/ui/CalendarBase.css`; cited as `Calendar.css:19,22` before the file was renamed) — it is never applied as `column-gap`, so there is no utility to convert it to. `--calendar-month-gap` is read by a calc *and* a `gap` property, and converting only the property forks one value into two sources. Shrinks the calendar lane's token work to zero. | §4c |
| "`MasonryGrid`'s trailing-gap reset must stay in CSS because unlayered beats `mb-0`" | **True only while the sibling declaration was unlayered.** Once the margin became a utility too, `last:mb-0` at (0,1,1) beats it at (0,1,0) in the same layer. Deleting the competitor beat layering it. | §3b |
| `masonry-grid.md`'s "`className="mb-0"` loses, use `mb-0!`" | **Inverted by §3b, and it cited compiled byte offsets.** A *false cannot* — the worst doc-rot shape, because it steers consumers away from something that now works. | §3b |
| The `...props` half of the house rule should move to the outermost element | **Withdrawn.** It traded WCAG-load-bearing wiring for API symmetry. | §4b |
| `Tabs`' 3px scrollbar hairline should be defended with `!important` | **Refuted, and the rules deleted.** All three `Tabs.css` scrollbar declarations — the `::-webkit-scrollbar` height, the `transparent` `::-webkit-scrollbar-thumb`, and the `:hover` thumb colour — could not win in any state from `@layer components` against the foundation's universal, unlayered `*::-webkit-scrollbar*`. Defending them needed `!important` on a **pseudo-element**, which closes the override route completely: no consumer stylesheet at any specificity, no `!important`, and not even inline `style`, which cannot target a pseudo-element at all. The owner ruled **accept**, and an accepted regression and a live rule cannot coexist — the three probe rows are now controls reading the foundation's own values, and they redden if a Tabs scrollbar rule is re-added. `grep -i scrollbar src/components/ui/Tabs.css` returns only the comment. | §6 Phase 1; `memory/README.md` §22 |
| `Tabs` should keep `scrollbar-width: thin`, since the foundation never declares it | **Refuted, and it was the deletion the analysis missed.** It faced no collision, so every argument in the file spared it — and keeping it would have left Tabs **thin on Firefox and `0.625rem` on Chromium**, a cross-engine divergence *this change introduced*, because the deleted webkit rules were what kept the two engines agreeing. `Tabs.css` now carries **no scrollbar declaration at all**. "The foundation owns scrollbar appearance" is only true if it owns the width on both engines. | §6 Phase 1 |
| "Phase 1 needs no `!important` anywhere" | **False, twice — and the count is the contract.** The package ships exactly two: `ScrollReveal.css` (`opacity: 1` under `@media (scripting: none)` — a *visibility* invariant) and `Hero.css` (`animation-name: none` on a stagger item inside a still-hidden reveal — a *timing* invariant). `AGENTS.md` carries the admission test that governs them: the declaration must guarantee a visibility or timing invariant rather than a design decision, **and** be gated behind a condition a consumer would not style into, **and** carry a comment saying why this one and not the next one. `Tabs`' hairline is the worked example that **fails** it, because an appearance is not an invariant. `grep -rn '!important;' src --include=*.css` → exactly 2. | §6 Phase 1; `AGENTS.md` |
| `Skeleton`'s `h-48` is inert, like its `w-20` | **Was half refuted; now closed, and the split is the lesson.** `Skeleton.tsx` defaulted `width` but **not** `height`, so Phase 1's layering fixed `h-48` for free while `w-20` stayed unbeatable — one component, two geometry props, opposite answers, with nothing in the API saying which. Both props are now **deleted** (owner directive): geometry is `className`, `w-full` sits in the class list so `cn()` collapses it against a caller's `w-*`, and height keeps its layered CSS default because a utility there would out-rank `.skeleton--circular { height: auto }`. **The general form:** an inline *default* is reachable — move it into the class list; an inline *value* is not. Those are different defects and §4d had them under one row. | §4d |
| `Grid.css` can be layered by editing `src/styles.css` | **Refuted.** `Grid.tsx` imported it a second time through the JS graph, where the bundler injects it **unlayered** and it out-ranks the layered copy — the only such import in the package, and invisible to every gate: the probe builds no JS. Measured in the real dev bundle: two `.rui-grid{` copies, one in `@layer components` and one outside, collapsing to one after the import was deleted, with `<div class="rui-grid grid-cols-2">` computing three columns before and two after. The import is gone and `verify:no-css-imports` guards it. | §6 Phase 1; `memory/gates.md` |
| `probe:cascade-layer` can tell you whether the CSS is actually layered | **Refuted, and this was the largest remaining hole.** It re-derives the import list from `src/styles.css`, **strips** whatever `layer()` is written there, and adds its own to build the layered variant — so it measures "unlayered vs layered" whatever the file says. Delete `layer(components)` from a real import and the probe stays green, along with `typecheck`, `lint` and every test, because jsdom applies no stylesheets. Phase 1's whole result was one keyword on one line per component stylesheet that no gate read. `verify:css-layering` reads them. | §8 |
| "A lookup table keyed on the caller's input is a faithful port of `var(--x, 1)`" | **Refuted — it ports the read and drops the default, and that is two layout regressions.** The stylesheet answered two questions: what the caller asked for at this step, *and* what happens where they asked for nothing. A table answers only the first, so `columns={{ md: 3 }}` emitted no base class and the element fell back to the CSS **initial** value, not the stylesheet's default: `grid-template-columns: none` instead of `repeat(1, …)`, `column-count: auto` instead of `1`. Both stop the layout wrapping. **Enumerate the fallbacks in a deleted stylesheet as declarations in their own right.** | §6 Phase 2; `memory/gates.md` |
| "The bounded union closes the out-of-range hole" | **Half true, and the other half was left open.** It closes the *typed* door: `columns={7}` is a compile error, which is what the phase set out to add. It cannot close the untyped one — a count with no cell in the table emits **no class at all**, which is worse than the `var(--…, 1)` fallback it replaced, because there is then no track definition and no multi-column context. `columnClasses` falls back to the `1` cell; both test files pin it with a deliberate `@ts-expect-error`, which is the assertion and not a suppression. | §6 Phase 2 |
| "One build containing both the old stylesheet and the new utilities is a safe A/B" | **Refuted wherever §12's marker class is retained — which is everywhere in this package.** The new markup carries the very selector the deleted stylesheet defines, and that stylesheet is still loaded inside the single build, so the new side silently inherits every declaration the utilities failed to replace and the probe reports "no difference" for exactly the cases it exists to catch. **A deliberate teeth-check still passes**, because that row's difference does not depend on the leak — so passing teeth is not evidence the trap is absent. Rename the deleted stylesheet's selectors in the probe's copy; doing so turned a clean 30-reading run into two real regressions on the same code. **This is the sharpest methodological lesson of Phase 2.** | §6 Phase 2; `memory/gates.md` |
| "A class-string assertion proves the conversion" | **Refuted.** It is a test of the *input*. `vitest` stubs CSS to `""`, so it passes for a typo, for a class no build generates, and for a class that generates something else. And a fixture with hand-retyped strings measures what the author believed the component emits — take the "after" string from `renderToStaticMarkup`. | §6 Phase 2; `memory/gates.md` |
| Moving a shadowing custom property up to the component root makes it themeable | **Refuted where anything redeclares it, which §4d's own worked case did.** `ProgressBar`'s four colour modifiers redeclare the pair on the reading element and `color` defaults to `"accent"`, so relocating the base declaration changes nothing for **100%** of bars. Measured at `fadcd60`: a consumer setting `--progress-bar-fill` at `:root` already got the unchanged default, so the documented override route was dead before anyone touched it. The fix that works is to **delete** the token and let a utility read the theme var — shadowing is the defect, not the location. `--sparkline-color` relocated fine only because nothing else redeclared it. | §4d; §4c |
| A token consumed by `calc()` or `color-mix()` is "computed" and must be kept | **Refuted — the discriminator is the read *site*, not the arithmetic.** §4c spares a token because *"there is no property there for a utility to set"*, which means one consumed inside another custom property's definition. `--progress-bar-fill-end` was read inside `background-image`; a utility takes that whole declaration, `color-mix()` included, so it was deleted. Ask what property the read sits in. | §4c |
| `<Skeleton style={{ width: undefined }} />` shrinks the box to fit | **Refuted by measurement — it produced a 0px-wide box, and always had.** A Skeleton's only child is `sr-only` and out of flow, so dropping the inline `100%` landed on `width: auto`, which on an `inline-block` resolves to zero. `w-auto` and `w-fit` measure the same **0×16**. The documented escape hatch never worked, which is worth more than the fix: it was the objection that deferred this change through two phases. | §4d |
| `Combobox` proves `MultiSelect` can become a compound | **Refuted, and it changes what a lane builds.** `ComboboxRootProps` has **no required data prop at all** — eleven optional props plus `children` — and its option data exists only as registrations from its own children. So it proves a listbox compound is *achievable*; it says nothing about coexisting with a required `options` prop, which was the entire difficulty. A lane that copies it inherits a design with no answer for the filter, the chip labels or the cap. | §5; `SLOT-VOCABULARY.md` §15.12, §10.1 |
| `grep -c 'layer(' src/styles.css` counts the layered component imports | **Refuted — it is a trap that has now been quoted wrong three times, and its *own* correction was wrong too.** It returns 47 against 44 imports, because the file's own header prose mentions the token on three lines, and the two halves move independently. The correction this row shipped — filter the imports out with `grep -v '@import'` — finds only two of the three, because one prose line quotes an `@import`. Filter on the import *shape*: `grep -v '^[0-9]*:@import "\./components'`. The count is `grep -c '^@import "\./components'`; the *check* is `verify:css-layering`, which classifies every import and fails on one it cannot classify. | §2a |
| "There are zero blank lines inside comment blocks, so §2b's comment/blank caveat is inert" | **Refuted — there are 55 (51 when this row was written), and the caveat is live.** The two readings of §2b's blank percentage genuinely differ (13.2% counting them, 12.3% not), so the figure has to say which it is. The claim was false when written and survived because nothing recomputed it — **and the obvious re-measurement reproduces the same falsehood**: a blank line inside a comment carries no masked *character*, so a "does this line retain a masked character" test returns zero for exactly the lines in question. Test the comment state at the line's position. | §2b |
| Line references into files a phase touched | **Repointed by content, never by adjusting the number.** Phase 2 moved `MasonryGrid.tsx:23` (the `columns` union is now `:31`, and still is) and deleted `Grid.css` entirely, so every citation into it is now a `git show 81888c2:` invocation. `Combobox.tsx:537-542` had drifted to `:538-543` and is now a grep (it is `:578` today, which is the point). **Phase 3 rotted anchors on a scale Phase 2 did not**: `Calendar.css` → `CalendarBase.css`, `Repeater.tsx:77-127` → `:77-137`, and most `.tsx` line citations in §4a–§5, §10 and §11 moved by tens of lines. All are now greps, or `git show <sha>:` where the cited code is deleted. `memory/ledger.md`: adjusting a rotted anchor is the wrong repair — cite the quoted phrase. | §6 Phase 2; §6 Phase 3; §10 |
| "`grep -rn classNames src/components` returns zero, so the slot vocabulary is greenfield" | **True when written, false now — the vocabulary is being spent.** That grep returns ~800 and is still climbing as Phase 3 lanes land, so it is not a figure to quote; re-run it. The freeze still holds and §10's argument for it is unchanged; what has changed is that the field is no longer empty, so a new name is now a consistency question against shipped API rather than a free choice. `SLOT-VOCABULARY.md` stays authoritative. | §10 |
| `AGENTS.md` tells readers to *"always wrap classNames with `cn(...)`"*, which §4a's prop makes self-contradictory | **Discharged — already reworded.** `grep -n 'wrap classNames' AGENTS.md` returns nothing; the sentence now reads *"Always wrap class strings with `cn(...)` … Class **strings** — `classNames` is a prop name … and `cn()` on that object reads it as clsx's conditional form"*. The cited `AGENTS.md:390` is dead. | §6 Phase 5 |
| `classPrefix` is a generalisation with one value, is already violated by `ContextMenu`, and must be deleted | **Discharged in Phase 3, and every anchor the argument used is dead.** `grep -rn classPrefix src --include=*.tsx --include=*.ts \| grep -v '\.test\.'` → 0 (the one remaining hit in the tree is a `ContextMenu.test.tsx` comment recording the removal), `grep -rl classPrefix docs` → 0 (it was undocumented, which was the other half of the finding). `menu-internals.tsx` emits five *static* `menu-*` literals and `menu-internals.css` defines them; the orphan `context-menu-trigger` class is gone and `ContextMenu.test.tsx` pins its absence. The names came from `SLOT-VOCABULARY.md` §8.2, not from §8's earlier guess. Cited anchors, all rotted: `menu-internals.tsx:288,346,368,388,408`, `DropdownMenu.tsx:26`, `ContextMenu.tsx:25,81`. | §8; §6 Phase 5 |
| `docs/components/popover.md:85` becomes a *false cannot* when the arrow ships; `multi-select.md:45` becomes a lie after Phase 3 | **Both discharged — the doc edits landed with the code.** `popover.md` documents the `arrow` prop, `classNames.arrow` and the middleware; `multi-select.md` records its own earlier "no subcomponent" sentence as superseded. Recorded because `memory/README.md` §21 rates the false-cannot the worst doc-rot shape, and this is the case where it was caught in the same commit rather than after release. | §10; §6 Phase 5 |
| "~300 of 478 class literals fail the literal reachability gate" | **Unreproducible, and dropped.** No method tried yields 478; the shipped gate's own method gives **274 failing of 425 `className` attributes** at `0a61e01` and `81888c2`, and **103 of 435** at HEAD. The 2:1 shape the re-scoping argument rests on is real at the pre-Phase-3 tree and has since inverted *because* the prescribed order was followed. An unreproducible bound is not evidence, even for a conclusion that is right. | §8 |
| "`~76` sites share the focus-ring-width literal" | **Unreproducible, and dropped.** The reproducible readings are 41 (ring widths: 32 `outline: 2px` declarations + 9 `outline-2`/`ring-2` utilities) or 62 (adding the 21 `outline-offset: 2px` declarations, which is a different concept). Both carry their command in §11. The rule-width half of the same bullet — 5 rail tokens + the table marker — re-derives exactly. | §11 |
| "`CalendarBase` has 15 internals: 9 loop-generated, 6 chrome — so 6 slots + 3 applied-to-every-instance + `renderDay`, **not** 15 slots and **not** a compound" | **The category was right; the census was wrong; the prescription failed as a consequence. Owner-reviewed and settled: the shipped 15 keys stay.** Both *counts* re-derive (6 once-rendered, 9 not) and both *memberships* were wrong by one swap: `calendar-month-caption` was filed as once-rendered chrome when it is per-month-grid and conditional on `monthCount > 1`; the actual 6th once-rendered element is `calendar-picker-grid`, never named; and the 9 are not all `renderMonthGrid`'s — `calendar-picker-cell` comes from `QuickNavGrid` in a different view. "15 internals" does re-derive on the **element** reading (16 non-root names sit on 15 elements — `"calendar-label calendar-label-button"` is one element with two names); the failure was **not stating the unit and not carrying the command**, which is the `Maintenance` rule this file now enforces. **The prescription's real error was assuming `renderDay` answers the loop set** — it renders the day button's *children only*, so it reaches none of the eight non-day elements assigned to it, and "6 + 3 + `renderDay`" would have left six elements with no route at all. What shipped is **15 × (c) + 1 × (e)**, every repeated-element key merged uniformly inside its map, so **no key addresses a single instance** and the loop test is not violated. "Not a compound" held unchanged. | §5; §9 |
| "The `CalendarSlotClassNames` union is aliased by `Calendar`, `RangeCalendar`, `DatePicker` and `DateRangePicker`" | **False for the two pickers, and it was false on the type's own docblock** — which ships to consumers through the generated `.d.ts`, so it is worse than prose rot. `DatePicker` and `DateRangePicker` declare their own unions (`"control" \| "actions" \| "panel"` and `"control" \| "panel"`) and pass an explicit prop list to `Calendar`/`RangeCalendar` carrying neither `classNames` nor `renderDay`. A picker consumer gets **3** keys, not 18. `docs/components/date-picker.md` and `date-range-picker.md` already stated this correctly; the type did not. Whether the pickers should forward a second `calendarClassNames` prop is a **new public API** and an open owner question, not a bug fix. | §5; `SLOT-VOCABULARY.md` §7.2 |

> **The lesson that governs Phase 3.** The first two rows were the `className` audit's *only* two
> active-defect claims — its highest-confidence output — and both dissolved on contact with the
> source. The audit's **categories** were right; its **severity labels** were not. That is why every
> lane re-verifies at source before acting (§6 Phase 3), and why a refutation is written into the row
> as a full outcome rather than deleted.

---

## Maintenance

- **This file states current truth.** When a claim is refuted, move it to §13 with its outcome — do
  not strike it in place, and do not delete it silently either. Struck-through prose fused with live
  prose is what made the previous version require a reading guide.
- **Every number carries its command.** If you add a number without one, you have added a claim
  nobody can check and the next reader must re-measure everything.
- **Nothing here is a status report.** If a line reads as status — "an analysis is running", a ⏳ — it
  has decayed; resolve it into a result or a named precondition.
- **When a phase closes, mark it and move its lessons to `memory/`.** `bugs/PLAN.md` was retired with
  the note *"a stale plan is worse than no plan, because it is still believed."*
- **For each phase, name what would prove you wrong and build that before you start — then make it
  fail on purpose once.** A check that cannot come back red is not evidence. This plan's worst
  failure was never a wrong fact; it was being unfalsifiable while looking rigorous.
