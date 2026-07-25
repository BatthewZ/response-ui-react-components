# Plan of attack

Root-cause clusters. Status lives in [`LEDGER.md`](./LEDGER.md), never here — a cluster's
`status` line below describes the *cluster's* progress through the gates, not any row's
verdict. Cluster membership lives here and nowhere else (adding a `Cluster` column to 422
rows would create a second truth; the join is done at report time).

Per [`BUG_TRIAGE_PLAYBOOK.md`](../../BUG_TRIAGE_PLAYBOOK.md) §4 each cluster carries: root
cause · member ids · **the sweep command that proves the member list complete** · the
verification tool · one-way doors · status.

> **A sweep that names patterns instead of components is incomplete** (§9). Every sweep
> below is recorded so the next reader can re-run it, and two of them are scripts rather
> than greps because a grep got the answer wrong — see §2's note.

---

## 1 · Rest props dropped by `as`-polymorphic wrappers — **FIXED**

**Root cause.** `ScrollReveal` and `Stagger` type the rendered element's full prop set (via
`ComponentPropsWithRef<T>` in the public cast) but destructured only their own named props
and rendered `<Tag>` with no `...rest`, so every prop the type advertised was dropped at
runtime.

**Members.** #9 (`ScrollReveal`), #10 (`Stagger`) — the two roots. Downstream victims, each
of which spreads its *own* public API through one of the roots: #171 (`Swimlane`), #178
(`MasonryGrid.Item`), #340 (`Timeline.Item`). **One root cause, two files.**

**Sweep — proves the root list complete (7 components, not "every polymorphic component"):**

```bash
grep -rln 'ComponentPropsWithRef<T>' src/          # the polymorphic surface: 7 files
# → Button, Text, Stack, Grid, Row all spread rest correctly; only ScrollReveal + Stagger did not.
grep -rn '<ScrollReveal\|<Stagger' src/ --include=*.tsx | grep -v '\.examples\.\|\.test\.'
# → 6 consumers. Hero.Content and Spotlight.Content spread onto their OWN div, so they are clean;
#   Swimlane, MasonryGrid.Item and Timeline.Item spread onto the root → #171/#178/#340.
```

**Verification tool.** vitest + jsdom. The trap: all three downstream bugs are *conditional*
— props land under `animate={false}` and vanish under the default — and the default path
threw in jsdom until #421 was fixed, so every existing test covered only the working path.
A regression test here **must** use the default `animate`.

**Doors.** None. The fix makes the runtime honour the *already published* type; no prop or
type was added or removed.

**Status.** `fixed`. 12 checks written and observed red first, then green; the fix re-broken
twice (rest spread removed → 4 red incl. the downstream `Timeline` case; handler composition
removed → 1 red). `className`/`style`/`ref` are **merged** and `onAnimationEnd` **composed**
rather than overwritten, so forwarding rest could not itself introduce cluster §2's defect.

---

## 2 · A rest-spread placed *after* the component's own handler — **PARTLY FIXED**

**Root cause.** The component sets `on[A-Z]…={own}` on an element and then spreads
`{...props}` onto the same element, without destructuring that handler name out. A caller's
handler therefore **replaces** the component's own rather than adding to it. Where the prop
is also `Omit`ted from the public type the substitution is invisible to `tsc` — but the
`Omit` is not what causes it, and #316 is the proof: `onPointerLeave` is an ordinary `div`
prop there.

**Members — fixed this pass.** #13 (`AnimatePresence`, `onAnimationEnd` → never unmounts) ·
#316 (`CalendarBase`/`RangeCalendar`, `onPointerLeave` → hover preview never clears) ·
#380 (`AvatarUpload`) · #390 (`AppShell.Toggle`) · #407 (`FileUpload`, four handlers at once).

**Members — already logged, NOT yet fixed.** #135 (`Accordion.Trigger`, `onClick`+`onKeyDown`)
· #350 (`Table.HeaderCell`, `onClick`+`onKeyDown` — mouse and keyboard diverge) ·
#245 (`TagInput` — also in §3, and gated there).

**Members — NEW, surfaced by this pass, not in the 422.** `Tabs.tsx:295` (`Tab`,
`onClick`+`onKeyDown`) · `Tabs.tsx:345` (`TabPanel`, `onAnimationEnd` — literally #13's shape,
kills `onExitComplete`) · `Carousel.tsx:138` (root `onKeyDown` — kills arrow navigation) ·
`NumberInput.tsx:150` (`onChange`, also §3) · `FileUpload.tsx:492` (`onDrop` — **door**, see
below) · marginal: `Calendar.tsx:52` and `RangeCalendar.tsx:107` pass custom `onDaySelect` /
`onDayHover` / `onTodayClick` this way, reachable only through a spread object because the
excess-property check blocks a literal.

