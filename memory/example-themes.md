# Example themes: how a demo becomes API without anyone deciding to

## The lesson

Three theme names arrived as demonstrations and, over several passes, acquired four privileges no
consumer theme could have. No single step was wrong. Nobody decided to make them API.

1. A `:root[data-theme="…"]` block in this package's **own shipped stylesheet**, carrying lifted
   chart ramps and tuned component feel. A consumer's dark theme inherited the light ramp and got
   neither. This was the worst one: the library's CSS knew the names of another package's demos.
2. An exported type named `Theme` whose members were those demos. A consumer writing
   `import type { Theme }` received a union that was wrong for their app, under the most
   authoritative name available.
3. A runtime default: the theme hook fell back to that list, so an app that forgot to register its
   own themes silently reported the wrong one.
4. A `satisfies Record<Theme, string>` obligation on a shipped component's labels, making the demo
   set a compile-time requirement of the component.

Each was locally reasonable. Together they meant the library's advertised feature — *your* theme
re-skins everything — was quietly less true for a consumer than for three sample files.

## What to do instead

**If a rule must vary per theme, express it as a token or prop the consumer also controls.** That
is the whole test. `--C-CHART-*` overrides keyed to a theme *name* are unreachable for a consumer;
the same overrides documented as "your dark theme must set these" are reachable by everyone. The
fix is almost never to add an allowance to the gate.

**Sample code lives in a dedicated examples directory and nothing imports it.** If a demo needs the example
themes, it opts in explicitly — a stylesheet import and an exported constant. The dev harness is
the model: it imports the example theme CSS and passes the example names to the switcher, because
it genuinely is a demo. Library code does neither.

**Invent names in tests and examples.** Use `aurora`, `midnight`, `solstice`. A fixture written
against a real example theme re-canonises it for the next reader, and tests the example rather
than the code.

## Why the gate exists rather than a convention

This decayed silently over multiple releases while every gate stayed green, because nothing here
can observe "the docs promise something the code no longer delivers". There is now a gate that
turns it into a build failure: a theme name in a shipped CSS selector, in library code, in the
built stylesheet, or imported by the foundation's public entries. Read its header before touching
it. It deliberately does *not* police prose — several component stylesheets cite contrast measured
against the examples, which is legitimate evidence worth keeping. That exemption is a real blind
spot: the prose drifted too, and only a manual sweep caught it.

## On the scope rule in this memory's README

The README says work is scoped to this package only, and that the boundary was crossed once and
reverted in full. That rule is correct for a scoped fix pass and should stay.

This pass crossed it deliberately, because the owner's request was explicitly about the whole
bundle — the coupling being removed *was* the cross-package coupling, and fixing it here alone
would have left the foundation still importing the demos. If you find yourself editing a sibling
package, that is the bar: an explicit cross-package request from the owner, not your own judgement
that the other package is where the bug lives.
