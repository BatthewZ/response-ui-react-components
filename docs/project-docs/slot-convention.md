# Phase 3 — the copyable convention

The written half of `cascade-and-slots.md` §9's *"the written convention plus one worked
reference component"*. The worked half is **`StatCard` + `Sparkline`**, shipped in this commit;
every skeleton below is lifted from it rather than written for the page.

**Read order.** `cascade-and-slots.md` §4a, §4b, §4d, §5, §7 (items 1–12) and §9 for the *rules*;
`slot-vocabulary.md` in full for the *names*; this file for the *shape*. Where this file and
either of those disagree, they win and this file is the bug.

**This file does not add a rule.** It records how the rules resolve into code, and one decision
each that the plan leaves to the lane. Where the reference lane had to judge, the judgement is
marked **▸ judgement** with its reason, so a lane can disagree with it deliberately rather than by
accident.

---

## 0. What Phase 3 is not

- **Not a sweep of class literals.** `grep -rno 'className="[^"{]*"' src/components` returns ~238
  and most of them are correct as they stand. The requirement is §7 item 3 — *reachability* — not
  the absence of static strings.
- **Not "every internal gets a slot".** The reference lane's triage returned **one** slot across
  two components and six not-a-gap rulings. That ratio is normal. §6 Phase 3: *"a lane that 'fixes'
  a non-gap costs more than one that misses a real one, because the fix lands in public API."*
- **Not a place to invent a name.** Every slot key comes from `slot-vocabulary.md` §6 or that
  component's family table in §7. If the element you need has no name there, **that is an owner
  decision (§1.5, last line), not a lane's** — stop and report it.
- **Not visual.** Phase 3 is additive and a no-op on screen, and every assertion it needs is a
  class string in jsdom. If you find yourself wanting a browser, something has gone wrong — say so
  rather than reaching for one.

---

## 1. The type and the prop

```ts
// src/util/style.ts — already shipped, do not re-declare it per lane
export type SlotClassNames<S extends string> = Partial<Record<S, string>>;
```

And at the component, with the slot union written **inline**:

```ts
type StatCardTrendProps = {
  value: number;
  direction: TrendDirection;
  sentiment?: TrendSentiment;
  format?: (value: number) => string;
  /**
   * Class overrides for the internals this component renders. `className` is the
   * root — the badge itself — so the only slot is the arrow, which no caller can
   * otherwise reach. The union is written out here so an unknown key is a type
   * error rather than a silently ignored one.
   */
  classNames?: SlotClassNames<"trendIcon">;
} & Omit<ComponentPropsWithRef<"span">, "children">;
```

Five things that are load-bearing, each with the plan's reason:

| | Rule | Why |
| --- | --- | --- |
| 1 | The prop is **`classNames`** | Not `slots` (react-aria/MUI mean different things by it), not `$`-prefixed (the keys are already namespaced), and never an overload of `className` — `cn({"border-0": true})` is clsx's conditional-object form, so a slot object under `className` makes `className={{"border-0": isActive}}` a silently-ignored slot named `border-0` (§4a) |
| 2 | The union is **inline and per-component** | §4a rejects an `extractSlotClassNames` helper by name. A helper typed `Record<string, string>` gives no autocomplete and turns a typo into a no-op; the inline union makes it `TS2353` |
| 3 | **No `root` key** | `className` is the root. Two writers for one element is `CLAUDE.md` rule 3 |
| 4 | **Class strings only** | Where a caller needs handlers or `aria-*` on an internal, that is a `<thing>Props` hatch (§4). A general `slotProps` invites wiring `onClick` into an element tree the consumer should not depend on |
| 5 | **A slot per element, never beside a subcomponent** | `slot-vocabulary.md` §1.5a: a component gets `X` the subcomponent **or** `x` the slot for a given element, never both. This is why `StatCard` has no `value`, `label`, `icon` or `sparkline` slot — `.Value`, `.Label`, `.Icon` and `.Sparkline` already reach those elements |

---

## 2. Where it is destructured, merged and defaulted

```tsx
const StatCardTrend = forwardRef<HTMLSpanElement, StatCardTrendProps>(function StatCardTrend(
  { value, direction, sentiment, format, className, classNames, ...props },
  ref
) {
  return (
    <span ref={ref} className={cn("stat-card__trend", …, className)} {...props}>
      {direction !== "neutral" && <TrendArrow className={classNames?.trendIcon} />}
      …
    </span>
  );
});

const TrendArrow = ({ className }: { className?: string }) => (
  <svg className={cn("stat-card__trend-icon", className)} …>
);
```

- **Destructure it.** `classNames` is not a DOM attribute; leaving it in `...props` puts
  `classnames="[object Object]"` on the element and React says nothing useful. There is a test for
  this — see §5.
- **Never default it to `{}`.** Read it as `classNames?.slot`. A `= {}` default allocates a fresh
  object every render for no benefit, and the optional chain is what the type already promises.
