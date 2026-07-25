# Plan of attack

> **This file started as BUGS.md's "Recurring patterns" section, verbatim below.**
> It is narrative; the workflow needs clusters. Convert each bullet into a section
> with: root cause · member findings (ids) · the sweep command that proves the member
> list complete · verification tool · one-way doors · status. See BUG_TRIAGE_PLAYBOOK.md §3.

- **Silent prop-drop in `as`-polymorphic wrappers.** `ScrollReveal` and `Stagger` type
  the rendered element's full prop set (via `ComponentPropsWithRef<T>`) but never spread
  `...rest` onto the element — so `id`, `data-*`, `aria-*`, handlers are dropped at
  runtime while the types claim they work. Check every `as`-polymorphic component.
  **`Swimlane` (#171) is the first confirmed downstream victim** — it spreads its own rest
  props onto `ScrollReveal`, so a defect two components away silently deletes `id`, `role`,
  `style`, `aria-label` and `data-*` from a public API. **`MasonryGrid.Item` (#178) is the
  second**, measured the same way, and **`Timeline.Item` (#340, high) is the third** — which makes
  it three of the three components audited so far that render `ScrollReveal` with a rest spread.
  Note all three are *conditional* — the props land under `animate={false}` and vanish under the
  default — so a test written the easy way covers only the working path, and all three test files
  were written that way (all nine of `MasonryGrid.test.tsx`, #185; all eight of
  `Timeline.test.tsx`, #347). That easy path is not merely convenient: rendering the default under
  the repo's `test-setup.ts` *throws*, because `usePrefersReducedMotion` calls `window.matchMedia`
  unguarded while its sibling `useMediaQuery` guards it — so the configuration that carries the bug
  is the one that is hardest to test. Every component that *renders* `ScrollReveal` or `Stagger`
  while typing itself as its host element has this bug; grep for `<ScrollReveal` and `<Stagger`
  with a `{...rest}` nearby. Still to check: `Spotlight.Content` (passes no rest through, so clean)
  and anything added since.
- **Status by colour alone (WCAG 1.4.1).** `Alert`, `Meter`, **`Badge` (#44)**,
  **`Avatar`'s presence dot (#57)** and **`ProgressBar` (#205)** encode state purely in tint —
  no icon/label/ARIA. **Five for five** on the status surfaces audited so far; treat this as the
  library's default failure, not an exception. `ProgressBar` is the worst of them — two bars at
  the same `value` with `color="success"` and `color="error"` produce byte-identical
  accessibility-tree output, where `Meter` at least emits `data-status`. Check StatCard.Trend and
  any remaining status surface. **`CalendarBase` (#315) makes six**, and is the first where the
  state carried by colour alone is a *selection* rather than a status: a day inside a committed
  range renders `aria-selected="false"` with only a `data-in-range` attribute, so the extent of a
  booking is conveyed entirely by a `--C-SURFACE-2` wash measured at 1.08–1.16:1 (#210).
- **Types that advertise props the runtime drops.** Beyond the `...rest` cases above,
  `Avatar` (#56) intersects `ComponentPropsWithRef<"span">` without `Omit<…, "children">`, so
  `<Avatar name="…">child</Avatar>` compiles clean and renders only the initials. `Skeleton` and
  `Spinner` get the same case right, so the fix is a known one-liner. Sweep every component whose
  props are an intersection rather than an `Omit`.
- **Hard-coded English in `sr-only` text.** `Spinner` (#39) and `Skeleton` (#64) both render a
  literal `"Loading"` in a visually hidden node while omitting `children` from the prop type, so
  the string is unreachable — and `aria-label` renames the region without changing its contents,
  leaving name and content in different languages. `Rating` (#218) renders `"N stars"` the same
  way (and announces `"1 stars"` for the first one), and `Carousel` (#192) hard-codes
  `"Previous"`/`"Next"` on internal `IconButton`s. Any component with an `sr-only` literal or an
  `aria-label` literal on a part the caller cannot reach. **Batch I found three more and one new
  consequence:** `OTPInput` (#243) names every box `"Digit N"` — wrong outright in
  `mode="alphanumeric"` — and `Repeater` (#259) gives every row the same `"Remove item"` /
  `"Move up"` / `"Move down"`, so N rows yield N indistinguishable buttons. `SearchInput` (#222)
  is the sharpest case, because its literal is not merely unreachable but *actively destructive*:
  a hard-coded `aria-label="Search"` **outranks** an associated `<label for>` in the
  accessible-name computation, so wiring a visible `Label` the way `label.md` documented changes
  nothing (measured: computed name `"Search"`, not `"Search orders"`; `label.md` is fixed). Grep
  every hard-coded `aria-label` for that second failure mode, not just for the language.
  **Batch K adds the date-picker family and a third failure mode: mixed-language output in one
  component.** `DatePicker` (#327) and `DateRangePicker` (#336) both accept a `locale` prop, use it
  correctly for every date string, and then surround those strings with English literals the caller
  cannot reach — measured under `locale="fr-FR"`, French month names inside a dialog labelled
  "Choose date" between buttons labelled "Open calendar" and "Previous month". `DateRangePicker` is
  also the `SearchInput` trap again: its `"Start date"`/`"End date"` labels outrank any `<label
  for>`, and it forwards no `id` for one to point at in the first place.
- **A rest-spread placed *after* a component's own handler lets a caller silently replace it.**
  The mirror image of the bullet above: there the type promises props the runtime drops; here the
  type *hides* a prop the runtime still honours — destructively. `TagInput` (#245) writes
  `onChange={handleChange} … {...props}` in that order, and `onChange` is `Omit`ted from its prop
  type, so `<TagInput {...form.field<string[]>("tags")} />` — the binding **`AGENTS.md:249` and
  `README.md:203` both advertise** — typechecks clean (verified with `tsc`) and then throws
  `TypeError: tags.map is not a function` on the first keystroke. `AnimatePresence` (#13) is the
  same shape with `onAnimationEnd`, which makes two. `CalendarBase` (#316) is the third, and the
  first where the prop is *not* `Omit`ted — `onPointerLeave` is an ordinary `div` prop, so
  `<RangeCalendar onPointerLeave={…}/>` is a perfectly reasonable thing to write, and it silently
  replaces the handler that clears the range hover preview (measured: four cells stay lit forever
  versus zero without the prop). The `Omit` is what makes the first two invisible; the third shows
  the pattern does not need one. Every component that spreads rest after its own handlers should
  destructure those handler names out first; grep for `{...props}` following an `on[A-Z]` prop on
  the same element. **Batch L adds `AvatarUpload` (#380).** **Batch M adds two more:**
  `AppShell.Toggle` (#390) whose `onClick` is `Omit`ted-and-replaced like TagInput's, and
  `FileUpload` (#407, high) — the widest case yet, where the single root `{...props}` sits after
  *four* handlers (`onClick`/`onKeyDown`/`onDragOver`/`onDragLeave`), so a caller `onClick` deletes
  the file picker outright (measured: 0 `input.click()`), only `onDrop` protected by the `Omit`.
- **Contrast is measured nowhere.** #51 is the first *measured* contrast audit in this file and
  `--C-TEXT-MUTED` fails AA on every surface of every theme. The token tables across the spokes
  say which variable paints what; nothing checks the pair is legible. A ratio guard over the
  theme files would catch this class of defect permanently. **It is not only `--C-TEXT-MUTED`:**
  batch G measured `--C-ACCENT` failing AA on every surface in `events` and `grimdark` (#173,
  and grimdark's `:hover` colour is *lower* than its rest colour), and `--C-TEXT-ON-PRIMARY`
  falling to 2.89:1 once a themed scrim is composited over a bright photo (#163). The contract
  guarantees ink tokens against *fill* tokens only; every composited surface — scrims,
  gradients, imagery — is outside it and unmeasured. **Batch H widened this from ink to
  surfaces:** `--C-SURFACE-1` on `--C-SURFACE-0` measures 1.02–1.07:1 across all four themes
  (#206) and `--C-SURFACE-2` on it 1.08–1.16:1 (#210), so *any* component that distinguishes two
  adjacent surface steps by colour alone — tracks, wells, insets, hairlines — is invisible by
  construction, and neither the contract nor any guard says the ramp has to be perceptible.
  `--C-STATUS-WARNING` is also now measured failing the 3:1 graphical floor on light surfaces
  (#215), so three of the token families have failed the first time anyone put a number on them.
  **Batch I moves this into the shared form recipe.** The border every text
  control draws itself with — `--C-BORDER-STRONG` on `--C-SURFACE-0` — is **1.41–1.79:1** across
  all four themes (#241), and since that fill equals the base page surface the border is often
  the *only* thing drawing the control; `OTPInput`'s six empty unlabelled boxes are the worst
  case. The focus indicator that replaces the UA outline is under 3:1 in half the themes (#242,
  `events` 2.72:1 / `grimdark` 2.96:1) with `focus:outline-none` removing the fallback. Unlike the
  earlier rows these are not exotic composites but the default appearance of every form on every
  page. Every token pair anyone has put a number on so far has failed its floor.
  **Batch J corrects the scope of that fix.** #241/#242 said the recipe was "one class string
  shared by Input, Textarea, Select, NumberInput, SearchInput and OTPInput, so **one fix, not
  six**." That is wrong: `Combobox.css` (#284), `ColorPicker.css` (#293) and `MultiSelect.css`
  hand-write the *same* recipe with the *same* tokens in their own stylesheets, so retuning the
  shared Tailwind string reaches none of them. The sweep has to cover per-component CSS as well —
  grep for `--C-BORDER-STRONG` and `--C-BORDER-FOCUS` across `src/components/**/*.css`, not just
  the shared class string.
  **Batch J also widens the surface-ramp finding (#206) from decoration to keyboard navigation.**
  `--C-SURFACE-1` on `--C-SURFACE-0` is the *entire* active-option indicator in both `Combobox`
  (#275, high) and `MultiSelect` (#264), and both run `useListNavigation({ virtual: true })`, so
  no option ever takes DOM focus and there is no focus ring to fall back on. An invisible ramp
  step stops being cosmetic the moment it is the only thing telling a keyboard user where they
  are. Check every floating list that marks its active row with an adjacent surface step.
  **Batch K puts the first number on the contract's own intended ink/fill pair.**
  `--C-TEXT-ON-ACCENT` on `--C-ACCENT` — the pairing the contract exists to guarantee — measures
  5.17:1 default, **2.80:1 `events`**, **3.81:1 `grimdark`**, 14.84:1 `tech` (#319), so the
  selected day in a calendar fails AA for body text in half the shipped themes. That makes it four
  token families measured and four failures; the guard, when someone writes it, has to cover the
  named ink/fill pairs first, not just incidental composites.
  **Batch M measures a fifth family: the contract's own status pairs.** `--C-STATUS-SUCCESS` on
  `--C-STATUS-SUCCESS-BG` = 3.15 / 3.15 / 13.39 / 6.70 and `--C-STATUS-ERROR` on `--C-STATUS-ERROR-BG`
  = 4.41 / 4.41 / 5.35 / 4.59 (default / events / tech / grimdark) at `--BodyText-3` size (#415,
  `FileUpload`), so both miss AA in `default` and `events` on the pairing `docs/theme-contract.md`
  names under "Status" but attaches no ratio to. Five families measured, five failures. Batch M also
  extends the surface-ramp/keyboard-nav case (#275/#264): `CommandPalette`'s active-option highlight
  is `--C-SURFACE-2` on `--C-SURFACE-0` at 1.08–1.16:1 with no focus ring under virtual focus (#398,
  high) — one step up the ramp from Combobox — and `AppShell`'s active link ink is *below* its
  resting-link ink in `events`/`grimdark` (#393), the first time marking an item current makes it the
  least legible thing in the group.
- **Continuous motion with no `prefers-reduced-motion` guard.** ~25 component CSS files ship
  a reduced-motion block and `src/hooks/use-reduced-motion.ts` exists, but utility-driven
  motion bypasses all of it: `Spinner`'s `animate-spin` (#38) is unguarded, as is
  `IconButton`'s `active:scale-95` (#43). The gap is specifically **Tailwind animation/
  transform utilities**, not the hand-written CSS. Sweep for `animate-`, `scale-`,
  `transition` utilities with no `motion-reduce:` sibling.
- **`<button>` with no explicit `type`.** A bare `<button>` is `type="submit"`. **`Button`
  itself (#74)** and `IconButton` (#41) both set no default, and `Toast`, `Pagination` and
  `Carousel` call IconButton without one — so each submits an enclosing form, and a `Cancel`
  rendered before the real submit button becomes the form's **default submitter**, so Enter in
  any text field fires Cancel. `CopyButton`, `Repeater`, `DatePicker` and Pagination's own
  page-number button get it right — the library is split against itself. The previous revision
  of this bullet said "sweep every `<button>`" and *still missed `Button`*; treat a sweep as
  incomplete until it names every component, not every pattern.
- **Field-error context reaches only 11 of 17 form controls.** `Radio` (#75) and `Checkbox`
  (#76) never call `useFieldError`, so they sit inside an invalid `Field` with no
  `aria-invalid` and no `aria-describedby`. Four more (`DatePicker`, `DateRangePicker`,
  `NumberInput`, `SearchInput`) are wired only transitively, through the `Input` they render.
  `field.md` and `radio.md` both claimed the wiring was automatic "for the rest"; both are fixed.
  **Batch J found a twelfth state: wired-but-partial.** `RangeSlider` (#296) *does* call the hook
  and then reads only `aria-invalid` off it, putting that on its wrapper and throwing the
  `aria-describedby` away — so it counts in the eleven while delivering half of what they deliver.
  `field.md` is corrected. Reading the hook is not the same as forwarding it; check what each of
  the eleven actually spreads, not just which ones call it.
- **Focus indicators removed and not replaced.** `Radio` (#73) is the severe case — a measured
  **0-pixel** change on keyboard focus — but `Switch` and `Slider` (#84) also lose their *error*
  outline on focus because `:focus-visible` and `[aria-invalid]` are written at equal specificity
  with focus second. Any component that writes `outline-none` or a `:focus-visible` reset.
- **Theme/contrast token gaps.** `Card` (no paired text colour; wrong surface layer), and a
  systemic focus-ring bug: **`ring-offset-color` is set nowhere in the library**, so every
  `ring-offset-2` paints Tailwind's default white. Confirmed by grep — 5 affected components
  (see #35), 3 benign (`ring-offset-0`). Fix once, library-wide, not per component.
- **Raw Tailwind defaults where a token exists.** `ErrorBoundary`'s fallback uses
  `text-2xl` / `mb-2` / `px-4 py-2` rather than the `text-h*` and `r*` scales, so it neither
  re-tints nor re-scales with a theme — directly against the ETHOS "there is a token for it"
  rule. Worth a sweep for `text-(xs|sm|base|lg|[0-9]xl)` and bare numeric spacing utilities.
