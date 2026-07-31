# Lane 4 — the form-control lane

Ten components where the browser paints half the control. Three stylesheets deleted, three
reduced to a stated core, four left whole with the reason written at the top of the file.

## Verdicts

| Component | Verdict | Lines | The single reason the survivor stayed |
| --- | --- | --- | --- |
| **Combobox** | **DELETED** | 118 → 0 | — |
| **MultiSelect** | **DELETED** | 202 → 0 | — |
| **FileUpload** | **DELETED** | 435 → 0 | — |
| **SearchInput** | REDUCED | 75 → 42 | `-webkit-appearance: none` on `::-webkit-search-cancel-button` / `::-ms-clear` — `appearance-none` emits only the unprefixed property and nothing here can see the prefix go missing. |
| **ColorPicker** | REDUCED | 248 → 88 | The hue rail: a UA pseudo-element thumb whose `-webkit-appearance` and whose focus `box-shadow` — the rail's only affordance — cannot move safely. |
| **RangeSlider** | REDUCED | 122 → 109 | Same, ×2 engines, plus the `:focus-visible{outline:none}` reset that `verify:focus-affordance` has to pair with those thumb rules in one file. |
| **Slider** | UNCHANGED (+34-line header) | 81 → 113 | The `outline-none` → `--tw-outline-style: none` poison, on top of the vendor thumbs. Converting the base alone leaves ~40 lines of exactly the subtle half. |
| **Switch** | UNCHANGED (+21-line header) | 90 → 111 | `all: unset`, and `probe:cascade-layer` pins `.switch:focus-visible` against a hand-written `<button class="switch">` fixture in `scripts/`. |
| **Radio** | UNCHANGED (+13-line header) | 50 → 63 | Same probe-fixture pin, on `radio-forced-colors-focus-outline`. The AGENTS.md ruling was re-derived and holds. |
| **Sparkline** | UNCHANGED (+19-line header) | 107 → 126 | Two `@keyframes`, and every other rule in the file selects the `slot:(b)` marks those keyframes animate. |

**755 lines of CSS deleted** (118 + 202 + 435), **93 more removed from the three reduced
files**, against **87 lines of header comment added** to the four that stay. Net: −761.

Line counts for the four UNCHANGED files go *up* because "examined and it stays" is only
useful if the file says why — `AGENTS.md` says a converted file keeps a header naming each
survivor, and these four are converted-to-nothing rather than untouched.

## Public API changes

1. **`RangeSlider` root now carries `data-invalid`.** New DOM attribute. It exists because
   the invalid skin was keyed off `.range-slider[aria-invalid="true"]` and the root has
   never carried `aria-invalid` — `RangeSlider.tsx` destructures it out of the rest props
   and routes it to the two thumbs, where an AT reads it. All three invalid rules were
   therefore dead and an invalid RangeSlider painted exactly like a valid one. See
   *Refutations* below. Two tests added, both observed failing first.
2. **`RangeSlider` now uses `useFieldError` rather than `useFieldErrorProps`** internally,
   to get the `invalid` boolean the mirror needs. No prop change.
3. **`MultiSelect`'s control now uses `focusRingWithin` / `focusRingWithinError`** from
   `src/util/focus.ts` instead of three local rules. Same pixels; one fewer source of
   truth. The rule that existed solely to win a deliberate specificity tie
   (`.multiselect-control--error:focus-within`) is gone, because tailwind-merge resolves
   the base/error pair at the call site instead.
4. **`.multiselect-control--error`, `.colorpicker-trigger--error` and the six
   `.file-upload--*` modifiers are now declaration-free markers.** Retained deliberately
   (consumer stylesheets, devtools, `response-ui-css` consumers) and commented as such at
   the site, per AGENTS.md "Class names outlive their declarations".
5. **`FileUpload`'s Replace / Clear all buttons now show a focus ring.** `all: unset` was
   also setting `outline-style: none`, so they had no visible focus indicator at all.
   Dropping the reset restores the UA outline. See *Refutations*.
