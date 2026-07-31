# Standing traps

Mistakes made by earlier fix passes on this package, kept because each cost real time and none
are obvious in advance. Self-contained on purpose: every lesson below should be legible without
opening another file.

---

## A · From the first fix pass

- **A fix to a shared primitive does not reach components that bypass it.** Grep that the
  component actually *uses* the shared helper before calling its defect closed.
- **Fixing one defect can widen another.** Correcting a slider's `aria-invalid` merge turned an
  example's explicit-`id` workaround into a dangling IDREF, exposing a second defect in the error
  element. An example written around one defect will break when you fix that defect.
- **The obvious fix can be wrong in the mirror direction.** The bug was that a caller's spread
  erased the component's computed `aria-invalid`. Swapping the spread order fixes exactly that
  and erases the *caller's* value instead — passing the original test either way. Merge per key
  instead, and assert both directions.
- **Brief agents with the source, never with your summary.** Agents refuted three of that pass's
  own briefing claims, and one found a live bug in the reference implementation the others had
  been told to copy.
- **Verify at the level of the claim.** Three findings were mis-scoped in ways visible only by
  reading the component — the row's own wording described something narrower, wider, or already
  fixed.

## B · From the second fix pass

- **A test that mocks away an error is a bug report someone declined to file.** One component's
  mock carried the comment *"to avoid IntersectionObserver issues"*. All 36 of its tests passed
  for as long as that comment stood, over a live crash. **Grep for mocks whose comment explains
  what they prevent.**
- **A green gate can mean less than it appears.** The ledger guard printed `FAIL` and exited `0`
  for its entire life. The component-docs guard checks only token *tables*, so a token that
  changes **role** (an accent moving from ink to edge) passes silently, and falsified prose
  always passes.
- **`git add <paths>` + `git commit` is not atomic in a shared tree.** Two parallel lanes had
  commits contaminated by another lane's staging. Use `git commit -F - -- <paths>`, whose
  pathspec form bypasses the index and commits only what you name.
- **Partitioning work by file prevents collisions and creates gaps.** Two fixes fell between lane
  boundaries and were caught by a later sweep, not by any gate. *Something has to close the
  seams.*
- **Fixing one instance does not close a row.** A finding that named two components was closed by
  a lane that owned only one of them.
- **Refuting a finding is a full outcome.** Five were refuted in one pass. But **write the
  refutation into the record** — one living only in a commit body is invisible to the next
  reader.
- **Verify your own staked checks as hostilely as the work.** Adversarial verification refuted
  four of that pass's eight claims, and two of those were real unfixed defects rather than
  wording problems — a disabled menu item still letting the DOM default through, and a control
  whose focus ring had never been restored. Its author's error rate on unverified claims was not
  visibly lower than the handover's they were correcting.
- **Do not copy a claim into your own plan without re-testing it.** A "restore the saved theme"
  item was staked as work purely because a prior document listed it. The premise was already
  false — the package README had said persistence is not included since before that pass began.
  **A stake inherited from a document you have not verified is not a stake, it is a rumour with
  your name on it.**
- **A new gate's exemptions are where the next bug lives.** A focus-affordance guard documented
  honestly that it reads CSS only — and a high-severity defect sat in exactly that blind spot,
  written as a Tailwind utility in a `.tsx`.

---

## C · From re-running §A against the code that supposedly satisfied it

Trap A1 says to grep that a component actually *uses* the shared helper. Doing that once, against
the `aria-invalid` merge work the first pass had already "finished", found three more components
with the identical defect and two whose tests covered only one direction. Both were filed.

- **A trap list is worth what you spend re-running it.** These traps were written by the people
  who fixed that class, and the class was still open in three files.
- **"Three components" is not an enumeration.** The original row *counted* instances; only its
  detail block named them. Three further components went unlogged for a whole pass because a
  reader of the row could not tell what was covered. **Name every instance in the row itself.**
- **A claim can be true and still mis-scoped.** "Both directions tested on all five components"
  held — but the five tested were not the five that use the helper, so two components with the
  gap sat inside a sentence that sounded complete.
- **Before assuming a closed finding was falsely closed, check.** That row was honest about what
  it fixed; the defect was in what it left unnamed. A false closure and an under-scoped closure
  are different failures with different fixes, and guessing wrong wastes the pass.
- **The fix a finding prescribes may not be the fix that shipped, and may be wrong.** That row
  led with "spread the rest object first" — which mirrors the bug onto the caller. What actually
  landed was a per-key merge. Read the code that fixed it, not the plan that proposed it.

## D · From the pass that hoisted the shared focus recipe

- **Hoisting a constant out of a component's directory breaks tooling that resolves by relative
  path.** Collapsing eight hand-rolled focus-ring recipes into `src/util/focus.ts` turned the
  component-docs guard red on 16 rows that had nothing wrong with them: it follows `./` imports
  only, by design, so `../../util/focus` was invisible. A refactor's blast radius includes every
  script that reads source *textually* — check those before concluding the docs drifted.
- **A constant that a textual guard resolves must stay one flat string literal.** Each recipe in
  `src/util/focus.ts` is a single unbroken string on purpose: the focus-affordance guard resolves
  `const NAME = "…"` by text, and a `${…}`-composed constant would resolve to nothing — blinding
  the guard at every consumer at once, silently, in the same commit that tidied the file. The
  neater authoring is sometimes the one that costs you the check.

## E · From the pass that had to undo §D's other half

That pass declared a documented decision "drift" and unified it away. The decision was a clean
partition by element category, the documentation said so on eight pages in seven files, and the
follow-up commit **deleted all eight sentences** as part of reconciling the docs with the new
code. The gates stayed green throughout. The owner reversed it.

- **"Nothing states an intent" is a claim about your search, not about the codebase.** The
  sentences stating the intent existed, in the component docs, in the exact words the refactor
  said were missing. Before calling a divergence accidental, grep the *docs* for the thing you
  are about to change, not only the source.
- **A clean partition is evidence of intent; drift is ragged.** If the split falls exactly along
  a category boundary — every element of one kind on one side, every element of another kind on
  the other — that is a decision someone made. Drift produces a scatter, not a boundary. Check
  the shape of the divergence before you name it.
- **Deleting the documentation that contradicts your change is how a wrong change becomes
  permanent.** Doc text that argues *against* the diff in front of you is the cheapest refutation
  you will ever be handed. Treat it as a finding to answer, never as staleness to reconcile — and
  if you truly believe it is stale, say so in the commit and quote what you removed.
- **Encode the contested decision in the names and in a literal test table.** A recipe called
  `focusRing` invited the reading that any keying would do. `focusRingButton` / `focusRingControl`
  plus a test asserting each recipe's variant against a hard-coded literal makes the next
  unification fail a test instead of passing review.
- **Refactors smuggle unannounced behaviour changes alongside the announced one.** The same commit
  added `focus-visible:outline-none` to four components that had never reset the UA outline. It
  was in no claim, no changelog entry and no docblock — it arrived because the author folded a
  per-component decision into a shared constant. **When you hoist, diff what each call site had
  against what the constant gives it, line by line, and keep whatever the constant would silently
  add out of the constant.**

