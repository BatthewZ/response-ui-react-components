# Plan — "sensible defaults, overridable"

**Status: ACTIVE. Phase 0 closed (both claims refuted, no source changed). Phase 1's gate is built and
has measured seven regressions — Phase 1 is NOT yet safe to run.**

> **This document has been audited and substantially corrected.** The corrections are struck in place,
> not deleted. If you are reading a claim here for the first time, check whether it carries a ~~strike~~
> or a ⚠️ before acting on it. The largest single change: **the plan originally declined the only
> instrument that could contradict it**, on grounds that applied to a different phase. Everything Phase 1
> now knows came from building that instrument (`bun run probe:cascade-layer`).
>
> **Numbers in this document have been wrong repeatedly, including numbers I measured myself and then
> used as support.** `memory/README.md` §12 — *measurement is not transitive to the sentence beside it.*
> Re-measure before quoting.

> **Maintenance rule.** `bugs/PLAN.md` was retired with the note *"a stale plan is worse than no
> plan, because it is still believed."* That applies here. Every phase below carries a checkbox and
> a gate. When a phase closes, mark it and move its lessons to `memory/`. When a claim here is
> refuted, **strike it in place with the refutation** — do not delete it, or the next reader
> re-derives it. Nothing in this file is a status report; if a line reads as status, it has decayed.

---

## Guiding principle (owner, this pass)

> **Do the right thing today to make tomorrow better. Prioritise what is best for the project
> long-term over what is most convenient now.** The package is pre-v1, so a breaking API change is an
> acceptable price for the correct design — it will never be cheaper than it is today.

This has a concrete consequence for the §3 triage: **do not default to (c) slot because it is the
less disruptive option.** Where an internal element has real identity, (d) compound subcomponent is
the right answer even though it breaks the API.

The discriminator, so (d) does not metastasise into "every div becomes a component":

- **(d) compound** when the element has **independent identity a consumer would reasonably address by
  name** — an input, a panel, a row, a cell, a trigger — *and* a sibling component in the same family
  already proves that shape works. `Combobox.Input` proves `MultiSelect`'s input.

  > **⚠️ Sibling asymmetry is a LEAD, not proof.** `memory/affordances.md` qualifies this directly:
  > *"which element a caller's `className` addresses is a **per-component** answer, and a non-compound
  > component whose sibling is compound will look asymmetric for a legitimate reason — the compound
  > sibling's caller addresses the inner element directly through a sub-component, so merging there is
  > correct, while a single-root component's `className` belongs to the root."*
  >
  > So the tell needs a second test: **does the element have *no* override path at all**, or merely a
  > *different* one? Only the first is a (d). And the same file gives the cheap disproof — render with
  > a caller class and read the class list; if it landed on the root, the real question is whether the
  > inner element has any route, "which is a different finding with a different owner."
  >
  > It also says to check the component's own docs first, "here it did, in two places" — and
  > `docs/components/multi-select.md` does state where `className` lands. That does not overturn
  > `MultiSelect` as a (d) (its inner elements genuinely have no prop route), but the check is
  > mandatory before filing any of the others.
- **(c) slot** when the element exists for **positioning or grouping only** and has no identity worth
  naming — a `relative` wrapper, a flex row, a `mt-auto` spacer. Nobody wants
  `<StatCard.SparklineWrapper>`.

~~A component needing 15–27 slots is the signal that it is really a (d).~~ **Refuted by `CalendarBase`
— see the loop-generated test in §3.** High slot count means the element tree *is* the API, but the
resolution may be **(d) compound, (e) render prop, or a mix**, and only the loop-generated test
distinguishes them. `FileUpload` (27) is a (d); `CalendarBase` (15) is 6×(c) + (e).

## The goal

A consumer can use any component with no arguments and get a sensible result, **and** override any
visual decision it makes without reaching for a stylesheet:

```tsx
<StatCard>…</StatCard>
<StatCard className="flex-row items-center border-0 bg-surface-2">…</StatCard>
```

Today the first works everywhere and the second works **only on components that have no `.css`
file**. That inconsistency — not the CSS itself — is the defect.

---

## 1. What was measured

Recorded so no one re-derives it. Every row was observed, not reasoned.

| Claim | Evidence |
| --- | --- |
| Component CSS is **unlayered** and therefore outranks every Tailwind utility regardless of specificity | Compiled dev CSS: `@layer utilities{` spans offsets 8365–30931; `.flex-col`/`.flex-row` at 14030/14062 sit **inside** it; `.stat-card` at 91825 sits **outside** every layer. `@layer components;` is declared and **empty**. |
| Eight sites deliberately exploit that precedence | `Radio.css:37` (forced-colors focus ring — a WCAG affordance), `MasonryGrid.css:11`, `AppShell.css:205`, `Combobox.css:29`, `ColorPicker.css:217`, `Timeline.css:70`, `ActivityFeed.css:31`, `Stagger.css:8`. |
| Token-backed utilities compile to `var()`, so **runtime re-theming survives inlining** | `.bg-surface-0{background-color:var(--C-SURFACE-0)}`, `.text-h3{font-size:var(--H3);line-height:var(--tw-leading,var(--H3-line-height))}`, `.font-bold{font-weight:var(--Bold-Weight)}` |
| Arbitrary custom properties generate, land in `@layer utilities`, and **dedupe per property name** | `.\[--MY-TOKEN\:\#443300\]{--MY-TOKEN:#430}`; `cn("[--X:a]","[--X:b]")` → `[--X:b]`; `cn("[--A:1]","[--B:2]")` → both. |
| A token override and the utility reading it **coexist** correctly | `cn("[--C-TEXT-PRIMARY:red]","text-fg-primary")` → both retained. |
| `--spacing-r1..r6` are registered in `@theme`, so `size-r5`/`w-r5`/`mt-r5` are all valid | `response-ui-css/src/responsive/spacing.css:31-36` |
| Variant-scoped utilities do **not** dedupe against bare ones | `cn("group-data-[d=down]:rotate-180","rotate-0")` → **both kept**. An override must match the variant. |
| These v4 variants all generate correctly | `has-[…]`, `not-has-[…]`, `not-[…]`, `in-[…]`, `*`, `**`, `before:`/`after:` (with `content-['']`), `backdrop:`, `starting:` (correctly wrapped in `@starting-style`), `placeholder:`, `marker:`, `selection:`, `file:`, `rtl:`/`ltr:`, `first:`/`last:`/`odd:`/`nth-2:`/`nth-[2n+1]:`, `motion-reduce:`, `forced-colors:`, `contrast-more:`, `pointer-coarse:`, `noscript:`, `print:`, `supports-[…]`, `open:`, `inert:`, `autofill:`, `details-content:`, `@container`/`@md:`, `[&::-webkit-slider-thumb]:` |
| The real CSS payload is **2,248 declarations / 706 rules**, not 5,971 lines | 22% comments, 14% blank. `Timeline.css` is 529 lines but 114 declarations. |
| 80% of declarations convert mechanically | Bucket A (trivial) 1,565 decls + B (needs a variant) 240 = 1,805 / 2,248. |
| Only **5 files** are fully deletable by inlining alone | `Tooltip.css` (12 lines), `Popover.css` (27), `Wizard.css` (23), `ThemeSwitcher.css` (42), `DropdownMenu.css` (78). Plus `Button.css` (comment only) and `Grid.css`/`MasonryGrid.css` (replaceable token scales). Plus two missed: **`Collapsible.css`** (35 lines, 7 decls, its single `@media` is reduced-motion → `motion-reduce:`) and **`ScrollReveal.css`** as a *candidate only* — its `@media (scripting: none)` block is a confirmed Phase-1 regression site and must NOT be inlined. **Realistic ceiling ~9–10 files, ~6% of the CSS** — which strengthens the case that Phase 4 buys little. |
| ~~**95 of ~155** clean~~ → **~87 clean, ~61–69 not**, depending on whether a headless provider and a delegating wrapper count | ⚠️ **The 95 was ~8 high and the denominator is reading-dependent. Do not quote either as a coverage percentage.** The ~60 gap count holds. Treat every row as a lead, not a fact — see below. |

> ⚠️ **Confidence note on the 60-gap list.** The two entries that audit rated *active defects* were
> both **refuted** at source (Phase 0). Its categories held; its severity did not. So no lane may act
> on a listed gap without first re-reading the component and confirming the gap exists — in
> particular, confirming that a caller's `className` can actually *arrive* at the element in
> question. A bare static class on an element no caller className reaches is **not** a defect.
| Tailwind v4 is **already a hard requirement** — no non-Tailwind consumer exists to break | `dist/styles.css` is a byte-identical copy of source (unresolved `@import`s, live `@source`, zero generated rules). The mandatory `@batthewz/response-ui-css` import is itself `@import "tailwindcss"`. `AGENTS.md:16` states it flatly. |
| The package's written policy already **is** inline utilities | `AGENTS.md:400`: *"The library's styling boundary is Tailwind utilities + design tokens."* 49 of 95 components already have no `.css` file. |
| `cn()` accepts the clsx **conditional-object** form | `cn({"border-0":true,"bg-surface-2":false})` → `"border-0"`. This is why `className` must not be overloaded to take a slot object — see §3. |