6. **No new slots.** No `SLOT-VOCABULARY.md` entry is owed by this lane; every declaration
   that moved landed on an element that already had a route or was already ruled `(a)`/`(e)`.
7. Behaviour note, not an API change: every `:hover` rule converted is now
   `@media (hover: hover)`. Affects `FileUpload` (dropzone border, five buttons),
   `SearchInput` (clear button), `MultiSelect` (chip remove), `Combobox` (nothing).

## Refutations — things measured and found wrong

**1. `font: inherit` was never a blocker on a form control, and the survey said it was.**
Tailwind Preflight declares `font: inherit` for `button, input, select, optgroup, textarea`
(`node_modules/tailwindcss/preflight.css:243–257`). Four of the six `font: inherit`
declarations in this lane sat on exactly those elements and were re-statements. The other
two (`.combobox-item`, `.multiselect-item`) sat on plain `<div>`s, where every longhand of
the `font` shorthand is an inherited property and nothing in the package sets one — a
no-op. That single fact is what turned Combobox and MultiSelect from "closest to
deletable" into deleted.

**2. `RangeSlider`'s invalid state has never painted.** `.range-slider[aria-invalid="true"]`
gates three rules (the fill's colour and both engines' thumb colour). `RangeSlider.tsx`
destructures `"aria-invalid": ariaInvalid` out of the props and merges it into
`thumbAriaProps`, which lands on the two `<input>`s — the root gets `{...props}` with the
key already removed. `RangeSlider.test.tsx` even asserted `.range-slider` does *not* carry
`aria-invalid`, right next to the rules that needed it. Fixed, not worked around.

**3. `FileUpload`'s two action buttons had no focus indicator, and no gate could see it.**
`all: unset` resets `outline-style` to `none`, and `verify:focus-affordance` reads
`outline*` declarations — `all` is outside its vocabulary entirely. Two focusable
`<button>`s, WCAG 2.4.7, green everywhere. This is a **new blind spot in that guard**, not
a new bug in the component; see the proposed gate change below.

**4. `all: unset` did not need enumerating on FileUpload — it needed deleting.** What it
bought over Preflight was `appearance: none` against Preflight's `button { appearance: button }`,
and `Button.tsx` demonstrates that `appearance: button` plus author styles renders fine —
it is the package's most-used component and carries no reset. The residual differences are
the UA's `text-align: center` and `display: inline-block`, both moot for a flex item with
one text run. This is the enumeration escape used as a **measurement**, and it is stated in
the file. The brief's framing ("enumerating it must include an explicit `appearance-none`")
is right for `Switch`, where the reset stays for an unrelated reason, and wrong here.

**5. Nothing in this lane contradicts §4 of the brief.** The vendor-pseudo-element ruling,
the `outline-none` custom-property poison and the arbitrary-utility sort order all held
exactly as stated, and are what pinned Slider, RangeSlider's overlays and ColorPicker's rail.

## Things the consolidation agent must resolve

**A. `scripts/probe-cascade-layer.mjs` blocks two conversions and I may not edit it.**
Two `Switch` rows (`switch-ring-baseline`, `switch-ring-vs-consumer-reset`) and one `Radio`
row (`radio-forced-colors-focus-outline`) measure `outline-width` against hand-written
fixtures — literally `<button class="switch">` and
`<input class="radio not-forced-colors:focus:outline-none">`. The focus rings they pin are
not reachable from a class list in those fixtures, so converting either component's focus
rule reddens the rows. If an owner wants Switch or Radio converted, the fixture has to
carry the component's real class string first, and that is a `scripts/` change. **The
`switch-ring-vs-consumer-reset` row also carries a recorded owner decision**, so it should
not be edited casually.

**B. `verify:focus-affordance` cannot see `all: unset`.** It cost two buttons their focus
ring in `FileUpload` (refutation 3). Exact prose I would have added to the script header,
under "Resets the outline is read in every spelling":

> `all: unset` and `all: initial` are outline resets too, and they are the one spelling
> this script has never read. `outline-style`'s initial value is `none`, so a rule whose
> first declaration is `all: unset` deletes the UA focus ring on every element it matches
> — and because the property never appears by name, `isOutlineReset` is never even called.
> Found live on `FileUpload`'s Replace and Clear all buttons, which had no focus indicator
> at all while every gate was green.

