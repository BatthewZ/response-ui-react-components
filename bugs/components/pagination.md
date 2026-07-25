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
