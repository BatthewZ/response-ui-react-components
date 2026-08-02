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
- **When you teach a gate to accept a change, pin the accepted value and require a written reason —
  or you have built a mute button.** The cascade probe grew an `expectAfter` + `accepted` pair so one
  owner-signed-off regression could stop failing the run. Two properties are what keep it a gate: the
  accepted row **still fails if it drifts off the pinned value** (accepting a change is not excusing
  the row from measurement), and a row declaring `expectAfter` with no `accepted` sentence **refuses
  to run at all**, because an unexplained exemption is indistinguishable from a silenced regression.
  A third guard rejects `expectAfter === expectBefore`, which would dress an ordinary stable row as a
  decision and hide that it is being asserted. Both guards were made to exit non-zero on purpose
  before being trusted — and the first attempt to check that read `$?` after a pipe into `head`, so it
  reported success from `head` while the guard's own status was never inspected. That is the same
  shape as the ledger guard that printed `FAIL` and exited `0` for its entire life: **when you verify
  an exit code, verify it unpiped.**
- **Two rows can measure identically and mean opposite things, and the summary line cannot tell you
  which.** Layering produced `2px → 0px` twice. One was a *consumer's* reset out-ranking our focus
  ring — a policy question, and accepted. The other was *our own* `focus:outline-none` utility
  out-ranking our own forced-colors outline, because `@layer components` sits below
  `@layer utilities` — a WCAG 2.4.7 defect caused entirely in-package that nobody had accepted.
  Identical numbers, identical direction, different author of the winning rule, opposite dispositions.
  A decision recorded against "focus rings" rather than against *a named mechanism* would have closed
  both. **Scope an acceptance to the mechanism, and say in the row what it does not cover.**
- **A probe whose only pass state is "before equals after" cannot express an accepted change — so a
  policy decision can silently make its own gate unsatisfiable.** The cascade probe passes a row only
  when the A and B computed values match. That is the right default: it makes every difference a
  finding. But one of the seven differences it found is a *policy* question (should a consumer's
  `*:focus{outline:none}` be able to delete our focus rings?), and if the answer is "yes, accept it",
  the row stays red for ever and the phase's own definition of done — "probe green" — can never be
  met. Nobody noticed, because the gate and the decision were written in different sections. When a
  gate asserts "nothing changed" over a set that includes deliberate changes, it needs an
  `expectAfter` before the first deliberate change lands, and the DoD has to say which.
- **A probe's row list is an allowlist, and the rows nobody wrote are the ones that ship.** The same
  probe enumerates nine hand-written cases and found seven regressions — genuinely the best
  instrument in the repo. But `Hero.css` has two rules keyed on foundation-owned classes
  (`.stagger-item`, `.scroll-reveal-hidden`), one of them structurally identical to the case the
  probe *does* cover, and neither has a row. The gate would have gone green with Hero broken. Derive
  the row set from a search over the source (here: one grep for foundation-owned class names, which
  returns 7 rules in 4 files) and assert the count, rather than hand-listing what you happened to
  think of. A gate that enumerates is only as complete as the enumeration.
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
- **A gate that reads only one of a file's two doors is green about the wrong thing.** The cascade
  probe derives its stylesheet list from `src/styles.css` and builds no JS graph — so when one
  component *also* imported its own `.css` from its `.tsx`, the bundler injected a second,
  **unlayered** copy that out-ranked the layered one, and the probe reported the whole layering
  move healthy while that one component was still unoverridable in every source consumer,
  including this repo's own dev app. Measured in the real dev bundle: two `.rui-grid{` copies,
  one in `@layer components` and one outside, collapsing to one after the import was deleted; and
  `<div class="rui-grid grid-cols-2">` computed three columns before and two after. When an
  instrument reads *source*, ask what the *bundler* does with the same files. The guard that
  closes it is one grep with no allowlist, which is the profile worth reaching for: it cannot be
  satisfied by a lie.