**C. `src/util/focus.ts` — I made a one-line edit.** Its `focusRingWithin` docblock cited
`MultiSelect.css:25` by line number, and that file is gone. Changed to name the control
`<div>` in `MultiSelect.tsx` rather than a line. Flagging it because other lanes may also
be editing that file.

**D. Cross-lane note for Lane 2 (`menu-internals.css`).** `Combobox.css` and
`MultiSelect.css` each carried a near-verbatim copy of `.menu-content` (fill, border,
radius, shadow, `padding: 0.25rem 0`, `min-width: 11.25rem`, `z-index: 40`,
`outline: none`) plus a `.menu-item`-shaped option row. Both are now the identical utility
string in their own `.tsx` (`contentClasses` / `itemClasses`), and I did **not** touch
`menu-internals.css`. If Lane 2 converts `.menu-content` and `.menu-item`, the three
strings should end up byte-identical, and someone should decide whether they want to share
one constant. `CommandPalette.tsx` renders `role="combobox"` but uses none of these classes.

**E. Cross-lane note for Lane 3 (`StatCard`).** `StatCard.css` selects `.sparkline`.
`Sparkline.css` stays whole, so nothing StatCard depends on moved; I did not touch
`StatCard`.

**F. Two other lanes' files are red in the shared tree** and are not mine:
`src/components/ui/Tabs.tsx:435` fails `verify:focus-affordance`, and
`src/components/ui/Tooltip.test.tsx` fails `typecheck` (`tooltipCss` undefined). Both were
red before and after my diff.

**G. INCIDENT — another lane overwrote `src/components/form/ColorPicker.tsx`.**
At 21:07:19–21:07:21 the file's entire contents were replaced with `CommandPalette.tsx`'s
source (676 lines, importing `./Kbd`). `CommandPalette.tsx` itself was written at the same
second and is intact, so this was a stray write to the wrong path, not a swap. Caught by
`typecheck`. I restored `ColorPicker.tsx` from `HEAD` and re-applied every edit, then
re-ran the whole gate set. **Whoever owns CommandPalette should check their tooling**, and
the consolidation agent should confirm no other file took a stray write in that window.

## Proposed edits to shared documents

### `CHANGELOG.md`

> **Fixed**
> - `RangeSlider`'s invalid state now paints. The skin was keyed off
>   `.range-slider[aria-invalid="true"]`, and the root has never carried that attribute —
>   it is routed to the two thumbs, where assistive tech reads it — so the fill and both
>   thumbs stayed accent-coloured while invalid. The root now mirrors the state as
>   `data-invalid`.
> - `FileUpload`'s **Replace** and **Clear all** buttons now show a focus ring. `all: unset`
>   was resetting `outline-style` to `none`, leaving two focusable controls with no visible
>   focus indicator (WCAG 2.4.7).
>
> **Changed**
> - `Combobox`, `MultiSelect` and `FileUpload` no longer ship a stylesheet; everything they
>   paint is a Tailwind utility, so a `className` of your own now beats every declaration
>   instead of losing to it at equal specificity. `ColorPicker`, `SearchInput` and
>   `RangeSlider` keep only the rules that style UA pseudo-elements. Class names are
>   retained as markers, so consumer stylesheets keep working.
> - `MultiSelect`'s control uses the shared `focusRingWithin` / `focusRingWithinError`
>   recipes. Identical pixels, one writer.
> - Hover affordances on `FileUpload`, `SearchInput` and `MultiSelect` are now inside
>   `@media (hover: hover)`, matching the rest of the package.

### `AGENTS.md` — a new row for the "What stays" table

> | The subject is a **UA pseudo-element** | `-webkit-appearance: none` loses its prefix (`appearance-none` emits the unprefixed property only), and a `box-shadow` there resolves through five `@property`-registered variables where the hand-written form has one. Neither consequence is measurable in this repo, and on a slider thumb the `box-shadow` **is** the focus affordance. | `grep -rn 'slider-thumb\|range-thumb\|search-cancel-button' src --include=*.css` — `Slider`, `RangeSlider`, `ColorPicker`'s hue rail and `SearchInput`. Four files, and three of them are focus-guard-covered controls. |

