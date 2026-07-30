# Plan — "sensible defaults, overridable"

**Phase 1 is unblocked and ready to start. Both owner decisions are settled (§3).**
`scripts/probe-cascade-layer.mjs` measures **8 must-fix regressions, 1 accepted delta and 2 holding
controls**. One piece of Phase 2 has landed ahead of Phase 1 because it needed no layering:
`--masonry-gap` is gone (§3b).

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
- Refuted claims are not kept here. §10 lists what has been settled and where the reasoning lives,
  so nobody re-derives it. `bugs/ARCHIVE.md` #497/#498 own the Phase 0 detail in full.

---

## 0. Before you start

**Run this first:**

```
bun run probe:cascade-layer
```

It fails: **8 regressions, 1 accepted delta, 2 controls holding**, plus a build error proving
`@import "./styles.css" layer(components)` cannot compile. That single output teaches this problem
faster than the rest of this document, and it is the only instrument in the repo that can see this
class of bug — `vitest` stubs CSS to `""` and jsdom applies no stylesheets, so every other gate is
blind to the cascade.

Read the accepted row's reason before you read anything else: it is the one row whose green means
"decided", not "safe" (§3a).

### The four things that will bite you

1. **Phase 1 gates everything, and it is not mechanical.** Seven measured regressions, three of them
   WCAG-bearing. Six share one shape: a rule here that must beat an *unlayered* rule in
   `response-ui-css`. Each needs an explicit decision. The seventh is a policy question (§3a).
2. **`classNames` is an invalid API until Phase 1 lands.** Before it, every slot is a prop that
   appears in the DOM, changes nothing, and reports no error — because this package's CSS is
   unlayered and outranks `@layer utilities` at any specificity. Do **not** start Phase 3 early on
   the grounds that it is "additive and low-risk." That is the failure `memory/affordances.md`
   describes, and it describes it about this exact API.
3. **Phase 1 must edit `src/styles.css`, the one file lanes are otherwise forbidden to touch.**
   `@source` cannot be nested, so the aggregate import cannot carry `layer()`; the 46 individual
   imports must each take it. Phase 1 is a single serial commit that owns that file. No lane starts
   until it has landed.
4. **Do not "fix" the house rule into symmetry.** `className` → outermost element; `...props` stays
   on the focusable control. This was reversed once and had to be withdrawn: `<label for>` binds
   only to labelable elements, `div.focus()` is a no-op so `focusFirstError()` dies silently, and an
   `inputProps` hatch restores neither `mergeProps` nor `SearchInput`'s `id` guard. The asymmetry
   looks wrong and is correct. See §4b.

### Sequencing

```
Phase 1  ──►  Phase 2  ──►  Phase 3  ──►  Phase 5 (release)
(serial,      (2 files)     (lanes,        
 owns                        fan-out)      Phase 4 is not a project — it is a
 styles.css)                               standing convention. No lanes, no
                                           completion criterion.
```

**The prize is Phases 1–3.** Phase 1 alone makes `<StatCard className="flex-row">` work. Stop after
3 and the package is coherent and the feature is delivered.

---

## 1. The goal

A consumer can use any component with no arguments and get a sensible result, **and** override any
visual decision it makes without reaching for a stylesheet:

```tsx
<StatCard>…</StatCard>
<StatCard className="flex-row items-center border-0 bg-surface-2">…</StatCard>
```

