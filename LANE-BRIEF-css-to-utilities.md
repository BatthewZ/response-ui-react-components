# Lane brief — move component CSS into Tailwind v4 utilities

You are one of five parallel lanes. Read this file in full before touching anything. Your lane
prompt names your ten components; everything else about how to do the work is here.

**Working directory:** `/home/wyrez/coding/@batthewz/response-ui-react-components`.
Branch `feat/v0.12.0`. The tree is clean at `a24f41d`, which is the worked reference for this task.

---

## 1. The goal, and the standard

Reduce component CSS to Tailwind utilities wherever a utility is genuinely the better home, and
**leave behind a stylesheet that states why each surviving rule could not move**. Deleting a file
entirely is the best outcome; a file reduced to its irreducible core with a header comment is the
next best; an unexamined file is the failure.

**This is pre-v1 and there are no consumers.** Changing public API — adding a `classNames` slot,
renaming a class, changing a component's DOM structure, removing a prop — is *acceptable and
often correct* when it produces a cleaner, more consistent library. Do the right thing today to
make tomorrow easier. What is **not** acceptable is changing behaviour silently, or leaving the
docs, tests and naming contract disagreeing with the code you shipped.

**A partial conversion that leaves ~40 lines behind is worse than either extreme.** What survives
a half-conversion is always the subtlest content in the file, now stripped of the context that
explained it. If the whole file cannot go, think hard before moving the easy half — and if you
move it anyway, the header comment carries the reasons the residue stayed.

---

## 2. Read these first

- `AGENTS.md` § "Decision: what stays in CSS, what becomes a utility, and how to tell which you
  are looking at" — the **criterion**. Do not invent your own.
- `memory/css-to-utilities.md` — every trap already measured. This is the highest-value document
  for this task and it will save you hours.
- `TAILWIND-V4-VARIANTS.md` — the variant vocabulary, and why it is not the authority.
- `SLOT-VOCABULARY.md` — the frozen naming contract, if you need a `classNames` slot.
- The worked reference, in full: `git show a24f41d -- src/components/ui/Accordion.tsx
  src/components/ui/Accordion.css src/components/ui/Accordion.test.tsx
  docs/components/accordion.md`. Every pattern below is demonstrated there.

---

## 3. The test, per declaration

1. Is there an element this component renders that the class could go on? No → **stays** (but see
   §5 — the answer is sometimes "not yet, so render one").
2. Does the declaration have a property a utility can set — is the read site a property, rather
   than a `calc()` or another custom property's value? No → **stays**.
3. Would landing in `@layer utilities` invert something — a modifier it must lose to, or an
   unlayered foundation rule it must beat? Yes → **stays**.
4. Is the utility form one class or N variant-scoped ones? N → convert only with the cost stated.
5. Does the declaration depend on being **first in its rule** — a blanket reset, or anything whose
   correctness comes from later declarations in the same rule overriding it? Yes → **stays**, or
   must be enumerated rather than transposed.

---

## 4. Facts already measured. Do not re-derive these; do not contradict them without measuring.

- **Tailwind emits arbitrary-property utilities LAST in `@layer utilities`.** So `[all:unset]`,
  `[font:inherit]`, `[background:none]` — every blanket reset — inverts when converted: it wipes
  the declarations it was meant to precede *and* starts beating the caller's `className`, which it
  currently loses to. **Resets stay in the component layer.** Only positive declarations convert.
- The enumeration escape is real but is a *measurement*, not a transposition: Tailwind Preflight
  already gives `<button>` `background-color: transparent`, `border: 0 solid`, `font: inherit`,
  `color: inherit`, `border-radius: 0`, `box-sizing`, `margin: 0`, `padding: 0` and
  `appearance: button`. `Button.tsx` relies on exactly this and carries no reset. If you enumerate,
  say in a comment what you checked.
- **Variant-scoped utilities are safe against their own base**; bare-vs-bare siblings are not. A
  `data-*`/`aria-*` variant gains a specificity step (`data-[state=open]:x` emits at 0,2,0), and
  every variant utility is emitted after every bare one. The dangerous shape is **a base
  declaration and a sibling BEM modifier on the same element**, both 0,1,0.