**Sweep.** A grep is not sufficient here and got this wrong **in both directions**: one hand
sweep false-positived `SearchInput` (which destructures *and* composes, and spreads before
its handlers) and another declared `NumberInput` clean when `onChange` is `Omit`ted at
`NumberInput.tsx:25`, undestructured, and set at `:146` before the spread at `:150`. Two
sweeps also reported `Accordion` and `Table` as new when they are #135 and #350. So the sweep
is a script that checks all three conditions together — handler set on the element, spread
after it, name **not** destructured out:

```bash
node ../../bug-triage-tools/sweep-spread-after-handler.mjs
# → 8 component files / 9 element sites. Cross-check every hit against the ledger before
#   calling it new:  grep -nE "^\| [0-9]+ \|[^|]*\| <Component> \|" bugs/LEDGER.md
```

**Verification tool.** vitest + jsdom. Two traps, both of which produce a confident wrong
answer rather than an error:
- **`fireEvent.animationEnd` does not work in this repo** and fails *silently* — jsdom has no
  `AnimationEvent` constructor and React registers `webkitAnimationEnd` here. Dispatch both
  names through RTL's `fireEvent`. Documented in `CONTRIBUTING.md` under Testing.
- **Assert the call COUNT, not `toHaveBeenCalled()`.** Composing a handler can introduce a
  double-fire: a programmatic `input.click()` bubbles back to a clickable ancestor and
  re-enters its handler. That was live in *both* `AvatarUpload` and `FileUpload` (measured: 2
  calls per single user click in `FileUpload` on the pre-fix code) and was masked by an
  existing `toHaveBeenCalled()` — the #422 shape, in real tests, twice.
