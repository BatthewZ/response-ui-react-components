# What is genuinely still open

At HEAD `ee59e65`. Ledger: 364 open rows (31 high). **Verify any row against source before you
plan work on it** — the last pass re-audited 378 rows and moved 157 anchors.

## Root causes still live

Named in `BUG_FIX_HANDOVER.md` §3. **Row counts there are claims, not measurements** — treat as
order-of-magnitude only.

| RC       | What                                                                                                        | State                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **RC-1** | The type layer does work the runtime never does — a JSX spread performs no excess-property check, so `Omit<>` is not a runtime guard | Nine components individually re-typed; **the mechanism is unchanged**. `tsc` and `eslint` are both still silent on a prop delivered through a spread — measured directly. The next `Omit` reproduces it. |
| **RC-2** | No shared control primitive (~43 rows)                                                                       | **Untouched.** No focus-ring primitive exists; the form-control recipe is hand-written in ≥10 files; four floating surfaces own private portal/focus-manager copies. The fix belongs in `response-ui-css` — **crosses a package boundary, owner decision.** |
| **RC-3** | Two representations of one fact, reconciled by hand (~40 rows)                                               | **Untouched since the pass before last.**                                                     |
| RC-4/5   | Visual state with no DOM peer · ARIA substituting for DOM behaviour                                          | Partly closed by #136/#141/#118; not swept.                                                   |
| RC-7     | Token layer is a convention, not a contract                                                                  | Two genuinely-wrong lines fixed in `Timeline.css`. **The 121-usage "scale sweep" it proposed is a closed door** — the descending scale is deliberate. |
| RC-8     | Contrast                                                                                                     | Mostly a promise never made (`docs/theme-contract.md:88`: "a convention, not a measured ratio"). **No WCAG floor legislated — owner declined twice.** |

`BUG_FIX_HANDOVER.md` §8 is titled "Recommended next steps" — **it is not a contract**, and its
§3 names root causes §8 never mentions.

## Named gaps with an owner-shaped decision behind them

1. **`verify:focus-affordance` reads CSS only** (its own docblock, `:38-39`). A Tailwind
   `focus:outline-none` in a `.tsx` is the same defect class and invisible to it — 10 such
   occurrences today. That gap was already hiding a live one: `Radio.tsx:16` reset the outline
   with no replacement anywhere, since the initial commit, while `Checkbox.tsx:17` carried the
   correct recipe one file over. Fixed for Radio; **the class-wide gap remains**. Ledger **#73**.
   Honest next step: parse `focus:` utilities out of `.tsx` `className` strings, or a lint rule
   pairing `focus:outline-none` with `focus:ring-*`.
2. **The ledger's primary index has no content guard** — see [ledger.md](./ledger.md). A
   fingerprint beside the line number would close it.
3. **`response-ui-css` has zero publish gates** — no `scripts` key at all — and it is the one
   package whose change alters rendered output for every consumer. A `prepublishOnly` syntax
   check existed at `0.4.0` and was deleted with the CLI it belonged to. All 27 CSS files parse
   clean today (lightningcss), so the risk is **latent, not live**. Out of scope from here.
4. **The palette retune** — handed back, unwalked, recorded here because this is the first place
   a human will look.

## Unlogged, measured, free to file

**`Input`, `Select`, `Textarea` erase their own `aria-invalid` under a `form.field()` spread** —
the #434 class, three components that bypass `mergeProps`. Measured 2026-07-26 with a scratch
render (all three returned `null`; `RangeSlider` passed as control). Repro, call sites and the
reason their own tests stay green are in [traps.md](./traps.md) §C. No ledger row covers it.

Coverage gaps found alongside it: `Switch` and `OTPInput` test only one of the two spread-order
directions.

## Two rows deliberately left open

`#80` and `#88` read `unaudited` on purpose — they need a real browser render, not jsdom.

## Before you start

Read [traps.md](./traps.md). The single highest-leverage thing the last pass did was **falsify
eight inherited claims before writing a line of code**.
