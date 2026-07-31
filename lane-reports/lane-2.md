# Lane 2 — overlay/menu + media components

Ten components: `menu-internals`, `DropdownMenu`, `Popover`, `Drawer`, `CommandPalette`,
`Carousel`, `Breadcrumbs`, `Spotlight`, `Hero`, `MediaCard`.

## Verdicts

| Component | Verdict | Lines | The single reason the survivor stayed |
| --- | --- | --- | --- |
| `menu-internals.css` | REDUCED | 91 → 27 | `.menu-item-icon > svg` targets an svg **the consumer supplies**. `[&>svg]:size-full` emits at 0,1,1 and, from `@layer utilities`, beats a `size-4` on that svg (0,1,0) on both specificity and sort order. From `@layer components` the child's utility wins, which is the right way round. |
| `DropdownMenu.css` | **DELETED** | 12 → 0 | — |
| `Popover.css` | REDUCED | 72 → 64 (one rule + four `[data-side]` rules, mostly comment) | `border: inherit` on the arrow. `border-inherit` is `border-color` only; `[border:inherit]` compiles and the `data-[side=…]:` zeroing would still out-rank it at 0,2,0 — but as an arbitrary property it sorts **last** in `@layer utilities` and would beat `classNames={{ arrow: "border-2" }}`, which the rule's own docblock says is what that slot is for. |
| `Drawer.css` | UNCHANGED (header added) | 125 → 161 (all comment) | A four-way `[data-side]` table crossed with `not-open:`, `starting:` and `backdrop:` — ~45 variant classes on one element, and the reduced-motion reset survives only fully qualified ×4. AGENTS.md "What stays" rows 6 and 7, with the count written down. |
| `CommandPalette.css` | REDUCED | 188 → 33 | Two `@keyframes` blocks. A utility sets properties on an element; a keyframe block has none. |
| `Carousel.css` | **DELETED** | 100 → 0 | — |
| `Breadcrumbs.css` | **DELETED** | 87 → 0 | — |
| `Spotlight.css` | **DELETED** | 90 → 0 | — |
| `Hero.css` | REDUCED | 122 → 68 | `.stagger-item` is markup the consumer hand-authors (no element of ours to class), and the `!important` guard must beat an **unlayered** foundation rule — which `@layer utilities` also loses to, so converting would not even preserve the ranking. |
| `MediaCard.css` | **DELETED** | 84 → 0 | — |

**971 → 353 lines, five stylesheets deleted.** Of the 353, 161 (Drawer) and ~120 of the rest
are the header comments that state why each survivor could not move.

`src/styles.css`: five `@import` lines removed (Breadcrumbs, Carousel, DropdownMenu,
MediaCard, Spotlight), each as a single targeted edit.

## Public API changes

1. **`Carousel.Track` drag state is `data-dragging`, not `.carousel-track--dragging`.**
   Breaking. The class was applied imperatively with `classList.add` and was a component-layer
   modifier of declarations that are now utilities: `cursor-grab` in `@layer utilities` would
   have beaten `cursor-grabbing` in `@layer components` whatever the DOM said. As an attribute
   variant the modifier emits at 0,2,0 against the base's 0,1,0 and wins on specificity.
   Documented in `carousel.md`; a consumer styling the old class must retarget
   `[data-dragging]`.

2. **`Spotlight.Image`'s `<img>` now carries `size-full object-cover` and merges
   `imgProps.className` through `cn()`.** It previously spread `imgProps` raw, and the
   docblock and a test both pinned that as deliberate — *"this `<img>` carries no class of its
   own … if a class is ever added to this element, the merge becomes mandatory and this test
   is what says so."* The rule that shaped it (`.spotlight-image img`) had to land somewhere
   when the stylesheet went, so the stated precondition is now met and the hatch takes the
   house form that `Hero.Background` and `MediaCard.Image` already used. Prose, docblock and
   test all rewritten to say so; `object-contain` still wins, as it did before.

