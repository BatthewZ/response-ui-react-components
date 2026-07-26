# Audit findings — the gates, the tests, the record

Open findings about *how this package is checked*, not about what it ships. They are real work
and they are not component defects, so they are not in [`LEDGER.md`](./LEDGER.md), where every
row should be something a user could notice.

Each one is a blind spot: a gate that reads the wrong thing, a test that passes for the wrong
reason, or a check that cannot fire in this environment at all. They matter because every row in
the ledger is only as good as the thing that verified it.

| # | Status | Component | File:line | Sev | Summary |
| - | ------ | --------- | --------- | --- | ------- |
| 422 | confirmed · source | DescriptionList | [DescriptionList.test.tsx:63](src/components/data-display/DescriptionList.test.tsx#L63 "fp:29b9a856") | low | Test defect, not a component defect: "supports multiple Detail per Term" renders the #7 failure case under the default layout and asserts only `toHaveLength`, `toHaveTextContent` and roles — never grid placement, which is the entire claim, so it is green while the layout is transposed |
| 438 | confirmed · measured | **library-wide** | library-wide | low | `fireEvent.animationEnd`/`transitionEnd` silently reach nothing in this repo's jsdom (no `AnimationEvent` constructor; React registers `webkitAnimationEnd`), so a test asserting a consequence of such a handler passes for the wrong reason — documented in CONTRIBUTING.md with the dual-name dispatch that works. Independently corroborated twice: CONTRIBUTING.md:116-126 documents both causes and ships the dual-name dispatch, and ab8a0bf's message records the same measurement |
| 456 | confirmed · measured | Switch · OTPInput | [Switch.test.tsx:151](src/components/form/Switch.test.tsx#L151 "fp:a5a925da") | low | Both use `mergeProps` correctly, but only the component-wins direction of #434 is covered (Switch.test.tsx:151 — its pair at :159 asserts `aria-describedby`, not `aria-invalid`; OTPInput.test.tsx:173). The caller-wins direction is untested on both, so the mirror regression — swapping the spread order, which erases the *caller's* value — stays green here while it fails on the five components that test both |
| 464 | confirmed · source | **library-wide** | library-wide | med | `verify:component-docs` reads **token tables only** (`scripts/verify-component-docs.mjs:264-265` splits on `## Theme tokens`), so a refactor that changes a utility's *keying* or *value* while keeping its name passes green on every row it checks while the surrounding prose goes false. Measured this pass: `aafb9f8` moved `focus:` → `focus-visible:` and `ring-offset-2` → `ring-offset-0`, and **ten** doc pages carried falsified prose that no gate saw — `radio.md` still said Radio put no ring back and failed WCAG 2.4.7 (stale since `ee59e65`, the same phantom as #73), `collapsible.md` said the trigger had no focus styling, and `icon-button.md`/`checkbox.md`/`error-boundary.md`/`copy-button.md` all described the removed `ring-offset` gap. All were found by hand and corrected in `d14c7be`. Same shape as the oracle gap this file's own preamble records: the guard checks that an anchor exists, not that it still says what the row claims |

Closed audit findings — including the refutations and the phantom-row post-mortem — are in
[`ARCHIVE.md`](./ARCHIVE.md).