### Claims that were wrong — retracted, kept visible

1. ~~"No utility can redefine inherited tokens for a subtree, so `MediaCard.css` can't move."~~
   **False.** `.\[--C-TEXT-PRIMARY\:var\(--C-TEXT-INVERSE\)\]{--C-TEXT-PRIMARY:var(--C-TEXT-INVERSE)}`
   generates and inherits normally. MediaCard moves.
2. ~~"Vendor pseudo-elements via `[&::-webkit-slider-thumb]:` are a lateral move because the
   consumer still can't override them."~~ **False.** `cn("[&::-webkit-slider-thumb]:size-r5",
   "[&::-webkit-slider-thumb]:size-r3")` → `size-r3`. tailwind-merge keys on (variant + class
   group), so these dedupe cleanly. There is no child element to put a class on anyway, so
   repeating the variant is the natural form. **All 21 vendor pseudo-element rules can move.**
3. ~~"Timeline's two `:has()` rules can never move."~~ **Overstated.** They currently depend on
   *authored source order* as a tie-break, which utilities cannot reproduce. But `not-has-[…]`
   generates, so the pair can be restructured into **mutually exclusive** conditions
   (`has-[.timeline-icon]:…` / `not-has-[.timeline-icon]:has-[[data-highlight]]:…`), which removes
   the order dependence entirely. That is a **better** design than the current one — the file's own
   comment warns "ORDER AND SPECIFICITY BOTH MATTER HERE."
4. ~~"We need a gate asserting tw-merge knows every utility the base styles use."~~ **Mostly
   unnecessary.** tailwind-merge's arbitrary-property and standard class groups are generic. The
   only real drift risk is a **named token value** added to `tokens.css` and not to `createCn` in
   `src/util/style.ts`. Gate that narrow thing (§6) and nothing more.
5. ~~"`> *` reaching caller-supplied children is genuinely immovable."~~ **False.** The `*` variant
   (`:is(& > *)`) does exactly this, at **(0,1,0)** — see §1a. `ActivityFeed`'s
   `.activity-feed-aside > *` moves, and *improves*: the current selector is (0,3,0) and
   unbeatable, the utility is a single class the consumer can override from the parent.

### 1a. Descendant-capable variants, by specificity

The decision-relevant fact about each of these is its **specificity**, because that is what decides
whether a consumer can override it. All measured from compiled output; all land in `@layer
utilities`; all dedupe against themselves via `cn()` (verified).

| Variant | Generated selector | Specificity | Verdict |
| --- | --- | --- | --- |
| `in-[…]` | `:where(.parent) .in-\[…\]\:x` | **(0,1,0)** | **House answer for parent-state-keyed child styling.** `:where()` zeroes the parent. Class lives on the **child**, so `cn(base, className)` applies there. No `group` class needed on the parent. |
| `*` | `:is(.x\:*>*)` | **(0,1,0)** | Direct children the component does not render. Overridable from the parent (`*:opacity-100` dedupes). |
| `**` | `:is(.x\:** *)` | **(0,1,0)** | All descendants. Same properties as `*`. |
| `nth-[…]`, `first`, `odd`, … | `.x:nth-child(…)` | (0,1,0) | Structural position. Fully overridable. |
| `not-[…]` | `.x:not(:disabled):hover` | (0,1,0) | Replaces the `:hover:not(…)` chains in Calendar/Pagination/Accordion. |
| `[&::-webkit-slider-thumb]` | `.x::-webkit-slider-thumb` | (0,1,1) | Fine — there is no child element to class, so repeating the variant is the natural form, and it dedupes. |
| `group-*` | `.x:is(:where(.group)[data-…] *)` | (0,2,0) | Works, but `in-[…]` is strictly better: lower specificity, no `group` class required. |
| `[&_.child]:` | `.\[\&_\.child\]\:x .child` | **(0,2,0)** | **Banned.** A consumer's class on the child is (0,1,0) in the same layer and loses. This relocates the bug and makes it unreadable. Use `in-[…]`, `*`, or a seam (§3). |

**Universal caveat:** a variant-scoped utility never dedupes against a bare one —
`cn("in-[.timeline]:mt-r5","mt-0")` keeps **both**. An override must match the variant
(`in-[.timeline]:mt-0`). That is inherent, and must be documented per component rather than
discovered.

### Genuinely immovable

**Only `@keyframes`.** The 8 animation bodies (Sparkline ×2, AppShell ×2, CommandPalette ×2,
ProgressBar, Skeleton). There is no variant for an `@keyframes` block.

Everything else previously listed here is movable. Two items are *judgement calls*, not
impossibilities, and should be labelled as such:

- **Timeline's 6-deep lazy derivation graph** (`--_timeline-marker-radius` → `-line-offset` →
  `-gutter` → `-rail-x`). Each level *could* be an arbitrary property. Keep it in CSS because it is
  the component's layout contract and belongs in one readable place — not because it cannot move.
- **Timeline's `:has()` pair**, once restructured with `not-has-` (retraction 3), moves fine.

### 1b. Available but deliberately out of scope: container queries

`@container` and the `@sm`/`@md`/… variants generate correctly, and the codebase currently uses
**none**. Making `Grid`, `MasonryGrid` or `Tabs` respond to their own width rather than the
viewport's would be a real improvement — and a **behaviour change**, not a transposition. Do not
smuggle it into this work. Record it as a follow-up.

---

## 2. Decision: the token rule

> **A component-specific token that is a single-use alias of a baseline token is deleted. Use the
> baseline utility.**

`--stat-card-gap: var(--R-SIZE-5)` → `gap-r5`. That is the entire point of the baseline scale;
aliasing it adds a name, a lookup and a divergence risk for nothing.

**Delete (single-use baseline alias):** `--_activity-feed-gutter` (1 def/1 use),
`--_activity-feed-gap` (1/1), `--_timeline-date-gap` (1/1), `--MEDIA-CAROUSEL-GAP` (1 use),
`--calendar-col-gap`, `--calendar-month-gap`.

**Corrections to that list — three entries were wrong** (defs/uses measured):

- ~~`--_stepper-gap`~~ — **1 def / 2 uses**, both inside `calc()` for the connector inset
  (`Stepper.css:242,243`). No utility exists for a value inside a pseudo-element's `left`/`right`
  calc; deleting it inlines `var(--R-SIZE-4)` twice. **Keep.**
- ~~`--_timeline-card-padding`, `--_timeline-item-gap`~~ — **3 defs each, 1 use each**. These are not
  aliases, they are **the density axis**: three values selected by `[data-density]` on the *root*,
  applied to a *descendant*. Convertible via `in-[[data-density=dense]]:p-r5` (§1a) but that is 6
  variant-scoped classes, not "use the baseline utility". **Keep, or convert deliberately with the cost
  stated.**

**⚠️ §2 contradicted itself:** this section said delete `--MEDIA-CAROUSEL-GAP` while also saying *"Keep
— domain token layer: everything in `tokens.css`."* The delete wins on evidence (single use, pure
alias). The carve-out: **`tokens.css` is kept for its semantic indirections and its `@theme inline`
bridge — not automatically for every line in it.**

**Delete (reimplements a native Tailwind scale):** `--masonry-columns` (20 rules) → `columns-3
lg:columns-4`; `--rui-grid-columns` (30 rules) → `grid-cols-3 md:grid-cols-4`. **50 of the 63
token-definition rules, and both files.** This is also a single-source-of-truth violation
(`CLAUDE.md` rule 3), so it is the highest value-to-risk change in the whole plan — do it first.

**Keep — computed:** `--_timeline-marker-radius`/`-line-offset`/`-gutter`/`-rail-x`,
`--_stepper-active-line-width` (`calc(× 1.5)`), `--calendar-month-width`/`-ideal-width`
(`--calendar-months` is set by JS), `--progress-bar-fill-end` (`color-mix`),
`--_table-selected-marker-side` (gradient direction flipped by `:dir(rtl)`), `--stagger-delay`
(`inherit` as a mechanism), `--sparkline-color` (`currentColor`).

**Keep — public contract with inherited fan-out:** `--timeline-highlight-fill`/`-ink`/`-border`,
`--activity-feed-highlight-fill`/`-ink`, `--stepper-progress-color`. These are documented, and they
do something a per-element slot cannot: set a value **once on the root** that reaches N children the
consumer never renders. Arbitrary properties make them *nicer* (`[--stepper-progress-color:…]`
inline), not redundant.
**But rewrite their comments** — all three currently claim to be "the only override route that
works," which stops being true after Phase 1. `memory/README.md` §7: answer the prose, don't delete it.

**Keep — domain token layer:** everything in `tokens.css`. `--C-TREND-UP: var(--C-STATUS-SUCCESS)`
is a *semantic* indirection (a trend is not a status), and the `--color-*` block is the `@theme
inline` bridge that makes the utilities exist at all.

### Flag, don't fix: ~14 raw magic numbers

These are already tokens-ethos violations hiding inside CSS files. Inlining makes them **visible**
(`w-[2rem]`), which is uncomfortable and correct — but a reviewer must not read it as the migration
*introducing* raw values.

`--_activity-feed-aside-width: 2rem`, `--_activity-feed-icon-size: 1rem`, `--calendar-day-size:
2.25rem`, `--app-shell-navbar-height: 3.5rem`, `--_stepper-indicator-size: 2rem`,
`--_timeline-dot-size: 0.875rem`, `--_timeline-marker-size: 1.75rem`, `--_timeline-glyph-size:
1rem`, `--MEDIA-CAROUSEL-PEEK: 3rem`, `--BUTTON-GAP-SM/MD/LG`, and `MediaCard.css`'s six raw
`oklch(1 0 0)` overrides of **contract** tokens.

~~**`2px` appears independently four times.**~~ Re-measured: **5 token definitions** valued exactly
`2px` (`--_timeline-line-width`, `--_timeline-highlight-ring`, `--_stepper-line-width`,
`--_activity-feed-line-width`, `--_activity-feed-highlight-ring`), plus `3px` for the table marker.

**But the wider figure is two different things and must not be merged into one escalation.** There are
**106 raw `2px` literals** across the component CSS, of which **75 sit in an `outline`/`box-shadow`/ring
context** — that is a *focus-ring width*, a different concept from a *rule stroke*. So the recorded
follow-up is: one small rule-width scale (≈5 sites, the rail family) **and** a separate, much larger
focus-ring-width question (≈75 sites) that Phase 1's focus-ring decision touches directly. Record both;
do **not** fix either here.
`memory/README.md` §6: scope is this package only, and that boundary was crossed once and reverted
in full.

---

## 3. Decision: the slot API

**A separate `classNames` prop. Not an overloaded `className`.**

```ts
export type SlotClassNames<S extends string> = Partial<Record<S, string>>;
```

> **⚠️ The example that used to sit here violated three of this section's own rules** — it put
> `classNames.wrapper` on the outermost element while `className` and `...props` went to the child
> (the exact split the house rule bans, and DoD item 4 forbids), and `wrapper` was a de-facto
> `classNames.root`, banned by name in §8a. It was also the component §7 designates as the reference
> every lane copies. Replaced below. **A plan that contradicts itself in its worked example is worse
> than one with no example.**

```tsx
// `className` and `...props` go to the outermost element this component renders.
// The nested component is reached by a <thing>Props hatch, never by re-routing `className`.
type StatCardSparklineProps = {
  sparklineProps?: ComponentProps<typeof Sparkline>;
} & ComponentPropsWithRef<"div">;

