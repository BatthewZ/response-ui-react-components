# When one fact is stored twice

Nearly every controlled-value defect fixed here was the same shape: a value with a second copy
beside it, reconciled by hand. These are the moves that worked, the measurement that decides
whether a safeguard is needed at all, and the two duplications that are load-bearing.

- **The mode lock needs two refs, not one.** `useControllableState` locks controlled-vs-
  uncontrolled in its own ref on first render, and that is not sufficient at the call site: once
  locked controlled it computes `effectiveValue = value as T`, so a caller still passing the raw
  prop hands the hook `undefined` and the component renders it — Accordion crashed on
  `.includes`, Tabs rendered no panel. Every consumer also holds a local `isControlledRef` and
  passes `isControlled ? (prop ?? <empty>) : undefined`: `[]` for Accordion, `false` for
  Popover/AppShell, `defaultValue` for Tabs.
- **Migrating onto the hook silently adds a no-op gate.** Its setter suppresses any call
  resolving to the value already held, so a handler that used to re-emit an unchanged value
  changes behaviour. Tabs echoed `onValueChange` when you re-selected the active tab; that is now
  a no-op. Check the re-emits before calling such a migration a pure refactor.
- **`isEqual` is opt-in, and "the value is an object" does not imply you need it.** The default
  `Object.is` is wrong for anything rebuilt per commit — a `Date`, a `DateRange` — where a no-op
  blur re-emits and dirty-tracking, autosave and audit logs record an edit that never happened.
  But the question is whether any *reachable* setter call can resolve to the value already held,
  not whether the type is a reference. Accordion's value is a `string[]` and needs none: its only
  setter is a toggle, and a probe comparator that threw wherever it would have blocked an emit
  fired 0 times across all 28 tests. `SortState` needs none either — `cycleSort` is its only
  writer and never returns a value equal to its input. **The hook's own docblock names "sort
  tuples" among the values that should "pass a comparator at those call sites"; that prescription
  is unmeasured and contradicts both results.** An unobservable comparator is speculative code.
- **A draft beside a committed value should be a transient override, not a mirror.** Four picker
  rows were one shape: a committed value plus a draft, glued by a ref comparing by identity. The
  fix is not a better comparator — `useState<string | null>(null)`, `text = draft ?? derive(committed)`,
  and every commit path resets to `null`. There is then nothing to reconcile, and a runtime
  locale or format change reformats the field instead of silently rewriting the value.
- **Delete a second representation only when it carries no information of its own.** Hue is
  unrecoverable from `#000000`, so ColorPicker's HSV cannot simply be derived from the hex — but
  it is not synced either. It is derived, and the remembered triple is believed only while it
  still round-trips to the truth: `hsvToHex(memory) === hex ? memory : hexToHsv(hex)`. Hue and
  saturation survive the greyscale extremes without the panel ever outrunning a parent that
  refused the commit.
- **One renderer per surface, not one per state.** DataTable wrote its header three times and
  VirtualizedDataTable twice; the copies drifted into four filed rows — a loading header with no
  select-all checkbox, no `aria-sort` and no sort icons, and an empty state whose `<th>`s outran
  the cell spanning them. Both now route every state through one `renderHeader()`. Add a header
  attribute once, and never "fix" a single-state divergence by patching that state.
- **Two duplications here were decided, not overlooked.** AppShell's mobile breakpoint is written
  in both `AppShell.tsx` (`MOBILE_VIEWPORT_QUERY`) and `AppShell.css`: a media query cannot read
  a custom property, this package has no CSS build step, and the stylesheet's block is what stops
  the pre-hydration render showing the inline sidebar on a phone. Name the JS side and
  cross-reference; do not invent a runtime `getComputedStyle` read. Separately,
  VirtualizedDataTable keeps the loading/empty early returns that DataTable collapsed —
  `use-virtual-rows` expects `scrollRef.current` to be null in those branches, and attaching it
  perturbs `endIndex` → `nearBottom` → `onEndReached`.
- **The `<!-- example -->` marker pattern is a second copy on purpose, and the property it
  encodes travels with it.** The generator that injects fences into the docs and the site that
  renders them both have to agree about where a block ends, and they cannot share a module: one
  is plain Node run before any build, the other is TypeScript inside the bundle. So the pattern is
  written twice — and what must be copied is not the regex but the reason it is shaped that way.
  A body that is lazy and unconstrained cannot grow past its own close marker; a body spelled as
  an optional fence can, and did, swallowing every heading and paragraph up to the *next* block's
  close marker. In the generator that deleted prose from two pages. In a renderer it would only
  put one example's documentation under another's name — silent in a different way, and not
  caught by anything, because both files still parse. Whichever copy you touch, re-read the other
  and keep the containment claim, not just the characters.
- **A consumer of the docs must treat fenced blocks as opaque, and the counterexample is in the
  docs already.** Rewriting relative links to site routes across a whole page looks safe until you
  remember that `markdown.md` documents a markdown renderer, so it quotes markdown *source*
  — link syntax included — inside a `tsx` fence. Rewriting there puts a site URL into a snippet
  the reader is invited to copy, and inside an example fence it makes the code on the page differ
  from the code the generator injected, which is the single thing those fences exist to
  guarantee. Any pass over doc text — link rewriting, heading detection, anchor generation —
  needs the fence state machine, not just the one that obviously does.
