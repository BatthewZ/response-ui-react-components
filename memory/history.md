# Why an inherited claim is worth less than you think

Two fix passes are documented at the workspace root (`BUG_FIX_HANDOVER.md`, then
`BUG_FIX_HANDOVER_2.md`, whose §6 corrects it). Confusingly, **§7 is the *earlier* pass's traps
and §6 the later one's** — both are consolidated in [traps.md](./traps.md).

**The first handover's diagnoses were reliable; its prescriptions were not.** It was accurate
about *where* things hurt and wrong about *why* and *how much*. Every quantified claim in it was
inflated, three by an order of magnitude. Measuring before dispatching work falsified eight of
them before a line was written — the single highest-leverage thing that pass did.

| Claim                                       | Measured                                                       |
| ------------------------------------------- | -------------------------------------------------------------- |
| "158 (14%) of tests are decorative"         | 7 (0.55%); the figure had no reproducible referent             |
| "Only 5 tests used `toHaveBeenCalledTimes`" | 179 occurrences across 41 files, at its own baseline           |
| "21 keyboard branches across 8 components"  | 10 across 5; both named examples were already fully tested     |
| "a trap across 121 usages, worth a sweep"   | Documented four times as deliberate. **Two lines** were wrong  |
| "Eight duplicate pairs confirmed"           | Zero. Merging any of them would have destroyed a commit ref    |
| "#242 removes the focus affordance"         | The replacement sits in the same declaration, one line over    |

**The corrective document was not clean either.** Adversarial verification refuted four of its
own eight staked checks, and two of those were real unfixed defects rather than wording problems.
Its author recorded that their error rate on unverified claims was not visibly lower than the
handover's. **Apply the same discount to this memory folder.**

The generalisable lessons:

- **A stake inherited from a document you have not verified is not a stake, it is a rumour with
  your name on it.** One pass staked a behaviour change purely because a "next steps" section
  listed it; the premise had been false in the README since before that pass began.
- **A "recommended next steps" section is not a contract**, and it may omit root causes named
  elsewhere in its own document.
- **An audit that lives outside the repo is an audit you will redo.**
- **Falsifying a claim early is cheaper than any fix**, and refuting is a full outcome — provided
  you write it where the next reader will look.
