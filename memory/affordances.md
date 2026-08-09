# Adding a visual affordance

Lessons from adding an emphasis cue and an opaque marker to two sibling components that draw a
rail. Self-contained on purpose: nothing below needs another file to be legible.

---

## The override hook: a custom property, not a slot `className`

> **Read the premise before the conclusion — it has since changed here, and the note is kept
> because the reasoning is right *given* the premise.** Everything below holds **while a package's
> component CSS is imported unlayered**, which is the state any new package in this repo starts in.
> This one is no longer in that state: its component CSS moved into `@layer components`, which
> deleted the premise and with it the objection. `classNames` is now a valid API here and ships —
> see `docs/project-docs/slot-convention.md`. **The two sub-rules at the end of this section survive the change
> untouched**, because they are about contrast and cues, not about the cascade.

When a caller asks to restyle something *inside* a component, the obvious answer — a
`markerClassName` / `cardClassName` prop, or a `classNames={{ … }}` object — is an API that only
looks like it works here. This library's component CSS is imported **unlayered**, so it outranks
`@layer utilities` whatever the specificity. The properties a caller most wants to change are
exactly the ones the component already declares, so `bg-*` and `border-*` land in the DOM,
change nothing, and report no error. The prop would work only for properties the component
happens *not* to declare, which is an undocumentable line that moves every time someone adds a
declaration.

**The hook that works is a custom property with no leading underscore.** Set on the element the
caller owns, it has no unlayered declaration competing with it *there*, so it lands and inherits
inward. The underscore convention is doing real work: it is the difference between "you may
re-point this" and "this is internal and will change", and it is worth spending a moment to
decide which a new variable is rather than defaulting to underscore.

Two consequences worth internalising:

- **Expose the pair, not the fill.** A fill token guarantees contrast only against its paired
  `on-*` ink. Exposing a fill hook without its ink hook invites a caller to set one and inherit a
  glyph colour chosen for a different background. Expose both, and say in the doc that they move
  together.
- **Keep the non-colour part of a cue private.** If an emphasis cue is a colour *and* a width, and
  both are overridable, a caller can reduce it to colour alone and reintroduce the very
  colour-only defect the width was there to prevent.

## "The library overwrote my className" — read the prop's *type* before believing it

A report of the form *"the component writes its own class straight onto the node I passed,
destroying mine"* has two very different mechanisms behind it, and only one of them is a defect:

- The prop is an **element** and the component clones it. `cloneElement` replaces props rather
  than merging them, so a bare `className` there really does destroy the caller's. Real bug,
  `cn()` is the fix, and this library's cloning components say so in a comment beside the call.
- The prop is a **component** and the component invokes it (`icon?: LucideIcon`, then
  `<Icon className="…" />`). Then the class is *handed over as a prop*, and the caller's own
  component decides what to do with it. There is nothing for `cn()` to merge — the library cannot
  see a class it was never given — and the failure runs the other way: a caller icon that drops
  its `className` prop loses the *library's* class. Not fixable from here.

Two cheap disproofs to reach for before editing anything. `cn("one-static-class")` returns that
string unchanged, so wrapping a lone literal is a provable no-op — assert it rather than arguing
about it. And a claim that a *caller's* class is discarded is settled by rendering with one and
reading the class list: if it landed on the root, the real question is whether the inner element
has an override path at all, which is a different finding with a different owner.

Which element a caller's `className` addresses is a **per-component** answer, and a non-compound
component whose sibling is compound will look asymmetric for a legitimate reason: the compound
sibling's caller addresses the inner element directly through a sub-component, so merging there
is correct, while a single-root component's `className` belongs to the root. Before filing the
asymmetry, check whether the component's own doc already states where the class lands — here it
did, in two places.

## Geometry: derive the rail from what sits on it, and `max()` against the old literal

A component that positions a rail from a spacing literal and then lets callers drop an
arbitrary-sized thing onto that rail is holding one fact in two places. It will look right for
whatever size the author had in mind and wrong for everything else — and "make the thing bigger"
then becomes a change that overhangs the container or collides with the neighbouring content.

The move that works: express the rail's position as a `max()` of the *old literal* and the
marker's own reach. A marker can then only ever push the rail outward, never pull it in, and
every case that already fit the literal computes exactly what it computed before. That turns a
frightening geometry change into one with a provable no-op branch — and it is worth proving by
measurement rather than arithmetic, because the claim "nothing else moved" is the whole licence
for making the change at all.