## F · From the pass that had to undo §D's *other* other half

- **A shared recipe answers one question globally; check whether the question is
  actually global.** §D hoisted the focus ring into `src/util/focus.ts` and, with it,
  settled `ring-offset` to `0` everywhere. The reasoning was sound and is still in the
  docblock: the offset paints a band of `--tw-ring-offset-color`, themed to
  `--C-SURFACE-0`, so on a control sitting on another rung it reads as a halo. (Since the
  2026-07-29 ramp change that mismatch is rarer — rung 0 is now the sheet colour that
  cards, dialogs, menus and input fills all share — but the page canvas is no longer rung
  0 in any theme, so the case still exists.) What
  nobody measured was the case where the band is *load-bearing* rather than decorative
  — a control that paints its **own fill**. Measured across the four themes, the ring
  sits at **1.31:1** against `--C-STATUS-ERROR` and **1.76:1** against `--C-SECONDARY`,
  and never below **2.72:1** against the band. A focused `<Button variant="danger">`
  had a ring it was nearly impossible to see, shipped by a refactor whose whole purpose
  was to make the ring consistent. The fix is two constants, not one
  (`focusRingButton` / `focusRingButtonFilled`), chosen per variant.
- **Unification pressure hides the exception.** The instinct that produced the bug is
  the same one RC-2 rewards — *one recipe, one answer*. When collapsing N copies into
  one, enumerate what the copies actually differed *on* before deciding the difference
  was drift. Two of §D's three "unifications" (this one, and the `focus:` keying in §E)
  were a real distinction being flattened.
- **A contrast number against a surface says nothing about the same colour against a
  fill.** `--C-BORDER-FOCUS` measures 2.22–14.84:1 across the surfaces while measuring
  1.00:1 against `--C-ACCENT` in the theme that makes the two byte-identical. Always
  state *what* a ratio is against. **This bullet also demonstrates its own second
  lesson**: it used to call that surface range "genuinely fine", which was never true —
  a focus indicator's floor is 3:1 and two themes sat under it — and it used to say
  "three of the four themes", which a later palette retune reduced to one. **An
  illustrative number decays faster than the principle it illustrates. Re-measure
  before you cite one, including from this file.**
- **The test that guards a recipe must enumerate the recipes.** `focus.test.ts` keeps a
  hand-written `RECIPES` map, so adding `focusRingButtonFilled` left it unguarded until
  it was added there too. Its literal `EXPECTED` table caught the omission on the next
  run only because the partition assertion lists recipe *names*; a purely value-driven
  table would have silently skipped the new export.

## G · From the table/data-display fix pass

- **A "fired once" boolean is the wrong guard for anything that grows.** An infinite-loading
  callback re-armed only when the window left the trigger zone deadlocked the moment a page
  landed that was too small to push it back out. Key the guard to the *quantity that changes*
  (the dataset length), not to a flag. The mirror defect — firing before any interaction — is a
  different question and usually the documented contract, so fix them separately.
- **"Controlled-only" selection is a feature that looks broken.** Two tables accepted a
  `selectable` flag whose handlers bailed out unless two further optional props were passed, so
  the boxes rendered enabled and did nothing. The same file already had the right pattern for a
  sibling feature. Before adding a type union to *forbid* the state, check whether the component
  can simply hold the state — an escape hatch already in the file beats a new constraint.
- **List-role, landmark and Safari/VoiceOver fixes cannot be observed in this environment.**
  jsdom computes the implicit role whatever the stylesheet does, so the only honest assertion is
  the attribute that carries the fix. Say so in the test, or the next reader will believe the
  announcement was verified.
- **The CSS package ships class twins of its element selectors.** Heading face, tracking and
  weight come from `h1`–`h6` *and* from matching `.h1`–`.h6` classes. Anything that has to look
  like a heading on a non-heading element already has a supported route; do not conclude the
  look is unreachable from this package.
- **Docs here often describe the defect in detail.** Several component pages document the exact
  gotcha a ledger row names. A fix is not finished until that paragraph is rewritten — a doc
  that still describes the old behaviour is a false statement shipped in the same commit as its
  correction.

## H · From the form-controls fix pass

- **A "silent rejection" is usually two defects, and the second is the expensive one.** Every
  reject path that also cleared the draft (`maxTags`, duplicate, `validateTag → false`) destroyed
  typing. The rule that survives review: clear an input only on *success*, or when what is left
  is blank. The same shape recurs in any commit-or-reject control.
- **`RegExp.prototype.test` is stateful and the caller owns the object.** A `delimiter` prop
  carrying `g` or `y` had its `lastIndex` advanced by the component, so consecutive commits
  disagreed. Work from a flagless copy; never `.test()` a caller's regex twice.
- **Two overlaid `<input type="range">` thumbs need a *directional* z-index, not a positional
  one.** Any fixed heuristic just chooses which thumb is buried at equal values. Deciding from
  where the pointer is relative to the pair keeps both reachable in every configuration.
- **A floating panel whose trigger is a sibling of the reference element dismisses itself.**
  `useDismiss`'s outside-press fires on the toggle's own `pointerdown`, then the toggle's
  `onClick` reopens — so the button "can never close" and emits a false `false`/`true` pair.
  Either scope `outsidePress` to the control, or keep focus off the toggle with a
  `mousedown` `preventDefault()`. Both are needed if you also add focus-out dismissal.
- **Focus-out dismissal and non-focusable options fight each other.** Portalled `role="option"`
  divs take focus to `<body>` on press, which reads as a focus-out. `onMouseDown` →
  `preventDefault()` on the floating container fixes the focus loss *and* the spurious close in
  one move, and is what keeps `aria-activedescendant` valid.
- **Roving focus plus a value is one state machine, not two.** Rating ran the hook's key handler
  alongside its own: focus looped where the value clamped, and a click never moved the tab stop.
  Derive the roving index from the value in an effect and handle the keys once.
- **`clientX` is `0` for a keyboard-fired click.** Any "which half was clicked" logic silently
  picks the left half on `Enter`/`Space`. `event.detail === 0` is the discriminator — and jsdom
  reports a 0×0 rect, which accidentally reads as the *right* half, so a test that does not stub
  `getBoundingClientRect` passes for the wrong reason.
- **An SVG in a data-URI `background-image` cannot read `currentColor`.** It is its own
  document; `fill="currentColor"` resolves to the initial colour (black) on every theme. There
  is no CSS-var route into a `url()` — the fix is a real element positioned over the control.
- **`{...props}` after `{...ariaProps}` is the whole of the #434/#455 family.** `form.field()`
  emits the key `aria-invalid` valued `undefined` on every render, so a plain spread deletes the
  state the component computed. `mergeProps(props, ariaProps)` is the fix, and it belongs
  wherever a component both computes ARIA and accepts a rest spread.
- **`<fieldset disabled>` is the only way a wrapper can disable children it does not own.**
  Preflight already strips its UA border/padding/margin; add `min-w-0` for `min-inline-size`.
