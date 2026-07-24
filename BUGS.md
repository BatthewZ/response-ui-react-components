# BUGS

Code defects surfaced while documenting the components. **Not doc issues** — those get
fixed in the doc. These are places where the *code* is wrong, misleading, or violates a
contract (accessibility, the contrast contract, ETHOS token rules, logic). Logged here
for later audit rather than fixed inline, so the documentation pass stays reversible and
one concern at a time.

**Provenance:** surfaced by the `gen-component-docs` workflow — author + adversarial
verifier agents. Each is a *candidate* for audit, not a confirmed-and-triaged defect.
"Corroborated" = an author and an independent verifier flagged it separately.

| # | Status | Component | File:line | Sev | Summary |
| - | ------ | --------- | --------- | --- | ------- |
| 1 | unaudited · corroborated | Alert | [Alert.tsx:25](src/components/ui/Alert.tsx#L25) | med | Severity conveyed by colour alone (WCAG 1.4.1) |
| 2 | unaudited · corroborated | Alert | [Alert.tsx:28](src/components/ui/Alert.tsx#L28) | med | `aria-live="polite"` downgrades `role="alert"` for every variant |
| 3 | unaudited | Card | [Card.tsx:36](src/components/ui/Card.tsx#L36) | med | Themed surface with no paired text colour → contrast-contract risk in dark themes |
| 4 | unaudited | Card | [Card.tsx:36](src/components/ui/Card.tsx#L36) | med | Uses `bg-surface-0`; theme contract designates `--C-SURFACE-1` for cards |
| 5 | unaudited | StatCard | [StatCard.tsx:72](src/components/ui/StatCard.tsx#L72) | med | `animateValue` freezes on first target; a changed `to` never re-animates |
| 6 | unaudited | StatCard | [StatCard.tsx:111](src/components/ui/StatCard.tsx#L111) | low | Pre-scroll accessible value is the `from` placeholder (usually `0`) |
| 7 | unaudited | DescriptionList | [DescriptionList.tsx:16](src/components/data-display/DescriptionList.tsx#L16) | med | Horizontal (default) layout misaligns a term's 2nd+ detail |
| 8 | unaudited | DescriptionList | [DescriptionList.tsx:16](src/components/data-display/DescriptionList.tsx#L16) | low | `display:grid/flex` on `<dl>` can drop list semantics in Safari+VoiceOver |

## Details

<!-- Newest batch first. One block per row above. -->

### 1 · Alert — severity by colour alone (WCAG 1.4.1)

`variantClassMap` changes only bg/text/border tint per variant; nothing textual or
programmatic encodes severity. A greyscale or colour-blind reader can't tell success
from error, and a screen reader announces only the message text. The consumer must
hand-prefix a label/icon; the component supplies no default and no signal that one is
missing. **Fix direction:** ship a default per-variant icon + visually-hidden severity
label, or document the label as required and lint for it.

### 2 · Alert — `aria-live="polite"` overrides the alert role's assertive region

`role="alert"` implies `aria-live="assertive"`; hard-setting `aria-live="polite"`
downgrades *every* variant, so an `error` Alert mounting mid-sentence is queued rather
than interrupting. Overridable at the call site (props spread after the default), but the
default couples an alert role with polite urgency. **Fix direction:** drop the hard-coded
`aria-live`, or set it per variant (`assertive` for error/warning).

### 3 · Card — surface without paired text colour

`Card` renders `bg-surface-0` but sets no text colour, leaving ink to inheritance. The
CSS foundation sets no global text `color` (only `--C-CANVAS` background + font-family),
so under a dark theme the surface goes dark while inherited ink does not follow — text
can drop below the contrast contract unless the app sets a global
`color: var(--C-TEXT-PRIMARY)`. Sibling surfaces pair explicitly (e.g. StatCard sets both
`--C-SURFACE-0` and `--C-TEXT-PRIMARY`). **Fix direction:** add `text-fg-primary` to
Card's base classes so surface and default ink stay theme-paired.

### 4 · Card — wrong surface layer per the contract

`Card` uses `bg-surface-0` (`--C-SURFACE-0`, the most-elevated/popover layer) though the
theme contract designates `--C-SURFACE-1` for "Cards, navbar". Likely a token-layer
mismatch rather than an intentional exception. **Audit note:** confirm intent — if Card
is meant to sit at the popover layer this is by design and the contract wording should
change instead. (Distinct from #3: this is *which* surface, #3 is *missing ink*.)

### 5 · StatCard — `animateValue` ignores a changed `to`

`StatCardValue` guards the count-up with a `hasAnimated` ref. After the first
IntersectionObserver hit the effect re-runs when `to` changes and re-creates the observer,
but the callback early-returns on `hasAnimated.current`, so `displayValue` never re-syncs
— the number stays stuck on the first animated target. The reduced-motion branch computes
`formatValue(to)` in render and *does* track `to`, so the same update is honoured under
`prefers-reduced-motion` but silently dropped otherwise. **Fix direction:** re-run the
count-up (or snap to the new value) when `to` changes.

### 6 · StatCard — placeholder `from` as the accessible value pre-scroll

While animating and not yet intersected, the node renders `formatValue(from)` (usually
`0`) with no `aria-label` carrying the true figure. AT reading below the fold, or an
SSR/hydration snapshot, exposes `0` instead of the real number. Reduced-motion avoids this
(emits `formatValue(to)` immediately). **Fix direction:** expose the true value via
`aria-label`/`aria-hidden` split, or start from `to` for AT.

### 7 · DescriptionList — horizontal layout breaks on multiple details

Default `horizontal` layout is `grid grid-cols-[max-content_1fr]` with auto row-flow. One
Term + one Detail lands right, but a *second* Detail under the same Term wraps into the
label column and shifts every following pair out of alignment. Multiple Detail per Term is
explicitly supported (valid `<dl>`, covered by a passing test) yet renders visually broken
except in vertical layout. **Fix direction:** per-item `grid-column`, subgrid, or row-span.

### 8 · DescriptionList — `<dl>` display change can drop list semantics

Both layouts set `display:grid`/`flex` on the `<dl>`. In some Safari+VoiceOver versions
this strips the list/group semantics of the `<dl>` (the same known issue as styled `<ul>`).
Per-item `<dt>`/`<dd>` roles survive, so pair reading works, but the grouping announcement
degrades. No compensating `role` is added. Browser/AT-version dependent → low.
**Fix direction:** add `role="group"` (or `list`) with the display change.