- A `fireEvent.click`-only test hides a keyboard-path break (#126, #350). Cover Enter/Space.

**Doors.** One, narrow: **composing `FileUpload`'s `onDrop`** requires removing
`Omit<…, "onDrop">` — a public type change. Left `deferred`. Everything else in this cluster
is additive. Note the shape of the opt-out is a judgement the fixes made explicitly and
consistently: compose, then skip the component's own behaviour `if (e.defaultPrevented)` —
**except** on non-cancelable events (`animationend`, `pointerleave`), where honouring
`defaultPrevented` would invent a fake opt-out that re-creates the original bug by design.
`onDragOver` is a genuine sharp edge: `preventDefault()` there idiomatically means "a drop is
allowed", and it now also reads as the opt-out.

**Status.** 5 fixed · 3 logged-and-open (#135, #350, #245) · 6 new to log · 1 door.

---

## 3 · An `Omit`ted prop is still delivered by a JSX spread — **DEFERRED, owner decision**

**Root cause, and why it is not §2.** Six components `Omit` `onChange` (and sometimes `value`)
from their public type to signal "do not pass this". **A JSX spread does not perform
excess-property checking**, so `{...form.field("x")}` injects those very props, `tsc` reports
nothing, and the prop reaches a DOM element the component never expected it on. The defect is
not "my handler was replaced" — it is that **the binding the published `README.md:203` and
`AGENTS.md:249` both advertise is typed as safe and is not.** An explicit `onChange={…}`
attribute *is* caught (`TS2322`); only the spread form slips through.

**Members.** #245 (`TagInput` — crashes `tags.map is not a function` on the first keystroke)
· #246 (`TagInput`, `name` submits the in-progress draft instead of the committed tags).
**NEW, none in the 422, all measured:** `DatePicker.tsx:197` (**crash**,
`d.getFullYear is not a function`) · `MultiSelect.tsx:194` (**crash**, `selected.map is not a
function`) · `Slider.tsx:60`, `NumberInput.tsx:150`, `RangeSlider.tsx:137`, `OTPInput.tsx:163`
(no crash — they silently write the wrong type into the form store; `OTPInput` keeps only the
last keystroke). `SearchInput` is safe: its `onChange` is a required own prop, so it is
destructured. `Input`/`Textarea`/`Select` do not `Omit` it.

**Sweep:**

```bash
grep -rn 'Omit<' src/components/form/*.tsx src/components/ui/*.tsx | grep -iE '"onChange"|"value"'
# then, for each hit, confirm the Omitted name is NOT destructured out of the props param —
# an Omit alone is not protection against a spread.
```

**Verification tool.** vitest + a real `useForm`: spread `form.field<V>(name)` onto the
component, type one character, then read `form.getValues()` and/or the thrown error. Measured
shape of the binding, from `src/components/form/use-form.tsx:25-37` and `:209-217`:
`{ name, value: V, onChange: (eventOrValue: V | ChangeEvent) => void, onBlur, ref,
"aria-invalid", disabled }` — all seven keys always present.

**Doors — the owner's call, not the patcher's.**
- **#245:** does `TagInput.onChange` become public (called with `string[]`), or does the
  library **retract** the documented `field()`-spread promise for `TagInput`?
  - *(a) defensive only* — destructure `onChange` out so it cannot clobber. Patch-level, but
    measured: because `field()` also supplies `value`, `TagInput` becomes controlled with its
    update channel discarded — after typing and pressing Enter the store holds `[]` and **zero
    chips render.** It trades a loud crash for an inert widget.
  - *(b) un-`Omit` and honour it with the tags array* — **minor bump.** Costs nothing in the
    form layer: `value` is already consumed via `useControllableState`, and
    `use-form.tsx:113-118` passes a non-event through unchanged, so `onChange(tags)` writes the
    array. Breaks only a consumer depending on the DOM-event shape — a population that is
    crashing today. **Revert: restore `"onChange"` to the `Omit` union and drop it from the
    destructure list, one file.**
  - *(c) a separate prop, keep the `Omit`* — cheapest in code, most expensive in product: it
    must strike `TagInput` (and by the members above `Combobox`/`Slider`/`MultiSelect`) from
    `README.md:203` and `AGENTS.md:249`, contradicting the headline claim of one unified
    `field()` accessor with no register-vs-Controller split.
- **#246:** should `name` mean "submit the tags" (a hidden input per tag, which
  `DatePicker.tsx:184` and `Switch.tsx:64` **already do** in this repo) or keep passing to the
  draft field? Barely a door — the in-repo precedent makes (b') a consistency fix. Independent
  of #245 semantically; land together only because both edit the same destructure list.
- **The systemic question, worth costing once instead of six times:** should every `Omit`ted
  key be destructured out (or `{...props}` spread *first*) library-wide, as a structural rule?
  That closes all six at once.

**Status.** `deferred · owner decision`. Both #245 and #246 confirmed **measured**. Regression
checks for the fixed behaviour are written and sit commented out in
`src/components/form/TagInput.test.tsx` behind a `// #245 / #246 (deferred, see bugs/PLAN.md)`
marker, with the un-comment instruction in the header.

**Adjacent, found here, not fixed:** `field()`'s `"aria-invalid": undefined` is spread *after*
`fieldErrorProps`, so it overrides the computed value — measured, a visible "too short" message
with `aria-invalid` null. Same ordering in `Slider.tsx:53-60` and `RangeSlider.tsx`.

---

## 4 · SSR / hydration — **1 FIXED, the rest open**

**Root cause (#46).** `ToastProvider` called `createPortal(children, document.body)` inline in
its render body, so touching `document` threw on any server render. Its sibling `Portal`
already carried the `typeof document === "undefined"` guard — **the correct implementation was
already in the repo**, so the fix is to use it, not to write a second local guard.

**Sweep — proves no other unguarded render-body browser global ships:**

```bash
grep -rn 'createPortal\|document\.body\|typeof document\|typeof window' src/ --include=*.tsx --include=*.ts
grep -rn 'document\.\|window\.\|localStorage\|navigator\.' src/ | grep -v '\.test\.'
# For each hit, classify by POSITION: render body (unsafe) vs effect/event callback (safe on
# the server). Only ToastContext was in a render body. Portal.tsx is the one other
# createPortal call site and is guarded.
```

**Verification tool.** vitest with `// @vitest-environment node` + `renderToStaticMarkup`.
The trap: the default jsdom environment **has** `document`, so a naive test passes and proves
nothing. `ToastContext.ssr.test.tsx` asserts `typeof document === "undefined"` as a
precondition **in the same file as the measurement**, so a test taken in the wrong environment
is visibly invalid rather than quietly green.

**Doors.** None for #46. `verify-directives.mjs` cannot catch this class — it checks directive
placement and secret access, not SSR safety.

**Status.** #46 `fixed`. **#47 is now the live remaining behaviour for `ToastProvider`** and its
blast radius is wider than the one component its row names: the server emits nothing for the
stack and the client's first pass portals, which is the hydration mismatch `portal.md` already
describes. Fixing it needs a `mounted`-in-effect flag. Still open, deliberately.

---

## 5 · Clusters not yet investigated

Sizes are the **regex floor** from playbook §3, not a taxonomy — 38 rows match more than one
lens, so an investigator assigns final membership by reading (G1). Each still needs its own
sweep command and verification tool before it can be worked; the narrative that produced these
groupings is preserved in git history for this file at `6e56136`.

| Cluster | Floor | Notes / where the leverage is |
| --- | --- | --- |
| contrast / token ratio | 38 (3h) | **36 of 38 in scope**; scope is encoded in the ledger's Component field. Only #51/#52 read `**response-ui-css**` → out of scope, mark `deferred`. `**library-wide**` (#241/#242) means within this package. **Owner-gated**: for the 13 `--C-TEXT-MUTED` rows one token change out of scope competes with 13 component changes in scope. Never re-point a token inside component CSS (#3 is the worked example). Tool: `bug-triage-tools/verify-contrast.mjs`, hand-run |
| ARIA role or shape wrong | 37 (2h) | vitest `getByRole` / `computeAccessibleName`. Covers name and shape, never what a screen reader says |
| dead code / dead CSS | 30 (1h) | Cheap; sweep per component alongside whichever pass has the file open |
| live region / never announced | 26 (1h) | **~10 of these no tool here can reach.** Verify the DOM precondition and declare the announcement unverified — do not let the precondition masquerade as the real check |
| controlled-prop desync | 17 (1h) | vitest. #5 (`StatCard` renders a permanently stale *value*) is flagged for a severity upgrade |
| rest-props dropped (types lie) | 14 (6h) | §1 closed the `as`-polymorphic half; the rest are `Avatar` (#56) and friends, where `Skeleton`/`Spinner` already `Omit` `children` correctly — a known one-liner |
| Field error wiring | 13 (2h) | `Radio` (#75)/`Checkbox` (#76) never call `useFieldError`; #296 reads it and forwards only half. Check what each of the eleven *spreads*, not which ones call it |
| hard-coded English | 13 | Includes the sharper second failure mode: a hard-coded `aria-label` **outranks** an associated `<label for>` (#222, measured) |
| SSR / hydration / use client | 9 (1h) | §4 took #46; #47 next, and its scope is wider than its row says |
| rest-spread after own handler | 8 (2h) | §2 — the floor is stale; the real membership is 14+ |
| `prefers-reduced-motion` | 8 | The gap is **Tailwind animation/transform utilities**, not the hand-written CSS |
| focus indicator removed | 7 (3h) | #73 is a measured **0-pixel** change on keyboard focus |
| `<button>` type / form submit | 6 | **Door** (#41/#74). A `Cancel` before the real submit becomes the form's default submitter |
| status by colour alone | 5 | Five for five on the status surfaces audited; treat as the library's default, not the exception |
| raw Tailwind defaults | 2 | `ErrorBoundary` uses `text-2xl`/`mb-2`/`px-4 py-2` against the ETHOS token rule |

**226 findings match no cluster**, including 10 of the 28 highs. Those are Track C — one
component, one test file, one doc page, one commit — and must not be forced into a cluster.

---

## 6 · Standing traps, each already paid for once

- **Re-read `## Gotchas` on every affected `docs/components/<kebab>.md`.** 90/90 spokes have
  one, ~68 describe behaviour a fix changes, and `docs/` **ships to npm** — so a fix leaves a
  lie in a published page and no guard can detect it. This pass rewrote 11 pages for 9 fixes.
  **`verify:bugs`'s checklist under-reports, in both directions.** It maps a finding's
  *component* to `docs/components/<that component>.md`, so for an internal component it names
  a page that does not exist (`toast-context.md`, `calendar-base.md`,
  `use-prefers-reduced-motion.md`) while missing the **consumer** spokes that actually carry
  the false sentence — #46 needed `toast.md` *and* `portal.md`, #316 needed
  `range-calendar.md`, and the checklist named none of the three. Treat it as a floor: also
  grep the claim itself across `docs/`, which is how the five pages for §1 and the extra
  false sentences in `toast.md`, `file-upload.md` and `avatar-upload.md` were found.
- **A green test can be hiding the very bug it claims to cover** (#422). Confirmed twice more
  this pass, both `toHaveBeenCalled()` masking a double-fire. Assert the thing the claim is
  about, and treat an existing green test over a surface you are fixing as unproven until you
  have read its assertions.
- **The correct implementation is usually already in this repo.** `Portal` for #46,
  `Collapsible.Trigger` for §2, `useMediaQuery` for #421, `Tabs.tsx:330`'s
  `target !== currentTarget` guard for the still-open #14. Grep for the sibling first.
- **Never renumber a finding**, and never delete a row — ids are cited from published
  `AGENTS.md`.
- **This package has no ESLint config** (`npx eslint` finds none; there is no `lint` script),
  so `tsc` is the only static gate. Worth knowing before trusting "lint is clean".