- **A probe capability that is set up and then torn down measures the un-set-up state.** Forcing
  `:hover` over the devtools protocol and then **detaching the session** clears the forced state
  immediately, so the read that follows is the unhovered value — and the row reports INERT while
  looking like a real measurement. It read as "the engine cannot see hovered scrollbar
  pseudo-elements", and that conclusion was wrong: keeping one session alive per page and clearing
  the state explicitly afterwards reproduced the hovered value exactly. Before concluding an
  instrument *cannot* observe something, prove the instrument observes a value you planted on
  purpose. A distinctive sentinel colour settled it in one run.
- **Widening a guard's vocabulary is how it goes blind, not how it goes red.** Adding
  `not-forced-colors:` to a focus reset made `verify:focus-affordance` stop recognising the reset
  at all, so it dropped every site using it out of coverage — and still printed OK. The number
  that showed it was the coverage count in its own headline: **18 covered controls fell to 11**,
  with the exit code unchanged at 0. A guard's summary line is evidence only if you compare it
  against the run before. After widening, make it fail on purpose *through the widened path*, not
  through some other one.
- **An instrument that supplies the condition it is testing cannot test it.** The cascade probe
  builds an A/B by reading the import list out of `src/styles.css`, **stripping** whatever `layer()`
  is written there, and adding its own — which is right for measuring *what layering does*, and
  makes it structurally blind to *whether the shipped file is layered at all*. Delete
  `layer(components)` from one real import and the probe still compares "no layer" against "layer",
  reports every row unchanged, and exits 0; types, lint and every test agree, because jsdom applies
  no stylesheets. A whole phase whose result was one keyword repeated on one line per component stylesheet had no gate
  reading those lines. The fix was ~100 lines of `@import` parsing with no allowlist, where an
  import it cannot classify is a *failure* rather than a skip. **Ask of any A/B instrument: does it
  construct the "before" or the "after" side itself? Whatever it constructs, it cannot observe.**
- **A row whose competitor sets the same value as the foundation can never have teeth, and that
  is the finding.** A component's `:hover` scrollbar-thumb colour was byte-identical to the rule
  it was beating, so no reading could distinguish "our rule won" from "theirs did". Once the
  component's CSS was layered it could not win in any state — inert everywhere, which is the shape
  that gets cited as safe. The honest resolution was to **delete the declaration** and re-point
  the row at the foundation's own values, so the row still reddens if anyone re-adds a rule. An
  `accepted` row whose underlying rule has been deleted goes INERT, so "accept it" and "leave the
  CSS in place" cannot both be done.
- **A class-string assertion is a test of the input, not of the outcome.** Replacing a component
  stylesheet with utilities can be asserted in jsdom only as "the component now emits these class
  names" — which is true of a typo, a class no build generates, and a class that generates
  something else entirely. The suite is green either way, because CSS is stubbed to `""`. The
  instrument that closes it is cheap and worth building for one afternoon: compile the *deleted*
  stylesheet and the *new* utilities into one real Tailwind build, put both markups on one page,
  and diff `getComputedStyle` across a few viewport widths so the breakpoints actually fire. One
  build and one page means there is no build-to-build variance in the comparison at all. Prove it
  has teeth by changing one count in the new markup and watching the row go red before believing
  the green one.
- **That one-build probe has a contamination trap, and passing teeth does not clear it.** If the
  conversion *keeps* the BEM class as a declaration-free marker — which this package's convention
  requires — then the new markup still carries the very selector the deleted stylesheet defined,
  and inside the probe's single build that stylesheet is still loaded. The new side silently
  inherits every declaration the utilities failed to replace, and the probe reports "no
  difference" for exactly the cases it was built to catch. The deliberate-mismatch row still goes
  red, because that row's difference does not depend on the leak. **Rename the deleted
  stylesheet's selectors in the probe's copy** so the two sides cannot share a rule. Doing that
  turned a clean 30-reading run into two real regressions on the same code.
- **Take the "after" string from the component, not from your own fingers.** A fixture with
  hand-retyped class strings measures what the author believed the component emits. Render the
  real component with `renderToStaticMarkup` and read the class attribute; it costs three lines
  and removes the only remaining place the probe can agree with a wrong belief.
