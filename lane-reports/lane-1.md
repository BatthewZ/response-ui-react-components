# Lane 1 — CodeBlock, Collapsible, Tooltip, ThemeSwitcher, Wizard, Button, EmptyState, Swimlane, Rating, Skeleton

## Verdicts

| Component | Verdict | Lines | Reason the survivor could not move |
| --- | --- | --- | --- |
| Button | **DELETED** | 1 → 0 | — (one comment, zero declarations) |
| Collapsible | **DELETED** | 35 → 0 | — |
| Wizard | **DELETED** | 23 → 0 | — |
| Swimlane | **DELETED** | 59 → 0 | — |
| CodeBlock | **DELETED** | 112 → 0 | — |
| ThemeSwitcher | **DELETED** | 42 → 0 | — |
| Rating | **DELETED** | 81 → 0 | — (`all: unset` enumerated against Preflight, not transposed) |
| Tooltip | **REDUCED** | 57 → 55 | `.tooltip-arrow { border: inherit }` + its four `[data-side]` trims. A shorthand reset; its only utility form is `[border:inherit]`, which Tailwind emits **after** every named `border-*` utility at equal specificity, so as a class it beats `classNames.arrow` instead of losing to it. |
| EmptyState | **REDUCED** | 107 → 27 | `.empty-state__icon svg { width/height: 1em }`. Styles an element the **consumer** renders. In `@layer components` (0,1,1) it loses to the caller's own `size-8` (0,1,0 in `@layer utilities`) because layer order decides first; as `[&_svg]:size-[1em]` it emits at 0,1,1 in `@layer utilities` **after** `size-8` and starts winning. Measured. |
| Skeleton | **UNCHANGED** | 41 → 41 | Deliberate. See "Skeleton: the decision" below. |

**Stylesheet lines removed: 517** (7 whole files = 353; Tooltip −2 net after a much longer
header; EmptyState −80). Six whole-file deletions plus Button.

`src/styles.css`: seven `@import … layer(components);` lines removed (Button, CodeBlock,
Collapsible, Rating, Swimlane, ThemeSwitcher, Wizard). Targeted single-line edits, re-read
immediately before each.

## Refutations — things measured and found wrong

**1. `font-mono` does not read this design system's mono face.** It compiles to
`font-family: var(--font-mono)`, which is Tailwind's own `ui-monospace, SFMono-Regular, …`
default. `response-ui-css` never maps `--font-mono` (it defines `--DEFAULT-MONO-FONT` and an
unlayered `.mono-font` class). Converting CodeBlock's three mono declarations to `font-mono`
would have silently swapped the typeface in every code block, and **nothing in this repo could
see it** — the probe prints OK, every test passes, `verify:component-docs` would still have
resolved a `--DEFAULT-MONO-FONT` row if the CSS were still there to read it.

**2. `font-[var(--DEFAULT-MONO-FONT)]` compiles to `font-weight`, not `font-family`.** Measured
output:

```css
.font-\[var\(--DEFAULT-MONO-FONT\)\] {
  --tw-font-weight: var(--DEFAULT-MONO-FONT);
  font-weight: var(--DEFAULT-MONO-FONT);
}
```

`font-[…]` is ambiguous between family and weight and a bare `var()` resolves to weight. The
correct spellings are `font-[family-name:var(--DEFAULT-MONO-FONT)]` or
`font-(family-name:--DEFAULT-MONO-FONT)`; both emit `font-family`. This is the sharpest live
example of "OK means it compiles, never that the conversion is correct" — and it sits directly
beside `memory/css-to-utilities.md`'s existing note that `font-[inherit]` **is**
`font-family: inherit`. The two facts look contradictory and are not: `inherit` is a valid
family keyword and not a valid weight, `var(…)` could be either, and Tailwind guesses weight.

**3. Every `.css?raw` import in a test resolves to the empty string.** Measured under this
repo's `vitest.config.ts` (jsdom, no `css` option, so vitest stubs CSS modules — `?raw` and
`import.meta.glob({query:"?raw"})` alike). `Tooltip.test.tsx`'s WCAG-1.4.13 assertion
`expect(tooltipCss).not.toMatch(/pointer-events:\s*none/)` has therefore been **green and
vacuous** for its whole life. That test now asserts the bubble's real class list instead. A
`readFileSync` replacement was written and then withdrawn: there is no `@types/node` in
`tsconfig.json`'s `types` array, so `node:fs`, `node:path` and `__dirname` are all type errors.

