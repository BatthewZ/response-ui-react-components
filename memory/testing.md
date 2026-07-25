# Testing here — how a test passes for the wrong reason

Vitest + jsdom + @testing-library/react, tests colocated (`Foo.test.tsx`), `bun run test`. Tests
are not published. 1369 tests at HEAD.

## Three silent failure modes, all measured in this repo

1. **`fireEvent.animationEnd` / `transitionEnd` do not work, and fail silently**
   (`CONTRIBUTING.md:116-136`). jsdom exposes no `AnimationEvent` constructor, and React resolves
   animation events through vendor-prefix detection — it registers `webkitAnimationEnd`, not
   `animationend`. The dispatch never reaches React: handler not called, no error, and a test
   asserting a *consequence* passes for the wrong reason. Dispatch **both** names through RTL's
   `fireEvent` (never raw `el.dispatchEvent` — that isn't wrapped in `act`, so the assertion
   reads stale DOM). Keep the helper **inside** the test file; `src/` ships to npm, so a shared
   `src/test-utils/` module would be published.
2. **`window.matchMedia` is deliberately not stubbed** in `test-setup.ts`
   (`CONTRIBUTING.md:109-114`). Hooks guard its absence, and a global stub would hide a
   regression in that guard — one already shipped that way. Stub per-test, opt-in.
3. **A mock that removes an error is a bug report someone declined to file.** `StatCard`'s mock
   comment read *"to avoid IntersectionObserver issues"*; all 36 tests passed for as long as it
   stood, over a live crash. **Grep for mocks whose comment explains what they prevent.**

## Assertion hygiene

- Bare positive spy assertions (`expect(fn).toHaveBeenCalled()`) hide re-fire bugs — #141 was a
  `Pagination` re-firing `onPageChange`. Prefer `toHaveBeenCalledTimes` with an exact count;
  63 truly-bare assertions were counted at one baseline.
- A hardcoded `false` in a media-query mock silently freezes a branch: **7 of 9 files hardcoded
  it**, so the reduced-motion and compact-layout paths were unreachable, not passing.
- Never stub around a bug to make a test pass. Never suppress a type/lint error in a test.
- **Red first.** No patch lands without a check observed failing, and re-break it once after it
  goes green — this repo has shipped fixes whose tests never actually exercised them.

## Verification tools by defect class

| Class                      | Tool                                                                  |
| -------------------------- | --------------------------------------------------------------------- |
| logic / props / state      | vitest + jsdom                                                        |
| ARIA name & shape          | vitest `getByRole` / `computeAccessibleName`                          |
| contrast ratio             | workspace `bug-triage-tools/verify-contrast.mjs` (pure Node, exits 0 unless `--enforce`) |
| real paint / hit-testing   | `playwright-cli` against `bun run dev` on **:5179**                    |
| screen-reader announcement | **nothing available** — verify the DOM precondition and say in the ledger that the announcement is unverified |

**Browser traps, each yielding a confident wrong answer rather than an error:** an `eval`-driven
`.focus()` silently does not take (use `playwright-cli press tab`); a `snapshot` ref is not a
`querySelector` result (bind the eval to the ref); accessible role ≠ tag. General rule: **assert
the precondition in the same eval that takes the measurement.**

Verifiers must **measure, not reason** — one claim collapsed on a stale comment in this repo's
own CSS.
