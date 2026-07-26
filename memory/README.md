# Memory — `@batthewz/response-ui-react-components`

Lessons from previous passes, kept because they cost real time and none are obvious in advance.
**Not a bug tracker and not a TODO list** — open work lives in `bugs/LEDGER.md`, conventions in
`AGENTS.md` / `CONTRIBUTING.md` / `ETHOS.md`. If it is state, it does not belong here.

| Spoke                        | The lesson                                                     |
| ---------------------------- | -------------------------------------------------------------- |
| [traps.md](./traps.md)       | What two fix passes got wrong. Read before planning.            |
| [gates.md](./gates.md)       | What a green gate does *not* mean.                              |
| [ledger.md](./ledger.md)     | How a written record goes wrong, and which errors are worst.    |
| [testing.md](./testing.md)   | Three ways a test here passes for the wrong reason.             |
| [history.md](./history.md)   | Why an inherited claim is worth less than you think.            |

## The short version

1. **Brief from source, never from a summary — including this one.** Every quantified claim in
   the first handover was inflated; the second corrected it and still staked four claims that
   adversarial verification refuted.
2. **No patch lands without a check observed failing first**, and re-break it once after green.
3. **Measure, don't reason.** One refutation collapsed on a stale comment in this repo's own CSS.
4. **Refuting a row is a full outcome** — but write it in the ledger, not the commit body.
5. **A claim that counts instances instead of naming them cannot be audited.**
6. **Scope is this package only** — not `response-ui-css`, not `tw-merge`, *not even to add a
   script*. Crossed once, reverted in full.

Keep spokes terse. Add a lesson when a pass teaches one; delete anything that has decayed into
status.
