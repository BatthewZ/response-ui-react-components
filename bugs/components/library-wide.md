# Library-wide — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 35 · Library-wide — focus-ring offset paints white on dark themes (med)

`ring-offset-*` reserves a gap between the element and its focus ring, filled with
`--tw-ring-offset-color`. **That variable is never set anywhere in this library** (grep for
`ring-offset-color`: zero hits), so it falls back to Tailwind's default `#fff`. On any dark
theme the focused element gets a white halo — a raw colour leaking into a system whose whole
premise is that every colour comes from a token.

Affected (`ring-offset-2`, visible gap):

| File | Line |
| --- | --- |
| `src/components/ui/Button.tsx` | 9 |
| `src/components/ui/IconButton.tsx` | 10 |
| `src/components/form/Checkbox.tsx` | 17 |
| `src/components/ui/AvatarUpload.tsx` | 220 |
| `src/components/ui/ErrorBoundary.tsx` | 31 |

Benign (`ring-offset-0` — no gap to paint): `Input.tsx:25`, `Select.tsx:25`, `Textarea.tsx:25`.

**Fix:** set `ring-offset-color` to the surrounding surface token once (base classes or a
shared focus utility) rather than patching five call sites. **Supersedes #25**, which logged
only the Checkbox instance.

**Docs note:** `button.md` and `icon-button.md` document the focus ring as fully themed and
do not mention this. Once the code is fixed the docs stay true; if it's deliberately left,
both pages need a gotcha. Verify the fix before amending the docs.

### 55-59 · Avatar — five medium findings (med)

- **#55 sticky `imgError`.** Reproduced: render `src="bad://one"` → `onError` → initials; then
  set a good `src` → still initials, until unmount. **Scenario:** an expired signed avatar URL
  404s once and the user's photo never returns for the life of the component.
  **Fix:** reset the flag on `src` change (render-phase prop-change reset, or derive from `src`).
- **#56 dropped `children`.** `<Avatar name="Ada Lovelace">child</Avatar>` compiles (verified,
  zero tsc errors) and renders only `AL`. **Fix:** `Omit<…, "children">`, as Skeleton and Spinner
  already do.
- **#57 presence by colour alone.** `<Avatar name="Ada Lovelace" status="offline" />` announces
  "Ada Lovelace, image" — presence is entirely absent to screen readers, and `offline` (grey) vs
  `away` (amber) is a weak visual discrimination. **Fix:** a visually hidden status word in the
  dot, or append it to the wrapper's label.
- **#58 unnamed `role="img"`.** `<Avatar src="/team/ada.jpg" />` renders `<span role="img">` with
  `aria-label` undefined and inner `alt=""` — AT announces an image it cannot describe. The label
  is also untrimmed, so `name="   "` yields `aria-label="   "`. **Fix:** drop the `role` (or set
  `aria-hidden`) when no name resolves; trim before use.
- **#59 `AvatarGroup size` stops at the group.** `<AvatarGroup size="lg">` around default
  children gives a 3rem `+N` chip beside 2.5rem circles, with overlap tuned for the larger size.
  **Fix:** clone children with the group's `size`, or derive chip/overlap from the children.

### 115 · The `asChild` escape hatch silently unwires the child (med · library-wide)

Four of the five overlay components ship an `asChild` prop, and **four independent agents found
the same defect without seeing each other's work.** Every one of them clones the trigger's props
*over* the child rather than composing them, so the child's own handlers never run — and in three
of the four, the child's `ref` is dropped too.

