# Finding axes

How to say what a row in [`LEDGER.md`](./LEDGER.md) *is*. Four axes describe every finding and
they answer different questions; conflating any two of them is how triage goes wrong.

| Axis | Question | Owned by |
| --- | --- | --- |
| **Kind** | What is wrong? | this file |
| **Harm** | Who does it hurt, and how badly? | this file |
| Mechanism | What shape is the fix, and what else shares it? | [`PLAN.md`](./PLAN.md) §5 |
| Evidence | Do we believe it, and is it closed? | the ledger's `Status` column |

## Row format

`node scripts/bugs-ledger.mjs --check` enforces the shape; this is what the columns mean.

```
| # | Status | Component | File:line | Sev | Summary |
| 34 | unaudited · spot-checked | Foo | [Foo.tsx:42](src/components/ui/Foo.tsx#L42) | med | One-line statement of the defect |
```

- **`Sev`** — `high` / `med` / `low`. Read it as an inherited prior, not as priority: it blends
  kind, harm and reach into one word, which is why #7 (text unreadable) and #4 (no user can see
  it) both read `med`. **Axis 2 below is the priority**, and `Sev` has never been re-derived
  against it.
- **`Status`** — a verdict plus a confidence tag. `corroborated` (two independent passes found
  it) · `spot-checked` (confirmed by hand) · `candidate` (single-source, unverified) · `caveat`
  (a passing guard disagrees — say so) · `source` / `measured` (re-verified against the code or
  by instrument) · `deferred` (an owner declined it; the reason goes in the status, and
  re-deciding needs the owner rather than a re-measurement).
- **Detail block** — required for `high` and `med`, and the validator fails without one. A
  concrete failure scenario (inputs → wrong result) plus a one-line fix direction. Lows may be
  table rows alone.
- **Anchors carry a content fingerprint** (`"fp:…"`). `--reanchor` slides a line number when the
  code merely moved and prints the rows whose content actually changed; only a reader can judge
  those.
- **Ids are never reused and never renumbered.** Published `AGENTS.md` cites `#378`, and roughly
  70 ids are cited in prose across these files.

**No per-row column, here or in the ledger.** Membership is assigned by reading and joined at
report time, exactly as PLAN.md §5 requires of clusters — a `Kind` column over 400+ rows would
be a second truth that decays silently. If a tally is ever needed, **enumerate the ids**; a count
without names cannot be audited, and this file states none.

---

## Axis 1 · Kind — what is wrong

### A · Accessibility

| | Definition | Verified example |
| --- | --- | --- |
| **A1 semantics-and-name** | Role, state, relationship or accessible name wrong, absent, or set on an element ARIA does not support it on. AT builds a false model. | #314 — `aria-selected` on a `<button>` |
| **A2 announcement** | Live regions: never announced, wrong politeness, or N regions where one belongs. | #63 — four skeletons, four `role="status"` |
| **A3 keyboard-and-focus** | Mouse-only operability, focus lost or misplaced, no roving index, focus ring erased or invisible. | #441 — chips are mouse-only removable |
| **A4 non-text-cue** | Meaning carried by colour or tint alone (WCAG 1.4.1). | #1 — Alert severity by colour |
| **A5 contrast** | A *measured* ratio under a WCAG floor. | #354 — sort arrow at 2.43:1 |

### B · Behaviour

| | Definition | Verified example |
| --- | --- | --- |
| **B1 logic-defect** | Computes, updates or fires the wrong thing; freezes; throws. | #442 — `onEndReached` deadlocks |
| **B2 data-loss / silent-failure** | User input destroyed, or a failure swallowed with no state, callback or log. | #334 — a rejected date silently clears the value |
| **B3 layout-breakage** | Geometry that leaves shipped content unreadable, overlapped, clipped or 0px. | #7 — a term's 2nd+ detail misaligns |

### C · Consumer contract — the API lies

| | Definition | Verified example |
| --- | --- | --- |
| **C1 prop-and-ref-passthrough** | Typed and accepted, dropped at runtime; or spread order lets the caller desync internal state. | #56 — `children` typechecks, dropped |
| **C2 type-surface-lie** | TS promises what runtime does not honour; missing `Omit`; unrepresentable states. | #359 — `selectable` inert unless two other props are passed |
| **C3 api-surface-gap** | No escape hatch, missing export, undocumented asymmetry with a sibling. | #463 — `defaultSort` exists, `defaultPage` does not |
| **C4 i18n-hardcoded** | English strings with no override path. | #406 — `aria-label="Commands"` |

### D · Design-system contract — ETHOS

