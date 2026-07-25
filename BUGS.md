# BUGS

> **Moved.** This file reached 285KB — past the 256KB ceiling on a single tool or agent
> read — and held three documents with three different lifecycles. It is now split under
> [`bugs/`](bugs/). **Finding numbers are unchanged and never change:** this file's own
> prose cited ~70 of them and published `AGENTS.md` cites `#378`.

| Where | What |
| --- | --- |
| [`bugs/PLAN.md`](bugs/PLAN.md) | **Start here.** The plan of attack — one section per root-cause cluster, each naming its member findings, its sweep command, its verification tool and its one-way doors. |
| [`bugs/LEDGER.md`](bugs/LEDGER.md) | Every finding, one row each. The single source of truth for *status* — evidence files never restate it. |
| [`bugs/components/`](bugs/components) | Evidence blocks for the high/medium findings, one file per component — sibling to `docs/components/<same>.md`. Append-only. |
| [`bugs/provenance.md`](bugs/provenance.md) | Batch notes and the "Clean (no findings)" list. History, not a work queue. |

The recording rules (severity, confidence tags, what counts as a code bug rather than a
doc bug) live in the workspace-root `COMPONENT_DOCS_PLAYBOOK.md`; the fix workflow lives
in `BUG_TRIAGE_PLAYBOOK.md`.