### `memory/css-to-utilities.md` — two additions

Under *Preflight is already a dependency, undocumented*:

> Preflight's form-element rule (`button, input, select, optgroup, textarea,
> ::file-selector-button`) gives `font: inherit`, `font-feature-settings`,
> `font-variation-settings`, `letter-spacing`, `color: inherit`, `border-radius: 0`,
> `background-color: transparent` and `opacity: 1`. So a `font: inherit` on a form control
> is not a reset that has to stay — it is Preflight, restated. Measured: four of the six
> `font: inherit` declarations across the form lane sat on form controls, and the other two
> sat on plain `<div>`s where every longhand of the shorthand is inherited anyway and
> nothing set one. All six were deletable, and that single fact is what let `Combobox.css`
> and `MultiSelect.css` go entirely. Check the ELEMENT before treating `font: inherit` as
> load-bearing.

New section, *A dead rule looks exactly like a live one*:

> `RangeSlider.css` gated its whole invalid skin on `.range-slider[aria-invalid="true"]`.
> The root has never carried `aria-invalid`: the component destructures it out of the rest
> props and merges it onto the two thumbs, where an AT actually reads it. Three rules,
> never matched, for as long as the file existed — and the test file asserted the root does
> *not* carry the attribute, on the line above. Nothing catches this: `typecheck` cannot
> see CSS, jsdom applies no stylesheets, and the guards check reachability of the ELEMENT,
> never of the STATE the selector tests for.
>
> The generalisation: when a rule keys off an attribute, find where the attribute is
> written, not just where the class is. In a component that routes ARIA down to inner
> controls — which is the correct thing to do — the root often does not have the attribute
> its own stylesheet is asking about.

New section, *`all: unset` is an outline reset that no gate reads*:

> `verify:focus-affordance` reads every spelling of an outline reset except the one that
> does not name the property. `all: unset` computes `outline-style: none`, so any focusable
> element carrying it has lost the UA focus ring, and the script never calls
> `isOutlineReset` because no `outline*` declaration exists to hand it. Found live on
> `FileUpload`'s two action buttons. Before treating an `all: unset` rule as load-bearing,
> check whether the element is focusable and what puts the ring back — the answer may be
> "nothing".

### `TAILWIND-V4-VARIANTS.md` — one line for the "What has no variant at all" section

> `fill-opacity` has no scale: `fill-opacity-15` MISSes and the only spelling is
> `[fill-opacity:0.15]`, an arbitrary property sorted last in `@layer utilities`.
> (`Sparkline`'s area wash.)

## Anything I did not do, and why

- **`Slider`, `Switch`, `Radio`, `Sparkline` were not converted at all.** Each is examined
  and each carries its reason as a header comment; three of the four are blocked by
  something outside this lane's file ownership (`scripts/`) or outside this repo's ability
  to measure (vendor pseudo-elements, forced colours). `Sparkline` is blocked by the
  `@keyframes` coupling and by the marks being `slot:(b)` with no class route.
- **I did not add a `classNames` slot anywhere.** No rule in this lane needed a new element
  to become reachable — the `> *`-shaped problem the Accordion pattern solves does not
  occur in these ten files.
- **`ColorPicker`'s hue rail could have been converted down to one surviving rule**
  (the two `:focus-visible::…-thumb` rings). I kept the rail's five rules together instead,
  because splitting them puts the reset in the `.tsx` and the replacement in the `.css` and
  `verify:focus-affordance` pairs them by element, not by file — a split that still passes
  today is one keystroke from passing while painting nothing.
- **I did not run `bun run test` or `bun run probe:cascade-layer`**, per §9 of the brief.
  The consolidation agent must run `probe:cascade-layer` — `RangeSlider.css`'s selectors
  changed from `[aria-invalid="true"]` to `[data-invalid]`, and while no pinned row names
  them, that is worth confirming rather than assuming.
