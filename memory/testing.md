# Ways a test here passes for the wrong reason

Tests run on Vitest + jsdom with Testing Library, colocated beside each component. The setup
details are documented in the repo's maintainer guide; these are the failure modes that guide
exists to prevent.

- **A mock that removes an error is a bug report someone declined to file.** One component's mock
  carried the comment *"to avoid IntersectionObserver issues"*. All 36 of its tests passed for as
  long as that comment stood, over a live crash in the same code path. **Grep for mocks whose
  comment explains what they prevent.**
- **A silently undelivered event tests nothing.** Firing `animationend` / `transitionend` through
  the usual helper reaches nothing in this environment: jsdom exposes no `AnimationEvent`
  constructor, and React resolves those names through vendor-prefix detection, registering the
  prefixed variant instead. Nothing throws. A test asserting a *consequence* of the handler then
  passes for the wrong reason. Dispatch both names, through the library's own fire helper so the
  update is wrapped and flushed.
- **A frozen branch is not a passing branch.** Seven of nine files hardcoded a media-query mock to
  `false`, making the reduced-motion and compact-layout paths unreachable rather than green. For
  the same reason, `matchMedia` is deliberately *not* stubbed globally — a global stub would hide
  a regression in the guard that reads it, as one already did. Stub per test, opt-in.
- **No test in this package can read a CSS file.** `vitest.config.ts` leaves `css` at its default
  `false`, which replaces every CSS request with an empty string — `import.meta.glob("./X.css",
  { query: "?raw" })` resolves the path and hands back `""` (measured, not inferred). `node:fs`
  is not an escape either: `@types/node` is not installed and `tsconfig`'s `types` is an
  allowlist. An assertion over a stylesheet therefore asserts over nothing. CSS invariants can
  only be gated from `scripts/verify-*.mjs`, and a comment claiming "a test asserts this
  stylesheet" is false wherever you find it.
- **`userEvent` moves focus, and focus commits.** A test that drives an "unrelated re-render"
  with `userEvent.click` blurs the field first — committing the draft and hiding exactly the bug
  the test was written for. Re-render through an explicit `act(() => bump())` on a wrapper's own
  state instead.
- **A comparison test can pass because both sides are empty.** "Renders an identical header in
  all three states" means nothing until the reference side is asserted *rich* — four cells,
  `aria-sort: ascending`, one sort icon — before the other two are compared against it.
- **To decide whether a safeguard is needed, probe rather than argue.** Install a comparator that
  *throws* wherever it would have acted and run the whole suite: a proposed equality gate for
  Accordion's array value fired 0 times across 28 tests and was dropped. It costs one run and
  produces a number instead of a plausible story.
- **Hostile inputs that found real bugs here**, worth reaching for on any controlled value: a
  no-op blur (expect exactly 0 emits); an inline `value={new Date(…)}` rebuilt on every parent
  render; a partially typed draft (`"06/1"`) surviving an unrelated re-render; and a genuine edit
  still emitting exactly 1.
- **A bare positive spy assertion hides re-fire bugs.** Asserting a handler "was called" cannot
  see it called twice; one component re-fired its change handler under exactly such an assertion.
  Assert exact counts.
- **A test that only exercises the happy shape proves nothing about the shape that breaks.**
  Three form controls erase their own `aria-invalid` when a form binding is spread onto them, and
  their suites stayed green because every test passed the prop *without* a spread. Test the way
  callers actually use it.
- **Test the mirror direction of any fix that resolves a conflict.** A spread-order fix has two
  sides: the component's value must survive the caller's, and the caller's must survive when the
  component has no opinion. Whichever direction you do not assert is the one the next
  "simplification" will break.
- **Some claims are not settleable here.** Nothing in this repo verifies a screen-reader
  *announcement*, and jsdom cannot settle a browser UA-default divergence — two findings stay
  open on purpose for that reason. Verify the DOM precondition, then say plainly in the record
  that the rest is unverified. **Never let a precondition check masquerade as the real one.**
- **Red first.** No patch lands without a check observed failing, and re-break it once after it
  goes green. Fixes have shipped here whose tests never exercised them.
- **This harness cannot read CSS, and that was probed rather than assumed.**
  `import.meta.glob(path, { query: "?raw" })` returns a stub here, so a stylesheet-only fix has
  no assertion available at all — not a weak one, none. Roughly a dozen fixes in one pass were
  CSS-only. Say "uncovered" in the record; a suite that goes green over an untestable change is
  not evidence, and the next reader will assume it was.
- **Name the specific thing jsdom cannot see, not "jsdom limitations".** Four different walls
  were hit in one pass and each needs a different answer: implicit ARIA roles are computed
  regardless of the attribute, so `role="list"` tests prove nothing about Safari; no layout is
  performed, so an alignment fix can only assert classes; no pointer path is synthesised, so
  `safePolygon` passes with and without it; and measurement overwrites an SSR seed immediately.
  A record that says which wall it hit can be re-opened by someone with a real browser.