const StatCardSparkline = forwardRef<HTMLDivElement, StatCardSparklineProps>(
  function StatCardSparkline({ sparklineProps, className, ...props }, ref) {
    return (
      <div ref={ref} className={cn("stat-card__sparkline mt-auto block", className)} {...props}>
        <Sparkline
          {...sparklineProps}
          className={cn("block w-full", sparklineProps?.className)}
        />
      </div>
    );
  }
);
```

### `<thing>Props` is the two-level answer — bless it explicitly

`classNames` reaches elements **this** component renders. When the thing to reach is **another
component**, the shipped pattern is a props hatch, and `CodeBlock.tsx:22,76` is the correct form:
`cn("code-block-copy", copyButtonProps?.className)` — the library's base class first, the caller's
last. `Spotlight.tsx:103` (`imgProps`), `Swimlane.tsx:57` (`viewAllProps`) and `Table.tsx:70`
(`tableProps`) are the same shape; `CodeBlock.tsx:17` already names them as one pattern.

Worst uncovered cases, all needing this rather than a slot: `DataTable` → `Table` (its root is a bare
classless `<div>` and `DataTableProps` has no `className` at all), `VirtualizedDataTable` (hardcodes
both `className` and an inline `style`), `DataTable` → `Pagination` → `IconButton` (three levels), and
`TagInput` → `Badge` (the chips carry no hook whatsoever).

**Why not `className={{ $outer: … }}`:**

1. **`className` accepting an object already means something.** `cn()` is clsx-based:
   `cn({"border-0": true})` is the conditional-object form. Two unrelated object semantics in one
   prop means `className={{"border-0": isActive}}`, written from habit, becomes a silently-ignored
   slot named `border-0`. No type error, no warning.
2. **It fights an existing gate.** Every component types props as `ComponentPropsWithRef<…>` where
   `className: string`. Overloading needs `Omit<…, "className">` on ~40 components, and
   `scripts/verify-omit-discipline.mjs` exists precisely because `Omit` is compile-time-only and
   leaks through spreads.
3. **Autocomplete.** Tailwind IntelliSense and `prettier-plugin-tailwindcss` detect `className="…"`
   and `cn(…)`. `classNames` is the established name (MUI, Mantine, HeadlessUI), so community
   editor configs already cover it; an object under `className` is a bespoke shape nothing knows.

Also: **no `$` prefix** (the keys are already in their own namespace once the prop is separate — it
buys nothing and costs template-literal machinery), **no `slots`** as a name (it means content slots
in react-aria and component substitution in MUI), and **no `extractSlotClassNames` helper** — a
per-component inline type gives slot-name autocomplete and makes a typo a *type error* rather than a
silent no-op, which an open-object extractor cannot.

### ⚠️ Answering `memory/affordances.md`, which rejects this API by name

That file says, of this exact design:

> *"the obvious answer — a `markerClassName` / `cardClassName` prop, or a `classNames={{ … }}` object
> — is an API that only looks like it works here. This library's component CSS is imported
> **unlayered**, so it outranks `@layer utilities` whatever the specificity… `bg-*` and `border-*` land
> in the DOM, change nothing, and report no error."*

**It was right, and it is still right today.** Its premise is precisely the fact **Phase 1 deletes**.
So the objection does not dissolve because it was mistaken — it dissolves *only once Phase 1 has
landed*, and it has a hard consequence:

> **`classNames` is an invalid API until Phase 1 ships.** Delivered before it, every slot would be a
> prop that lands in the DOM, changes nothing, and reports no error — the exact failure that file
> describes. Phase 3 must not start early "because it is additive and low-risk."

Answered in place per `memory/README.md` §7, rather than left for the next reader to re-derive and
revert §3 with.

**Two safety rules from that file that this plan's "prefer a token" bullet dropped, now binding on
triage (b):**

- **Expose the pair, not the fill.** A fill token guarantees contrast only against its paired `on-*`
  ink. A fill hook without its ink hook invites a caller to set one and inherit a glyph colour chosen
  for a different background. Expose both, and document that they move together. *(This is the same
  conclusion the sequence-family analysis reached independently from the contrast contract — two
  derivations, one rule.)*
- **Keep the non-colour part of a cue private.** If an emphasis cue is a colour *and* a width and both
  are overridable, a caller can reduce it to colour alone and reintroduce the colour-only defect the
  width existed to prevent.

Its `:has()` lesson also bears on retraction 3: it warns that writing competing `:has()` rules to
*equal* specificity with source order as the tiebreak is **deliberate**, and that "the next person
simplifies the 'redundant' part and silently inverts the precedence." Restructuring to mutually
exclusive `has-` / `not-has-` conditions **satisfies that intent** — it removes the tiebreak entirely
rather than relying on it — but the note must move with the code, not be deleted as obsolete.

### Rules

- **No `classNames.root`.** `className` is the root, full stop. Two writers for one element is
  `CLAUDE.md` rule 3 and `memory/README.md` §9: *"one writer cannot disagree with itself; two
  derivations of one fact eventually will."*
- **`className` and `...props` both target the outermost element the component renders.**
  ~~Compliant today: `SearchInput`, `DatePicker`, `ColorPicker`.~~ **All three refuted** — each splits
  `className`→wrapper from `...props`→inner control (`SearchInput.tsx:93`/`:115`,
  `DatePicker.tsx:280`/`:317`, `ColorPicker.tsx:260`/`:262`). ~~`DatePicker` is uniquely
  incoherent.~~ **The split is the house pattern of the entire wrapped-control family**, and
  `ColorPicker.tsx:228-233` documents it deliberately. `DatePicker` is merely the worst case: **three**
  destinations, and its `className` is applied raw at `:280` without `cn()`, so that element has no
  base class at all. `TagInput` is worse still — `:378` is a bare `<div>` receiving *nothing*, so the
  true outermost element is both unstyled and unreachable.

  **The exemplar is `DateRangePicker`** (`:316` — `ref`, `className`, `...props` all on the outermost
  element), which was on neither of my lists.

  **⚠️ REVERSED. The `...props` half of this rule was wrong and is withdrawn.**

  ~~Adopt `DateRangePicker`'s shape and add an `inputProps` escape hatch.~~ That traded
  WCAG-load-bearing wiring for API symmetry. Measured in this repo's own jsdom:

  - `<Label htmlFor="x">` + `<div id="x"><input/></div>` → **`getByLabelText` throws.**
    `<label for>` binds only to *labelable* elements, so moving `id` to a wrapper `div` silently
    breaks every label association.
  - `div.focus()` leaves `activeElement` unchanged → **`focusFirstError()`
    (`form-store.ts:362-369`) becomes a silent no-op** after a failed submit. WCAG 2.4.3 / 3.3.1.
  - `field()` returns seven keys and **no `id`**, so the control's `id` is 100% consumer-supplied and
    on three of four components it travels via `...props`. Everything that would break is silent:
    `id`, `ref`, `aria-invalid`, `aria-describedby`, `onBlur`, `name`, `required`.
    `docs/components/date-picker.md` alone ships ten `<Label htmlFor>` + `<DatePicker id>` pairs.

  And `inputProps` does **not** restore two mechanisms it would have to: `mergeProps` (a plain spread
  re-introduces the documented `aria-invalid: undefined` erasure bug) and `SearchInput`'s named guard,
  which keys off `id !== undefined` *"because a default name outranks an associated `<label for>`."*

  The exemplar does not generalise either: `DateRangePicker` has that shape because it has **two**
  focusable inputs and therefore no single control — a constraint the other four lack.
  `ColorPicker.tsx:228-233`, which this plan quoted as "documents it deliberately", is a **written
  refutation**, and the honest account of my error is not that I ignored it but that I answered it
  with something I had not checked was equivalent.

  **The rule, corrected:**
  - **`className` → the outermost element.** Uncontroversial, and it still fixes
    `DatePicker.tsx:280`'s missing `cn()` and `TagInput.tsx:378`'s unreachable bare `<div>`.
  - **`...props` → the focusable control.** Unchanged from today. Do not move a11y-bearing attributes
    to satisfy symmetry.
  - **The layout box gets `classNames.control`** (and `wrapperProps` if it needs more than classes).

  That satisfies the actual goal — DoD item 3, reachability — at zero a11y cost.
- **`classNames` carries class strings only.** Keep the existing `<thing>Props` escape hatch
  (`tableProps`, `copyButtonProps`, `viewAllProps`, `imgProps`) where a caller needs handlers or
  `aria-*`. A general `slotProps` invites consumers to wire `onClick` into internals and couple hard
  to the element tree.
- **Prefer a token over a slot.** If the override is a *value*, expose a token the consumer sets
  inline (`[--stepper-progress-color:…]`). Add a slot only when the consumer must change **which
  utilities apply** — display, flex-direction, or a property the component never declared. A token
  is a narrow documented contract; a slot is a window onto your element tree.

### Triage: not every gap is slot-shaped

Phase 0 surfaced a category this plan did not have. Each verified gap resolves to **one of four**,
and a lane must say which before writing code:

| | Resolution | Tell |
| --- | --- | --- |
| **a** | Not a gap | No caller `className` can reach that element, and the value is not something a consumer would vary. A bare static class here is correct. |
| **b** | Token | The override is a *value*. Expose `--component-*`, set inline by the consumer. |
| **c** | Slot | The consumer must change *which utilities apply* on an element the component renders. `classNames.<slot>`. |
| **d** | **Compound subcomponent** | The element is substantial enough to have its own identity, and the consumer should address it directly rather than through the parent. |
| **e** | **Render prop** | The element is **loop-generated**, so no name can address one instance — and what the consumer actually wants is different *content*, not a different class. |

**⚠️ The "15–27 slots means it's a (d)" heuristic above is wrong as stated, and `CalendarBase` refutes
it.** Apply this test first:

> **Are the internals loop-generated?** If yes, (d) is *structurally impossible* — no compound API can
> name "the 15th cell" — and the answer is **(e)**, not (d).

`CalendarBase`'s 15 internals split cleanly: **9 are loop-generated** by `renderMonthGrid`
(`CalendarBase.tsx:535-628`), 42 cells per month. What a consumer wants there is a dot on a booked day
— *content*, i.e. a `renderDay` render prop. **6 are chrome rendered exactly once** (`calendar-header`,
`-label-button`, `-months`, `-footer`, `-today-button`, `-month-caption`) and are ordinary **(c)**.
So the answer is 6 slots + 3 applied-to-every-instance + `renderDay` — **not** 15 slots and **not** a
compound.

Two hard constraints found at source, both of which a lane would otherwise break:
- **`.calendar-picker-cell` and `.calendar-day` are `querySelector` targets** (`CalendarBase.tsx:174`,
  `:366`) driving focus management. They are *behavioural markers*: append to them, never replace them.
- **`Calendar.css` has no owning component.** It styles `CalendarBase`'s markup entirely, yet neither
  `Calendar.tsx` nor `RangeCalendar.tsx` imports it — only `src/styles.css` does. Rename to
  `CalendarBase.css` in the same lane or the ownership stays invisible.

**`FileUpload` *is* a (d), but not as 27 slots.** 21 of its 27 internals live inside **three already-separate
private components** — `MediaPreviewLarge` (`:220`), `MediaPreviewGridItem` (`~:290`), `FilePreviewItem`
(`:404`) — selected by internal `previewMode`/MIME logic the consumer cannot predict. A flat 27-key map
would be a window onto three element trees that may not even render. Right design: export those three
(or take `renderPreview`/`renderFile`), **plus** 7 small slots for the dropzone chrome the root always
renders, **plus** keep the 6 root state modifiers as `data-*` so consumers write `data-drag-over:*`
variants.

`MultiSelect` is a **(d)**: `.multiselect-input` / `.multiselect-content` have no prop-level route,
while sibling `Combobox` exposes both via `Combobox.Input` / `Combobox.Content` — which merge their
caller's `className` correctly *because their caller addresses those elements*. Closing that
asymmetry means making `MultiSelect` compound. That is an owner's breaking API decision, **not** a
`cn()` call, and a lane must escalate it rather than reach for a slot.

Watch for (d) wherever a component has a **sibling that already solved the same problem compoundly**
— that asymmetry is the signal. `FileUpload` (~27 internals) and `CalendarBase` (15, shared by four
consumers) are the next candidates to check before defaulting them to slots.

### Footgun: never write a themeable token default as an inline arbitrary property

Custom properties resolve **per element**, and a declaration on the element itself beats an
inherited one from `:root` — *regardless of cascade layer*. So:

```tsx
<div className="[--stat-card-gap:var(--R-SIZE-5)]">   // ✗ permanently un-themeable
```

A consumer's theme setting `--stat-card-gap` at `:root` now **silently loses, forever**. Arbitrary
properties are a **consumer-side** tool. Component-side, use them only for values genuinely derived
per instance from props (what `Calendar` does for `--calendar-months`). Themeable defaults stay in CSS
at `:root`, or — better — the component just writes `gap-r5` and exposes no token.

**The same footgun in its more severe form: an inline `style` custom property.** Inline style outranks
every layer *and* every utility, so it is strictly worse than the arbitrary-property version.

**Live instance:** `NumberInput.tsx:171-175` writes
`style={{ "--numberinput-stepper": `calc(${CHEVRON_SIZE}px + 2 * var(--R-SIZE-5))` }}`. This *looks*
like a permitted per-instance derivation, but `CHEVRON_SIZE` is a **module constant** — it never
varies. It is a frozen default wearing a computed value's clothes, and it is unthemeable and
un-overridable. Fix: move the default to CSS, or drop the token and write the padding as a utility.

**Test for this:** if the inline value's inputs do not include a **prop**, it is not a per-instance
derivation and does not qualify for the exception.

### The footgun family — four verified live instances, three distinct mechanisms

All four make a decision the consumer cannot reach. Fixing them is Phase 3/4 work, not transposition.

| Site | Mechanism | Effect |
| --- | --- | --- |
| `NumberInput.tsx:171-175` | inline `style` custom property from a **module constant** | unthemeable, un-overridable |
| `Skeleton.tsx:34,44` | inline `style` **geometry** — `width = "100%"` defaulted, then `style={{ width, height, ...style }}` | **`<Skeleton className="w-20" />` silently loses.** Verified. Note `...style` is last, so a caller's `style` *does* win — `className` is the only thing that can't. Fix: `w-full` + an `h-*` map. |
| `ProgressBar.css:36-37` | declares `--progress-bar-fill` / `-fill-end` **on `.progress-bar__fill`**, the element itself | a consumer theme at `:root` loses permanently; the variants at `:49-67` redeclare on the same element, compounding it. Move to `.progress-bar`. |
| `Sparkline.css:13` | declares `--sparkline-color` on `.sparkline` | same — **and `docs/components/sparkline.md:133-134` already documents the consequence as a limitation**: *"A wrapping rule cannot work… a declaration on the element always beats an inherited one."* |

That last row is `memory/README.md` §16 exactly — *a defect shipped and then written up as a Gotcha, which
is what preserved it.* The doc is evidence somebody noticed, not evidence it is right.

**Adjacent, same shape, different cause — `AvatarUpload.tsx:267`.** It renders
`<Avatar size={size} className="size-full" />`. Verified: `cn("size-16","size-full")` → `size-full`, so
tailwind-merge drops the class `size` mapped to. (The earlier claim that this "overwrites caller intent"
is *refuted* — no caller `className` reaches that element.)

> ⚠️ ~~"The `size` prop is dead on that call."~~ **Overstated, and dangerously so.** Only the `size-*`
> *utility* is dropped. `size` still drives the initials font-size, and the rendered geometry is
> unchanged because `AvatarUpload`'s own `containerSizeMap` is value-identical. **A lane told "the prop
> is dead" would delete it and break initials sizing.** The accurate finding is narrow: one redundant
> utility, no visual consequence — verify before touching it.

### Trap: fade timing on floating surfaces is unreachable by `className` at all

`floating-motion.ts` (`src/components/ui/`) documents it at source: `useTransitionStyles` writes
`transition-duration` **inline**, and *"an inline declaration outranks every stylesheet rule, so the
value cannot be supplied from CSS while that hook owns it."* `Popover`, `HoverCard` and both menus
import `useFadeDuration` from it.

**Consequence for lanes:** a `transition-*` or `duration-*` utility added to a Family A panel — by
`className`, by `classNames`, or inlined from CSS — is **silently dead**. Fade tempo is reachable only
through the `--MOTION-DURATION-*` tokens. Do not "fix" a panel by adding a duration utility, and do
not report one as working without observing it.

---

## 4. Phases

Each phase is independently shippable. **Phases 0–3 deliver nearly all the consumer-facing value
before a single component's CSS is inlined** — Phase 1 alone makes `<StatCard className="flex-row">`
work. If Phase 4 stalls halfway the package is still coherent.

### Phase 0 — ~~Fix the two live bugs~~ CLOSED: both refuted, no source changed
~~`AppShell.tsx:396` applies `app-shell-sidebar-link-icon` directly onto the consumer's `icon`,
overwriting its className.~~ **False.** `icon` is typed `LucideIcon` — a *component*, not an
element (`AppShell.tsx:359`). `<Icon className="app-shell-sidebar-link-icon" />` **passes** the class
as a prop; there is no element and nothing to overwrite. `icon={<Star className="…" />}` does not
compile. Lucide's own `mergeClasses` keeps its classes and adds the rail class.

~~`MultiSelect.tsx:337,370` assign bare-string classNames, violating `AGENTS.md:390` and discarding
any incoming className.~~ **False.** The caller's `className` is destructured at `:98` and merged at
`:256` (`cn("multiselect", className)`) — overrides work. Nothing arrives on the two inner paths, so
nothing is discarded. ~~The same form appears **10** times across `src/components`.~~ **Re-measured: 3
in production** — `MultiSelect.tsx:337`, `:370` and `ColorPicker.tsx:289`. The other seven were in test
and example files, and two were inside a comment. The refutation's *conclusion* stands on the mechanism
(`className` is merged at `:256`), but that supporting sentence was inflated — and it is
`memory/README.md` §12 exactly: *measurement is not transitive to the sentence beside it.* Three
instances still make it a house pattern rather than a unique violation, but the number was not checked
before it was used as support.
*(Whether `AGENTS.md:390` addresses library code or consumer app code is genuinely ambiguous and was
**not** settled — the refutation does not rest on it.)*

Recorded as `bugs/ARCHIVE.md` #497/#498 under *Refuted*, following the #459/#460 precedent.
Independently verified: source byte-identical to HEAD, `lint` and `typecheck` exit 0, 2073 tests
pass (+6 characterisation tests that pin the mechanisms).

**What survives is real, and is Phase 3 work, not a bug:** `.multiselect-input` /
`.multiselect-content` have no prop-level override path, while sibling `Combobox` exposes both via
`Combobox.Input`/`Combobox.Content`. Closing that means making `MultiSelect` compound — an owner's
breaking API decision.

> **The lesson, and it governs Phase 3.** These two were the `className` audit's *highest-confidence*
> claims — the only two it labelled active defects — and both dissolved on contact with the source.
> The audit's **categories** were right; its **severity labels** were not. See the confidence note in
> §1 and the lane rule in §7.

### Phase 1 — `@layer components`
Wrap this package's component CSS in `@layer components`, converting the eight sites that
deliberately rely on being unlayered (§1).

**This must precede Phase 4 and cannot follow it.** Partial inlining is *not order-neutral*: every
declaration moved into a utility drops out of unlayered precedence and into `@layer utilities` —
i.e. **below** the C/D rules still in the same file. A file going from 53 rules to 9 doesn't just
shrink; its remaining 9 start winning fights they used to lose. Phase 1 collapses three interacting
precedence axes (unlayered-vs-layered, specificity, source order) down to one, which is what makes
incremental conversion safe.

**Gate: `bun run probe:cascade-layer`.** Not a checklist — a measurement.
`scripts/probe-cascade-layer.mjs` builds the package's CSS twice, differing only by
`layer(components)`, and diffs `getComputedStyle` across four emulated environments. It exits
non-zero on any change **and on any inert row**, because a probe that measured nothing is worse than
one that failed.

#### Measured: Phase 1 regresses seven things, and the checklist named two of them

```
probe                                state           before               after
timeline-even-animation              default         slide-left, fade  →  slide-right, fade
stagger-ancestor-inherit             default         0.999s            →  0.05s
radio-forced-colors-focus-outline    forced-colors   2px               →  0px
scrollreveal-no-js-opacity           scripting-none  1                 →  0
tabs-scrollbar-height                default         3px               →  10px
tabs-scrollbar-thumb-color           default         transparent       →  visible
switch-ring-vs-consumer-reset        consumer-reset  2px               →  0px
switch-ring-baseline                 default         2px               →  2px      (control, held)
control-sronly-padding               default         0px               →  0px      (control, held)
```

- **Timeline** — alternating entrance direction inverts. `Timeline.tsx:17-26` (#342) is the reason
  the component keys direction to `:nth-child`.
- **Stagger** — the `--stagger-delay: inherit` mechanism dies; an ancestor's value stops reaching
  `animation-delay` and it falls back to the token default. `Stagger.css:1-17` exists solely to
  provide this.
- **Radio** — the forced-colors replacement outline is lost. **WCAG 2.4.7.** `Radio.css:33-38`
  states this is "the one focus affordance that survives" forced colours.
- **ScrollReveal** — with scripting off, content is **permanently invisible**. `ScrollReveal.css:1-11`
  names the consequence: "including the page's `<h1>` when the reveal wraps a Hero." Inlining does
  **not** fix this: a `noscript:opacity-100` utility lands in `@layer utilities` and still loses to
  the foundation's unlayered `.scroll-reveal-hidden{opacity:0}`. It has to be re-specified.
- **Tabs** — the scrollbar track triples and the thumb becomes permanently visible, defeating the
  intent stated in `Tabs.css:14`.
- **Switch / all focus rings** — see the section below. The `switch-ring-baseline` control is the
  point: the ring itself survives layering fine. What changes is that a consumer's reset now beats it.

`AppShell`'s `sr-only` padding **held** — it was on the checklist and is not a regression. Two of the
five names in the original list were wrong in one direction and five real regressions were missing
in the other.

#### ⚠️ The search has to be property-intersection, not class-name overlap

`Tabs.css` vs `*::-webkit-scrollbar` in `response-ui-css/src/base.css:67-81` is the proof. There is
**no shared class name** — the foundation's selector is universal — so the search this plan
originally prescribed ("enumerate every selector that also matches a class owned by
`response-ui-css`") **structurally cannot find it.**

The search must be: for every declaration in this package, find every *unlayered* foundation rule
that sets the same property and can match the same element — **including universal selectors and
pseudo-elements.** Record direction per rule, because some inversions are no-ops.

#### ⚠️ Phase 1 hands ~75 focus affordances to any consumer's `*:focus{outline:none}`

Measured: `switch-ring-vs-consumer-reset` goes 2px → 0px against a plain, un-`!important` consumer
reset. Today that reset loses on specificity; afterwards it wins at any specificity, because our
ring is layered and theirs is not.

**29 `outline: 2px solid var(--C-BORDER-FOCUS)` declarations across 21 files**, plus 75 raw `2px`
outline/ring/shadow declarations in total. And `verify-focus-affordance.mjs` checks *source
pairing* — a reset implies a replacement — so **it stays green while the replacement stops
painting.**

§9 celebrates this same mechanism as "the cascade quirk finally working for the consumer." It cuts
both ways, and this plan originally priced only the direction it liked. Phase 1 must decide
deliberately whether the ring recipes move into a layer with everything else, stay unlayered, or
become `!important`.

#### ⚠️ Phase 1 vs §5 rule 10 — resolve first, serially

Measured: `@import "./styles.css" layer(components);` **does not compile** —
`Error: @source cannot be nested`, because `src/styles.css` ends with `@source "../src/**/*.{ts,tsx}"`.

So Phase 1 must add `layer(components)` to the **46 individual imports inside `src/styles.css`** —
the one file §5 rule 10 forbids every lane from touching and §7 names as the only real merge hazard.
That is not a conflict to discover mid-flight. Phase 1 is a single serial commit that owns that file,
and no lane starts until it has landed. (Phase 2 hits the same file: `Grid.css` is imported twice,
at `styles.css:57` and `Grid.tsx:5` — uniquely in the package.)

#### Precedent this plan should have cited

`response-ui-css/CHANGELOG.md:263` and `src/base.css:44-48` record the **foundation package already
making this exact decision deliberately, with CSSOM verification.** Read it before designing the
migration; it is the closest thing to a worked example that exists.

#### The nine deliberate-precedence sites

~~"Eight sites deliberately exploit that precedence."~~ Imprecise: six of the eight citations point
at an explanatory *comment*, not at a rule that inverts. The honest framing is **nine places
documenting reliance on being unlayered**, of which the probe confirms **Radio, Timeline, Stagger and
ScrollReveal** actually invert. `ScrollReveal.css` was missing from the original list and is the
a11y/no-JS one.

**Any rule in this package that overrides an unlayered class defined in `response-ui-css` inverts the
moment this package moves into `@layer components`.** Today both sides are unlayered so specificity
decides and we win; afterwards the layer decides and we lose — regardless of specificity.

**Verified instance:** `Timeline.css:465` and `:526` set `animation-name: slide-left, fade` on
`.timeline-item.fade-right` at (0,3,0). `.fade-right` is defined in
`response-ui-css/src/animations/fade.css:11` with **zero `@layer`** (confirmed: `grep -c @layer` → 0).
After Phase 1 the unlayered rule wins and **Timeline's alternating entrance direction silently
reverts** — which `Timeline.tsx:17-26` (#342) documents as the entire point of keying direction to
`:nth-child`. No test in this repo can see it (§5: no gate sees a pixel).

**So Phase 1 does not begin with a checklist, it begins with a search.** Enumerate every selector in
this package that also matches a class owned by `response-ui-css` — the animation/reveal classes
(`fade`, `fade-right`, `slide-*`, `stagger-*`) are the likely population, since those are the ones
consumers apply *alongside* our components. Each hit is either re-specified to survive layering or
moved. `Stagger.css:8-17` already documents being in this situation deliberately, which is a second
lead, not a reassurance.

### Phase 2 — The two column-scale files
`Grid.css` and `MasonryGrid.css` → native `grid-cols-*` / `columns-*` (§2). **Both gates now verified
against Tailwind's own source**, so this phase is de-risked:

- `minmax(0,1fr)` is **byte-identical**: Tailwind's `grid-cols` handler emits
  `` repeat(${n}, minmax(0, 1fr)) ``, matching `Grid.css:5`. The word-wrap promise in `AGENTS.md:393`
  survives untouched.
- Breakpoints **match exactly** — `tailwindcss/theme.css:327-330` = 40/48/64/80rem vs `Grid.css:19,29,39,49`,
  and nothing in `response-ui-css` overrides `--breakpoint-*`.

**`Grid.css` is fully deletable.** Required change: `columnClasses` (`Grid.tsx:21-29`) must become a
static nested `Record` — Tailwind cannot scan `` `rui-grid--${bp}-${count}` `` — which forces `columns`
from `number` to a bounded union. **That is breaking and it fixes an existing silent bug**: `columns={7}`
currently falls back to 1 column via `var(--rui-grid-columns, 1)`. `MasonryGrid.tsx:23` already types
this correctly as `1|2|3|4`.

**⚠️ `MasonryGrid.css` is NOT fully deletable as written.** 7 declarations across 3 rules are not column
scale: `column-gap` (`:3`), `break-inside: avoid` + `margin-bottom` (`:7-8`), and `:last-child{margin-bottom:0}`
(`:13-15` — one of the eight unlayered-precedence sites). `break-inside-avoid` and `last:mb-0` both exist
and resolve cleanly after Phase 1. The blocker is `--masonry-gap`: a **parent-sets / child-reads fan-out**
feeding two different properties, fed by a free-form `gap?: string` prop.

Two options, and the plan must record which:
- **(a)** Keep `--masonry-gap` (§2 "public contract with inherited fan-out" — it is *not* a single-use
  alias) and keep a 3-rule `MasonryGrid.css`.
- **(b)** Breaking: `gap?: Gap` from `layout/shared.ts`, matching every other grid in the package, passing
  the value through the Context `MasonryGrid` already has (`:39-45`). Deletes the file *and* fixes a family
  divergence.

**(b) is the right long-term design** per the guiding principle. "Delete both files" is true only under (b).

### Phase 3 — Seams + the reachability gate
The 60 gaps — **each re-verified at source first** (§1 confidence note). Adds `classNames` per §3
and applies the house rule.
**Purely additive and visually a no-op** — and, crucially, **fully testable in jsdom**: asserting
`classNames={{wrapper:"sentinel"}}` lands `sentinel` on the right element needs no stylesheets.

**Gate:** the new `verify:slot-reachability` script (§6) plus one slot-override test per
slot-bearing component.

### Phase 4 — A standing convention, **not a campaign**

> **Demoted deliberately.** Not "optional polish we'll probably do" — *not a project*. The rule is:
> **when you touch a component for another reason, prefer utilities.** No lanes, no sweep, no
> completion criterion.

The cost/benefit does not survive contact with the numbers: **~1,800 mechanical edits** to delete
**~6%** of the CSS, buying consistency only — after Phases 1–3 have already delivered every
capability.

And there is recorded precedent that this exact shape of refactor ships a11y regressions:
**`memory/traps.md:85-163` records a `1.31:1` focus ring on `<Button variant="danger">`, shipped by the
pass whose entire purpose was making the focus ring consistent.** A sweep motivated by consistency, that
broke the thing it was making consistent, with gates green. That is this phase's own future, written down
in advance, in a file this plan cites four times and did not read for this.

Bucket A+B → utilities where it is genuinely mechanical.

Since only `@keyframes` is genuinely immovable (§1), **near-total conversion is achievable** — the
question is whether it is *desirable* file by file, which is a readability judgement, not a
capability limit. Stop where a wall of utilities would be less legible than the CSS it replaced.
`Timeline.css` is the clearest candidate: 529 lines but only 114 declarations, i.e. **51% prose**
explaining a layout contract that would not survive being spread across six class strings.

`src/util/focus.ts` already documents itself as the utility-side counterpart to the `:focus-visible`
rules in component CSS — a hybrid is this package's established, gated pattern, not a compromise.
**Whatever boundary is chosen, write it down as a decision with its reason**, or the next reader will
read the leftover CSS as unfinished work and "finish" it.

### Phase 5 — Serial cleanup

Prune dead `@import`s from `src/styles.css`, and ship the release.

**⚠️ The doc sweep is far larger than the "29 files" originally written here.** Measured:

- **38 documents** state the unlayered contract or "uses **no Tailwind utilities**" — and **21 of them
  sit inside a `## Gotchas` section**, which no clause in this plan named. Some quote compiled byte
  offsets. `memory/README.md` §16 is the reason this matters: prose describing a footgun reads as a
  *decision*, and the next reader treats the workaround as the API.
