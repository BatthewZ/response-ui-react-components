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

| 472 | confirmed · measured | **library-wide** | library-wide | low | `verify:directives` reads `dist/` as well as source, so stale build output fails the gate for a reason that has nothing to do with the working tree. Measured this pass: adding `"use client"` to `form/{Input,Select,Textarea}.tsx` left three red rows against `dist/components/form/*.js` until a rebuild, and the message points at the artifact rather than at the source that is already correct. A gate whose red can mean "your code is wrong" *or* "your `dist/` is old" gets read as noise, and this one was — three agents reported it as someone else's problem |

| 473 | confirmed · measured | **library-wide** | library-wide | low | `verify:omit-discipline` attributes a nested prop bag's `Omit` to the component itself. It matches the `Omit<ComponentPropsWithRef<E>, K…>` shape anywhere in a props module, so `viewAllProps?: Omit<ComponentPropsWithRef<"a">, "href" \| "children">` — the type of Swimlane's *anchor* prop bag — was reported as `Swimlane.href` reaching the `<section>`, and failed the gate. Nothing is wrong with Swimlane: it supplies that anchor's href from `viewAllHref`. Exempted with the reasoning in `ALLOWLIST` rather than answered in source, because the alternative was adding a meaningless `href?: never` to satisfy a check asking the wrong question. **The real fix is to bind the scan to the type the component's signature actually uses**; until then any component that types a sub-prop bag this way will fail the same way, and the pattern is spreading — `viewAllProps`, `imgProps`, `tableProps` all arrived this pass |


| 500 | confirmed · measured | **library-wide** | library-wide | med | No gate catches a stale cross-reference, so a `X.css:NN` citation keeps pointing at a file the sweep deleted. Found by hand after the five-lane CSS-to-utilities sweep: `Sparkline.css:22` cited `StatCard.css`, `Table.css:76` cited `Carousel.css`, `Collapsible.test.tsx:185` cited `Collapsible.css`, and `virtualized-data-table.md` described a deleted stylesheet's rules as live. All four were repaired by grep, and nothing would have caught a fifth. **The check is about ten lines** — extract `[A-Za-z]+\.css` from `src`, `docs` and `*.md`, assert the file exists in `src` or in `response-ui-css` — and it would have caught four of those five automatically. The same shape as #464: the guards check that an anchor resolves, not that the prose beside it is still true |
| 501 | confirmed · measured | **library-wide** | [package.json](package.json) | low | `verify:bugs` is in no chain that runs automatically. It is deliberately out of `prepublishOnly` — it guards `bugs/`, which is not published — but that left it in nothing at all, and it was **red on arrival** at the five-lane consolidation with nobody having noticed. A ledger whose anchors are unverified is a ledger that quietly stops describing the code, and a multi-lane sweep is exactly the shape that shifts anchors. Keep it out of the publish chain; it needs to be in whatever runs at the land gate |
| 502 | confirmed · measured | **library-wide** | [scripts/probe-cascade-layer.mjs](scripts/probe-cascade-layer.mjs) | low | Two declarations survive only because a *fixture* needs them, not because the cascade does — `.tabs-list`'s `overflow-x` and `.app-shell-sidebar-section-title`'s padding, both kept by Lane 3 for the probe's benefit. Both probe rows still pass, so nothing is broken; the hazard is that a later reader converts either file, sees green, and does not learn that the fixture was the reason. Separately, three `all: unset` sites (`Switch`, `Radio`, `Slider`, `ColorPicker`) are guarded but unconverted, and converting the first two requires the hand-written fixture in `scripts/` to carry the component's real class string **first** — `switch-ring-vs-consumer-reset` carries a recorded owner decision that must not be silently re-accepted |

Closed audit findings — including the refutations and the phantom-row post-mortem — are in
[`ARCHIVE.md`](./ARCHIVE.md).

## Not findings — measured and deliberately left alone

- **A test cannot assert stylesheet content, and that is CSS-specific rather than `?raw`-general.**
  A `?raw` glob of `Tabs.css` yields length **0**; the same glob of `Tabs.tsx` yields **15947**. The
  two surviving `?raw` uses (`focus.test.ts`, `AppShell.test.tsx`) read `.tsx` and are live. No
  vacuous CSS assertion remains — `Tooltip`'s was rewritten and `ProgressBar.test.tsx` documents the
  limitation instead of pretending. Enabling `test: { css: true }` is a config decision with a blast
  radius well past any one sweep, and the instruments that *can* see CSS (`verify:*`,
  `probe:cascade-layer`) already cover the invariants that matter.
- **`Popover.css`'s arrow block is ruled, not examined.** Two independent lanes reached the same
  verdict from opposite ends and it is folded into `AGENTS.md`, but no lane owned the file's
  remaining 64 lines the way one owned `Tooltip`'s 55. A short pass on `Popover.css` alone would
  close it, expecting no change.
