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
