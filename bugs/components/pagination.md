# pagination — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 133 · Pagination — the current page number is invisible in the `tech` theme (high)

`Pagination.css:41-43` is `.pagination__page--current { background-color: var(--C-ACCENT);
color: var(--C-TEXT-ON-PRIMARY); }`. The contract is explicit that these do not pair:
`theme-contract.md:53-54` defines `--C-TEXT-ON-PRIMARY` as "Text drawn on `--C-PRIMARY` fill" and
`--C-TEXT-ON-ACCENT` as "Text drawn on `--C-ACCENT` fill".

In `themes/tech.css` lines 23 and 37 are **byte-identical** — both `oklch(0.8763 0.2278 152.55)`
(`#00ff88`). So the current page's digit is painted in exactly its own background colour.

| Theme | as shipped | with `--C-TEXT-ON-ACCENT` |
| --- | --- | --- |
| default | 5.17:1 | — |
| tech | **1.00:1** | 14.84:1 |
| events | 2.80:1 | — |
| grimdark | 3.81:1 | — |

**Failure scenario:** on `tech`, a user cannot see which page they are on — the one piece of state
the component exists to convey. `events` at 2.80:1 also fails AA-large. **Fix is one variable in
one rule**: `Tabs.css:160` and `Calendar.css:211` already do it correctly as
`var(--C-TEXT-ON-ACCENT, var(--C-TEXT-INVERSE))`.

This is the first confirmed instance of the contract's fill/ink pairs being crossed, as opposed to
a token simply being too low-contrast (#51). Worth grepping every `--C-TEXT-ON-*` use against the
fill it sits on.

### 466 · Pagination — the current page chip still fails AA in two themes (med)

Surfaced 2026-07-26 by the contrast re-scope. **This is not a regression — it is the residual
`#133` left behind, which no row carried.**

`#133` was real and its fix was right: `.pagination__page--current` inked
`--C-TEXT-ON-PRIMARY` on a `--C-ACCENT` fill, and on `tech` those two tokens are byte-identical,
so the digit was painted in its own background at **1.00:1**. Switching to `--C-TEXT-ON-ACCENT`
(`Pagination.css:47-48`) escaped that.

But the pair it landed on is `#319`'s pair, and that pair fails AA in two of the four themes:

| Theme | `--C-TEXT-ON-ACCENT` on `--C-ACCENT` |
| --- | --- |
| default | 5.17:1 |
| tech | 14.84:1 |
| events | **2.80:1** |
| grimdark | **3.81:1** |

`#133`'s own detail block above states these figures. They were read as context for the `tech`
failure rather than as a surviving defect, so closing `#133` read as clearing the surface. It did
not.

**Failure scenario:** on `events`, the digit identifying the page you are on sits at 2.80:1
against its chip — under AA, and under AA-large. The state is not colour-only (`aria-current="page"`
is present and the weight is `Semibold`), so this is a category-1 readability defect, not a
sole-channel one.

**Shared root with `#319`** (`Calendar.css:209-213`, the selected day). Fixing the token pair once
in `response-ui-css` closes both; fixing it per-component closes neither properly.
