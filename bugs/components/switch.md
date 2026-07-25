# switch — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 78-79 · Switch — the position cue is invisible, and a disabled switch still submits (med)

- **#78** Thumb (`--C-SURFACE-0`) against the off-track (`--C-SURFACE-2`): default **1.100**,
  tech 1.083, grimdark 1.163, events 1.077. Checked, thumb-on-`--C-ACCENT` clears 3:1 only in
  default (5.170) and tech (14.835) — events (2.719) and grimdark (2.963) fail in **both** states.
  `all: unset` leaves no border, so the whole off-track is 1.04–1.16:1 against the page.
  Computed independently by two agents whose pipelines both reproduce #51's numbers exactly.
  **Why this is 1.4.11 and not 1.4.1:** unlike Alert/Meter/Badge/Avatar, Switch *does* ship a
  non-colour channel — the thumb moves. The defect is that the channel is imperceptible, which is
  1.4.11's subject. Filing both would double-count one root cause.
  **Fix:** give `.switch-thumb` a `--C-BORDER-STRONG` border and the track a
  `1px solid var(--C-BORDER-DEFAULT)`.
- **#79** `<form><Switch name="notify" defaultChecked disabled /></form>` →
  `new FormData(form).get("notify") === "on"`. The hidden input never receives `disabled`, and
  native disabled controls are excluded from submission. **Fix:** `disabled={disabled}` on the
  hidden input.