**4. The arbitrary-property sort position is *before* variants, not after everything.** Measured
emission order in `@layer utilities`: named bare utilities → **arbitrary properties** → variant
utilities. So `[border:inherit]` beats `border-2`/`border-primary` (both 0,1,0, and it sorts
later) but loses to `data-[side=top]:border-r-0` (0,2,0). Both halves matter: the first is why
Tooltip's rule stays, the second is why the four `[data-side]` rules would have been safe to
convert on their own. The brief's phrasing ("emitted LAST") is right about the direction that
bites and slightly over-broad about the mechanism.

**5. The survey said Tooltip.css was deletable "but needs `[border:inherit]`."** It is not.
Needing `[border:inherit]` *is* the blocker, for the reason in (4). This closes the open note
in `PLAN-overridability.md` §2b — "Anyone re-taking [the deletable-file list] starts with the
two arrow blocks, whose `border: inherit` shorthand has no Tailwind utility short of an
arbitrary property" — with a **no**. `Tooltip` should come **off** the seven-file deletable
list. The same reasoning applies unexamined to `Popover`'s arrow block, which is not my lane.

**6. The survey said EmptyState was deletable with `[&_svg]:size-[1em]` or `*:size-[1em]`.**
Both invert who wins against the consumer's own icon class — see the verdict table. `Stepper.css`
keeps the identical `.stepper-indicator svg` rule, so this is the package's established shape
rather than a one-off.

## Public API changes

- **`EmptyState` sub-parts now read `size` from context and pick their own utilities.** The
  three-way size axis moved from `[data-size]` descendant selectors to a class map per part.
  `data-size` is still written on the root as a marker; nothing reads it back. **Behaviour
  change, deliberate and better:** a nested `EmptyState` now keeps its own size. The
  alternative utility form (`in-[[data-size=sm]]:`) matches *any* ancestor and would have
  taken the outer one's step — the same trap Accordion's chevron avoided.
- **`Rating`'s star button no longer carries `all: unset`.** Enumerated against the compiled
  Preflight rather than transposed. What was checked: `button` gets `font: inherit`,
  `color: inherit`, `letter-spacing: inherit`, `background-color: transparent`,
  `border-radius: 0`, `appearance: button`; the universal reset adds `box-sizing: border-box`,
  `margin: 0`, `padding: 0`, `border: 0 solid`. The three things `all: unset` did that
  Preflight does not — `appearance: none`, `text-align: inherit`, `align-items: normal` — are
  inert here, and `items-center` is now written out so the box does not depend on the UA
  default either way. **A build that disables Preflight now sees UA button chrome behind the
  stars.** `Button.tsx` has always had that exposure; Rating now shares it. Documented in
  `rating.md` and `theme-switcher.md`.
- **`ThemeSwitcher`'s option no longer restates `background: transparent` / `border: none`** —
  same Preflight reasoning, and two fewer utilities for a caller's `bg-*`/`border-*` to
  out-rank.
- **Coarse-pointer hover.** `ThemeSwitcher`'s option wash and `Swimlane`'s "View all" hover now
  compile to `@media (hover: hover) { &:hover }`, so they no longer trigger on touch. This
  matches the rest of the package; recorded, not fought.
- **CSS fallbacks dropped.** `CodeBlock.css` read one token with two different literal
  fallbacks — `var(--BodyText-3, 0.75rem)` in the header and `var(--BodyText-3, 0.8125rem)` in
  the code (the two ends of the responsive step) — plus `var(--Semibold-Weight, 600)`. Both
  become `text-body-3` / `font-semibold`. The fallbacks only ever applied when
  `@batthewz/response-ui-css` was not imported at all, which is not a supported configuration.
  Worth a CHANGELOG line because "two rules guessing differently at one token" is the kind of
  drift that reads as intentional.
- No new `classNames` slots, no renamed classes, no removed props, no DOM structure changes.
  Every BEM marker is retained as a declaration-free marker.

## Skeleton: the decision, and the reasoning

**UNCHANGED, deliberately.** The `@keyframes skeleton-pulse` block is immovable, so the file
cannot be deleted whatever else happens; the only question is whether to convert around it.

The measured refinement in `memory/css-to-utilities.md` is correct: converting **both**
`.skeleton { height: 1em }` and `.skeleton--circular { height: auto }` survives, because
`cn("h-[1em] w-full", "h-auto")` returns `w-full h-auto`. The same is true of the second,
unnamed inversion on `border-radius` (`--RADIUS-MD` base against three modifiers). So the
conversion is *possible*. It is still wrong here, for three reasons:

1. **It narrows a guarantee from the cascade to a library.** Today `h-*` beats `height: 1em`
   by *layer order*, which holds for any merger, any consumer stylesheet, any build. Converted,
   it holds only because `cn()`'s tailwind-merge recognises `h-[1em]` against `h-48`. That is
   true today and is a smaller promise. `Skeleton.tsx`'s own docblock stakes the wider one in
   so many words, and three tests stake it too — `Skeleton.test.tsx` asserts
   `expect(el.className).not.toMatch(/(^|\s)h-/)` precisely so nobody quietly adds one.
