# Memory — `@batthewz/response-ui-react-components`

Lessons from previous passes on this package, kept because they cost real time and none are
obvious in advance.

**Not a bug tracker and not a TODO list.** If a line here is *status*, it has decayed — delete it.
Each spoke is self-contained: no lesson should require opening another file to understand.

**Four homes, and the question that picks one.** Getting this wrong is how the same claim ended up
in three places, disagreeing:

| Home | Ask |
| --- | --- |
| `AGENTS.md` / `CONTRIBUTING.md` | *Must someone follow this?* — rules and conventions, and they ship |
| **here** | *Is it generalisable, and would you otherwise repeat the mistake?* |
| `../bugs/` | *Could a user notice it, or is it a gap in the checking?* |
| `../docs/project-docs/` | *Would someone re-derive this at cost, and is it too specific to be a rule or a lesson?* |

A lesson belongs here; the measurement it rests on belongs in `../docs/project-docs/`. Keep the
lesson readable without the measurement, and cite rather than restate.

| Spoke                      | The lesson                                                  |
| -------------------------- | ------------------------------------------------------------ |
| [traps.md](./traps.md)     | What every fix pass so far got wrong. Read before planning — including why state derived during render tears when React replays it, why a motion defect can be invisible to the DOM, the computed style and the suite at once, why a scroll container that is not a containing block leaks its contents into the consumer's page, why an exit animation that looks finished still leaves a hole in the layout, and why a panel that jsdom says is visible and clickable can be neither, why a measuring harness that answers a nearby question is indistinguishable from one that answers yours, and why an alias token declared at `:root` silently stops tracking its own upstream under a theme scoped to a subtree. |
| [state.md](./state.md)     | Where one fact ends up stored twice, and which copies are deliberate — including how a downstream generator constrains the WAY you deduplicate a union but not whether, and how an unverified 'this duplication is deliberate' comment defended a copy-paste from inside a public API doc. |
| [gates.md](./gates.md)     | What a green gate does *not* mean.                           |
| [ledger.md](./ledger.md)   | How a written record goes wrong, and which errors are worst. |
| [testing.md](./testing.md) | Ways a test here passes for the wrong reason.                |
| [history.md](./history.md) | Why an inherited claim is worth less than you think.         |
| [example-themes.md](./example-themes.md) | How sample data becomes API without anyone deciding to, and the one test that catches it. |
| [affordances.md](./affordances.md) | Adding a visual cue or an override hook: why a slot `className` only looks like it works, how to read a "the library overwrote my class" report, how to move a rail without moving everyone's, why depth is the wrong channel on a large region, and what to check before letting a prop take decoration away, since layering and opacity lean on it invisibly. |
| [css-to-utilities.md](./css-to-utilities.md) | Moving a declaration out of a stylesheet into a class list: the emission order that makes every reset invert, which cascade inversions are real and which only look it, and the three quiet ways a vendor pseudo-element conversion goes wrong. |

## The short version

1. **Brief from source, never from a summary — including this one.** Every quantified claim in
   the first handover was inflated, one of a later brief's qualitative claims was *inverted*, and
   the document written to correct the first still staked four claims that adversarial
   verification refuted.
2. **No patch lands without a check observed failing first**, and re-break it once after green.
3. **Measure, don't reason** — including measuring whether a change is even *reachable*. One
   refutation collapsed on a stale comment in this repo's own CSS; one proposed safeguard was
   dropped after a probe showed it could never fire.
4. **Refuting a finding is a full outcome** — but write it into the record, not the commit body.
5. **A claim that counts instances instead of naming them cannot be audited** — and a *rule* stated
   as a count rather than a criterion cannot decide its own lists. Where a rule ships beside worked
   examples and the two disagree, the examples are usually right; fix the rule.
6. **Scope is this package only** — not the CSS package, not the tailwind-merge package, *not
   even to add a script*. That boundary was crossed once and reverted in full.
7. **Documentation that contradicts your diff is a refutation, not staleness.** One pass called a
   documented decision "drift", changed it, and deleted the eight sentences that said otherwise;
   the gates stayed green and the owner reversed the whole thing. Answer the prose or leave it
   standing.
8. **Green gates cannot see a promise the code stopped keeping.** The example themes became
   load-bearing across several releases with every gate green, because no gate could observe
   "the README advertises something a consumer no longer gets". When the thing at risk is a
   claim rather than a behaviour, write the gate that asserts the claim.
9. **A new layout axis belongs on the root element, as an attribute the stylesheet descends to
   find — never as a value threaded to each child.** One writer cannot disagree with itself; two
   derivations of one fact eventually will. Prefer variants that assign only custom properties,
   keep the geometry everything else is measured against out of the variant's reach, and check
   what a prop name already means in this library before spending it.
10. **Ask whether the decoration can even reach the effect before promising the effect.** A
   focus indicator shaped like the control, on a control the engine paints, is not available at
   any price short of taking the painting over — and taking it over means owning every state the
   engine was covering, including the high-contrast one. Measure reachability first; the design
   question is only worth debating once you know what it costs.

11. **A theme can change a component's *shape*, not just its palette — so an emphasis cue tuned
   in one theme is miscalibrated in another for a structural reason.** Where the brand fill sits
   near the surface, a filled chip renders as a ring instead, and a component whose markers were
   discs becomes a family of rings. Weight, contrast and hierarchy all re-rank. Check a visual
   cue against a theme of each polarity *and* each fill behaviour; the polarity is the obvious
   variable and the fill behaviour is not.