- **The dependency direction is the ownership rule for docs, not just for code.** The foundation
  package owns the design language; this package owns only what exists *because components
  exist*. When a doc here restates the foundation's contract, that copy is not a convenience —
  it is a second source that will drift, and it drifts in both directions at once: this copy went
  stale on an upstream deletion while simultaneously holding a load-bearing rule the upstream doc
  had never been given. Neither gap was visible from inside either package. Before writing any
  token-level prose here, ask whether the token is defined here; if it is not, link upstream and
  write nothing.
- **Preserve the headings when you delete duplicated doc sections.** The link-integrity gate
  checks every `#anchor`, and roughly a hundred component pages point at the contract. A heading
  kept with one sentence of substance and a link upstream costs three lines and keeps every
  caller correct; repointing the callers puts the same fact back in every one of them.
- **"Parent sets, child reads" is not on its own a reason to keep a custom property.** A token
  feeding two properties on two elements looks like an irreducible fan-out — and is, if the children
  are ones the consumer renders and the component never sees. But where **the same component renders
  both elements**, it can apply both utilities and the token buys nothing but indirection.
  `--masonry-gap` was exactly that: one value driving `column-gap` on the root and `margin-bottom` on
  each item, because CSS multi-column has no row-gap. Replacing it with a `gap-r*` on the root and an
  `mb-r*` on each item (the value passed down through a context the component already had) deleted the
  token *and* gained an override path per half, which a single property could not offer. Ask who
  renders the reader before concluding the fan-out is irreducible.
- **A wrapper that restyles a base component must do it in the base component's own channel.**
  Since Phase 1, the two channels are no longer interchangeable: this package's CSS is in
  `@layer components`, below `@layer utilities`, so a property a base component sets with a
  utility CANNOT be reset by a rule in the wrapper's stylesheet at any specificity. Both writers
  look reasonable in isolation and neither errors; the CSS one simply never applies. SearchInput
  declared the gutters that keep the placeholder clear of the magnifier — and the type and vertical
  padding of its small size — in CSS, against `Input`'s `px-r4`, `py-r5` and `text-body-2`; the
  gutters computed as the icon's own inset (text under the glyph) and `sm` was pixel-identical to
  `md` at every viewport, in a shipped release, with every gate green. Rewritten as utilities they
  work *and* read better: `px-*` is one tailwind-merge class group, so the wrapper's value
  **replaces** the base's in the class list instead of racing it in the cascade, and because the
  caller's slot className merges last, an override still wins. **The tell is a wrapper stylesheet
  that names a property its base already sets** — and it is worth grepping for deliberately,
  because the same rule holds everywhere and the failure is silent.
- **Docs asserting which declaration wins are the least trustworthy sentences in the package.**
  This one said the literal gutters "out-specify" the base's utility "and still apply" — a
  specificity claim about two single-class selectors in different layers, i.e. false in principle
  and refuted by one `getComputedStyle`. Nothing can go stale more quietly: the sentence describes
  a cascade nobody re-runs, and the whole page around it stays accurate. Treat any prose about
  precedence as a claim to measure, not as a record of a decision.
- **A "this must stay in CSS because unlayered beats a utility" comment expires the moment its
  neighbour becomes a utility.** MasonryGrid's trailing-gap reset was in CSS because
  `.masonry-grid__item`'s unlayered `margin-bottom` out-ranked any `mb-0`. Once that margin became a
  utility, `last:mb-0` at (0,1,1) beat it at (0,1,0) in the same layer, and the reset needed no rule
  at all. **Deleting the unlayered competitor can be cheaper than layering it** — and such a change
  needs no cascade-layer migration to be safe, which makes it available earlier than the phase it
  looks like it belongs to. When a comment justifies a rule by what out-ranks what, re-read it after
  changing either side.

## A downstream generator constrains HOW you deduplicate a union, not WHETHER

Something downstream reads this package's **emitted `.d.ts`** to harvest the value sets of
string-union props. It accepts only a *pure* literal union, and a prop it cannot parse is not an
error anywhere: the prop is simply omitted from both the generated reference and the generated
check, so the check still passes on both sides because it is comparing a generation against
itself. The failure is invisible from inside this package and invisible from outside it.

That is a real constraint, and it is easy to over-read. This exact over-read happened here: a
props type spelled its union out inline in several places, with a comment claiming the
duplication was load-bearing and that referencing a shared type would cost the downstream check.
**The comment was wrong, and measurably so.** Under test, three shapes behave differently:

- `Foo["bar"]` (indexed access) — breaks harvesting. Silently.
- `Pick<Foo, "bar">` — breaks it worse.
- A **named, exported type alias**, imported by the siblings — works perfectly. The generated
  artifacts came out byte-identical to the duplicated version.

The resolver falls back to scanning every declaration file for the alias by name, which is why —
and the shared layout scales already relied on this, so the evidence was in the tree the whole
time. So the rule is: deduplicate with a named alias, never with a derived type. And before
writing "this duplication is deliberate" at a site, *run the thing that supposedly needs it*.
A plausible mechanism plus an unverified consequence is how a copy-paste acquires a defender.

Second-order, and the reason this cost more than the edit: that comment was **public**. It sat in
the JSDoc of an exported prop, so it was emitted into the shipped `.d.ts` and into every
consumer's IDE tooltip — which also made it a one-way-knowledge leak, an upstream package naming
its downstream in its published API. Internal rationale goes next to the implementation, never in
the doc comment of a public prop.
