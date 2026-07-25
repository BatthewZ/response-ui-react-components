# Pass history & how far to trust the handovers

Handover docs live at the **workspace root** (`/home/wyrez/coding/@batthewz/`), outside every git
repo — which is why one pass's audit was unrecoverable when only an aggregate survived.

| Doc                       | Pass                | Traps section        |
| ------------------------- | ------------------- | -------------------- |
| `BUG_FIX_HANDOVER.md`     | Pass 1 (earlier)    | §7                   |
| `BUG_FIX_HANDOVER_2.md`   | Pass 2 (later)      | §6                   |
| `BUG_TRIAGE_PLAYBOOK.md`  | durable method      | G1–G5, §9 "do not"   |
| `COMPONENT_DOCS_PLAYBOOK.md` | durable method   | docs rules           |
| `BRIEF.md`                | scope + doors       | —                    |

Both traps sections are consolidated in [traps.md](./traps.md). Numbering is confusing: **§7 is
the *earlier* pass, §6 the later one.**

## `BUG_FIX_HANDOVER.md` — diagnoses reliable, prescriptions not

Pass 2 measured its claims before dispatching work. **Every quantified claim was inflated, three
by an order of magnitude**, and eight were falsified before a line was written. A sample:

| Its claim                                     | Measured                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| "158 (14%) of tests are decorative"           | **7** (0.55%). The 158 has no reproducible referent                                     |
| "Only 5 tests used `toHaveBeenCalledTimes`"   | **179 occurrences across 41 files** at its own baseline                                 |
| "40 bare positive spy assertions"             | **63** — an *under*count                                                                |
| "21 keyboard branches across 8 components"    | **10 across 5**; both named examples were already fully tested                          |
| "StatCard **and Tabs** mock `() => true`"     | Only StatCard. **7 of 9 files hardcode `false`** — the mirror defect it never named     |
| "#242 `focus:outline-none` removes the UA fallback" | `Input.tsx:25` carries `focus:ring-2 focus:ring-border-focus` in the same declaration |
| "RC-7 — a trap across 121 usages"             | The descending scale is documented 4× as deliberate. **Two lines** were wrong           |
| "Eight duplicate pairs confirmed"             | **Zero.** Same-cause siblings; `#436`/`#435` have two different fixing SHAs             |
| "a 439-row ledger"                            | **440** — and row #440 was added by that pass and never audited                         |
| "react-components 0.8.3"                      | **0.8.3 was never published**; npm goes 0.8.2 → 0.9.0                                   |

**Its §2 audit is unrecoverable** — exhaustive search of `bugs/`, `git log -p --all`, stashes and
reflog found no per-row verdicts anywhere.

**It was accurate about *where* things hurt and wrong about *why* and *how much*.** Briefing an
agent from it directly is unsafe. Quote the claim, mark it suspect, measure.

## `BUG_FIX_HANDOVER_2.md` — corrective, and still not clean

Written to correct the above, and **adversarial verification refuted four of its own eight staked
checks** — two of those were real unfixed defects, not wording problems (#118's DOM default, #73's
missing ring). Its author recorded that their own error rate on unverified claims was not visibly
lower than the handover's. Apply the same discount to this memory folder.

## What pass 2 landed

`docs/component-spokes-batch1`, 27 commits, 116 files, +4502/−889.

```
baseline  111 files / 1273 tests · tsc silent · 6 guards · 16 dead suppressions in src
now       112 files / 1369 tests · tsc silent · 8 guards · 0 suppressions in src
ledger    454 findings · 85 closed
```

Fixed, each red-first and re-broken: #118 (disabled menu item ran the caller's `onClick`, then
also the DOM default, so a nested `<a href>` navigated) · #302 (Wizard state bled between steps) ·
#136 (Accordion **and** Collapsible collapsed panels stayed tabbable) · #141/#133 (Pagination
re-fired `onPageChange`; ink invisible at 1.00:1 in `tech`) · #113/#114 (ContextMenu unreachable
by keyboard) · #186 (Carousel stole arrow keys from inputs) · #211 (Rating never named `max`) ·
#134 (Stepper indicators unnamed) · #256 (`useFieldArray` errors on the wrong row) ·
#116/#275/#264/#398/#393 (state cued only by a 1.02–1.16:1 wash) · a `StatCard` crash where
`IntersectionObserver` is absent.

**Refuted with evidence — a full outcome:** #90, #242, #163, #296, #123.

Two gates added (`verify:focus-affordance`, `lint`), and **`verify:bugs` was repaired**: it
printed `FAIL` and exited `0` for its entire life because `--check` was never passed.

## Key SHAs from pass 1

`567061e` foundation (prop merging, controllable-state gate, focus vs error) · `7d48730` a
caller's props no longer replace a component's own (11 components) · `236e6a0` the `form.field()`
cluster, three doors, and the `aria-invalid` merge · `6626d7f` default `type="button"` ·
`ae113f8` corrections to what that pass's own adversarial review refuted.