12. **A reset cannot be transposed into a class list, and the reason generalises past resets.**
   Tailwind emits arbitrary-property utilities after every *bare* named utility in
   `@layer utilities` — **not last overall: variant utilities still sort after them, and still
   out-rank them on specificity.** So `[all:unset]` and `[font:inherit]` beat `p-4` and beat the
   caller's `className`, which is the inversion that matters: declarations correct in a rule
   *precisely because they come first and everything after rebuilds the control* end up wiping
   what they were meant to precede and beating the caller they were meant to lose to. The half
   the over-broad phrasing hid is useful too — a `data-[side=top]:border-r-0` emits after
   `[border:inherit]` **and** out-ranks it at 0,2,0, so a variant-scoped conversion sitting on
   top of an unconverted reset is safe. Measured on five disjoint sets of stylesheets, and it is
   the single fact that decides most "can this file go?" questions. The general form: **ask what
   a declaration's correctness depends on, not just what property it sets.** Where it depends on
   source order within a rule, a class list cannot hold it. [css-to-utilities.md](./css-to-utilities.md)

13. **Measurement is not transitive to the sentence beside it.** A well-measured record can carry
   an unmeasured rationale, and the rationale is usually the part that sized the change. Rigour
   in a row is a reason to check *which claim* the evidence bears on, not a reason to stop.

14. **When a contracted token is unusable in the role the contract gives it, suspect the token
   before rewriting its consumers.** Cards were moved off the raised rung because that rung was
   byte-identical to the page canvas and left them with no boundary — a real defect, fixed in the
   wrong layer, and it cost every card in the library its intended colour. The tell is that the
   fix makes the component look *worse* in order to satisfy a rule. A rule that can only be
   obeyed by degrading the thing it governs is usually the part that is wrong.

15. **A per-component specimen and a whole assembled page are disjoint gates, and only the second
   one can see composition.** Building one realistic page out of the library found a compound
   component that unmounts itself for good when its children are collapsed to the active one, and
   a `className` cap that silently loses to the component's own unlayered CSS. Neither is visible
   in a tile, because a tile has one panel, never switches it, never caps it, and never stands it
   in a stretched cell beside a taller neighbour. When a change is to how components *fit
   together*, a green per-component suite is not evidence about it either way.

16. **A defect that lives in the paint is invisible to the entire suite, and the computed styles
   will agree with you.** A stroke effect that fragmented a chart's line survived a full green
   run, a clean typecheck, and every gate — and when probed, its animation name, dash array and
   finished play-state all read exactly as an assertion would want them. Nothing in the DOM was
   wrong; only the rendering was. Where a change is to geometry, paint or motion, the browser is
   not a nicer way to check the tests — it is the only instrument that can see the failure at
   all. Screenshot it before calling it done, and re-screenshot after a stylesheet edit, because
   a stale hot reload will happily show you the old pixels.
17. **Two defects here were shipped and then written up as Gotchas, which is what preserved
   them.** Prose describing a footgun reads as a decision, and the next reader — human or agent —
   treats the workaround as the API. §7 above still holds: answer the documentation rather than
   quietly deleting it. But "it is documented" is evidence that somebody noticed, not evidence
   that it is right, and a default needing an opt-in to be correct is the wrong default.

18. **A plan can be rich in evidence and still unfalsifiable, and that is the more expensive
   failure.** One pass kept visible retractions, demoted its own audit's confidence in writing, and
   closed its first phase on two refutations — while having declined the single measurement that could
   have produced a *new* refutation. The objection to that instrument was valid for a different
   question: an argument about screenshot flake was used against a question that was purely about
   computed style. Before trusting your own rigour, ask what result would change your mind and whether
   anything you have built could produce it. See [gates.md](./gates.md).
19. **Fanning work out to more readers finds more things and makes claims no safer.** A four-way
   parallel survey produced the sharpest findings of a pass — and most of its inflated numbers. Counts
   arrived precise-looking and were repeated as support without being re-derived, including counts the
   coordinator had run itself and not filtered to production code. §12 is the specific mechanism;
   the scale-up is what makes it likely. Re-measure anything you are about to lean on, especially
   when it came back looking exact.

20. **Cite the command, not the constant — and if a count depends on how you count, say how.** A
   plan proved a load-bearing claim with byte offsets into compiled CSS; the claim survived
   re-checking and every number did not, because the build moves them. Elsewhere in the same
   document a lane-sizing figure ("67 test files") matched no method out of seven, which spanned
   34–99, and a component denominator (~155) was unreachable under every reading — the ceiling was
   105. Numbers arrive precise-looking and get repeated as support; a number nobody can recompute is
   not evidence. See [ledger.md](./ledger.md).
21. **Preserving refutations in place is right; fusing them into live prose is not.** Strike-in-place
   worked until a document needed a separate briefing to explain which of its own sentences to
   distrust. Keep the plan current-truth-only and imperative, and give refuted claims a *settled, do
   not re-derive* section. Nothing is lost and nothing is re-derived, but the reader stops needing a
   guide. A corollary that is easy to miss: if a refutation already lives somewhere authoritative
   (the findings archive), the plan restating it is a second source of truth, not diligence.

22. **When a precedence premise flips, every sentence resting on it is refuted at once — and they
   are almost all "cannot" sentences.** Moving this package's CSS into `@layer components`
   falsified one clause in **20 component doc pages**, and every one of them was a *false cannot*:
   "a `className` cannot re-space it", "a padding utility never wins here, at any size", "use the
   important modifier". Those are the worst doc-rot shape (§16) because they steer people away
   from something that now works, and they read as authoritative while doing it. Two things follow.
   A one-line change to a stylesheet's *registration* can be a larger documentation change than a
   feature. And the sweep is findable: the pages all named the mechanism (`unlayered`), so one grep
   enumerated them — if a mechanism is documented by name, the name is the sweep.