Measured lost sets (the child's handler is silently replaced, no warning, types unaffected):

| Component | Child props lost | Child `ref` |
| --- | --- | --- |
| `Popover` | `onClick` `onKeyDown` `onPointerDown` `onMouseDown` | **dropped** |
| `DropdownMenu` | `onClick` `onFocus` `onKeyDown` `onPointerDown` `onPointerEnter` `onMouseDown` | **dropped** |
| `HoverCard` | `onFocus` `onBlur` `onKeyDown` `onPointerDown` `onPointerEnter` `onMouseMove` `onMouseLeave` | **dropped** |
| `Tooltip` | same seven as HoverCard | merged correctly |

**There is no single lost set** — it is whatever that component's Floating UI hooks emit, which is
why the first drafts of the pages disagreed with each other. `className` is merged everywhere.

**Failure scenario:** `<DropdownMenu.Trigger asChild><Button onClick={track}>Actions</Button></DropdownMenu.Trigger>`
— the menu opens and `track` never fires. Analytics silently stop; nothing errors, nothing type-checks
wrong. **Fix:** pass the child's props into `getReferenceProps(children.props)` and merge
`children.props.ref` into the existing `mergeRefs` call. `Tooltip.tsx:66-74` already does the ref
half correctly and is the model.

### 112-114 · Three highs in the overlay set

- **#112 `Tooltip`** calls `getReferenceProps()` with no arguments, so a child's own
  `aria-describedby` is destroyed rather than merged. Measured on
  `<Tooltip content="…"><Input aria-describedby="password-rules"/></Tooltip>`: the attribute is
  `null` while closed and points at the tooltip while open. **The input's hint is never announced
  in either state.** A tooltip silently removing another element's accessibility wiring is worse
  than no tooltip. **Fix:** `getReferenceProps(children.props)`.
- **#113 `ContextMenu`** — the Trigger `<div>` sets no `tabIndex`, so it can never receive focus.
  The platform fires `contextmenu` for the **Menu key** and **Shift+F10**, but at whatever element
  has focus — `<body>` — and it does not bubble *down* to the trigger. Measured: dispatching
  `contextmenu` at `<body>` does not open the menu. **Keyboard access is zero, not degraded.**
  **Fix:** default `tabIndex={0}` plus a focus style — measured to also restore arrows and focus
  return.
- **#114 `menu-internals`** — `initialFocus={-1}` means a pointer-opened menu never moves focus in.
  Measured after a right-click open: `document.activeElement` is `BODY`; ArrowDown and typeahead
  both do nothing. **Note this is specific to the ContextMenu path** — `DropdownMenu`'s keyboard
  model was measured working end to end (arrows, Home/End, typeahead, Escape-returns-focus,
  Enter-activates), so its `role="menu"` is honestly earned. Same line, two outcomes, because the
  two components differ in where focus sits when the menu opens.

### 241-242 · library-wide — the form controls' own boundary and focus ring miss 3:1 (med ×2)

One class string, shared verbatim by `Input`, `Textarea`, `Select`, `NumberInput`, `SearchInput`
and `OTPInput` (and re-created by `TagInput` on its wrapper), carries both defects. Computed from
the shipped OKLCH values:

- **#241 — boundary.** `--C-BORDER-STRONG` on the `--C-SURFACE-0` fill: **1.47:1** default,
  **1.44:1** `events`, **1.41:1** `tech`, **1.79:1** `grimdark`. `--C-SURFACE-0` is also the base
  page surface, so on a default page that border is the *only* thing drawing the control.
  `OTPInput` is the worst case — six empty, unlabelled boxes whose entire visual existence is a
  1.4:1 hairline.
- **#242 — focus ring.** `focus:outline-none` removes the UA outline; the replacement
  `--C-BORDER-FOCUS` ring measures **3.68:1** default and **14.84:1** `tech` (both fine) but
  **2.72:1** `events` and **2.96:1** `grimdark` — under the 3:1 WCAG 1.4.11 / 2.4.11 floor with no
  native fallback left. Across six identical OTP boxes, a keyboard user in those themes has to
  hunt for the focused one.

Both are token-level, so they are **one fix, not six**: raise `--C-BORDER-STRONG` and
`--C-BORDER-FOCUS` per theme measured against `--C-SURFACE-0` (not against `--C-CANVAS`), or give
form controls a dedicated boundary token. Keeping a transparent `outline` would also preserve a
UA indicator under forced-colors. Ratios computed with the same OKLCH→sRGB converter as
#206-207/#215.

### 98 · 98 · Drawer · FileUpload — `--C-TEXT-DEFAULT` does not exist (low · downgraded from med)

**Downgraded from med after investigation.** The token is genuinely undefined: `--C-TEXT-DEFAULT`
has exactly two readers repo-wide (Drawer.css:9, FileUpload.css:344) and **zero definitions**,
including in the installed `node_modules/@batthewz/response-ui-css`. The real set is
`--C-TEXT-{PRIMARY,SECONDARY,MUTED,INVERSE,ON-ACCENT,ON-PRIMARY}`. So the declaration is
invalid at computed-value time and falls back to `inherit`.
Why it is not user-visible: the inherited value resolves to the root's `canvastext`, and
`base.css:9` sets `color-scheme: light` while `grimdark.css:5`/`tech.css:5` set `dark` — so
the UA fallback flips with the theme and stays legible on every shipped surface. No library
component sets an inherited `color` on a wrapper, so no in-library nesting breaks it. Worst
observed effect is grimdark's warm sepia ink rendering as pure white: higher contrast, wrong hue.
**Fix:** one word — `--C-TEXT-PRIMARY`. This is exactly the token drift ETHOS's "known
fragility" section warns about, and nothing would have caught it.

### 119 · Popover · DropdownMenu — the trigger submits the enclosing form (med)

Popover.tsx:164 and DropdownMenu.tsx:88 both render `<button ...triggerProps>` with no
`type`, and `getReferenceProps` supplies none — so both default to `type="submit"`.
Measured: `el.type === "submit"` for both; clicking a trigger inside a `<form>` fired
`onSubmit` **once and** opened the menu; being the form's first button, the trigger is also
its **default submitter**, so Enter in any text field fires it instead of Save. An
"Actions" menu above a Save button is enough. A caller-supplied `type="button"` is
honoured, and `asChild` triggers are unaffected.
**Fix:** set `type="button"` before the `...triggerProps` spread.
This is the *no-default-button-type* cluster (#74, #41) — and note that bullet's own
warning that "a sweep is incomplete until it names every component": these two were not
named. `HoverCard`'s default trigger is a `<span>`, genuinely out of scope.

### 136 · Accordion · Collapsible — closed panels stay focusable and readable (med)

Closed panels are only *visually* clipped — `grid-template-rows: 0fr` plus an inner
`overflow: hidden` (Accordion.css:76-88, Collapsible.css:13-25) — with no `hidden`,
`inert` or `aria-hidden`. Measured closed-panel `outerHTML`:
`<div id="…-content-one" role="region" aria-labelledby="…" data-state="closed"
class="accordion-content"><div class="accordion-content-inner"><a href="/hidden-link">Hidden
link</a></div></div>` — `hidden=false`, `inert=false`, `aria-hidden=null`;
`getByRole('link')` returns `['Hidden link']`, `getByRole('region')` returns 1 while
closed, and the **second Tab lands on the link**. Identical for `Collapsible`
(`hidden/inert/aria-hidden: false false null`, Tab 2 → `<button>Buried action</button>`).
An FAQ with every section closed puts Tab focus on invisible links and reads every closed
panel to a screen reader.
*jsdom applies no stylesheet, but the clipping mechanism (`0fr` + `overflow:hidden`)
leaves content focusable and in the a11y tree in a real browser too — this is not a jsdom
artefact.*
**Fix:** set `inert` on `.accordion-content` / `.collapsible-content` while closed.
`hidden` would also work but kills the `0fr → 1fr` transition.

### 421 · usePrefersReducedMotion — threw wherever `matchMedia` was absent (med · FIXED `fbdf501`)

Logged after the fact, because it was never in the 420 and it gated five of them.

`use-reduced-motion.ts` called `window.matchMedia` behind only a `typeof window` check,
while its sibling `use-media-query.ts` guarded the API itself and documented why:
*"`matchMedia` is absent on the server and in some test/headless environments (e.g.
jsdom) — callers treat those as 'no match' rather than throw."* The hook violated its own
package's stated intent.

Measured: `TypeError: window.matchMedia is not a function` in jsdom, which took down the
**default** (`animate`) render path of every `ScrollReveal` and `Stagger` consumer — the
exact path carrying #9, #10, #171, #178 and #340. The configuration holding the bugs was
the one that could not be tested, which is why all nine `MasonryGrid` tests and all eight
`Timeline` tests cover only `animate={false}`.

**Fixed** by deleting the duplication rather than adding a second guard: reduced motion
*is* a media query, so the hook is now a four-line alias over `useMediaQuery`. Deliberately
**not** fixed by stubbing `matchMedia` in `test-setup.ts` — that would have masked the
defect and deleted its regression test. Two tests were added for the absent-API path and
observed failing first.

### 434 · library-wide — a spread `field()` binding erases the `aria-invalid` it should set (med)

`field()` returns all seven keys always present, including `"aria-invalid": undefined` when
the field is valid (use-form.tsx:209-217). `TagInput` spreads `{...props}` at :204 **after**
`fieldErrorProps` at :199, so the `undefined` overrides the computed value: measured, a
visible validation message ("too short") rendered while `aria-invalid` is `null` — the
error is on screen and absent from the accessibility tree. Same ordering in
`Slider.tsx:53-60` and `RangeSlider`.
**Fix:** spread rest *before* the computed error props, or merge explicitly rather than
letting a present-but-`undefined` key win. This is independent of the §3 door — it needs no
type change — but it lives in the same lines, so land it with whatever §3 decides.

> **Landed as the second option only.** `236e6a0` used `mergeProps`, not the reordering this
> row suggests first. Do not take the first clause literally when fixing #455: spreading rest
> *before* the computed props mirrors the bug onto the caller — it erases an
> `aria-invalid` the caller passed deliberately. Both directions are asserted on five
> components (#456 names the two where only one direction is).

### 455 · Input · Select · Textarea — the same `field()` spread erases `aria-invalid` here too (med)

#434 closed on three components (TagInput, Slider, RangeSlider — named in its detail block,
not in its row). Three more carry the identical ordering and were never enumerated:

| Component | computed ARIA | caller spread |
| --- | --- | --- |
| `Input.tsx` | `:19` `{...ariaProps}` | `:31` `{...props}` |
| `Select.tsx` | `:19` | `:32` |
| `Textarea.tsx` | `:19` | `:31` |

All three call `useFieldError(error)` (Field.tsx:41), which emits `"aria-invalid": "true"` only
when invalid and `undefined` otherwise. `form.field()` emits the **key** on every render,
valued `undefined` when the field is valid (use-form.tsx:215), so the later spread deletes the
computed `"true"`.

**Measured**, scratch render, `fieldLike = { "aria-invalid": undefined }`:

```
<Input error {...fieldLike} />         aria-invalid -> null   (expected "true")
<Select error {...fieldLike}>…         aria-invalid -> null
<Textarea error {...fieldLike} />      aria-invalid -> null
<RangeSlider error {...fieldLike} />   aria-invalid -> "true"  (mergeProps control)
```

Consequence: a control showing a visible validation message reports itself **valid** to a
screen reader — the error is on screen and absent from the accessibility tree.

Why their own suites stay green: `Input.test.tsx:29`, `Select.test.tsx:51` and
`Textarea.test.tsx:36` pass `error` **without** a spread, so the erasing path is never
exercised.

**Fix:** `{...mergeProps(props, ariaProps)}` (src/util/merge-props.ts:71), matching the five
components already converted. Its `:92` guard — `b` wins only when `b` is not `undefined` — is
what makes both directions correct. Add both directions to each new test; see
`RangeSlider.test.tsx:186` and `:217` for the pair.

**Related:** #75 (`Radio` never consumes `useFieldError` at all).

### 457 · Library-wide — the controlled-mode bypass, as a class (high · **fixed** `da9f457` `7f651a6`)

Filed after the fact so the *class* is inheritable, not just the six instances. Every one of these
recomputed the controlled/uncontrolled decision on every render:

```ts
const controlled = valueProp !== undefined;   // re-evaluated each render
```

`undefined` is the one value a caller reaches for by accident. `value={x ?? undefined}` is the
idiomatic way to feed an optional value, and every one of these components read it as *"the caller
has stopped controlling me"* — mid-life, with no warning and no type error.

Measured before each fix, by rerendering with the prop `undefined` and then driving one interaction:

| Component | Props | Observed on the bypass |
| --- | --- | --- |
| `Accordion` | `value` / `defaultValue` | the clicked section **expanded** from internal state the parent never saw |
| `Tabs` | `value` / `defaultValue` | the clicked tab selected itself and swapped the panel |
| `Popover` | `open` / `defaultOpen` | the trigger opened the popover itself |
| `AppShell` drawer | `open` / `defaultOpen` | the mobile drawer opened itself |
| `AppShell` sidebar | `collapsed` / `defaultCollapsed` | the rail collapsed itself |
| `DataTable` paging | `page` / `onPageChange` | a server-paged table whose parent ignored the requested page still moved its slice `["A","B"]` → `["E"]` |

The mirror direction was just as live: an uncontrolled component handed a `value` later flipped
*controlled* and discarded what the user had already done.

**Fix, as applied** (precedent `236e6a0`, #357/#370): `useControllableState` locks the mode in its own
ref, and a local ref at each call site keeps feeding it a defined value once controlled, so a later
`undefined` reads as *empty* — `Accordion` `[]`, `Popover`/`AppShell` `false`, `Tabs` `defaultValue`,
`DataTable` `1`/`null` — instead of switching mode.

**Two measured negatives worth keeping.** `Accordion` needs **no** `isEqual`: its value *is* an array,
so `Object.is` can never call two of them equal and the gate is inert — a probe that threw whenever a
shallow comparator would have blocked an emit fired **0** times across all 28 tests, and the only
setter is a toggle, which adds or removes exactly one member. And `#391` is **not** closed by any of
this: see `app-shell.md`.

**Behaviour deltas, both deliberate:** a controlled `AppShell` no longer writes internal state at all
(it was already dead — `open ?? internal` could never reach it), and re-selecting the already-active
tab is now a no-op rather than an echo, pinned by a test.

### 461 · Combobox · MultiSelect — focus repaints the invalid border (med)

`Switch.css:45-49` already states the rule this violates: *"Focus must not erase the invalid state."*
Two CSS-authored controls still do.

| Site | Focus rule sets | Error-focus rule sets | Result on focus |
| --- | --- | --- | --- |
| `Combobox.css:24-26` / `:38-40` | `border-color: --C-BORDER-FOCUS` + ring | **ring only** | border repaints focus-blue |
| `MultiSelect.css:25-27` / `:34-36` | `border-color: --C-BORDER-FOCUS` + ring | **ring only** | border repaints focus-blue |
| `ColorPicker.css:23-26` / `:32-34` | `border-color: --C-BORDER-FOCUS` + ring | border **and** ring, both `--C-STATUS-ERROR` | correct — border stays red |

Both pairs are equal (0,2,0) specificity and the error rule is written second, so it wins for the
property it declares and declares nothing for `border-color` — the focus rule's value survives. The
error signal therefore disappears at exactly the moment the user is acting on the field.

**Re-verified against current source, and the row is narrower than it was first written.** The claim
covered `Select.tsx`, `Textarea.tsx` and `TagInput.tsx` as well, against `Input.tsx` as the correct
one. That split **no longer exists**: `aafb9f8` moved all four onto the shared constants, and
`focusRingControlError` (`src/util/focus.ts:40-41`) is
`border-status-error focus-visible:ring-status-error focus-visible:border-status-error` — it recolours
border *and* ring together, so every Tailwind-side control now behaves like `ColorPicker.css`. Only
the two hand-written CSS controls above are still wrong.

**Fix:** add `border-color: var(--C-STATUS-ERROR)` to `.combobox-input-error:focus-visible` and
`.multiselect-control--error:focus-within`, copying `ColorPicker.css:32-34`. Related: #284 and #293
are the standing rows for these being hand-written at all.

### 464 · Library-wide — `verify:component-docs` cannot see falsified prose (med)

The gate checks three things (`scripts/verify-component-docs.mjs:9-25`): H1 titles are real exports,
relative links and anchors resolve, and every variable named in the `## Theme tokens` table is
reachable from the component's source. It splits the doc on `## ` and reads only the `Theme tokens`
section (`:264-265`). Everything else on the page — the prose that tells a reader *what the component
does and why* — is unchecked.

The blind spot is not "prose is unchecked" in the abstract; it is that a refactor which changes a
utility's **keying** or **value** but not its **name** passes every check the gate makes while turning
the prose around it false. `aafb9f8` did exactly that: `focus:` → `focus-visible:`, `ring-offset-2` →
`ring-offset-0`. Token names unchanged, so the tables stayed green.

Ten pages were carrying falsified prose when `d14c7be` went looking by hand:

- `radio.md` — said Radio resets its outline, puts no ring back, and fails WCAG 2.4.7. Stale since
  `ee59e65`. This is the doc-side twin of ledger **#73**, which sat `confirmed · high` for the same
  reason and for the same length of time.
- `collapsible.md` — said the trigger has no focus styling at all, and its table said the component
  paints nothing. `#95` gave it the ring.
- `icon-button.md`, `checkbox.md`, `error-boundary.md`, `copy-button.md` — all four described the
  `ring-offset-2` gap and its themed fill, now `ring-offset-0`.
- `error-boundary.md` — said its ring was the odd `focus:` one, unlike Button. Now the same recipe.
- `date-picker.md` and the five text-control spokes — said `focus:` was chosen so the ring shows on
  click, which `:focus-visible` already does for a text field.

Same shape as the oracle gap this ledger's own preamble records for anchors: the guard proves the
*reference* still resolves, never that it still says what the claim says. A content fingerprint —
hash the prose span a doc claim depends on, store it beside the claim — would catch both.

**Fix direction:** extend the gate beyond `## Theme tokens` to at least the `## Gotchas` section
(90/90 spokes ship one, and `scripts/bugs-ledger.mjs:182-196` already flags them for re-reading when a
row closes), keying on the utility strings resolved from source rather than on prose matching.
