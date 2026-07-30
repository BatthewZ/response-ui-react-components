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
- **An example module is a live component, not just doc source, and no gate renders it.** The
  dev gallery globs every example file and mounts all of them at once on one page, so an example
  that opens its overlay unconditionally — a scrim, a `role="dialog"`, a focus trap enabled with
  a literal `true` — takes the entire page hostage the moment that tab loads, and its dead
  Cancel button has nothing to close. Types, lint, tests and the docs check all stay green,
  because the generator only ever reads the `return` JSX as text. Any example demonstrating an
  overlay, a trap, or anything `fixed` and full-viewport must be driven by its own `open` state,
  with every action that looks like a way out actually wired to one. Load the gallery after
  touching one.
- **The consequence for anyone verifying in the browser: on the generated-examples tab, a clean
  console and a clickable page are not available signals.** Examples are mounted standalone, so
  one written as a doc snippet that assumes an ambient provider throws the moment it renders —
  caught by the gallery's boundary, but still a fistful of red in the console that has nothing to
  do with your change; and one that opens an overlay intercepts every click on the page, so a
  click that times out is not evidence about the thing you touched either. Establish which errors
  the tab throws *before* your change, drive that tab from a fresh load, and attribute nothing
  seen there without checking it against your own diff's file list first.
- **The instrument you decline is the one that would have contradicted you.** A plan here was built
  with visible retractions, corrected counts and a note demoting its own audit — and was still
  unfalsifiable, because the one measurement that could have produced a new refutation had been
  declined. The reason given was sound *for a different question*: an argument against screenshot
  baselines (rasterisation flake, sub-pixel contradictions) was applied to a question that was about
  **computed style**, where there is no baseline store and no rasterisation at all. When declining an
  instrument, name the question it would answer and check that your objection is about *that*
  question. Legible evidence discipline is not load-bearing evidence discipline; retractions are cheap
  when nothing can generate new ones.
- **A probe that cannot report its own inertness always agrees with you.** Have every measurement
  assert its **precondition** — the value the "before" side must have if the situation is being
  reproduced at all — and fail the run on mismatch, not just on a changed "after". Make an inert row
  exit non-zero: a green probe that measured nothing is worse than a red one, because it gets cited.
  Measured cost of not doing this: a new cascade probe returned nine rows of "unchanged" against a
  page whose stylesheet had never loaded.
- **A static asset path that does not resolve reads exactly like "no regressions".** A bundler's
  default absolute base, plus a `file://` origin, plus the `crossorigin` attribute it emits, produces
  a completely unstyled page — and then every computed value is a UA default, identical on both sides
  of an A/B. Serve the fixture over HTTP rather than working around one `file://` quirk at a time, and
  **assert that a known design token resolves before trusting any measurement in that page.**
- **A headless browser does not default to a developer's environment.** Headless Chromium reports
  `prefers-reduced-motion: reduce` unless told otherwise, which nulls every animation and makes an
  animation-related comparison agree everywhere for the wrong reason. Pin every media feature the
  probe depends on explicitly; leaving one unset is not the same as setting it to "no preference".
- **The media feature you cannot emulate is usually the one that matters.** Not every feature is in
  the devtools protocol's emulable set — passing an unsupported one silently does nothing rather than
  erroring. Where the only way to make a query match is to genuinely change the environment (actually
  disabling scripting, say), page script may no longer be available to measure with; read computed
  styles over the protocol instead. An environment state the app's own dev harness can never enter is
  precisely where an untested regression lives.
- **A control that holds is what turns a difference into a finding.** Measuring the same property
  with and without the consumer-side condition present is what separated "layering broke our own
  rule" from "layering let *someone else's* rule win" — two changes with the same symptom and
  completely different fixes. Include controls you expect not to move; a control that moves means the
  fixture or the understanding is wrong, and you have learned that before drawing a conclusion.
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