23. **Deleting the losing declaration beats out-ranking it, and it is usually also the smaller
   diff.** Every fix in this pass that stopped a collision rather than winning one came out
   better: `Timeline` stopped emitting the foundation entrance class and gained a consumer
   override it never had; `Stagger` stopped duplicating a foundation rule and its own stylesheet
   disappeared; the outline reset stood down in forced colours instead of being beaten with
   `!important`; `Tabs` deleted three declarations that could not win. Reach for "who else is
   writing this property, and can we stop" before reaching for precedence. The corollary: **an
   accepted regression and a live rule cannot coexist.** If a rule can never win again, accepting
   the outcome means deleting the rule — leaving it in place is dead CSS that looks live, which is
   what the next reader will "fix".
24. **A public `data-*` is the cheapest way to publish a state a stylesheet needs, and it survives
   layering.** A class the foundation owns cannot be re-pointed from a layered stylesheet at any
   specificity; an attribute this package emits can be keyed on freely. The rule that mattered was
   never about the class — it was about the *interval* the class marked, and an attribute marks
   the interval without borrowing anyone's vocabulary. It is also visible to jsdom, so the
   invariant became assertable in the test suite for the first time.
25. **Tailwind cannot see a class name your code builds, so replacing a CSS scale with utilities
   forces the scale into the type system — and that is the win, not the tax.** A component that
   pushed `` `prefix--${breakpoint}-${count}` `` into an array generated nothing at all once the
   stylesheet was deleted, because Tailwind finds candidates by scanning source *text*. There is
   no map to swap; the lookup table has to be written out, one literal per cell, which means the
   prop can only accept the counts the table has. The unbounded `number` it replaces was already
   lying: an out-of-range count emitted a class no rule defined and the layout fell back through
   a `var()` default with no error at compile time or runtime. Draw the bound from the scale the
   deleted stylesheet actually shipped rather than inventing one, and expect two sibling
   components to disagree about the bound — that disagreement was already in the CSS. Share the
   loop and the breakpoint vocabulary between such siblings, never the table: the loop carries a
   subtle invariant (the base step is always emitted, and a count of `1` is a real answer, not a
   falsy one) that is wrong to state twice, while the table has to stay written out in the
   component whose utility prefix it names.

26. **A triage that mostly returns "not a gap" is a triage working, not a lane slacking.** The
   reference component for the override API had eight internal elements carrying a class literal
   and produced **one** override slot: the rest were either already reachable, or genuinely
   correct as bare static classes — a visually-hidden twin whose only class *is* the mechanism, a
   wrapper whose one declaration means nothing outside its parent's flex context, four chart
   internals whose one variable property is a token. The pressure runs the other way from what it
   looks like: a slot invented for a non-gap lands in permanent public API, while a slot missed is
   a later addition. So the deliverable of a triage is the **annotation** — the letter and the
   reason, written at the element — not the slot count. Without it the next reader cannot tell a
   ruling from an oversight, and re-runs the whole judgement.
27. **A props hatch is for a component with *no* prop route, and a pass-through wrapper is not
   that.** Where a wrapper's public props already *are* the inner component's
   (`X & ComponentProps<typeof Inner>`, spread through), adding a `<thing>Props` bag creates a
   second writer rather than a first one — the exact single-source-of-truth violation the hatch
   pattern exists to avoid elsewhere. The one-line test before adding one: *can the caller already
   reach the inner component's `className` through the wrapper's own props?* Two entries on a
   frozen anatomy list here were grouped as the same shape and were not; the difference was
   visible only in the props type, never in the JSX.
28. **A custom property's default belongs anywhere but the element that reads it.** A component
   declaring its own fallback on its own root (`.thing { --thing-color: currentColor }`) makes a
   consumer theme setting that variable at `:root` lose **permanently** — declarations on an
   element beat inherited ones at every cascade layer, so moving the stylesheet into a layer does
   not touch this. Where every read already carries `var(--x, fallback)`, deleting the declaration
   is byte-identical for anyone who sets nothing and restores the whole theming route for anyone
   who does. Two shipped instances were documented as limitations before anyone noticed they were
   deletable — and none of it is testable here, because the suite stubs CSS to `""` and a
   layering A/B reads the same on both sides, so the honest record says *uncovered* rather than
   letting a green run imply coverage.

29. **A source annotation meant for a future gate has to be validated against the parser, not the
   prose — and the prose will be wrong.** A convention written as "a comment on the line before X"
   read to a human as obvious and to `getLeadingCommentRanges` as something else: the real rule is
   that the comment must *begin a line*, so a same-line comment is invisible while a comment
   sharing a line with the thing it annotates is not. Both readings of the prose were wrong, in
   opposite directions, and only running the parse found it. Write the fixture of forms a
   contributor will actually produce — collapsed onto one line, above the element instead of
   inside the tag, attached to the neighbouring attribute — and record which are seen.
30. **A cheap reachability check is a name match, and its failures are the interesting half.** A
   gate that asks "does a caller's class flow to this element" by looking for the identifier at
   the attribute is small, allowlist-free, and worth having — but it reports a false alarm for
   every correct-but-indirect form (the merge hoisted into a local, the value destructured first,
   a leaf naming the parameter something else) and passes silently when an unrelated local happens
   to carry the identifier's name. Neither is a bug to regex around: the false alarms are the gate
   asking for the house form, and widening it is how a gate acquires the allowlist it was designed
   not to need. State the blind spots beside the gate; a check described as one that "cannot be
   satisfied by a lie" almost always can be, and the claim is what stops anyone looking.