- **Check the sibling components another agent is editing.** `Spinner` became decoration-by-
  default mid-pass, which silently removed the `role="status"` a Combobox test asserted. A
  green suite before the change is not a green suite after it.
- **A parallel pass creates defects that belong to no one in it.** Making `Spinner` decoration
  by default was right — N spinners were N live regions announcing unreachable English — and it
  silenced every consumer that had been relying on it. The component's owner fixed the
  component; the consumer's owner never knew. One call site was adapted because the agent
  holding it happened to notice, and another was left announcing nothing during a blocking auth
  check. **When a shared component's contract changes, someone has to walk its call sites**, and
  that someone is whoever is coordinating, because no per-component scope contains the question.
- **"All green" from a worker means green in its scope, at its moment.** Two reports here said
  typecheck was clean while the editor showed a dozen errors — both were right: the errors were
  in files other workers were mid-write on, and the snapshots were stale. Re-run the checks
  yourself before recording anything. The cheap version is enough; the expensive part is
  believing a report you cannot reproduce.
- **A worker will report a half-fix as a fix, without meaning to.** Two rows came back listed
  under FIXED whose second clause was untouched — an ARIA half done and a contrast half never
  re-measured, an `aria-invalid` added while the message it needed stayed missing. The report
  named the work honestly; it was the *row's sentence* nobody re-read. Read the row, not the
  summary of the work.
- **Never `git add -u` in a tree with other agents in it.** It stages their in-flight files, and
  a commit message then claims work it did not do. `git reset --soft` plus explicit paths undoes
  it without touching anyone's working tree — but only if you notice, and the only reason it was
  noticed here was reading `--stat` afterwards.

## I · From the pass that was allowed to add public props

- **Before naming a new prop, read what the sibling components in the same family already
  ship.** The answer to "how does a caller bound this component's scroll area" was already
  a prop on one of the three tables and missing from the other two. Copying the sibling's
  answer costs one grep; inventing a second name for the same idea costs a breaking change
  later. An asymmetry closed by introducing a differently-shaped asymmetry is not closed.
- **A convenience prop layered over an existing escape hatch needs a stated precedence, and
  that is the assertion nobody writes.** When a component accepts both a raw `style` and a
  named prop that writes one of its keys, one of them must win by design. The direction that
  is never exercised by accident is the one a later "simplification" silently flips, so assert
  both directions and say which wins in the prop's own docblock.
- **"Can never take effect" is almost always "does not take effect in the default flow".**
  The same element behaves differently as a block-flow child and as a flex/grid item, and a
  scroll container's automatic minimum size is zero — so a claim measured in one layout is
  not a claim about the component. Name the layout the claim holds in; a record that
  overreaches gets copied verbatim into a published doc, and then the library is telling
  consumers they cannot do something they can.

## J · From the pass that gave colour-only status a text channel

- **The element's role decides where the words can go, and it is not always a child.** ARIA
  makes the children of `img`, `meter`, `progressbar`, `button` and their siblings
  presentational, so a visually-hidden `<span>` inside one is dropped before any screen reader
  sees it. In a family of five status surfaces, three could take a hidden first child and two
  could not — those needed the accessible name and `aria-valuetext` instead. Check the role
  *before* choosing the channel; the fix that works on the plain `<span>` sibling is silently
  inert on the one with a range role.
- **Adding a text channel to something already announced makes it worse.** A state that
  already reaches assistive tech — through `aria-current`, `aria-valuenow`, a live region —
  gains nothing from a hidden word beside it and loses to the double announcement. "This row
  needs no change, and stays open for the *visual* half" is a real outcome; reaching for the
  fix anyway is how a component ends up saying everything twice.
- **A prop the primary entry point cannot reach is not an override path.** A component
  consumed through a provider queue (or any factory that constructs it for you) needs the
  option threaded through that API too. The hand-rendered escape hatch existing is not the
  same as the prop being reachable, and the difference is invisible to a typecheck.
- **Hard-coded English with a documented override is the settled answer here; hard-coded
  English with none is a logged defect.** Default the word, name the prop for what it labels,
  and let `""` remove it — a caller whose visible text already says "Failed" should not be
  made to hear "Error, Failed".

## K · From the pass that tightened a type instead of adding a prop

- **A prop is forever; a type constraint can be relaxed.** Asked to close "the component can
  ship with no accessible name", the two candidate shapes were a new `label` prop and a
  required-name constraint on the props type. Removing a public prop later is breaking;
  *widening* a type later is not — so where both shapes buy the same thing, the constraint is
  the reversible one. It also adds no runtime behaviour to get wrong, and invents no English
  default for a name only the caller knows.
- **Copy the sibling's answer, but not past the point where the siblings differ.** The sibling
  component required `aria-label` outright, which would have been wrong here: this one ships a
  label sub-part the docs point `aria-labelledby` at, so a single-key requirement would have
  broken the very pattern its own primary example teaches. The precedent to follow was
  "require a name", not "require that key".
- **When a requirement is a union of arms, arm order is the error message.** TypeScript reports
  the *last* member of a union as the missing one, so the arm most callers want belongs last.
  The same union written label-first tells a confused caller they are missing `aria-hidden`.
- **Tightening a type breaks the repo's own call sites, and one of them is not in `src/`.** The
  dev gallery and every existing test render the component the old way, and a `--noEmit` run is
  the only thing that finds them. Budget for that before deciding the change is small.
- **A type-level assertion is a real test and needs no `@ts-expect-error`.** `const x: A extends
  B ? false : true = true` fails the typecheck if the relation flips, in either direction, and
  it is checked by the same command that gates the package.

## L · From the typography-and-token pass

- **Moving one component onto its contracted token silently falsifies every *measured*
  claim made against the token it left.** A container primitive corrected from the
  most-elevated surface step to the one the contract names for it put a sibling's
  recessed-track colour at 1.00:1 — the sibling's doc carried a four-theme contrast table
  written against the old backdrop, and nothing in the container's own scope could see it.
  Before changing a surface *role*, grep the docs for the token you are leaving as well as
  the one you are taking: a ratio is only true against a named background.
- **A type step is a size *and* a leading, and the leading is a paragraph's, not a chip's.**
  Any `inline-flex` control that takes a `text-*` step and pays for its height in padding is
  actually sized by the theme's line-height — which themes move by a third — so the same
  chip or keycap is a different height in every theme for a reason no caller can see. Reset
  the leading and let the padding rung own the height. The escape hatch is documented and
  costs nothing: the `text-*` step emits `line-height: var(--tw-leading, …)`, which is
  exactly the variable a `leading-*` utility sets.
- **The css package's unlayered classes outrank every Tailwind utility, whatever the merge
  does.** Reaching for one inside a component's base classes is the supported way to read a
  token no utility exposes — and it silently makes that one property un-overridable from
  `className`, in a component whose docs promise the opposite. Take the class, then write
  the exception down.
- **"Documented" and "documented as intentional" are different findings.** A page can
  describe a defect in detail without endorsing it; a page can also devote a *section* to a
  behaviour, name the use case it serves, and spell out the reverse direction. The first is
  a paragraph to rewrite in the same commit as the fix. The second is a refutation. The tell
  is whether the prose names something the behaviour is *for*.
