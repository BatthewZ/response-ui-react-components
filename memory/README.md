# Memory — `@batthewz/response-ui-react-components`

Lessons from previous passes on this package, kept because they cost real time and none are
obvious in advance.

**Not a bug tracker and not a TODO list.** Open work belongs in the findings ledger; conventions
and API rules belong in the package's own documentation. If a line here is *status*, it has
decayed — delete it. Each spoke is self-contained: no lesson should require opening another file
to understand.

| Spoke                      | The lesson                                                  |
| -------------------------- | ------------------------------------------------------------ |
| [traps.md](./traps.md)     | What every fix pass so far got wrong. Read before planning.  |
| [state.md](./state.md)     | Where one fact ends up stored twice, and which copies are deliberate. |
| [gates.md](./gates.md)     | What a green gate does *not* mean.                           |
| [ledger.md](./ledger.md)   | How a written record goes wrong, and which errors are worst. |
| [testing.md](./testing.md) | Ways a test here passes for the wrong reason.                |
| [history.md](./history.md) | Why an inherited claim is worth less than you think.         |
| [example-themes.md](./example-themes.md) | How sample data becomes API without anyone deciding to, and the one test that catches it. |

## The short version

1. **Brief from source, never from a summary — including this one.** Every quantified claim in
   the first handover was inflated, one of a later brief's qualitative claims was *inverted*, and
   the document written to correct the first still staked four claims that adversarial
   verification refuted.
2. **No patch lands without a check observed failing first**, and re-break it once after green.
3. **Measure, don't reason** — including measuring whether a change is even *reachable*. One
   refutation collapsed on a stale comment in this repo's own CSS; one proposed safeguard was
   dropped after a probe showed it could never fire.
4. **Refuting a finding is a full outcome** — but write it into the record, not the commit body.
5. **A claim that counts instances instead of naming them cannot be audited.**
6. **Scope is this package only** — not the CSS package, not the tailwind-merge package, *not
   even to add a script*. That boundary was crossed once and reverted in full.
7. **Documentation that contradicts your diff is a refutation, not staleness.** One pass called a
   documented decision "drift", changed it, and deleted the eight sentences that said otherwise;
   the gates stayed green and the owner reversed the whole thing. Answer the prose or leave it
   standing.
8. **Green gates cannot see a promise the code stopped keeping.** The example themes became
   load-bearing across several releases with every gate green, because no gate could observe
   "the README advertises something a consumer no longer gets". When the thing at risk is a
   claim rather than a behaviour, write the gate that asserts the claim.
9. **A new layout axis belongs on the root element, as an attribute the stylesheet descends to
   find — never as a value threaded to each child.** One writer cannot disagree with itself; two
   derivations of one fact eventually will. Prefer variants that assign only custom properties,
   keep the geometry everything else is measured against out of the variant's reach, and check
   what a prop name already means in this library before spending it.
10. **Ask whether the decoration can even reach the effect before promising the effect.** A
   focus indicator shaped like the control, on a control the engine paints, is not available at
   any price short of taking the painting over — and taking it over means owning every state the
   engine was covering, including the high-contrast one. Measure reachability first; the design
   question is only worth debating once you know what it costs.

11. **A theme can change a component's *shape*, not just its palette — so an emphasis cue tuned
   in one theme is miscalibrated in another for a structural reason.** Where the brand fill sits
   near the surface, a filled chip renders as a ring instead, and a component whose markers were
   discs becomes a family of rings. Weight, contrast and hierarchy all re-rank. Check a visual
   cue against a theme of each polarity *and* each fill behaviour; the polarity is the obvious
   variable and the fill behaviour is not.
12. **Measurement is not transitive to the sentence beside it.** A well-measured record can carry
   an unmeasured rationale, and the rationale is usually the part that sized the change. Rigour
   in a row is a reason to check *which claim* the evidence bears on, not a reason to stop.

Add a lesson when a pass teaches one. Prune anything that has expired: a memory file that has
gone stale is worse than an empty one, because it is still believed.
