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
