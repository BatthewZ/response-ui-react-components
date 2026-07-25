# Memory — `@batthewz/response-ui-react-components`

Index for future agents. Hub here, spokes beside it. Read the hub, then only the spokes your
task touches. Paths are package-relative unless stated.

**Snapshot when written:** 2026-07-26 · HEAD `ee59e65` · branch `docs/component-spokes-batch1`
· v0.9.0 **prepared, not published** · 454 ledger rows (364 open / 90 closed) · 6 verify guards

- lint + tsc, all green.

## Spokes

| Spoke                              | Read it when                                                       |
| ---------------------------------- | ------------------------------------------------------------------ |
| [traps.md](./traps.md)             | **Before planning anything.** What two passes got wrong, and how.  |
| [gates.md](./gates.md)             | Before you claim green — each guard and the class it cannot see.   |
| [ledger.md](./ledger.md)           | Touching `bugs/` — schema, verdicts, the oracle's known gap.       |
| [conventions.md](./conventions.md) | Writing or changing a component, its CSS, or its docs page.        |
| [testing.md](./testing.md)         | Writing a test here — three ways a test passes for a wrong reason. |
| [open-work.md](./open-work.md)     | Planning a pass — what is genuinely unfixed, and what is a door.   |
| [release.md](./release.md)         | Any version, dependency-range or publish work.                     |
| [history.md](./history.md)         | Reading `BUG_FIX_HANDOVER*.md` — provenance and how far to trust.  |

## If you read nothing else

1. **Brief from source, never from a summary — including this one.** Both prior handovers
   contained confident false figures; the second was written to correct the first and still
   staked four claims that adversarial verification refuted. Quote the claim, then measure it.
   See [history.md](./history.md).
2. **A green gate can mean less than it appears.** `verify:bugs` printed `FAIL` and exited `0`
   for its entire life. Know each guard's documented blind spot before you rest on it —
   [gates.md](./gates.md).
3. **No patch lands without a check observed failing first**, and re-break it once after it
   passes. A check you cannot show red never tested anything.
4. **Refuting a row is a full outcome** — but write it in `bugs/LEDGER.md`, not just the commit
   body.
5. **Never suppress a ts/eslint error.** `eslint.config.js` sets `noInlineConfig: true`, so a
   disable comment is itself a lint error. Fix, or hand back.
6. **Scope is this package only** — not `response-ui-css`, not `tw-merge`, _not even to add a
   script_. That boundary was crossed once and reverted in full.

## Found while writing this memory (recorded, not fixed)

**A live a11y defect, measured:** `Input`, `Select` and `Textarea` erase their own `aria-invalid`
when a `form.field()` binding is spread onto them — so a control with an error reports itself
valid to a screen reader. Three components that bypass `mergeProps`; no ledger row covers it.
Repro and call sites in [traps.md](./traps.md) §C. It is pre-measured and ready to file.

Two doc contradictions, neither visible to any guard:

- `AGENTS.md:305-306` (**published**) tells consumers `AvatarUpload`'s local-preview mode "is
  currently broken … finding #378", while `bugs/LEDGER.md:429` marks #378 `fixed · 3f5463e`.
  One of the two is wrong; neither a guard nor a test can tell you which. Measure it.
- `CONTRIBUTING.md:159-161` describes `prepublishOnly` as
  `build → verify:directives → verify:docs → typecheck → test`. The real chain in
  `package.json:52` also runs `gen-docs --check`, `verify-component-docs`,
  `verify-focus-affordance` and `lint`. Prose about a gate drifts exactly like prose about a
  component.

## Maintaining this folder

Add a spoke rather than growing one past ~120 lines, and link it in the table above. Record
**refutations and false starts**, not just fixes — the next agent's expensive mistake is
usually one someone already made and did not write down. Every claim here should carry a
`path:line` or a command someone can re-run; if you cannot cite it, mark it `(unverified)`.