- **~20 more are falsified by the compound and house-rule changes and contain no CSS at all**, so a
  CSS-shaped sweep **structurally cannot find them**. `docs/components/multi-select.md:45` states the
  *absence* of a subcomponent as design intent — correct today, a lie after Phase 3.
- **A terminology collision this plan creates:** `AGENTS.md:390` and `response-ui-renderer/AGENTS.md:66`
  both say *"always wrap classNames with `cn()`"*, using **"classNames" as a plural noun**. Once §3
  ships a prop called `classNames`, that sentence instructs readers to do the exact thing §3 spends
  three paragraphs preventing. Reword both to "class strings".

**Release shape — resolve the contradiction.** "Each phase is independently shippable" (§4) and "one
deliberate `0.12.0`" cannot both hold. The breaking surface is too large for one minor anyway: five
compound rewrites, `Grid.columns` union, `MasonryGrid.gap`, `classPrefix` deletion, the `className`
reroute, **plus a mandatory renderer lane** (§8). Ship **per phase** — Phase 1 as its own release with
its own probe, Phase 2 as its own — and let the version land where the breakage actually is.

---

## 5. Definition of done — **per phase**, not per component

> **Why this changed.** A DoD spanning all four phases means **no phase can close independently** —
> which destroys the single property that made Phase 4 safely abandonable. The phases are horizontal
> (Phase 1 global, Phase 2 two files, Phase 3 sixty components, Phase 4 per-file); the DoD has to be
> too.