| | Definition | Verified example |
| --- | --- | --- |
| **D1 token-contract** | Raw literal, or the wrong token *role*, where the contract designates one. | #4 — `bg-surface-0` where the contract says `--C-SURFACE-1` |
| **D2 theming-portability** | Correct on the default surface or theme, wrong on another *shipped* one. | #61 — `ring-surface-0` hard-codes the backdrop |
| **D3 motion-contract** | Unguarded animation, or timing as a literal against a themeable `--MOTION-*`. | #107 — 300 ms hard-coded; grimdark ships 350 ms |

### E · Environment and cost

| | Definition | Verified example |
| --- | --- | --- |
| **E1 platform-and-ssr** | Server render, hydration mismatch, `"use client"` placement, secure-context, cross-browser UA divergence. | #47 — SSR guard buys a hydration mismatch |
| **E2 resource-and-performance** | Orphan timers, post-unmount writes, permanent compositor layers, needless remounts. | #105 — one dead Map entry per dismissed toast |

### F · Repo health — nothing shipped is wrong for a user

| | Definition | Verified example |
| --- | --- | --- |
| **F1 dead-code-and-duplication** | Dead CSS or branches, SSOT violations, a hand-rolled copy of a component that exists. | #454 — dead guard on a required prop |
| **F2 stale-or-false-docs** | A docblock, JSDoc or README contradicting the code it documents. | #294 — comment claims a checkerboard that no rule paints |
| **F3 audit-meta** | Refutations, phantom rows, bookkeeping, gate blind spots, test integrity, declined decisions. | #459 / #460 — claimed and disproved; #464 — a gate reads token tables only |

---

## Axis 2 · Harm — why it matters, and therefore what order

1. **Blocking** — a documented capability is unavailable to *everyone*. (#442)
2. **Content-loss** — the user's own data or text does not survive, or cannot be read. (#7, #334)
3. **Exclusionary** — works for some users and not others: AT, keyboard, low vision, reduced
   motion, non-English. (#1, #441, #406)
4. **Portability** — right in the default context, wrong in another *shipped* one: second theme,
   dark surface, Firefox. (#61)
5. **Contract-only** — no user can observe it today; it violates ETHOS, the types or SSOT, and
   taxes every future change. (#4)
6. **Meta** — nothing shipped is wrong. (#459)

Kind decides *who* fixes it and *where*. Harm decides *what first*. The two are independent: a
frozen counter (B1) and a misaligned definition list (B3) are different kinds and the same harm;
a colour-only severity cue (A4) and a wrong surface token (D1) are both about colour and are four
harm levels apart.

**`Sev` is not Axis 2.** The existing column blends kind, harm and reach into one word, which is
why #7 (text unreadable) and #4 (no user can see it) both read `med`. Read `Sev` as inherited
prior, not as priority; it has not been re-derived against these axes.

---

## The three seams, and how to adjudicate them

These are where independent classifiers disagreed. The rule matters more than the verdict —
pick one and apply it, or rows drift between passes.

- **A5 vs D1 vs D2 — the colour seam, and the widest one.** If the row carries a *number*, it is
  A5. If it names a token *role* with no ratio, it is D1. If it asserts risk with neither, it is
  D2. A large family sits on this seam by editorial decision rather than by nature (#155, #177,
  #207, #225, #241 among them), several because they were explicitly re-scoped off the ratio and
  onto the token role after the owner declined the palette retune twice. Re-scoping a row across
  this seam changes who owns the fix and which package it lands in — say so in the row.
- **C1 vs B1.** A dropped or overridden prop is C1 even when the symptom is a broken feature. The
  fix is in the signature and the spread order, not in the logic.
- **D3 vs the A family.** Motion rows file by *cause* (a contract violation), though their harm is
  exclusionary. That is safe only because Axis 2 carries the urgency separately.

---

## What the classification pass has not yet done

Deriving these axes required reading every row once, which surfaced two structural observations
about the file — neither yet enumerated, so neither is stated as a count:

- **F3 rows are findings about the audit, not about the library.** They are worth keeping and they
  are not defects. Held in the same table, they inflate the open count and they are the reason the
  ledger's preamble needs six paragraphs of warnings before the first row.
- **Some rows are closed doors, not backlog** — the `deferred` and `wontfix` decisions (#207,
  #310, #463 among them). In a table named Findings, a declined decision reads as outstanding work
  to every reader who has not read the preamble.

Acting on either needs the enumeration first. Assigning kind and harm per row is a reading pass,
not a regex pass: the sampling runs that produced these categories were a means to derive them and
are **not** a per-row verdict anyone should inherit.