3. **`Spotlight`'s column alternation moved from CSS `order` rules onto the elements.**
   `Spotlight.Image` now reads the item context (it did not before) and both columns carry
   `sm:order-1` / `sm:order-2`. The `<ScrollReveal>` wrapper gets a `className` — annotated
   `slot:(a)`, because its one class is derived from row position and `reversed`, and it only
   exists while `animate` is on.
   *Behaviour delta, stated:* the old `.spotlight-item > *:not(.spotlight-image)` gave `order:
   2` to **any** non-image child. A third child that is neither `Spotlight.Image` nor
   `Spotlight.Content` now takes the initial `order: 0` and sorts first instead of last. No
   example, doc or test uses that shape.

4. **`CommandPalette`'s inter-group gap is computed in the root**
   (`groups[groupIndex - 1]?.group != null && "mt-r5"`) instead of
   `.command-palette-group + .command-palette-group`. This is the brief's unresolved item.
   Neither shortcut is equivalent: `not-first:mt-r5` is a different selector (a group preceded
   by ungrouped rows is not first, and took no margin under the old rule), and
   `[.command-palette-group+&]:mt-r5` hard-codes the BEM name into a utility. The computed
   form is exact — entries render in order and each is either a group box or a **non-empty**
   fragment of ungrouped rows, so "the previous entry is a group" is precisely "the previous
   element sibling is a group box". Two tests pin both halves.
   *Correction to the brief:* the empty state is **not** a sibling of the groups —
   `hasResults ? groups : empty` is an either/or, so that half of the objection to
   `not-first:` does not hold. The ungrouped-rows half does, and is what rules it out.

5. **`Carousel`'s hidden-arrow fade is restored.** See "Dead declarations" below. No API
   change, but the end-of-rail arrows now fade out instead of rendering at 50% opacity.

6. **Class-constant naming.** Every hoisted class constant this lane added is
   component-prefixed (`popoverContentClasses`, `paletteInputClasses`, `breadcrumbsLinkClasses`
   …) rather than generic (`contentClasses`, `inputClasses`). This is not style — see
   *Refutations* §R1.

No slots added, no slots renamed, no props removed. `SLOT-VOCABULARY.md` needs no new row.

## Dead declarations — what was deleted, and what was fixed

Lane 5's sweep and my own reading agree on all of these. The brief's instruction was "delete,
do not silently revive"; two of them were **live visible defects**, so each was ruled
explicitly rather than uniformly.

| Declaration | Beaten by | Ruling |
| --- | --- | --- |
| `.hero__background img` (3 decls) | `size-full object-cover` in `Hero.tsx` | **Deleted.** Values agreed; nothing changes. |
| `.carousel-arrow:hover { background-color: color-mix(…, --C-SURFACE-2 75%, transparent) }` | `IconButton`'s `hover:bg-surface-2` | **Deleted, not revived.** `carousel.md` already documented the opaque wash as what ships; the source now agrees with the doc rather than the doc with a rule that stopped applying. |
| `.carousel-arrow`'s `transition-duration: var(--MOTION-DURATION-ENTER)` | `IconButton`'s `duration-fast` | **Deleted, not revived.** `transition-[…]` reads `--tw-duration` back out, so IconButton still supplies the 100ms that ships. The **ease** was never beaten (nothing in IconButton sets one) and is kept as `ease-[var(--MOTION-EASE-ENTER)]`. |
| `.carousel-arrow[data-hidden="true"] { opacity: 0 }` | `IconButton`'s `disabled:opacity-50` | **Fixed, deliberately.** `disabled` and `data-hidden` come from the same boolean, so the arrow rendered as a half-visible, non-interactive ghost — the sibling `pointer-events: none` was alive. `data-[hidden=true]:opacity-0` and `disabled:opacity-50` are both 0,2,0 and the attribute variant is emitted last (measured with `probe-utility-exists.mjs --css`), so the intended fade-out is restored. `cn()` keeps both because tailwind-merge only collapses utilities sharing a modifier. A test pins the class list; `carousel.md` states the change. |

