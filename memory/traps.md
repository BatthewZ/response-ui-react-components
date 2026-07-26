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
  `--C-SURFACE-0`, so on a control sitting on surface-1/2 it reads as a halo. What
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
  fill.** `--C-BORDER-FOCUS` measures 2.22–14.84:1 against every surface in every theme
  — genuinely fine — while measuring 1.00:1 against `--C-ACCENT`, which three of the
  four themes make it byte-identical to. Always state *what* a ratio is against.
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