| Phase | Done when | Independently shippable? |
| --- | --- | --- |
| **1** | `probe:cascade-layer` green *with zero inert rows*; the property-intersection search recorded with direction per rule; the focus-ring decision made explicitly; `src/styles.css` owned by this one commit | yes — and it alone makes `<StatCard className="flex-row">` work |
| **2** | `Grid.css` deleted; the MasonryGrid (a)/(b) choice recorded; renderer documents that pass raw `gap` strings updated or the change deferred | yes |
| **3** | items 1–9 below, per component; slot vocabulary frozen first (§8a) | yes, per family |
| **4** | items 1–5 below, per file; the CSS/utility boundary written down with its reason | yes, per file — **and abandonable at any point** |

Phase 3/4 per-component contract, for the lane agent and the verifier:

1. **CSS**: sibling `.css` deleted, or reduced to immovable residue only — with a header comment
   naming why each surviving rule cannot move.
2. **Every declaration accounted for, by name.** List each declaration from
   `git show <base>:src/…/X.css` with its disposition: → utility `foo`, → token `--bar`, or →
   dropped because Z. **Not a count.** `memory/README.md` §5: *a claim that counts instances instead
   of naming them cannot be audited.* This is the verifier's primary artifact.
3. **Seams**: every element carrying a class literal is reachable via `className` (root) or
   `classNames.<slot>`; slot names declared in the props type.