## Refutations

**R1. `verify-focus-affordance.mjs`'s `buildConstStrings` resolves hoisted constants by name
across the WHOLE package, pooling every value bound to that name.** The script's docblock
says only that hoisted constants "resolve"; it does not say the map is global and unkeyed by
file. Consequences observed on this tree:

- `panelClasses` exists in `Tabs.tsx` (`"pt-r3"`) and in `ColorPicker.tsx` (which carries
  `outline-none`). The pooled value makes the guard read `Tabs.tsx:435` — a `tabIndex={0}`
  panel — as resetting its outline, and it fails with `NO AFFORDANCE`. **This is the one red
  gate on the tree and it is a false alarm, in two files neither of which is mine.**
- My own `contentClasses` (Popover, carrying `outline-none`) pooled into `Hero`, `MediaCard`,
  `Accordion` and `Collapsible`, producing four bogus "Exempt" rows.

The blindness runs the other way too, and that is the worse direction: a pooled *ring* from an
unrelated file can satisfy an element that has none, and the guard prints OK. Ten distinct
generic names collide across the package right now (`rootClasses` ×10, `contentClasses` ×8,
`baseClasses` ×7, `triggerClasses` ×4 …), and the five concurrent lanes are all minting more.

**Proposed fix (shared file, not made):** in `scripts/verify-focus-affordance.mjs`, key
`consts` by `file + ":" + name` and resolve an element's constants against its own file first,
falling back to the global map only for the two names the script re-attaches deliberately
(`util/focus.ts`, `layout/shared.ts`). Until that lands, a hoisted class constant that carries
a focus **reset** or a focus **ring** must have a package-unique name. I renamed all of mine
to component-prefixed names, which removed my four bogus rows; I did not touch `Tabs.tsx` or
`ColorPicker.tsx`.

**R2. The survey's clearance of `[&>svg]:size-full` in `menu-internals.css` is incomplete.**
It ruled the conversion safe because the competing declarations are SVG *presentation
attributes*, which lose to any CSS. True, but not the whole competition: a consumer passing
`icon={<Check className="size-4" />}` competes with a **class**, and today that class wins
because `@layer utilities` beats `@layer components` at any specificity. Converted, the
utility emits `.\[\&\>svg\]\:size-full > svg` at 0,1,1 and beats `.size-4` at 0,1,0 inside the
same layer — measured, not assumed. So the rule stays, and it is the reason
`menu-internals.css` survives at all.

**R3. A media-query variant adds no specificity, but Tailwind's sort order rescues it.** The
brief says reduced-motion "only survives fully qualified … because a media query adds no
specificity". Both halves are right, but the mechanism is worth stating: Tailwind emits **all**
media-variant utilities in one block at the very end of `@layer utilities`, after every
unqualified and every pseudo-class-qualified one. Measured with `probe-utility-exists.mjs
--css` for `motion-reduce:transition-[box-shadow]` vs `transition-[…]`,
`motion-reduce:backdrop:animate-none` vs `backdrop:animate-[…]`, `motion-reduce:hover:*` vs
`hover:*`, and `motion-reduce:data-[side=right]:not-open:translate-none` vs its base. Equal
specificity plus later emission is what makes reduced motion work at all; it is not a
specificity win, and nothing in the repo notes that.

**R4. `verify-component-docs.mjs`'s `PREFIX_NAMESPACES` has no `aspect` row.** `aspect-wide`
resolves to `--ASPECT-WIDE` in Tailwind, but the gate cannot see it, so a doc naming that
utility fails with "resolves to no token" and a row *claiming* `--ASPECT-WIDE` fails with
"neither reads it in CSS …". `media-card.md` could not tabulate two of its three aspect
ratios. I wrote `aspect-[var(--ASPECT-WIDE)]` / `aspect-[var(--ASPECT-SQUARE)]` instead —
resolvable, uniform with `--MEDIA-ASPECT-POSTER` (which is in no namespace at all), and
compiling identically. **Proposed fix (shared file, not made):** add
`[["aspect"], ["aspect"]]` to `PREFIX_NAMESPACES`.

