# Phase 1 — fix decisions for the eight must-fix regressions

> ## ⚠ STATUS: WRITTEN BEFORE THE IMPLEMENTATION. THESE ARE PROPOSALS, NOT A RECORD OF WHAT SHIPPED.
>
> This document is the **pre-implementation options analysis**, committed alongside
> `PHASE1-INTERSECTION-SEARCH.md` as the evidence behind plan §7's Phase 1 DoD. Every section states
> a **recommendation** and hands two rows explicitly to the owner. **The owner then decided, and on
> the Tabs pair decided against the recommendation here.** Read the "Recommendation" headings as
> *what was proposed*, never as *what the code does*.
>
> Corrections to statements the implementation **falsified** — as opposed to recommendations it
> merely declined — are marked inline as **`⚠ SUPERSEDED`** / **`⚠ CORRECTED`**, with the original
> left standing beside each (`memory/ledger.md`, "preserving refutations in place"). The measured
> cascade facts in §0b (F1–F5) were **not** falsified and remain the useful core of this file.
>
> **What actually shipped, per row** — the outcomes, not the options:
>
> | Row | Shipped |
> | --- | --- |
> | `timeline-even-animation` | (i-b) as recommended, **plus** `animation="none"` — see the ⚠ in §1.4 |
> | `stagger-ancestor-inherit` | (i) as recommended; `Stagger.css` deleted |
> | `radio-forced-colors-focus-outline` | (i) as recommended; `verify:focus-affordance` widened |
> | `scrollreveal-no-js-opacity` | (iv) as recommended; one `!important` |
> | `tabs-scrollbar-height` / `-thumb-color` | **⚠ NOT (iv).** Owner ruled **(vi) accept**, and the implementation went further: all **three** Tabs scrollbar declarations were **deleted** — see the ⚠ in §5.4 and §6 |
> | `hero-stagger-animation-name` | (vi) accept, as flagged for the owner |
> | `hero-reveal-hidden-animation-none` | (iv) as recommended; one `!important` |
>
> So the package ships **two** `!important` declarations, not three, and `AGENTS.md` fences exactly
> those two — which is the narrower, stronger policy §13 below predicts.
>
> **Where current truth lives:** `PLAN-overridability.md` §13 (settled outcomes, do not re-derive),
> `AGENTS.md` (the layering decision, the `!important` admission test), and `memory/`. **Do not cite a
> recommendation from this file as a decision.**

Companion to `PLAN-overridability.md` §6 (Phase 1). One section per probe row, plus the comment
rewrites and the foundation follow-ups Phase 1 must record without acting on.

## How to read this

- **Every cascade claim in here was measured, not reasoned.** Each carries the measurement that
  produced it. Where a claim could only be reasoned (paint, or a browser I did not run), it says so.
- **Measurements labelled `[M1]`–`[M4]`** come from four scratch A/B builds run in `/tmp`, each a
  full Tailwind build of `../response-ui-css/src/index.css` + `src/tokens.css` unlayered plus this
  package's 46 component imports in `layer(components)` — i.e. the post-Phase-1 cascade — measured
  with `getComputedStyle` in Playwright Chromium under pinned media emulation. That is the same rig
  and the same layer topology as `scripts/probe-cascade-layer.mjs`; the scratch files are gone and
  `git status` is empty.
- **`[P]`** means the number came from `bun run probe:cascade-layer` on the current tree.
- Line numbers were re-checked at source. §0c lists the ones in `PLAN-overridability.md` that have
  drifted.

Baseline, reproduced before anything else `[P]`:

```
bun run probe:cascade-layer
  regressions: 8   inert: 0   accepted: 1   verified: 2
```

---

## 0. The cascade, measured

### 0a. Layer topology after Phase 1

`[M1]` The built stylesheet emits, in order: `@layer properties`, `@layer theme`, `@layer base`,
`@layer components`, `@layer utilities`, then unlayered rules. Walking the layered build's brace
structure and asking which block each selector falls in:

| Selector | Package | Lands in |
| --- | --- | --- |
| `.tabs-list::-webkit-scrollbar` | this | `@layer components` |
| `*::-webkit-scrollbar` (minified to `::-webkit-scrollbar`) | foundation | **unlayered** |
| `.scroll-reveal-hidden` (ours, in the `scripting` query) | this | `@layer components` |
| `.scroll-reveal-hidden` (bare `opacity: 0`) | foundation | **unlayered** |
| `.stagger-item` (ours) | this | `@layer components` |
| `.stagger-item` (foundation) | foundation | **unlayered** |
| `.fade-right` | foundation | **unlayered** |
| `.radio:focus` forced-colors outline | this | `@layer components` |
| `.focus\:outline-none:focus` | this (Tailwind) | `@layer utilities` |

### 0b. The five precedence facts every option below is priced against

All measured. **These are the constraints; do not re-derive them per section.**

| # | Fact | Measurement |
| --- | --- | --- |
| **F1** | A **normal** declaration in `@layer utilities` **loses** to an unlayered author rule, at any specificity. | `[M1]` `<div class="fade-right animate-fade-left">` → `animation-name: slide-right, fade`. The foundation's unlayered `.fade-right` (0,1,0) beat the `animate-fade-left` utility. **This is what kills option (ii) wherever the competitor is foundation-side.** |
| **F2** | An **important** declaration in `@layer components` beats an **important** declaration in `@layer utilities`, and beats an **unlayered important** consumer rule. | `[M1]` components `color: rgb(1,0,0)!` vs unlayered `rgb(0,0,3)!` → `rgb(1, 0, 0)`. `[M2]` utilities `rgb(0,2,0)!` vs unlayered `rgb(0,0,3)!` → `rgb(0, 2, 0)`. Important order is the full reverse: `theme > base > components > utilities > unlayered`. |
| **F3** | An important declaration in `@layer components` beats a consumer's **inline `style`** normal declaration. The only escape is inline `style` **with `!important`**. | `[M2]` `#a1 style="color: rgb(0,0,3)"` vs components `rgb(1,0,0)!` → `rgb(1, 0, 0)`. `#a2 style="… !important"` vs the same → `rgb(0, 0, 3)`. **This is the true price of option (iv):** not "a consumer must use `!important`", but "a consumer must use inline `style` + `!important`, which cannot target a pseudo-element or a state at all." |
| **F4** | `@keyframes` are **not** subject to cascade layers. A rule inside `@layer components` resolves the foundation's unlayered `@keyframes` by name with no precedence problem. | `[M3]` a components-layer `animation: slide-right 1s linear 10s both, fade …` held the 0% frame — `opacity: 0`, `transform: matrix(1,0,0,1,-384,0)` (= `translateX(-30%)`), `getAnimations()` → `slide-right\|fade`. Negative control with a non-existent name: `opacity: 1`, `transform: none`, `getAnimations()` empty. |
| **F5** | The foundation's `.fade-*` rules use the **`animation` shorthand**, so they implicitly set every animation longhand they omit. Sidestepping via a different longhand is dead. | `../response-ui-css/src/animations/fade.css:11-15`. `[M3]` components `animation-play-state: paused` vs unlayered `.fade-up` → `running, running`. components `animation-duration: 0s` → `0.3s, 0.3s`. |

**Corollary that decides most of this document.** When the competing rule is **unlayered and in
another package**, exactly four moves exist: *stop colliding* (change what we emit, or stop
declaring the property), `!important`, an inline `style` declaration, or accept. Option (ii) —
"move it to a Tailwind utility" — is **structurally unavailable** in that case (F1), and every
section below rejects it on F1 rather than on cost.

### 0c. `PLAN-overridability.md` line numbers — checked, three have drifted

| Plan cites | Actual | Verdict |
| --- | --- | --- |
| §3a "`Radio.css:35-38` states it at source" | the comment runs **`:34-38`** | drift — the sentence starts one line earlier |
| §6 "`Hero.css:82-86` explains" | the paragraph runs **`:83-86`**; `:82` is blank | drift |
| §6 "`scroll-reveal.css` … escape at `:7-10`" | the block runs **`:7-11`** | drift |
| §6 `Timeline.css:465`, `:526`; `Hero.css:91`, `:97`; `ScrollReveal.css:13`; `Stagger.css:18`, `:26` | exact | ✔ |
| §6 `Radio.css:39-42` inside the query opened at `:22` | exact | ✔ |
| §6 `Tabs.css:15-17` sets only `height`; `base.css:67-70` sets both | exact | ✔ |
| §6 `Stagger.css:11-14` records the delete condition | exact | ✔ |
| §6 `MasonryGrid.css:11` "no longer exists" | **confirmed** — the file is 81 lines and `:11` is now `.masonry-grid__item {`; the trailing-gap comment is gone | ✔ |
| §11 precedent `../response-ui-css/src/base.css:44-48` | the sentence runs **`:44-46`**, the `@layer base {` opens at `:48` | drift, but the claim holds |
| §4c "`--stepper-progress-color` … currently claims to be *the only override route that works*" | **false.** `Stepper.css:22-30` says "override per instance to re-skin the track" and makes **no** layering claim. The false claim lives in `Timeline.css:68-71` and `ActivityFeed.css:28-31`, which both *cite* `--stepper-progress-color` as sharing their contract | see §10 |

---

## 1. `timeline-even-animation`

`slide-left, fade` → `slide-right, fade` `[P]`

### 1.1 Mechanism, at source

**Ours** — `src/components/ui/Timeline.css:520-528`, inside `@media (width >= 40rem)` opened at
`:479`:

```css
  /* #342. The card's side and its entrance direction are decided by the same
     selector. `Timeline.Item` always ships `fade-right` (from `ScrollReveal`,
     which is what supplies the duration and easing through the `animation`
     shorthand); this replaces only the name list, so a right-hand card slides in
     from the right. Keyed to the class the reveal adds, so it applies exactly
     while the entrance is playing and goes away with it. */
  .timeline[data-align="center"] .timeline-item:nth-child(even).fade-right {
    animation-name: slide-left, fade;
  }
```

Specificity **(0,5,0)** — `.timeline` + `[data-align]` + `.timeline-item` + `:nth-child(even)` +
`.fade-right`. Property `animation-name`.

The sibling rule is `Timeline.css:461-467` at **(0,4,0)** for `align="right"`; same mechanism, no
media query, and it regresses identically (the probe covers only the `center` row, so the `right`
row is unmeasured — see §1.6).

**Competing** — `../response-ui-css/src/animations/fade.css:11-15`:

```css
.fade-right {
  animation:
    slide-right var(--MOTION-DURATION-ENTER) var(--MOTION-EASE-ENTER),
    fade var(--MOTION-DURATION-ENTER) var(--MOTION-EASE-ENTER);
}
```

Specificity **(0,1,0)**, **unlayered**, **foundation-side** (`@batthewz/response-ui-css`). It wins
purely on layer; specificity is 5× ours and irrelevant. Plan §3a's acceptance covers neither
side — it is scoped to a *consumer-authored* reset beating our ring.

The class arrives from `src/components/ui/Timeline.tsx:216-223`, which passes
`animation="fade-right"` to `ScrollReveal`, and `ScrollReveal.tsx:20-26` maps that to the foundation
class name.

### 1.2 User-visible failure

Under `align="center"` at ≥ 40rem, every card enters from the same side. Cards on the right of the
rail slide **across** the rail from the left. Same for every card under `align="right"`. This is
`#342`'s visual symptom returning by a different route.

**Not WCAG-bearing.** The motion is already gated: `ScrollReveal.tsx:70-75` returns before setting
`animating` when `usePrefersReducedMotion()` is true, so the class is never applied under
`prefers-reduced-motion: reduce`, and `fade.css:117-126` nulls it in CSS as well.

### 1.3 Hard constraint that binds every option

**`:nth-child` must remain the single source of both the card's side and its entrance direction.**
`Timeline.tsx:17-26` records `#342` in full: the item used to derive direction from a per-item React
`index` while the CSS derived the side from `:nth-child`, and a fragment child desynchronised them
(`Children.toArray` does not descend into a fragment; the DOM does), producing
`fade-right · fade-left · fade-left · fade-right` against a `left · right · left · right` layout.
`memory/README.md` §9 generalises it: *"a new layout axis is a root attribute plus stylesheet rules,
never a value threaded to each child."* Any fix that computes a direction class in TSX is a reverted
change being re-landed.

### 1.4 Options

**(i-a) Compute the direction class per item in `Timeline.tsx`.** **Rejected on §1.3**, not on cost.
This is `#342` exactly.

**(i-b) Stop emitting the foundation `.fade-*` class; let `Timeline.css` own the whole `animation`
shorthand, keyed on the same `:nth-child` selectors.** Viable, and measured.