2. **AGENTS.md names this file as the canonical "stays" row.** Changing the behaviour that row
   describes while `AGENTS.md` is a file I must not edit is exactly the "docs, tests and naming
   contract disagreeing with the code you shipped" failure the brief forbids. If the owner
   wants it converted, that is one coordinated change to the row, the docblock, the three
   tests and the file — not a lane-local edit.
3. **What is left is the whole point.** After height and radius stay, the convertible remainder
   is `display: inline-block`, `background`, and an `animation` shorthand carrying a `calc()`
   and a four-sentence comment about reading the theme's tempo. Moving those leaves exactly the
   "subtlest content stripped of the context that explained it" residue the brief warns about,
   and buys nothing.

Per AGENTS.md, an untouched file carries no header comment, and that is the expected state —
so nothing was added to it. It was examined; this is the record.

## Proposed edits to shared documents (not made)

### `AGENTS.md` § "What stays" — one new row

| Stays in CSS when | Why no utility can take it | Live instance |
| --- | --- | --- |
| It is a **shorthand `inherit`** a caller must out-rank | The only utility form is an arbitrary property, and Tailwind sorts those *after* every named utility at the same specificity — so the declaration starts beating the `classNames` slot it was written to lose to. The longhand escape does not exist: `border-inherit` is `border-color: inherit` only. | `Tooltip.css`'s `.tooltip-arrow { border: inherit }` and the four `[data-side]` rules that trim it. `grep -n 'border: inherit' src/components/ui/*.css` — `Popover.css` has the same block, unexamined. |

### `AGENTS.md` § "What stays" — amend the "element this package does not render" row

The live-instance cell should gain: *"and `EmptyState.css`'s `.empty-state__icon svg`, which
sizes the lucide icon the caller passes. Not merely unreachable — converting it inverts the
winner, because a descendant utility emits at 0,1,1 in `@layer utilities` after the child's
own 0,1,0 `size-*`."*

### `memory/css-to-utilities.md` — three additions

Under **"Spellings that are not what they look like"**:

> `font-[var(--X)]` is **`font-weight`**, not `font-family`. `font-[…]` is ambiguous between
> the two, `inherit` disambiguates to family (so `font-[inherit]` is `font-family: inherit`),
> and a `var()` disambiguates to weight. The spelling that emits `font-family` from a token is
> `font-[family-name:var(--X)]`. Measured: `font-[var(--DEFAULT-MONO-FONT)]` emits
> `--tw-font-weight: var(--DEFAULT-MONO-FONT); font-weight: var(--DEFAULT-MONO-FONT)`.
>
> `font-mono` is `font-family: var(--font-mono)` — **Tailwind's** default system stack.
> `response-ui-css` maps `--DEFAULT-MONO-FONT` and never `--font-mono`, so `font-mono` silently
> ignores the theme. There is an unlayered `.mono-font` class in the foundation that does read
> the token, and it beats `@layer utilities`; that is the only name in the system that works.

New section, **"Where an arbitrary property actually sorts"**:

> Measured emission order inside `@layer utilities`: named bare utilities, then **arbitrary
> properties**, then variant utilities. "Arbitrary properties are emitted last" is right about
> the shape that bites — a bare arbitrary property beats every bare named utility, including
> the caller's — and wrong about variants: `data-[side=top]:border-r-0` emits after
> `[border:inherit]` *and* out-ranks it at 0,2,0. So a variant-scoped conversion sitting on top
> of an unconverted reset is safe; only the reset itself has to stay.

New section, **"A test cannot read a stylesheet in this repo"**:

> `import css from "./X.css?raw"` resolves to the **empty string** under `vitest.config.ts`
> (jsdom, CSS stubbed; `import.meta.glob` with `query: "?raw"` is stubbed too). Every
> `expect(css).not.toMatch(…)` written that way is vacuously green — one such assertion in
> `Tooltip.test.tsx` had been for its whole life. `readFileSync` is not the fix either: there
> is no `@types/node` in `tsconfig.json`'s `types`, so `node:fs` and `__dirname` are type
> errors. If a lane needs to assert on stylesheet content, the enabling change is
> `test: { css: true }` or adding `@types/node` — a config decision, not a lane decision.

### `PLAN-overridability.md` §2b

The "Fully deletable by inlining — 7 files" figure needs `Tooltip` struck (see Refutation 5),
which drops it to 6 files / 185 lines. `Popover`'s identical arrow block should be marked
unexamined-but-suspect rather than left in the same sentence.

