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
