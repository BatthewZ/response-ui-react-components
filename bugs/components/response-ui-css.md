# response-ui-css — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 51 · response-ui-css — `--C-TEXT-MUTED` fails WCAG AA everywhere (med · cross-package)

**This one is not in this package.** It lives in
`node_modules/@batthewz/response-ui-css/src/tokens/colors.css:23` and each theme file, so it is
logged here only because a docs pass measured it — the fix belongs in the CSS package.

Contrast of `--C-TEXT-MUTED` against `--C-SURFACE-0` → `--C-SURFACE-3`, computed from the OKLCH
values by two independent agents that agreed:

| Theme | surface-0 | surface-3 |
| --- | --- | --- |
| default | 2.54:1 | 2.05:1 |
| tech | 2.10:1 | 1.75:1 |
| grimdark | 2.59:1 | 1.94:1 |
| events | 2.45:1 | 2.07:1 |

AA body text needs 4.5:1; AA large text needs 3:1. **Every cell fails both.** For scale,
`--C-TEXT-PRIMARY` never drops below 8.45:1 and `--C-TEXT-SECONDARY` never below 4.45:1.

**Failure scenario:** anything inked `--C-TEXT-MUTED` is below the legibility floor for
low-vision users on every theme the library ships — `Text color="muted"`, `Input`/`Textarea`
placeholders, `Badge` and `ActivityFeed` timestamps, `StatCard`'s flat sparkline tint.
**Fix direction:** raise `--C-TEXT-MUTED`'s lightness per theme until it clears 3:1 at minimum
(it is a hint/placeholder ink, so AA-large is the defensible floor), or state in
`theme-contract.md` that it is decorative-only and must never carry meaning. Right now the
contract names it "Most-muted (placeholders, hints)" and makes no legibility claim either way —
which is why no page could have caught this by reading the contract alone.
