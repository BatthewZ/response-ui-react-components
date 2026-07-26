# Why an inherited claim is worth less than you think

Two large fix passes ran on this package before these notes existed. Each ended with a handover
document. What follows is what those documents got wrong — not to discredit them, but because
the next agent will inherit something similar and needs to know the discount rate.

**The first handover's diagnoses were reliable; its prescriptions were not.** It was accurate
about *where* things hurt and wrong about *why* and *how much*. Every quantified claim in it was
inflated, three by an order of magnitude. Re-measuring before dispatching any work falsified
eight of them before a line was written — the single highest-leverage thing that pass did.

| Its claim                                   | Measured                                                     |
| ------------------------------------------- | -------------------------------------------------------------- |
| "158 (14%) of tests are decorative"         | 7, or 0.55%. The figure had no reproducible referent           |
| "Only 5 tests assert exact call counts"     | 179 occurrences across 41 files, at its own baseline           |
| "40 bare positive spy assertions"           | 63 — an *under*count, in the one direction nobody expects      |
| "21 keyboard branches across 8 components"  | 10 across 5; both examples it named were already fully tested  |
| "A trap across 121 usages, worth a sweep"   | The convention was documented four times as deliberate. **Two lines** were wrong |
| "Eight duplicate pairs confirmed"           | Zero. Merging any of them would have destroyed a commit reference |
| "This CSS rule removes the focus affordance" | The replacement sits in the same declaration, one line over    |

**The document written to correct it was not clean either.** Adversarial verification refuted
four of its own eight staked checks, and two of those were real unfixed defects rather than
wording problems. Its author recorded that their error rate on unverified claims was not visibly
lower than the handover's they were correcting. **Apply the same discount to these notes.**

The generalisable lessons:

- **A stake inherited from a document you have not verified is not a stake, it is a rumour with
  your name on it.** One pass committed to a behaviour change purely because a "next steps"
  section listed it. The premise had been false in the package's own README since before that
  pass began.
- **A "recommended next steps" section is not a contract.** One such section omitted two root
  causes named elsewhere in its own document, and the pass that followed it inherited the gap.
- **An audit that lives outside the repo is an audit you will redo.** One pass's per-row verdicts
  were never written into the tracked record; only a summary survived, in a file no repository
  contained. All of it was re-done from scratch.
- **Falsifying a claim early is cheaper than any fix.** Refuting is a full outcome — provided you
  write it where the next reader will look.
- **The quantities are the first thing to distrust.** Counts, percentages and "N files affected"
  were wrong far more often than the underlying diagnosis. A pass can be right that something
  hurts and badly wrong about how much.