**R5. `cn()` does not resolve `inset-0` against `inset-y-*`.** tailwind-merge's
`conflictingClassGroups` does not list `inset` as superseded by `inset-y`/`inset-x`, so
`cn("inset-0", "-inset-y-1/2 inset-x-0")` keeps all three and the winner falls to emission
order. `Hero.Background` therefore emits **one or the other** with a ternary rather than a
base plus an override. Worth knowing before converting any `inset:` shorthand.

## Proposed edits to shared documents (not made)

### `AGENTS.md` § "Decision: what stays in CSS" — one new row, and one live instance

Add to the *What stays* table:

> | The declaration must **lose to a class the consumer puts on their own child** | A `> *` or `> tag` rule whose subject is content the caller supplies is beaten by that child's own utility from `@layer components`, and beats it from `@layer utilities` — and an arbitrary-property utility beats the caller's `className` outright, whatever the specificity. | `.menu-item-icon > svg` (`menu-internals.css`, the whole of that file) and `.popover-arrow`'s `border: inherit`, whose own docblock says `classNames.arrow` exists to out-rank it. |

And, for the existing row *"It must beat an unlayered foundation rule"*, the live instance can
now name `Hero.css` precisely: the `!important` guard is one of the package's two, and
`@layer utilities` loses to unlayered too — so converting it would not even preserve the
ranking the `!important` exists to win.

### `CHANGELOG.md` — draft entries

```
### Changed
- **Carousel: the track's drag state is now `data-dragging`, not `.carousel-track--dragging`.**
  BREAKING for a consumer stylesheet targeting that class; retarget `[data-dragging]`. A BEM
  modifier in `@layer components` cannot out-rank a base declaration that is now a utility.
- **Spotlight.Image spreads `imgProps` through `cn()`.** The `<img>` now carries
  `size-full object-cover` of its own, so `imgProps.className` merges after it —
  `object-contain` still wins. Previously the bag was spread raw.
- **MediaCard's hover lift uses the `translate`/`scale` properties rather than the `transform`
  shorthand.** The card rises by exactly `--MEDIA-CARD-HOVER-LIFT` rather than by that times
  the scale — 0.005rem at the shipped values.
- **`:hover` on menu items, breadcrumb links, the breadcrumb ellipsis and MediaCard now
  compiles to `@media (hover: hover)`,** so a coarse pointer no longer latches a hover style
  on tap. This matches every component that was already utility-based.
- **Hero `size="full"` is `min-h-dvh` with no `100vh` fallback.** Every engine Tailwind 4
  supports has had `dvh` since long before Tailwind 4's own baseline.

### Fixed
- **Carousel: an end-of-rail arrow fades out again.** `.carousel-arrow[data-hidden="true"]
  { opacity: 0 }` had been beaten by `IconButton`'s `disabled:opacity-50` from a layer above
  since this package's CSS was layered, so the arrow rendered as a half-visible,
  non-interactive ghost.

### Removed
- `DropdownMenu.css`, `Carousel.css`, `Breadcrumbs.css`, `Spotlight.css`, `MediaCard.css`.
  `menu-internals.css`, `Popover.css`, `CommandPalette.css` and `Hero.css` are reduced to the
  rules that could not move, each with a header saying why. `Drawer.css` is unchanged and
  carries the count that decided it.
- Two dead Carousel declarations (the 75% `color-mix` hover wash and the
  `--MOTION-DURATION-ENTER` fade duration, both beaten by `IconButton`) and three dead Hero
  declarations (`.hero__background img`, identical to the `<img>`'s own utilities). Nothing
  renders differently.
```