- **A gate whose pass state is "reachable OR annotated" needs a third assertion, because both
  halves can go to zero at once.** A reachability check over `className` attributes passes trivially
  on any directory where every attribute happens to be reachable — which is most of `layout/`,
  `animation/` and `guards/` — so "0 failing" there is not evidence that the annotation half works
  at all. Measured: `src/components/layout` reports 8 attributes, 8 reachable, 0 failing, and the
  only thing standing between that and a green tick is an explicit *zero-annotated is a failure*
  check. Three vacuity guards, not one: zero attributes found (bad root or bad glob), zero
  annotated (the annotations reverted, or the comment walk stopped working), and an attribute the
  parser cannot classify — the last a **failure, never a skip**. Each was made to exit non-zero on
  purpose, unpiped, before the gate was believed.
- **Exercise every branch of a gate's verdict function, not just the one the tree currently
  produces.** The `className` gate has six failure branches — unannotated, malformed marker, wrong
  triage letter, contradiction (annotated *and* reachable), no sites, no annotations — and the
  first is the only one a normal red run ever prints. The other five were reachable only by
  planting one violation each in a throwaway copy of the tree. A branch nobody has watched fire is
  indistinguishable from a branch with a typo in its condition, and this is the same shape as the
  ledger guard that printed `FAIL` and exited `0`: **the verdict you never provoked is the verdict
  that does not work.** Giving the script an optional root argument is what made this cheap — the
  fixture is a `cp -r` of one directory plus a symlinked `node_modules`, and `src/` is never
  touched.
- **When a gate lands before the work it gates, say which kind of "red" it is.** This one arrived
  with 17 real violations in `src/` (`Meter`, `RequireAuth`, `Alert`, `CopyButton`, `ErrorBoundary`,
  `Spinner`, `ThemeSwitcher` — every one a component no lane owned), and not one of them a false
  alarm: partitioned by initialiser shape, 14 bare string literals, 2 `cn(…)` composing modifiers
  with no caller value in the call at all, 1 module-level static read through a local. That is a
  **backlog**, not a broken gate, and the distinction only survives if it is written down the day
  the script lands; otherwise the next person meets a red `prepublishOnly` and loosens the script.
  Partition the failures mechanically before reporting a single one (`split a red gate's failures`,
  above), and prove a green state exists somewhere — `src/components/form` is 80 attributes, 65
  reachable, 15 annotated, exit 0.
- **A gate written from a spec, against a tree the spec predates, encodes the spec's blind spot.**
  The rule was drafted as "reachable OR annotated `(a)`/`(b)`", from a convention doc written when
  `(a)` and `(b)` were the only letters anyone had shipped. A lane then landed 21 `slot:(e)`
  annotations — `FileUpload`'s `renderPreview`/`renderFile` subtrees — and the first run reported
  all 21 as failures. The reflex is to add them to a set; the fix was to work out what the set
  *means*. It is not "letters we have seen": it is **does the consumer's need have a route
  somewhere other than this attribute**. (a) none owed, (b) a custom property, (e) a `render*`
  prop — all settling; (c), (d) and (f) each end in a `className` merge, so a settled one is
  reachable and needs no comment at all. Stating the discriminator turned an arbitrary
  three-element allowlist into a rule that decides letters nobody has invented yet. **Run a new
  gate against the tree before you finish writing its rule**, and when it disagrees with source
  a lane reasoned about carefully, suspect the rule first.
- **Port the `var(--x, N)` fallback, not just the `var(--x)` read.** A component stylesheet that
  resolved its scale through `var(--scale, 1)` was answering two questions: what the caller asked
  for, *and* what happens when they asked for nothing at that step. A lookup table keyed on the
  caller's input answers only the first, so a prop like `columns={{ md: 3 }}` emits no base class
  at all and the element falls back to the CSS *initial* value rather than the stylesheet's
  default. `grid-template-columns: none` is not `repeat(1, minmax(0, 1fr))` — the implicit track
  is `auto`-sized, so a long unbreakable word widens the grid past its container instead of
  wrapping. Enumerate the fallbacks in a deleted stylesheet as declarations in their own right.
