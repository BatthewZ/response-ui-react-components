# Lane 5 — Timeline, CalendarBase, ScrollReveal, plus the whole-package sanity sweep

An adjudication lane, not a conversion lane. All three files were examined whole against
AGENTS.md's four questions. All three **stay**. One of them lost six declarations that were
already inert. Two standing claims in shared documents were measured and are wrong.

---

## 1. Verdicts

| Component | Verdict | Lines before → after | Declarations before → after | The single reason it survives |
| --- | --- | --- | --- | --- |
| `src/components/ui/Timeline.css` | **UNCHANGED** (ruling recorded in a header) | 582 → 615 | 115 → 115 | Seven of fourteen private custom properties are read only from inside *another custom property*, and they form the one six-deep chain that positions the rail. |
| `src/components/ui/CalendarBase.css` | **REDUCED** — one wholly dead rule deleted; ruling recorded in a header | 366 → 399 | 149 → 143 | Four `all: unset` resets, each opening the file's four largest rules, plus a sizing chain whose reads are all inside other custom properties. |
| `src/components/animation/ScrollReveal.css` | **UNCHANGED** (one claim in its comment corrected) | 35 → 48 | 1 → 1 | The one declaration must beat an *unlayered* foundation rule, and it must do so for every `.scroll-reveal-hidden` in the document, not only the ones React renders. |

Line counts went **up** in all three, which is the honest shape of this lane's output: what it
produced is adjudication, and adjudication is prose. Declarations went down by six and behaviour
did not change anywhere.

---

## 2. Timeline — the ruling, and the evidence

**Question 2 is the operative blocker, and the survey's number is wrong.**
Fourteen private `--_timeline-*` custom properties are defined on `.timeline`. **Seven** have at
least one read site inside another custom property's definition:

```
--_timeline-dot-size         → --_timeline-marker-radius
--_timeline-marker-size      → --_timeline-marker-radius
--_timeline-highlight-ring   → --_timeline-marker-radius
--_timeline-marker-radius    → --_timeline-line-offset, --_timeline-gutter
--_timeline-marker-clearance → --_timeline-gutter
--_timeline-line-offset      → --_timeline-gutter, --_timeline-rail-x
--_timeline-gutter           → --_timeline-rail-x
```