4. **House rule**: `className` *and* `...props` both land on the outermost element.
5. **`cn()` wherever a caller className can arrive.** *Not* "no bare-string classNames anywhere" —
   10 instances of `className: "literal"` on the library's own internal elements are a deliberate
   house pattern, and the Phase 0 refutation turned on exactly that distinction. The requirement is
   item 3 (reachability); `cn()` is how you satisfy it once a seam exists.
6. **Tokens**: §2 applied. Retained tokens documented as public; no themeable default written as an
   inline arbitrary property.
7. **Tests**: BEM-asserting tests updated (**13** files on the narrow `__` reading; **67** test files assert on some authored class, which is the number that matters for lane sizing — most survive, since the hook classes stay),
   **plus one slot-override test per slot-bearing component**.
8. **Docs**: `docs/components/<name>.md` theme-token prose rewritten (not deleted); slots table
   added; `*.examples.tsx` still compiles.
9. **Gates green**: `typecheck`, `lint`, `test`, and all `verify:*`. `verify:focus-affordance`
   matters most — focus rings are among the things moving.
10. **`src/styles.css` untouched.** Phase 5 prunes it serially.

11. **Cross-lane seam pass.** After a family's lanes merge, one pass re-reads the *seams between*
    them — a slot named consistently inside two lanes can still disagree across them, and each lane's
    gates were green. Recorded precedent: `memory/README.md` §14, where a whole assembled page found
    what every per-component suite missed.