Where the marker's size is retuned by a density/size axis, accept explicitly that the axis now
moves the rail for that marker kind, and say so where the old prose claimed it never did. The
alternative — reserving the big marker's room in every instance — silently moves the layout for
every consumer who never used the feature.

## `:has()` takes its most specific argument's specificity

Escalating rules that each state "how far my marker kind reaches" are a clean way to let one
derivation serve several cases. The trap: `:has()` contributes the specificity of its *most
specific* argument, so a plainly-written selector for the important case can silently lose to a
more deeply-written selector for a less important one, and the wrong reservation wins whenever
both match. Write the competing `:has()` rules to **equal** specificity — padding one with a
redundant descendant if needed — so **source order** is the tiebreak, and leave a note saying
that is deliberate. Otherwise the next person simplifies the "redundant" part and silently
inverts the precedence.

## Reserve the cue's space unconditionally

An emphasis cue that adds size — a ring, a thicker edge — must have its space reserved whether or
not anything is currently emphasised. Reserve it only when the cue is present and turning it on
shifts every sibling's layout, which reads as a bug in the *other* rows. Prefer a cue drawn with
something that costs no layout at all (an outer shadow rather than width/height) so the reserve
is a constant rather than a second conditional branch.

## A geometry probe has to know which side it is measuring

An automated "does this collide?" check that measures one fixed pair of edges will lie about any
layout that mirrors or alternates. A card that sits on the *other* side of the rail reads as a
massively negative gap, and the probe cries collision where there is ample air. Measure to
whichever edge actually faces the thing, and treat a surprising collision report as a suspect
probe until the layout is confirmed — a false alarm here costs a real fix being reverted.

## A decoration on a surface should inherit the surface's paint, not get its own token

A pointer, a tail, a notch — anything drawn *as part of* another element's outline — must take
its fill and border from that element, with `background-color: inherit` and `border: inherit`,
rather than from a variable of its own. A separate variable is a second writer for a value the
surface already publishes, so a caller can set one and not the other and get a shape in a colour
the surface no longer uses. Inheriting also carries a consumer's own background or border
utility on the surface to the decoration for free, and it is the only version that survives
forced colours: the substituted system colours are computed on parent and child alike, so the
decoration stays a continuation of the outline instead of a block painted in a colour the
palette no longer contains.

Size and shape are the opposite case, and belong in a class rather than a token wherever the
positioning code *measures* the element — then a caller's `size-*` stays correctly seated,
because the measurement is taken after their class applies.

## A rotated square is a triangle, and rotation moves which borders you want

The standard pointer is a square turned 45°, half of it pushed past the surface's edge: the two
edges facing outward continue the surface's border, and the fill covers the border segment
behind it, so the outline reads as one shape with a mouth. Two things bite. The two edges you
want are **not** the two facing the same way before rotation — after 45° the box's *top* and
*left* edges are the two upper ones — so the "zero these two widths" map has to be derived, not
guessed. And an absolutely-positioned child is laid out against the **padding** box, so pinning
it to the surface's edge with `inset: 0` puts it a border-width inside; a percentage `translate`
of the element's own box is what keeps the overlap correct at any size the caller chooses.

## Depth is a signal that scales with area; a marker is not

Reaching one rung deeper to separate a region from its neighbour is correct reasoning applied at
the wrong scale when the region is large. Contrast chosen while looking at a single row reads as
weight once the same fill covers the widest, tallest block the component draws, and the deepest
rung under the biggest area makes that region the heaviest thing on the page regardless of how
little it matters. Ask what fraction of the viewport a fill will occupy before picking its rung,
and treat "it must not be confused with its neighbour" as a question about *which channel*
carries the distinction, not about how far down the ladder to go.

A leading marker costs the same at any size, which is what makes it the right channel here. It
also does not depend on the gap between two rungs, so it holds up in a theme whose surface ladder
is tightly spaced or whose lower rungs carry chroma — a fill that reads as a gentle recess in a
neutral ladder reads as a coloured slab in a saturated one, and the distance between rungs is
exactly the thing a consumer's theme is free to change. Prefer the marker, keep the fill level
with the neighbour it must not be confused with, and the distinction survives a ladder you never
saw.