They are one chain, six deep: `dot-size → marker-radius → line-offset → gutter → rail-x →
left/right`. Confirmed by machine, not by eye (custom-property reads extracted per declaration and
partitioned by whether the reading declaration's own property starts with `--`).

**The `:has()` pair is the blocker no variant can express.** Verified at source:
`.timeline:has(.timeline-item[data-highlight="true"])` is (0,3,0) because `:has()` takes the
specificity of its most specific argument; `.timeline:has(.timeline-item .timeline-icon)` is
(0,3,0) *only because* of the redundant `.timeline-item` descendant, and wins on source order. That
is a two-rule contract in which both order and specificity are load-bearing. A class list has no
way to say "these two, in this order" — a `has-[…]:` variant pair emits in whatever order Tailwind
sorts them, and the file's own comment ("ORDER AND SPECIFICITY BOTH MATTER HERE") is a warning that
survives conversion into nothing.

**Question 4 (the density axis) is confirmed as the smallest obstacle, not the operative one.**
`--_timeline-card-padding` and `--_timeline-item-gap` each have three definitions and one read, so
the utility form is six `in-[[data-density=…]]:` classes. AGENTS.md is right. Worth adding: three
*more* properties (`--_timeline-dot-size`, `--_timeline-marker-size`, `--_timeline-glyph-size`) also
have three density definitions each, so the axis is five properties wide, not two — the other three
just fail question 2 or 1 first and never reach question 4.

**One blocker AGENTS.md does not name.** `--_timeline-glyph-size` has a single read, on
`.timeline-icon > svg` — an element the **consumer** supplies as the `icon` prop, not one the
component renders. That is question 1. (The `[&>svg]:` variant form does compile, per
`memory/css-to-utilities.md`, so it is not an impossibility — but it is a different obstacle from
the one the density row records.)

**Why converting the leaves would be strictly negative.** `.timeline-date`, `.timeline-title` and
`.timeline-body` convert cleanly. They are also already `cn("timeline-title", classNames?.title)`,
and this file is in `@layer components` — so a caller's utility *already* beats every declaration in
them. The conversion buys consistency and nothing else, which is precisely the argument AGENTS.md's
falsifier section says produced the 1.31:1 focus ring. It would also leave the derivation chain and
the `:has()` contract standing alone, stripped of the file that explains them.

---

## 3. CalendarBase — the ruling, and one real deletion

### Deleted: `.calendar-label`, six declarations, 100% inert

`CalendarBase.tsx` rendered `cn("calendar-label calendar-label-button", …)` — both classes on one
element. `.calendar-label-button` restates **every one** of `.calendar-label`'s six declarations
(`flex`, `text-align`, `font-size`, `font-weight`, `line-height`, `color`) at equal specificity
(0,1,0) and later source order, so it won all six regardless of the `all: unset` that also opens it.
`.calendar-label` was the pre-button caption; once the caption became a button it stopped doing
anything, and nothing noticed because nothing could.

This is **dead-code removal, not a partial conversion** — nothing was moved to a class list and no
context was stripped. Rule deleted, class dropped from the TSX, and the test's special case for the
two-class string collapsed back to the ordinary one-class form.

Not kept as a declaration-free marker (AGENTS.md's usual disposition) because it is not a marker for
a *distinct* element: `.calendar-label-button` is already this element's one name, and it is the one
`docs/components/calendar.md` documents.

### Why the rest stays

1. **Four `all: unset` resets** — `.calendar-label-button`, `.calendar-day`, `.calendar-picker-cell`,
   `.calendar-today-button`. These are the file's four largest rules. Tailwind emits
   arbitrary-property utilities last in `@layer utilities`, so `[all:unset]` would wipe the rebuild
   *and* start beating the caller's `className`. The enumeration escape is genuinely available —
   all four subjects are `<button>`, and Preflight already supplies `font: inherit`,
   `color: inherit`, `background-color: transparent`, `border: 0 solid`, `box-sizing`, `margin: 0`,
   `padding: 0` — but Preflight sets `appearance: button` where `all: unset` computes `none`, and it
   does not touch `text-align`. Nothing in this repo can see either difference. Not attempted for a
   consistency gain.
2. **The sizing chain.** `--calendar-col-gap` and `--calendar-months` are never applied as a
   property at all; their only reads are inside `--calendar-month-width` and
   `--calendar-ideal-width`. AGENTS.md's named instance, confirmed at source.
3. **`.calendar-weekdays, .calendar-week` is one rule for two elements** that `classNames.weekdays`
   and `classNames.row` address separately. As utilities it necessarily becomes two independently
   overridable strings — which is exactly the header-vs-rows desync the single rule exists to
   prevent, and the file says so at source.

### `.calendar-picker-grid` — adjudicated, and it is a judgement, not an impossibility

`grid-template-columns: repeat(3, 1fr)` is read back at runtime by `quickNavColumns()` through
`getComputedStyle`. **`grid-cols-3` in the TSX would be read back identically** — the function reads
the *used* track list, which does not care where the declaration came from — and tailwind-merge
would let `classNames.pickerGrid="grid-cols-4"` replace it cleanly, which is arguably a better
override story than today's append-only one. So the CSS comment's "Do not restate the count in the
TSX" is a single-source-of-truth instruction, not a technical bar, and it would still be honoured
(one writer, just a different file).

**Not taken**, because it is one leaf of a file whose core cannot move, and moving it splits the
count away from the sentence explaining why the count matters. Recorded here so the next reader does
not have to re-derive it. If the file is ever fully converted, this rule is not a blocker.

---

## 4. ScrollReveal — confirmed, with a refutation

**Confirmed at source, independently.** `node_modules/@batthewz/response-ui-css/src/animations/scroll-reveal.css`
defines `.scroll-reveal-hidden { opacity: 0 }` **unlayered** (the only `@layer` in that package is
`@layer base` in `base.css`). `ScrollReveal.tsx` emits the class conditionally. `@layer components` +
`!important` beats it; `@layer utilities` without `!important` does not. The file stays, and it must
not go back on the deletable list.

### Refutation: "no utility can replace it" is narrowly false

Probed against this repo's real Tailwind 4.3.3:

```
$ bun run scripts/probe-utility-exists.mjs --css 'noscript:opacity-100!'
OK    noscript:opacity-100!

@media (scripting: none) {
  .noscript\:opacity-100\! { opacity: 100% !important; }
}
```

An `!important` declaration beats a non-important one across the author origin **whatever the
layer**. So `noscript:opacity-100!` *would* win against the foundation's unlayered `opacity: 0`, and
`ScrollReveal.css` *could* be deleted outright.

Both AGENTS.md and `PLAN-overridability.md` §2b state the claim about `noscript:opacity-100` — the
non-important spelling — and for that spelling they are correct. Neither considers the `!` form.

**I did not take it**, and the reason is not the one in the documents. It is **reach**: the CSS rule
covers every `.scroll-reveal-hidden` in the document, including markup an Astro/Rails consumer
hand-authors against the foundation's vocabulary (a case the file's own comment already
acknowledges when it rejects renaming the class). A utility on this component's element covers only
what React renders. Narrowing a *visibility* guarantee — the one thing the declaration exists to
make unconditional — is not worth 35 lines.

The corrected reasoning is now written into the file's header comment, so the next agent finds the
measurement rather than repeating it.

---

## 5. Whole-package sanity sweep

### 5.1 `@keyframes` — AGENTS.md is **correct**

`grep -rn '^@keyframes' src --include=*.css` → **8 blocks in 5 files**, exactly the claimed set:

| File | Blocks |
| --- | --- |
| `src/components/data-display/Sparkline.css` | `sparkline-draw`, `sparkline-fade` |
| `src/components/ui/AppShell.css` | `app-shell-fade-in`, `app-shell-slide-in` |
| `src/components/ui/CommandPalette.css` | `command-palette-in`, `command-palette-backdrop-in` |
| `src/components/ui/Skeleton.css` | `skeleton-pulse` |
| `src/components/ui/ProgressBar.css` | `progress-bar-stripes` |

The `^` anchor matters, as AGENTS.md says: `Timeline.css` says the word in prose.

### 5.2 `!important` — AGENTS.md is **correct**

`grep -rn '!important;' src --include=*.css` → exactly **two** declarations:

- `src/components/animation/ScrollReveal.css` — `opacity: 1 !important`
- `src/components/ui/Hero.css:120` — `animation-name: none !important`

Every other hit for the bare word `!important` is prose inside a comment (`Radio.css`, `Tabs.css`
×2, `Hero.css` ×2, `ScrollReveal.css`). The `;` in the grep is what separates them, and it is
load-bearing — drop it and the count reads 10.

### 5.3 Already-dead declarations — the whole package, swept

A component-layer declaration whose subject also carries a competing Tailwind utility from the TSX
is dead today: `@layer utilities` sits above `@layer components`, so the utility wins at any
specificity. Every stylesheet in the cascade was traced to its render sites.

**Both suspects confirmed, and one is a live behaviour bug, not merely dead weight.**

| File | Selector | Dead declaration(s) | Beaten by | Consequence today |
| --- | --- | --- | --- | --- |
| `src/components/ui/Carousel.css` | `.carousel-arrow:hover` | `background-color: color-mix(in oklch, var(--C-SURFACE-2) 75%, transparent)` | `IconButton`'s unconditional `hover:bg-surface-2` | **Behavioural.** The arrow's hover wash is `--C-SURFACE-2` at 100%, not the intended 75% mix. |
| `src/components/ui/Carousel.css` | `.carousel-arrow[data-hidden="true"]` | `opacity: 0` | `IconButton`'s `disabled:opacity-50` — `data-hidden` and `disabled` are set from the *same* expression, so the attribute matches iff the button is `:disabled` | **Behavioural.** The end-of-rail arrow renders at 50% opacity, not invisible. The sibling `pointer-events: none` in the same rule is **alive** — nothing sets it. |
| `src/components/ui/Carousel.css` | `.carousel-arrow` | the *duration* component of the `transition` shorthand | `IconButton`'s `duration-fast` | Cosmetic. Arrows animate at `--DURATION-FAST`, not `--MOTION-DURATION-ENTER`. Same for the `prefers-reduced-motion` block's `0s` — `transition-property: none` still wins, so motion is genuinely suppressed. |
| `src/components/ui/Hero.css` | `.hero__background img` | `width: 100%`, `height: 100%`, `object-fit: cover` (all three) | `size-full object-cover` on the `<img>` `HeroBackground` itself renders | None — the values agree. Pure dead weight. (`imgProps.className="object-contain"` already works, via the utility, not this rule.) |

**Not fixed** — all four are outside my lane. `Carousel` and `Hero` belong to their owning lanes,
who should note that the first two rows are behaviour changes to *decide*, not merely deletions:
restoring the intended 75% mix and the `opacity: 0` requires either a variant-scoped utility on the
`IconButton` call or dropping the competing base class, not just deleting CSS.

**Everything else is clean.** No other stylesheet in the package has a declaration unconditionally
beaten by a utility on the same element. The near-misses that look like finds and are not:

- `Radio.css .radio:checked { background-image }` vs `bg-surface-0` — `bg-*` is `background-color`.
- `ProgressBar.css .progress-bar__fill--striped { background-image }` vs `bg-accent` — same.
- `DataTable`'s `.data-table-expanded-cell` gradient marker vs `bg-surface-2` — same.
- `Combobox`/`ColorPicker` inputs vs `focusRingControl` — `ring-*` is `box-shadow`, which those
  rules do not declare.
- `AppShell`'s `sr-only` on sidebar labels — conditional on the collapsed rail, and the one
  genuinely redundant `padding: 0` is already in-file as the `probe:cascade-layer` control.
- `Skeleton.css .skeleton { height: 1em }` is shadowed by `className="size-4"` at `DataTable`'s and
  `VirtualizedDataTable`'s call sites — **per-call-site, not the default path**, and the CSS comment
  already records the intent. Not a find, but worth knowing it happens in-repo.

Cross-component renders were checked explicitly and are all clean: `Table.css` (consumed by
`Table`, `DataTable`, `VirtualizedDataTable`), `VirtualizedDataTable.css` (styles elements
`Table.tsx` renders), `StatCard.css`'s `.sparkline` rule, `ActivityFeed.css`'s aside ring on a
caller-supplied `<Avatar>`.

### 5.4 Test coupling on class strings — the cheapest future conversions

Measured mechanically: for each stylesheet in the cascade, every class it defines was searched for
across every `*.test.tsx` in `src`.

**Zero coupling — nothing in any test names any class these files define:**

- `src/components/ui/Button.css` — defines **no** class at all (comment only). *(Another lane has
  already deleted this file in the working tree.)*
- `src/components/ui/DropdownMenu.css` — one class, `.dropdown-menu-trigger`, named nowhere in any
  test. **This is the cheapest un-converted stylesheet in the package.** It is also on
  `PLAN-overridability.md` §2b's "fully deletable by inlining" list, and its declarations are a
  `<button>` reset (`background: none`, `border: none`, `padding: 0`, `font: inherit`) — so the
  reset ruling, not the tests, is what actually gates it.

**Next cheapest (1–3 class mentions across all tests):** `Accordion` (1, already converted),
`Collapsible` (2), `Drawer` (2), `Popover` (2), `Rating` (2), `ThemeSwitcher` (2), `Slider` (2),
`ScrollReveal` (3), `EmptyState` (3), `Tooltip` (3), `Wizard` (3), `Combobox` (3), `Radio` (3),
`Switch` (3).

**Heaviest, for contrast:** `Table.css` (31), `CalendarBase.css` (25), `FileUpload.css` (22),
`Hero.css` (19).

**The expensive shape is not mention-count, it is exact equality.** `getAttribute("class")).toBe(…)`
/ `[...classList]).toEqual(…)` appears at ~40 sites across `ProgressRing`, `RangeSlider`, `Select`,
`ActivityFeed`, `Repeater`, `MultiSelect`, `Switch`, `DateRangePicker`, `Combobox`, `DatePicker`,
`AppShell` and `CalendarBase`. A lane converting any of those rewrites the assertion per §7 of the
brief; a lane converting `DropdownMenu` rewrites nothing.

---

## 6. Public API changes

**One, in `CalendarBase`.** The month/year caption button no longer carries the `calendar-label`
class. Its class attribute goes from `"calendar-label calendar-label-button"` to
`"calendar-label-button"`.

*Justification:* `.calendar-label`'s six declarations were every one of them already overridden by
`.calendar-label-button` on the same element, so the class styled nothing and could not be made to.
Keeping it would keep a second name for an element that already has a documented one. Pre-v1, no
consumers; `docs/components/calendar.md` documents `button.calendar-label-button` and is unchanged.

No new slots. No changed DOM structure. No removed props. No renamed classes other than the above
deletion.

---

## 7. Proposed edits to shared documents

### 7.1 `AGENTS.md` — "What stays" table, the `!important` row

The row currently reads, in part:

> `noscript:opacity-100` cannot replace `ScrollReveal`'s `opacity: 1`.

Replace with:

> `noscript:opacity-100` cannot replace `ScrollReveal`'s `opacity: 1` — though
> **`noscript:opacity-100!` can**, and was probed: an important declaration beats a non-important
> one across the author origin whatever the layer. It is not used because it would narrow the
> guarantee from *every* `.scroll-reveal-hidden` in the document to only the ones React renders,
> and the declaration exists to make a visibility invariant unconditional. State the reason as
> reach, not as impossibility.

### 7.2 `AGENTS.md` — "What stays" table, the read-site row

Add to the *Live instance* cell, after the `--calendar-col-gap` example:

> `Timeline` is the same shape at scale: **seven** of fourteen private `--_timeline-*` properties
> are read only from inside another custom property, forming one six-deep chain
> (`dot-size → marker-radius → line-offset → gutter → rail-x → left/right`). Count them by the
> discriminator this row states — the *property the read sits in* — not by the presence of `calc()`,
> which inflates the figure to ten.

### 7.3 `AGENTS.md` — the four questions

Consider promoting a fifth, which both of this lane's large files hit and which none of the four
catches:

> 5. **Does the declaration depend on being first in its rule, or on a source-order contract with
>    another rule?** A blanket reset, or a pair of rules whose correctness comes from one being
>    written after the other at deliberately equal specificity (`Timeline.css`'s two `:has()`
>    rules), has no class-list form at all — a class list cannot express "these two, in this
>    order". Yes → stays.

(The lane brief already carries this as its §3.5; it is not in AGENTS.md.)

### 7.4 `PLAN-overridability.md` §2b — the `ScrollReveal.css` sentence

The sentence "no utility can replace it, because `noscript:opacity-100` lands in `@layer utilities`
and loses" is true of the spelling it names and false as a general claim. Amend to:

> …and no *ordinary* utility can replace it, because `noscript:opacity-100` lands in
> `@layer utilities` and loses to the foundation's unlayered `.scroll-reveal-hidden`.
> `noscript:opacity-100!` **does** win (measured), and would delete the file; it is rejected on
> reach, not on cascade — a utility reaches only the elements React renders, and the rule below
> reaches every `.scroll-reveal-hidden` in the document, including markup an Astro/Rails consumer
> hand-authors. Keep it off the deletable list for that reason.

### 7.5 `memory/css-to-utilities.md` — new section

> ## An `!important` utility is not in the same cascade position as an ordinary one
>
> "A utility lands in `@layer utilities` and therefore loses to an unlayered foundation rule" is
> true only of non-important utilities. Tailwind's `!` suffix (`noscript:opacity-100!`) emits
> `opacity: 100% !important` inside `@layer utilities`, and importance is resolved *before* layer
> order within the author origin — so it beats an unlayered non-important declaration. Every ruling
> of the form "no utility can beat the foundation here" needs the word *ordinary* in it, or it is
> refutable by one keystroke.
>
> What that does **not** change is *reach*. A stylesheet rule covers every element in the document
> matching its selector, including markup a consumer hand-authors against `response-ui-css`'s
> vocabulary. A utility covers only what this package renders. Where the declaration guarantees
> *visibility* rather than appearance, that narrowing is the whole objection and the cascade
> argument is a distraction.

> ## A rule can be dead without a utility being involved
>
> `CalendarBase` shipped two classes on one element where the second restated all six of the
> first's declarations at equal specificity and later source order. Every declaration in the first
> rule was inert, and had been since the caption became a button. Nothing in the repo could see it:
> no gate compares two rules, and the class-equality test asserted the two-class string as
> *expected*. When a component composes more than one of its own classes onto one element, check
> whether the later one has already eaten the earlier one.

> ## Adjudication is a deliverable, and it is prose
>
> Two of this lane's three files ended larger than they started and shipped zero conversions. That
> is the correct output when the ruling is "stays": the cost of a STAYS verdict is that the next
> agent re-derives it, and a header comment naming the specific blockers — measured, at source — is
> what stops that. Prefer the header to a lane report nobody will find.

---

## 8. Refutations

1. **`noscript:opacity-100!` beats the foundation.** AGENTS.md and `PLAN-overridability.md` §2b both
   assert no utility can replace `ScrollReveal`'s declaration. The important-modifier form can, and
   was probed against real Tailwind 4.3.3. The conclusion (the file stays) survives; the stated
   reason does not. §4 above and §7.1/§7.4.

2. **"Nine of fourteen" is not reproducible for Timeline.** The prior survey's figure for
   custom properties with a read site "inside a `calc()` or inside another custom property" is 9.
   By AGENTS.md's own discriminator — *what property the read sits in* — the answer is **7**. By the
   survey's looser phrasing (any read appearing inside a `calc()`, including reads that sit in an
   ordinary property such as `left: calc(…)`) the answer is **10**. Nine is neither. The verdict is
   unchanged and the criterion that produces 7 is the one AGENTS.md states.