- `[M2]` With no `.fade-*` on the item and `@layer components` carrying
  `.timeline[data-align="center"] .timeline-item { animation: slide-right var(--MOTION-DURATION-ENTER) var(--MOTION-EASE-ENTER), fade … }`
  plus `…:nth-child(even) { animation-name: slide-left, fade }`: odd → `slide-right, fade`, even →
  `slide-left, fade`, duration `0.3s, 0.3s`. Uncontested; the fight is entirely inside one layer,
  where specificity and source order work again.
- **It does not duplicate the animation library.** By **F4**, the `@keyframes` are reachable by name
  from inside the layer. What gets restated is `var(--MOTION-DURATION-ENTER) var(--MOTION-EASE-ENTER)`
  — two contract tokens, which is exactly what this design system expects to be restated. The
  `CLAUDE.md` rule 3 objection a reader will reach for is therefore much weaker than it looks; say so
  in the commit, because the instinct is strong and wrong.
- **It restores consumer override, which is the whole point of Phase 1.** `[M2]` with the fix in
  place and a consumer's `animate-fade-up` utility on the item → `slide-up, fade`. The utility wins,
  because `@layer utilities` sits above `@layer components`. Under option (iv) it would not (F2).
- **The trigger is the real cost.** The class is load-bearing as a *trigger*, not only as styling:
  `ScrollReveal.tsx:128-132` applies `animationClassMap[animation]` only while `isAnimating`, and
  `:106-115` clears `animating` on `animationend`. `Timeline.css:524-525` says so at source. If
  Timeline stops carrying `.fade-right`, something must still say *when* the entrance is playing.
  Two shapes:
  - **`data-*` state on `ScrollReveal`'s element** (the coordinator's proposal). `[M3]` measured:
    with `data-entering` on the item and the two `@layer components` rules above keyed on
    `.timeline-item[data-entering]` + `:nth-child`, odd → `slide-right, fade`, even →
    `slide-left, fade`, absent → `none`. It works exactly. It is also this plan's own house pattern
    — §5 prescribes `data-*` state modifiers for `FileUpload` so consumers can write
    `data-drag-over:*` variants. Name check against §10's ban list: `entering` / `revealing` /
    `revealed` collide with nothing on it (the banned list is slot names, and none of them is a
    reveal state). **New permanent public surface on `ScrollReveal`.**
  - A `"none"` member on `ScrollReveal`'s `Animation` union, so a caller can take the entrance over
    entirely. Additive, but it is a second new API on the same component; prefer the `data-*` alone
    and keep `animation="fade-right"` off the Timeline path by having Timeline pass nothing.

    > **⚠ CORRECTED — "pass nothing" does not exist, and this framing made the `"none"` member look
    > optional when it is not.** `ScrollReveal.tsx` defaults `animation = "fade-up"`. Passing nothing
    > therefore emits the foundation's `.fade-up` class, which sets the whole `animation` shorthand
    > and beats a layered `animation-name` exactly as `.fade-right` did. It does not remove the
    > collision; it **changes its direction** — every Timeline card would enter upward from the
    > foundation's rule instead of sideways from ours, with the same rule losing.
    >
    > ```
    > grep -n 'animation = ' src/components/animation/ScrollReveal.tsx   # animation = "fade-up",
    > ```
    >
    > **Both APIs shipped**, because both are needed: `animation="none"` is what stops the class
    > being emitted, and `data-entering` is what tells the stylesheet when the entrance is playing.
    > The recommendation's "prefer the `data-*` alone" is the part that was wrong — the `data-*`
    > alone leaves a live competitor on the element.
- **Breaking DOM change.** `Timeline.Item` stops emitting `.fade-right`. Priced in §1.6.

**(ii) Move to a Tailwind utility.** **Rejected on F1.** The competitor is foundation-side and
unlayered; `[M1]` measured a `animate-fade-left` utility losing to `.fade-right` on the same element.
This is not a cost judgement — the move cannot work.

**(iii) Inline `style`.** **Rejected on §1.3.** The value is selected by `:nth-child`, i.e. by DOM
position, which no inline declaration can read. Writing it inline requires knowing parity in React,
which is `#342`. Separately it would fail plan §4d's test — the value's inputs include no prop. The
one value for which §4d's *reason* structurally cannot apply is `inherit` (see §2.4); it is not in
play here.

**(iv) `!important` inside the layer.** Works — `[M1]` measured
`.rui-imp { animation-name: slide-left, fade !important }` in `@layer components` on an element
carrying `.fade-right` → `slide-left, fade`. Cost, priced against F2/F3: **a consumer can never
re-point a Timeline item's entrance.** Not with a class, not with their own stylesheet at any
specificity, not with `!important`, not with an inline `style`. Only inline `style` + `!important`,
which nobody can write for `:nth-child(even)`. That is the *opposite* of the §1 goal for a property
whose value is a taste judgement wearing a layout constraint's clothes. It is also the cheapest fix
by a wide margin: two `!important`s and no API change.

**(v) Unlayered carve-out (`Timeline.css` outside the layer).** Rejected. §3a's reasoning transfers
verbatim: *"one precedence regime, no exceptions to police."* Worse here than for focus rings —
`Timeline.css` is 529 lines and 114 declarations, so carving it out re-creates the whole
three-axis precedence problem Phase 1 exists to collapse (plan §6, "Why this must precede Phase 4"),
in the single largest stylesheet in the package.

**(vi) Accept.** No honest owner reason exists. `#342` is a closed bug with a test; accepting this row
re-opens it. It is not a policy question, and `accepted` is not a parking spot (plan §7).

### 1.5 Recommendation

**(i-b), with the `data-*` trigger.** It deletes the collision instead of out-ranking it, keeps
`:nth-child` as the single source (§1.3), and — measured — leaves a consumer able to re-point the
entrance from `className`, which is the Phase 1 prize. It is the same shape as §3b's `--masonry-gap`
result: *deleting the competitor beat layering it*.

**What it costs, stated plainly:**

1. New permanent public surface on `ScrollReveal` (one `data-*` attribute). Freeze the name before
   fan-out — it is a one-way door.
2. `Timeline.Item` stops emitting a foundation `.fade-*` class. Breaking for anyone keying CSS or a
   test off `.timeline-item.fade-right`. Plan §12 retains **BEM hook classes this package defines**;
   `.fade-right` is a foundation utility this package chose to *consume*, not a hook it owns, so §12
   does not protect it — but the class is documented (`docs/components/timeline.md:520-525`) and
   asserted twice in tests, so it is a real break and belongs in the changelog.
3. `Timeline.css` grows by ~4 declarations (the two shorthands) and re-states two motion tokens.

**If the owner will not spend the API change, (iv) is the honest cheaper answer** — but record that
it permanently removes the consumer's route to the entrance, and that it makes Timeline the precedent
for "we beat unlayered foundation rules with `!important`", which is the wrong precedent to set on
the largest stylesheet in the package. I recommend against it here and for it in §4.

### 1.6 Proving it, and making it fail on purpose

- **Redden the row:** in `Timeline.tsx`, restore `animation="fade-right"` on the `ScrollReveal` (or
  delete the `data-*` from the emitted props) while leaving `Timeline.css`'s new shorthand rules in
  place. `timeline-even-animation` must go back to `slide-right, fade`. If it stays green, the
  `data-*` is not what the rule is keyed on and the fix is not wired up.

  > **⚠ SUPERSEDED — editing `Timeline.tsx` cannot redden the probe at all.** No probe row reads any
  > TSX. `scripts/probe-cascade-layer.mjs` builds two stylesheets from `src/styles.css` and measures
  > them against a **hand-written HTML fixture** (`const FIXTURE = ...`); the markup is authored in
  > the script, not rendered from React. Changing what `Timeline.tsx` emits changes nothing the probe
  > can see, so this instruction would have "proved" the fix by watching a row stay green for a
  > reason unrelated to the edit — the exact shape `memory/gates.md` calls a gate that is
  > structurally incapable of failing.
  >
  > **The reddening edit has to be in the fixture or the CSS.** As shipped, the row's own `note`
  > carries it: *"Add `fade-right` to `#tl-2` in the fixture to redden it."* The TSX half is real but
  > belongs to a different instrument — `Timeline.test.tsx` asserts the emitted `data-entering` and
  > the absence of a direction class, which is where a `Timeline.tsx` regression shows up.
- **Add the missing row.** The probe has no fixture for `align="right"` (`Timeline.css:461-467`),
  which regresses by the same mechanism at (0,4,0). Plan §6's own lesson — *"a probe's row list is an
  allowlist"* — applies to this fix's own coverage. Add `timeline-right-animation` with
  `expectBefore: "slide-left, fade"` in the same commit.
- **Assert the `data-*` in jsdom.** Unlike the CSS, the attribute *is* visible to vitest, so
  `Timeline.test.tsx` can assert every item carries it and none carries a direction-specific marker
  — which is the `#342` invariant restated, not weakened.

### 1.7 Blast radius

| Kind | Where | What to do |
| --- | --- | --- |
| Test | `src/components/ui/Timeline.test.tsx:178-179` and `:314-315` — `expect(item).toHaveClass("fade-right"); expect(item).not.toHaveClass("fade-left")`, inside the `#342` fragment test and the `align="right"` test | Rewrite to assert the new marker. **Preserve the claim**: "every item ships the same entrance marker; direction is CSS-only." Deleting the assertion instead would delete `#342`'s guard. |
| Test | `src/components/animation/ScrollReveal.test.tsx:153,159,171-172,244,253,301-302` assert `fade-up` | Unaffected — `ScrollReveal`'s default path keeps `animationClassMap`. Only Timeline stops using it. |
| Doc | `docs/components/timeline.md:520-525`: *"Nothing in `Timeline.css` declares an animation; the entrance comes from the shared `fade-right` class … `Timeline.css` does re-point that class's `animation-name`"* | **Answer it, do not delete it.** It is an accurate description of a mechanism the fix replaces. Rewrite to: Timeline owns the shorthand, still reads the two shared motion tokens, still welds direction to side through `:nth-child`. |
| Doc | `docs/components/timeline.md:536-541` (the `#342` Gotcha, which names the `fade-right · fade-left` symptom) | Keep the lesson; update the class names it quotes. |
| Doc | `docs/components/scroll-reveal.md:139-142` — *"It works by toggling animation classes from `@batthewz/response-ui-css` onto its element"* | Add the `data-*`; the class toggling is unchanged for every other consumer. |
| Docblock | `src/components/ui/Timeline.tsx:212-215` (the "Always the same entrance class" comment) | Rewrite for the new mechanism, keeping the `#342` reasoning. |
| Examples | `src/components/ui/Timeline.examples.tsx` — no `fade-*` reference (`grep -rn 'fade-' src/components/ui/Timeline.examples.tsx` → 0) | Nothing to fix. |
| Examples | `src/components/animation/ScrollReveal.examples.tsx:19` uses `animation="fade-right"` | Unaffected; the prop stays. |

---

## 2. `stagger-ancestor-inherit`

`0.999s` → `0.05s` `[P]`

### 2.1 Mechanism, at source

**Ours** — `src/components/animation/Stagger.css:18-21`, preceded by a 17-line comment that states
the mechanism and its own delete condition:

```css
.stagger-item {
  --stagger-delay: inherit;
  animation-delay: calc(var(--stagger-index, 0) * var(--stagger-delay, var(--MOTION-STAGGER-DELAY)));
}
```

Specificity **(0,1,0)**. Two declarations: the custom property `--stagger-delay`, and
`animation-delay`. `Stagger.css:7-9` states the current precedence in the file itself: *"Order: this
file is imported after the css package (see `src/styles.css`), unlayered and at equal specificity,
so it wins."*

**Competing** — `../response-ui-css/src/animations/stagger.css:2-6`:

```css
.stagger-item {
  --stagger-delay: var(--MOTION-STAGGER-DELAY);
  animation-delay: calc(var(--stagger-index, 0) * var(--stagger-delay));
  animation-fill-mode: both;
}
```

Specificity **(0,1,0)**, **unlayered**, **foundation-side**. Both of our declarations lose on layer.
Not covered by §3a.

The mechanism is `memory/traps.md` §K bullet 1 and §P bullet 6 in one place: a custom property
re-declared on the element that consumes it cannot be reached from any ancestor, and the in-package
answer is to write it where nothing can shadow it.

### 2.2 User-visible failure

`--stagger-delay` set by a consumer on **any ancestor** — their own CSS, a wrapper, a theme scope —
stops reaching `animation-delay`. Every staggered group silently falls back to
`--MOTION-STAGGER-DELAY` (50ms). The `staggerDelay` prop still works (`Stagger.tsx:49` writes the
variable inline). The public contract that dies is source 2 of the three documented in
`docs/components/stagger.md:104-109`.

**Not WCAG-bearing.** Reduced motion is unaffected: `Stagger.tsx:48` zeroes `--stagger-index`, and
both stylesheets carry a `prefers-reduced-motion` guard.

