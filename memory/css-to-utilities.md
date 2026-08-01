# Moving a declaration out of CSS and into a class list

What a survey of the package's component stylesheets measured, and what it cost to find out.
`AGENTS.md` § "Decision: what stays in CSS" holds the rule; this file holds the things that
are only visible once you try it on a real file.

## The cascade fact that decides most cases

**Tailwind emits arbitrary-property utilities after every *bare* named utility inside
`@layer utilities`.** Measured in this repo, and independently on four disjoint sets of
stylesheets. It is the single most load-bearing fact in this whole exercise, and it inverts the
naive reading of almost every reset.

**It is not "last", and the correction matters in both directions.** Measured emission order
inside `@layer utilities` is: named bare utilities → arbitrary properties → variant utilities.
So `[border:inherit]` beats `border-2` and `border-primary` (all 0,1,0, and it sorts later),
which is the half that bites. But `data-[side=top]:border-r-0` emits *after* `[border:inherit]`
**and** out-ranks it at 0,2,0 — so a variant-scoped conversion layered on top of an unconverted
reset is safe, and only the reset itself has to stay. Ruling a whole block immovable because
"arbitrary properties are last" over-states the constraint; it is the bare ones that trap you.

The consequence: a **reset cannot be transposed into a class list**. In a rule, `all: unset` is
correct *because it comes first* and the fifteen declarations after it rebuild the control. As
`[all:unset]` in a class list it is emitted after `inline-flex`, `cursor-pointer`, `rounded-sm`
and the rest, so it wipes them and the control renders as a bare UA button. Same for
`[font:inherit]`, `[background:none]`, and anything else whose job is to be overridden by what
follows it.

Worse, and easier to miss: the reset also starts beating **the caller**. In `@layer components` a
consumer's `className="text-h3"` wins; as an arbitrary property in `@layer utilities` the reset
wins instead. That is the silent-no-op defect Phase 1 removed, reintroduced by a change whose
whole purpose was overridability. **Resets belong in the component layer. Only positive
declarations should become utilities.**

## Spellings that do not mean what they look like

`font-[inherit]` compiles to `font-family: inherit`, **not** the `font` shorthand.
`border-inherit` compiles to `border-color: inherit`, so it cannot carry an arrow that inherits
the panel's border *width and style*. `bg-none` is `background-image: none` only, not the
`background` shorthand.

**`font-[var(--X)]` is `font-weight`, not `font-family`** — and it sits one line from the
`font-[inherit]` fact above, which looks like a contradiction and is not. `font-[…]` is ambiguous
between the two; `inherit` is a valid family keyword and not a valid weight, so it disambiguates
to family, while a `var()` could be either and Tailwind guesses weight. Measured:
`font-[var(--DEFAULT-MONO-FONT)]` emits `--tw-font-weight: var(--DEFAULT-MONO-FONT);
font-weight: var(--DEFAULT-MONO-FONT)`. The spellings that emit `font-family` from a token are
`font-[family-name:var(--X)]` and `font-(family-name:--X)`.

**`font-mono` does not read this design system's mono face.** It compiles to
`font-family: var(--font-mono)`, which is *Tailwind's* own `ui-monospace, SFMono-Regular, …`
default. `response-ui-css` defines `--DEFAULT-MONO-FONT` and never maps `--font-mono`, so
`font-mono` silently ignores the theme. There is an unlayered `.mono-font` class in the
foundation that does read the token, and it beats `@layer utilities`; that is the only name in
the system that works. Converting CodeBlock's three mono declarations to `font-mono` would have
swapped the typeface in every code block in the library and **nothing in this repo could have
seen it** — the utility probe prints OK, every test passes, and the docs guard would still have
resolved the row. This is the sharpest live example of *OK means it compiles, never that the
conversion is correct*.

**`cn()` does not resolve `inset-0` against `inset-y-*`.** tailwind-merge's
`conflictingClassGroups` does not list `inset` as superseded by `inset-y`/`inset-x`, so
`cn("inset-0", "-inset-y-1/2 inset-x-0")` keeps all three and the winner falls to emission
order. Emit one or the other with a ternary rather than a base plus an override. Worth checking
before converting any `inset:` shorthand.

## The inversion that is dangerous, and the one that is not

The shape that bites is **a base declaration and a sibling modifier on the same element**, both at
0,1,0. Convert the base alone and it moves above the modifier.

