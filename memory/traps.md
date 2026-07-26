# Standing traps

Two passes' worth of mistakes, kept because each cost real time and none are obvious in advance.
**§A is the earlier pass (`BUG_FIX_HANDOVER.md` §7), §B the later one
(`BUG_FIX_HANDOVER_2.md` §6).**

---

## A · Pass 1

- **A fix to a shared primitive does not reach components that bypass it.** Grep that the
  component actually *uses* the root before closing its row.
- **Fixing one defect can widen another.** Correcting `RangeSlider`'s `aria-invalid` merge turned
  an example's explicit-id workaround into a dangling IDREF — which is how **#440** was found. An
  example written around one defect will expose another when you fix it.
- **The obvious fix can be wrong in the mirror direction.** Swapping spread order to fix
  `aria-invalid` erasure passes the original test and erases the *caller's* value instead. Both
  directions are tested on five components; an order-swap "simplification" fails loudly.
- **Brief agents with the source, never with your summary.** Agents refuted three of that pass's
  own briefing claims, and one found a live bug in the reference implementation the others were
  told to copy.
- **Verify at the level of the claim.** `#127`, `#237` and `#439` were all mis-scoped in ways only
  visible by reading the component rather than the row.

## B · Pass 2

- **A test that mocks away an error is a bug report someone declined to file.** `StatCard`'s mock
  comment read *"to avoid IntersectionObserver issues"*. All 36 tests passed for as long as that
  comment stood, over a live crash. Grep for mocks whose comment explains what they prevent.
- **A green gate can mean less than it appears.** `verify:bugs` could not fail.
  `verify:component-docs` checks only token *tables* — a token that changes **role** (accent
  moving from ink to edge) passes silently, and falsified prose always passes.
- **`git add <paths>` + `git commit` is not atomic in a shared tree.** Two lanes had commits
  contaminated by a concurrent lane's staging. Use `git commit -F - -- <paths>` (pathspec).
- **Partitioning work by file prevents collisions and creates gaps.** Two fixes fell between lane
  boundaries — `Combobox.css`'s frozen weight, and `Collapsible`'s half of row #136. Both were
  caught by the sweep, not by a gate. *Something has to close the seams.*
- **Fixing one instance does not close a row.** #136 named two components; one lane owned one.
- **Refuting a row is a full outcome.** Five were refuted there. But **record it in the ledger** —
  a refutation living only in a commit body is invisible to the next reader.
- **Verify your own staked checks as hostilely as the work.** Adversarial verification refuted
  four of that pass's eight, and two of those were real unfixed defects, not wording problems
  (#118's DOM default, #73's missing ring). Its author's error rate on unverified claims was not
  visibly lower than the handover's.
- **Do not copy a claim into your own plan without re-testing it.** *"#90 theme restore"* was
  staked as a behaviour change purely because §8 listed #90 as work. The premise was already
  false — `README.md:86` had said "Persistence is not included." since before the pass began. **A
  stake inherited from a document you have not verified is not a stake, it is a rumour with your
  name on it.**
- **A new gate's exemptions are where the next bug lives.** `verify:focus-affordance` documents
  honestly that it reads CSS only — and a `high` row sat in exactly that blind spot.

---

## C · What applying §A to itself produced

Trap A1 says to grep that a component actually *uses* the primitive. Doing that, once, against
the `aria-invalid` merge programme found three more components with the identical defect and two
untested mirror directions — filed as **#455** and **#456**. The lessons, not the findings:

- **A trap list is only worth what you spend re-running it.** These traps were written by the
  people who fixed the class, and the class was still open in three files.
- **"Three components" is not an enumeration.** #434's row counted; only its detail block named.
  Three more went unlogged for a whole pass because a reader of the row could not tell what was
  covered. **Name every instance in the row itself.**
- **A claim can be true and still mis-scoped.** "Both directions tested on all five components"
  held — but the five tested were not the five that use the primitive, so two components with the
  gap sat inside a sentence that sounded complete.
- **Check whether the row you are extending was a false `fixed` before assuming it was.** #434
  was honest about what it closed; the defect was in what it left unnamed. Those are different
  failures with different fixes, and guessing wrong wastes the pass.