### `SLOT-VOCABULARY.md`

No changes. No slot was added, renamed or needed; nothing hit the "stop and record it as an
owner decision" case.

### `scripts/verify-component-docs.mjs` — a gap, not a bug

`PREFIX_NAMESPACES` has no entry for `size-*`, `w-*`, `h-*`, `min-*` or `max-*`, so a spacing
token reached through one of those is unresolvable and a row naming it fails. Live consequence:
`tooltip.md` cannot tabulate `--R-SIZE-5` for the arrow's `size-r5`, so it says so in prose
instead. Adding `[["size", "w", "h", "min-w", "min-h", "max-w", "max-h"], ["spacing"]]` would
close it — but `max-w-90`/`min-h-16` would then resolve to nothing and start erroring where
they are backticked, so it is not a one-liner and I have not made it.

### `dev/DashboardDemo.tsx` — a stale comment (shared, not edited)

Around line 341:

> ```
> The `hidden` goes on a wrapper because `.theme-switcher`'s own
> `display: inline-flex` is unlayered and outranks the utility.
> ```

Both halves are now false: `.theme-switcher` no longer exists as a rule, and `inline-flex` is
a utility `cn()` merges a caller's `hidden` against. The wrapper is harmless but no longer
necessary, and the reason recorded for it is wrong.

### `CHANGELOG.md`

Suggested entries: the seven stylesheet deletions and two reductions; the two `EmptyState`
behaviour notes (nested size, glyph rule retained); `Rating`'s and `ThemeSwitcher`'s new
Preflight dependency; the CodeBlock fallback removal; the coarse-pointer hover note; and the
`Tooltip.test.tsx` vacuous-assertion fix.

## Tests

13 exact-equality class assertions rewritten across CodeBlock (3), Swimlane (2),
ThemeSwitcher (2), Tooltip (3) and Wizard (3), each to the membership check + junk-token guard
+ per-slot negative that the equality was standing in for. Where a docblock said exactness was
deliberate, the docblock was rewritten to say what is now being asserted and why, rather than
deleted.

Seven new falsifiers, each **observed failing before the patch that makes it pass**:

| Break applied | Test that went red |
| --- | --- |
| removed `border: inherit` from `Tooltip.css` | (withdrawn — see Refutation 3; no in-repo route can assert stylesheet content) |
| added `[border:inherit]` to `arrowClasses` | `keeps the arrow's border inheritance out of the class list` |
| `font-[family-name:…]` → `font-mono` | `reads the theme's mono face, not Tailwind's default stack` |
| dropped `text-fg-primary` from the active option (the partial-conversion shape) | `drops the resting ink from the selected option rather than stacking it` |
| added `[&_svg]:size-[1em]` to the icon slot | `does not put the glyph sizing on the icon slot's class list` |
| put `[all:unset]` back on the star button | `emits no blanket reset utility, and keeps the positive declarations` |
| changed `sm`'s root padding | `sizes root, icon and title for sm` + `keeps a nested empty state on its own size` |

Every class string shipped was compiled through `scripts/probe-utility-exists.mjs`; the ones
whose selector or resolved value was doing real work were read with `--css`.

## Gates

| Gate | Result |
| --- | --- |
| `typecheck` | **green** |
| `lint` | **green** |
| my ten test files | **green** — 225 passed |
| `verify:docs` | **green** |
| `verify:css-layering` | **green** |
| `verify:no-css-imports` | **green** |
| `verify:example-themes` | **green** |
| `verify:slot-annotations` | **green** — 0 failing |
| `verify:component-docs` | red, **0 errors on my ten** — every error belongs to another lane's spoke (command-palette, stat-card, tabs, stepper, table, breadcrumbs, progress-bar, pagination, dropdown-menu, app-shell, activity-feed, media-card, progress-ring, popover, spotlight, hero, carousel) |
| `verify:focus-affordance` | red, **1 violation, not mine** — `src/components/ui/Tabs.tsx:435` |

Not run, per the brief: `bun run test` (full suite) and `probe:cascade-layer`. `DataTable.test.tsx`
was run once to check nothing of mine reached it — its 2 failures are `Table.css` conversions
from another lane.

## Anything not done

- **Skeleton was not converted.** Deliberate, reasoned above, not a silent skip.
- **`Popover.css`'s arrow block** has the same `border: inherit` shape as Tooltip's and the
  same ruling almost certainly applies. It is not in my ten and I did not touch it.
- **No stylesheet-content assertion** exists for Tooltip's surviving rule; only the
  transposition direction is checkable from a test here. The file header carries the reason.
- **`verify-component-docs`'s missing `size`/`w`/`h`/`min`/`max` prefixes** were diagnosed and
  left; `scripts/**` is shared.