31. **When a stylesheet has no owning component, name the file after the component that renders
   its markup — and expect a gate to have been leaning on the old name.** A sheet named after the
   most visible *consumer* rather than the base component whose elements it paints is invisible
   ownership: nothing imports it but the aggregate stylesheet, and the two components that look
   like they own it render none of its selectors. The rename is cheap; what is not is that a
   doc-token gate had modelled "a component's CSS" as strictly `X.css` beside `X.tsx`, because
   until then no counter-example existed. Its own docblock already said a component's vocabulary
   may live one same-directory hop away — the CSS half of that rule simply had never been
   written. Extending it there is the repair; leaving it makes the gate silently **blind** for the
   whole family rather than strict, which is the worse failure and the one nothing reports.
32. **Where four components consume one base component's anatomy, the slot union belongs to the
   base and is aliased, not re-spelled.** The rule that a slot union is written inline per
   component protects two things — an unknown key is a type error, and known keys autocomplete —
   and a single exported alias preserves both while four copies of a fifteen-member union do not.
   Read "inline" as "written out as a literal union exactly once, where the element tree is", not
   as "textually duplicated at every prop that forwards it".
33. **A companion test that asserts the same thing as the override test is not a companion.** The
   per-slot falsifier's signal is *one* test reddening; two means a companion is duplicating the
   override assertion and the extra red says nothing. Two written to guard behavioural marker
   classes did exactly that by asserting the slot landed — the fix is to assert only what they
   exist for (the marker still resolves by selector; arrow-key focus still moves), so they redden
   when the base class is dropped and stay green when the merge is.
34. **A loop-generated element can take a class slot *and* a content render prop without being two
   writers.** The one-writer rule bites when two APIs address the same *concern*; a slot that
   appends to the button's class and a render prop that supplies the button's children do not.
   What makes it safe is the render prop rendering *inside* the element rather than replacing it —
   the class, the `data-*` state and the roving tab stop stay the component's, which matters most
   where the element is also found by `querySelector` for focus management. A render prop that
   returned the whole element would break exactly that and look identical in review.
35. **A bug-ledger anchor whose code merely moved is not what `--reanchor` always does.** The tool
   relocates by searching for the stored fingerprint; when the anchored line was itself edited the
   search finds nothing and it **restamps in place**, silently re-pointing the row at whatever now
   occupies that line number. It says so — "RE-VERIFY BY HAND" — and the gate then passes. Move
   the line number to where the described code actually went *first*, then restamp.
36. **Where a frozen table and a house rule disagree about one element, shipping neither is the
   reversible move — and the annotation is what makes that a ruling rather than an oversight.**
   Three form controls put a caller's `className` on the inner control while an unreachable
   positioning box sits outside it. One document granted that box an override key; another said
   to re-point `className` to it instead. The two end-states are mutually exclusive: ship the
   key and the later re-point has to withdraw public API; re-point now and three documented
   prop contracts break inside a phase billed as purely additive. Adding is cheaper than
   removing, and a comment is cheaper than either — so the box got its triage letter and its
   reason at the element, and the conflict went to the owner named. The general form: when two
   authorities disagree, ask which choice the *other* one can still be taken from, and take
   that one.
37. **A frozen vocabulary is a name list, not a work order, and it will be under-enumerated in
   both directions.** The form family's table granted a component a key for an element that
   already had a route (two writers), and omitted a key for one that had none — the same table,
   the same pass. It also miscounted a component's own triage by one, because a pair of
   visually-hidden inputs read as "no route" when their whole class *is* the mechanism. Take
   the *names* from the frozen list and re-derive the *elements* at source every time; a row
   citing `file:line` is a claim about a file that has since moved.
38. **A props hatch beats a class slot exactly when the target carries none of the wrapper's
   own classes.** A chip rendered as a bare `Badge` has no base class for a slot to merge with,
   so a slot would reach only `className` while the thing callers actually want is the variant —
   and the prescription to invent a marker class for it to merge against was refuted by the
   component's own test, which deliberately asserts the chip adds nothing at all. Spread the bag
   and set back, after it, only the one prop the component owns (here `role`, because the
   surrounding `list` accepts nothing else as a child). Assert both directions: the caller's
   class arrives, and the owned prop survives a bag that tries to change it.
39. **The scanner that polices `Omit` cannot tell a nested prop bag from a component's own props
   type, and every new `<thing>Props` hatch will trip it.** Two entries already sat in its
   allowlist for exactly that shape before a third arrived. Adding one is the documented
   resolution rather than a suppression — but the argument has to say why the key is inert at
   the element, not merely that the finding is a false positive, or the allowlist becomes the
   place findings go to be forgotten.

51. **A generalisation with exactly one value is usually also already violated, and the violation
   is the cheaper evidence.** A shared prefix parameter that both of its two consumers set to the
   same string looks like harmless flexibility; what proved it wrong was that one consumer had
   quietly hardcoded a *different* name for one element, and that name had no stylesheet behind
   it. So the parameter was not buying variation — it was hiding a component styled entirely
   through another component's class names, plus one class that painted nothing. Deleting the
   parameter was smaller than fixing either symptom. When a knob has one setting, look for where
   somebody went around it rather than arguing about the knob.
52. **A class name built by template concatenation is invisible to every static reader you have,
   including your own gates.** Tailwind's scanner cannot see it, a reachability check cannot see
   it, and the one gate that *did* resolve it needed a whole identifier-to-literal fixpoint
   resolver to do so — machinery whose docblock then cited a shape that no longer exists. Static
   names cost nothing and delete the machinery's reason to be trusted. Check what your gates said
   about the code you are deleting; a gate's comments rot exactly like a doc's.
