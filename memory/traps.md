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