3. **The Timeline density axis is five properties wide, not two.** AGENTS.md's question-4 row names
   `--_timeline-card-padding` and `--_timeline-item-gap`. `--_timeline-dot-size`,
   `--_timeline-marker-size` and `--_timeline-glyph-size` also carry three `[data-density]`
   definitions each. The row is not wrong — the other three fail question 2 or 1 before reaching
   question 4 — but "the density axis is two properties" is not a fact about the file.

4. **`.calendar-picker-grid` is not blocked by `getComputedStyle`.** The lane brief calls this a
   judgement rather than an impossibility, and that is right: `grid-cols-3` in the TSX reads back
   through `quickNavColumns()` identically, because the function reads the *used* track list. The
   real reason it stays is that it is a leaf of a file whose core cannot move.

5. **Two of the four already-dead declarations found in the sweep are behaviour bugs, not tidy-ups.**
   `Carousel`'s arrow hover renders at 100% of `--C-SURFACE-2` instead of a 75% mix, and its
   end-of-rail arrow renders at 50% opacity instead of 0. Both have been shipping. Deleting the CSS
   is the correct edit but it is not a no-op — the intended appearance has to be re-expressed on the
   `IconButton` call or abandoned deliberately.

---

## 9. What I did not do, and why

- **No conversions in any of the three files.** Every declaration that could move is a leaf whose
  element already carries a `classNames` slot in a `cn()`, in a file that already sits in
  `@layer components` — so a caller's utility already beats it. The conversion would buy consistency
  only, which AGENTS.md explicitly excludes as a reason, and it would leave the resets, the
  derivation chains and the `:has()` contract standing without the file that explains them.