- **TypeScript cannot say "non-empty string" about a value it only knows as `string`.** A
  required-prop guarantee is structural, never semantic. When the prop is an accessible
  name, a render-time check catches both the empty literal and the variable that is empty on
  some renders, which no type-level trick can. And when a required prop has a legitimate
  alternative — an ARIA name has two sources — an intersected union requires *one of* them
  without an `Omit` that would strip the value from the DOM.

## M · From the Field/Checkbox/Radio pass

- **An IDREF is a claim about the DOM, so the element that owns the id has to be the one
  that publishes it.** A wrapper that mints an id and hands it out on context is guessing:
  the message element may render `null`, may not be in the tree, or may have taken the
  caller's own `id`. Three separate findings were one bug — *the id a control points at is
  computed from what the wrapper intends rather than from what rendered*. Registration (child
  reports the id it used, parent stores it, consumers read the stored one) collapses all
  three, and it is the only shape where "no message" and "no reference" cannot disagree. The
  cost is that it lands in an effect, so it is absent from server HTML until hydration —
  worth saying out loud in the doc rather than discovering later.
- **"Every other component does X, so this one should too" is a design claim, not a bug
  report, and ARIA sometimes settles it against you.** Two rows named as the same root in two
  components genuinely were — except that half the prescribed fix is invalid on one of them:
  ARIA 1.2 permits `aria-invalid` on `checkbox` and not on `radio` (nor on `group`, which is
  what a `<fieldset>` maps to). The component's own doc page had argued this in two places
  before the row was written. **Check role support before wiring a state onto a control**;
  `aria-query`'s `roles` map answers it offline in one line, and a partition grounded in the
  spec is worth encoding in a test with the reason spelled out, or the next unification pass
  flattens it.
- **A "dead styling" row is a browser question, and this package's tests cannot ask it.**
  `css: false` means no unit test can tell you whether a declaration paints. Screenshot the
  *same element* at a *fixed position* with only the declaration changing, and compare the
  bytes — one shot per variant plus an `appearance:none` control that proves the declaration
  is reachable at all. Comparing two different elements side by side does not work: they land
  on different sub-pixel offsets and rasterise differently for reasons that have nothing to
  do with the rule under test, which is how a first run produced a contradiction.
- **Wiring a control into a shared context turns it into a client component.** A previous row
  established that consuming the field-error hook needs the module's own `"use client"`;
  every component newly consuming it inherits that, and each one has a "Server-renderable"
  line in its doc that is now false — as does any *sibling's* doc that contrasted itself
  against it. Grep the docs for the component's name, not just its own page.
- **Assert the merge contract the package already ships, not the one that sounds right.** A
  test staking "the caller's explicit `aria-invalid` wins" failed, and the code was right:
  `mergeProps(props, ariaProps)` means the component wins wherever it computed an opinion and
  the caller wins wherever it did not, with `error={false}` as the documented opt-out. Three
  sibling components already asserted exactly that. Read a sibling's test before writing a
  new component's.

## K · From the animation-primitives pass

- **A custom property re-declared on the element that consumes it cannot be overridden from
  any ancestor.** The CSS package's animation rules set their own tuning variables on the
  same selector that reads them, so a component writing the variable on a parent — or a
  consumer writing it in their own CSS — is silently shadowed and the prop is dead. The
  in-package fix is to write the variable inline on the element carrying the class; an
  inline declaration outranks the rule. Measure this in a browser before and after: the
  computed `animation-delay` states the answer in one number and takes minutes.
- **Two rows on the same file can prescribe opposite fixes.** One asked a wrapper to honour
  reduced motion, another asked it to stop being a client component — and the obvious answer
  to the first (call the media-query hook in the component) makes the second impossible.
  Look for the gate that belongs to the *trigger* rather than to the wrapper: a hook that
  starts the effect can hold the preference check, leaving the pure component pure and
  closing both. Read every row on a file before fixing the first one.
- **An accessibility opt-out already has a house name here; find it before inventing one.**
  Every component that wraps the scroll-reveal primitive already shipped the same boolean
  prop for exactly this — the primitive itself was the only member of the family missing it.
  A grep across the family answers "what should I call this" and "what shape should it take"
  at once.
- **A default-behaviour change to a shared primitive is fenced in by its consumers' tests.**
  Auto-revealing when the observer API is absent is right in a browser and breaks a sibling's
  test that relies on jsdom lacking that API. When the fix is one line and the fallout is in
  another lane's file, say so in the record and leave it: an unannounced default change is
  worse than an open row.

## N · From the palette re-measurement pass

(The letter after `M`. Two sections in this file are both called `K` — a pre-existing
collision, left alone because briefs in flight cite the later one by letter.)

- **Measure the artifact you consume, not the checkout next to you.** This repo holds the
  CSS package as a sibling directory *and* as an installed dependency, and they are not the
  same thing. A fix can be committed in the sibling, deliberately left unversioned pending a
  release call, and therefore be completely absent from what every consumer — including this
  package's own test run — actually resolves. Two correct measurements of "the same" token
  disagreed by 0.7 for exactly this reason, and it read like one of them was broken. The tell
  is that the two sources agree on most values and diverge on precisely the ones someone
  recently touched. **Read `node_modules/`, and say which you read.**
- **A dependency range cannot deliver a fix that was never published.** "Fixed upstream" and
  "shipped upstream" are different states, and only the second one reaches anybody. When a
  cross-package row is closed by an upstream change, check the upstream *version* moved, not
  just that the commit exists — otherwise the row gets archived against a value no build has.
- **A row can exonerate a clause using the very backdrop it just disproved.** One contrast row
  correctly established that a status message never sits on the surface everyone assumed, then
  cleared its sibling clause using numbers measured against that same disproved surface. The
  correction and the error shipped in one cell. When a row fixes its own mechanism, **re-derive
  every number in it**, not only the one that prompted the correction.
- **Contrast rows expire silently when someone else retunes a palette.** Five rows in this
  ledger became false without a line of this package changing, and the doc pages quoting their
  ratios became false statements shipped to npm. Any measured claim needs its input version
  named in the row, or nobody can tell later whether it was re-checked or merely re-read.

## O · From the pass that was asked whether a dialog's padding was too big

- **When a padded surface looks over-padded, measure before you retune the token.** A surface
  that owns its padding and a caller that adds a padding wrapper inside it *stack*, so the
  rendered gutter is the sum and neither value is individually wrong. The instinct — drop the
  component's rung one step — permanently shrinks the surface for every correct caller to
  compensate for one incorrect one. Derive the expected gutter from the tokens, compare it to
  what is on screen, and only suspect the default when the two agree. Screenshots make this
  worse by hiding the arithmetic behind an unknown device pixel ratio: recover the scale from
  a known quantity in the shot, such as the surface's own `max-w`, before trusting any
  measurement taken off it.
