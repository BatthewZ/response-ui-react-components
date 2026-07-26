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
- **The type layer is not a runtime guarantee.** `Omit` is compile-time only and TypeScript's
  excess-property check never applies to a spread of a *variable*, so
  `<Switch {...form.field("on")} />` delivers the very `onChange` the props type removed, and
  both `tsc` and `eslint` say nothing. Every omitted key here is a legitimate DOM attribute, so
  React warns nothing either — the damage is behavioural, never a console message.
- **A defect class no gate can see recurs until someone builds the gate.** The above outlived two
  passes that each re-typed the symptom; `verify:omit-discipline` (`00f6b03`) finally encoded the
  invariant. **Prefer the guard over another round of instances.**
- **A one-key probe gives a false green.** A spread bag of exactly one key *is* caught (TS2559),
  so a minimal repro of this class "passes" while the real `useForm` binding — always several
  keys — slips through. Reproduce with the shape the caller actually uses.
- **Prose about a gate drifts exactly like prose about a component.** `CONTRIBUTING.md`'s
  description of the publish chain was four gates out of date; the chain in `package.json` is the
  only source worth reading.
