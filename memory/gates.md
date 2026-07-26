# What a green gate does not mean

This package leans on automated guards — RSC directives, export/doc coverage, generated example
fences, token tables, focus affordances, prop-type discipline, lint, types, tests. They are
good. These are the ways they have still let defects through.

- **A gate can be structurally incapable of failing.** The findings-ledger guard printed `FAIL`
  and exited `0` for its entire life, because the flag that makes it assert was never passed. It
  was caught while auditing a pass's own staked checks, not by anyone reading its output.
  **Once per pass, make a gate fail on purpose and watch it go red.** The same applies whenever
  you widen a guard's vision: after teaching the component-docs guard to see a class recipe
  hoisted into a shared util, a doc for a component that does *not* import it was falsified and
  watched go red. "The gate is green" and "the gate can still fail" are two separate
  observations, and only the second one is evidence.
- **Split a red gate's failures before fixing any of them.** One run came back red on 47 rows:
  16 were the script losing sight of a file it follows by relative path only, and 31 were real
  documentation drift. Conflating the two produces a script loosened until it hides the drift.
  Partition the list first, then fix each half on its own terms.
- **A new gate's exemptions are where the next bug lives.** A focus-affordance guard documented
  honestly that it inspects stylesheets only. A high-severity defect sat in exactly that blind
  spot — the same reset written as a utility class in a component file. Read a script's stated
  non-goals before resting on its tick; that docblock is usually the only place they are written
  down.
- **Guards check structure, never truth.** Token *tables* are verified against source; the prose
  beside them is not. A falsified sentence always passes, and a token that changes **role** — an
  accent moving from ink to edge — passes silently while the page keeps describing the old
  behaviour. After mechanical green, re-read the source assuming the doc is wrong. Every
  falsehood that has cost real time here was in a *sentence*, not a row, and a refactor that
  changes a utility's keying or value but not its name passes on every row it touches. **Grep
  the docs for the old literal as well as the new one.**
- **Drift is usually only checked in one direction.** The export/doc guard fails when an export
  is missing from the docs, and passes when the docs name an export that no longer exists.
- **Pooling a shared file into a component's "source" makes every variant of a class in that
  file look reachable from that component.** Once the component-docs guard was taught to attach
  the shared focus recipe to the components that import it, it stopped being able to tell which
  recipe a component uses: the file holds both keyings, so a token table can name either one and
  pass. Measured — flipping a doc row from the right keying to the wrong one left the gate green.
  A guard that resolves reachability at *file* granularity verifies that a utility exists
  somewhere in the pool, not that this component draws it. Where the distinction carries meaning,
  pin it with a render test that asserts the class string, not with the doc gate.
- **A doc can be too weak as well as wrong, and no gate sees that either.** When an unsupported
  prop was declared `onChange?: never`, every existing sentence stayed true — but the page now
  under-promised: passing it is a compile error, not a prop that quietly does nothing.
- **A gate run against stale dependencies tells you nothing.** Skipping the install step before a
  publish runs the whole suite against the *previous* version still on disk: everything passes
  and the change you are shipping was never loaded. Loud failure is a gift — silent success on
  the wrong inputs is the expensive case.
- **The type layer is not a runtime guarantee.** `Omit` is compile-time only, and TypeScript's
  excess-property check never applies to a spread of a *variable* — so spreading a form binding
  delivers the very `onChange` the props type removed, and neither the compiler nor the linter
  says anything. Every key omitted here is a legitimate DOM attribute, so React warns nothing
  either: the damage is behavioural — a dead handler, a clobbered value — and never a console
  message. What `tsc` *does* catch, measured: the same key as a direct JSX attribute (`TS2322`),
  and a wrong type on a **declared** key even through a spread (`TS2345`). It is silent only on
  excess keys. The one shape that closes the hole is declaring the key `?: never` and
  destructuring it out — a plain `Omit` makes the destructure itself an error (`TS2339`), while
  `?: never` permits it *and* turns the silent spread into a compile error.
- **A guard's own AST walk has blind spots that the source will find.** `interface X extends
  Omit<…>` parses as an `ExpressionWithTypeArguments`, not a `TypeReferenceNode`, so a walk
  handling only the latter drops those declarations without a word (`menu-internals.tsx:199`).
  Enumerate what your visitor *did* see and compare it against a grep before trusting a zero.
- **A defect class no gate can see recurs until someone builds the gate.** That one outlived two
  passes which each re-typed the symptom, until a purpose-built guard encoded the invariant.
  **Prefer building the guard over another round of instances.**
- **A minimal repro can give a false green.** For the case above, a spread bag of exactly one key
  *is* caught — by the degenerate `TS2559` "has no properties in common", which evaporates the
  moment you add a second key. So a one-key probe "proves" the hole is closed while the real
  binding, always several keys, slips straight through. Reproduce with the shape the caller
  actually uses, not the smallest shape you can write.
- **No gate here can see a performance fix at all, so a disabled one stays green forever.** A
  memoizing cache in the date utilities was short-circuited by a `return` on its first line —
  every call rebuilt the formatter the cache existed to reuse, and the whole cache body became
  unreachable. Types, lint and all 1931 tests passed, and the change was reviewed and committed
  as sound. Nothing was wrong with the gates: the tests assert *output*, and a bypassed cache
  returns identical output; `no-unreachable` is not among the two rules this lint config
  deliberately enables; and `tsc` treats unreachable code as an editor suggestion, not an error.
  Optimizations are the one class of change where green means only "still correct", never "still
  fast". Re-measure after the final restore — not after the last time you looked.
- **Prose about a gate drifts exactly like prose about a component.** A maintainer doc described
  the publish chain as five steps when it ran nine; the script itself is the only trustworthy
  source. If you document a chain, assert your description against it mechanically.
- **Closing a code row re-falsifies the page that recorded it, and no gate will ever say so.**
  The docs pass wrote pre-fix behaviour into Gotchas *by design*; the fix waves then closed
  hundreds of rows while only the latest lanes swept the spokes, so roughly 245 sentences
  across 60 pages went on describing already-fixed bugs — every gate green throughout, because
  prose truth is the one thing none of them measures. The worst survivors were false
  *cannot*s: pages telling consumers the library can't name a landmark, keep a tooltip open, or
  give them heading navigation, long after the ability shipped — a page that under-promises
  steers users away from working features and reads as authoritative while doing it. A fix is
  not landed until the component's spoke — and any neighbouring page citing the behaviour — is
  answered in the same increment; deferring that reconciliation compounds silently.
- **The docs generator deletes a section when you hand it an *empty* fence.** Adding a new
  example to a component page means writing the `<!-- example:Name -->` marker by hand and
  letting `gen-docs` fill the fence — but its marker pattern treats the fence body as optional
  and non-greedy, so an empty ```` ```tsx``` ```` block matches all the way to the *next*
  example's closing fence and the injection swallows every heading, paragraph and fence in
  between. The only signal is an `unused example` error naming a **different** example than the
  one you added, and `--check` then agrees with the damaged file because the damage is already
  written. Put a placeholder line inside a new fence before running it, and diff the page's
  heading list afterwards. This also fires across component boundaries: the generator rewrites
  every doc on every run, so an empty fence another agent has just added in a page you do not
  own gets eaten by *your* run.