- **The demo harness is a claim about the component's API, not a neutral sandbox.** A wrapper
  added there to make one tile look right teaches every reader that the component needs help
  it does not need, and it is the surface people screenshot when they report the component
  looks wrong. Overlay surfaces in this package already carry their own padding — `Dialog` and
  `Drawer` both sit at the `r2` rung, one rung airier than `Card`'s `r3` default, deliberately,
  because a floating panel earns more gutter than an inline one. Children go in unpadded.
- **The auto-globbing gallery mounts every example export bare, so ambient context is the
  harness's job and not the snippet's.** An example teaching a hook is *supposed* to call it
  without provider boilerplate — that is the thing being taught — but rendered alone it throws,
  and the tile's error boundary turns the throw into a small red line that reads as a broken
  component rather than a missing wrapper. Wrap the harness once, high, the way a real app
  would; adding the provider to each snippet would buy a green tile by making every doc example
  teach boilerplate. The general form: when a specimen harness renders declarations it did not
  write, it owes them the environment their docs assume.

## P · From the wave that acted on the owner's six decisions

- **jsdom implements no key model for `<input type="range">`.** Probed directly: `{ArrowRight}`
  leaves the value untouched and fires zero change events, and `{Home}`/`{End}` throw *"Not
  implemented. The result of this interaction is unreliable."* So a component whose whole design
  is "let the browser own the keyboard model" has **no** in-repo test for the thing it bought.
  Drive `fireEvent.change` — the event a real press produces — and verify the key model in a
  browser, saying so in the test.
- **A browser can refute a test that passes both before and after the bug.** `pointerdown`'s
  default action focuses the nearest focusable ancestor *after* your handler runs, so a drag
  silently stole focus and arrow keys went nowhere. jsdom implements neither the default nor the
  focus move, so the test was green either way. If a fix is about focus or default actions,
  jsdom green is not evidence of anything.
- **`??` is the wrong operator for a `ReactNode` twin of a `string` prop.** The house convention
  lets `""` remove a defaulted word. Its node equivalent is `null` — and `""` survives `??` while
  `null` does not, so `icon ?? defaultIcon` silently restores the default the caller just removed.
  Resolve with `=== undefined`.
- **An icon library may already set the attribute your test asserts.** `lucide-react` adds
  `aria-hidden="true"` itself when no a11y prop is present, so `svg[aria-hidden="true"]` passes
  whether or not you wrote it. Select the element unconditionally and assert every naming route is
  closed, or the test is checking the library rather than your code.
- **Accessible-name computation has two traps that look like styling problems.** A hidden child
  only separates from its neighbours where `display !== inline`, so an `sr-only` `<span>` inside a
  button computed as `"Sort byName"` — and no test here can read the stylesheet that would fix it.
  And `aria-hidden` does **not** exclude a node that is *directly referenced* by `aria-labelledby`,
  so a hidden action word leaked onto the `<th>` and would have been announced by every cell in the
  column. Both were found by reading the computed name in a browser, with a positive control.
- **A shadowed custom property can be un-shadowed from downstream, and the price is a duplicate.**
  `--x: inherit` on the element that re-declares it, plus a re-read supplying the token as the
  `var()` fallback, makes an ancestor's value reach it. But the rule now permanently outranks the
  upstream one on source order, so **write the deletion condition into the file** — otherwise a
  future upstream change silently does nothing and nobody knows why.
- **Key a descendant animation off the class that is removed once, not the one that is added.** A
  reveal wrapper drops its entrance class on `animationend`; a descendant rule keyed off that class
  loses it mid-flight and later items snap instead of finishing. Keying off the *absence* of the
  hidden class is stable, because that class is removed exactly once.
- **An editor-written `\u0000` in a TS template literal can land as a LITERAL NUL byte.** `tsc`,
  eslint and vitest all accept it silently — and git then classifies the whole file as *binary*,
  so `git diff` prints "Binary files differ" and every diff, blame and review on that file is
  quietly lost. Worse, `grep`/`sed`/`perl` re-break probes against such a file no-op **without
  failing**, so a fail-first check "passes" for the wrong reason. Build re-break probes with an
  asserted marker (`assert old in s`), never a bare substitution that cannot tell you it matched
  nothing.
- **A "corrected" number in a row can be the wrong one.** A contrast figure was re-scoped upward
  and the correction was believed for a whole pass; measured from *rendered pixels* it was
  2x off, and the older figure the correction replaced had been closer. The cause: the model
  composited a translucent layer in **linear light**, where browsers composite in gamma-encoded
  sRGB. Any ratio involving an alpha wash has to come from pixels, not from arithmetic — and a
  row that has already been "corrected once" is not thereby more trustworthy.
- **Reviewing a diff in windowed chunks is not reviewing the diff.** A coordinator paged through
  an unfamiliar change with `head -40` and then `sed -n '40,80p'`, judged it sound, and committed
  it. The very first line of the function under review was `return …; // TEMP-AB-BYPASS`, which
  made the entire body it was there to add unreachable — and it fell in the seam between the two
  windows. Every gate stayed green because the bypass returned identical output. If you are going
  to vouch for a diff, read it end to end in one pass, and grep it for the words people leave on
  scaffolding — `TEMP`, `TODO`, `XXX`, `BYPASS`, `DEBUG`, `FIXME` — before it becomes a commit
  with your name on it.
- **Build a commit's file list from `git status`, not from the report.** A coordinator assembled a
  commit by hand from a lane's prose and left one file behind — the stylesheet holding the
  `sr-only` rule for the hidden word the same commit added. Without it the word *paints*, which the
  lane had already measured as its own negative control. Every gate stayed green, because
  `css: false` means nothing in the suite reads a stylesheet, and the only tell was `git status`
  not coming back empty afterwards. A report describes the work; only the tree knows the files.
  **After committing a lane, `git status` must be empty or every remaining path must be one you
  can name and are deliberately holding.**
- **Work you did not commission can appear in a shared tree, and adopting it makes it yours.**
  Two changes arrived mid-wave from outside every lane's scope. Keeping them was right — they
  were sound and tested — but they were committed under their own message so no lane's commit
  claimed work it had not done, and the one that was *not* sound got through because it was
  reviewed less carefully than a lane's report would have been. Hold inherited work to the
  standard you hold a lane's, or hold it out of the commit.
- **The seam between two lanes is a class name.** One lane moved a utility into a shared
  component's base classes; another lane's test built its expectation by rendering that component
  *with the utility passed by hand*. Both were correct in isolation and the suite went red only
  when the redundant pass-through was finally deleted. A test that constructs its reference by
  mirroring the caller encodes the caller's workaround — build the reference from the bare
  component instead, which is the stronger claim anyway.
- **Focusing anything inside a floating element before it has a position scrolls the page to the
  top.** Floating UI computes position *asynchronously*, and until it resolves `floatingStyles`
  is literally `{position, left: 0, top: 0}` — so a portalled popover's first commit paints it at
  the document's top-left corner. Any `focus()` in a mount effect there is a scroll request
  aimed at the top of the page, and the user sees the whole page jump before the popover slides
  into place next to a trigger now far below the fold. It is invisible to every gate in this
  package: jsdom implements no scrolling whatsoever, so the focus assertion passes and only the
  option passed to `focus()` is observable in a test. Floating UI's own focus manager passes
  `preventScroll` for exactly this reason. **A mount-time focus inside a portal takes
  `{ preventScroll: true }`; a focus driven by later keyboard movement generally should not,
  because by then the element is positioned and scrolling it into view is the point.**