- **A gate whose verdict is a judgement letter can be satisfied by a dishonest letter, and the
  only defence is what the reason has to say.** Every unreachable element takes a settling letter
  in one edit, so a lane under time pressure can turn a red gate green without triaging anything
  — the pattern only rejects an *empty* reason. Require the reason to state **what a consumer
  would break by getting a route**, not that the class is static: "static utility" is true of
  every failing site and therefore evidence about none of them, while "dropping `sr-only` prints
  the confirmation beside the button" is a claim a reviewer can go and refute. Where the same
  shape has already been ruled elsewhere in the tree, cite the sibling ruling rather than
  re-deriving it — a triage that disagrees with an identical neighbour is the one worth reading.
- **Before building the gate a plan asks for, measure whether the drift it names is drift.**
  A mirror gate was specified as "a named token value added to the CSS and not to the merge
  helper's list is the only real drift". Measured against the installed tailwind-merge, the
  default theme scale for `color` is `isAny` — so an unmirrored *colour* name still dedupes,
  identically, across 12,474 class pairs built from every colour-taking prefix. The controls
  are what make that a finding rather than a null result: the default `spacing` and `text`
  scales are restrictive, and the same experiment shows those extensions genuinely changing
  the merge. So the honest gate asserts a *documented coupling* that is load-bearing for the
  namespaces nobody has used here yet, and it has to say in its own output that the namespace
  it currently guards is not one of them. A gate that quietly implies a live bug it cannot
  demonstrate spends the same credibility as a false doc.
- **Widening a gate's vocabulary and then counting the new route's coverage will flatter it,
  because the attribution order decides the number.** A doc gate taught to see tokens reached
  through an arbitrary utility value reported seven claims resolved that way on first run —
  and every one of the seven was already resolvable through the route the gate had all along.
  Ordering the new route *last*, so its bucket counts only claims no older route can settle,
  reported zero, which was the truth: the widening had added a capability nothing yet used.
  That zero is what turned into a real number once the docs it unblocked were written, and it
  is now the only signal that the route still works. Put a new route at the end of the
  attribution chain, not the front.
- **A doc that explains why something is undocumented is a bug report nobody filed.** Two
  component pages said their scrim was left out of the token table "on purpose", naming the
  gate's inability to resolve that shape of utility as the reason. The prose was accurate,
  survived every green run, and had quietly converted a fixable gate limitation into a
  documented convention — the same shape as shipping a defect and writing it up as a Gotcha.
  When a page explains an omission by citing a tool, the finding is the tool's, and grepping
  the docs for the tool's own name is how you find the rest of them.
- **Turning a gate on rots the prose that explained its absence.** The `verify:*` count is the
  obvious casualty and the cheap one: it is greppable, and re-derive it from `package.json`
  rather than transcribing it. The expensive ones read as reasoning rather than as status — a
  paragraph arguing the script was deliberately kept out of `package.json`, a grammar frozen
  while the convention was "a proposal for the owner", a backlog measured before the lanes that
  closed it. None of those contain the count, so a count sweep leaves all three standing and
  each is now a confident statement of something false. Re-derive every number from the tool
  that produces it, and grep for the *claim of absence* separately.
- **A browser is a gate too, and it goes stale in a way no other gate does.** No check here can
  see a pixel, so a motion or contrast change ends up verified by looking. That check silently
  passes on the wrong code if the dev server you are looking at was started before your edits and
  its file watcher missed them: `curl` of the module URL returns the *new* source, because the
  transform runs per request, while the page keeps rendering the *old* module it was handed at
  load — so the two obvious sanity checks disagree without either looking wrong. It is worse than
  a plain cache, because a partial HMR update can leave the DOM carrying new class strings from
  one edit and old markup from the next, which reads as a real bug in your change and is not one.
  Before believing a visual verdict, assert something in the DOM that **only** the new code can
  produce, and if it is absent start your own server rather than debugging the render.
- **The measurement that finds a rendering defect is the one that must confirm the fix.** A
  1px ring that snapped in the final frame of a transition was found on a luminance scanline
  through the marker's centre — `[33,24,234,…]` at 395ms against `[33,24,24,234,…]` at 399ms —
  and the fix was re-run through the identical scanline rather than through a screenshot that
  looked fine. Screenshots taken around such a change are near-useless on their own: the default
  is to *finish* animations before capture, and even with that off, a paused-at-final-value frame
  is pixel-identical to the resting one, which reads as "no defect" for a defect that is entirely
  about the frame in between.
