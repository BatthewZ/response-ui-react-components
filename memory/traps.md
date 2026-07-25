# Standing traps

Two passes' worth of mistakes, kept because each one cost real time and none of them are
obvious in advance. **§A is the earlier pass (`BUG_FIX_HANDOVER.md` §7), §B the later one
(`BUG_FIX_HANDOVER_2.md` §6).** §C is what re-testing them for this memory turned up.

---

## A · Pass 1

- **A fix to a shared primitive does not reach components that bypass it.** Grep that the
  component actually *uses* the root before closing its row.
- **Fixing one defect can widen another.** Correcting `RangeSlider`'s `aria-invalid` merge turned
  an example's explicit-id workaround into a dangling IDREF — which is how **#440** was found. An
  example written around one defect will expose another when you fix it.
- **The obvious fix can be wrong in the mirror direction.** Swapping spread order to fix
  `aria-invalid` erasure passes the original test and erases the *caller's* value instead. Both
  directions are tested on five components; an order-swap "simplification" fails loudly.
- **Brief agents with the source, never with your summary.** Agents refuted three of that pass's
  own briefing claims, and one found a live bug in the reference implementation the others were
  told to copy.
- **Verify at the level of the claim.** `#127`, `#237` and `#439` were all mis-scoped in ways only
  visible by reading the component rather than the row.

## B · Pass 2

- **A test that mocks away an error is a bug report someone declined to file.** `StatCard`'s mock
  comment read *"to avoid IntersectionObserver issues"*. All 36 tests passed for as long as that
  comment stood, over a live crash. Grep for mocks whose comment explains what they prevent.
- **A green gate can mean less than it appears.** `verify:bugs` could not fail.
  `verify:component-docs` checks only token *tables* — a token that changes **role** (accent
  moving from ink to edge) passes silently, and falsified prose always passes.
- **`git add <paths>` + `git commit` is not atomic in a shared tree.** Two lanes had commits
  contaminated by a concurrent lane's staging. Use `git commit -F - -- <paths>` (pathspec).
- **Partitioning work by file prevents collisions and creates gaps.** Two fixes fell between lane
  boundaries — `Combobox.css`'s frozen weight, and `Collapsible`'s half of row #136. Both were
  caught by the sweep, not by a gate. *Something has to close the seams.*
- **Fixing one instance does not close a row.** #136 named two components; one lane owned one.
- **Refuting a row is a full outcome.** Five were refuted there. But **record it in the ledger** —
  a refutation living only in a commit body is invisible to the next reader.
