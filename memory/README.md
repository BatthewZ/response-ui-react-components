# Memory — `@batthewz/response-ui-react-components`

Lessons from previous passes on this package, kept because they cost real time and none are
obvious in advance.

**Not a bug tracker and not a TODO list.** Open work belongs in the findings ledger; conventions
and API rules belong in the package's own documentation. If a line here is *status*, it has
decayed — delete it. Each spoke is self-contained: no lesson should require opening another file
to understand.

| Spoke                      | The lesson                                                  |
| -------------------------- | ------------------------------------------------------------ |
| [traps.md](./traps.md)     | What every fix pass so far got wrong. Read before planning.  |
| [state.md](./state.md)     | Where one fact ends up stored twice, and which copies are deliberate. |
| [gates.md](./gates.md)     | What a green gate does *not* mean.                           |
| [ledger.md](./ledger.md)   | How a written record goes wrong, and which errors are worst. |
| [testing.md](./testing.md) | Ways a test here passes for the wrong reason.                |
| [history.md](./history.md) | Why an inherited claim is worth less than you think.         |
| [example-themes.md](./example-themes.md) | How sample data becomes API without anyone deciding to, and the one test that catches it. |
| [affordances.md](./affordances.md) | Adding a visual cue or an override hook: why a slot `className` only looks like it works, how to read a "the library overwrote my class" report, and how to move a rail without moving everyone's. |

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
12. **Measurement is not transitive to the sentence beside it.** A well-measured record can carry
   an unmeasured rationale, and the rationale is usually the part that sized the change. Rigour
   in a row is a reason to check *which claim* the evidence bears on, not a reason to stop.

13. **When a contracted token is unusable in the role the contract gives it, suspect the token
   before rewriting its consumers.** Cards were moved off the raised rung because that rung was
   byte-identical to the page canvas and left them with no boundary — a real defect, fixed in the
   wrong layer, and it cost every card in the library its intended colour. The tell is that the
   fix makes the component look *worse* in order to satisfy a rule. A rule that can only be
   obeyed by degrading the thing it governs is usually the part that is wrong.

14. **A per-component specimen and a whole assembled page are disjoint gates, and only the second
   one can see composition.** Building one realistic page out of the library found a compound
   component that unmounts itself for good when its children are collapsed to the active one, and
   a `className` cap that silently loses to the component's own unlayered CSS. Neither is visible
   in a tile, because a tile has one panel, never switches it, never caps it, and never stands it
   in a stretched cell beside a taller neighbour. When a change is to how components *fit
   together*, a green per-component suite is not evidence about it either way.

15. **A defect that lives in the paint is invisible to the entire suite, and the computed styles
   will agree with you.** A stroke effect that fragmented a chart's line survived a full green
   run, a clean typecheck, and every gate — and when probed, its animation name, dash array and
   finished play-state all read exactly as an assertion would want them. Nothing in the DOM was
   wrong; only the rendering was. Where a change is to geometry, paint or motion, the browser is
   not a nicer way to check the tests — it is the only instrument that can see the failure at
   all. Screenshot it before calling it done, and re-screenshot after a stylesheet edit, because
   a stale hot reload will happily show you the old pixels.
16. **Two defects here were shipped and then written up as Gotchas, which is what preserved
   them.** Prose describing a footgun reads as a decision, and the next reader — human or agent —
   treats the workaround as the API. §7 above still holds: answer the documentation rather than
   quietly deleting it. But "it is documented" is evidence that somebody noticed, not evidence
   that it is right, and a default needing an opt-in to be correct is the wrong default.

17. **A plan can be rich in evidence and still unfalsifiable, and that is the more expensive
   failure.** One pass kept visible retractions, demoted its own audit's confidence in writing, and
   closed its first phase on two refutations — while having declined the single measurement that could
   have produced a *new* refutation. The objection to that instrument was valid for a different
   question: an argument about screenshot flake was used against a question that was purely about
   computed style. Before trusting your own rigour, ask what result would change your mind and whether
   anything you have built could produce it. See [gates.md](./gates.md).
18. **Fanning work out to more readers finds more things and makes claims no safer.** A four-way
   parallel survey produced the sharpest findings of a pass — and most of its inflated numbers. Counts
   arrived precise-looking and were repeated as support without being re-derived, including counts the
   coordinator had run itself and not filtered to production code. §12 is the specific mechanism;
   the scale-up is what makes it likely. Re-measure anything you are about to lean on, especially
   when it came back looking exact.

19. **Cite the command, not the constant — and if a count depends on how you count, say how.** A
   plan proved a load-bearing claim with byte offsets into compiled CSS; the claim survived
   re-checking and every number did not, because the build moves them. Elsewhere in the same
   document a lane-sizing figure ("67 test files") matched no method out of seven, which spanned
   34–99, and a component denominator (~155) was unreachable under every reading — the ceiling was
   105. Numbers arrive precise-looking and get repeated as support; a number nobody can recompute is
   not evidence. See [ledger.md](./ledger.md).
20. **Preserving refutations in place is right; fusing them into live prose is not.** Strike-in-place
   worked until a document needed a separate briefing to explain which of its own sentences to
   distrust. Keep the plan current-truth-only and imperative, and give refuted claims a *settled, do
   not re-derive* section. Nothing is lost and nothing is re-derived, but the reader stops needing a
   guide. A corollary that is easy to miss: if a refutation already lives somewhere authoritative
   (the findings archive), the plan restating it is a second source of truth, not diligence.

21. **When a precedence premise flips, every sentence resting on it is refuted at once — and they
   are almost all "cannot" sentences.** Moving this package's CSS into `@layer components`
   falsified one clause in **20 component doc pages**, and every one of them was a *false cannot*:
   "a `className` cannot re-space it", "a padding utility never wins here, at any size", "use the
   important modifier". Those are the worst doc-rot shape (§16) because they steer people away
   from something that now works, and they read as authoritative while doing it. Two things follow.
   A one-line change to a stylesheet's *registration* can be a larger documentation change than a
   feature. And the sweep is findable: the pages all named the mechanism (`unlayered`), so one grep
   enumerated them — if a mechanism is documented by name, the name is the sweep.
22. **Deleting the losing declaration beats out-ranking it, and it is usually also the smaller
   diff.** Every fix in this pass that stopped a collision rather than winning one came out
   better: `Timeline` stopped emitting the foundation entrance class and gained a consumer
   override it never had; `Stagger` stopped duplicating a foundation rule and its own stylesheet
   disappeared; the outline reset stood down in forced colours instead of being beaten with
   `!important`; `Tabs` deleted three declarations that could not win. Reach for "who else is
   writing this property, and can we stop" before reaching for precedence. The corollary: **an
   accepted regression and a live rule cannot coexist.** If a rule can never win again, accepting
   the outcome means deleting the rule — leaving it in place is dead CSS that looks live, which is
   what the next reader will "fix".
23. **A public `data-*` is the cheapest way to publish a state a stylesheet needs, and it survives
   layering.** A class the foundation owns cannot be re-pointed from a layered stylesheet at any
   specificity; an attribute this package emits can be keyed on freely. The rule that mattered was
   never about the class — it was about the *interval* the class marked, and an attribute marks
   the interval without borrowing anyone's vocabulary. It is also visible to jsdom, so the
   invariant became assertable in the test suite for the first time.

Add a lesson when a pass teaches one. Prune anything that has expired: a memory file that has
gone stale is worse than an empty one, because it is still believed.
