# Project docs — internal

Working notes for people and agents changing this package. **Not published**: `docs/` ships to
npm, so `package.json` excludes this one directory with `"!docs/project-docs"` in `files[]`.
Verify with `npm pack --dry-run --ignore-scripts` before assuming it still holds — a `files[]`
edit can silently re-include it, and there is no gate that would notice.

## Where a fact lives

Four homes, and the question that assigns a fact to one. Putting something in the wrong home is
how this package ended up with the same claim in three places, disagreeing.

| Home | Holds | Ask |
| --- | --- | --- |
| [`AGENTS.md`](../../AGENTS.md), [`CONTRIBUTING.md`](../../CONTRIBUTING.md) | Rules and conventions — **published** | *Must someone follow this?* |
| [`../../memory/`](../../memory/README.md) | How work here goes wrong | *Is it generalisable, and would you otherwise repeat the mistake?* |
| [`../../bugs/`](../../bugs/HANDOVER.md) | Open work | *Could a user notice it, or is it a gap in the checking?* |
| **here** | Settled decisions plus their evidence | *Would someone re-derive this at cost, and is it too specific to be a rule or a lesson?* |

A fact that answers none of the four does not need a file. That test is why the phase plans, lane
briefs and pass handovers that produced everything below are gone: their decisions are in the
conventions, their measurements are here, their lessons are in `memory/`, and the rest was
narration.

**Nothing here is status.** No phase trackers, no TODOs, no "next up". If a line reads as status it
has decayed — resolve it into a result or delete it.

## The spokes

| Spoke | Read it when |
| --- | --- |
| [cascade-and-slots.md](./cascade-and-slots.md) | You are about to move a declaration between CSS and utilities, measure this package's CSS payload, or re-open a question about `@layer components`, `className` or `classNames`. §13 is the list of things already settled — **check it before deriving anything.** |
| [slot-vocabulary.md](./slot-vocabulary.md) | You are naming a slot key, a subcomponent or a class. **Frozen**, and the ban list carries a reason per entry. |
| [slot-convention.md](./slot-convention.md) | You are adding `classNames` to a component and want the shape rather than the rule. Skeletons lifted from `StatCard` + `Sparkline`, the worked reference. |

**Section numbers are load-bearing and must not be renumbered.** They are cited from `AGENTS.md`,
from two component stylesheets, from `scripts/verify-slot-annotations.mjs`, and — most heavily —
by these three files about each other: 98 cross-document `§` citations at last count.
`cascade-and-slots.md` skips `§1`, where a goal statement that the code now demonstrates was
removed. Closing that gap would rot every citation above it.

## The order they win in

Where two of these disagree, the more specific and the more recently verified wins — but say so in
the file rather than fixing it silently in one place:

1. The source, and the gate that reads it. A measurement beats a sentence about a measurement.
2. `AGENTS.md` — the published rule.
3. `slot-vocabulary.md` for names, `slot-convention.md` for shape.
4. `cascade-and-slots.md` for why.

A refutation is a full outcome. Write it into the row it refutes; do not delete the claim and do not
strike it through in place.
