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