- **When a component gets a second layout, put the switch on the root and let CSS descend to
  find it.** A component whose layout is decided by an attribute on its own root element cannot
  desynchronise the way one that computes per-child values can: there is one writer, and every
  rule reads it through a descendant selector. This package already learned the opposite lesson
  the hard way — a layout that derived a child's *position* from CSS sibling-counting while
  deriving that same child's *entrance direction* from a React-side index produced two answers
  for one fact the moment a fragment sat between the children, because the React helper does not
  descend into fragments and the DOM does. The rule that falls out: **a new layout axis is a root
  attribute plus stylesheet rules, never a value threaded to each child** — and if the axis has to
  change something per-child, change it in the same selector that already decides that child's
  position, so the two cannot be edited apart.
- **Retuning custom properties is a safer variant mechanism than adding selectors.** A density or
  size axis implemented as one rule per step that assigns *only* custom properties is provably
  layout-neutral: no step can move an offset, change a selector or resize type, because no step
  says anything else. It also composes with every other axis for free. The trap to watch is that
  custom properties resolve **lazily** — a `calc()` local derived from two other locals silently
  follows whichever of them a variant retunes, so decide explicitly which locals a variant is
  allowed to touch and say why in the file. Geometry that every other rule is measured against
  usually wants to be off-limits.
- **Orthogonal props beat a preset, and the preset's cost is the word.** A request for a "variant"
  bundling several defaults is usually better served by the individual props, because a preset
  makes some combinations unreachable and freezes a taste judgement into a public API that
  outlives the taste. The specific hazard here is vocabulary: `variant` already means *visual
  skin* across several components in this package, and spending it on "bundle of defaults" would
  be its third meaning. Check what a prop name already means in the library before you spend it.
- **For a layout prop, physical naming is a promise you can keep and logical naming usually is
  not.** `start`/`end` implies the component honours writing direction. Unless the stylesheet is
  actually written with logical properties — and here the physical-to-logical ratio is roughly
  six to one, with only a couple of deliberate RTL opt-ins — `left`/`right` is the honest name and
  says exactly what the CSS does. Pick the vocabulary the implementation can back.

## Q · From the pass that made a native control's focus ring follow its shape

- **A UA-painted control ignores author box decorations, and that includes the ones your focus
  ring is made of.** On a native-appearance radio, `border-radius` reaches neither `box-shadow`
  nor `outline` nor `outline: auto` — measured in Chrome 144, all three render square around a
  circular control, radius set or not. So "themed ring" and "ring shaped like the control" are
  not independently purchasable on a native widget: the second one costs `appearance: none`.
  Before promising a shaped indicator on any control the engine draws, check whether the
  decoration can reach the shape at all; the answer is usually no, and the real decision is
  whether the shape is worth taking over the painting.
- **Taking over the painting is never one state.** The engine was drawing rest, checked,
  disabled *and* the forced-colours substitution, and it stops drawing all four at once. A
  replacement that only covers the state you were looking at ships a control that looks
  unselected when selected, or unstyled to a high-contrast user. Enumerate the states the UA
  was covering before the first line of CSS, and remember that a control which needed no
  stylesheet now depends on one — that dependency belongs in the docs as a consequence, not as
  a footnote.
- **Headless Chrome does not apply `:focus` styling unless focus emulation is switched on.** A
  screenshot of a "focused" element taken without it shows the resting state and looks like the
  fix failed; the computed ring colour comes back transparent while `:focus`-keyed rules that
  *remove* things still appear to have applied, which reads as a specificity bug and is not one.
  Enable focus emulation over the debugging protocol, then assert on computed style as well as
  on pixels.
- **Verify a styling change against the compiled stylesheet, not a hand-written mock of it.** A
  standalone HTML page proves the *technique* works and proves nothing about this library: it
  cannot tell you the utility exists, resolves to the token you meant, or wins over the rule
  next to it. Inject the markup into the running dev app and read `getComputedStyle` back —
  same cost, and it answers all three.
- **Prose that contradicts your change may be reporting a measurement, not a stale opinion.**
  The page here said the component ships no border and no radius *because engines ignore both on
  a native control* — entirely correct, and still correct after the change. What expired was its
  conclusion for this one component, because the premise it rested on (the control stays
  native) is exactly what the change trades away. Answer the sentence and say what you traded;
  do not delete it as drift.

