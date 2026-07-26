# How a written record goes wrong

Lessons about `bugs/LEDGER.md` as a *record*. Its schema and workflow live in
`scripts/bugs-ledger.mjs` and the workspace `BUG_TRIAGE_PLAYBOOK.md`.

- **A false `fixed` is the most corrosive error the file can carry.** An `unaudited` row invites
  investigation; a `fixed` row forecloses it. #71 read `fixed` while its own sentence was still
  true. When closing a row, re-read the row's *sentence* against source — not the commit that
  claimed it.
- **A verdict that was never written down did not happen.** 343 rows read `unaudited` because a
  prior audit's per-row verdicts were never persisted; only an aggregate survived, in a file
  outside every git repo. Exhaustive search of `git log -p --all`, stashes and reflog recovered
  nothing.
- **Commit bodies are not a record.** #237's row says `fixed`, contradicting the earlier commit
  body that declared it would stay open. A later commit changed the facts and nobody reconciled
  the sentence.
- **A row that counts instances instead of naming them cannot be audited.** #434's summary said
  "three components"; its *detail block* named them, and three more components with the identical
  defect went unlogged for a whole pass. Filed since as #455. **Enumerate, always.**
- **Fixing one instance does not close a row.** #136 named two components and one lane owned one.
- **Refuting a row is a full outcome** — five were refuted in a single pass — but a refutation
  living only in a commit body is invisible to the next reader.
- **Same-cause siblings are not duplicates.** Eight "duplicate pairs" proposed for merging were
  zero; #435/#436 carry two different fixing SHAs and merging destroys one.
- **An index the tooling cannot verify will rot.** The oracle bounds-checks that an anchor's line
  *exists*, never that it still holds the code described — 157 anchors had rotted, better than a
  third of the table. **Outside `src/`, cite a quoted phrase rather than a line number**: nothing
  validates those at all, and a handover's `AGENTS.md:298` now lands on unrelated code.
- **The fix a row prescribes may be wrong.** #434's detail block recommends reordering the
  spread — which mirrors the bug onto the caller. What actually landed was a merge helper. Read
  the fix that shipped, not the fix that was proposed.
