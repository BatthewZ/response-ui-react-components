# How a written record goes wrong

This package keeps a findings ledger — one row per known defect, with evidence files and a
validator over it. These are the ways the record itself has failed, independent of any tool.

- **A false "fixed" is the most corrosive error the record can carry.** An unaudited row invites
  investigation; a row marked fixed forecloses it. One row was marked fixed while its own
  sentence was still true, describing behaviour the cited commit had deliberately preserved.
  When closing a row, re-read the row's *sentence* against the source — not the commit that
  claimed it.
- **A verdict that was never written down did not happen.** Several hundred rows read
  "unaudited" because a previous audit's per-row verdicts were never persisted; only an aggregate
  survived, in a file outside every git repository. Exhaustive search of history, stashes and
  reflog recovered nothing. The whole audit was redone.
- **Commit bodies are not a record.** One row is marked fixed, contradicting an earlier commit
  message that declared it would stay open. A later commit changed the facts and nobody
  reconciled the sentence. Two readers, two answers, no way to tell which is current.
- **A row that counts instances instead of naming them cannot be audited.** One summary said
  "three components"; only its detail block named them. Three *further* components carried the
  identical defect and went unlogged for a whole pass, because a reader of the row could not tell
  what was covered. **Enumerate, always.**
- **Fixing one instance does not close a row.** A finding naming two components was closed by
  work that touched one.
- **Refuting a finding is a full outcome** — five were refuted in a single pass — but a
  refutation living only in a commit body is invisible to the next reader.
- **Same-cause siblings are not duplicates.** Eight "duplicate pairs" proposed for merging turned
  out to be zero: same root, different components, different anchors, and in one case two
  different fixing commits. Merging would have destroyed a commit reference.
- **An index the tooling cannot verify will rot.** The validator bounds-checks that a cited line
  *exists*, never that it still holds the code described. A single reconcile moved 157 rotted
  anchors — better than a third of the table — and no gate would have caught one of them. Line
  numbers shift under every patch above them.
- **Cite a quoted phrase, not a line number, for anything the validator does not check.**
  References into prose files are validated by nothing; one such citation now lands on unrelated
  code several sections away from what it claimed.
- **One severity word cannot carry two questions.** A findings table needs to answer *what kind of
  defect is this* (accessibility, behaviour, API contract, design-token contract, environment,
  repo health) and *how badly does it hurt whom* (blocking everyone, losing content, excluding a
  subset, breaking only a second theme, invisible to every user alive). This ledger's `Sev`
  blended them, so a row that hides text and a row that names the wrong surface token both read
  `med` for hundreds of rows. Classify on both axes or accept that priority order is guesswork.
  A third axis — what shape the fix takes — is what groups rows into work; it is not the same
  question either, and a single fix shape routinely spans several kinds.
- **The fix a finding prescribes may be wrong.** One detail block leads with a reordering that
  would mirror the bug onto the caller; what actually shipped was a per-key merge. Read the code
  that fixed it, not the plan that proposed it.
- **A row can have two halves, and closing one is not closing the row.** "Status conveyed by
  colour alone" is two claims — nothing reaches assistive tech, and nothing is visible without
  colour — and a text-only remedy answers the first while leaving the second exactly as it was.
  The same shape recurs wherever a finding names both a non-visual and a visual channel. Say
  which half closed, in the row; a half-closed row filed as fixed reads to the next reader as a
  question already settled.
- **Evidence density is not correctness, and detail reads as authority.** The single most
  evidenced row in this file — a detail block with a table of line numbers across three
  components, asserting a live WCAG 4.1.2 failure — was wrong. It caught the panel side of an id
  overwrite and was silent about the identical overwrite on the trigger side, so both ends had
  agreed all along. A false `confirmed` wearing a table is harder to dislodge than a bare one,
  because the next reader spends their scepticism on the conclusion and none on the workings.
- **A detail block must be retired with its row.** Five outlived theirs in one pass. A block
  left in the work list reads as current, which is precisely how the wrong analysis above went
  on asserting a defect that measurement had already closed.
- **Read the component's own doc page before filing or fixing — it is the cheapest refutation
  available.** Five findings were disproved in one pass and *three* of them died on the docs, not
  the code: a component that "does not scroll", a callback that "fires before any scroll", and a
  size/semantics split that a whole doc section exists to sell. In each case the behaviour was
  deliberate, documented, and changing it would have been the breaking change — not the fix.
- **A brief can carry a false premise, and the agent working from it may be the one to find
  out.** One lane was told a fix was almost certainly out-of-package, with the reasoning
  attached. It measured the reasoning, found an in-package route the premise had excluded, said
  so, and did it anyway. Write briefs so the premise is visible and challengeable, and treat
  "your instruction was wrong" as a successful outcome rather than a deviation.
- **A control that proves the fix works is not a control that proves the fix was needed.** The
  most rigorously evidenced row in the archive shipped a visual cue with a browser measurement
  across four themes, a greyscale screenshot, and a negative control that reproduced the defect
  on demand and restored it. All of it was sound, and all of it tested *sufficiency* — that the
  new cue reads without colour. None of it tested the row's premise, that the two states had
  previously been distinguishable by colour alone; the two tokens involved were ~15:1 apart in
  luminance, so that premise was false and a weaker cue would always have sufficed. The
  screenshot could not have caught this, because it was taken *after* the fix. When a row
  justifies a change by what the old state lacked, the control has to be run on the old state.
- **Preserving refutations *in place* buys honesty and spends legibility, and past a threshold the
  document needs a reading guide to be safe.** One plan followed the rule "strike a refuted claim,
  never delete it" until live prose, struck prose and severity-demoted prose were fully interleaved.
  Every sentence then had to be read twice — once for content, once to check whether it still
  applied — and the plan could not be executed without a separate briefing telling the reader which
  parts to distrust. The rule was right; fusing the genres was the error. Keep a plan in the
  imperative and current-truth-only, and move refuted claims to a *settled, do not re-derive*
  section at the bottom with their outcome. Nothing is deleted and nothing has to be re-derived, but
  the reader no longer needs to be told how to read.
- **Evidence that cites a generated artifact's byte offsets invalidates itself on the next build.**
  A plan's headline row proved "component CSS is unlayered" with offsets into compiled CSS
  (`utilities` spans 8365–30931, `.stat-card` at 91825). The *claim* was still true when re-checked;
  every *number* was wrong, because the build moved them. A number that cannot be recomputed is not
  evidence, it is a hostage. **Cite the command, not the constant** — and where a count depends on
  how you count (declarations vs lines, with or without test files, which files count as
  "components"), state the method beside the number or it will be quoted bare and size real work.
  Same pass: a lane-sizing figure of "67 test files" turned out to be unreproducible under seven
  different definitions spanning 34–99.
