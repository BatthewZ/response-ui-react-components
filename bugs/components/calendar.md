# calendar — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 319 · Calendar — the selected day fails AA on the fill it is designed for (med)

`.calendar-day[aria-selected="true"]` sets `background-color: var(--C-ACCENT)` and
`color: var(--C-TEXT-ON-ACCENT, var(--C-TEXT-INVERSE))` — the contract's own intended foreground /
background pair. Computed from the shipped theme files: **5.17:1** default, **2.80:1** `events`,
**3.81:1** `grimdark`, **14.84:1** `tech`. Two of the four shipped themes put the selected date's
digit below the 4.5:1 AA floor for body-size text, and `events` is below the 3:1 large-text floor
too. Because the selection is *also* the state that #314 may stop announcing, a user in `events` can
end up with no reliable indication of the chosen day at all. This is a token-level gap, not a
component one — every component that inks `--C-TEXT-ON-ACCENT` on `--C-ACCENT` inherits it.
**Fix:** correct the `--C-TEXT-ON-ACCENT` values in `events` and `grimdark` (or darken
`--C-ACCENT`), and add the pair to the contrast guard.