53. **`toContain` on markup cannot prove a class *rename*, because the old name usually contains
   the new one.** `dropdown-menu-content` contains `menu-content`, so the substring assertion that
   was supposed to prove the rename stayed green with the old class still emitted — found only by
   running the falsifier. Assert with a class selector (`querySelectorAll(".menu-content")`),
   which matches whole tokens, and for the negative direction use `[class*="old-prefix"]`.
54. **Splitting a stylesheet beats renaming it when its selectors have two different owners.**
   §30 says to name a sheet after the component that renders its markup — but where a sheet holds
   both a shared internal module's classes *and* one consumer's own, either name is wrong for half
   the file. Two sheets, each beside the module that renders it, is one added import line and
   leaves nothing misfiled; the aggregate stylesheet's import count is a report, not a contract.
55. **A slot key for a marker whose emphasis cue is a token pair plus a private width is a
   route back to the defect the width prevents — unless the element is also a container.**
   Two components put their marker's fill and ink in public custom properties and kept the
   ring width private, so one write reaches every marker and nobody can reduce the cue to
   colour. Both markers therefore get no key. The one exception is the variant that *wraps a
   caller's glyph*: the consumer sizing their own icon has nothing else to reach, so the
   wrapper takes a key while the bare disc beside it does not. Say in the docs that a
   background set there re-tints the disc but not the ring, or the exception quietly becomes
   the defect.
56. **One key can cover an element the component renders in two different tags, and must,
   whenever the *component* picks the tag.** A step's marker is a `<button>` where the root
   decided the step is navigable and a `<span>` where it did not. Splitting that into two keys
   hands the caller a class that vanishes on a decision they did not make; one key, asserted
   in a test that renders both forms at once, is the shape.
57. **Where one class sits on N structurally different controls, the slot count is N, not
   one.** Four paginator controls shared a class; four `aria-label`s already named four roles.
   A single key cannot express "hide the edge jumps but keep the steps", which is exactly the
   override the component's own conditional rendering leaves you wanting. Count roles, not
   class literals.
58. **A `<thing>Props` bag and a class slot are not interchangeable, and the discriminator is
   whether the wrapper put its own classes on the target.** Where the wrapper does — the
   utilities that keep a nested control's hover off the surrounding tint — a slot has a base
   class to merge with and is right; a bag would additionally hand the caller a handler the
   wrapper owns. Where it does not, the bag is right (§37). Two documents disagreed about one
   such target and this is what settled it.
59. **The fail-on-purpose run is cheap enough to automate, and automating it is what found the
   two duplicating companions.** A ~40-line throwaway that deletes one slot's merge by regex,
   runs that component's test file, reads the failure tally and restores, gave 51 verdicts in
   one pass. Two came back `2 failed` — both companions asserting the slot landed *and* that a
   variant modifier survived. Folding the modifier assertion into the override test leaves one
   test per slot with strictly more coverage. Doing this by hand, you stop reading the tally
   after the first few.
60. **A prescribed footgun fix can collide with a documented escape hatch, and the collision
   is a finding rather than a licence.** Swapping an always-emitted inline `width: 100%`
   default for a base utility does make a caller's width class win — and it also breaks
   `style={{ width: undefined }}`, which that component's own Gotchas document as *the* way to
   drop the inline width. Distinguishing the two needs `"width" in style`, which is the adapter
   shape rule 3 forbids. Report the collision; do not ship the half that looks like the fix.
61. **A frozen vocabulary can omit an element that is genuinely (a), and the omission reads
   like a gap.** A row's content column had no key in its family table; at source its whole
   stylesheet contribution was `min-width: 0`, the declaration that lets text wrap inside a
   grid track instead of widening it. That is the class *being* the mechanism, so the absence
   was right — but only reading the CSS proves it. Re-derive the elements, then check the
   table, never the reverse.
62. **Repointing a ledger anchor after a purely additive edit is a two-command job and the
   fingerprint proves it.** Find the described line by its text in the new file, write that
   number into the row, and the stored fingerprint validates unchanged — because it is a hash
   of the line's content, not of its position. If it does not validate, the code did not merely
   move and the row needs re-reading.
63. **A frozen anatomy row can name the right element with the wrong word, and the doc page is
   where that shows.** One row called an element "the camera badge"; the component's own
   comment, and every sentence on its doc page, called it the overlay — and "a darkening layer
   over a sibling" was already a cross-family name two other components spend. Take the
   *concept* to the cross-family table before taking the family row's word, because a
   family-local synonym for a shared concept is the exact failure the shared table exists to
   stop, and a slot key is permanent on first ship.
64. **The tell that a frozen row is over-enumerated is that the element is already reachable.**
   A table granted a key for a surface whose own subcomponent `className` lands on it in both
   of its two rendering branches; shipping the key would have been a second writer. Render with
   a caller class and read the class list before writing any key — the frozen list says which
   *name*, never that a gap exists.
65. **A state modifier is worth mirroring as `data-*`, and it is not a slot.** Six root
   modifier classes gave a consumer stylesheet a hook but gave `className` nothing, because a
   variant cannot key off a class the component writes. Emitting `data-<state>` beside each
   modifier turns every one of them into a `data-drag-over:` variant on the prop that already
   reaches the element, at no cost to the existing hook — cheaper and smaller than any slot,
   and it composes with utilities the component never declared.