- **Merge with `cn()`, base class first, slot last.** What makes
  `classNames={{trendIcon:"size-r3"}}` *replace* the `width`/`height` the base class sets is
  `@layer components` — tailwind-merge cannot see a conflict between a component class and a
  utility, and `cn("stat-card__trend-icon", "size-r3")` returns **both**, in either order. Order
  is what settles a collision between two *utilities* (the tint on `StatCard.Sparkline`, where
  `cn(tint, className)` is what lets a caller's `text-chart-1` beat `text-trend-up`), so keep it
  base-first anyway: it is the one order that is right in both cases.
- **`cn()` wherever a caller class can arrive — and nowhere else.** §7 item 5. `cn("one-literal")`
  returns that literal unchanged, so wrapping a lone static string is a provable no-op
  (`memory/affordances.md`) and a lane adding one has done nothing but hide which elements have a
  route.
- **A slot on a repeated element lands on every instance.** That is documented in the slots table,
  not encoded in the key (`slot-vocabulary.md` §1.3). No slot names "the 15th one".

**Where the internal is a private component in the same file** — `TrendArrow` here — pass the slot
value down as a plain `className` and let the leaf do the `cn()`. The merge stays next to the base
class it is merging with, which is what keeps the fail-on-purpose procedure in §5 a one-line edit.

---

## 3. Naming a slot

**Defer entirely to `slot-vocabulary.md`. Do not open a second vocabulary.** The procedure, in
order, is that document's §1.6 and it is not a lane's to shortcut:

1. Is the concept in **§6**, the frozen cross-family table? Then that is the name, and a synonym
   is a defect.
2. Is it in your family's **§7** table? Then that name, marked family-owned.
3. Neither? **Stop.** Adding a §6 row is an owner decision (§1.5). Report it; do not invent.

Three traps the reference lane hit or nearly hit:

- **A name already spent is banned even when it fits.** `label` is hard-banned as a slot key in
  every family (30 distinct `*Label` props plus the exported `Label` component), which is why
  `stat-card__label` gets **no slot at all** — `StatCard.Label` the subcomponent reaches it.
- **The class name and the slot key are different namespaces.** Classes stay kebab-case
  (`stat-card__trend-icon`); keys are camelCase (`trendIcon`). They must share a *stem*, not a
  spelling (§1.1).
- **Check the ban list before the family table, not after.** `slot-vocabulary.md` §3 and §3.6
  together ban `root`, `wrapper`, `container`, `outer`, `box`, `content`, `label`, `chip`,
  `adornment`, `prefix`/`suffix`, `announcer`, `backdrop`, `separator`, `option`, `aside`, `node`,
  `subtitle`, `titles`, `inner`, `nav`, `affordance`, `slot`, `slots`, `slotProps`, `check`,
  `checkmark`, `star`, and `arrow` outside the floating-surface pointer. Each entry carries its
  reason; read the reason, because two of them are *narrowings* rather than bans.

---

## 4. The cross-component seam: `<thing>Props`

`classNames` reaches elements **this** component renders. When the target is **another
component**, the shipped pattern is a props hatch (§4a). The reference form is `CodeBlock`'s, and
it is exact:

```tsx
copyButtonProps?: Omit<ComponentPropsWithRef<typeof CopyButton>, "value">;

<CopyButton
  value={code}
  {...copyButtonProps}                                        // bag first
  className={cn("code-block-copy", copyButtonProps?.className)}  // merge last, base first
/>
```

Four rules:

1. **Library base class first, caller's last** — `cn("code-block-copy", copyButtonProps?.className)`.
   This is what §4a names as correct.
2. **Spread the bag, then set `className` after it**, or the raw bag `className` overwrites the
   merge. The order above is the shipped one.
3. **`Omit` the props the wrapper owns** (`value` here), so the type cannot express two writers.
4. **Name it `<camelCaseTargetName>Props`**, singular. Never `slotProps` (§4a).

A class-free target may take a raw spread with no `cn()`, and its docblock must say so —
`Spotlight.tsx:111` is the package's one such carve-out (`slot-vocabulary.md` §13.1).

### ▸ judgement — when a hatch is *wrong*, and how the reference lane found out

`slot-vocabulary.md` §13.3 listed `sparklineProps` for `StatCard.Sparkline`. **It does not survive
at source, and the row is now withdrawn there.** `StatCardSparklineProps` is

```ts
{ direction?: TrendDirection; sentiment?: TrendSentiment } & ComponentProps<typeof Sparkline>
```

— every one of which is spread onto the inner `<Sparkline>`, whose `<svg>` is also what `ref`
addresses. The inner component already has a **complete** prop route through the wrapper's own
surface, so a `sparklineProps` bag would be a *second* writer, not a first (`CLAUDE.md` rule 3).

**The test to run before adding any hatch:** *can the caller already reach the inner component's
`className` through the wrapper's own props?* If yes, the wrapper is a pass-through and there is
nothing for a hatch to open; the only live question is which element `className` names, which is
§4b's and is answered in §6 below. If no — `AvatarUpload`'s inner `Avatar`, whose `className` is
hardcoded while the component's own goes to its root — the hatch is right.

---

## 5. The slot-override test, and making it fail on purpose

**One slot-override test per slot.** Not per component, per slot. jsdom is sufficient and no
stylesheet is involved (§6 Phase 3).

```tsx
it("lands classNames.trendIcon on the arrow, beside the base class", () => {
  const { container } = render(
    <StatCard.Trend value={1} direction="up" classNames={{ trendIcon: "size-r3" }} />
  );
  const arrow = container.querySelector("svg");
  expect(arrow?.getAttribute("class")).toContain("stat-card__trend-icon");
  expect(arrow?.getAttribute("class")).toContain("size-r3");
});
```

Ship **four** more alongside it. The first is the falsifier's target; the rest are the ones a
"simplification" breaks, and each caught something real in review:

| Test | What it catches |
| --- | --- |
| the base class survives when **no** slot is passed (`toBe`, not `toContain`) | a merge that drops the library class when the slot is `undefined` |
| the slot class is **not** on the root | a slot wired to the wrong element, which `toContain` on the child cannot see |
| an unknown key is a **type error**, pinned with `@ts-expect-error` | §4a's whole reason for an inline union. The directive *is* the assertion — it fails if TS ever stops rejecting the key. Do not "clean it up" |
| `classNames` does **not** reach the DOM | a missing destructure, which React does not warn about usefully |

### The fail-on-purpose procedure — run it, do not reason about it

For **each** slot, separately:

1. Delete that slot's `cn()` merge, leaving the bare base class.
2. Run that component's test file.
3. Confirm **exactly the slot-override test** goes red.
4. Restore, and confirm green.

Recorded verbatim for the reference slot, so a lane knows what a working falsifier looks like.
With `className={cn("stat-card__trend-icon", className)}` reduced to `className="stat-card__trend-icon"`:

```
 ❯ src/components/ui/StatCard.test.tsx (55 tests | 1 failed) 217ms
       × lands classNames.trendIcon on the arrow, beside the base class 6ms

 FAIL  src/components/ui/StatCard.test.tsx > StatCard > Trend > lands classNames.trendIcon on the arrow, beside the base class
AssertionError: expected 'stat-card__trend-icon' to contain 'size-r3'

Expected: "size-r3"
Received: "stat-card__trend-icon"

 Test Files  1 failed (1)
      Tests  1 failed | 54 passed (55)
```

**Read the count, not just the colour.** `1 failed | 54 passed` is the result you want: the
override test reddens and the four companions stay green, because they assert *absence* and cannot
see the merge. A run where two or more redden means a companion is asserting the same thing twice;
a run where **none** reddens means the slot is a prop that lands in the type and nowhere else,
which is the defect this whole procedure exists to find.

---

## 6. Recording a triage annotation

§7 item 3 accepts **either** a seam **or** an explicit annotation with its reason. §8's
`verify:slot-annotations` gate reads the second half. **It has shipped** — the syntax below is no
longer a proposal but the enforced convention, and `scripts/verify-slot-annotations.mjs` is where
it is written down for a parser rather than for a reader.

### The syntax

A comment **inside the JSX opening tag**, in the `className` attribute's leading trivia:

```tsx
<span
  // slot:(a) the accessible twin of the ticking figure. A slot here hands a
  // caller the one class that keeps the real value out of the visual flow,
  // and dropping `sr-only` prints the number twice (slot-vocabulary.md §11).
  className="sr-only"
>
```

Grammar: `slot:(<letter>) <reason>` where `<letter>` ∈ `a b c d e f` and `<reason>` is non-empty.
Continuation lines need no marker — the annotation is the whole leading comment block, and other
comments may sit above it. A marker that looks like an attempt and does not match — an empty
reason, a letter outside the range — is reported as **malformed** by name, rather than falling
through to "unannotated" and reading as an oversight.

### Which letters settle an unreachable element: (a), (b) and (e) only

The grammar parses six letters; **three of them discharge a site**. That is not a shortlist of the
"good" outcomes — it follows from the one question the gate is asking, which is not *was this
triaged* but **does the consumer's need have a route somewhere other than this attribute?**

| | Means | The route it points at |
| --- | --- | --- |
| **(a)** not a gap | the class **is** the mechanism | none is owed — the class is not a style to swap |
| **(b)** token | the override is a *value*, not a choice of utilities | a custom property |
| **(e)** render prop | the component still **builds** the subtree and dispatches over data no caller could reconstruct, so it has to hand the renderer the branch it took | a `render*` prop — a **function** the component calls with what it computed |

**(a) and (e) both read as "replaced wholesale", and this row's wording used to make them
indistinguishable.** It said (e)'s route could be *"a `ReactNode` prop that replaces the node
outright"*, which is true of `Alert`'s `statusIcon`, `ErrorBoundary`'s `fallback` and
`RequireAuth`'s `loadingFallback` — none of which is (e). **The discriminator is who computes the
element** (`memory/README.md` §72):

- **(e)** — `FileUpload`'s `renderPreview`/`renderFile`. Which of three private preview components
  renders is chosen from MIME types and `previewMode`; a caller cannot reconstruct that, so the
  component hands them `layout`, `index`, `remove` and the rest. The class literals inside those
  subtrees are content the caller has to be *given*.
- **(a)** — a `ReactNode` prop that swaps one node in. The caller supplies their own element
  carrying their own classes, so nothing is handed over and no `render*` is owed; the library's
  class on the default is a default, not content. **A whole default *branch* behind a fallback
  prop lands here too**, for the same reason — `ErrorBoundary`'s four literals are one ruling.

Filing the second group (e) because "the node is replaced" is a 19-site churn against a ruling the
fan-out already took, and the sentence above is what invited it.

The other three answer *no*, because each one **ends in a `className` merge** — at this attribute
or at another — so an unreachable element carrying one is a contradiction, and the gate reports it
as its own failure rather than accepting or ignoring it:

- **(c) slot** — the route is `cn(base, classNames?.key)` *right here*, so a settled (c) is
  **reachable** and needs no comment. See the judgement below: (c) is proved by the code.
- **(d) compound** — the route is the subcomponent's own `className`, at a different and reachable
  attribute. Left annotated here, it means the compound was *named and not built*.
- **(f) just-`className`** — §4b's house rule: add `className` and merge it. Once done, the
  attribute is reachable.

So the failure mode this rule exists to catch is not a missing letter but a **letter used as a
receipt**: `(c)` written at an element that has no `classNames?.key` in its `cn()` is a promise
the code does not keep, and it now fails by name.

**The placement rule is "the annotation must start a line", not "the line before".** That
distinction is the parser's, not prose's, and it was measured rather than assumed — a first
version of this section said "the line(s) immediately preceding" and was wrong in *both*
directions. `ts.getLeadingCommentRanges` returns a comment only when nothing but whitespace
precedes it on its own line, so:

| Form | Seen? |
| --- | --- |
| annotation on its own line, `className` on the next — **the house form** | ✔ |
| annotation on its own line, `className` on the *same* line after it | ✔ |
| annotation on its own line, other attributes above and below it | ✔ |
| an ordinary comment above the annotation | ✔ — the block is scanned, first match wins |
| `<div /* slot:(a) … */ className="x" />`, all one line | **✘** |
| `<div /* slot:(a) … */` with `className` on the next line | **✘** |
| `id="x" /* slot:(a) … */` then `className` on the next line | **✘** |
| the comment above the *element* rather than inside the tag — `{/* … */}` or `//` before `<div` | **✘** |

Every ✘ fails **loudly** (`FAIL — unreachable and unannotated`), never silently green, so the
direction of failure is safe. But two of them are what a lane will actually write: the last row is
the natural instinct for a one-line element — you have to break the tag open to annotate it — and
the first ✘ is what you get if you hand-collapse a tag. There is no formatter in this repo
(`prettier` is not a dependency), so nothing reflows these behind your back; a lane that adds one
must not assume that stays true.

### Why this is machine-readable

The gate never has to guess which element an annotation belongs to. In the TypeScript AST the
annotation is `getLeadingCommentRanges` of the `JsxAttribute` node named `className` — one hop, no
line arithmetic, no "nearest preceding comment" heuristic that a formatter can silently break. So
the gate is:

> For every `JsxAttribute` named `className` in `src/components/**/*.tsx` (excluding `*.test.tsx`
> and `*.examples.tsx`), the element is **reachable** — its initialiser is or contains an
> identifier named `className`, or a property access on `classNames` — **or** its leading comments
> match `/^\s*slot:\(([a-f])\)\s+\S/` **with a letter in `{a, b, e}`**. Anything else is a
> failure — including `(c)`, `(d)` and `(f)`, which fail by name rather than reading as an
> oversight.

Both halves are decidable by a parser, which is exactly the split §8 asks for: the gate decides
*"does a caller's `className` flow here"* and takes *"should it"* from the annotation. It needs no
allowlist, an empty reason fails the pattern, and an annotation on a reachable element is a
contradiction the gate can also report.

#### What the reachability half cannot see — measured, and it bounds the gate

**The test is a name match on the attribute's initialiser text, not data flow.** That is what keeps
it to ~25 lines with no allowlist, and it is why the gate is a *reachability* check rather than a
correctness one. Three shapes it gets wrong, each verified by running the probe over a fixture:

| Shape | Verdict | Why it matters |
| --- | --- | --- |
| `const cls = cn("x", className)` then `className={cls}` | **FAIL** — false alarm | The element is reachable; the identifier is not spelled `className` at the attribute |
| `const { item } = classNames ?? {}` then `className={cn("x", item)}` | **FAIL** — false alarm | Same shape, one level down |
| a private leaf taking the slot value under another prop name — `<Leaf tone={classNames?.item} />` | **FAIL** — false alarm | §2's rule says pass it down as `className`; this is the enforcement |
| `const className = "some-static-string"` in scope, then `className={className}` | **ok — reachable**, wrongly | **The one direction that fails silently.** `AGENTS.md`'s own `cn()` example names its local `className`, so the shape is house style |
| the props-getter form — `className: "…"` in an object literal, spread onto an element | **invisible** | Not a `JsxAttribute`, so the walk never visits it. Live at `MultiSelect.tsx:337`, `:370` and `ColorPicker.tsx:289` (plan §7 item 5) |

So **"cannot be satisfied by a lie" is too strong**, and the honest statement is narrower: it cannot
be satisfied by an *empty* annotation, and its false negatives are three named shapes rather than an
open set. Two consequences for a lane:

- **Keep the `cn()` at the `className` attribute.** Do not hoist the merge into a local, and do not
  rename a leaf's `className` parameter. The false alarms above are the gate telling you to write
  the house form, so the cheapest response is to write it — not to widen the regex, which is how a
  gate acquires the allowlist §8 says it must never need.
- **The three props-getter sites are a hole a lane will meet, not a hypothetical.** `MultiSelect`
  and `ColorPicker` are both in fan-out scope. Their class literals need triaging by hand; the gate
  will not ask.

**Verified, not assumed — twice.** Comments between JSX attributes compile and lint clean in this
repo (`bun run typecheck`, `bun run lint --max-warnings 0`). And the parse was *run*, over the
reference lane's two files, rather than reasoned about — because "a parser could read this" is
exactly the kind of claim that turns out to be false at the AST. Every `className` attribute in
both files resolved to one of the three states, with no unclassified sites:

```
src/components/ui/StatCard.tsx
  :  30  ok — reachable          … 7 more reachable
  : 154  ok — annotated (a)      the sr-only twin
  : 311  ok — annotated (a)      the sparkline box

src/components/data-display/Sparkline.tsx
  : 143  ok — annotated (b)      bar
  : 159  ok — annotated (b)      point
  : 180  ok — annotated (b)      area
  : 190  ok — annotated (b)      line
  : 210  ok — reachable          the <svg> root
```

**The line numbers in that block rot on the next edit to either file — re-run it, do not read it.**
Rewording one annotation by a line moves five of them, and this block has already been wrong once
for exactly that reason. What is durable is the shape: three states, and **zero** in the fourth.

**Sized for the fan-out, so nobody plans off this lane's two files.** When this was written the
probe read **426** `className` attributes over `src/components`: **153** reachable, **6**
annotated (this lane's), **267** neither. That 267 was the annotation backlog the five lanes
divided, and it was the same order as plan §8's *"~300 of 478 literals"* — which is why the gate
could not be turned on before the annotations landed, and why §8 scheduled it after.

**Those four numbers are a snapshot of a backlog that is now closed, so they are dated rather
than current — re-derive, do not quote.** The shipped gate prints its own totals on every run:

```
bun run verify:slot-annotations
verify:slot-annotations — 432 className attributes under src/
  reachable: 329   annotated: 103 (a:78 b:6 e:19)   failing: 0
```

`src` and `src/components` give the same 432, because every `className` attribute in the package
is inside a component file — the optional root argument is how you check that, and it is also how
the fail-on-purpose procedure runs against a throwaway copy instead of editing `src/` in place.

**And it was made to fail on purpose**, because a classifier that cannot come back red is not
evidence (`memory/gates.md`). Deleting one annotation and re-running:

```
  : 141  ok — annotated (b)
  : 155  FAIL — unreachable and unannotated
  : 176  ok — annotated (b)
```

The exact probe used is in the appendix below — ~25 lines, no allowlist. **It has since shipped**,
as `scripts/verify-slot-annotations.mjs` / `bun run verify:slot-annotations`, and that script is
the authority: it is the probe plus the three vacuous-pass guards and the (a)/(b)/(e) rule above,
and its header records the five named false-verdict shapes. Read it before the appendix, which is
kept only as the record of how the shape was arrived at. (An earlier revision of this paragraph
said the probe was deliberately *not* in `package.json` and that the `verify:*` count was "part of
the contract at 11". Both halves died when the gate landed — the count is **12**.)

**One nuance the probe surfaced, worth knowing before you write a lane.** A private leaf component
that takes a `className` parameter — `TrendArrow` here — reads as *reachable* at its own
`className` attribute, because the initialiser mentions `className`. That is correct: it is
reachable, from its caller. The **slot key** is then visible one level up, at
`<TrendArrow className={classNames?.trendIcon} />`, which the same rule classifies as reachable
via the `classNames?.` branch. So the gate sees both halves — but it sees them at two sites, and a
cross-check of "key exists in §7" has to look at the second. Do not try to collapse them by
inlining the leaf.

### ▸ judgement — (c) is proved by the code, so it needs no annotation

`slot-vocabulary.md` §9 asks for *every* element in §7 to carry its letter, including (c). The
reference lane annotated **only (a) and (b)** — the package now also carries (e) — and (c) is
omitted deliberately, for two reasons:

- `cn("stat-card__trend-icon", classNames?.trendIcon)` already *is* the (c) annotation, and it is
  more machine-readable than a comment — the gate's reachability half reads it directly, and the
  slot key is right there to cross-check against §7. A comment repeating it is redundant, and
  `CLAUDE.md` rule 7 says not to write it.
- A redundant comment rots. When the slot key changes, the `cn()` changes with it and the comment
  does not.

The cost is that the gate cannot distinguish "(c), decided" from "reachable, never considered".
That is real, and it is the same cost §7 item 3 already accepts by treating reachability as
sufficient. **If the owner wants (c) annotated too, the syntax above extends unchanged** — say so
before fan-out, because retro-fitting is a sweep across every lane.

### Two things an annotation must not be

- **Not a compound letter.** One element, one letter. Where a ruling reads "(a)+(b)" — the four
  `Sparkline` internals — pick the letter of the route that *exists* (`b`, the token) and name the
  (a) residue in the reason. A gate cannot branch on `(a)+(b)`.
- **Not a restatement of the class.** `// slot:(a) static class` is not a reason. The reason has to
  say what a consumer would break by getting a route, which is what makes it reviewable — and what
  makes it falsifiable when it turns out to be wrong.

---

## 7. The wrapper case — `className` and the §4b house rule

`className` → the outermost element the component renders. `...props` → the focusable control.
**Do not "fix" this into symmetry** — §4b records that the symmetric version was tried and
withdrawn (`<label for>` binds only to labelable elements, `div.focus()` is a no-op so
`focusFirstError()` dies silently, and an `inputProps` hatch restores neither `mergeProps` nor
`SearchInput`'s `id` guard).

### ▸ judgement — the reference lane did **not** apply §4b to `StatCard.Sparkline`, and why

`StatCard.Sparkline` renders `<div className="stat-card__sparkline">` around a `<Sparkline>`, and
`className` lands on the chart, not the box. Read literally, §4b re-points it — and that is what
`slot-vocabulary.md` §7.7 and §11 rule for the structurally similar `MediaCard.Image`. The lane
ruled the box **(a)** instead. The reasoning, because a lane meeting a wrapper will meet this
choice:

1. **The two cases are not the same shape.** `MediaCard.Image` configures an `<img>` it owns.
   `StatCard.Sparkline`'s props **are** `ComponentProps<typeof Sparkline>` and its `ref` is the
   `<svg>` — it is a pass-through of another component's whole surface, not a container with a
   child. Re-pointing `className` there splits one documented surface across two elements.
2. **It would regress a working capability.** The tint (`text-trend-up`) is merged *before*
   `className` on the chart, so `<StatCard.Sparkline direction="up" className="text-chart-1" />`
   paints chart-1 today via tailwind-merge. Move `className` to the box and the chart keeps
   `text-trend-up`, which wins over an inherited `color`. Closing that would need the hatch §4
   just showed to be a second writer.
3. **It is breaking, documented and test-pinned** — `docs/components/stat-card.md` states the
   element as `svg`, and a test asserts the merge. `memory/README.md` §7: documentation that
   contradicts your diff is a refutation to answer, not staleness to delete. The answer here is
   that the *residue* is small and named: `margin-top: auto`, which means something only as a flex
   child of `.stat-card`.
4. **A breaking public-API change of this class is the owner's** (plan §10, §14). A lane that takes
   it unilaterally has spent a one-way door on a judgement call.

**What a lane should copy is the procedure, not the verdict.** Ask, in order: (1) is the wrapper
bare and unstyled, with `className` landing on an inner element the component itself renders? Then
§4b, unambiguously — that was `TagInput` (cited as `:378`; `Select.tsx:30` and `NumberInput.tsx:170`
are the same shape, from `slot-vocabulary.md` §11). **`TagInput` is now the worked example rather
than the open case**: the owner ruled, `className` moved to the outer block and the field box became
`classNames.control`. §4b's other citation, `DatePicker.tsx:280`, is a *different* half of the same
rule — that element took `className` raw with no `cn()`, so it had no base class rather than no
route, and it is also fixed. **Both halves are discharged; the procedure below is what survives.** (2)
Does the wrapper forward another *component's* whole prop surface? Then the wrapper is plumbing,
the inner component is the public identity, and re-pointing `className` is an owner call. (3)
Either way, **annotate what you decided and why**, so the next reader sees a ruling rather than an
oversight.

---

## 8. Tokens before slots — and the §4d trap on the way

§4a: **prefer a token over a slot.** If the override is a *value*, expose a token; add a slot only
where the consumer must change *which utilities apply*. Two sub-rules that decide real cases:

- **Expose the pair, not the fill.** A fill token guarantees contrast only against its paired
  `on-*` ink; shipping one without the other invites a caller to set the fill and inherit a glyph
  colour chosen for a different background.
- **Keep the non-colour part of a cue private** (leading underscore). If an emphasis cue is a
  colour *and* a width and both are overridable, a caller can reduce it to colour alone and
  reintroduce the colour-only defect the width existed to prevent.

### The §4d trap, with the reference lane's worked instance

**Never declare a themeable default on the element that reads it.** Custom properties resolve per
element, and a declaration on the element beats an inherited one *regardless of cascade layer* — so
`@layer components` does not save you here and Phase 1 changed nothing about it.

`Sparkline.css` was a live instance, and the fix is the whole shape:

```css
/* before */                          /* after */
.sparkline {                          .sparkline {
  --sparkline-color: currentColor;      /* nothing — see the header comment */
}                                     }
.sparkline-line {                     .sparkline-line {
  stroke: var(--sparkline-color, currentColor);   /* unchanged */
}                                     }
```

The read sites already carried the identical fallback, so the deletion is byte-identical where
nothing sets the property and **reachable from a theme at `:root` where something does** — the
capability the declaration had been quietly denying. This is `memory/README.md` §22 again: deleting
the losing declaration beat out-ranking it, and it was the smaller diff.

Three consequences to carry:

- **Check the fallback before deleting.** `var(--x)` with no fallback is a different edit — the
  deletion changes behaviour rather than preserving it.
- **The doc is part of the fix.** `docs/components/sparkline.md` documented the limitation as a
  workaround (*"a wrapping rule cannot work"*), which is `memory/README.md` §16's shape exactly: a
  false cannot that reads as a decision. It is answered, not deleted.
- **It is untestable in this suite, and say so.** `vitest` stubs CSS to `""`, so no assertion
  exists for it — not a weak one, none (`memory/testing.md`). The probe cannot cover it either: the
  reading is identical on both sides of its layering A/B, so a row for it would be **inert**, which
  fails the run and is worse than no row. Record it as uncovered rather than letting a green suite
  imply otherwise.

---

## 9. What a lane must not do

1. **Do not invent a slot name.** No §6 row, no family-table row → stop and report. Adding a
   cross-family concept is an owner decision (`slot-vocabulary.md` §1.5).
2. **Do not ship a slot beside a subcomponent for the same element**, or a render prop beside one.
   §1.5a. That is the two-writers defect wearing three different hats.
3. **Do not add `classNames.root`, a `$` prefix, `slots`, or `slotProps`.** All four are ruled out
   at §4a with reasons.
4. **Do not put handlers, `aria-*`, `ref`s or `style` in `classNames`.** Class strings only.
5. **Do not add a slot for an element you have not proved unreachable.** Render with a caller
   `className` and read the class list — `memory/affordances.md`'s cheap disproof. If it landed on
   the root, the finding is *"the inner element has no route"*, which is a different claim needing
   its own evidence.
6. **Do not add a hatch to a pass-through wrapper.** §4's precondition test.
7. **Do not "fix" the house rule into symmetry**, and do not re-point a documented `className`
   target without the owner (§7 above).
8. **Do not touch `src/styles.css`.** The one carve-out is deleting the `@import` of a stylesheet
   you deleted in the same commit (§7 item 10) — and Phase 3 deletes no stylesheets.
9. **Do not touch `response-ui-css`, `response-ui-tw-merge` or `response-ui-renderer`**, *not even
   to add a script* (`memory/README.md` §6).
10. **Do not add an example fence to a doc without a placeholder line in it.** An **empty**
    ```` ```tsx ```` fence makes the generator swallow every heading up to the *next* example's
    closing fence, and the only signal is an `unused example` error naming a **different** example.
    Diff the page's heading list afterwards. (Adding prose and tables, as this lane did, avoids the
    trap entirely.)
11. **Do not suppress a TS or ESLint error** (`CLAUDE.md` rule 4). The one `@ts-expect-error` in
    §5 is an assertion — it fails when the error stops occurring — not a suppression.
12. **Do not write an example theme name** into a selector, type, default, config list or fixture.
13. **Do not report a count where a name will do.** §7 item 2 and `memory/README.md` §5: *a claim
    that counts instances instead of naming them cannot be audited.* Name every element you
    triaged and the letter you gave it.

---

## 10. The lane checklist

Per component, in order:

- [ ] Read the component's own **doc page** first. It is the cheapest refutation available
      (`memory/ledger.md`), and it has already killed one plan claim per phase.
- [ ] **Triage every element carrying a class literal** to (a)–(e), before writing code. Name them;
      do not count them. **Then look once at the internals carrying *no* class**, because the probe
      is blind to them and they are unreachable for the same reason: `StatCard.Value`'s
      `<span aria-hidden>` is one, and it is (a) — but a lane that only reads the probe's output
      will never have asked.
- [ ] Confirm each ruling against `slot-vocabulary.md` §7 and §11 — the (a) rulings are enumerated
      there and a disagreement is a finding, not a licence.
- [ ] Add `classNames?: SlotClassNames<"…">` with the union inline; destructure it; merge with
      `cn()`, base first.
- [ ] Add hatches only where §4's precondition test says yes.
- [ ] Annotate every (a)/(b)/(e) with `slot:(x) <reason>`. **(c), (d) and (f) are not annotations**
      — each ends in a `className` merge, so write the merge instead (§6).
- [ ] One slot-override test **per slot**, plus the four companions in §5.
- [ ] **Fail on purpose, per slot**, and paste the verbatim output into your report.
- [ ] Docs: slots table added, theme-token prose **answered** rather than deleted, examples still
      compile.
- [ ] Gates: `typecheck`, `lint`, `test`, all **12** `verify:*` (count it, do not remember it), and
      `probe:cascade-layer` at **0 regressions / 0 inert** for anything CSS-shaped.
- [ ] `git status` empty — **and** `scripts/.cascade-probe/` and `dev/dist/` explicitly checked,
      because both are gitignored and invisible to it (§7 item 12).
- [ ] Report: slot names frozen and why, the triage letter for **every** class-carrying element by
      name, the verbatim fail-on-purpose output, and anything you found wrong in the plan or the
      vocabulary.

---

## Appendix — the reference lane's own triage, in full

The format §7 item 2 asks for. `StatCard.tsx` and `Sparkline.tsx`, every element carrying a class
literal, named rather than counted.

| Element | Class literal | Resolution |
| --- | --- | --- |
| `StatCard` root `<div>` | `cn("stat-card", className)` | reachable — root, §4b |
| `StatCard.Value` `<span>` | `cn("stat-card__value", className)` | reachable — subcomponent root |
| `StatCard.Value`'s sr-only twin | `"sr-only"` | **(a)** — the class *is* the mechanism; a slot lets a caller print the figure twice |
| `StatCard.Label` `<span>` | `cn("stat-card__label", className)` | reachable — subcomponent root |
| `StatCard.Trend` `<span>` | `cn("stat-card__trend", …, className)` | reachable — subcomponent root; the `--up`/`--down`/`--flat` and `--positive`/`--negative`/`--neutral` modifiers ride it |
| `StatCard.Trend`'s arrow `<svg>` | `cn("stat-card__trend-icon", …)` | **(c)** → `classNames.trendIcon`, the lane's one slot |
| `StatCard.Icon` `<div>` | `cn("stat-card__icon", className)` | reachable — subcomponent root |
| `StatCard.Sparkline`'s box `<div>` | `"stat-card__sparkline"` | **(a)** — §7 above; the plan's *"one known unreachable wrapper"* |
| `StatCard.Sparkline`'s `<Sparkline>` | `cn(tint && …, className)` | reachable — `className` merges after the tint, which is what makes the tint overridable |
| `Sparkline` root `<svg>` | `cn("sparkline", \`sparkline--${variant}\`, …, className)` | reachable — root |
| `Sparkline`'s `<rect>` bars | `"sparkline-bar"` | **(b)** — ink is `--sparkline-color`; geometry is computed from `values` |
| `Sparkline`'s `<circle>` point | `"sparkline-point"` | **(b)** — same route; radius is `strokeWidth` |
| `Sparkline`'s area `<path>` | `"sparkline-area"` | **(b)** — ink is the token; `fill-opacity` is (a), it is what makes an area an area |
| `Sparkline`'s line `<path>` | `"sparkline-line"` | **(b)** — ink is the token; the dash pattern is normalised against `pathLength=1` and a caller class would fragment the settled line |

**One slot, two (a)s, four (b)s, seven reachable.** That distribution — mostly not-a-gap — is what
a correctly-run triage looks like, and it is the number to compare your own lane against.

---

## Appendix — the annotation probe, runnable

**Superseded — read `scripts/verify-slot-annotations.mjs` instead.** This is the feasibility
evidence for §6, kept as the record of how the shape was arrived at. The shipped gate is this
walk plus the three vacuous-pass guards, the malformed-marker report, the props-getter blind-spot
listing, and the `{a, b, e}` settling rule — so the `[a-e]` below is the *proposal's* grammar and
not the enforced one, and this probe still reads a bare `(c)` as settling where the gate fails it.
It reports three states and exits are the caller's to add; the gate does not cross-check slot keys
against `slot-vocabulary.md` §7 either, which stays a review job.

```js
import ts from "typescript";
import { readFileSync } from "node:fs";

const ANNOT = /^\s*slot:\(([a-e])\)\s+\S/;

for (const file of process.argv.slice(2)) {
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  (function walk(node) {
    if (ts.isJsxAttribute(node) && node.name.getText() === "className") {
      const src = node.initializer ? node.initializer.getText() : "";
      const reachable = /\bclassName\b/.test(src) || /\bclassNames\s*[?.]/.test(src);
      const comments = (ts.getLeadingCommentRanges(text, node.pos) ?? []).map((r) =>
        text.slice(r.pos, r.end).replace(/^\/\/|^\/\*|\*\/$/g, "")
      );
      const letter = comments.map((c) => c.match(ANNOT)).find(Boolean)?.[1] ?? null;
      const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      console.log(
        `  :${String(line).padStart(4)}  ` +
          (reachable
            ? letter
              ? "CONTRADICTION (reachable AND annotated)"
              : "ok — reachable"
            : letter
              ? `ok — annotated (${letter})`
              : "FAIL — unreachable and unannotated")
      );
    }
    ts.forEachChild(node, walk);
  })(sf);
}
```
