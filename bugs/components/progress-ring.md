# progress-ring — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 210 · ProgressRing — the same invisible track, one step less bad (med)

`.progress-ring__track` strokes `--C-SURFACE-2`, measured against `--C-SURFACE-0` at **1.10:1**
default, **1.08:1** `events`, **1.08:1** `tech`, **1.16:1** `grimdark`. It is the better of the
two choices — `ProgressBar` uses `--C-SURFACE-1` at 1.02–1.07:1 (#206) — and it is still nowhere
near the 3:1 floor, so the ring reads as a floating arc with no visible circumference. This is
why `ProgressRing` came off the "Clean (no findings)" list: it had never been measured, not that
it had passed. **Fix:** as #206 — a dedicated track token with a contrast guard, and one answer
shared by both siblings.
