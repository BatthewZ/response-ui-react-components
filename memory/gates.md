# What a green gate does not mean

- **A gate can be structurally incapable of failing.** `verify:bugs` printed `FAIL` and exited
  `0` for its entire life — `--check` was never passed. It was found while auditing a pass's own
  staked checks, not by anyone reading the output. **Once per pass, make a gate fail on purpose.**
- **A new gate's exemptions are where the next bug lives.** `verify:focus-affordance` documents
  honestly that it reads CSS only — and a `high` row sat in exactly that blind spot from the day
  it shipped. Read the non-goals in a script's docblock before resting on its tick; that docblock
  is the only place they are written down.
- **Guards check structure, never truth.** Token *tables* are verified; the prose beside them is
  not, so a falsified sentence always passes, and a token that changes **role** (accent moving
  from ink to edge) passes silently. After mechanical green, re-read the source assuming the doc
  is wrong.
- **Drift is only checked in one direction.** `verify:docs` fails when an export is missing from
  the docs, and passes when the docs name an export that no longer exists.
- **A gate run against stale dependencies tells you nothing.** Skipping `bun install` before a
  publish runs the whole suite against the *previous* version still in `node_modules`; everything
  passes and the thing you changed was never loaded. Loud failure is a gift — silent success on
  the wrong inputs is the expensive case.
- **`tsc` and `eslint` are both silent on a prop delivered through a JSX spread** — measured
  directly. No guard in this repo inspects a prop type, so the type layer is not a runtime
  guarantee and an `Omit<>` reproduces the class every time.
- **Prose about a gate drifts exactly like prose about a component.** `CONTRIBUTING.md`'s
  description of the publish chain was four gates out of date; the chain in `package.json` is the
  only source worth reading.