Today the first works everywhere and the second works only on components that have no `.css` file.
**That inconsistency — not the CSS itself — is the defect.** Phase 4 exists to reduce the CSS;
Phases 1–3 exist to remove the inconsistency, and they do it without deleting much CSS at all.

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
| This package's component CSS is imported **unlayered**, so it outranks every Tailwind utility regardless of specificity. `@layer components;` is declared by Tailwind and is **empty**. | `grep -c 'layer(' src/styles.css` → `0`. Then `node scripts/probe-cascade-layer.mjs --keep` and walk the built CSS: `.flex-col` and `.sr-only` resolve inside `@layer utilities`; `.stat-card`, `.timeline-item` and `.scroll-reveal-hidden` resolve **unlayered**. |
| The foundation is **almost entirely unlayered too** — 2 `@layer` blocks across 29 files (`base.css`, `responsive/text.css`). So the property-intersection surface is the whole of `response-ui-css`, not just its animation files. | `grep -rn '@layer' ../response-ui-css/src/` |
| **7 rules in 4 files** name a class the foundation owns, and every one inverts when this package moves into a layer. | `grep -rn 'stagger-item\|scroll-reveal-hidden\|\.fade-\|\.scale-in\|\.scale-out' src --include=*.css` → rule lines `Timeline.css:465,526`, `Hero.css:91,97`, `ScrollReveal.css:13`, `Stagger.css:18,26`. |
| Token-backed utilities compile to `var()`, so **runtime re-theming survives inlining**. | `.bg-surface-0{background-color:var(--C-SURFACE-0)}` in the built CSS. |
| Arbitrary custom properties generate, land in `@layer utilities`, and dedupe per property name. | `cn("[--X:a]","[--X:b]")` → `[--X:b]`; `cn("[--A:1]","[--B:2]")` → both. |
| A token override and the utility reading it coexist. | `cn("[--C-TEXT-PRIMARY:red]","text-fg-primary")` → both retained. |
| Variant-scoped utilities do **not** dedupe against bare ones. An override must match the variant. | `cn("in-[.timeline]:mt-r5","mt-0")` → both kept. |
| Tailwind v4 is **already a hard requirement**; no non-Tailwind consumer exists to break. | `AGENTS.md:16`. `diff src/styles.css dist/styles.css` → identical: unresolved `@import`s, live `@source`, zero generated rules. |
| The package's written policy already **is** inline utilities. | `AGENTS.md:400`: *"The library's styling boundary is Tailwind utilities + design tokens."* |
| `cn()` accepts the clsx **conditional-object** form. This is why `className` must not be overloaded to take a slot object (§4a). | `cn({"border-0":true,"bg-surface-2":false})` → `"border-0"`. |

**Do not cite byte offsets in compiled CSS.** The previous version of this table did; every one of
them is now wrong, because the offsets move on each build while the claim stayed true. Cite a
command that recomputes the answer.

### 2b. Payload size — method-dependent, so state the method

Two legitimate denominators: **all of `src`** (49 `.css` files, 5,971 lines) and **component
siblings only** (46 files, 5,784 lines). The all-`src` reading includes `styles.css`, `tokens.css`
and `examples/example-theme-tuning.css`.

```
find src -name '*.css' | wc -l                      # 49
cat $(find src -name '*.css') | wc -l               # 5971
```

| Measure | Value | Caveat |
| --- | --- | --- |
| Declarations | **2,257** all-`src` / **2,215** components-only | Method: strip `/* */`, count `;` at brace depth ≥ 1. Verified exact for this codebase — no block omits its trailing `;`, no `;` inside `url()`/`content`. |
| Rules | **690** selector rules, or **706** counting `@keyframes` steps | Never quote 706 bare. |
| Comments / blank | **22.4%** / **12.5%** | Blank share swings to 13.1% if blanks inside comment blocks count as blank. Combined ~35% of the payload is not CSS — that is the point that survives either method. |
| Fully deletable by inlining | **~9–10 files** = **~6% of lines**, **~8% of declarations** | Tooltip 12, Popover 27, Wizard 23, ThemeSwitcher 42, DropdownMenu 78, Button 1 (comment only), Collapsible 35, Grid 56, MasonryGrid 81 (now 21 column-scale declarations + `break-inside: avoid`), ScrollReveal 16. **ScrollReveal is a candidate only — its `@media (scripting: none)` block is a confirmed Phase 1 regression site (§3a context) and must not be inlined.** Quote lines *or* declarations, never mixed. |
| Convert mechanically | **~1,805 of 2,257 (80%)** | Bucket A 1,565 + B 240. **These two are estimates, not measurements** — the bucketing is a judgement call and is not derivable from the repo. Robust to the denominator; do not present as measured. |

`Timeline.css` is the cleanest illustration of why lines mislead: **529 lines, 114 declarations,
50.9% comment** — a layout contract that would not survive being spread across six class strings.

### 2c. Component counts — reading-dependent, and the old numbers were not reproducible

```
# .tsx under src/components, excluding *.test.tsx and *.examples.tsx
281 total − 96 test − 90 examples = 95;  46 have a sibling .css, 49 do not
# excluding three non-components (use-form, router-adapter, menu-internals)
92;  46 with CSS, 46 without   ← a 50/50 split, not 52%
```

**There is no reading of this repo that yields ~155 components.** The ceiling is 105 (exported
PascalCase symbols); the plausible range is 92–105. Any percentage built on ~155 is unmeasurable —
which includes the old "~87 clean of ~155" coverage figure. **Do not quote a coverage percentage
for the gap list.** Use the absolute count of verified gaps, and verify each at source first (§7).

**The test-blast-radius number is not reproducible and must not be used for lane sizing.** Readings
range 34–99 across seven definitions:

```
find src -name '*.test.ts*' | wc -l                                  # 116  total
grep -rl 'toHaveClass\|className' src --include=*.test.tsx | wc -l   #  71  simple grep
# test files referencing a class defined in an authored .css:  53 (exact-token) .. 92 (substring)
```

Pick a method, write it down, run it, quote both together. **13** test files assert a `__`-form
class that a `.css` file actually defines — that one is exact under a stated method and is the
narrow reading; it is not the lane-sizing figure.

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
| `[&::-webkit-slider-thumb]` | `.x::-webkit-slider-thumb` | (0,1,1) | Fine — no child element to class, so repeating the variant is natural, and it dedupes. All 21 vendor pseudo-element rules can move. |
| `group-*` | `.x:is(:where(.group)[data-…] *)` | (0,2,0) | Works, but `in-[…]` is strictly better. |
| `[&_.child]:` | `.\[\&_\.child\]\:x .child` | **(0,2,0)** | **Banned.** A consumer's class on the child is (0,1,0) in the same layer and loses. Relocates the bug and makes it unreadable. |

These v4 variants all generate correctly and are available: `has-[…]`, `not-has-[…]`, `in-[…]`, `*`,
`**`, `before:`/`after:`, `backdrop:`, `starting:`, `placeholder:`, `marker:`, `selection:`, `file:`,
`rtl:`/`ltr:`, `motion-reduce:`, `forced-colors:`, `contrast-more:`, `pointer-coarse:`, `noscript:`,
`print:`, `supports-[…]`, `open:`, `inert:`, `autofill:`, `details-content:`, `@container`/`@md:`.

**Genuinely immovable: only `@keyframes`** — 8 animation bodies (Sparkline ×2, AppShell ×2,
CommandPalette ×2, ProgressBar, Skeleton). There is no variant for a `@keyframes` block.

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

**It does not cover `radio-forced-colors-focus-outline`, which is still a must-fix.** That row looks
identical in the output (2px → 0px) and is a completely different mechanism: the competitor is **our
own `focus:outline-none` utility**, not a consumer's. `Radio.css:35-38` states it at source — *"both
are (0,2,0), and Tailwind's utility is in `@layer utilities` while this file is unlayered."* After
Phase 1 `@layer components` sits **below** `@layer utilities`, so our own utility deletes our own
forced-colors outline. That is WCAG 2.4.7 for high-contrast users, caused entirely in-package, and
nobody has accepted it.

> **Two rows, same numbers, opposite dispositions.** A lane reading "focus rings are layered, the
> consumer wins, accepted" and stopping there will leave Radio broken. The distinction is the
> mechanism, not the measurement.

#### Consequences to carry out

1. **Record the decision in `AGENTS.md`** with its reason, so the next reader does not re-litigate it
   from the leftover asymmetry.
2. **The gate needed extending, and has been.** The probe's only pass state used to be
   `before === after`, which would have left this row red for ever and made "probe green"
   unsatisfiable. It now supports `expectAfter` + `accepted`, with two guards that refuse to run:
   an `expectAfter` without a stated `accepted` reason, and an `expectAfter` equal to `expectBefore`.
   **An accepted row still fails if it drifts off its pinned value** — accepting a change is not
   excusing the row from measurement. Both guards were verified to exit non-zero.
3. **The ~76-site focus-ring-width question is a separate follow-up** (§11) and must not be merged
   into this one. A focus-ring width and a rule stroke are different concepts sharing a literal.
4. **`verify:focus-affordance` cannot see any of this.** It checks *source pairing* — a reset implies
   a replacement — so it stays green while the replacement stops painting. Do not add a focus-ring
   assertion to it and believe the ring is covered.

### 3b. ✔ DECIDED and DONE: `--masonry-gap` is deleted, the gap is utilities

**Shipped.** `gap?: string` → `gap?: Gap` (`"r1"…"r6"`, default `"r4"`), from the same
`layout/shared.ts` every other grid uses. The root carries `gapMap[gap]`; each item carries
`blockGapMap[gap]` + `last:mb-0`, passed down through the Context `MasonryGrid` already had.
`--masonry-gap` no longer exists. `MasonryGrid.css` went 83 → 81 lines and 25 → 22 declarations, of
which **21 are the column scale and 1 is `break-inside: avoid`** — so Phase 2 deleting the column
rules now deletes the file bar one declaration.

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

> **Refines the §4c token rule.** "Parent sets, child reads" is *not* on its own a reason to keep a
> token. Ask first whether the **same component renders both elements** — if it does, it can apply
> both utilities and the token is buying nothing but indirection. The fan-out argument only holds
> where the children are ones the consumer renders and the component never sees
> (`--timeline-highlight-fill` and friends, which stay).

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
cn("code-block-copy", copyButtonProps?.className)   // CodeBlock.tsx:22,76 — the correct form
```

`Swimlane.tsx:57` (`viewAllProps`) and `Table.tsx:70` (`tableProps`) match. **`Spotlight.tsx:111`
does not** — it spreads `imgProps` onto an `<img>` that carries no library class and performs no
`cn()` merge. Either give it a base class or carve it out explicitly as "no library class ⇒ raw
spread is fine." Do not describe the four as uniform; they are three plus an exception.

Worst uncovered cases, all needing a hatch rather than a slot: `DataTable` → `Table` (its root is a
bare classless `<div>` and `DataTableProps` has no `className` at all), `VirtualizedDataTable`
(hardcodes both `className` and an inline `style`), `DataTable` → `Pagination` → `IconButton` (three
levels), and `TagInput` → `Badge` (the chips carry no hook whatsoever).

#### Why `memory/affordances.md` rejects this API, and why that is not a contradiction

That file says of this exact design that a `classNames={{…}}` object *"is an API that only looks like
it works here"*, because the component CSS is unlayered and so `bg-*` and `border-*` *"land in the
DOM, change nothing, and report no error."*

**It is right, and it is still right today.** Its premise is precisely the fact Phase 1 deletes. The
objection does not dissolve because it was mistaken — it dissolves only once Phase 1 has landed.
Hence constraint 2 in §0: **`classNames` is an invalid API until Phase 1 ships.**

### 4b. The house rule

- **`className` → the outermost element the component renders.** Uncontroversial. It fixes
  `DatePicker.tsx:280` (applies `className` raw, with no `cn()`, so that element has no base class)
  and `TagInput.tsx:378` (a bare `<div>` receiving *nothing*, so the true outermost element is both
  unstyled and unreachable).
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
  `ref`, `aria-invalid`, `disabled` (`use-form.tsx:205-217`). The control's `id` is 100%
  consumer-supplied and on three of four components it travels via `...props`.
- An `inputProps` hatch does **not** restore `mergeProps` (a plain spread re-introduces the
  documented `aria-invalid: undefined` erasure bug) or `SearchInput`'s named guard, which keys off
  `id !== undefined` *"because a default name outranks an associated `<label for>`."*

`DateRangePicker.tsx:316` puts `ref`, `className` and `...props` all on the outermost element — but
it **does not generalise**: it has two focusable inputs and therefore no single control, a
constraint the others lack. `ColorPicker.tsx:228-239` documents the split deliberately and is a
written refutation of the symmetric reading, not evidence for it.

### 4c. The token rule

> A component-specific token that is a **single-use alias** of a baseline token is deleted. Use the
> baseline utility.

`--stat-card-gap: var(--R-SIZE-5)` → `gap-r5`. Aliasing the baseline scale adds a name, a lookup and
a divergence risk for nothing.

**Delete (single-use baseline alias):** `--_activity-feed-gutter`, `--_activity-feed-gap`,
`--_timeline-date-gap`, `--MEDIA-CAROUSEL-GAP`, `--calendar-col-gap`, `--calendar-month-gap`.

**Keep — these are not aliases:**

- `--_stepper-gap` — 1 def / **2** uses, both inside `calc()` for the connector inset
  (`Stepper.css:242,243`). No utility exists for a value inside a pseudo-element's `left`/`right`
  calc; deleting it inlines `var(--R-SIZE-4)` twice.
- `--_timeline-card-padding`, `--_timeline-item-gap` — **3 defs each, 1 use each.** These are the
  **density axis**: three values selected by `[data-density]` on the root, applied to a descendant.
  Convertible via `in-[[data-density=dense]]:p-r5` but that is 6 variant-scoped classes, not "use
  the baseline utility." Keep, or convert deliberately with the cost stated.
- **Computed:** the Timeline derivation chain, `--_stepper-active-line-width` (`calc(× 1.5)`),
  `--calendar-month-width`/`-ideal-width` (`--calendar-months` is set by JS),
  `--progress-bar-fill-end` (`color-mix`), `--_table-selected-marker-side` (gradient flipped by
  `:dir(rtl)`), `--stagger-delay` (`inherit` as a mechanism), `--sparkline-color` (`currentColor`).
- **Public contract with inherited fan-out:** `--timeline-highlight-fill`/`-ink`/`-border`,
  `--activity-feed-highlight-fill`/`-ink`, `--stepper-progress-color`. They set a value once on the
  root and reach N children the consumer never renders — something a per-element slot cannot do.
  **Rewrite their comments:** all three currently claim to be "the only override route that works,"
  which stops being true after Phase 1.
- **Domain token layer:** `tokens.css` is kept **for its semantic indirections and its `@theme
  inline` bridge** — not automatically for every line in it. `--C-TREND-UP: var(--C-STATUS-SUCCESS)`
  is a semantic indirection (a trend is not a status); `--MEDIA-CAROUSEL-GAP` living there does not
  exempt it from the delete rule.

**Delete (reimplements a native Tailwind scale):** `--masonry-columns` (20 rules) → `columns-3
lg:columns-4`; `--rui-grid-columns` (30 rules) → `grid-cols-3 md:grid-cols-4`. That is **50 of the
64** rules whose declarations are exclusively custom properties (method: `rules containing only
custom-property declarations, across all of src`). This is also a single-source-of-truth violation
(`CLAUDE.md` rule 3), which makes it the highest value-to-risk change in the plan.

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
`--BUTTON-GAP-SM/MD/LG`, and `MediaCard.css`'s six raw `oklch(1 0 0)` overrides of **contract**
tokens.

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
| `NumberInput.tsx:171-175` | inline `style` custom property from `CHEVRON_SIZE`, a **module constant** (`:44`) | A frozen default wearing a computed value's clothes: unthemeable and un-overridable. Move the default to CSS, or write the padding as a utility. |
| `Skeleton.tsx:34,44` | inline `style` **geometry** — `width = "100%"` defaulted, then `style={{ width, height, ...style }}` | **`<Skeleton className="w-20" />` silently loses.** `...style` is last, so a caller's `style` *does* win — `className` is the only thing that cannot. Fix: `w-full` + an `h-*` map. |
| `ProgressBar.css:35-37` | declares `--progress-bar-fill`/`-fill-end` **on `.progress-bar__fill`** | A consumer theme at `:root` loses permanently; variants at `:49-66` redeclare on the same element, compounding it. Move to `.progress-bar`. |
| `Sparkline.css:10-13` | declares `--sparkline-color` on `.sparkline` | Same — **and `docs/components/sparkline.md:133-134` already documents the consequence as a limitation.** The doc is evidence somebody noticed, not evidence it is right. |

**Fade timing on floating surfaces is unreachable by `className` at all.** `floating-motion.ts:9-16`
documents it at source: `useTransitionStyles` writes `transition-duration` **inline**, and *"the
value cannot be supplied from CSS while that hook owns it."* A `transition-*` or `duration-*` utility
added to such a panel — by `className`, by `classNames`, or inlined from CSS — is **silently dead**.
Fade tempo is reachable only through `--MOTION-DURATION-*`. **Three importers, not four:**
`Popover.tsx:29`, `HoverCard.tsx:31`, `menu-internals.tsx:29` — both menus inherit it through
`menu-internals`, so one edit point covers them.

**`AvatarUpload.tsx:267`** renders `<Avatar size={size} className="size-full" />`, and
`cn("size-16","size-full")` → `size-full`, so tailwind-merge drops the class `size` mapped to. The
accurate finding is narrow: **one redundant utility, no visual consequence.** `size` still drives
`initialsTextMap` (`Avatar.tsx:24-31`), and `AvatarUpload`'s own `containerSizeMap` is
value-identical, so the geometry is unchanged. **A lane told "the `size` prop is dead" would delete
it and break initials sizing.**

---

## 5. Triage — not every gap is slot-shaped

Each verified gap resolves to **one of five**, and a lane must say which before writing code.

| | Resolution | Tell |
| --- | --- | --- |
| **a** | Not a gap | No caller `className` can reach that element, and the value is not something a consumer would vary. A bare static class here is correct. |
| **b** | Token | The override is a *value*. Expose `--component-*`, set inline by the consumer. |
| **c** | Slot | The consumer must change *which utilities apply* on an element this component renders. |
| **d** | Compound subcomponent | The element has independent identity a consumer would address by name, **and** it has *no* override path at all. |
| **e** | Render prop | The element is **loop-generated**, so no name can address one instance — and what the consumer wants is different *content*, not a different class. |

**Apply the loop test first.** Are the internals loop-generated? If yes, (d) is *structurally
impossible* — no compound API can name "the 15th cell" — and the answer is **(e)**.

**▲ ONE-WAY DOOR: classify before coding.** High slot count means the element tree *is* the API, but
the resolution may be (d), (e), or a mix. `CalendarBase`'s 15 internals split: **9 are
loop-generated** by `renderMonthGrid` (`CalendarBase.tsx:535-628`), 42 cells per month — what a
consumer wants there is a dot on a booked day, i.e. content, i.e. a `renderDay` render prop.
**6 are chrome rendered exactly once** (`calendar-header`, `-label-button`, `-months`, `-footer`,
`-today-button`, `-month-caption`) and are ordinary (c). So: 6 slots + 3 applied-to-every-instance +
`renderDay`. **Not** 15 slots, and **not** a compound.

**Sibling asymmetry is a LEAD, not proof.** `memory/affordances.md`: which element a caller's
`className` addresses is a **per-component** answer, and a non-compound component whose sibling is
compound will look asymmetric for a legitimate reason — the compound sibling's caller addresses the
inner element directly through a sub-component. So the tell needs a second test: **does the element
have *no* override path, or merely a *different* one?** Only the first is a (d). Cheap disproof:
render with a caller class and read the class list. If it landed on the root, the real question is
whether the inner element has any route — a different finding with a different owner. **Check the
component's own doc first**; for `MultiSelect` it already states where `className` lands.

Two hard constraints found at source, both of which a lane would otherwise break:

- **`.calendar-picker-cell` and `.calendar-day` are `querySelector` targets** (`CalendarBase.tsx:174`,
  `:366`) driving focus management, plus a third query at `:348` keyed on `[data-day]`. These are
  *behavioural markers*: append to them, never replace them.
- **`Calendar.css` has no owning component.** It styles `CalendarBase`'s markup entirely, yet only
  `src/styles.css:22` imports it — neither `Calendar.tsx` nor `RangeCalendar.tsx` does. Rename to
  `CalendarBase.css` in the same lane or the ownership stays invisible.

**`FileUpload` is a (d), but not as 27 slots.** Its internals mostly live inside **three already-
separate private components** — `MediaPreviewLarge` (`:220`), `MediaPreviewGrid` (`:285`),
`FilePreviewItem` (`:344`) — selected by internal `previewMode`/MIME logic (`:489-500`, dispatched
`:655`/`:670`/`:688`) that the consumer cannot predict. A flat 27-key map would be a window onto
three element trees that may not even render. Right design: export those three (or take
`renderPreview`/`renderFile`), **plus** small slots for the dropzone chrome the root always renders,
**plus** keep the root state modifiers as `data-*` so consumers write `data-drag-over:*` variants.

### ▲ ONE-WAY DOOR: triage (d) candidates, each with its proving sibling

| Component | Internals | Proved by |
| --- | --- | --- |
| `MultiSelect` | 10 | `Combobox.Input`/`.Content`/`.Item`/`.Empty`; `TagInput` for `tags`/`tag`/`tagRemove` |
| `ColorPicker` | 13 (largest in `form/`) | `Combobox` — trigger+panel is compound-shaped |
| `CommandPalette` | 11 + a `renderOption` closure (`:338`) a consumer cannot replace | `DropdownMenu` exposes `Trigger`/`Content`/`Item`/`Divider`/`Label` for *the same anatomy*, from JSX instead of an array — and `Trigger` is the piece `CommandPalette` most conspicuously lacks |
| `Tooltip` | 1 literal, but all **10** `Tooltip.css` declarations unreachable | `Popover` — identical hook, portal and fade, with the API present |
| `Repeater` | 5, per-row identity | `Combobox.Item`; also needs a `ref`/rest channel regardless |

**Severity precision on `Tooltip` and `Repeater`:** a passed `className` is **not** silently dropped
at runtime — the props types are closed (`Tooltip.tsx:26-38`, `Repeater.tsx:77-127`), so it is a
**TypeScript error**: loud, at compile time. The defect is *"there is no override path"*, not *"the
override path is broken."* That is the same distinction that sank both Phase 0 claims (§10). Do not
re-inflate it.

---

## 6. Phases

Each phase is independently shippable, and **Phases 1–3 deliver nearly all the consumer-facing value
before a single component's CSS is inlined.**

### Phase 1 — `@layer components`

Wrap this package's component CSS in `@layer components` by adding `layer(components)` to the **46
individual imports** in `src/styles.css`. The aggregate import cannot carry it:

```
node scripts/probe-cascade-layer.mjs      # first section proves it
  @import "./styles.css" layer(components);  →  Error: `@source` cannot be nested
```

(`src/styles.css:75` is `@source "../src/**/*.{ts,tsx}"`.) **This is one serial commit that owns
that file. No lane starts until it lands.** Phase 2 needs the same file: `Grid.css` is imported
twice, at `styles.css:57` and `Grid.tsx:5` — uniquely in the package.

**Why this must precede Phase 4 and cannot follow it.** Partial inlining is *not order-neutral*:
every declaration moved into a utility drops out of unlayered precedence into `@layer utilities`,
i.e. **below** the rules still in the same file. A file going from 53 rules to 9 doesn't just shrink
— its remaining 9 start winning fights they used to lose. Phase 1 collapses three interacting
precedence axes (unlayered-vs-layered, specificity, source order) down to one, which is what makes
incremental conversion safe.

#### The eight must-fix regressions, one accepted delta, two holding controls

```
timeline-even-animation            default          slide-left, fade  →  slide-right, fade
stagger-ancestor-inherit           default          0.999s            →  0.05s
radio-forced-colors-focus-outline  forced-colors    2px               →  0px      WCAG 2.4.7 — NOT covered by §3a
scrollreveal-no-js-opacity         scripting-none   1                 →  0        WCAG
tabs-scrollbar-height              default          3px               →  10px
tabs-scrollbar-thumb-color         default          transparent       →  visible
hero-stagger-animation-name        default          fade              →  slide-up, fade
hero-reveal-hidden-animation-none  default          none              →  slide-up, fade
switch-ring-vs-consumer-reset      consumer-reset   2px               →  0px      ACCEPTED — §3a
switch-ring-baseline               default          2px               →  2px      control, held
control-sronly-padding             default          0px               →  0px      control, held
```

- **Timeline** — alternating entrance direction inverts. `Timeline.tsx:17-26` (#342) is why the
  component keys direction to `:nth-child`. The competing rules are `Timeline.css:465` at (0,4,0)
  and `:526` at (0,5,0) — *not* (0,3,0), and `:526` is inside a `min-width: 40rem` query. Direction
  of the inversion holds regardless: the foundation's `.fade-right` is (0,1,0) and unlayered, so it
  wins on layer, not specificity.
- **Stagger** — the `--stagger-delay: inherit` mechanism dies (`Stagger.css:19`); an ancestor's value
  stops reaching `animation-delay`.
- **Radio** — the forced-colors replacement outline is lost. The rule is `Radio.css:39-42` inside the
  `@media (forced-colors: active)` opened at `:22`.
- **ScrollReveal** — with scripting off, content is **permanently invisible**, "including the page's
  `<h1>` when the reveal wraps a Hero." Inlining does **not** fix this: a `noscript:opacity-100`
  utility lands in `@layer utilities` and still loses.
- **Tabs** — the scrollbar track triples and the thumb becomes permanently visible. Note the
  regression is **asymmetric**: the foundation sets `width` *and* `height` at `0.625rem`
  (`../response-ui-css/src/base.css:67-70`) while `Tabs.css:15-17` sets only `height`, so the
  vertical dimension was never won. Relevant if the fix is "re-specify" rather than "move."
- **Switch / all focus rings** — §3a. The baseline control is the point: the ring survives layering
  fine; what changes is that a consumer's reset now beats it.

#### The search is property-intersection, not class-name overlap

`Tabs.css` vs the foundation's universal `*::-webkit-scrollbar` is the proof: there is **no shared
class name**, so a class-overlap search structurally cannot find it. **The search must be: for every
declaration in this package, find every *unlayered* foundation rule that sets the same property and
can match the same element — including universal selectors and pseudo-elements.** Record direction
per rule; some inversions are no-ops. And note from §2a that the foundation is unlayered almost
everywhere, so `tokens/`, `themes/`, `responsive/` and the rest of `base.css` are all in scope.

#### `Hero.css` — found by search, not by the original row list

The probe's first nine rows were hand-listed and missed these. They were found by grepping the source
for foundation-owned class names, which returns **7 rules in 4 files** (§2a) — two of them in
`Hero.css`, inside `@media (prefers-reduced-motion: no-preference)`:

```css
.hero__content .stagger-item { animation-name: fade; … }                      /* :91  (0,2,0) */
.hero__content .scroll-reveal-hidden .stagger-item { animation-name: none }    /* :97  (0,3,0) */
```

**The collision is conditional, and worth understanding before fixing it.** The foundation's own
`.stagger-item` ships **no `animation-name`** — only `animation-delay` and `animation-fill-mode`. So
Hero's rules invert only when the item *also* carries a foundation `.fade-*` class, whose `animation`
shorthand does set the name. That is exactly the case `Hero.css:88-89` documents: *"any Stagger you
nest yourself inside `Hero.Content` picks up the same fade."*

Measured with a `.fade-up` on the item, both rows regress, and **`:97` is worse than `:91`**:

- `:91` — `fade` → `slide-up, fade`. Hero's deliberate "plain fade" for staggered items is lost; they
  now slide too.
- `:97` — `none` → `slide-up, fade`. **The entrance now runs while the reveal is still hidden**,
  which is the precise failure `Hero.css:82-86` explains the keying exists to prevent: *"ScrollReveal
  drops the entrance class on `animationend` — which would cut a later item's animation off
  mid-flight."*

**The lesson for the rest of Phase 1's search:** a hand-written row list is an allowlist, and the rows
nobody thought of are the ones that ship. Derive the row set from a search over source and assert its
count. `memory/gates.md`: a new gate's exemptions are where the next bug lives.

#### Of the nine "deliberate precedence" sites, only two carry a converting rule

**All eight originally-cited lines are comments, not rules** — the honest framing is *nine places
documenting reliance on being unlayered*, and the probe shows what each actually does:

| Site | What is really there |
| --- | --- |
| `Radio.css:37` | comment → **real inverting rule** at `:39-42`. Probe-confirmed. |
| `Stagger.css:8` | comment → **real inverting rule** at `:19-20`. Probe-confirmed. |
| `Combobox.css:29`, `ColorPicker.css:217` | document a deliberate **absence** ("do not declare `border` here again"). Nothing to convert. |
| `Timeline.css:70`, `ActivityFeed.css:31` | custom-property fan-out notes. Custom properties resolve per element; layering does not affect the mechanism. |
| `MasonryGrid.css:11` | **No longer exists.** The rule it annotated was deleted with `--masonry-gap` (§3b); the trailing-gap reset is `last:mb-0` on the item. One fewer site for Phase 1 to convert. |
| `AppShell.css:205` | probe measured `control-sronly-padding` **held**, 0px → 0px. Not a regression. |
| `ScrollReveal.css` | was missing from the original list, and is the a11y/no-JS one. |

**So four of the eight need no code change at all — only comment rewriting.** That shrinks the serial
commit noticeably from what "converting the eight sites" implies.

#### Two regressions have a foundation-side fix — and taking it crosses a boundary

`Stagger.css:11-14` records the option itself: *"Delete both declarations once
`animations/stagger.css` there reads `var(--stagger-delay, var(--MOTION-STAGGER-DELAY))` itself"* —
and `../response-ui-css/src/animations/stagger.css:4` currently has no fallback. Likewise
`.scroll-reveal-hidden{opacity:0}` is owned by **`response-ui-css`**
(`src/animations/scroll-reveal.css:2`), not by this package, and that file already carries a
`prefers-reduced-motion` escape at `:7-10`, so adding a `scripting: none` sibling there is ~3 lines.

**Both are out of scope.** `memory/README.md` §6: scope is this package only, *not even to add a
script*, and that boundary was crossed once and reverted in full. Record them as foundation
follow-ups; fix in-package. But do not claim ScrollReveal "has to be re-specified" without recording
that a cheaper fix exists on the other side of a boundary we have chosen not to cross.

**Precedent to read first:** `../response-ui-css/CHANGELOG.md:263` and `src/base.css:44-48` record
the foundation package making this exact decision deliberately, *"Verified by walking the CSSOM for
the rule and asserting its enclosing layer."* It is the closest thing to a worked example that
exists.

**Gate:** `bun run probe:cascade-layer`. Two CSS builds differing only by `layer(components)`, diffed
by `getComputedStyle` across four emulated environments. It exits non-zero on any change **and on any
inert row**, because a probe that measured nothing is worse than one that failed.

**What would prove Phase 1 wrong, and how to make it go red:** flip one converted rule back and
confirm its probe row reddens. If a row cannot come back red it is not evidence. Two traps in reading
the output:

- The probe counts `unmeasurable` (engine reports nothing for a pseudo-element) into `inert`. **Never
  read either as safe** — an inert row is a failure *of the probe*, and it is worse than a red one
  because it gets cited.
- **The accepted row is the one to re-check by hand, not the one to skip.** It is the only row whose
  pass state is a changed value, so it is the only place where a fixture error and a correct
  measurement produce the same green. Confirm its `before` precondition still holds after any edit to
  `Switch`'s ring recipe.

### Phase 2 — the two column-scale files

`Grid.css` and `MasonryGrid.css` → native `grid-cols-*` / `columns-*`. Both gates verified against
Tailwind's own source:

- `minmax(0,1fr)` is **byte-identical**: Tailwind's `grid-cols` handler emits
  `repeat(${n}, minmax(0, 1fr))`, matching `Grid.css:5`. The word-wrap promise in `AGENTS.md:393`
  survives untouched.
- Breakpoints **match exactly** — `tailwindcss/theme.css:327-330` = 40/48/64/80rem vs
  `Grid.css:19,29,39,49`, and nothing in `response-ui-css` overrides `--breakpoint-*`.

**`Grid.css` is fully deletable.** Required change: `columnClasses` (`Grid.tsx:21-29`) must become a
static lookup — Tailwind cannot scan `` `rui-grid--${bp}-${count}` `` — which forces `columns` from
`number` to a bounded union. Note it is currently a **function** that pushes template strings into an
array, not an object literal, so **there is no static map to swap; the lookup table has to be
written.** This is breaking and it **fixes an existing silent bug**: `columns={7}` currently falls
back to 1 column via `var(--rui-grid-columns, 1)`. `MasonryGrid.tsx:23` already types this correctly
as `1|2|3|4`.

**`MasonryGrid.css` is down to the column scale plus one `break-inside: avoid`** — §3b already
removed the gap. Deleting the column rules therefore deletes all but that one declaration, which
becomes `break-inside-avoid` on the item. Same `columns` → bounded-union change as `Grid`:
`MasonryGrid.tsx:23` already types it `1|2|3|4`, so only the class lookup has to change.

**What would prove Phase 2 wrong:** assert the generated class string for `columns={3}` before and
after, and assert `columns={7}` is now a type error rather than a silent 1-column fallback.

### Phase 3 — seams + `classNames`

Adds `classNames` per §4a and applies the house rule per §4b, to each verified gap. **Purely additive
and visually a no-op** — and, crucially, **fully testable in jsdom**: asserting
`classNames={{control:"sentinel"}}` lands `sentinel` on the right element needs no stylesheets.

**Every lane verifies its gaps at source before acting.** The gap list is a search result, not a
finding. A lane that "fixes" a non-gap costs more than one that misses a real one, because the fix
lands in public API. In particular, confirm a caller's `className` can actually *arrive* at the
element: **a bare static class on an element no caller `className` reaches is not a defect.**

**Do not start this before Phase 1.** §0 constraint 2.

**Gate:** one slot-override test per slot-bearing component, plus the re-scoped
`verify:slot-annotations` (§7).

**What would prove Phase 3 wrong:** for each new slot, delete the `cn()` merge and confirm the
slot-override test reddens. A slot that passes its test with the merge removed is not wired up.

### Phase 4 — a standing convention, **not a campaign**

> **Not "optional polish we'll probably do" — *not a project*.** The rule is: **when you touch a
> component for another reason, prefer utilities.** No lanes, no sweep, no completion criterion.

The cost/benefit does not survive the numbers: **~1,800 mechanical edits** to delete **~6% of the
CSS by line (~8% by declaration)**, buying consistency only, after Phases 1–3 have already delivered
every capability.

And there is recorded precedent that this exact shape of refactor ships a11y regressions:
**`memory/traps.md:85-163` records a `1.31:1` focus ring on `<Button variant="danger">`, shipped by
the pass whose entire purpose was making the focus ring consistent.** A sweep motivated by
consistency that broke the thing it was making consistent, with every gate green. That is this
phase's own future, written down in advance.

Stop where a wall of utilities would be less legible than the CSS it replaced. `Timeline.css` is the
clearest case: 529 lines, 114 declarations, 50.9% prose explaining a layout contract.
`src/util/focus.ts` already documents itself as the utility-side counterpart to the `:focus-visible`
rules in component CSS — **a hybrid is this package's established, gated pattern, not a compromise.**
**Whatever boundary is chosen, write it down as a decision with its reason**, or the next reader will
read the leftover CSS as unfinished work and "finish" it.

### Phase 5 — serial cleanup and release

Prune dead `@import`s from `src/styles.css`, reconcile the docs, ship.

**The doc sweep, enumerated rather than estimated.** The previous version sized this with two figures
that do not hold:

```
grep -rliE 'unlayered|no Tailwind utilit' docs AGENTS.md | wc -l     # 38 files (all docs/components/*)
# of those, occurrences inside a "## Gotchas" section:               # 14 files, 28 occurrences
```

**14, not 21** — the 21 was the count of files mentioning `unlayered` at all, and the two got
conflated. And **"~20 more are falsified and contain no CSS at all, so a CSS-shaped sweep cannot find
them" does not hold**: only **2 of 91** component docs contain zero CSS mention (`field.md`,
`parallax.md`), and neither is on the change list. The real falsified-and-CSS-free set is small
enough to **enumerate**, and starts with `repeater.md` (0 CSS mentions, 5 internals to restructure)
and `multi-select.md:45`, which states the *absence* of a subcomponent as design intent — correct
today, a lie after Phase 3.

Why this matters beyond bookkeeping: `memory/README.md` §16 — prose describing a footgun reads as a
*decision*, and the next reader treats the workaround as the API. Answer the prose; do not delete it.

**Terminology collision this plan creates.** `AGENTS.md:390` says *"Always wrap classNames with
`cn(...)`"*, using **"classNames" as a plural noun**. Once §4a ships a prop called `classNames`, that
sentence instructs readers to do the exact thing §4a prevents. Reword to "class strings."

**`classPrefix` has zero documentation** (`grep -rl classPrefix docs` → 0), so deleting it needs no
doc sweep — but it also means a public prop shipped undocumented. Decide whether it was ever public.

**Release shape: ship per phase.** "Each phase is independently shippable" and "one deliberate
`0.12.0`" cannot both hold, and the breaking surface is too large for one minor anyway: compound
rewrites, `Grid.columns` union, `MasonryGrid.gap`, `classPrefix` deletion, the `className` reroute.
Phase 1 as its own release with its own probe, Phase 2 as its own, and let the version land where the
breakage actually is.

---

## 7. Definition of done — per phase

| Phase | Done when | Shippable alone? |
| --- | --- | --- |
| **1** | §3a recorded in `AGENTS.md`; `probe:cascade-layer` shows **zero regressions and zero inert rows** (accepted deltas are allowed, and each must still match its pinned `expectAfter`); the property-intersection search recorded with direction per rule; `src/styles.css` owned by this one commit | yes — and it alone makes `<StatCard className="flex-row">` work |
| **2** | `Grid.css` deleted; `MasonryGrid.css` deleted (its gap already landed — §3b); `columns={7}` proven to be a type error rather than a silent 1-column fallback | yes |
| **3** | items 1–9 below, per component; slot vocabulary frozen first (§8) | yes, per family |
| **4** | items 1–5 below, per file; the CSS/utility boundary written down with its reason | yes, per file — **and abandonable at any point** |

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
3. **Seams**: every element carrying a class literal is reachable via `className` (root) or
   `classNames.<slot>`; slot names declared in the props type.
4. **House rule**: `className` → outermost element; `...props` → the focusable control (§4b).
5. **`cn()` wherever a caller `className` can arrive.** *Not* "no bare-string classNames anywhere."
   **The two readings differ by two orders of magnitude and only one is a house pattern:**

   ```
   grep -rn 'className: "' src --include=*.tsx | grep -v '\.test\.\|\.examples\.' | wc -l   # 3
   ```

   Exactly **3** in production — `MultiSelect.tsx:337`, `:370`, `ColorPicker.tsx:289` — all the
   props-getter object-literal form, and all deliberate. The broad reading is two orders of magnitude
   larger:

   ```
   grep -rno 'className="[^"{]*"' src/components --include=*.tsx \
     | grep -v '\.test\.\|\.examples\.' | wc -l          # 238, across 50 files
   ```

   Led by `FileUpload` (36), `CalendarBase` (15), `CommandPalette` (11), `ColorPicker` (11).
   **Never generalise the 3 into "a small containable pattern," and never sweep the ~238 as if it
   were the defect** — most of them are on internal elements no caller `className` reaches, which is
   triage (a). The requirement is item 3, reachability; `cn()` is how you satisfy it once a seam
   exists.
6. **Tokens**: §4c applied. Retained tokens documented as public; no themeable default written as an
   inline arbitrary property (§4d).
7. **Tests**: class-asserting tests updated, **plus one slot-override test per slot-bearing
   component.** Size this from a method you state and run (§2c) — not from a remembered number.
8. **Docs**: `docs/components/<name>.md` theme-token prose rewritten (not deleted); slots table
   added; `*.examples.tsx` still compiles. Beware the docs generator: an **empty** ```` ```tsx ````
   fence swallows every heading and fence up to the next example's closing fence, and the only signal
   is an `unused example` error naming a *different* example. Put a placeholder line in a new fence
   and diff the page's heading list afterwards.
9. **Gates green**: `typecheck`, `lint`, `test`, and all `verify:*`.
10. **`src/styles.css` untouched.** Phase 1 owns it; Phase 5 prunes it.
11. **Cross-lane seam pass.** After a family's lanes merge, one pass re-reads the *seams between*
    them — a slot named consistently inside two lanes can still disagree across them, and each
    lane's gates were green. Precedent: `memory/README.md` §14.
12. **`git status` comes back empty.** No scratch files, no `--keep` build directories, no
    half-reverted probe. Prior waves shipped exactly this with every gate green.

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
| `probe:cascade-layer` | Two CSS builds differing only by `layer(components)` produce identical computed styles across four emulated environments — **except** rows carrying an owner-accepted `expectAfter`, which are pinned to their decided value | **Built**, 11 rows. Not in `prepublishOnly` — it needs Playwright and two vite builds; run on demand and in the Phase 1 PR. |
| `verify:token-mirror` | Every `@theme inline` name in `tokens.css` appears in `createCn`'s list in `src/util/style.ts` | To build, ~20 lines. The one remaining silent-drift risk: tailwind-merge's arbitrary-property and standard class groups are generic, so a **named token value** added to `tokens.css` and not to `createCn` is the only real drift. Gate that and nothing more. |
| `verify:slot-annotations` | *"A literal annotated `(c)` has a corresponding slot, and a slot is merged with `cn()`."* | To build, after Phase 3 ships `classNames`. |

### Why `verify:slot-reachability` was re-scoped

Written literally — "every class literal must be reachable" — it fails ~300 of 478 literals and needs
an allowlist roughly **twice the size of the clean set it guards**, which is the exact anti-pattern
`verify-focus-affordance.mjs`'s own header warns against. The flaw is conceptual: it conflates two
questions.

| Question | Decidable by a parser? |
| --- | --- |
| *Does a caller `className` flow to this element?* | **Yes**, ~90% of the time — a data-flow question |
| *Should it?* | **No** — that is the (a)–(e) triage, which is judgement |

Feasible order: **(1)** ship `classNames`; **(2)** land the triage as source annotations, so the
judgement is recorded where the element is; **(3)** gate the decidable half. That gate is small, has
no allowlist, and cannot be satisfied by a lie.

**It needs class literals to be statically visible, so the runtime-built names must go.**
`menu-internals.tsx` emits five template-concatenated literals (`:288, :346, :368, :388, :408`), and
**`:368` is worse than its siblings** — a bare `` `${classPrefix}-item-icon` `` with no `cn()` and no
`className` parameter, so by §5's own discriminator it is the only one of the five with *no override
path at all*. Meanwhile `classPrefix` is a **generalisation with one value** (`DropdownMenu.tsx:26`
and `ContextMenu.tsx:25` both set `"dropdown-menu"`) and is **already violated**:
`ContextMenu.tsx:81` hardcodes `"context-menu-trigger"`, a class **no CSS file defines** — so
`ContextMenu` currently emits `dropdown-menu-*` styles plus one orphan class, and anyone styling it
from CSS is targeting classes named after the wrong component. **Delete the mechanism**; use static
shared names (`menu-content`, `menu-item`, `menu-item-icon`, `menu-separator`, `menu-group-header`)
and `classNames` for per-instance override.

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
components also finds the (d) candidates and fixes the slot vocabulary across siblings. **Two
families' vocabularies are settled (form, overlay); sequence+tabular and layout+media are not.
Phase 3 cannot start for those two until they are.**

**Hard dependencies — same lane, or serialize:**

| Cluster | Why |
| --- | --- |
| `CalendarBase` + `Calendar` + `RangeCalendar` + `DatePicker` + `DateRangePicker` | `CalendarBase` owns 15 internal classes all four consume |
| `Table` + `DataTable` + `VirtualizedDataTable` | `VirtualizedDataTable.css` selectors reach **into `Table`'s markup** |
| `menu-internals.tsx` + `DropdownMenu` + `ContextMenu` | shared `classPrefix` literals (§8) |
| `Avatar` + `AvatarGroup` + `AvatarUpload` | `AvatarUpload` overrides the inner `Avatar`'s className |
| `Sparkline` + `StatCard` | `StatCard.Sparkline` wraps `Sparkline` |

Softer affinity, worth keeping together for convention consistency: the 16 modules importing
`src/util/focus.ts`.

**Size lanes by declaration count, not component count.** `FileUpload` is 53 rules; `Tooltip` is 1.
An over-stuffed lane is where a verifier starts rubber-stamping.

**Use `isolation: "worktree"` per lane.** Five agents in one tree each running `typecheck` will see
each other's half-finished edits and chase phantom failures.

**Settle the convention before any fan-out** (§8 vocabulary). Phase 3 starts with the written
convention plus one worked reference component — `StatCard`: 5 subcomponents, one known unreachable
wrapper, small enough to judge ergonomics on.

**Re-measure anything a lane hands back, especially when it came back looking exact.**
`memory/README.md` §18: a four-way parallel survey produced the sharpest findings of a pass *and*
most of its inflated numbers. This document's own history is the case study.

---

## 10. ▲ ONE-WAY DOOR: slot vocabulary

Freeze this before any fan-out. `grep -rn classNames src/components` returns **zero**, so this *is*
the whole public API — greenfield, and permanent once shipped. Five agents inventing names in
parallel would produce `wrapper`/`container`/`outer`/`root`/`box` for one concept.

**Banned names, with reasons. This list matters as much as the chosen names.**

| Banned | Why |
| --- | --- |
| `root` | §4a — `className` is the root. |
| `wrapper`, `container`, `outer`, `box`¹ | The four names independent lanes would each invent for **`control`**. |
| `content` | Reserved as a *compound subcomponent* name — `Combobox.Content` ships (`Combobox.tsx:537-542`). A component gets `Content` the subcomponent **or** `panel` the slot, never both. |
| **`label`** | **Hard flag.** `*Label` props already mean *accessible name*, and there are **30 distinct ones**, not the handful previously listed — `grep -rhoE '^\s+[a-z][a-zA-Z]*Label\?:' src/components \| sort -u`. It also collides with the exported `Label` component (`form/index.ts:48`). |
| `chip` | `TagInput`'s public vocabulary is already "tag" (`maxTags`, `validateTag`, `TagRejection`). |
| `adornment`, `prefix`/`suffix` | MUI vocabulary; these elements are `icon` + `affordance` here. |
| `announcer` | `sr-only role="status"` regions (`TagInput.tsx:471`, `Repeater.tsx:308`). Exposing invites a consumer to drop `sr-only`. Triage **(a)**. |
| `arrow` | **No such element is rendered.** But see the note below — this is not dead code. |
| `backdrop`/`scrim` | `::backdrop` takes no class. **(b) token** — `--OVERLAY-SCRIM-COLOR` exists in `response-ui-css/src/tokens/overlay.css:2`. |
| `header`/`footer`/`closeButton` | `Dialog`/`Drawer` render `{children}` only; that structure is consumer-supplied. |

¹ `box` is permitted for exactly one thing: `OTPInput`'s N homogeneous entry boxes.

> **`arrowRef` is public API, not dead code.** `use-floating.ts:17,23,29` wires the floating-ui
> `arrow` middleware behind it, nothing in this package passes it, *and* `useFloating` is exported
> (`src/hooks/index.ts:10` → `src/index.ts`) with the option documented at
> `docs/components/popover.md:85`. A consumer can activate it. Deleting it is a **breaking change**,
> not a dead-code removal; the real choice is cover it or document it as unsupported.

**Cross-family collision to settle before either lane starts:** the menus call the leading glyph
`item-icon`, the form family proposed `itemIndicator` for the check mark, and `SearchInput`/`Toast`
use `icon` for a leading glyph. These are **two concepts** — a leading glyph and a selection
indicator. Fix the pair as `itemIcon` + `itemIndicator` *once*, family-wide, or the package ships
three words for two things.

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

- **One rule-width scale** (~5 sites, the rail family: `--_timeline-line-width`,
  `--_timeline-highlight-ring`, `--_stepper-line-width`, `--_activity-feed-line-width`,
  `--_activity-feed-highlight-ring`, plus `3px` for the table marker) **and, separately, a
  focus-ring-width question** (~76 sites). Two different concepts sharing a literal; §3a touches the
  second directly. Do not merge them.
- **No overlay z-index scale.** `Popover.css:17` = 40, `DropdownMenu.css:18` = 40, `Tooltip.css:11` =
  50, `ToastContext.tsx:212` = `z-50`, and `HoverCard` sets **nothing** (no `HoverCard.css` at all).
  Four values, one absence, no shared contract. Needs one `--OVERLAY-Z-*` scale in `response-ui-css`.
- **`AGENTS.md:392` is false about `Repeater`.** It claims `Repeater` is "a plain function component
  taking React 19's `ref` prop." `RepeaterProps` (`Repeater.tsx:77-127`) is a closed type ending at
  `className?: string` — no `ref`, no `ComponentProps` intersection, no rest spread, and the
  signature destructures none. `<Repeater ref={…}>` is a type error. **Check `DataTable` and
  `VirtualizedDataTable` against that same sentence before trusting it** — `AvatarUpload` does
  document its `ref`, so the bullet is only partly wrong.
- **Verbatim duplication:** `TagInput.tsx:463` duplicates `date-picker-internals.ts:69`
  (`"mt-r6 text-body-3 text-status-error"`). `DatePicker` and `DateRangePicker` both import the
  constant; TagInput is the sole drifter. Import it.
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

---

## 13. Settled — do not re-derive

| Claim | Outcome | Where the reasoning lives |
| --- | --- | --- |
| `AppShell.tsx:396` overwrites the consumer icon's `className` | **Refuted.** `icon` is `LucideIcon` — a *component*, not an element — so the class is handed over as a prop and there is nothing to overwrite. The prescribed `cn()` fix is a provable no-op. | `bugs/ARCHIVE.md` #497 |
| `MultiSelect.tsx:337,370` discard an incoming `className` | **Refuted.** The caller's `className` is destructured at `:98` and merged at `:256`; nothing arrives on the two inner paths, so nothing is discarded. What survives is a *different* finding: those elements have no prop-level route at all, which is §5 (d) work. | `bugs/ARCHIVE.md` #498 |
| "No utility can redefine inherited tokens for a subtree" | **False.** `[--C-TEXT-PRIMARY:var(--C-TEXT-INVERSE)]` generates and inherits normally. `MediaCard` moves. | §2d |
| "Vendor pseudo-elements are a lateral move" | **False.** `cn("[&::-webkit-slider-thumb]:size-r5","…:size-r3")` → `size-r3`. All 21 rules can move. | §2d |
| "Timeline's `:has()` rules can never move" | **Overstated.** `not-has-[…]` generates, so the pair restructures into mutually exclusive conditions and improves. | §4c |
| "`> *` reaching caller-supplied children is immovable" | **False.** The `*` variant is `:is(& > *)` at (0,1,0). `ActivityFeed`'s `.activity-feed-aside > *` moves and *improves* — the current selector is (0,3,0) and unbeatable. | §2d |
| "We need a gate asserting tw-merge knows every utility" | **Mostly unnecessary.** Only a *named token value* can drift. | §8 `verify:token-mirror` |
| "A component needing 15–27 slots is really a compound" | **Refuted by `CalendarBase`.** High slot count means the element tree is the API, but the resolution may be (d), (e), or a mix. | §5 |
| "`arrowRef` is dead code; delete it" | **Refuted.** It is exported, documented public API. | §10 |
| "`Hero.css` is a cross-package collision site" | **Confirmed by measurement**, and `:97` is worse than predicted — the entrance fires while the reveal is still hidden. Found by grepping for foundation-owned class names, not by the hand-written probe list. | §6 Phase 1 |
| "`Hero.css:91` loses to any foundation `.fade-*` class" | **Imprecise as stated.** The foundation's `.stagger-item` sets no `animation-name`, so the collision needs a `.fade-*` class *on the item* — real, but conditional on markup a consumer controls. | §6 Phase 1 |
| Byte offsets into compiled CSS as evidence for the unlayered claim | **Self-invalidating.** The claim survives re-checking; every offset moved with the build. Cite the command. | §2a |
| "`--masonry-gap` is a genuine inherited fan-out, so the token rule spares it" | **Refuted.** The fan-out was real but the *same component renders both elements*, so it applies both utilities. Deleted. | §3b |
| "`MasonryGrid`'s trailing-gap reset must stay in CSS because unlayered beats `mb-0`" | **True only while the sibling declaration was unlayered.** Once the margin became a utility too, `last:mb-0` at (0,1,1) beats it at (0,1,0) in the same layer. Deleting the competitor beat layering it. | §3b |
| `masonry-grid.md`'s "`className="mb-0"` loses, use `mb-0!`" | **Inverted by §3b, and it cited compiled byte offsets.** A *false cannot* — the worst doc-rot shape, because it steers consumers away from something that now works. | §3b |
| The `...props` half of the house rule should move to the outermost element | **Withdrawn.** It traded WCAG-load-bearing wiring for API symmetry. | §4b |

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