### 2.3 Options

**(i) Delete the competition — stop declaring the two properties at all, and hand the item a value
nothing can shadow.** This is the recommendation, and it is measured. Shape:

- Stagger's **container** (an element this package renders, with no competing rule anywhere) resolves
  the fallback once into a private variable:
  `--_stagger-step: var(--stagger-delay, var(--MOTION-STAGGER-DELAY))`.
- Each **item** carries, inline, `--stagger-delay: var(--_stagger-step)` alongside the existing
  `--stagger-index`.
- **`Stagger.css` is deleted in full** (29 lines, 3 declarations). One fewer import in
  `src/styles.css`; one fewer cross-package duplicate.

`[M4]`, measured with `Stagger.css` removed from the layered build entirely:

| Case | `--stagger-delay` resolved on the item | `animation-delay` (index 2) |
| --- | --- | --- |
| ancestor sets it in a **consumer stylesheet** (300ms) | `300ms` | **0.6s** ✔ (this is the regressing path) |
| ancestor sets it inline (200ms) | `200ms` | 0.4s ✔ |
| **nobody sets it** | `50ms` | **0.1s** ✔ — the contract token default survives |
| consumer sets it **on the Stagger container itself** (500ms) | `500ms` | 1s ✔ |
| `staggerDelay` prop (150ms) over an ancestor's 300ms | `150ms` | 0.3s ✔ — the prop still wins |
| **control**: no inline var at all, ancestor 900ms | `50ms` | 0.1s — the regression, reproduced |
| every row above under `prefers-reduced-motion: reduce` | unchanged | **0s** ✔ |

The last row is the one that matters most: because we declare **no** `animation-delay`, the
foundation's own guard (`stagger.css:9-13`) applies untouched, so **both** reduced-motion mechanisms
survive — the JS index zeroing and the CSS zeroing that `docs/components/stagger.md:153-156` promises
as "two independent ways."

**(ii) Move to a Tailwind utility** (`[--stagger-delay:inherit]`). **Rejected on F1** — an arbitrary
property lands in `@layer utilities` and still loses to the unlayered `.stagger-item`. `[M1]`
measured the equivalent shape (`noscript:opacity-100` losing to unlayered `.scroll-reveal-hidden`).
Plan §4d also names arbitrary properties a consumer-side tool.

**(iii) Inline `style` — the plain `inherit` form.** Works partially, and it is the honest reading of
the §4d exemption, so it is worth stating precisely.

- **`inherit` is the one value for which §4d's reason structurally cannot apply**, and it *is* in
  play here. §4d's objection is that an inline declaration freezes a value so a consumer's `:root`
  theme loses permanently. `inherit` is not a value; it is the lookup. An inline
  `--stagger-delay: inherit` makes the consumer's ancestor value *win*, which is the opposite of the
  failure §4d describes. Measured: `[M1]` inline `inherit` with an ancestor at 777ms and index 2 →
  `1.554s`, with **no** `animation-delay` declaration from us at all.
- **But `inherit` alone breaks the default.** `[M2]` inline `inherit` with **no** ancestor value and
  no inline `animation-delay` → `animation-delay: 0s`. The foundation's `calc(… * var(--stagger-delay))`
  has no fallback (`stagger.css:4`), so a guaranteed-invalid `--stagger-delay` invalidates the whole
  declaration and 50ms becomes 0ms. Adding an inline `animation-delay: calc(…, var(--MOTION-STAGGER-DELAY))`
  fixes that (`[M2]` → `0.1s`) — but `[M2]` also measured that an inline `animation-delay` **makes the
  reduced-motion CSS guard inert**: under `reducedMotion: reduce` the item still read `1.2s`.
- So the plain-`inherit` route costs one of the two documented reduced-motion mechanisms. The
  `var(--_stagger-step)` form in (i) is the same exemption with the fallback carried in the
  reference, which is why it costs nothing there. **Prefer (i); (iii) is (i) done less well.**

**(iv) `!important` on both declarations.** Works, and its cost is unusually easy to see: by **F3**,
`--stagger-delay: inherit !important` in `@layer components` beats an inline **normal** declaration —
which is what the `staggerDelay` prop writes (`Stagger.tsx:49`). **The `!important` fix kills the
public prop.** Rejected.

**(v) Unlayered carve-out.** Rejected on §3a's reasoning. Note the temptation is real here — the file
is 29 lines and self-contained, which is exactly the shape that makes a carve-out feel free and makes
it an exception someone has to police forever.

**(vi) Accept.** No honest reason. `docs/components/stagger.md:104-118` documents source 2 as a
supported override with its mechanism spelled out; accepting silently falsifies a published contract,
which is `memory/README.md` §8's failure mode exactly.

### 2.4 Recommendation

**(i), the `--_stagger-step` indirection, with `Stagger.css` deleted.** It removes the collision
rather than out-ranking it, keeps every one of the three documented delay sources working, keeps both
reduced-motion mechanisms, keeps the `.stagger-item` class emitted (so plan §12 and every
class-asserting test are untouched), and **discharges the delete condition the file itself records**
(`Stagger.css:11-14`) without needing the foundation change §9 records.

**What it costs:**

1. One new private custom property, `--_stagger-step`, on the Stagger container. Underscore-prefixed
   per `memory/affordances.md` — internal, may change. Per plan §4c it is in the "Computed" bucket (a
   fallback resolution), not a single-use baseline alias, so the delete rule does not reach it.
