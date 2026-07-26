# Three ways a test here passes for the wrong reason

The mechanics are in `CONTRIBUTING.md`; these are the lessons behind them.

- **A mock that removes an error is a bug report someone declined to file.** `StatCard`'s mock
  comment read *"to avoid IntersectionObserver issues"*. All 36 tests passed for as long as that
  comment stood, over a live crash. **Grep for mocks whose comment explains what they prevent.**
- **A silently-undelivered event tests nothing.** `fireEvent.animationEnd` / `transitionEnd`
  reach nothing in this jsdom — no `AnimationEvent` constructor, and React registers the
  vendor-prefixed name. No error is raised, so a test asserting a *consequence* of the handler
  passes for the wrong reason. Dispatch both names through RTL's `fireEvent`.
- **A frozen branch is not a passing branch.** Seven of nine files hardcoded a media-query mock
  to `false`, making the reduced-motion and compact paths unreachable rather than green. A
  global `matchMedia` stub is deliberately absent from `test-setup.ts` for the same reason — it
  would hide a regression in the guard that reads it, as one already did.
- **A bare positive spy assertion hides re-fire bugs.** `toHaveBeenCalled()` cannot see a handler
  firing twice; `Pagination` re-fired `onPageChange` under one. Assert exact counts.
- **A test that only exercises the happy shape proves nothing about the shape that breaks.**
  `Input`/`Select`/`Textarea` erase their own `aria-invalid` under a spread binding, and their
  suites stayed green because every test passes the prop *without* a spread (#455).
- **Test the mirror direction of any fix that resolves a conflict.** A spread-order swap fixes
  one side and breaks the other; both directions pass on five components and only one on two
  (#456). Whichever direction you did not assert is the one the next "simplification" will break.
- **Some claims are not settleable here.** No tool in this repo verifies a screen-reader
  *announcement*; jsdom cannot settle a browser UA-default divergence (#80, #88 stay open on
  purpose). Verify the DOM precondition, then say in the ledger that the rest is unverified —
  never let a precondition check masquerade as the real one.