- **Verify your own staked checks as hostilely as the work.** Adversarial verification refuted
  four of that pass's eight, and two of those were real unfixed defects, not wording problems
  (#118's DOM default, #73's missing ring). Its author's error rate on unverified claims was not
  visibly lower than the handover's.
- **Do not copy a claim into your own plan without re-testing it.** *"#90 theme restore"* was
  staked as a behaviour change purely because §8 listed #90 as work. The premise was already
  false — `README.md:86` had said "Persistence is not included." since before the pass began. **A
  stake inherited from a document you have not verified is not a stake, it is a rumour with your
  name on it.**
- **A new gate's exemptions are where the next bug lives.** `verify:focus-affordance` documents
  honestly that it reads CSS only — and a `high` row sat in exactly that blind spot.

---

## C · What re-testing these traps found (2026-07-26)

Trap A1 says to grep that a component actually *uses* the primitive. Doing that produced a live
defect and one correction — which is the traps list working as intended.

### The `mergeProps` contract, precisely

`src/util/merge-props.ts:71`. `mergeProps(a, b)`: `on*` compose (a's first, bail on
`defaultPrevented`), `className` through `cn`, `style` shallow-merges, `ref` through `mergeRefs`,
**everything else — `b` wins only when `b` is not `undefined`** (`:92`). That one clause is the
whole fix, because `form.field()` **always emits the key** `aria-invalid`, valued `undefined` when
the field is valid (`use-form.tsx:215`). A plain spread therefore deletes a component's computed
error state; swapping the order deletes the caller's instead.

Load-bearing and easy to "simplify" away:

- `merge-props.ts:92` — the `theirs !== undefined` guard.
- `merge-props.ts:15-17` — `MergedProps<A,B>` is a *union* on shared keys, precisely because a
  `B` of `undefined` leaves `A`'s in place. A naive `Omit<A,keyof B> & B` type-launders the bug
  back in.
- The warning comments at `TagInput.tsx:219-223`, `ColorPicker.tsx:210-213`,
  `DatePicker.tsx:118-121`. **`RangeSlider.tsx:152` has no such comment** — the one unguarded
  call site of the five.

### Correction to trap A3

"Both directions on all five components" is true, but **the five tested are not the five
`mergeProps(props, fieldErrorProps)` users.** Tested both ways: `RangeSlider.test.tsx:186,217` ·
`Slider.test.tsx:132,150` · `DatePicker.test.tsx:315,335` · `TagInput.test.tsx:216,228` ·
`ColorPicker.test.tsx:187,196`. **`Switch` is a `mergeProps` user but has direction 1 only**
(`Switch.test.tsx:151`; its pair at `:159` asserts `aria-describedby`, not `aria-invalid`), and
**`OTPInput` is direction 1 only** (`OTPInput.test.tsx:173`). Two coverage gaps hidden inside a
claim that sounds complete — trap A5 exactly.

### A live, unlogged defect found by applying trap A1

**`Input`, `Select` and `Textarea` bypass `mergeProps`** and do the plain two-spread it exists to
replace, on the same element, caller last: `Input.tsx:19` + `:31`, `Select.tsx:19` + `:32`,
`Textarea.tsx:19` + `:31`.

Measured, not reasoned — a scratch render of `<Input error {...fieldLike} />` where `fieldLike`
is `{ "aria-invalid": undefined }`:

```
Input     expected aria-invalid="true", received null   FAIL
Select    expected aria-invalid="true", received null   FAIL
Textarea  expected aria-invalid="true", received null   FAIL
RangeSlider (mergeProps control)                        PASS
```

So `<Input error {...form.field("x")} />` silently reports itself valid to a screen reader. Their
own tests stay green because they only ever pass `error` **without** a spread
(`Input.test.tsx:29`, `Select.test.tsx:51`, `Textarea.test.tsx:36`).

**No ledger row covers this trio, and #434 is not a false `fixed`** — checked, because that would
be the worse finding. #434 (`LEDGER.md:485`) says "**three** components spread it *after* their
computed `fieldErrorProps`", and `236e6a0` genuinely fixed three (`git show --stat 236e6a0`
touches ColorPicker, DatePicker, RangeSlider, Slider, TagInput — and **not** Input, Select or
Textarea). The row is honest about what it closed.

The defect is that **the row counted instances instead of naming them.** "Three components" reads
as a complete set; three *more* carry the identical defect and no reader can tell from the row.
This is trap B5 — *fixing one instance does not close a row* — surviving a pass that was
explicitly looking for it. **A summary that says "three components" instead of listing them
cannot be audited.** Whether the omission was deliberate is **UNCONFIRMED**.

Related and already open: **#75** (`LEDGER.md:121`) — `Radio` never consumes `useFieldError` at
all.

Not filed as a row here: id assignment and the G1–G5 workflow belong to a bug pass, not a memory
write-up. **Next agent: this is a free, pre-measured `confirmed · measured` row.**

### Two more mis-scopes, consistent with trap A5

- **#295** (`LEDGER.md:346`, open) — `RangeSlider` merges correctly but spreads onto the
  **wrapper** `<div class="range-slider">` (`:141-153`); neither `<input type="range">` carries
  `aria-invalid` or `aria-describedby`. The merge is right and lands in the wrong place.
- **#237** (`LEDGER.md:288`) is `fixed · 236e6a0`, which **contradicts `567061e`'s own commit
  body** claiming it "stays open". The later commit converted `NumberInput` to
  `useControllableState` and nobody reconciled the earlier sentence. Commit bodies are not a
  record; the ledger is.