12. **`git status` comes back empty.** No stray scratch files, no `--keep` build directories, no
    half-reverted probe. Recorded precedent: prior waves shipped exactly this with every gate green.

**Not on the list: paint confirmation.** No gate here can see a *pixel* — vitest stubs CSS to `""` and
jsdom applies no stylesheets (`memory/README.md` §15). Phase 1's failures are **computed style**, and
`probe:cascade-layer` sees those; anything genuinely paint-shaped (gradients, blend, sub-pixel
geometry) is a human in the dev gallery, explicitly rather than by implication.

---

## 6. Gates to build

| Gate | Asserts | Why a script and not a test |
| --- | --- | --- |
| **`probe:cascade-layer`** ✅ built | Two CSS builds differing only by `layer(components)` produce identical computed styles across four emulated environments | The only instrument that can see Phase 1 at all. Not in `prepublishOnly` — it needs Playwright and two vite builds; run it on demand and in the Phase 1 PR. |
| ~~`verify:slot-reachability`~~ | see below | **not buildable as specified** |
| `verify:token-mirror` | Every `@theme inline` name in `tokens.css` appears in `createCn`'s list in `src/util/style.ts` | The one remaining silent-drift risk after retraction 4. ~20 lines. |

### ⚠️ `verify:slot-reachability` as specified is not buildable — re-scoped

Written literally it fails **~300 of 478** class literals (63%) and needs an allowlist roughly **twice
the size of the clean set it guards** — which is the exact anti-pattern
`verify-focus-affordance.mjs`'s own header warns against.

The flaw is conceptual: it conflates two different questions.

| Question | Decidable by a parser? |
| --- | --- |
| *Does a caller `className` flow to this element?* | **Yes**, ~90% of the time — it is a data-flow question |
| *Should it?* | **No** — that is the (a)–(e) triage, which is judgement |

Feasible order: **(1)** ship `classNames`; **(2)** land the triage as source annotations, so the
judgement is recorded where the element is; **(3)** gate the decidable half — *"a literal annotated
`(c)` must have a corresponding slot, and a slot must be merged with `cn()`."* That gate is small,
has no allowlist, and cannot be satisfied by a lie.
| `verify:token-mirror` | Every `@theme inline` name in `tokens.css` appears in `createCn`'s list in `src/util/style.ts` | The one remaining silent-drift risk after retraction 4. ~20 lines. |

> ⚠️ **`verify:slot-reachability` must be able to see class literals statically — so runtime-built
> class names have to go.** `menu-internals.tsx` emits five literals as template concatenations —
> `` cn(`${classPrefix}-content`, className) `` at `:288`, and the same shape at `:346, :368, :388,
> :408`. The gate cannot see through those, so generalising that mechanism would generalise the gate's
> blind spot.
>
> Verified: `classPrefix` is **a generalisation with one value** — `DropdownMenu.tsx:26` and
> `ContextMenu.tsx:25` both set `"dropdown-menu"` — and it is **already violated**, because
> `ContextMenu.tsx:81` hardcodes `"context-menu-trigger"`, a class **no CSS file defines** (grep across
> `*.css`: zero). So `ContextMenu` currently emits `dropdown-menu-*` styles plus one orphan class.
>
> **Delete the mechanism**; use static shared names (`menu-content`, `menu-item`, `menu-item-icon`,
> `menu-separator`, `menu-group-header`) and `classNames` for per-instance override. Breaking, and
> right: it makes the shared implementation honest and every literal statically visible.

Both follow the precedent of `verify-focus-affordance.mjs`, whose header explains why CSS-shaped
invariants cannot be tests here.

---

## 7. Lane partitioning

> **Lanes are derived from structural family, not from a count.** ⏳ A four-way family analysis is
> running (form / overlay / sequence+tabular / layout+media). It returns, per family: the exemplar
> and how each sibling deviates, **one shared slot name per recurring element**, the (d) candidates
> with the sibling that proves each, and hard dependencies. When it lands it **replaces the
> provisional table below.**
>
> Why family-derived: the same analysis that groups components also (i) finds the (d) candidates —
> the tell *is* a sibling that already solved it compoundly — and (ii) fixes the slot vocabulary
> across siblings. Inconsistent slot names between sibling components would be permanent public API
> damage, and it is the single most likely thing five independent lanes would produce.

Batches of N components chosen arbitrarily **will break shared internals.** These are hard
dependencies — same lane, or serialize:

| Cluster | Why |
| --- | --- |
| `CalendarBase` + `Calendar` + `RangeCalendar` + `DatePicker` + `DateRangePicker` | `CalendarBase` owns 15 internal classes all four consume |
| `Table` + `DataTable` + `VirtualizedDataTable` | `VirtualizedDataTable.css` selectors reach **into Table's markup** |
| `menu-internals.tsx` + `DropdownMenu` + `ContextMenu` | shared `${classPrefix}-item-icon` |
| `Avatar` + `AvatarGroup` + `AvatarUpload` | `AvatarUpload` overrides the inner `Avatar`'s className |
| `Sparkline` + `StatCard` | `StatCard.Sparkline` wraps `Sparkline` |

Softer affinity, worth keeping together for convention consistency: the 16 modules importing
`src/util/focus.ts`.

**Size lanes by declaration count, not component count.** `FileUpload` is 53 rules / ~27 internal
classes; `Tooltip` is 1 rule. An over-stuffed lane is where a verifier starts rubber-stamping.

**Use `isolation: "worktree"` per lane.** Five agents in one tree each running `typecheck` will see
each other's half-finished edits and chase phantom failures. `src/styles.css` is the only real merge
hazard, which is why rule 10 forbids touching it.

**Every lane verifies its gaps at source before acting.** The gap list is a search result, not a
finding. A lane that "fixes" a non-gap costs more than one that misses a real one, because the fix
lands in public API. A refutation is a full outcome — write it into the row (`memory/README.md` §4).

**Settle the convention before any fan-out.** Five agents inventing slot names independently yields
`wrapper`/`container`/`outer`/`root`/`box` for one concept — and that is public API you would then be
stuck with. Phase 3 starts with a written convention plus one worked reference component
(`StatCard`: 5 subcomponents, one known unreachable wrapper, small enough to judge ergonomics on).

---

## 8. Explicitly out of scope

