# Moving a declaration out of CSS and into a class list

What a survey of the package's component stylesheets measured, and what it cost to find out.
`AGENTS.md` § "Decision: what stays in CSS" holds the rule; this file holds the things that
are only visible once you try it on a real file.

## The cascade fact that decides most cases

**Tailwind emits arbitrary-property utilities LAST inside `@layer utilities`, after every named
utility.** Measured in this repo, and independently on three disjoint sets of stylesheets. It is
the single most load-bearing fact in this whole exercise, and it inverts the naive reading of
almost every reset.

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

Two more spellings that do not mean what they look like: `font-[inherit]` compiles to
`font-family: inherit`, **not** the `font` shorthand. `border-inherit` compiles to
`border-color: inherit`, so it cannot carry an arrow that inherits the panel's border *width and
style*. `bg-none` is `background-image: none` only, not the `background` shorthand.

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

## `> *` is not `*:`

A `> *` rule and the `*:` variant are not the same rule in a different syntax. `*:px-r6` emits
`:is(.\*\:px-r6 > *)` — the same 0,1,0 as the child's own `.p-r5`, but sorted **after** it. From
`@layer components` the child wins; from `@layer utilities` the parent wins. Anywhere the children
are components in their own right, that reverses which padding survives.

Where the parent's declaration is an *inherited* property (colour, font-size, line-height), put it
on the parent as an ordinary utility and let inheritance carry it: a child's own rule then beats
it normally, which is the right way round and needs no `> *` at all. Only the non-inherited
properties are stuck.

## Preflight is already a dependency, undocumented

The package's most-used component carries no reset of its own and relies on Tailwind Preflight for
`background-color: transparent`, `border: 0`, `font: inherit`, `box-sizing`, `margin`, `padding`
and `appearance` on `<button>`. So "drop the reset, keep the positive declarations" is consistent
with what already ships, and a hand-written reset is usually re-stating Preflight. Worth knowing
before treating a reset as load-bearing — but also worth writing down somewhere consumer-facing,
because nothing in the docs says a consumer must not disable Preflight.

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