- **`ScrollReveal.css` not deleted** despite having a measured route to deletion. Reasons in §4;
  recorded rather than silently skipped, and the route is written into the file so the decision is
  re-openable by whoever owns it.
- **`.calendar-picker-grid` not converted.** §3, last block.
- **Carousel and Hero not touched.** Their dead declarations are reported in §5.3 for the owning
  lanes; the brief forbids editing components outside my lane.
- **No shared documents edited.** `AGENTS.md`, `PLAN-overridability.md`, `memory/**` and
  `CHANGELOG.md` are untouched; the exact prose I would have committed is in §7.
- **`Timeline.css` payload figures not re-measured.** `PLAN-overridability.md` §2b measures the file
  once and says not to do it again. The question-2 audit in §2 is a different measurement (read
  sites, not lines/declarations/comment ratio) and does not restate any §2b figure.
- **`bun run test` and `probe:cascade-layer` not run**, per §9.2 of the brief — the consolidation
  agent runs those once.

---

## 10. Gate status

All green, run after the batch:

```
bun run typecheck                    OK
bun run lint                         OK
vitest run  (CalendarBase, Timeline, ScrollReveal, Calendar,
             RangeCalendar, DatePicker, DateRangePicker)
                                     7 files, 232 tests, all passing
bun run verify:component-docs        OK — 90 spokes, 886 token claims resolved
bun run verify:slot-annotations      OK
bun run verify:docs                  OK — 126 value exports documented
bun run verify:css-layering          OK
bun run verify:no-css-imports        OK — 340 files, 0 CSS imports
bun run verify:focus-affordance      OK (exit 0)
bun run verify:example-themes        OK — the examples remain deletable
```

The house rule was observed: `CalendarBase.tsx` was changed first and
`CalendarBase.test.tsx:394` was watched go red with exactly the expected diff
(`'calendar-label-button'` vs `'calendar-label calendar-label-button'`), one test failing and
thirty-seven passing, before the assertion was updated.

`verify:css-layering` reported **41** component imports rather than 44 — three other lanes had
already deleted stylesheets in the shared working tree. Not my diff; noted so the consolidation
agent does not read it as one.

---

## 11. For the consolidation agent

- **Nothing to resolve in `src/styles.css`** — this lane deleted no stylesheet, so it made no edit
  to that file.
- **Two behaviour decisions are owed by other lanes**, not by me: `Carousel`'s arrow hover mix and
  its `[data-hidden]` opacity (§5.3). If those lanes delete the dead CSS without re-expressing the
  intent, the current (wrong) rendering becomes the intended rendering by default.
- **Four shared-document edits are proposed in §7**, two of which correct claims that are currently
  false as written (§7.1 and §7.4, the `ScrollReveal` utility claim).
- **`DropdownMenu.css` is the package's cheapest remaining stylesheet** — one class, zero test
  coupling — but its content is a `<button>` reset, so the reset ruling gates it, not the tests.