66. **Where one slot key addresses two elements, assert it in one test, not two.** The
   per-slot falsifier wants exactly one red per merge; a key covering both a media grid and a
   row list, or a message in two states, reddens once per test that touches it. Render both
   elements inside a single test — several files at once, or two renders in one `it` — and the
   signal stays one red per defect. The same restructuring is what a companion asserting the
   marker class needs: assert the marker, never the slot.
67. **A tailwind-merge slot replaces its base class when they share a utility group, and the
   test has to expect it.** `cn("object-cover", "object-contain")` returns only the caller's,
   which is the capability — but a companion written as "base survives, slot arrives" fails on
   the base half for reasons that have nothing to do with the merge being wired up. Assert the
   part of the base class that is in a *different* group, and pin the replacement deliberately
   where it is the point.
68. **A render prop over an unpredictable dispatch has to hand over the branch it took.**
   Three private previews selected from the file list and a mode prop are exactly the shape a
   flat class map cannot serve — but a renderer that is told only "here is a file" cannot tell a
   lone large preview from one cell of a grid, and will guess. Pass the branch as a field. Pass
   the index into the *source* array too: a renderer invoked over a partitioned list sees
   positions that are not the ones the removal callback expects.


69. **A subcomponent can only ship for an element the root's own `className` does not
   already reach.** A ruling that a component "becomes a compound with `.Content`" has to be
   checked against which element `.Content` would name: where the root *is* the surface —
   a modal panel, not a floating child of one — `className` is already the single writer and
   a `.Content` beside it is the two-writers defect the subcomponent-or-slot rule exists to
   prevent. The asymmetry is in the anatomy, not in the ruling: a sibling whose surface is a
   separate portalled element takes the subcomponent, and the two look identical in a table.
70. **The arity of a compound's children function is derived from what the root must keep
   owning, not chosen for symmetry with a sibling.** Where the root owns a structural ARIA
   invariant — a listbox owning its options directly or through a `role="group"` that is
   itself a direct child — the consumer's authoring point is strictly *inside* a row, so the
   function is per-row. Where it owns no such tree, one whole-tree call is right. Copying the
   sibling's shape instead hands the consumer a scaffold they can break.
71. **The `className:` form inside a props-getter object is invisible to a reachability
   classifier in both directions, and the grep offered for finding it undercounts.** Matching
   only string-literal initialisers misses every `className: cn(…)`, which is what the form
   looks like once it *has* a route. Re-grep as `className:\s*(cn\(|")` and hand-triage; a
   green classifier says nothing about these sites either before or after the fix.
72. **Rename an exported type in the same change that already breaks the component.** Two
   names for one concept survive because each rename looks gratuitous on its own; once a
   component is being rewritten the rename is free, and once its data type has become a
   subcomponent's prop type it is not. Check the rename against the internals first — a data
   type and a subcomponent competing for one identifier is a signal to move the *component*
   name, since the exported one is the one consumers type.

73. **A default node a prop replaces outright is (a), not (e), and the discriminator is who
   computes the element.** Both read as "replaced wholesale", so the words in the letter table
   do not separate them. (e) is owed where the component still *builds* the subtree and
   dispatches over data no caller could reconstruct — it has to hand the renderer the branch it
   took. Where the prop simply swaps one node in, the caller supplies their own element with its
   own classes, so the library's class is a default rather than content anyone has to be handed,
   and no `render*` is owed. A whole default *branch* behind a fallback prop lands on the same
   side as a single default glyph, for the same reason.
74. **The loop test rules out a compound; it does not grant a slot.** A slot on every instance
   is structurally fine, so the loop test cannot be the whole argument. Ask what the
   per-instance class carries first: where it is the only channel distinguishing the instances —
   which of N repeated elements is filled, selected, past — a slot lands identically on all of
   them and a caller passing one conflicting utility collapses the distinction. tailwind-merge
   makes that collapse total and silent for that utility group, so the element is (a) however
   inviting the loop looks.
75. **Two components sharing a hoisted class constant do not thereby share a triage.** The
   constant travels; the element does not. Where a sibling has the same local and settles it
   (a), check which of its *uses* that ruling was written at — a component may use one constant
   at two elements with two different routes, and matching the neighbour by the constant's name
   copies the wrong half.
76. **A gate landing falsifies prose about the gate's absence, not only prose about its count.**
   The count is the easy half and the one everyone greps for. The expensive half is the
   paragraph explaining why the thing was deliberately *not* shipped, and the grammar the
   convention froze while it was still a proposal — both read as settled reasoning rather than
   as a dated status, and both are wrong the moment the script is in `package.json`. Search for
   the assertion of absence.

77. **Three elements one document rules identically, split across two lanes, will be settled two
   different ways — and both lanes will be green.** Each lane's gates only see its own files, so
   an element resolved by adding a route and its twin resolved by annotating the route away are
   locally consistent and globally a contradiction. The seam pass's first sweep is therefore not
   the vocabulary but the *dispositions*: group the diff's elements by the shared ruling that
   covers them, and read the group, never the file. The one that took the additive route is
   almost always right, because the other is a breaking change a lane had no standing to make and
   quietly declined to.
78. **The same construction written twice will disagree on spread order, and only one order is a
   bug.** Two sibling compounds built from one design put the consumer's prop bag on opposite
   sides of the attributes that constitute the element — `id`, `role`, `aria-*`. Spread last, a
   caller's `role` silently empties the widget of its own children; spread first, it cannot.
   Nothing types this, no gate sees it, and the component still renders, so the only instrument is
   reading the two siblings side by side. Write the invariants after the bag, always.