2. `Stagger.tsx:40` currently passes `style={style}` raw. It must become
   `style={{ "--_stagger-step": …, ...style }}` so a caller's `style` still wins last — which
   falsifies `docs/components/stagger.md:139-144` (*"`style` reaches the container untouched … nothing
   of the component's own is merged into it"*). That sentence must be rewritten, not deleted.
3. The item now always carries an inline `--stagger-delay`, where today it carries one only when the
   prop is passed.

### 2.5 Proving it, and making it fail on purpose

- **Redden the row:** remove the inline `--stagger-delay: var(--_stagger-step)` from
  `Stagger.tsx`'s item wrapper (keep `--_stagger-step` on the container).
  `stagger-ancestor-inherit` must return to `0.05s`. `[M4]`'s control row is that exact measurement,
  so it is known to be reachable.
- **A second, free fail-first.** `Stagger.test.tsx:132-138` asserts
  `item.style.getPropertyValue("--stagger-delay")` is `""` when the prop is omitted. The fix makes
  the item always carry it, so **that test goes red on the first run** — an in-repo check that
  reddens without anyone building one. Rewrite it to assert the `var(--_stagger-step)` form.
- **Re-assert the precondition.** `[M4]`'s "nobody sets it → 0.1s" row is the one a fixture error
  would silently pass. Keep it as an added probe row (`stagger-token-default`, `expectBefore: 0.1s`),
  because the whole risk of this fix is losing the token default to an invalid `var()`.

### 2.6 Blast radius

| Kind | Where | What to do |
| --- | --- | --- |
| Test | `Stagger.test.tsx:132-138` — "writes no delay variable at all when the prop is omitted" | Goes red. Rewrite to the var-reference form. |
| Test | `Stagger.test.tsx:120-130` — "does not leave the variable on the container, where it is shadowed" (asserts the container has no `--stagger-delay`) | **Stays green, and must.** The fix writes `--_stagger-step`, deliberately not `--stagger-delay`, on the container. Writing `--stagger-delay` there would re-open `#17`. |
| Test | `Stagger.test.tsx:140-150` — "leaves a caller `style` on the container untouched by the delay" | Stays green (`marginTop` survives), but the test's *name* becomes misleading. Rename and add an assertion that `--_stagger-step` is present and a caller `style` key still wins. |
| Test | `Stagger.test.tsx:45-58` — a 14-line comment recording the current mechanism with a Firefox 146 measurement | Rewrite with the new mechanism and re-measure. Do not delete the `#17` history. |
| Test | `Stagger.test.tsx:32,39,68,90,149,164` query `.stagger-item` | Unaffected — the class is still emitted. |
| Doc | `docs/components/stagger.md:111-118` — the whole *"The middle one only works because `Stagger.css` … resets `--stagger-delay` to `inherit` … it is unlayered and imported after the foundation, so it wins on source order"* paragraph, **including** *"a change to the foundation's `animation-delay` on `.stagger-item` will not take effect"* | Fully replaced. The new mechanism does not shadow the foundation's rule at all, so the last sentence inverts: a foundation change **does** now take effect. That is an improvement worth stating. |
| Doc | `docs/components/stagger.md:130-134` — *"only with *this* package's stylesheet loaded; the foundation alone shadows it on `.stagger-item`"* | Still true in substance (the inline var comes from this package's TSX, not its CSS) but the reason changes. Rewrite. |
| Doc | `docs/components/stagger.md:139-144` — the `style`-untouched claim | Now false. Rewrite (see §2.4 cost 2). |
| Doc | `docs/components/stagger.md:148-156` — the Accessibility section's "two independent ways" | **Stays true** under (i). Under (iii) it would have become false; that asymmetry is a reason to prefer (i). |
| Doc | `docs/components/stagger.md:92-97` — *"It stamps each child with the `.stagger-item` class … and writes two custom properties"* | Now three (`--stagger-index`, `--stagger-delay`, and `--_stagger-step` on the container). Update the table. |
| Docblock | `src/components/animation/Stagger.tsx:13-17` (the `staggerDelay` docblock, which explains the shadowing) | Rewrite. |
| Examples | `Stagger.examples.tsx:33,46,57` reference `.stagger-item` in prose only | `:46` says the prop *"lands on each item wrapper, which is where `.stagger-item` reads it"* — still true. No code change. |
| Gate | Deleting a sibling `.css` may change what `verify:component-docs` can resolve for `stagger.md`'s token table (`memory/traps.md` §D: it follows `./` imports only) | Run `bun run verify:component-docs` before and after; expect to move the table's source of truth from CSS to TSX. |
| Gate | `scripts/probe-cascade-layer.mjs:64-72` throws if the derived import count drops below 40 | 46 → 45. Fine, but the error string says "expected ~46"; update it. |

---

## 3. `radio-forced-colors-focus-outline`

`2px` → `0px` `[P]` — **the only unambiguously WCAG-bearing row of the eight.**

### 3.1 Mechanism, at source

**Ours** — `src/components/form/Radio.css:34-42`, inside `@media (forced-colors: active)` opened at
`:22`:

```css
  /* Forced colours also set `box-shadow: none`, which erases the ring recipe —
     the one focus affordance that survives is an outline. This rule out-weighs
     the component's own `focus:outline-none` without a specificity trick:
     both are (0,2,0), and Tailwind's utility is in `@layer utilities` while
     this file is unlayered. */
  .radio:focus {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
```

Specificity **(0,2,0)**. The relevant property is `outline-style` — the shorthand sets it to `solid`,
and `outline-width` computes to `0px` whenever `outline-style` is `none`.

**Competing** — `focus:outline-none`, i.e. `src/util/focus.ts:71`:

```ts
/** Outline reset for a `focusRingControl` site, keyed to match it. */
export const focusOutlineResetControl = "focus:outline-none";
```

applied at `src/components/form/Radio.tsx:34`. Compiles to `.focus\:outline-none:focus` at
**(0,2,0)** in **`@layer utilities`**. `docs/components/radio.md:280-282` states the property
precisely: *"Tailwind v4's `outline-none` compiles to `outline-style: none`."*

**This competitor is in-package, and it is ours.** Both rules are written by this package; the only
thing that changes is which of our own two statements wins. Plan §3a's acceptance explicitly does not
cover it, and `memory/gates.md` records the trap: two rows measuring `2px → 0px` with opposite
dispositions, distinguished by *who authored the winning rule*.

### 3.2 User-visible failure

In forced-colours mode a focused `<Radio>` has **no focus indicator at all**. The `ring` recipe is a
`box-shadow`, which forced colours forces to `none`; the outline that replaces it is deleted by our
own utility.

**WCAG 2.4.7 Focus Visible (AA)**, and **1.4.11 Non-text Contrast (AA)** for the indicator itself.
The affected users are exactly the high-contrast population the rule was written for.

### 3.3 Options

**(i) Delete the competition — stop emitting the reset in the environment where the outline must
paint.** `not-forced-colors:focus:outline-none`. Measured `[M1]`/`[M2]`, both directions:

| Environment | class on `.radio` | `outline-style` | `outline-width` |
| --- | --- | --- | --- |
| `forced-colors: active` | `not-forced-colors:focus:outline-none` | `solid` | **`2px`** ✔ |
| `forced-colors: active` | `focus:outline-none` (today) | `none` | `0px` ✗ |
| default | `not-forced-colors:focus:outline-none` | `none` | `0px` ✔ (unchanged) |
| default | `focus:outline-none` (today) | `none` | `0px` |

This is (i) in the truest sense: after it there is no collision, because in forced colours nothing
competes. It needs no `!important`, no carve-out, and leaves the CSS rule's `Highlight` colour intact.

**(ii) Move the forced-colours outline into a Tailwind utility** so both live in `@layer utilities`.
Measured working — `[M1]` `focus:outline-none forced-colors:focus:outline-2 forced-colors:focus:outline-solid`
→ `2px solid`. **Rejected on two counts:** it relies on Tailwind's internal variant sort order to
break an equal-specificity tie, which is not a contract; and `outline-2 outline-solid` leaves
`outline-color` at `currentColor`, silently dropping the deliberate `Highlight` keyword that
`Radio.css:34-38` and `docs/components/radio.md:282-284` both explain.

**(iii) Inline `style`.** Rejected — no inline declaration can be keyed on `:focus` or on
`@media (forced-colors: active)`.

**(iv) `!important` on the CSS rule.** Works. Cost by F2/F3: a consumer could no longer suppress or
restyle the radio's forced-colours outline from any stylesheet. Narrow, but strictly worse than (i),
which needs no `!important` at all. Rejected as unnecessary.

**(v) Unlayered carve-out for `Radio.css`.** Rejected on §3a — and note the irony: §3a already
declined a carve-out *for focus rings specifically*, which is what this is.

**(vi) Accept.** Refused. Plan §3a: *"nobody has accepted it."* It is a WCAG 2.4.7 defect caused
entirely in-package.

### 3.4 Recommendation

**(i), applied to the shared constant** — `focusOutlineResetControl` becomes
`"not-forced-colors:focus:outline-none"`.

**Two costs, and the second is easy to miss.**

1. **It changes six other components' forced-colours behaviour.** `focusOutlineResetControl` is
   consumed by `Input.tsx:31`, `Combobox.tsx:308`, `Textarea.tsx:31`, `Select.tsx:37`,
   `OTPInput.tsx:229`, `ColorPicker.tsx:383` and `Radio.tsx:34`, and
   `grep -rn 'forced-colors' src --include=*.css` returns **exactly one** block — Radio's. So today,
   in forced colours, those six controls reset the UA outline and their replacement ring is a
   `box-shadow` that forced colours nulls: **they have no focus indicator either.** The fix
   incidentally closes that for all six. That is the right outcome, but `memory/traps.md` §E is
   explicit — *"refactors smuggle unannounced behaviour changes alongside the announced one"* — so it
   must be **announced**, in the commit and in each affected component's doc, not folded in silently.
   Alternatively, apply the variant only in `Radio.tsx` and file the other six as a separate row;
   that is defensible but leaves six known 2.4.7 defects open behind a one-word fix, and it puts two
   spellings of one idea in `src/util/focus.ts` (`CLAUDE.md` rule 3).
2. **It silently blinds `verify:focus-affordance` unless the guard's vocabulary is widened.**
   `scripts/verify-focus-affordance.mjs:184-190`'s `isTwReset` requires every variant on a reset to be
   a focus variant or to match `STATE_NEUTRAL_VARIANT` (`:161-162`). Checked directly:
   `STATE_NEUTRAL_VARIANT.test("not-forced-colors")` → **`false`**. So the guard would stop
   recognising the reset at all and drop Radio (and the six others) out of its coverage — green, and
   blind. `not-forced-colors` *is* state-neutral by the docblock's own definition ("narrow WHERE a
   utility applies but not to which interaction state"), so adding `forced-colors|not-forced-colors`
   to that regex is a correct one-line widening — and per `memory/gates.md`, it must then be **made
   to fail on purpose once**. This is `memory/gates.md`'s "a new gate's exemptions are where the next
   bug lives" arriving on schedule.

Minor residual risk, reasoned not measured: `@media not (forced-colors: active)` evaluates as
"unknown, therefore no match" in an engine that does not implement the `forced-colors` feature, so
such an engine would keep the UA outline *beside* the ring. Cosmetic, and every current engine
implements it.

### 3.5 Proving it, and making it fail on purpose

- **Redden the row:** revert `focusOutlineResetControl` to `"focus:outline-none"`.
  `radio-forced-colors-focus-outline` must return to `0px`. `[M1]`'s control row is that exact
  measurement.
- **Two free fail-first checks.** `src/util/focus.test.ts:53` hard-codes
  `focusOutlineResetControl: { literal: "focus:outline-none", pairs: "focusRingControl" }`, and
  `:107-120` asserts the reset's variant list equals its paired recipe's. **Both go red immediately**
  — the literal table catches the value and the variant assertion catches the shape. Update both
  deliberately; `memory/traps.md` §F is explicit that this table is the thing that keeps a recipe
  change from passing silently.
- **Add rows for the six.** The probe has one forced-colours row. After this fix, add at least
  `input-forced-colors-focus-outline` so the six components' new indicator is measured rather than
  inferred — and expect it to be `inert` before the fix, which is a *result* (they have no outline
  rule to measure), not a fixture bug. Prefer a row that measures the UA outline's presence.

### 3.6 Blast radius

| Kind | Where | What to do |
| --- | --- | --- |
| Source | `src/util/focus.ts:71` | The one-line change. Keep it a single flat string literal — `memory/traps.md` §D: a `${…}`-composed constant resolves to nothing in the guard. |
| Test | `src/util/focus.test.ts:53`, `:107-120` | Both go red. Update. |
| Gate | `scripts/verify-focus-affordance.mjs:161-162` | Widen `STATE_NEUTRAL_VARIANT`; then make it fail on purpose. |
| Doc | `docs/components/radio.md:276-284` — the Gotcha that explains the reset, `outline-none` → `outline-style: none`, and why `Radio.css` restores a `Highlight` outline | Still correct in every particular. Add the variant, and add that the reset now stands down in forced colours. **Answer it, do not rewrite it away** — it is the most accurate prose in the package on this mechanism. |
| Doc | `docs/components/radio.md:333-338` — *"Focus is visible, themed, and round."* | Add the forced-colours clause. |
| Doc | `docs/components/{input,select,textarea,otp-input,combobox,color-picker}.md` | Each gains a forced-colours focus indicator it did not have. `memory/gates.md`: a doc that under-promises steers users away from a working feature. Announce it on each page. |
| Source | `src/components/form/Radio.css:34-38` — the comment's *"Tailwind's utility is in `@layer utilities` while this file is unlayered"* | **False after Phase 1**, in the direction that matters. Rewrite: both are now layered, `components` sits below `utilities`, and the reset is keyed off forced colours so it never competes. See §10. |
| Examples | none reference the reset (`grep -rn 'outline-none' src --include=*.examples.tsx` → 0) | Nothing to fix. |

---

## 4. `scrollreveal-no-js-opacity`

`1` → `0` `[P]`

### 4.1 Mechanism, at source

**Ours** — `src/components/animation/ScrollReveal.css:12-16`, preceded by an 11-line comment that
states the mechanism:

```css
@media (scripting: none) {
  .scroll-reveal-hidden {
    opacity: 1;
  }
}
```

Specificity **(0,1,0)**. `ScrollReveal.css:7-8`: *"Unlayered author CSS at equal specificity,
imported after the css package, so this wins on source order."*

**Competing** — `../response-ui-css/src/animations/scroll-reveal.css:2-4`:

```css
.scroll-reveal-hidden {
  opacity: 0;
}
```

Specificity **(0,1,0)**, **unlayered**, **foundation-side**. Not covered by §3a. Note the asymmetry
that makes this row hard: our rule is *inside* a media query and theirs is not, which today is
irrelevant (equal specificity, later source order) and after Phase 1 is still irrelevant — the layer
decides, and a media query contributes nothing to specificity.

### 4.2 User-visible failure

With scripting off, every `ScrollReveal` subtree stays at `opacity: 0` **permanently**. Nothing ever
clears it: only an `IntersectionObserver` callback does, and that needs JavaScript
(`ScrollReveal.tsx:86-102`). `ScrollReveal.css:4-5` names the worst case — *"including the page's
`<h1>` when the reveal wraps a Hero"*. `Timeline.Item` also routes through `ScrollReveal`
(`Timeline.tsx:216-223`), so a whole timeline vanishes too.

**Severity, stated precisely rather than as "WCAG".** The plan labels this row "WCAG" without naming
a criterion, and I could not find one that squarely fits: WCAG 2.2 conformance permits relying on
JavaScript, so "invisible with scripting off" is not itself an SC failure. The nearest applicable
criterion is **1.4.3 Contrast (Minimum) (AA)** — invisible text is 1:1 — but that is a stretched
reading. What this *is*, unambiguously, is a **documented promise the package would stop keeping**:
`docs/components/scroll-reveal.md:156-160` and `docs/components/hero.md:336-342` both state the
scripting-off cover as a shipped behaviour, and `ScrollReveal.tsx:34-40` sells `animate={false}` as
the cover for the *other* three uncovered environments on the strength of this one being covered.
`memory/README.md` §8: when the thing at risk is a claim rather than a behaviour, the claim is what
must be gated — and here it already is, by this probe row. Treat it as must-fix on that basis, and do
not overstate the WCAG framing in the commit.

### 4.3 Options

**(i) Delete the competition — ScrollReveal owns its own hidden class.** Emit e.g.
`rui-scroll-reveal-hidden` and declare `opacity: 0` in `ScrollReveal.css`, so no foundation rule
competes. Measured trivially sound, and it needs no `!important`.

**Cost, and it is the cost plan §12 exists to price.** `.scroll-reveal-hidden` is a foundation class
this package deliberately re-uses, and it is load-bearing in four places at once:

- **§12 retention.** Astro/Rails consumers of `response-ui-css` target that name; changing it splits
  the two packages' vocabulary for one component.
- **Documented API.** `docs/components/scroll-reveal.md:139-142` and `:156-160`,
  `docs/components/spotlight.md:218`, `docs/components/hero.md` all name it.
- **Cross-component CSS.** `Hero.css:97` keys `.hero__content .scroll-reveal-hidden .stagger-item`
  off it. Renaming means editing Hero in the same commit, which couples two components' lanes.
- **Tests.** `ScrollReveal.test.tsx:88,171,227,244,271,301`, `Swimlane.test.tsx:151,178`,
  `Spotlight.test.tsx:32` all assert or construct the string — nine sites across three components,
  and `Spotlight.test.tsx:32` **hand-builds markup** with it, so a rename makes that fixture silently
  stop representing the component.

Also: the foundation's reduced-motion sibling (`scroll-reveal.css:7-11`) would have to be restated
in-package, which re-creates the cross-package duplicate §2 just deleted.

**(ii) Move to a Tailwind utility** (`noscript:opacity-100`). **Rejected on F1, measured directly.**
`[M1]` `<div class="scroll-reveal-hidden noscript:opacity-100">` under `scripting: none` → `opacity: 0`.
The plan predicted this at §6; it is now measured rather than asserted.

**(iii) Inline `style`.** Rejected — an inline declaration cannot be conditioned on
`@media (scripting: none)`, and an unconditional inline `opacity: 1` would defeat the reveal itself.

**(iv) `!important` inside the layer.** Works, and is the **narrowest `!important` available anywhere
in Phase 1**. `[M2]` a components-layer `@media (scripting: none) { … { opacity: 1 !important } }` on
an element also carrying `.scroll-reveal-hidden` → `opacity: 1`. `[M1]` the utility form
(`noscript:opacity-100!`) also works, at `@layer utilities`.

What a consumer loses, exactly: the ability to set `opacity` on `.scroll-reveal-hidden` **from a
stylesheet, while scripting is off**. That is one property, on one class, inside a media query that
matches only in an environment where the alternative is that their content is invisible. By F3 they
retain inline `style` + `!important`. I cannot construct a consumer who wants the thing they lose.

**(v) Unlayered carve-out** for a 17-line file. Rejected on §3a. It is the most tempting carve-out in
the set — one file, one rule, no other declarations to police — which is precisely why granting it
establishes that a small file may opt out, and the next one will be `Tabs.css`.

**(vi) Accept.** Refused. It would silently falsify two doc pages and delete the only cover for an
environment the dev gallery structurally cannot show (plan §11).

### 4.4 Recommendation

**(iv), as `opacity: 1 !important` on the existing rule at `ScrollReveal.css:14`.** One character
class of change, zero API surface, zero DOM change, zero test churn, and the blast radius is a single
property inside a single media query.

**What it costs:** the package now carries one `!important` in `@layer components`, which by F2/F3 is
the strongest position in the author origin short of an inline `!important`. That is a precedent, and
it must be fenced with a comment saying **why this one is allowed and Timeline's is not**: the
declaration exists to guarantee content is visible in an environment where no override is
meaningful, and the property it wins is not a design decision a consumer would reasonably re-point.
Without that sentence in the file, the next reader reads it as licence.

**Recorded, per plan §6:** the cheaper fix is foundation-side and is ~3 lines. See §9.

### 4.5 Proving it, and making it fail on purpose

- **Redden the row:** delete the `!important` from `ScrollReveal.css:14`.
  `scrollreveal-no-js-opacity` must return to `0`. `[M1]`'s normal-utility measurement is the same
  value from a different route, so the row is known to be able to come back red.
- **Do not read this row's green as covering the sibling.** `ScrollReveal.tsx:34-40` documents three
  environments and covers two; the third (scripting enabled, bundle never executes) is unreachable by
  CSS and stays uncovered. Nothing in this fix changes that, and the doc must keep saying so.

### 4.6 Blast radius

| Kind | Where | What to do |
| --- | --- | --- |
| Source | `src/components/animation/ScrollReveal.css:12-16` | Add `!important` plus the fencing comment. |
| Source | `src/components/animation/ScrollReveal.css:7-8` — *"Unlayered author CSS at equal specificity, imported after the css package, so this wins on source order"* | **False after Phase 1.** Rewrite: it is in `@layer components`, it would lose to the unlayered foundation rule on layer alone, and the `!important` is what makes it win. See §10. |
| Doc | `docs/components/scroll-reveal.md:156-160` — *"It is unlayered and imported after the css package, so it wins on source order. If you override `.scroll-reveal-hidden` yourself, order your rule after `@batthewz/response-ui-react-components/styles`"* | **Both sentences become false, in opposite directions.** After Phase 1 a consumer's unlayered rule beats ours *without* ordering (that is the Phase 1 prize) — except this one declaration, which they cannot beat from a stylesheet at all. Rewrite to say exactly that. This is the highest-value doc edit in the whole phase: it is currently telling consumers to do something unnecessary, and after the fix it would be telling them something impossible. |
| Doc | `docs/components/hero.md:336-342` — the three-environments Gotcha | Still true. Leave standing. |
| Tests | none assert on the CSS (vitest runs `css: false`) | Nothing to fix — which is the reason this probe exists. |
| Examples | `Skeleton.examples.tsx:61`, `CommandPalette.examples.tsx:259` mention unlayered CSS but not this rule | Out of scope here; see §10's enumeration. |

---

## 5. `tabs-scrollbar-height`

`3px` → `10px` `[P]`

### 5.1 Mechanism, at source

**Ours** — `src/components/ui/Tabs.css:14-17`:

```css
/* Hide scrollbar when not hovering for cleaner appearance */
.tabs-list::-webkit-scrollbar {
  height: 0.1875rem;
}
```

Specificity **(0,1,1)**. `[M1]` confirms it lands in `@layer components`.

**Competing** — `../response-ui-css/src/base.css:67-70`:

```css
*::-webkit-scrollbar {
  width: 0.625rem;
  height: 0.625rem;
}
```

Specificity **(0,0,1)** — the universal selector contributes nothing. **Unlayered**,
**foundation-side**. `[M1]` confirms it stays unlayered (minified to `::-webkit-scrollbar`). Not
covered by §3a.

**There is no shared class name**, which is exactly why plan §6 insists the Phase 1 search must be a
property intersection: no class-overlap search can find this pair.

The regression is **asymmetric**, as the plan notes: the foundation sets `width` *and* `height`; we
set only `height`, so the vertical dimension was never ours. Relevant only if the fix were
"re-specify", which it is not.

### 5.2 User-visible failure

The horizontal scrollbar under a scrollable tab list goes from a 3px hairline to 10px, taking 7px
more vertical space in every overflowing tab strip.

**Not WCAG-bearing.** If anything the direction is a11y-*positive*: a larger scrollbar is a larger
pointer target (2.5.8 Target Size (Minimum), AA). Say so honestly — it strengthens the case for
accepting.

### 5.3 Options

**(i) Delete the competition.** Unavailable. The competitor is `*::-webkit-scrollbar` in another
package; nothing this component emits can stop it matching. Two near-misses worth recording so
nobody re-derives them:

- **Standard properties instead of the webkit pseudo-element.** `scrollbar-color` is also set
  universally and unlayered (`base.css:63-65`), so it loses identically. `scrollbar-width` is **not**
  set by the foundation, so it would be uncontested — but `[M1]` could not confirm the effect:
  `#q7b` with `scrollbar-width: none` still reported `::-webkit-scrollbar { height: 10px }`, because
  whether a non-`auto` `scrollbar-width` suppresses the webkit pseudo-element styling is a **paint**
  question this instrument cannot see (the probe's own docblock names that limit). It would also
  change behaviour: `none` hides the bar entirely rather than reserving 3px, so hover-to-reveal would
  shift layout. Recorded as unmeasured, not as available.
- **`Carousel.css:…::-webkit-scrollbar { display: none }`** does **not** regress, because `display`
  is a property the foundation never declares on that pseudo-element — a useful reminder that the
  search is per-property.

**(ii) Move to a Tailwind utility.** **Rejected on F1** for the normal form. The important form works
— `[M1]` `[&::-webkit-scrollbar]:h-[3px]!` → `3px` — but that is option (iv) wearing a utility's
clothes: identical cost by F2, in an uglier place. Rejected.

**(iii) Inline `style`.** Rejected — an inline declaration cannot target a pseudo-element at all.

**(iv) `!important` inside the layer.** Works. Cost by F2/F3: **no consumer can ever restyle a Tabs
scrollbar from CSS**, and because the target is a pseudo-element, the inline `style` + `!important`
escape hatch F3 leaves open does not exist here either. This is the one place in Phase 1 where
`!important` closes the override route *completely*, with no residual escape.

**(v) Unlayered carve-out.** Rejected on §3a's reasoning, which transfers exactly.

**(vi) Accept**, with `expectAfter` + `accepted`. An honest owner reason is available, and it is not a
parking sentence: *the foundation deliberately owns scrollbar appearance app-wide, Tabs' 3px override
predates that, and the mask gradient at `Tabs.css:33-66` — not the hairline — is the component's
actual overflow affordance.* Cost: a visible, unrequested design change in every scrollable tab strip
(paired with §6's thumb row, which is the more noticeable half).

### 5.4 Recommendation — and this is a row where the owner must choose

> **⚠ SUPERSEDED — the owner chose (vi), and the outcome is bigger than "accept".** This section and
> §6 recommend `!important`; that is **not** what shipped, and the recommendation is left standing
> only as the argument the owner ruled against. What happened instead:
>
> **All three Tabs scrollbar declarations were deleted.** The `0.1875rem`
> `::-webkit-scrollbar` height, the `transparent` `::-webkit-scrollbar-thumb`, and the `:hover` thumb
> colour are gone, and `Tabs.css` now carries **no scrollbar declaration of any kind**. `Tabs.css`'s
> header comment records the reasoning; `AGENTS.md`'s admission test names this row as the worked
> example of a declaration that **fails** the test, because its invariant is an appearance.
>
> ```
> grep -n -i 'scrollbar' src/components/ui/Tabs.css   # only the comment explaining the deletion
> ```
>
> **`scrollbar-width: thin` went with them, and that was the owner's own addition after review.** It
> faced no collision at all — the foundation never declares `scrollbar-width` — so on this document's
> logic it could have stayed. Keeping it would have left Tabs **thin on Firefox and `0.625rem` on
> Chromium**: a cross-engine divergence *this change would have introduced*, because the deleted
> webkit rules were the thing keeping the two engines agreeing. "The foundation owns scrollbar
> appearance" is only true if it owns the width on both.
>
> **`memory/gates.md` carries the general lesson**, drawn from the third declaration: a rule that can
> never win again cannot be left in place beside an `accepted` row. An `accepted` row whose
> underlying rule has been deleted goes INERT, so "accept it" and "leave the CSS in place" cannot
> both be done — the three probe rows are now **controls reading the foundation's own values**, which
> redden if a Tabs scrollbar rule is ever re-added.

**My recommendation is (iv), narrowly scoped: `!important` on exactly the two properties the
foundation declares** (`height` here, `background-color` in §6), and nothing else in the file.

**Reason:** (vi) is a design change nobody asked for, on a component whose stylesheet explains its
intent at `Tabs.css:14` and `:28-31`, and Phase 1's contract is *zero regressions*, not "regressions
we can live with". Accepting it also means the mask fade and a permanently visible 10px thumb both
signal overflow, which is redundant chrome.

**What it costs:** the Tabs scrollbar becomes the one surface in the package with **no** override
route at all. I cannot soften that: pseudo-element + `!important` closes every door.

**Why the owner must decide rather than me:** the two costs are incommensurable — (iv) permanently
removes an override path, (vi) permanently changes a shipped appearance — and choosing between them
is a taste call about whether Tabs should disagree with the app-wide scrollbar at all. Plan §7 is
also explicit that an `accepted` row is signed off by the owner, not by an agent. If the owner
prefers (vi), the `accepted` sentence above is honest enough to write and I would not object; what
must not happen is (vi) chosen *because* it gets the probe to green.

### 5.5 Proving it, and making it fail on purpose

- **Redden the row:** remove the `!important` from `Tabs.css:16`. `tabs-scrollbar-height` must return
  to `10px`.
- **Watch for `inert`, not just red.** This row and §6's read `::-webkit-scrollbar` pseudo-elements,
  which the probe's own header (`scripts/probe-cascade-layer.mjs:32-34`) warns the engine may decline
  to report. Both currently measure, but if a Chromium upgrade turns them `inert`, that is a probe
  failure and **never** evidence the rule is safe.
- **If (vi) is chosen**, the `expectAfter` values are `10px` (height) and the resolved
  `--C-BORDER-DEFAULT` (thumb). Both are theme-dependent: the layered run measured
  `oklch(0.9276 0.0058 264.53)` `[P]`, which will drift with any palette retune. Pin the value and
  expect to re-pin it — `memory/traps.md` §N: a measured claim needs its input version named.

### 5.6 Blast radius

| Kind | Where | What to do |
| --- | --- | --- |
| Test | `grep -rn 'scrollbar' src --include=*.test.tsx` → **0** | Nothing asserts it. Which is the point: no gate but this probe can see it. |
| Doc | `grep -n -i 'scrollbar' docs/components/tabs.md` → **0** | The behaviour is **undocumented**, in either direction. Under (iv), document the hairline and say it is not overridable. Under (vi), nothing to answer — and that absence is itself worth noting, because an undocumented behaviour is easier to accept than a documented one and that is not a good reason. |
| Source | `Tabs.css:14` — *"Hide scrollbar when not hovering for cleaner appearance"* | Under (iv) it stays true and gains a sentence about the foundation rule it now out-ranks. Under (vi) it becomes false and must be deleted with a reason. |
| Examples | `Tabs.examples.tsx` — no scrollbar reference | Nothing to fix. |
| Neighbour | `Carousel.css`'s `::-webkit-scrollbar { display: none }` | Verified not a collision (different property). Leave alone — and do not "make it consistent" with Tabs. |

---

## 6. `tabs-scrollbar-thumb-color`

`rgba(0, 0, 0, 0)` → `oklch(0.9276 0.0058 264.53)` `[P]`

### 6.1 Mechanism, at source

**Ours** — `src/components/ui/Tabs.css:19-22`:

```css
.tabs-list::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 999px;
}
```

Specificity **(0,1,1)**, `@layer components` `[M1]`.

**Competing** — `../response-ui-css/src/base.css:76-79`:

```css
*::-webkit-scrollbar-thumb {
  background-color: var(--C-BORDER-DEFAULT);
  border-radius: 999px;
}
```

Specificity **(0,0,1)**, **unlayered**, **foundation-side**. Only `background-color` inverts;
`border-radius` is the same value in both, so that half is a no-op — record the direction per rule,
per plan §6.

**A detail worth having:** the hover rule at `Tabs.css:24-26`
(`.tabs-list:hover::-webkit-scrollbar-thumb { background-color: var(--C-BORDER-DEFAULT) }`) sets the
**same colour** the foundation's base rule sets. So the hovered state is unchanged by layering; only
the *resting transparency* is lost. The regression is "the thumb is always visible", not "the thumb is
the wrong colour".

### 6.2 User-visible failure

The scroll thumb under every overflowing tab list is permanently visible instead of appearing on
hover. Combined with §5 that is a 10px always-on bar where the design shipped a 3px hover-reveal.

**Not WCAG-bearing**; same 2.5.8 note as §5 — a permanently visible thumb is easier to hit.

### 6.3 Options

Identical to §5 in every respect — same competitor selector family, same package, same layer, same
pseudo-element. (i) unavailable; (ii) rejected on F1; (iii) impossible for a pseudo-element; (iv)
works with no residual escape hatch; (v) rejected on §3a; (vi) available with the same owner reason.

One option that exists here and not in §5: **drop the resting-transparency intent entirely and keep
only the hover rule**, i.e. accept the always-visible thumb but stop declaring `transparent`. That is
(vi) with the dead declaration removed rather than left to lose silently — strictly better than a
bare accept, because a declaration that no longer wins is a lie in the source. If the owner picks
(vi), **delete `Tabs.css:20`** in the same commit; do not leave it in place with an `accepted` probe
row as its only documentation.

### 6.4 Recommendation

> **⚠ SUPERSEDED — see the ⚠ in §5.4.** The owner took (vi) for both, and the "one option that exists
> here and not in §5" above — *"if the owner picks (vi), **delete `Tabs.css:20`** in the same commit;
> do not leave it in place with an `accepted` probe row as its only documentation"* — is the part
> that shipped, extended to **all three** declarations rather than one. The `:hover` rule this
> document flags as inert in §6.5 went too, for that same reason. **The insistence below that the two
> rows take the same answer held**; it is the answer itself that changed.

**Same as §5, and it must be the same choice.** These two rows are one design decision measured
twice; splitting them (important on the height, accept on the thumb) produces a 3px hairline that is
always visible, which is neither shipped behaviour nor the foundation's. **Owner call, taken once,
applied to both.**

### 6.5 Proving it, and making it fail on purpose

- **Redden the row:** remove the `!important` from `Tabs.css:20`. It must return to the resolved
  `--C-BORDER-DEFAULT`.
- **Keep the hover control.** Add a probe row for `.tabs-list:hover::-webkit-scrollbar-thumb` that is
  expected **not** to move (§6.1). `memory/gates.md`: *"a control that holds is what turns a
  difference into a finding"* — without it, a future edit to the hover rule looks like this row's
  problem.

### 6.6 Blast radius

Identical to §5.6. No test, no doc, no example references the scrollbar anywhere.

---

## 7. `hero-stagger-animation-name`

`fade` → `slide-up, fade` `[P]`

### 7.1 Mechanism, at source — and who supplies the colliding class

**Ours** — `src/components/ui/Hero.css:90-95`, inside
`@media (prefers-reduced-motion: no-preference)`:

```css
  .hero__content .stagger-item {
    animation-name: fade;
    animation-duration: var(--MOTION-DURATION-ENTER);
    animation-timing-function: var(--MOTION-EASE-ENTER);
  }
```

Specificity **(0,2,0)**, `@layer components` after Phase 1.

**Competing** — a foundation `.fade-*` class **on the same element**, e.g.
`../response-ui-css/src/animations/fade.css:17-21` (`.fade-up`), specificity **(0,1,0)**,
**unlayered**, **foundation-side**.

**The collision is conditional, and this package cannot produce it.** Verified four ways:

1. `src/components/ui/Hero.tsx:125-129` renders
   `<div className={cn("hero__content", className)}>` → `<ScrollReveal animation={animation}>` →
   `<Stagger>{children}</Stagger>`. `ScrollReveal.tsx:128-132` puts `.scroll-reveal-hidden` /
   `.fade-*` on **its own** element; `Stagger.tsx:42-52` puts `.stagger-item` on **the item
   wrappers**. Different elements, always.
2. `Stagger.tsx:45` is a bare `className="stagger-item"` with **no `cn()` merge and no parameter**.
   `StaggerProps` (`Stagger.tsx:12-22`) exposes `staggerDelay`, `className`, `children`, `as` — and
   `className` lands on the container (`:39`), not the item. **There is no route, from any React
   API this package ships, by which any class reaches a `.stagger-item` element.**
3. `Hero.tsx:128` passes no `className` to `Stagger`.
4. `grep -rn '<Stagger' src --include=*.tsx` → `Hero.tsx:128` plus five `Stagger.examples.tsx`
   sites, none of which put a class on an item.

Corroborated by an independent in-repo measurement: `src/components/ui/Hero.test.tsx:195-202` records
Firefox 146 against the real components — *"`.stagger-item` inside `.hero__content` went from
`animation-name: none` to `fade`/0.3s/fill both"*. `none` → `fade` is precisely the two-rule ladder
in `Hero.css` with **no** third competitor. Hero's own markup has no collision, before or after
Phase 1.

So the class in this probe row is **consumer-supplied** — and specifically, hand-authored markup that
puts a foundation utility class on a `.stagger-item` inside a `.hero__content`, which is markup a
React consumer of this package cannot write and only a consumer authoring `response-ui-css` classes
by hand can. Plan §13 already says the collision is *"conditional on markup a consumer controls"*;
this confirms it and narrows it further.

**Consequence: option (i) is unavailable here on the evidence, not on cost.** We are not the party
emitting the colliding class, so there is nothing for us to stop emitting.

### 7.2 User-visible failure

For a consumer who has explicitly put `.fade-up` on a stagger item inside `Hero.Content`: their
item slides *and* fades instead of Hero's plain fade. Hero's aesthetic opinion — stated at
`Hero.css:77-81`, *"the block carries the directional entrance, the items carry a plain fade one
after another"* — is overridden by the class the consumer wrote.

**Not WCAG-bearing.** The whole block is inside `@media (prefers-reduced-motion: no-preference)`, and
`fade.css:117-126` nulls the foundation classes under `reduce`.

### 7.3 Options

**(i) Delete the competition.** **Unavailable** — §7.1.

**(ii) Move to a Tailwind utility.** Rejected twice over: on F1 (the competitor is unlayered
foundation CSS, so a utility loses regardless), and structurally — `Stagger` gives Hero no route to
put a class on an item, so there is no element to put the utility on until Phase 3 ships a slot.

**(iii) Inline `style`.** Rejected — Hero does not render the item; `Stagger` does, from
`Children.toArray`, and Hero has no channel to it. Even with one, §4d applies: the value's inputs
include no prop.

**(iv) `!important`.** Works (F2), and is the wrong answer. `docs/components/hero.md:328-335` tells
consumers the documented escape is *"write your own unlayered rule after this package's
stylesheet"* — Phase 1 makes that route **better** (an unlayered consumer rule now beats
`@layer components` at any specificity, not just at equal specificity). An `!important` here would
close a route the docs advertise, in the same release that improves it.

**(v) Unlayered carve-out.** Rejected on §3a.

**(vi) Accept**, with `expectAfter: "slide-up, fade"` and a written reason. **This is the recommended
disposition**, and the reason is not a parking sentence: the row measures a consumer's explicit
instruction winning over a component's aesthetic default, which is the literal statement of plan §1's
goal. Re-asserting Hero's opinion over it would rebuild the defect Phase 1 exists to delete.

### 7.4 Recommendation

**(vi) Accept.** Draft `accepted` sentence, in the owner's voice, for
`scripts/probe-cascade-layer.mjs`:

> OWNER DECISION: this row measures a CONSUMER's explicit foundation `.fade-*` class on a
> `.stagger-item` inside `.hero__content` beating Hero's own `animation-name: fade`. Nothing this
> package renders can produce that markup — `Stagger.tsx:45` writes a bare `className="stagger-item"`
> with no merge and no parameter, so no React API here can put a class on that element, and
> `Hero.tsx:125-129` puts `.fade-*` on the ScrollReveal wrapper, never on an item. The colliding
> class is therefore hand-authored, and after Phase 1 the author's own class wins — which is exactly
> the override Phase 1 exists to deliver (PLAN §1). Hero's plain fade is an aesthetic default, not a
> correctness guard, so it is right for an explicit instruction to beat it. Scope of this decision is
> EXACTLY this row. It does NOT cover `hero-reveal-hidden-animation-none`, which is a guard rather
> than an opinion and is a must-fix.

**What it costs:** a consumer who nests hand-written stagger markup in a Hero and *wanted* Hero's
plain fade now has to remove their own class. That is discoverable and locally fixable, which is what
makes it an acceptable price. Also: this makes Hero the second `accepted` row, and the probe now has
two rows whose green means "decided". Plan §6's warning applies — **the accepted rows are the ones to
re-check by hand**, because a fixture error and a correct measurement produce the same green.

**Flagged as an owner call.** §3a's precedent is that an accepted row is the owner's signature, not
an agent's. I believe the reason above is honest and would sign it; the decision is not mine to take.

### 7.5 Proving it, and making it fail on purpose

- An accepted row is **pinned**, so it fails if `after` drifts off `slide-up, fade`
  (`probe-cascade-layer.mjs:555-564`). To exercise that: change the fixture's item class from
  `fade-up` to `fade-left` and confirm the row goes `*** ACCEPTED-DELTA DRIFT ***`, not green.
- **Re-check the precondition by hand.** `expectBefore: "fade"` is what proves the fixture reproduces
  Hero's rule at all. If a future edit to `Hero.css:91` changes the name list, this row goes `inert`
  — which is a probe failure, not a pass. `Hero.test.tsx:195-202`'s Firefox measurement is the
  independent corroboration; re-run it in a browser if the row ever moves.
- **Do not add `Stagger` slot access in Phase 3 without revisiting this row.** The moment
  `classNames.item` exists on `Stagger`, this package *can* put a class on a `.stagger-item`, and the
  acceptance's central premise ("nothing we render can produce that markup") stops holding. Write
  that dependency into the row.

### 7.6 Blast radius

| Kind | Where | What to do |
| --- | --- | --- |
| Test | `Hero.test.tsx:195-202` — the comment recording the Firefox measurement | Keep. Add that the measurement was re-confirmed as *not* a collision site for Hero's own markup. |
| Test | `grep -rn 'stagger-item' src --include=*.test.tsx` → `Stagger.test.tsx` only, plus `Hero.test.tsx:199` in a comment | No assertion changes. |
| Doc | `docs/components/hero.md:328-335` — *"`animation-name` on `.hero__content .stagger-item` is not overridable from a `className` — the rule is unlayered component CSS, which outranks every Tailwind utility; write your own unlayered rule after this package's stylesheet instead"* | **Every clause becomes false or obsolete.** After Phase 1 the rule is layered; a `className` *can* reach it via `@layer utilities` (once Phase 3 gives the item a slot); and an unlayered consumer rule wins without needing to be ordered after us. Rewrite in full — it is currently a "false cannot", the worst doc-rot shape per plan §13. |
| Doc | `docs/components/hero.md:296-297` — the item gap comes from `.stagger-item` | Still true. |
| Doc | `docs/components/stagger.md:122-129` — the "Stagger ships no animation" Gotcha, which names Hero as the worked example | Still true; the mechanism is unchanged. |
| Source | `Hero.css:77-89` — the comment explaining the composition | Still accurate. Add one sentence: an explicit foundation `.fade-*` on an item now wins, deliberately. |
| Examples | `Hero.examples.tsx:149` mentions the stagger in prose only | Nothing to fix. |

---

## 8. `hero-reveal-hidden-animation-none`

`none` → `slide-up, fade` `[P]` — **the one hero row that is a defect.**

### 8.1 Mechanism, at source

**Ours** — `src/components/ui/Hero.css:97-99`, same
`@media (prefers-reduced-motion: no-preference)` block:

```css
  .hero__content .scroll-reveal-hidden .stagger-item {
    animation-name: none;
  }
```

Specificity **(0,3,0)**, `@layer components` after Phase 1. Its purpose is stated at
`Hero.css:83-86`:

```
   Keyed off the *absence* of the reveal's hidden class rather than the presence
   of its entrance class, because ScrollReveal drops the entrance class on
   `animationend` — which would cut a later item's animation off mid-flight —
   while the hidden class is removed once and stays removed.
```

That is `memory/traps.md` §P bullet 7 written into the code: *"Key a descendant animation off the
class that is removed once, not the one that is added."*

**Competing** — the same consumer-supplied foundation `.fade-*` on the item, **(0,1,0)**,
**unlayered**, **foundation-side**. As in §7, the colliding class is not ours (§7.1's evidence
applies unchanged). The `.scroll-reveal-hidden` ancestor **is** ours to emit
(`ScrollReveal.tsx:129`), but it is not the competitor — it is part of our own selector.

### 8.2 User-visible failure — and it is a guard, not an opinion

The entrance **runs while the content is still `opacity: 0`** and is spent before the reveal fires.
When the observer clears the hidden state, the items appear instantly with no stagger. That is
precisely the failure `Hero.css:83-86` exists to prevent, arrived at from the other direction.

**Not WCAG-bearing, and not content loss** — a correction to the plan's framing. `[M3]` measured
`animation-fill-mode` on a `.stagger-item.fade-up` as **`both`** (the foundation's `stagger.css:5`
longhand is imported after `fade.css`'s shorthand, both unlayered, so it wins on source order), so a
finished `fade` holds the 100% frame at `opacity: 1`. Content becomes visible; the *animation* is
lost. The defect is a broken sequencing guard, which is real and worth fixing, and it is not an
accessibility failure. Say that rather than inheriting "WCAG" from the row above it.

### 8.3 Options

**(i) Delete the competition.** **Unavailable** — §7.1. We do not emit the colliding class.

**(i′) Stop needing the rule** — three shapes, all checked:

- **Key the guard off a package-owned `data-*` on ScrollReveal instead of `.scroll-reveal-hidden`.**
  Does not help: the competitor is on the **item**, and changing our *selector* cannot beat a rule in
  a higher-priority layer no matter how it is written. Layer beats specificity, always.
- **Defer mounting `Stagger` until the reveal fires** (Hero renders the stagger only once revealed).
  Rejected: it takes the hero's content — usually the page's `<h1>` — out of the server-rendered
  markup and the accessibility tree until an observer fires. That trades a lost animation for a lost
  heading.
- **Key Hero's entrance positively (`[data-revealed]`) and drop `:97` entirely.** Removes *our* rule,
  but the consumer's `.fade-up` still runs during the hidden phase and is still spent. It deletes the
  guard rather than satisfying it.

**(ii) Move to a Tailwind utility.** Rejected on F1, and on the same no-route-to-the-item ground as
§7.3.

**(iii) Inline `style`.** Rejected on the same ground.

**(iii′) Sidestep via a different animation longhand** — `animation-play-state: paused`,
`animation-duration: 0s`. **Rejected on F5, measured.** `../response-ui-css/src/animations/fade.css:11-27`
uses the `animation` **shorthand**, which sets every longhand it omits to its initial value —
including `animation-play-state: running`. `[M3]`: components-layer `animation-play-state: paused`
against unlayered `.fade-up` → `running, running`; `animation-duration: 0s` → `0.3s, 0.3s`. **Every**
animation longhand route is dead for the same reason.

**(iv) `!important` inside the layer** —
`.hero__content .scroll-reveal-hidden .stagger-item { animation-name: none !important }`, still
inside `@media (prefers-reduced-motion: no-preference)`. Works by F2 (measured shape: `[M1]`'s
`.rui-imp` row, same layer, same property).

**What a consumer can no longer override, exactly:** `animation-name` on a `.stagger-item` that is
inside a `.scroll-reveal-hidden` that is inside a `.hero__content`, while motion is allowed. Not from
their own stylesheet at any specificity, not with `!important` (F2), and not from an inline `style`
normal declaration (F3). Only an inline `style` with `!important` on that specific item — which,
since `Stagger` renders the item, no consumer can write today anyway.

**The blast radius is one transient state, not the steady state.** The selector requires the hidden
class, which `ScrollReveal.tsx:117` computes as `animate && !reducedMotion && !revealed` — removed
once, permanently, on the first intersection. After that the important declaration does not match and
§7's accepted behaviour takes over.

**(v) Unlayered carve-out.** Rejected on §3a.

**(vi) Accept.** Refused. It is a guard with a recorded reason (`Hero.css:83-86`) and a recorded
lesson behind it (`memory/traps.md` §P). No consumer writing `.fade-up` is asking for their entrance
to be consumed while invisible. Accepting it would also make §7's acceptance incoherent — §7 is
"the consumer picks the entrance", and without §8's guard the consumer's pick does not play.

### 8.4 Recommendation

**(iv), scoped to this one declaration.**

The two hero rows then compose into a single coherent contract, which is the reason to prefer this
pair over any other combination: **the consumer picks the entrance; Hero picks when it plays.** After
the fix, a consumer's `.fade-up` on a Hero stagger item is nulled while the reveal is hidden, and
then — because §7 accepts the layer inversion — starts fresh, from the top, at the moment the reveal
fires. That is better behaviour than either row has today.

**What it costs:**

1. A second `!important` in `@layer components` (with §4's). Both need the same fencing comment
   explaining why they are allowed: each guarantees a *timing or visibility invariant*, not a design
   choice, and each is gated behind a condition a consumer would not be styling into.
2. `Hero.css` now contains one declaration a consumer provably cannot reach. Document it in
   `docs/components/hero.md`'s Gotchas as the single exception to the otherwise-improved override
   story, in the same edit that rewrites `:328-335`.

### 8.5 Proving it, and making it fail on purpose

- **Redden the row:** delete the `!important` from `Hero.css:98`.
  `hero-reveal-hidden-animation-none` must return to `slide-up, fade`. `[P]`'s current run is that
  exact measurement, so the row is known to be able to come back red.
- **Prove the pairing, not just the row.** Add a probe row measuring the *same element after the
  hidden class is removed* and assert it reads the consumer's `slide-up, fade` — that is the half of
  §7+§8's combined contract nothing currently measures, and without it the two rows can drift into
  disagreeing.
- **Guard the `#P`-bullet reasoning.** `Hero.css:83-86` explains why the rule keys off *absence*. Add
  that sentence's invariant to the row's `note` so a future simplification that re-keys it onto the
  entrance class fails the probe rather than passing review.

### 8.6 Blast radius

| Kind | Where | What to do |
| --- | --- | --- |
| Test | none — `grep -rn 'scroll-reveal-hidden' src --include=*.test.tsx` returns `ScrollReveal`, `Swimlane` and `Spotlight` tests, none of which involve `.hero__content` | Nothing to change. |
| Doc | `docs/components/hero.md:328-335` | Same rewrite as §7.6, plus the new exception. |
| Doc | `docs/components/hero.md:336-342` — the three-environments Gotcha | Still true, and it interacts with §4: under `scripting: none` the hidden class never clears, so this `!important` keeps the items un-animated forever while §4's fix keeps them visible. That combination is correct and worth one sentence. |
| Source | `Hero.css:83-86` | Keep verbatim — it is the reason the fix exists. Add the `!important`'s own justification beneath it, not instead of it. |
| Examples | none | — |

---

## 9. Recorded foundation follow-ups — cheaper, out of scope, do not take

Plan §11 and `memory/README.md` §6: scope is this package only, *not even to add a script*, and that
boundary was crossed once and reverted in full. Both of the following are genuinely cheaper than the
in-package fixes above and are **still out of bounds**. Recorded here so the choice is visible, per
plan §6's instruction not to claim an in-package fix is necessary without saying so.

**F-1 · `--stagger-delay` should carry its own fallback.**
File `../response-ui-css/src/animations/stagger.css`, line **4**. Current:

```css
  animation-delay: calc(var(--stagger-index, 0) * var(--stagger-delay));
```

Change to:

```css
  animation-delay: calc(var(--stagger-index, 0) * var(--stagger-delay, var(--MOTION-STAGGER-DELAY)));
```

and delete line 3 (`--stagger-delay: var(--MOTION-STAGGER-DELAY);`) — the re-declaration on the
consuming element is the whole defect. Two lines. This is the change
`src/components/animation/Stagger.css:11-14` already asks for by name: *"Delete both declarations once
`animations/stagger.css` there reads `var(--stagger-delay, var(--MOTION-STAGGER-DELAY))` itself."*
Note that §2's recommended in-package fix **deletes `Stagger.css` anyway**, so once F-1 lands the
in-package side needs no further edit — the `--_stagger-step` indirection becomes redundant and can
be removed as a separate simplification. Record that dependency, or the indirection outlives its
reason.

**F-2 · `.scroll-reveal-hidden` should have a `scripting: none` escape beside its reduced-motion
one.** File `../response-ui-css/src/animations/scroll-reveal.css`. The file already carries the
matching shape at lines **7-11**:

```css
/* Reduced motion: skip hidden state entirely */
@media (prefers-reduced-motion: reduce) {
  .scroll-reveal-hidden {
    opacity: 1;
  }
}
```

Add a sibling:

```css
/* Scripting off: nothing will ever clear the hidden state. */
@media (scripting: none) {
  .scroll-reveal-hidden {
    opacity: 1;
  }
}
```

Four lines. It would let `src/components/animation/ScrollReveal.css` be **deleted entirely** rather
than gaining an `!important` (§4), and it fixes the same bug for every Astro/Rails consumer of
`response-ui-css`, which the in-package fix cannot reach at all. If the boundary is ever crossed
deliberately, this is the highest-value item on either side of it.

**Precedent to read before either.** `../response-ui-css/CHANGELOG.md` (the "focus-ring offset"
entry, ~line 260-266) and `../response-ui-css/src/base.css:44-46` record the foundation package
making this exact layering decision on purpose — *"deliberately inside `@layer base`: an unlayered
rule would out-rank Tailwind's `utilities` layer"* — and verifying it *"by walking the CSSOM for the
rule and asserting its enclosing layer."* It is the closest worked example that exists, and it is on
the other side of the boundary.

---

## 10. The comment-only sites, and the token contracts

Plan §6: four of the eight documented "deliberate precedence" sites need **no code change, only
comment rewriting**. Verified — plus one that no longer exists and one the probe cleared.

### 10a. The comment-only sites

**`src/components/form/Combobox.css:22-34`** — documents a deliberate *absence*. Current, at `:27-34`:

> The `border` itself is written in Combobox.tsx as `border border-border-strong`
> for the same reason, and this is the only control in the family that needed
> moving: this package's stylesheets are unlayered, and unlayered author CSS
> outranks every Tailwind utility whatever the specificity — so a `border`
> declared here silently defeated both `focusRingControl`'s
> `focus:border-border-focus` and `focusRingControlError`'s
> `border-status-error`. Do not declare `border` (or `border-color`) on
> `.combobox-input` again.

Draft replacement for the middle clause (keep the first and last sentences intact — the *instruction*
is unchanged and still correct):

> …and this is the only control in the family that needed moving. Before Phase 1 this package's
> stylesheets were unlayered and outranked every Tailwind utility whatever the specificity, so a
> `border` declared here silently defeated both `focusRingControl`'s `focus:border-border-focus` and
> `focusRingControlError`'s `border-status-error`. This file is now in `@layer components`, which
> sits *below* `@layer utilities`, so the utilities would win — but the rule stands: a `border` here
> would still be a second writer for one property (`CLAUDE.md` rule 3), and the recipes in
> `src/util/focus.ts` are the single source. Do not declare `border` (or `border-color`) on
> `.combobox-input` again.

The same edit is needed at **`src/components/form/Combobox.tsx:305-307`** (the mirror comment) and
**`src/components/form/Combobox.test.tsx:565-573`**, whose docblock states the layering premise as
the reason the test exists.

**`src/components/form/ColorPicker.css:213-217`** — same shape. Current:

> No border and no focus rule here: both are `src/util/focus.ts` recipes
> applied in ColorPicker.tsx (`border border-border-strong` +
> `focusOutlineResetControl` + `focusRingControl`). The border has to be a
> utility for the recipe's border swap to reach it at all — this stylesheet is
> unlayered, and unlayered CSS outranks every Tailwind utility.

Draft replacement:

> No border and no focus rule here: both are `src/util/focus.ts` recipes applied in ColorPicker.tsx
> (`border border-border-strong` + `focusOutlineResetControl` + `focusRingControl`). Keeping the
> border in the utility keeps one writer for one property, which is why it moved. The original
> reason — this stylesheet was unlayered and outranked every utility — expired with Phase 1; the
> file is now in `@layer components`, below `@layer utilities`. The arrangement is still correct and
> now also lets a caller's `className` reach the border, which is the point.

Mirror comment at **`src/components/form/ColorPicker.tsx:378-380`**.

**`src/components/ui/Timeline.css:68-81`** — a custom-property fan-out note. Current, at `:68-74`:

> Public — no leading underscore, so an instance may re-point them, and the
> only override route that works: a `className` on the item cannot reach the
> marker or the card, because this package's CSS is imported unlayered from
> `styles.css` and outranks `@layer utilities` whatever the specificity. A
> custom property set on the item has no unlayered declaration competing with
> it there, so it lands and inherits inward. Same contract as
> `--stepper-progress-color`.

Draft replacement (the `--fill`/`--border` contrast paragraph at `:76-81` stays verbatim):

> Public — no leading underscore, so an instance may re-point them. **They reach elements a
> per-element override cannot:** these three values are set once on the item and inherit to N
> descendants the consumer never renders, so a `className` on the item — even after Phase 1, where a
> utility in `@layer utilities` does beat this file — cannot address the marker or the card at all.
> That is the reason they stay, not precedence: plan §3b refuted "parent sets, child reads" as a
> reason on its own, and these survive it because the children are ours, not the caller's. Same
> contract as `--stepper-progress-color`.

**`src/components/data-display/ActivityFeed.css:28-37`** — the same claim, same fix. Current, at
`:28-34`:

> Public — no leading underscore, so an instance may re-point them. This is the
> only override route that works: `className` reaches the `<li>` and nothing
> inside it, and even inside, this package's CSS is imported unlayered from
> `styles.css` and outranks `@layer utilities` whatever the specificity. A
> custom property set on the row has no unlayered declaration competing with it
> there, so it lands and inherits inward. Same contract as
> `--stepper-progress-color`; `Timeline` exposes the matching pair.

Draft replacement:

> Public — no leading underscore, so an instance may re-point them. **They reach elements a
> per-element override cannot:** `className` reaches the `<li>` and nothing inside it, and the value
> is set once on the row and inherits to markers the consumer never renders. That is what a
> per-element slot cannot do, and it is the reason these stay — not precedence. (Before Phase 1 this
> file was unlayered and outranked every utility; it is now in `@layer components`, below
> `@layer utilities`.) Same contract as `--stepper-progress-color`; `Timeline` exposes the matching
> pair.

Mirror docblock at **`src/components/data-display/ActivityFeed.tsx:44`** (*"lose to this package's
unlayered CSS"*).

**`src/components/ui/AppShell.css:200-208`** — probe-cleared, comment still false. `[P]`
`control-sronly-padding` held at `0px → 0px`, so no code change. Current, at `:203-205`:

> This rule survives only to surrender
> the padding, because this file is unlayered and would otherwise outrank
> `sr-only`'s own `padding: 0` whatever the utility's specificity.

Draft replacement:

> This rule survives only to surrender the padding. Before Phase 1 this file was unlayered and would
> have outranked `sr-only`'s own `padding: 0` whatever the utility's specificity; the file is now in
> `@layer components`, below `@layer utilities`, so `sr-only` would win on its own. The rule is
> therefore redundant rather than load-bearing — measured, `probe:cascade-layer`'s
> `control-sronly-padding` row holds at `0px` either way. **Do not delete it as part of Phase 1**:
> it is also the probe's holding control, and removing it removes the evidence. Delete it in Phase 4
> with the row, or keep it as the assertion.

**`src/components/ui/MasonryGrid.css:11`** — **verified: no longer exists.** The file is 81 lines;
`:11` is `.masonry-grid__item {`. The trailing-gap comment went with `--masonry-gap` (§3b), and the
header at `:1-6` correctly records the new mechanism. `src/components/ui/MasonryGrid.tsx:137` still
carries a leftover *"only because that file is unlayered and…"* comment — add it to the rewrite list.

### 10b. The public-contract token comments (plan §4c)

Plan §4c says three token groups *"all currently claim to be 'the only override route that works,'
which stops being true after Phase 1."* **Verified two of three; the third is a mis-scoped claim in
the plan.**

| Token(s) | Declared at | Carries the false claim? |
| --- | --- | --- |
| `--timeline-highlight-fill` / `-ink` / `-border` | `Timeline.css:82` ff. | **Yes** — `Timeline.css:68-71`. Rewrite per §10a. |
| `--activity-feed-highlight-fill` / `-ink` | `ActivityFeed.css:38-39` | **Yes** — `ActivityFeed.css:28-31`. Rewrite per §10a. |
| `--stepper-progress-color` | `Stepper.css:31` | **No.** `Stepper.css:22-30` says *"override per instance to re-skin the track without touching global theme tokens"* and makes **no** layering claim at all. Nothing to rewrite. It is *cited* as the shared contract by the two comments above, which is how the plan came to list it. |

A fourth site the plan does not list and that carries the same claim in **public API documentation**:
**`src/components/ui/Timeline.tsx:149-152`**, the `highlight` prop's docblock — *"a `className` on the
item cannot, because this package's CSS is imported unlayered and outranks `@layer utilities`
whatever the specificity (see the docs)."* That one ships to consumers through the type declarations,
so it matters more than the CSS comments. Rewrite it with the same substitution: the reason is
inherited fan-out, not precedence.

### 10c. Full enumeration of in-source layering claims

`grep -rn 'unlayered' src AGENTS.md` returns **20 sites** outside `scripts/`. Beyond those already
named above, these also become false or misleading and are not on the plan's list:

`src/components/animation/Stagger.css:7-9` (deleted with the file, §2); `src/components/animation/ScrollReveal.css:7-8` (§4.6);
`src/components/form/Radio.css:38` (§3.6); `src/components/ui/Kbd.tsx:5` and `src/components/ui/Kbd.test.tsx:39`
(both describe the *foundation's* unlayered `.mono-font` — **still true**, leave standing);
`src/components/ui/CommandPalette.examples.tsx:259` (*"The panel's 36rem cap lives in unlayered component CSS, so a plain `max-w-*` utility loses"* — **inverts**: the utility now wins, which is `memory/traps.md` §T's report being fixed);
`src/components/ui/Skeleton.examples.tsx:61` (*"unlayered base `height`"* — the geometry is inline
`style`, not CSS, so this sentence was already imprecise and stays wrong for a different reason; see
plan §4d); `AGENTS.md:400-410` (the §3a decision block, whose *"Status: decided, not yet in effect"*
framing must flip in this commit).

`grep -rl 'unlayered' docs | wc -l` → **20** doc files. Plan §6's Phase 5 sweep sizes that work; the
subset this phase must answer is the six named in §§1.7, 2.6, 3.6, 4.6, 7.6, 8.6.

---

## 11. Findings outside the eight rows

Recorded because they were found while verifying, and a finding that goes unrecorded gets
re-discovered. None is Phase 1 work.

1. **Six form controls have no focus indicator in forced-colours mode.** `Input`, `Select`,
   `Textarea`, `OTPInput`, `Combobox`, `ColorPicker` all apply `focusOutlineResetControl` and rely on
   a `box-shadow` ring, which forced colours nulls; `grep -rn 'forced-colors' src --include=*.css`
   shows only `Radio.css` restores an outline. **WCAG 2.4.7.** §3.4's recommended fix closes it for
   all six as a side effect, which is why it must be announced rather than folded in.
2. **The probe has no row for `Timeline.css:461-467`** (`align="right"`), which regresses by the same
   mechanism as the measured row at one lower specificity. Plan §6's own "a row list is an allowlist"
   lesson, applied to the probe as it stands.
3. **The probe has no row for the hover half of the Tabs scrollbar**, which §6.1 establishes is
   *unaffected*. A holding control there would have made §5/§6's shared mechanism obvious from the
   output alone.
4. **`docs/components/stagger.md:104-118` documents a delay-source ordering that only one of the
   three sources can currently prove.** Source 2's mechanism is CSS-only, and vitest runs
   `css: false`, so nothing in the suite asserts it; the only evidence is a Firefox measurement in a
   test comment (`Stagger.test.tsx:45-58`). After §2's fix the mechanism becomes *inline*, i.e.
   jsdom-visible, so it becomes assertable for the first time. Take that for free.

---

## 12. Summary

| Probe row | Competitor | Where it lives | Recommendation | What it costs |
| --- | --- | --- | --- | --- |
| `timeline-even-animation` | foundation `.fade-right`, unlayered | `response-ui-css` | **(i)** stop emitting `.fade-*`; `Timeline.css` owns the whole shorthand keyed on `:nth-child`, triggered by a new `data-*` on `ScrollReveal` | new permanent `data-*` API; breaking DOM change; 2 tests + 1 doc rewritten |
| `stagger-ancestor-inherit` | foundation `.stagger-item`, unlayered | `response-ui-css` | **(i)** `--_stagger-step` on the container + inline `--stagger-delay: var(--_stagger-step)` on the item; **delete `Stagger.css`** | 1 private token; `style` merge on the container; 4 doc paragraphs + 3 tests rewritten |
| `radio-forced-colors-focus-outline` | **our own** `focus:outline-none`, `@layer utilities` | this package | **(i)** `focusOutlineResetControl` → `not-forced-colors:focus:outline-none` | changes 6 other components (for the better — announce it); `verify:focus-affordance` must learn the variant or it goes blind |
| `scrollreveal-no-js-opacity` | foundation `.scroll-reveal-hidden`, unlayered | `response-ui-css` | **(iv)** `opacity: 1 !important` on the existing rule | one `!important`; a consumer cannot set `opacity` on that class under `scripting: none` |
| `tabs-scrollbar-height` | foundation `*::-webkit-scrollbar`, unlayered | `response-ui-css` | **(iv)** `!important` on `height` — **owner call vs (vi) accept** | the only surface in the package with *no* override route (pseudo-element ⇒ no inline escape) |
| `tabs-scrollbar-thumb-color` | foundation `*::-webkit-scrollbar-thumb`, unlayered | `response-ui-css` | **same choice as the row above, taken once** | as above |
| `hero-stagger-animation-name` | **consumer-supplied** `.fade-*`, unlayered | consumer markup | **(vi)** accept, with the drafted reason — **owner call** | a consumer who wanted Hero's plain fade must drop their own class; a second pinned `accepted` row to hand-check |
| `hero-reveal-hidden-animation-none` | **consumer-supplied** `.fade-*`, unlayered | consumer markup | **(iv)** `animation-name: none !important` | one `!important`, active only while the reveal is hidden; one declaration a consumer provably cannot reach |

> **⚠ The two Tabs rows above are the two the owner ruled against.** They shipped as **(vi) accept
> with all three declarations deleted**, not as `!important` — §5.4. Every other row's
> "Recommendation" cell is what shipped. The header table at the top of this file is the outcome
> record; this one is the proposal record.

**Rows where the owner must decide, not me:** the Tabs pair (§5/§6) and the `hero-stagger-animation-name`
acceptance (§7). Everything else has one defensible answer.

**Nothing in the eight has *no* acceptable in-package fix.** Two are `!important` (§4, §8) and one is
an acceptance (§7), which is three rows whose resolution is a trade rather than a repair — say so in
the Phase 1 PR rather than presenting eight clean fixes.

---

## 13. `AGENTS.md` — flipping the status, and the one place it needs extending

`AGENTS.md:395-425` already contains the §3a decision in full, with its ✔covered / ✘not-covered
boundary and the `Radio.css` must-fix named explicitly at `:415-418`. **Phase 1's doc task is to flip
`Status: decided, not yet in effect` (`:397-400`) to in-effect, not to author the section.** Nothing
in §§1–8 contradicts what is written there. Two things to check against it before writing prose:

**No conflict on the letter, one on the reading.** `AGENTS.md:402-404` states *"Focus rings are not
carved out, and are not `!important`."* That is scoped to focus rings, and none of my recommendations
puts an `!important` on a focus ring — §3's fix is `not-forced-colors:`, which needs none. But
`:406-410` argues the general case — *"one cascade regime with no exceptions is worth more than 29
declarations defended by being unlayered … the next reader would eventually 'tidy' [the exception]
without knowing why"* — and a reader can reasonably take the whole section as a package-wide "no
`!important`" policy. §§4, 5/6 and 8 recommend three of them.

**So the same commit must extend the section**, or the next reader either deletes all three as policy
violations or reads them as licence. The extension needs to say three things, all of them measured
here:

1. **A carve-out and an `!important` are different exceptions, and only one creates a second
   precedence regime.** An unlayered file re-introduces the three interacting axes Phase 1 collapsed
   (plan §6). An `!important` inside `@layer components` keeps one regime and raises one declaration
   within it. That is why the first is refused everywhere in this document and the second is not.
2. **What an `!important` in `@layer components` actually costs, stated as the measurement.** Per
   §0b F2/F3: it beats an `!important` in `@layer utilities`, beats a consumer's **unlayered
   `!important`**, and beats a consumer's inline `style` normal declaration. The only remaining
   consumer route is inline `style` + `!important` — and for a pseudo-element target (§5, §6) even
   that does not exist. `!important` here is not "a consumer must shout louder"; it is "a consumer is
   out of options."
3. **The admission test, so the exception is policeable.** Each of the three passes it: the
   declaration guarantees a **visibility or timing invariant**, not a design choice, and it is gated
   behind a condition a consumer would not be styling into (`scripting: none`; a transient
   hidden state; a scrollbar pseudo-element the foundation styles universally). Every such site
   carries a comment saying *why this one and not the next one* — without that sentence, §3a's own
   prediction comes true and the next reader tidies it.

The Tabs pair (§5/§6) is the site that least clearly passes test 3 — its invariant is an appearance,
not a guarantee — which is the same reason it is flagged as the owner's call rather than mine. If the
owner takes (vi) accept there, `AGENTS.md` needs only two `!important` sites to fence and the policy
extension gets narrower and stronger.

> **⚠ Discharged, and this paragraph's conditional came true.** The owner took (vi); `AGENTS.md`
> fences exactly two `!important` sites, and the admission test as written cites the Tabs scrollbar
> as its worked **counter**-example ("the scrollbar is a 3px hairline" does not qualify — that is an
> appearance). The status flip and the policy extension both landed: `AGENTS.md`'s layering section
> now reads *"Status: in effect"*, and the three sub-points listed above are its three paragraphs.
> One addition this section did not anticipate: the `Radio` fix needed `verify:focus-affordance`
> **widened** to parse `not-forced-colors:`, and un-widening it leaves the guard at exit 0 with
> coverage silently dropping 18 → 11 — green and blind rather than red.