The shape that does **not** bite is anything variant-scoped — `data-*:`, `in-[…]:`, `group-*:`,
`hover:`, `motion-reduce:`. Measured: a variant-carrying utility is always emitted after a bare
one, and an attribute variant also gains a full specificity step (`data-[state=open]:grid-rows-[1fr]`
emits at 0,2,0 against the base's 0,1,0). Several files that look like the dangerous shape are
therefore safe, and ruling them out by eye rather than by measurement gets it wrong in both
directions.

One refinement worth keeping, because it changes what the canonical example proves: converting
**both** the base and the modifier is survivable, because `cn()`'s tailwind-merge resolves them at
the call site — `cn("h-[1em] w-full", "h-auto")` returns `w-full h-auto`. The breakage belongs to
the **partial** conversion, base only. That is also the shape a bulk sweep produces, which is why
the ruling stands; but state which conversion you mean, or the claim reads as false to whoever
tests it.

## Sometimes the answer is neither utility nor stylesheet — it is one more element

Accordion's panel inset was a `> *` rule for a structural reason: the box the padding would
otherwise sit on is the grid item the `0fr` row collapses, and **padding survives that collapse**.
Measured in Chromium — padding on the clipper leaves a 12px strip under a closed panel, exactly
the block token's value; padding on a wrapper *inside* the clipper collapses to 0.00px, same as
styling the children directly.

So the third option beat both of the first two: render the padded body yourself. The declaration
becomes an ordinary utility on an element the component owns, the `> *` rule goes, and two quirks
of the old shape go with it — a child that brought its own padding used to lose the panel's inset
entirely, and a child with a background used to bleed to the panel edges.

The general lesson: **when a rule targets the consumer's children, ask why it is not targeting an
element of your own first.** A `> *` selector is often a missing wrapper rather than an
irreducible fact, and the wrapper is what makes the declaration reachable — but only if it gets a
slot, because `className` lands on the root and no route to an inner element exists otherwise.
An inner element carrying an unreachable declaration is not an improvement on a CSS rule; it is
the same problem with fewer places to read about it.

Corollary, from the same change: **put an inherited property on the element `className` addresses,
not on an inner one.** Typography on the clipper is a rule the caller cannot outrank — their
`className="text-body-1"` lands on the root, loses to the inner element's own class, and changes
nothing. On the root it merges and wins.

## `> *` is not `*:`, and the same goes for `> tag`

A `> *` rule and the `*:` variant are not the same rule in a different syntax. `*:px-r6` emits
`:is(.\*\:px-r6 > *)` — the same 0,1,0 as the child's own `.p-r5`, but sorted **after** it. From
`@layer components` the child wins; from `@layer utilities` the parent wins. Anywhere the children
are components in their own right, that reverses which padding survives.

**It generalises to a tag selector, where it is worse.** `.parent > svg` becomes
`[&>svg]:size-full`, which emits at **0,1,1** — so against a child's own `size-4` at 0,1,0 it
wins twice over, on specificity *and* on sort order, where the `> *` form only won on order.
Where the child is content the consumer hands you (`icon={<Check className="size-4" />}`), the
rule stays in `@layer components` and the caller keeps the win. This is what keeps
`menu-internals.css`, `Stepper.css`'s `.stepper-indicator svg` and `EmptyState.css`'s
`.empty-state__icon svg` alive as files. A survey that clears one of these because the competing
declarations are SVG *presentation attributes* has checked the wrong competitor: a presentation
attribute loses to any CSS, but the consumer's **class** is the thing that was winning before.

## Media-query variants sort last, and that is what makes reduced motion work

Tailwind emits every `motion-reduce:` / `dark:` / `sm:` utility in one media block at the very
end of `@layer utilities`, after every unqualified and every pseudo-class-qualified one. A media
query adds **no specificity**, so equal-specificity-plus-later-emission is the entire mechanism
by which a `motion-reduce:` override beats its own base. Two consequences: reduced motion is
safe to convert alongside its base, and dropping one qualifier from a fully-qualified override
(`motion-reduce:data-[side=right]:not-open:translate-none`) silently stops it applying rather
than loudly failing. Measured with `probe-utility-exists.mjs --css` on four such pairs.

Where the parent's declaration is an *inherited* property (colour, font-size, line-height), put it
on the parent as an ordinary utility and let inheritance carry it: a child's own rule then beats
it normally, which is the right way round and needs no `> *` at all. Only the non-inherited
properties are stuck.

## Preflight is a formal dependency, and it is now stated

The package's most-used component carries no reset of its own and relies on Tailwind Preflight for
`background-color: transparent`, `border: 0`, `font: inherit`, `box-sizing`, `margin`, `padding`
and `appearance` on `<button>`. So "drop the reset, keep the positive declarations" is consistent
with what already ships, and a hand-written reset is usually re-stating Preflight.

**This is no longer an implicit lean, for this package.** Both packages import `tailwindcss` whole —
so no consumer of the foundation can be running without Preflight in the first place — this
package's README now says so, and AGENTS.md carries the rule: a declaration that only repeats
Preflight is deleted, not converted. **The foundation has NOT adopted the same rule**: its own
`h1`–`h6`, `p { margin: 0; padding: 0 }` duplicates Preflight exactly and was deliberately kept.
Do not "fix" it here — that is the foundation's call, and it is open.
The exposure it leaves is the cherry-pick case the root `CLAUDE.md` promises: components taken
without the foundation, against a hand-rolled Tailwind entry that imports only `tailwindcss/utilities`.

**Two things a follow-up sweep should not re-derive.** First, `*` does **not** reach UA
pseudo-elements, so a slider thumb still needs its own `box-sizing` while the control that owns it
does not — the same word in two rules of one file, one redundant and one load-bearing. Second,
deleting `border: 0` / `border: none` in favour of Preflight's `border: 0 solid` **changes computed
`border-style` from `none` to `solid` at a used width of `0px`**. It paints nothing, and it is
closer to correct: Tailwind's `border-2` sets width only and assumes Preflight's `solid`, so under
the old declaration a consumer adding a border utility to those elements got a computed style of
`none` and no border at all. Do not read it as a regression when a computed-style A/B surfaces it.

**`font: inherit` on a form control is Preflight restated, not a reset that has to stay.**
Preflight's form-element rule (`button, input, select, optgroup, textarea, ::file-selector-button`)
declares `font: inherit`, `font-feature-settings`, `font-variation-settings`, `letter-spacing`,
`color: inherit`, `border-radius: 0`, `background-color: transparent` and `opacity: 1`. Measured
across the form lane: four of six `font: inherit` declarations sat on exactly those elements and
were re-statements; the other two sat on plain `<div>`s where every longhand of the shorthand is
an inherited property and nothing in the package sets one — a no-op. All six were deletable, and
that single fact is what turned `Combobox.css` and `MultiSelect.css` from "closest to deletable"
into deleted. **Check the ELEMENT before treating `font: inherit` as load-bearing.**

The **enumeration escape** is a measurement, not a transposition. What `all: unset` buys over
Preflight on a `<button>` is `appearance: none` (against Preflight's `appearance: button`),
`text-align: inherit` and `align-items: normal`. Whether those matter is a per-file question:
on `FileUpload`'s flex-item action buttons with one text run they are moot and the reset was
deleted; on `Switch` the reset stays for an unrelated reason. If you enumerate, say in a comment
what you checked. **`text-align` is the one that bites, and it is measured:** deleting
`text-align: inherit` from the enumerated sort-button reset computes `center` in Chromium, not the
cell's `right` — so an enumerated button reset that omits it silently re-centres its label.

## The tokens that have no namespace

`--MOTION-*` is in no Tailwind namespace: `ease-shift` and `duration-motion-duration-shift`
generate nothing at all. The forms that work are `ease-[var(--MOTION-EASE-SHIFT)]` and
`duration-[var(--MOTION-DURATION-SHIFT)]`. Prefer that bracket spelling over v4's `(--X)`
shorthand — both compile identically, but only the bracket form is resolvable by the docs guard,
and it is the spelling the package already uses. `duration-fast|normal|slow` DO work, from
`--transition-duration-*`; do not substitute one for the other, they are different tokens.

## `outline-none` is a custom-property write, not a declaration

`focus-visible:outline-none` emits `--tw-outline-style: none` as well as `outline-style: none`, and
**every** `outline-<width>` utility reads that property back rather than setting a style of its own
(`outline-style: var(--tw-outline-style); outline-width: 1px`). So the familiar "reset it, then
restore it at higher specificity" pattern does not survive transposition: a higher-specificity
`aria-invalid:focus-visible:outline-1` still computes `outline-style: none`, because it inherits
the poisoned variable from the reset on the same element. The repair is a fourth class,
`outline-solid`, which sets the variable back — and nobody writes it, because in hand-written CSS
`outline: 1px solid …` has no such indirection.

Two component stylesheets document that exact reset-then-restore arrangement in their own comments.
Both would break in a way no test in this repo can see.

## Vendor pseudo-elements: the expectation inverts

`[&::-webkit-slider-thumb]:size-5` **compiles and emits the right selector** (`.cls::-webkit-slider-thumb`),
as do the `::-moz-range-thumb`, `::-webkit-search-cancel-button` and `::-ms-clear` forms. The
variant exists. Three other things block the conversion instead, and all three are quiet:

- **Variant order is load-bearing and one keystroke away from wrong.**
  `focus-visible:[&::-webkit-slider-thumb]:shadow-…` emits `:focus-visible::-webkit-slider-thumb` —
  correct. Reversed, `[&::-webkit-slider-thumb]:focus-visible:…` emits
  `::-webkit-slider-thumb:focus-visible`, a pseudo-class after a pseudo-element. It compiles, the
  probe prints OK, and it **never matches**.
- **`appearance-none` emits only the unprefixed property.** Every rule carrying
  `-webkit-appearance: none` on a vendor pseudo-element loses the prefix, and nothing in this repo
  — no probe, no test, no gate — can see the consequence. The failure is visual only.
- **`verify:focus-affordance` cannot read an arbitrary-value ring.** It tokenises by splitting on
  `:`, so `focus-visible:[&::-webkit-slider-thumb]:outline-none` does not parse as a reset, and
  `shadow-[0_0_0_2px_var(--C-BORDER-FOCUS)]` does not match its token-name regex. Convert the ring
  with the arbitrary value and the control leaves coverage; convert the reset the same way and the
  guard drops it **silently and prints OK**. Writing the colour as the token name
  (`shadow-border-focus`) keeps it visible. This is the guard-goes-blind failure arriving from the
  other direction: the vocabulary was not widened, a new shape simply fell outside it.

Related: Tailwind's `shadow-*` resolves through five `@property`-registered variables, and one
unresolvable `var()` invalidates the whole `box-shadow`. Whether those registrations resolve on a
vendor pseudo-element is not measurable here. The hand-written form has one indirection.

## Measure existence, but do not mistake it for a verdict

`scripts/probe-utility-exists.mjs` compiles a candidate against this repo's real Tailwind and the
foundation, which is the only way to answer "does this generate anything". Two ways it has already
misled a reader:

- Its first version escaped the selector by a **deny-list** of punctuation and omitted `&` and
  `'`, so every `[&>svg]:…` variant and every `content-['']` reported MISS while compiling
  perfectly. Escape by allow-list. A probe that says "generates nothing" about a working class is
  worse than no probe, because its whole value is that you act on it without checking.
- OK means the class compiles, not that its selector ever matches, and never that the conversion
  is correct. Read the emitted rule with `--css` whenever the selector is doing real work.

## What the survey found about whole-file deletion

Deleting a stylesheet outright is rarer than the line counts suggest, and the blocker is usually
not the CSS. The recurring ones, in the order they actually showed up:

- **A reset in the file** (`all: unset`, `font: inherit`, `background: none`) — see above.
- **A test asserting the class attribute by exact equality.** Far and away the most common
  blocker, and the cheapest to fix — but it is a live green test, so it is a decision, not a
  derivation. The assertion is usually standing in for "an absent slot appends nothing"; that
  falsifier survives being rewritten as a membership check plus a junk-token guard.
- **Custom properties whose only read is inside another `calc()` or another custom property.**
  These pin whole derivation chains to the file, and they cluster in the layout-heavy components.
- **An element the package does not render** — consumer children, or markup another component
  owns. Check by finding the element, not by assuming from the selector: at least one standing
  claim of this shape turned out to be reachable after all, because the component renders the
  element through a subcomponent that forwards `className`.
- **`@keyframes`** — no variant exists for a block. Still the only genuinely immovable thing.

A partial conversion that leaves 40 lines behind is worse than either extreme: what survives is
always the subtlest content in the file, now stripped of the context that explained it. If the
whole file cannot go, think hard before moving the easy half.

## Comments have nowhere to go

Repeatedly, the declaration converted cleanly and its *reason* did not: a measured contrast
finding, a "these two must move together" note, a browser-specific line-height measurement. A
class string cannot carry a paragraph. Either the comment moves to the component file with the
constant, or the reason is lost — and a lost reason is how the next pass deletes the declaration.

## An `!important` utility is not in the same cascade position as an ordinary one

"A utility lands in `@layer utilities` and therefore loses to an unlayered foundation rule" is
true only of **non-important** utilities. Tailwind's `!` suffix emits the declaration
`!important` *inside* `@layer utilities`, and importance is resolved before layer order within
the author origin — so it beats an unlayered non-important declaration. Probed against this
repo's real Tailwind: `noscript:opacity-100!` emits
`@media (scripting: none) { .noscript\:opacity-100\! { opacity: 100% !important } }` and **does**
beat the foundation's unlayered `.scroll-reveal-hidden { opacity: 0 }`, which the non-important
spelling does not. Every ruling of the form "no utility can beat the foundation here" needs the
word *ordinary* in it, or it is refutable by one keystroke.

What that does **not** change is **reach**. A stylesheet rule covers every element in the document
matching its selector, including markup a consumer hand-authors against `response-ui-css`'s
vocabulary. A utility covers only what this package renders. Where the declaration guarantees
*visibility* rather than appearance, that narrowing is the whole objection and the cascade
argument is a distraction — which is why `ScrollReveal.css` stays, on reach rather than on
impossibility.

## A rule can be dead without a utility being involved

`CalendarBase` shipped two of its own classes on one element, where the second restated **all
six** of the first's declarations at equal specificity and later source order. Every declaration
in the first rule was inert, and had been since the caption became a button. Nothing in the repo
could see it: no gate compares two rules, and the class-equality test asserted the two-class
string as *expected*. **When a component composes more than one of its own classes onto one
element, check whether the later one has already eaten the earlier one.**

The sibling case is a live declaration beaten from a layer above: a component-layer declaration
whose subject also carries a competing Tailwind utility from the TSX is dead today, because
`@layer utilities` sits above `@layer components` at any specificity. A whole-package sweep found
four, and **two of them were behaviour bugs rather than dead weight** — an arrow rendering at
100% of a surface token instead of a 75% mix, and an end-of-rail arrow at 50% opacity instead of
0. Deleting such a declaration is the correct edit but it is **not** a no-op: the intended
appearance has to be re-expressed on the winning element or abandoned deliberately, and the
default of "just delete the CSS" silently promotes the wrong rendering to the intended one.

## A dead rule looks exactly like a live one, and the guards check the element not the state

`RangeSlider.css` gated its entire invalid skin on `.range-slider[aria-invalid="true"]`. The root
has never carried `aria-invalid`: the component destructures it out of the rest props and merges
it onto the two thumbs, where assistive tech actually reads it. Three rules, never matched, for
as long as the file existed — and the test file asserted the root does *not* carry the attribute,
on the line above. Nothing catches this: `typecheck` cannot see CSS, jsdom applies no stylesheets,
and the guards check reachability of the **element**, never of the **state** the selector tests
for.

The generalisation: when a rule keys off an attribute, find where the attribute is *written*, not
just where the class is. In a component that routes ARIA down to inner controls — which is the
correct thing to do — the root often does not have the attribute its own stylesheet is asking
about.

## A test cannot read a stylesheet in this repo, and `?raw` is not the reason

`import css from "./X.css?raw"` resolves to the **empty string** under `vitest.config.ts`, and so
does `import.meta.glob("./X.css", { query: "?raw" })`. Measured directly: a glob of
`Tabs.css` yields length **0**, the same glob of `Tabs.tsx` yields **15947**. So it is CSS
specifically — vitest's default `css: false` stubs every CSS module, `?raw` included — and **not**
the `?raw` mechanism, which works fine and is what `focus.test.ts` and `AppShell.test.tsx` use to
read `.tsx` source today. Every `expect(css).not.toMatch(…)` written the CSS way is vacuously
green; one such assertion in `Tooltip.test.tsx` had been for its whole life, and it was the WCAG
1.4.13 check.

`readFileSync` is not the fix either: `@types/node` is not in `tsconfig.json`'s `types`
allowlist, so `node:fs`, `node:path` and `__dirname` are all type errors, and `import.meta.url` is
an http URL under jsdom. Enabling `test: { css: true }` or adding `@types/node` is a config
decision, not a lane decision. **The instruments that can see a stylesheet are
`scripts/verify-*` and `bun run probe:cascade-layer`.** If the assertion you want is about CSS
content, write it as a gate; if it is about what the component renders, assert the class list,
which is what the Tooltip check does now.

## Two guard bugs this sweep found, and what they taught

Both are **fixed**; they are recorded because the shape recurs, not because they are live.

**A gate that resolves constants by name resolves them across every file.**
`verify-focus-affordance.mjs` built one global identifier → string map over every module, so two
files declaring `const panelClasses` shared one merged value. 42 top-level names are duplicated
across `src/components`. It failed in both directions, and the quiet one is the dangerous one: a
false `NO AFFORDANCE` on a tabpanel that resets nothing is survivable, but a pooled *ring* from an
unrelated file silently satisfies an element that has none, and the gate prints OK. Both were
reproduced against the old script before the fix. The map is now scoped per file and widened only
along real `import` edges — which is also how the shared recipes in `util/focus.ts` keep
resolving. **The general form: a resolver keyed on a name that is not unique is a resolver that
invents facts, and "it went red for the wrong reason" is the lucky half of the failure.**

**A guard's vocabulary is its blind spot, and `all` is the word that hides.**
`verify-focus-affordance.mjs` read every spelling of an outline reset except the one that does not
name the property. `all: unset` computes `outline-style: none`, so any focusable element carrying
it has lost the UA focus ring — and the script never called `isOutlineReset`, because no
`outline*` declaration existed to hand it. Found live on `FileUpload`'s two action buttons: two
focusable `<button>`s, WCAG 2.4.7, green everywhere. Teaching the gate one keyword brought **six
further controls** under it that had been invisible. Before treating an `all: unset` rule as
load-bearing, check whether the element is focusable and what puts the ring back — the answer may
be "nothing".

A corollary that only appeared once the sweep ran: **the reset and its replacement need not live
in the same file.** A reset must stay first-in-rule and `[all:unset]` sorts last, so the common
shape now is `all: unset` surviving in the stylesheet while the ring is a
`focus-visible:outline-border-focus` utility in the `.tsx`. A guard that pairs them by file
rather than by element fails two correct components and teaches the next author to put the reset
back into the class list, which is the exact inversion the sweep exists to avoid.

## The docs guard's utility→token map is prefix-limited, and the gap was geometry

`verify-component-docs.mjs` resolved spacing only through `p*`/`m*`/`gap`, so `size-r2`, `h-r5`,
`w-r6`, `top-r6` and `bottom-r6` named a real token and resolved to nothing, and `rounded-t-md`
looked for `--radius-t-md` and missed. A row naming one failed with "resolves to no token in the
contract", which reads like the utility is wrong. Four spokes worked around it by stating the
token in prose beside the table.

**Now fixed, and the fix is the interesting part.** Adding the geometry prefixes to
`PREFIX_NAMESPACES` naively would have turned every `w-full`, `h-8` and `max-w-90` in the docs
red, because that list's polarity is deliberately unforgiving — an item matching a prefix and
resolving to nothing is an *error*, which is what makes an invented `bg-nonexistent` fail instead
of passing as prose. Geometry needed the inverted polarity: a separate list where an item counts
as a utility **only if it resolves**, so `size-r5` becomes checkable and `w-full` stays prose
exactly as before. By construction that can only resolve more rows, never redden one. The four
spokes now tabulate their tokens and the gate checks 889 claims instead of 882. **When a guard's
category genuinely contains both token-bearing and token-free members, the fix is a second
category, not a wider first one.**

## Adjudication is a deliverable, and it is prose

Three of this sweep's files ended **larger** than they started and shipped zero conversions. That
is the correct output when the ruling is "stays": the cost of a STAYS verdict is that the next
agent re-derives it, and a header comment naming the specific blockers — measured, at source — is
what stops that. Prefer the header comment to a lane report nobody will find. Line count is the
wrong scoreboard for this work; **declaration count is the honest one**, and across this sweep it
went 2048 → 600 while lines only went 5790 → 2971.