- **`> *` is not `*:`.** `*:px-r6` emits `:is(.…> *)` at 0,1,0 but sorted *after* a child's own
  `.p-r5`, so the parent starts winning. From `@layer components` the child wins. See §5.
- **`outline-none` is a custom-property write.** It sets `--tw-outline-style: none`, and every
  `outline-<width>` utility reads that back — so "reset it, restore it at higher specificity"
  computes `none` anyway. The repair is `outline-solid`.
- **Vendor pseudo-elements**: `[&::-webkit-slider-thumb]:size-5` compiles and emits the right
  selector. But `appearance-none` drops the `-webkit-` prefix; `verify:focus-affordance` cannot
  parse an arbitrary-value ring (write the colour as a token name — `shadow-border-focus` — or the
  control leaves coverage silently); and putting the state variant on the wrong side
  (`[&::-webkit-slider-thumb]:focus-visible:…`) compiles to a selector that never matches.
- **Spellings that are not what they look like:** `font-[inherit]` is `font-family: inherit`, not
  the shorthand (`[font:inherit]` is). `border-inherit` is `border-color: inherit` only.
  `bg-none` is `background-image: none` only.
- **`--MOTION-*` is in no Tailwind namespace.** `ease-shift` generates nothing. Use
  `duration-[var(--MOTION-DURATION-SHIFT)]` / `ease-[var(--MOTION-EASE-SHIFT)]` — the bracket
  spelling, not v4's `(--X)` shorthand, because only the bracket form is resolvable by
  `verify:component-docs`. `duration-fast|normal|slow` DO work, from `--transition-duration-*`.
- **`hover:` compiles to `@media (hover: hover) { &:hover }`.** Converting a `:hover` rule changes
  coarse-pointer behaviour. That matches the rest of the package; note it, don't fight it.

---

## 5. Sometimes the answer is one more element

This is the newest pattern and the most under-used. Accordion's panel inset was a `> *` rule
because the box the padding would otherwise sit on is the grid item that the `0fr` row collapses,
and **padding survives that collapse** (measured: a 12px strip). The fix was neither a utility nor
the stylesheet — it was rendering the padded body itself. The `> *` rule went, the declaration
became an ordinary utility, and two quirks went with it.

**When a rule targets the consumer's children, ask why it is not targeting an element of your own
first.** A `> *` selector is often a missing wrapper.

But: **a new inner element must be reachable, or you have moved the problem.** `className` lands
on the root, so an inner element needs a `classNames` slot. Pick the name from
`SLOT-VOCABULARY.md` §6 (priority: a class-name stem already used by ≥2 components). If the
element you need has genuinely no name in that document, **stop and record it in your lane report
as an owner decision** rather than inventing one. Annotate any unreachable `className` with a
leading `// slot:(a|b|e) <reason>` — `verify:slot-annotations` enforces this, and an `(a)` that
isn't true ("no route is owed") is a lie the gate cannot catch.

**Corollary:** put an *inherited* property (colour, font-size, line-height) on the element
`className` addresses, not on an inner one. On an inner element it is a rule the caller cannot
outrank — their class lands in the DOM and changes nothing.

---

## 6. Tooling

```
bun run scripts/probe-utility-exists.mjs [--css] '<class>' ['<class>' …]
```

Compiles the candidate against this repo's real Tailwind 4.3.3 **and** `response-ui-css`. Exit
non-zero if anything MISSes. **Every class string you ship must have been probed OK.** `--css`
prints the generated rules so you can read the emitted selector and judge specificity — do that
whenever the selector is doing real work. OK means it compiles, never that the conversion is
correct.

---

## 7. Tests

Exact-equality class assertions (`getAttribute("class")).toBe("foo")`,
`expect([...el.classList]).toEqual([…])`) are the most common blocker in the package, and they are
**yours to rewrite, not to work around**. The assertion is almost always standing in for two
falsifiers that survive the rewrite:

- an absent slot appends **nothing** — no `undefined`, no empty token;
- a slot lands on its own element and no other.

