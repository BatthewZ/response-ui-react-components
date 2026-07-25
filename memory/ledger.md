# The bug ledger

`bugs/LEDGER.md` — 454 rows, table starts `:45`. Evidence in `bugs/components/<name>.md` (79
files), root-cause clusters in `bugs/PLAN.md`, provenance in `bugs/provenance.md`. Oracle:
`scripts/bugs-ledger.mjs`. `BUGS.md` at the root is a pointer stub only. **`bugs/` is not
published.**

Counts at HEAD `ee59e65`: open 364 (`confirmed` 361, `unaudited` 2, `deferred` 1) / closed 90
(`fixed` 85, `refuted` 4, `wontfix` 1). Severity: high 31, med 222, low 201.

## Row schema

```
| # | Status | Component | [File.tsx:42](src/path/File.tsx#L42) | sev | summary |
```

- **id** — integer, unique, strictly ascending, **never renumbered**. Ids are load-bearing: cited
  ~70× internally *and from published docs* (`AGENTS.md:306` cites #378 by number).
- **Status** — `<status> · <evidence>`. Lifecycle: `unaudited`, `investigating`, `confirmed`,
  `deferred` (open) · `fixed · <sha>`, `refuted · <why>`, `wontfix · <reason>`,
  `superseded · #N` (closed). The validator **rejects a terminal status with no evidence**.
  `unaudited` carries a confidence tag: `corroborated | spot-checked | candidate | caveat`.
- **Component** encodes scope: `**response-ui-css**` = out of scope here; `**library-wide**` =
  library-wide *within this package* = in scope.
- **Anchor** — `src/` path with `#Lnn`. Alternatives allowed: `library-wide`, `cross-package`,
  `N files, see detail`.
- Every `high`/`med` needs a `### <id>` detail block (scenario → wrong result + one-line fix
  direction), in `LEDGER.md` or an evidence file.

**Status lives in exactly one place** (`LEDGER.md`) and **cluster membership in exactly one**
(`PLAN.md`). Evidence files never restate status. **Never delete a row** — it is provenance.

## The oracle's known gap — read `bugs/LEDGER.md:37-42`

`--check` verifies an anchor's file exists and its line number is *in range*. **Nothing checks
the line still contains the code the row describes.** One reconcile found **157 rotted anchors**.
A content fingerprint beside the line number would close it; nobody has written one.

Consequence for you: **cite a quoted phrase, not a line number, for anything outside `src/`** —
the guard only validates `src/` anchors, and README/AGENTS anchors have already rotted (a
citation to `AGENTS.md:298` in a handover now lands on unrelated router code; the real reference
is `:306`).

## The most corrosive error is a false `fixed`

Row #71 read `fixed · 7d48730` while its own sentence was still true. An `unaudited` row invites
investigation; **a false `fixed` forecloses it**. When you mark a row fixed, re-read the row's
sentence against source — not the commit that claimed it.

Related, and cheap to get wrong:

- **Fixing one instance does not close a row.** #136 named two components; one lane fixed one and
  closed it.
- **Verify at the level of the claim.** #127, #237 and #439 were each mis-scoped in ways visible
  only by reading the component, not the row.
- **Same-cause siblings are not duplicates.** The eight "duplicate pairs" a handover proposed
  merging were zero: `#436`/`#435` carry two different fixing SHAs, and merging destroys one.
- **343 rows once read `unaudited` because a prior audit's verdicts were never written to disk.**
  Aggregates in a handover are not a record. If a verdict is not in `LEDGER.md`, it does not
  exist.

## Workflow

Full method: workspace-root `BUG_TRIAGE_PLAYBOOK.md` (G1 investigate → G2 reproduce → G3 decide →
G4 patch → G5 reconcile+land). The parts that get skipped and shouldn't:

- **G2:** paste the red output. `confirmed · source` means *no red check yet* — G4 may not act on
  it. Never reason a row to `refuted`; measure it or defer it.
- **G4:** one root, one shape, **every** instance. Patching call sites where a shared fix exists
  is a defect, not a smaller change.
- **G5:** re-read `## Gotchas` on every affected `docs/components/<kebab>.md` before closing —
  ~68 of 90 spokes describe behaviour these passes change, and `docs/` **ships to npm**.
