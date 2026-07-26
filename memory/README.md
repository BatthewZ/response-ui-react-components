# Memory — `@batthewz/response-ui-react-components`

Lessons from previous passes on this package, kept because they cost real time and none are
obvious in advance.

**Not a bug tracker and not a TODO list.** Open work belongs in the findings ledger; conventions
and API rules belong in the package's own documentation. If a line here is *status*, it has
decayed — delete it. Each spoke is self-contained: no lesson should require opening another file
to understand.

| Spoke                      | The lesson                                                  |
| -------------------------- | ------------------------------------------------------------ |
| [traps.md](./traps.md)     | What two fix passes got wrong. Read before planning.         |
| [gates.md](./gates.md)     | What a green gate does *not* mean.                           |
| [ledger.md](./ledger.md)   | How a written record goes wrong, and which errors are worst. |
| [testing.md](./testing.md) | Ways a test here passes for the wrong reason.                |
| [history.md](./history.md) | Why an inherited claim is worth less than you think.         |

## The short version

1. **Brief from source, never from a summary — including this one.** Every quantified claim in
   the first handover was inflated; the document written to correct it still staked four claims
   that adversarial verification refuted.
2. **No patch lands without a check observed failing first**, and re-break it once after green.
3. **Measure, don't reason.** One refutation collapsed on a stale comment in this repo's own CSS.
4. **Refuting a finding is a full outcome** — but write it into the record, not the commit body.
5. **A claim that counts instances instead of naming them cannot be audited.**
6. **Scope is this package only** — not the CSS package, not the tailwind-merge package, *not
   even to add a script*. That boundary was crossed once and reverted in full.

Add a lesson when a pass teaches one. Prune anything that has expired: a memory file that has
gone stale is worse than an empty one, because it is still believed.