### `memory/css-to-utilities.md` — three lessons to fold in

1. **"`> *` is not `*:`" generalises to `> tag`.** The same inversion applies to
   `.parent > svg`: `[&>svg]:size-full` gains a step (0,1,1) *and* sorts after the child's own
   class, so it wins twice over. Where the child is content the consumer hands you, the rule
   stays in `@layer components`.
2. **Media-query variants sort last.** Tailwind emits every `motion-reduce:` / `dark:` /
   `sm:` utility in one media block at the end of `@layer utilities`, after every unqualified
   and pseudo-class-qualified one. That is why a `motion-reduce:` override works at equal
   specificity — and why dropping one qualifier from
   `motion-reduce:data-[side=right]:not-open:translate-none` silently stops it applying.
3. **A hoisted class constant's NAME is load-bearing for the guards.**
   `verify-focus-affordance.mjs` resolves constants by name across the whole package, so two
   files sharing `contentClasses` pool their tokens and the guard reads a reset — or a ring —
   that is not on the element. See lane-2 §R1 for the live false alarm.

## Cross-lane notes

- **Lane 1 (Tooltip) — the arrow.** Tooltip has the same `border: inherit` arrow. My ruling:
  it **stays in CSS**. `[border:inherit]` compiles and the `data-[side=…]:border-*-0` zeroing
  still out-ranks it (0,2,0 vs 0,1,0), so the *side* rules are not the blocker — the blocker
  is that an arbitrary property sorts last in `@layer utilities` and would beat
  `classNames.arrow`, which is the one thing that slot exists for. `border-inherit` is
  `border-color` only and cannot carry the inherited width and style. Our solutions should
  agree.
- **Lane 4 (Combobox/MultiSelect) — `menu-internals`.** I left both files alone. Nothing in
  `menu-internals.tsx` is imported by them, and no `menu-*` class name is shared, so there is
  no interaction to coordinate. `menu-internals.css` now defines only `.menu-item-icon > svg`.
- **Lanes 3 and 4 — the red gate.** `verify:focus-affordance` fails on `Tabs.tsx:435`, caused
  by `panelClasses` colliding between `Tabs.tsx` and `ColorPicker.tsx` (§R1). Neither file is
  mine. It clears either by renaming one of the two constants or by scoping
  `buildConstStrings` per file; the second is the real fix.
- **`ContextMenu`** has no stylesheet and no `.tsx` change; only `context-menu.md` moved, to
  stop describing rules that no longer exist.

## Gate status

Green: `typecheck`, `lint`, all ten lane test files (267 tests), `verify:slot-annotations`,
`verify:docs`, `verify:examples`, `verify:directives`, `verify:css-layering`,
`verify:no-css-imports`, `verify:example-themes`.

`verify:component-docs` and `verify:focus-affordance` are red **only on other lanes' files**
(`activity-feed`, `app-shell`, `pagination`, `progress-bar`, `progress-ring`, `stat-card`,
`stepper`, `table`, `tabs`; and `Tabs.tsx`/`ColorPicker.tsx` respectively). Every spoke and
element in this lane passes both.

Not run, per the brief: `bun run test` and `bun run probe:cascade-layer`.

## What I did not do

- **`Drawer.css` was not converted.** Deliberate, argued in the file's own header with the
  count. It is the only file in this lane that keeps a full stylesheet.
- **`Popover.css`'s arrow block was not converted**, and the four `[data-side]` rules stay
  with it because they exist only to qualify it.
- **No test asserts cascade order.** Every ordering claim in this lane is evidenced by
  `probe-utility-exists.mjs --css` output quoted in the source comment that depends on it;
  jsdom applies no stylesheets, so no test in this package can check it.
- **`AGENTS.md`, `CHANGELOG.md`, `memory/**`, `SLOT-VOCABULARY.md`, `scripts/**` untouched.**
  The prose I would have committed is above.