See the rewrite at `git show a24f41d -- src/components/ui/Accordion.test.tsx` — membership check
plus `expect(classes).not.toMatch(/undefined|null|\s{2,}|^\s|\s$/)`, and a per-slot negative.
Where a test's docblock says exactness is deliberate, answer that prose in your commit or lane
report rather than silently deleting it.

**Add a test for every slot you add** (one per slot, each the falsifier for its own `cn()`), and
for any behaviour you change.

**No patch lands without a check observed failing first.** Break the thing once, watch exactly the
intended test go red, restore, confirm green. This is a house rule and it has caught real bugs.

---

## 8. What you own, and what you must not touch

**Yours** (nobody else edits these):
- your ten components' `.tsx`, `.css`, `.test.tsx`, `.examples.tsx`
- their `docs/components/<name>.md` spokes — **update them**; `verify:component-docs` checks the
  token table against source, and a row must name the utilities that reach each token
- one line each in `src/styles.css` **if and only if you delete a stylesheet**: remove that file's
  `@import … layer(components);`. Re-read the file immediately before the edit — four other lanes
  are editing other lines of it. Make a single-line targeted edit, never a rewrite.

**Shared — DO NOT EDIT. Record what you would have written in your lane report instead:**
`CHANGELOG.md`, `AGENTS.md`, `memory/**`, `SLOT-VOCABULARY.md`, `PLAN-overridability.md`,
`TAILWIND-V4-VARIANTS.md`, `scripts/**`, `dev/**`, `src/index.ts` barrels, and any component not
in your lane. A consolidation agent merges these at the end.

**Never:** write an example theme name (`events`, `grimdark`, `tech`) into a selector, type,
default, config list or fixture — `bun run verify:example-themes` enforces it and the fix is
almost never an allowance. Never add an eslint/ts suppression. Never add `!important` without the
admission test in `AGENTS.md`.

**Cross-component selectors:** some stylesheets style elements another component renders
(`menu-internals.css`, `Table.css` vs `VirtualizedDataTable`/`DataTable`). `grep -rn '<class>' src`
before ruling, and if the element belongs to a component outside your lane, say so in your report
and leave it.

---

## 9. Workflow

1. **Sweep.** Convert all ten components in one pass. Do not stop to run tests. For each file
   decide: delete entirely / reduce to a stated core / leave with a reason.
2. **Verify the batch in one sweep.** Then, and only then:
   ```
   bun run typecheck
   bun run lint
   bunx vitest run <your ten test files>
   bun run verify:component-docs && bun run verify:slot-annotations && bun run verify:docs
   bun run verify:css-layering && bun run verify:no-css-imports && bun run verify:focus-affordance
   ```
   Do **not** run the full `bun run test` or `bun run probe:cascade-layer` — the consolidation
   agent runs those once, and five concurrent full suites would thrash the machine.
3. **Fix everything you broke.** A red gate is your work, including a gate that went red for a
   reason that looks unrelated to your diff.
4. **Commit** your lane as one commit: `refactor(css): lane N — <summary>`, body naming each file's
   outcome and the reason for each survivor. End with
   `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`. Commit only your own
   files. If `git status` shows changes outside your lane, leave them.

---

## 10. Deliverable

Write `lane-reports/lane-<N>.md` (create the directory if needed) with:

- A table: component · verdict (DELETED / REDUCED / UNCHANGED) · lines before → after · the single
  reason for each survivor.
- **Public API changes**, each with its justification — new slots, renamed classes, changed DOM
  structure, removed props. Be explicit; this is what the consolidation agent turns into a
  CHANGELOG.
- **Proposed edits to shared documents** you were not allowed to make — AGENTS.md "What stays"
  rows, SLOT-VOCABULARY entries, memory lessons. Write the exact prose you would have committed.
- **Refutations**: anything in AGENTS.md, the survey, or this brief that you measured and found
  wrong. A refutation is a full outcome and is more valuable than a conversion.
- **Anything you did not do, and why.** Silent scope reduction is the one unrecoverable failure —
  if you skipped a file, say so plainly.

Your final message back should be a short summary: per-component verdicts, total lines removed,
API changes, gate status, and anything the consolidation agent must resolve. Do not paste the
whole report.