79. **A prop that names a row is an address, not a data channel — read the row back from your own
   list.** A compound that hands children its data and takes an entry back must look the entry up
   and use *its* copy, or a spread-and-edit at the call site writes state the component believes.
   The tell is a modality split: the click path reads the child's object and the keyboard path
   reads the source list, so the same widget accepts and refuses the same action depending on how
   it was triggered, and the accessibility tree reports the caller's answer to both.
80. **Guard the addresses symmetrically or not at all.** Where one part of a compound throws on an
   entry the root never produced and its sibling does not, the unguarded one is the whole hole —
   the design's single-writer claim is only as strong as its weakest part, and a reviewer reading
   the guarded one concludes the property holds.
81. **A cap, a filter and a label derived from the same list need three separate falsifiers, and
   the cap's is the one that will be missing.** A test that never narrows the list cannot tell a
   count of *data* from a count of *rendered nodes*, because while everything is mounted the two
   agree. Every such test will be written without a query in it. Filter first, then assert.
82. **Renumbering a document's `file:line` citations against `HEAD` is a defect; stating the
   commit they are anchored to is the fix.** Once a fan-out has touched fifty files, "two anchors
   rotted" is never the finding — all of them moved together, and repairing the two you were told
   about produces a document where two point at one tree and four hundred at another. Verify the
   anchors were right at their baseline before believing either story.

96. **Re-pointing `className` from an inner element to its wrapper silently moves every prop the
   two elements *share*, not just the class — the type checker carries only the difference.**
   Moving the rest bag with the class is still right, and it does turn the inner element's
   exclusive attributes into call-site errors: for an `<img>` inside a `<div>`, `loading`,
   `srcSet`, `sizes`, `decoding`, `fetchPriority`, `crossOrigin`, `referrerPolicy`, `useMap`,
   `width` and `height` all fail to compile. But the silent residue is the whole intersection, not
   the one prop you knew about — `className`, `style`, `ref`, `onLoad`/`onError` and
   `id`/`title`/`aria-*` keep compiling and now address the wrapper. **`ref` is the sharp one and
   no props type can close it**: a `Ref<HTMLImageElement>` type-checks against a
   `Ref<HTMLDivElement>` because `HTMLDivElement` adds only the deprecated `align` over
   `HTMLElement`, so the caller silently holds the wrong element and reads `undefined` off it.
   **Count the residue by compiling, never by reasoning** — a throwaway `.tsx` passing each shared
   prop at the top level, run through the project's own `tsc`, and the lines that *don't* error
   are the list. Then check what the survivors actually *do* before calling them broken: React
   attaches `load`/`error` listeners directly to the target element and dispatches up its own
   fiber tree, so a handler re-pointed to the wrapper still fires and only `event.currentTarget`
   changes. A migration note that says "those are loud" is a severity claim, and severity claims
   are the ones that dissolve. **Read the mechanism out of `react-dom`, not out of a plausible
   story about it** — "capture phase at the root container" was the explanation three files
   carried, and it is wrong: `listenToNonDelegatedEvent` registers under a `__bubble` key on the
   element. The behaviour was right and the reason was invented.
97. **A props hatch and a re-point are one change, not two.** Adding `<thing>Props` while the
   component's rest bag still lands on the same element gives that element two writers, which is
   the defect the hatch was supposed to close. The hatch is warranted only once the rest bag has
   moved somewhere else.
98. **An exact-string class assertion is how you keep a falsifier count honest.** Pinning
   `toBe("base modifier caller")` in one test covers arrival, survival and merge order at once; a
   second test asserting any of those separately makes one mutation redden two, and the fix is to
   delete the companion rather than to explain the pair.
99. **A gate's allowlist entry outlives the code its justification describes.** The argument in it
   is prose about a specific spread at a specific element; change that element and the entry goes
   quietly inert while still reading as current law. Re-run the gate after the change and delete
   any entry it no longer needs — an exemption nobody can falsify is worse than none.
100. **An inline *default* is a different defect from an inline *value*, and only the default is
   unfixable by layering.** A value the caller asked for should beat their class. A default they
   never asked for makes the override unreachable for everyone, and no cascade work reaches it —
   the fix is to move the default into the class list, where the merge helper *collapses* it
   against the caller's utility instead of racing it. Sort every "a class cannot beat this" claim
   by that distinction before reaching for `@layer`.
101. **Two geometry props where one is defaulted and one is not is an asymmetry the API cannot
   state.** One axis reachable from `className` and the other not, with nothing in the type
   saying which, is worse than both being closed: the caller's mental model is right half the
   time and there is no signal for the other half. Prefer both axes on the same mechanism.
102. **A width utility can look applied and still be geometrically wrong, and only a real engine
   sees it.** Aspect-ratio, `height: auto` and shrink-to-fit all consume the *computed* width, so
   moving a width from inline to a class can change a square into a zero-height bar with the
   class string still perfect. Class-string assertions prove the input to the cascade, never the
   outcome; keep a throwaway Tailwind + `getComputedStyle` fixture for the claim and delete it.
103. **"Shrink to fit" on an element with no visible content is 0px, and docs promise it anyway.**
   Before rewriting a passage that names an escape hatch, measure what the *old* hatch actually
   produced — the honest replacement is often "this never did what it said", and a doc that
   substitutes a new incantation for an old one inherits the original false promise.
104. **Relocating a shadowing custom property one element up does not unshadow it.** The rule is
   that a declaration on an element beats an inherited one from `:root` at any layer — and the
   root of the component is still an element the component renders, so the child inherits the
   component's value rather than the theme's and the consumer loses exactly as before. Moving a
   token only helps a consumer who selects the element it moved to. The fix that reaches `:root`
   is to stop declaring the token and let a utility *read* the contract variable, or to read it
   with the default in the `var()` fallback so nothing shadows.