- **Playwright *paint* baselines.** Declined, and for a reason that applies to **Phase 4 only**:
  `memory/traps.md:373-376` records a first screenshot run producing a contradiction from sub-pixel
  rasterisation. ~~Declined for Phase 1 too, on the grounds that "regressions are visible in the
  gallery."~~ **That was wrong on every count.** The gallery renders **zero** environment states —
  no `forced-colors`, no `prefers-reduced-motion`, no `scripting: none` — so Radio's ring and
  ScrollReveal's no-JS failure are *structurally unobservable* there; Timeline's alternation appears
  once, with three items, as a single ~300ms IntersectionObserver-fired slide above 40rem, unreplayable
  without a reload; and Stagger's regressing path (ancestor `inherit`) has no gallery coverage at all,
  because every example uses the `staggerDelay` prop, which writes the var inline and beats every layer.
  **The right instrument was computed style, not paint** — no baseline store, no rasterisation, no
  determinism work. It is now `scripts/probe-cascade-layer.mjs` and it found seven regressions in one run.
- **`response-ui-css` and `response-ui-tw-merge`.** Including the rule-width and focus-ring-width
  scales (§2). `memory/README.md` §6: that boundary was crossed once and reverted in full.
- **`response-ui-renderer`** — ~~out of scope, unsettled API.~~ **Wrong grounds.** Its registry is
  derived, so nothing needs hand-listing — but `props` is typed `Record<string, unknown>`, so the
  renderer **erases every type this plan tightens**, silently:
  - `MasonryGrid` `gap: string` → `Gap` (Phase 2 option (b)) breaks two shipped documents that pass
    `"1.25rem"` and `"var(--spacing-r4)"` — `gapMap[…]` → `undefined` → the gap vanishes with **no
    diagnostic**. Price this into the (a)/(b) choice.
  - The compound restructures fail three derived-artifact gates: `parity.coverage.test.tsx:63`,
    `contracts.test.ts:347` (byte-identical `VIEWSPEC.md`), `:367` (literal compound count).
  - `package.json:58` pins `^0.11.0`, so Phase 5's `0.12.0` **mandates** the peer bump per `CLAUDE.md`.
  - **⚠️ Render props are unrepresentable in JSON.** `$node` yields a static element, not a function,
    and only four function-valued props are hardcoded. So triage **(e)** — this plan's chosen remedy for
    `CalendarBase`'s nine loop-generated internals — leaves them with **no machine-authorable override
    route at all**, in the layer `CLAUDE.md` calls machine-authorable. That is a design consequence, not
    a downstream chore: **(e) needs a data-shaped companion, or the limitation must be recorded as
    accepted.**

  So: **out of scope for design, required downstream lane for (a), (b), (d) and (e).**
- **`VirtualizedDataTable`'s cross-component selectors** as an *architectural* fix. The migration
  exposes the coupling; untangling it is its own piece of work.
- **Container queries.** Available and unused (§1b). Adopting them is a behaviour change, not a
  transposition — a separate, deliberate decision.
- **100% CSS elimination.** Achievable except for `@keyframes`, but not the goal. The end state is a
  documented hybrid, which `src/util/focus.ts` already establishes as this package's pattern.

---

## 8a. Slot vocabulary — the permanent-consequence output

⏳ Accumulating: **form** and **overlay** families landed; sequence+tabular and layout+media pending.
Greenfield — `grep -rn classNames src/components` returns **zero**, so this *is* the whole public API.

**Banned names, with reasons.** This list matters as much as the chosen names.

| Banned | Why |
| --- | --- |
| `root` | §3 rule — `className` is the root. |
| `wrapper`, `container`, `outer`, `box`¹ | The four names independent lanes would each invent for **`control`**. Precisely the §7 damage. |
| `content` | Reserved as a *compound subcomponent* name — `Combobox.Content` ships. A component gets `Content` the subcomponent **or** `panel` the slot, never both. Two writers for one element = `CLAUDE.md` rule 3. |
| **`label`** | ⚠️ **Hard flag.** `*Label` props already mean *accessible name* throughout: `clearLabel`, `panelLabel`/`areaLabel`/`hueLabel`/`hexLabel`, `minLabel`/`maxLabel`, `charLabel`, `removeLabel`/`moveUpLabel`, `dismissLabel`, `toggleLabel`. A `classNames.label` reads as one of those, and collides with the `Label` component. |
| `chip` | `TagInput`'s public vocabulary is already "tag" (`maxTags`, `validateTag`, `TagRejection`). |
| `adornment`, `prefix`/`suffix` | MUI vocabulary; these elements are `icon` + `affordance` here. |
| `announcer` | `sr-only role="status"` regions (`TagInput:471`, `Repeater:308`). Exposing invites a consumer to drop `sr-only`. Triage **(a)**. |
| `arrow` | **No such element exists.** `use-floating.ts:29` wires the `arrow` middleware behind `arrowRef`, and *nothing passes it* — all three `arrowRef` hits are inside `use-floating.ts` itself. Dead code; delete it. |
| `backdrop`/`scrim` | `::backdrop` takes no class. **(b) token** — `--OVERLAY-SCRIM-COLOR` already exists. |
| `header`/`footer`/`closeButton` | `Dialog`/`Drawer` render `{children}` only; that structure is consumer-supplied. |

¹ `box` is permitted for exactly one thing: `OTPInput`'s N homogeneous entry boxes.

**Cross-family collision to settle before either lane starts:** the menus call the leading glyph
`item-icon`, the form family proposed `itemIndicator` for the check mark, and `SearchInput`/`Toast`
use `icon` for a leading glyph. These are **two concepts** — a leading glyph and a selection
indicator. Fix the pair as `itemIcon` + `itemIndicator` *once*, family-wide, or the package ships
three words for two things.

## 8b. Triage (d) — compound restructures, each with its proving sibling

| Component | Internals | Proved by |
| --- | --- | --- |
| `MultiSelect` | 10 | `Combobox.Input`/`.Content`/`.Item`/`.Empty`; `TagInput` for `tags`/`tag`/`tagRemove` |
| `ColorPicker` | **13** (largest in `form/`) | `Combobox` — trigger+panel is compound-shaped |
| `CommandPalette` | 11 + a `renderOption` closure a consumer cannot replace | `DropdownMenu` exposes `Content`/`Item`/`Divider`/`Label` for *the same anatomy*, from JSX instead of an array |
| `Tooltip` | 1 literal, but **all 10** `Tooltip.css` declarations unreachable | `Popover` — identical hook, portal and fade, with the API present |
| `Repeater` | 5, per-row identity | `Combobox.Item`; also needs a `ref`/rest channel regardless |

**Severity precision on `Tooltip` and `Repeater`:** a passed `className` is **not** silently dropped at
runtime — the props types are closed, so it is a **TypeScript error**, i.e. loud and at compile time.
The defect is *"there is no override path"*, not *"the override path is broken."* Same distinction that
sank both Phase 0 claims; do not re-inflate it.

## 8c. Escalations — record, do not fix in-lane

- **No overlay z-index scale.** `Popover.css:17` = 40, `DropdownMenu.css:18` = 40, `Tooltip.css:11` = 50,
  `ToastContext.tsx:212` = `z-50`, and `HoverCard` sets **nothing**. Four values, one absence, no shared
  contract. Needs one `--OVERLAY-Z-*` scale in `response-ui-css` — **out of scope (§8)**.
- **`AGENTS.md:392` is false about `Repeater`.** It claims `Repeater` is "a plain function component
  taking React 19's `ref` prop" and that typing props as `ComponentPropsWithRef<"div">` is "correct for
  all of them either way." Verified: `RepeaterProps` (`Repeater.tsx:77-127`) is a closed type ending at
  `className?: string` — no `ref`, no `ComponentProps` intersection, no rest spread. A shipped consumer
  doc asserting a capability the code lacks (`memory/README.md` §8).
- **Verbatim duplication:** `TagInput.tsx:463` duplicates `date-picker-internals.ts:69`. Import it.
- **`Dialog` and `Drawer` are near-identical twins with divergent mechanisms** — `Dialog` fully inlined
  with a `backdrop:` utility and `animate-fade-in`; `Drawer` a 125-line CSS with `@starting-style` +
  `allow-discrete`. `CommandPalette` uses `@keyframes` for the same job. Three answers to one problem.
  Unifying them is the decision that cluster exists to force.
- **Unmeasured:** whether a consumer's `backdrop:` override dedupes against a stacked
  `backdrop:starting:` one. §1a's caveat says variant-scoped utilities never dedupe across differing
  variants. Measure before relying on it.

## 9. Retained by design: the BEM hook classes

Strip the declarations, **keep the class names** as declaration-free markers alongside the utilities.
Costs nothing (the strings are already there) and buys:

- **"Restyle every StatCard at once"** from plain consumer CSS — which, being unlayered, beats the
  utilities. The cascade quirk finally working *for* the consumer.
- Devtools legibility against a wall of utilities.
- The 13 BEM-asserting test files keep passing.
- Astro/Rails consumers of `response-ui-css` keep the same target names — the cherry-picking ethos.
