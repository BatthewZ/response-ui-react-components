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
> see `PHASE3-PATTERN.md`. **The two sub-rules at the end of this section survive the change
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