105. **A token whose read site is a property is convertible; a token whose read site is another
   token's value is not.** The `calc()` carve-out is often quoted as "computed values are kept",
   which over-reads it — a `color-mix()` sitting inside a `background-image` has a property, so a
   utility can take the whole declaration and the token goes. What has no property is a value
   consumed by another custom property's definition. Ask where the read *lands*, not what
   function surrounds it.
106. **A raw-source assertion about a stylesheet is inert under vitest, and it passes.** `css:
   false` stubs every CSS module to `""`, so a static `?raw` import, `import.meta.glob(…,
   { query: "?raw" })` and a `*.css` glob all hand back the empty string and any `not.toMatch`
   over it is green against a file that still says the thing. `node:fs` is not the escape hatch
   either — `tsconfig.types` is an allowlist without `@types/node`, and `import.meta.url` is an
   http URL under jsdom. The raw-source trick works for `.tsx` and only for `.tsx`; for CSS the
   instrument is the cascade probe. Fail every new assertion on purpose, including the boring one.
107. **Tailwind's `bg-linear-to-*` is not a neutral spelling of `linear-gradient(90deg, …)`.** It
   emits `to right in oklab` behind an `@supports`, so converting a hand-written ramp to the
   gradient utilities silently changes the interpolation space and the midtones with it. An
   arbitrary `bg-[linear-gradient(…)]` reproduces the original exactly and, where a `color-mix()`
   is inside it, Tailwind adds a flat `@supports` fallback the hand-written rule never had. The
   oxide scanner extracts the whole bracketed value out of a `.tsx` string literal, including
   nested parens and commas — measured, and it also still cannot see a template literal.

108. **A wrapper cannot restyle the base component it renders from its own stylesheet.** Since the
   `@layer components` move, any property the base sets with a Tailwind utility is out of reach of
   a rule in this package's CSS, at any specificity — the rule parses, ships, and never applies.
   Restate it as a utility on the same element instead, where tailwind-merge *replaces* the base's
   class rather than leaving two writers to the cascade, and the caller's slot override still wins
   because it merges last. This shipped in SearchInput as a placeholder sitting under the search
   icon and a small size that was pixel-identical to the medium one, with every gate green, and
   with the docs asserting the opposite of the measurement. Prose about which declaration wins is
   a claim to re-measure, never a decision to trust.

109. **Prose an author cannot see the column of has to be allowed to break inside a word, and a
   scrollport is the exception rather than the rule.** A document carries runs no line break can
   fall inside — a scoped package name, a custom property, a bare URL — and left alone one sets
   its block's minimum width and scrolls the whole page sideways at a phone's width. Headings are
   the worst case, because a responsive type scale multiplies the run by the largest step in it,
   and they are also the case nobody tests: the same string is unremarkable at body size. Prefer
   `overflow-wrap: anywhere` over `break-word` — only `anywhere` lowers the min-content
   contribution, which is what lets the container shrink inside a flex or grid parent instead of
   pushing it wide, and in normal flow the two are indistinguishable. Do **not** extend it to
   anything that owns a scrollport: a table cell's long run should widen the table and let the
   wrapper scroll, and breaking the text there trades a scrollbar for a one-character column.

110. **A horizontal overflow inside a scroller is invisible to the usual measurement.** `overflow-y:
   auto` makes `overflow-x` compute to `auto` too, so a pane that scrolls vertically is a
   horizontal scrollport as well — and it absorbs the overflow, leaving
   `documentElement.scrollWidth === clientWidth` while the user is plainly dragging the content
   sideways. Measure the element that actually scrolls, and attribute the overflow by diffing
   `scrollWidth - clientWidth` per block with the candidate rule injected and removed: that names
   the one guilty block instead of the dozens of legitimately-wider descendants a naive
   right-edge scan returns, every one of which is scrolled content doing its job.

111. **Setting `display` on a `<dialog>` from anywhere — the component or a caller — unhides it
   while closed.** What hides one is `dialog:not([open]) { display: none }` in the user-agent
   sheet, and an author declaration beats the user agent at any specificity, so a single
   unqualified `flex` renders the panel in flow on the page, with no backdrop and no top layer,
   over whatever it lands on. Qualify it: the `open:` variant compiles to
   `:is([open], :popover-open, :open)`, so a closed panel matches nothing. The generalisation is
   worth more than the rule — styling a component's own root from the call site can defeat rules
   the component never wrote and cannot defend, and a dialog's are the browser's. It is also a
   bug that only exists in the state nobody looks at: every check of a panel you have just
   changed is a check of the open one.

112. **A modal panel taller than the viewport hides its own exits, and opening focus decides
   which end you land on.** Left as one scrolling block, the title that says what is being read
   scrolls away with every control that dismisses it — and because `showModal()` focuses the
   first focusable descendant, a dismissal placed at the end of the content also opens the panel
   at the end of the content. A column with the header and the actions pinned and one scrolling
   region between them fixes both, and the region needs `min-h-0`: a flex item's floor is its own
   content, so without it the region grows to fit and pushes the panel past the viewport instead
   of scrolling inside it. The siblings need `shrink-0` for the mirror reason — a shortfall is
   distributed across every item, so the button row is squeezed by the content above it. This is
   a phone-first failure a desktop window never shows you.

Add a lesson when a pass teaches one. Prune anything that has expired: a memory file that has
gone stale is worse than an empty one, because it is still believed.
