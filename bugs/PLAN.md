# Plan of attack — RETIRED

**This file no longer describes the work, and its numbers were wrong for two waves before anyone
acted on it.** It sized root-cause clusters against a 466-row ledger. That ledger now holds **24**
open rows and every cluster it tracked is closed. A stale plan is worse than no plan, because it is
still believed — the handover carried "**PLAN.md is stale**" as a housekeeping note through two
passes while readers kept citing it.

**The file is kept rather than deleted for one reason:** roughly thirty archived rows and
[`TAXONOMY.md`](./TAXONOMY.md) cite it by section number, and those citations are load-bearing
history. The map below is what those numbers meant. Nothing else here is maintained.

| Cited as | Was | Where that lives now |
| --- | --- | --- |
| `PLAN.md §1` | Rest props dropped by `as`-polymorphic wrappers | Closed — [`ARCHIVE.md`](./ARCHIVE.md) #9, #10. |
| `PLAN.md §2` | A rest-spread placed *after* the component's own handler | Closed. The house answer is `mergeProps` / `composeEventHandlers` in `src/util/merge-props.ts`; the failure mode, including the mirror-direction trap, is `memory/traps.md` §A. |
| `PLAN.md §3` | An `Omit`ted prop still delivered by a JSX spread | Closed, and now **gated**: `scripts/verify-omit-discipline.mjs`, whose header is the authoritative write-up. Its known blind spot is AUDIT #473. |
| `PLAN.md §4` | SSR / hydration | Partly closed. What remains is the reveal family's SSR clause — LEDGER #16, #182, #194 — each measured this wave, each left deliberately, each with its rejected alternative recorded in the row. |
| `PLAN.md §5` | Clusters not yet investigated; also the rule that cluster membership is joined at report time rather than stored as a per-row column | The **rule** still stands, and [`TAXONOMY.md`](./TAXONOMY.md) restates it for kind and harm. The cluster list itself is spent. |
| `PLAN.md §5b` | Focus styling out-specifying error styling | Closed (`567061e`, `b742101`). The recurrence to watch is unlayered component CSS beating a utility — LEDGER #483, `memory/traps.md` §L. |
| `PLAN.md §6` | Standing traps, each already paid for once | Superseded in full by [`../memory/traps.md`](../memory/traps.md), which is maintained and far longer. |

## If you want a plan

There is no cluster left large enough to need one. Work order comes from **harm**, defined in
[`TAXONOMY.md`](./TAXONOMY.md): blocking → content-loss → exclusionary → portability →
contract-only. The open rows are in [`LEDGER.md`](./LEDGER.md), and the shape of what remains is
summarised under "What is left" in [`HANDOVER.md`](./HANDOVER.md) — nine of the twenty-four are
owner decisions rather than engineering, and five cannot be fixed in this package at all.

**Do not rewrite this file into a new plan.** The next wave should be drawn by *file ownership*
across the open rows, which is what the handover's "Running a parallel wave" section describes and
what has now worked three times.