- **A spacing variant needs an invariant, not three sets of hand-picked values.** Adding a
  density axis to a component means every step has to keep whatever relationships the original
  spacing was relying on — and those relationships are usually unwritten, so the new steps break
  them silently. The one that bites here is Gestalt proximity: **the gaps inside a repeated item
  must be strictly tighter than the gap between two items**, or the item's own trailing content
  reads as the start of the next one. Pick the values by a stated rule ("one step tighter than
  the item gap"), write the rule next to the values, and a step added later cannot quietly
  violate it. Worth checking the *existing* default while you are there: this component's
  shipped `comfortable` rhythm already had the relationship inverted, and it had survived because
  a card border was partly masking it — the density axis did not introduce the bug, it removed
  the disguise. **A variant axis is a good moment to audit the base case, because putting two
  steps side by side is the first time anyone actually compares them.**

## R · From the pass that asked whether cards read lighter than the page

- **SUPERSEDED 2026-07-29 — the ramp was redefined, and the lesson this pass drew was the wrong
  one.** This pass asked why cards read lighter than the page, correctly established that the
  ramp's lightness direction reversed between light and dark themes, and then concluded that the
  *components* were misusing it — moving `Card` and `StatCard` down a rung so they stopped
  colliding with the canvas. That treated a symptom. The actual defect was in the token layer:
  the canvas sat at an *endpoint* of the ramp and was byte-identical to rung 0 in both shipped
  light themes, so nothing could paint the raised rung without vanishing, and the free direction
  meant light-theme surfaces sank while dark-theme surfaces lifted from the same token. Both are
  now fixed at source — the ramp runs raised → recessed in one lightness direction in every
  theme, and the canvas sits *between* rungs 1 and 2 — and the components moved back.
  **The transferable lesson is the one this pass missed:** when a token is unusable in the role
  the contract assigns it, suspect the token's own definition before rewriting every consumer to
  avoid it. The give-away was that the fix made the component look worse (a faded card) to satisfy
  a rule, which is what a symptom fix feels like from the inside.
- **A container whose only boundary is its fill has no boundary.** One step on the surface ramp
  measures barely over 1:1 in every shipped theme, and a container will eventually be dropped
  onto a backdrop the design system itself paints on the container's own rung — at which point
  the step is exactly zero. Shadow does not rescue it either: a dark theme's shadow is black on
  near-black. Any component that claims to be a bounded region needs a border, and the moment
  to notice is when you write "the background step is small on purpose" in its docs.
- **Prose carrying a metaphor propagates further than the value it describes.** A single wrong
  word in the token contract — calling the ramp an elevation — had been copied into component
  pages that then reasoned from it and reached conclusions no measurement supported, including
  two that described the *deepest* surface as the most elevated one. Grep the metaphor, not just
  the token name: the token name was right in all of those places and the sentence around it
  was not.
- **When one design-system fact lives in two packages' docs, expect both copies to be stale —
  in opposite directions — rather than one being a superset.** Two files with the same name and
  the same purpose had grown different intros and different required/optional splits; the
  downstream copy documented a CLI the upstream package had deleted nine minor versions
  earlier, while a load-bearing rule cited by six component pages existed only downstream, so
  the upstream doc a theme author actually reads never mentioned it. Neither drift was
  detectable from inside one package. The ownership rule that resolves it is the dependency
  direction: the foundation owns the design language, and the component layer documents only
  the tokens that exist *because components exist*. Anything else it restates will drift.
- **A redirect section is a cheaper fix than repointing every inbound link.** Deleting duplicated
  doc sections breaks every `#anchor` aimed at them, and the link-integrity gate is right to
  fail. Keeping the headings with one sentence of substance and a link upstream preserves
  ~100 inbound links untouched, and each stub teaches the ownership rule at exactly the moment a
  reader would otherwise have learned the wrong thing. Deleting the heading and editing the
  callers spreads the same fact across every caller again.

## S · From the pass that asked why the current-step ring looked heavy

- **Where the brand fill sits near the surface, a component silently changes *form*, not just
  colour — and a cue calibrated in one theme is then miscalibrated in the other for a structural
  reason.** The contrast pairing makes a filled chip letter and ring itself in its `on-*` token,
  so in a theme whose primary is close to the surface the fill disappears and the chip renders as
  a *ring*. Every marker in that component becomes the same shape, a weight difference between
  them reads as one deliberate axis, and it can be pushed hard. Give the same component a theme
  where primary is a visible fill and the neighbours are solid discs: the same weight difference
  now competes with filled mass instead of harmonising with sibling rings, and the emphasised
  element can end up outweighing the elements it is meant to rank below. Nothing in the CSS
  changed. Check an emphasis cue against a theme of each polarity *and* each fill behaviour
  before calling it tuned — the polarity is the obvious variable and the fill behaviour is not.
- **"Survives greyscale" is almost always claimed about a lightness difference, which is the
  greyscale channel.** A comment asserted that a width cue was the only thing separating two
  states without colour, and that they had previously differed "by tint alone" — while the two
  states were the palette's darkest ink and a border token a hair off the surface, ~15:1 apart in
  luminance. Greyscale preserves that by definition. The real justification for the cue was much
  narrower (it is the fallback when a consumer overrides the ink to something isoluminant with
  the border token), and the narrower justification supports a *smaller* cue. Compute the two
  lightness values before writing a 1.4.1 rationale; the inflated version gets used to defend a
  size the design does not need.
- **A multiplier on a border width scales ring ink, not diameter.** Under border-box, doubling a
  ring's width on a small round marker nearly doubles the stroke area while the element stays the
  same size — so "2x" understates the visual jump and reviewers approve it as a linear change.
  Reason in area when the shape is an annulus, and prefer the smallest multiplier that still
  discharges the cue's actual job.
- **`items-start` aligns to the row's top edge, which is not where the first line of text is.**
  A fixed-size glyph beside a paragraph starts at the content top while the first line box is a
  whole leading tall, so the glyph reads high; a control taller than one line reads low by the
  opposite half. Two controls flanking the same sentence therefore land at two different heights
  and the row looks subtly broken with no single element obviously at fault. Centre each on a box
  one leading tall rather than nudging either with a negative margin: the margin is a constant,
  and the leading is a theme variable, so a nudge tuned on one theme at one breakpoint is wrong
  everywhere else. Measured in the browser rather than argued: the glyph sat 6px high, and the
  leading it should follow ran 22px / 24px / 26px / 28px across the example themes and the mobile
  breakpoint — a 27% spread that no single negative margin can satisfy. A control taller than that
  box should overflow it into the container's existing padding — otherwise the *chrome* sets the
  container's height and the block is taller than its own text.
- **A misalignment that is *shared* by two components is a pattern, not an instance.** The
  reported one was found by arithmetic; its twin was then confirmed live at exactly the predicted
  offset, in a component nobody had complained about. When a defect comes from how a layout
  primitive treats text, grep for the other components that lay out the same way before closing
  it — the second one is free and the report will never mention it.
- **A shared control carries its container's assumptions, and a tinted container breaks them.**
  A neutral icon button is correct on a neutral surface and wrong on a coloured card, where its
  hover paints a step of the page's chrome that belongs to no variant — the same grey on all
  four. The library already had the answer and had only applied it once: the inverse ghost
  variant, which swaps the neutral fill for *the surrounding ink at a low alpha*. When a
  primitive looks wrong only in one host, check whether a sibling primitive already solved it
  before inventing a treatment.
- **`currentColor` is how one string serves every variant *and* every theme a consumer invents.**
  Deriving a state fill from the inherited ink means no per-variant map, no new token, and no
  variant name in the source — a status a consumer adds themselves is covered for free. The
  enabling trick is unobvious: `text-current` resolves to `inherit`, which is what hands the
  control the ink that `bg-current` then reads. Worth a comment, because it looks like a no-op.
- **A colour change has two contrast questions, and the mark is the one people forget.** Tinting
  a control's *background* moves the backdrop of whatever sits on it. Measured, a hover tint
  drawn from the ink cost 0.3–2.7 of the glyph's ratio and pushed one variant under the 3:1
  floor for a graphical object — while the *shipped* neutral it replaced already failed the
  same case, so "it regressed" and "it was fine before" were both wrong. Measure the state you
  are adding *and* the state you are replacing before calling either a regression.
- **Keeping one element out of a change can be what makes the change affordable.** Letting the
  glyph stay neutral while its button tints bought a 2.4× contrast margin over tinting both, and
  turned an alpha that failed into one with room to spare. When a treatment is too expensive,
  check whether it needs to apply to every part of the component before weakening it everywhere.
- **A DOM probe that reads computed style before the node is in the document reads nothing.**
  Two rounds of visual comparison were judged from screenshots where the "new" colour was
  actually black at 10% — `getComputedStyle` on a detached subtree returns defaults, silently,
  and the render looked plausible enough to reason about. Append first, then measure; and when a
  probe result contradicts a number you already trust, suspect the probe.
- **A derived value has no override row.** The token table's promise is "override this variable
  and the component follows", so a row is only honest when the utility resolves to the variable by
  a path the guard can trace. Something that inherits from a step already listed — a leading from
  its type step — is prose, not a row; claiming it names a second override that does not exist.
- **When an emphasis cue reads wrong, check the ink against every theme before changing it.**
  The instinct was that the ring's colour was too strong; measuring each theme's alternative
  token showed the proposed softer ink dropped the emphasised state *below* the states it
  outranks in three of four examples. The ink was right and the geometry was wrong. A one-token
  swap that fixes the theme in front of you is the easiest way to break the three you are not
  looking at.

## T · From the pass that assembled a whole page out of the library

- **A compound component whose parts coordinate an exit needs every part to exist, not just
  the active one.** Tabs animates the *outgoing* panel and clears its own exit flag when that
  panel reports `animationend`. Render one panel bound to the selected value — the obvious
  saving when four tabs share one body — and the outgoing element never exists, so nothing
  ever reports the exit, the flag stays set, and the panel disappears permanently on the
  first switch. Nothing throws and nothing warns. The general shape: before collapsing N
  declarative children into one driven by state, check whether the parent's state machine
  *observes* those children; a lifecycle that is discharged by a child cannot be discharged
  by its absence.
- **A component's own unlayered CSS also beats a *caller's* utility, which turns "cap it with
  a width class" into a silent no-op.** The authoring-side rule is already written down (§L);
  the consuming side is where it actually bites, because the caller has no reason to suspect
  the class did nothing. A width or a `hidden` aimed at such a component belongs on a wrapper
  element, which has no unlayered rule to lose to. The tell is a utility that works everywhere
  else in the same file and not on that one component.
- **Composing the library into one realistic page surfaces a class of defect that per-component
  specimens structurally cannot.** Every trap in this section was invisible in a tile: the tile
  had one panel, never switched, was never capped, and never sat in a stretched grid cell beside
  a taller neighbour. A specimen proves a component works; only an assembly proves the
  components work *together*, and the two gates catch disjoint sets.

## U · From the pass that added light dismiss to a modal `<dialog>`

- **A press on a modal `<dialog>`'s scrim is dispatched at the dialog element itself, so the
  package's `useClickOutside` cannot guard one.** That hook asks whether the target is contained
  by the ref, and for a backdrop press the target *is* the ref — it reports "inside" for every
  press on the scrim and "inside" for every press on the panel, i.e. it can never fire. The only
  tell is geometry: compare the pointer's coordinates against the panel's own border box. Reaching
  for the hook first looks right, typechecks, and silently does nothing. The same trap runs the
  other way for anything the browser puts in the top layer.
- **Light dismiss keyed on `click` alone closes on a text selection dragged out of the panel.**
  Press inside the search input, drag past the edge, release: the click's target resolves to the
  common ancestor — the dialog — and a coordinate test on the release point alone reads "outside"
  and throws away what the user was editing. Require both ends of the press to land outside.
  Anything that measures only where a press *ended* has this bug, and a pointer-only manual pass
  will not find it.
- **A handler the component needs must be composed around a caller's, and sit after the rest
  spread.** Placing it before the spread lets `onClick` from a caller replace it, which deletes a
  behaviour the docs promise with no error anywhere. Composed after the spread — caller's handler
  first, then the component's, gated on `defaultPrevented` — the caller keeps both a hook and an
  opt-out. Note it in the docs: it makes those two props behave unlike every other prop on the
  element.

## V · From the pass that fixed the stat tile's charts

- **A `max-height` on a wrapper cannot resize a child that carries its own intrinsic size, so
  the cap silently becomes an overflow.** An `<svg>` with a `height` attribute ignores a cap on
  its parent: the wrapper's box clamps, the child keeps painting past it, and the parent's
  computed height comes up short by the difference. The overflow then lands in whatever padding
  the ancestor reserved and eats it — the visible symptom is a child sitting flush against a
  border, which reads as a missing-padding bug several elements away from the actual cause.
  Height belongs to whatever owns the intrinsic size; capping from outside is not the same
  instruction and does not fail loudly.
- **`vector-effect: non-scaling-stroke` breaks a draw-in animation built on `pathLength`
  normalisation.** The obvious pairing for a chart stretched by `preserveAspectRatio="none"` is
  to opt the stroke out of scaling so it doesn't render elliptical. But the dash pattern is then
  computed in screen space while `pathLength` normalises in user space, and the two disagree:
  the settled line renders in disconnected fragments. It typechecks, every unit test passes, and
  the computed styles all read correct — `animationName`, `strokeDasharray` and the finished
  play-state are all exactly what you'd assert. Only the paint is wrong. In practice the
  distortion it was meant to fix is invisible anyway, because a sparkline's slopes are shallow.
- **A default that needs an opt-in to be correct is the wrong default, even when it is
  documented.** Bars measured from `min(values)`, so the smallest datum was always an invisible
  zero-height rect and a near-flat series was inflated into full-scale swings. Both behaviours
  were written up as Gotchas with a workaround, which is what let them survive: prose describing
  a footgun reads as a decision. §L still applies — answer the prose rather than deleting it —
  but "it is documented" establishes only that someone noticed, not that it is right.
- **Direction and sentiment are two axes, and a component that conflates them cannot be fixed by
  its caller.** Colour keyed to which way a number moved is correct only for metrics where up is
  good; for churn, latency, error rate or cost it is inverted, and the documented workaround —
  map good/bad onto the direction prop — corrupts the arrow and the sign along with the colour,
  because they read the same prop. When one prop drives both a statement of fact and a judgement
  about it, no value of that prop is right. Split it, and default the judgement to the fact so
  existing callers are unaffected.
- **A test can pass on a renamed class by colliding with a different axis's vocabulary.** Moving
  colour off `--up`/`--down` onto `--positive`/`--negative`/`--neutral` left an assertion for the
  direction-neutral class green — because it was now matching the *sentiment*-neutral class of
  the same name. The assertion's name still said "direction". Where two axes share an element,
  give them non-overlapping vocabularies and assert both together, so neither can drift into the
  other unnoticed.

## W · From the pass that asked why a menu row's label sat against its icon

- **An icon slot that sizes only its own box has not sized the icon.** Where a component takes a
  glyph as content and wraps it, the wrapper's width and height are an instruction to the
  wrapper: an `<svg>` carrying its own `width`/`height` attributes paints at that intrinsic size
  regardless, overflows, and eats whatever gap or padding sits next to it. The visible symptom is
  a *spacing* bug — a label crowded against a glyph — several declarations away from the size
  declaration that looks correct and is being ignored. This is §V's intrinsic-size lesson in its
  other form, and the two together are the rule: whenever a slot's content can be an svg, the
  slot must size the child, not just itself. Where a sibling component instead takes the icon as
  a component *type* and forwards a class onto the svg, the same bug cannot occur — which is why
  one of these slots being correct says nothing about the next one.
- **`rem` inside a component whose text is a responsive token silently unpins the two.** The type
  scale steps at a breakpoint, so a box fixed in `rem` beside a label sized from a body token
  holds still while the label grows: the intended ratio is right at one viewport and wrong at
  the other, and it is wrong again for any theme that rescales its type — a consumer's theme
  gets a worse deal than the shipped one, which is the failure the theming rules exist to
  prevent. Anything meant to hold a ratio to text belongs in `em`, where the ratio is stated once
  and the type scale supplies the rest. Neither half of this is visible to a unit test: jsdom
  performs no layout, so the box, the overflow and the breakpoint are all unobservable there —
  the instrument is a screenshot at each side of the breakpoint.