Two related traps. Give a second state's marker a *different colour role* rather than reusing the
one an existing state owns, or the two become indistinguishable wherever a component can be in
both at once — the structural neutral is usually the free slot, since accent is normally already
spoken for by selection. And paint the marker as a background-image while the fill stays a
background-color: different properties compose on one element, so a caller overriding the fill
through a slot keeps the marker, which is the behaviour you want because the marker is
structure and the fill is decoration.

## An inline style written by a positioning library cannot be overridden by any class

Where a hook writes a property inline — a transition duration, a transform — that property is
unreachable from CSS at every layer, so a utility for it is silently dead whether it arrives by
`className`, by a slot, or from a stylesheet. Do not ship a slot or document an override that
lands on such a property. Split the element's inline surface deliberately: only genuinely
measured, per-instance geometry goes inline, and everything a caller might reasonably vary stays
in a class where their utility can still out-rank it.

## A cue that is motion: what re-fires it, and which properties can carry it

Two things decide whether a state change animates correctly, and neither is about the easing.

**A CSS animation restarts when it is applied to a *new* element, never when a second selector
applies the same `animation-name` to the element already carrying it.** So keying the animation
on a state attribute — `[data-status="done"] .glyph { animation: … }` — fires once and then goes
quiet for the rest of the flow, because the name is already in the computed value by the time the
next state arrives. Giving each state its own copy of the keyframes works and is a duplication
you then own forever. Re-keying the element on the state in React is one prop, restarts on every
change including a reversal, and puts the restart where the state lives. It has one cost worth
stating in the docs: it remounts whatever the caller passed as content, so content holding its own
state is reset. Key the smallest node that carries the animation — keying an interactive ancestor
rebuilds it under the user's focus.

**Not every property in a state recipe can be transitioned, and the one that cannot is the one
that reads as a defect.** A cue that is a *single device pixel* — a ring one pixel heavier, a
divider one pixel thicker — cannot be drawn fractionally on a rounded element at 1x DPR. The
browser holds the old value for the whole duration and flips it in the final frame, so listing it
in `transition-property` does not smooth it; it *delays* it, and lands the jump after every
colour has settled and the eye is back at rest. Leave such a property out of the list. It then
changes at t=0, under the cover of the motion that is starting, and the cue arrives when it is
supposed to — which is also what a width cue is *for*, since it exists to survive greyscale.
The general form: transition what has continuous intermediate values, and let the quantised
part of a recipe land at once.

Both are invisible to every gate in this package, and to a screenshot of the start or the end
state. Only a frame *between* them shows either one.

## Removing decoration removes whatever was leaning on it

A prop that lets a caller take chrome away — a frame, a fill, a rule — has to be read twice:
once for what the decoration *looked* like, and once for what else was quietly using it. The
case that nearly shipped: a table's header fill is decoration, but a **pinned** header is
`position: sticky`, out of flow over rows that keep painting, and the fill is the only thing
making it opaque. Take it away for the lighter look and the data scrolls visibly through the
column labels — a correctness defect introduced by a taste prop.

The fix is not to refuse the removal; it is to supply the mechanism separately, and only where
the mechanism is actually needed — the header takes a fill back **when pinned** and nothing at
all otherwise, because an unconditional fill is the band coming back.

**But the first answer to "supply it separately" was wrong, and the way it was wrong is the
real lesson.** The obvious replacement was the table's *own* background: opaque, yet the same
colour as what sits behind it, so the head still reads as unfilled. It satisfied the stated
requirement exactly and was still a defect, because the decoration had been carrying a *second*
job nobody had enumerated. Under `border-collapse` a browser paints collapsed borders with the
table, not with the row group, so a pinned head translates away from its own rule — measured
gone in both Chromium and Firefox. The old fill had been hiding that for years. Replacing it
with a same-colour fill produced a header measuring 1.00:1 against the rows it floated over:
opaque, and invisible.

So the question is not "what was this decoration doing?" but "what *else* was it doing?" — and
it is answered by rendering the thing in a browser and looking, not by reasoning about the
class list. Every gate in this package was green across that whole mistake, and jsdom cannot
see any of it: `toHaveClass("bg-surface-0")` passes just as happily on a header that has
vanished into its own data.

Generalise it as a question to ask of every "less of this" prop: **for each thing being
removed, is it load-bearing anywhere, under any other prop's value?** Layering, opacity,
hit-testing and scroll containment are where the answers hide, and none of them is visible in
a screenshot of the default state. The wrapper's `relative` in the same component is the same
lesson learned the hard way once already — which is why it is deliberately kept out of the
per-value map, where no value can reach it.
