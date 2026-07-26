# What a green gate does not mean

This package leans on automated guards — RSC directives, export/doc coverage, generated example
fences, token tables, focus affordances, prop-type discipline, lint, types, tests. They are
good. These are the ways they have still let defects through.

- **A gate can be structurally incapable of failing.** The findings-ledger guard printed `FAIL`
  and exited `0` for its entire life, because the flag that makes it assert was never passed. It
  was caught while auditing a pass's own staked checks, not by anyone reading its output.
  **Once per pass, make a gate fail on purpose and watch it go red.**
- **A new gate's exemptions are where the next bug lives.** A focus-affordance guard documented
  honestly that it inspects stylesheets only. A high-severity defect sat in exactly that blind
  spot — the same reset written as a utility class in a component file. Read a script's stated
  non-goals before resting on its tick; that docblock is usually the only place they are written
  down.
- **Guards check structure, never truth.** Token *tables* are verified against source; the prose
  beside them is not. A falsified sentence always passes, and a token that changes **role** — an
  accent moving from ink to edge — passes silently while the page keeps describing the old
  behaviour. After mechanical green, re-read the source assuming the doc is wrong.
- **Drift is usually only checked in one direction.** The export/doc guard fails when an export
  is missing from the docs, and passes when the docs name an export that no longer exists.
- **A gate run against stale dependencies tells you nothing.** Skipping the install step before a
  publish runs the whole suite against the *previous* version still on disk: everything passes
  and the change you are shipping was never loaded. Loud failure is a gift — silent success on
  the wrong inputs is the expensive case.
- **The type layer is not a runtime guarantee.** `Omit` is compile-time only, and TypeScript's
  excess-property check never applies to a spread of a *variable* — so spreading a form binding
  delivers the very `onChange` the props type removed, and neither the compiler nor the linter
  says anything. Every key omitted here is a legitimate DOM attribute, so React warns nothing
  either: the damage is behavioural — a dead handler, a clobbered value — and never a console
  message.
- **A defect class no gate can see recurs until someone builds the gate.** That one outlived two
  passes which each re-typed the symptom, until a purpose-built guard encoded the invariant.
  **Prefer building the guard over another round of instances.**
- **A minimal repro can give a false green.** For the case above, a spread bag of exactly one key
  *is* caught by the compiler, so a one-key probe "proves" the hole is closed while the real
  binding — always several keys — slips straight through. Reproduce with the shape the caller
  actually uses, not the smallest shape you can write.
- **Prose about a gate drifts exactly like prose about a component.** A maintainer doc described
  the publish chain as five steps when it ran nine; the script itself is the only trustworthy
  source. If you document a chain, assert your description against it mechanically.
