# BUGS

Code defects surfaced while documenting the components. **Not doc issues** — those get
fixed in the doc. These are places where the *code* is wrong, misleading, or violates a
contract (accessibility, the contrast contract, ETHOS token rules, logic). Logged here
for later audit rather than fixed inline, so the documentation pass stays reversible and
one concern at a time.

**Provenance:** surfaced by the `gen-component-docs` workflow — author + adversarial
verifier agents. Each is a *candidate* for audit, not a confirmed-and-triaged defect.
Confidence tags: `corroborated` = an author and an independent verifier flagged it
separately; `spot-checked` = confirmed by hand against the source; `candidate` =
single-source, unverified; a few carry a caveat where a passing guard disagrees.

## Recurring patterns (audit these across the whole library, not just the rows below)

- **Silent prop-drop in `as`-polymorphic wrappers.** `ScrollReveal` and `Stagger` type
  the rendered element's full prop set (via `ComponentPropsWithRef<T>`) but never spread
  `...rest` onto the element — so `id`, `data-*`, `aria-*`, handlers are dropped at
  runtime while the types claim they work. Check every `as`-polymorphic component.
  **`Swimlane` (#171) is the first confirmed downstream victim** — it spreads its own rest
  props onto `ScrollReveal`, so a defect two components away silently deletes `id`, `role`,
  `style`, `aria-label` and `data-*` from a public API. **`MasonryGrid.Item` (#178) is the
  second**, measured the same way, which makes this a pattern rather than an anecdote: two of
  the two components audited so far that render `ScrollReveal` with a rest spread have it.
  Note both are *conditional* — the props land under `animate={false}` and vanish under the
  default — so a test written the easy way (as all nine of `MasonryGrid.test.tsx` were) covers
  only the working path. Every component that *renders* `ScrollReveal` or `Stagger` while
  typing itself as its host element has this bug; grep for `<ScrollReveal` and `<Stagger` with
  a `{...rest}` nearby. Still to check: `Spotlight.Content` (passes no rest through, so clean)
  and anything added since.
- **Status by colour alone (WCAG 1.4.1).** `Alert`, `Meter`, **`Badge` (#44)**,
  **`Avatar`'s presence dot (#57)** and **`ProgressBar` (#205)** encode state purely in tint —
  no icon/label/ARIA. **Five for five** on the status surfaces audited so far; treat this as the
  library's default failure, not an exception. `ProgressBar` is the worst of them — two bars at
  the same `value` with `color="success"` and `color="error"` produce byte-identical
  accessibility-tree output, where `Meter` at least emits `data-status`. Check StatCard.Trend and
  any remaining status surface.
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
- **A rest-spread placed *after* a component's own handler lets a caller silently replace it.**
  The mirror image of the bullet above: there the type promises props the runtime drops; here the
  type *hides* a prop the runtime still honours — destructively. `TagInput` (#245) writes
  `onChange={handleChange} … {...props}` in that order, and `onChange` is `Omit`ted from its prop
  type, so `<TagInput {...form.field<string[]>("tags")} />` — the binding **`AGENTS.md:249` and
  `README.md:203` both advertise** — typechecks clean (verified with `tsc`) and then throws
  `TypeError: tags.map is not a function` on the first keystroke. `AnimatePresence` (#13) is the
  same shape with `onAnimationEnd`, which makes two. The `Omit` is what makes it invisible: it
  removes the type-level warning without removing the runtime behaviour. Every component that
  spreads rest after its own handlers should destructure those handler names out first; grep for
  `{...props}` following an `on[A-Z]` prop on the same element.
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

## Findings

| # | Status | Component | File:line | Sev | Summary |
| - | ------ | --------- | --------- | --- | ------- |
| 1 | unaudited · corroborated | Alert | [Alert.tsx:25](src/components/ui/Alert.tsx#L25) | med | Severity conveyed by colour alone (WCAG 1.4.1) |
| 2 | unaudited · corroborated | Alert | [Alert.tsx:28](src/components/ui/Alert.tsx#L28) | med | `aria-live="polite"` downgrades `role="alert"` for every variant |
| 3 | unaudited | Card | [Card.tsx:36](src/components/ui/Card.tsx#L36) | med | Themed surface with no paired text colour → contrast risk in dark themes |
| 4 | unaudited | Card | [Card.tsx:36](src/components/ui/Card.tsx#L36) | med | Uses `bg-surface-0`; contract designates `--C-SURFACE-1` for cards |
| 5 | unaudited | StatCard | [StatCard.tsx:72](src/components/ui/StatCard.tsx#L72) | med | `animateValue` freezes on first target; changed `to` never re-animates |
| 6 | unaudited | StatCard | [StatCard.tsx:111](src/components/ui/StatCard.tsx#L111) | low | Pre-scroll accessible value is the `from` placeholder (usually `0`) |
| 7 | unaudited | DescriptionList | [DescriptionList.tsx:16](src/components/data-display/DescriptionList.tsx#L16) | med | Horizontal (default) layout misaligns a term's 2nd+ detail |
| 8 | unaudited | DescriptionList | [DescriptionList.tsx:16](src/components/data-display/DescriptionList.tsx#L16) | low | `display:grid/flex` on `<dl>` can drop list semantics in Safari+VoiceOver |
| 9 | unaudited · spot-checked | ScrollReveal | [ScrollReveal.tsx:91](src/components/animation/ScrollReveal.tsx#L91) | **high** | `as` types full element props but `...rest` is never spread onto `<Tag>` → props dropped |
| 10 | unaudited · spot-checked | Stagger | [Stagger.tsx:22](src/components/animation/Stagger.tsx#L22) | **high** | Rest props accepted by type but dropped at runtime (no `...rest`) |
| 11 | unaudited · corroborated | RequireAuth | [RequireAuth.tsx:44](src/components/guards/RequireAuth.tsx#L44) | med | Inline ref callback `ref={el=>el?.click()}` re-fires navigation every render |
| 12 | unaudited | RequireAuth | [RequireAuth.tsx:25](src/components/guards/RequireAuth.tsx#L25) | low | Docblock "hard navigation via `<a>`" is misleading (delegates to adapter Link) |
| 13 | unaudited · corroborated | AnimatePresence | [AnimatePresence.tsx:62](src/components/animation/AnimatePresence.tsx#L62) | med | Caller `onAnimationEnd` replaces internal handler → element never unmounts |
| 14 | unaudited | AnimatePresence | [AnimatePresence.tsx:41](src/components/animation/AnimatePresence.tsx#L41) | med | No `target===currentTarget` guard → descendant `animationend` unmounts mid-exit |
| 15 | unaudited | AnimatePresence | [AnimatePresence.tsx:41](src/components/animation/AnimatePresence.tsx#L41) | low | `exitClass` without a CSS animation → mounted forever (no timeout fallback) |
| 16 | unaudited · corroborated | ScrollReveal | [ScrollReveal.tsx:59](src/components/animation/ScrollReveal.tsx#L59) | med | No IntersectionObserver / no-JS / SSR → element stuck `opacity:0`, content hidden |
| 17 | unaudited | Stagger | [Stagger.tsx:26](src/components/animation/Stagger.tsx#L26) | med | `staggerDelay` may be a no-op — sets `--stagger-delay`; confirm the CSS consumes it |
| 18 | unaudited · corroborated | ViewTransition | [ViewTransition.tsx:48](src/components/animation/ViewTransition.tsx#L48) | med | `useViewTransition` never awaits `navigate`'s promise → async routers get no transition |
| 19 | unaudited · corroborated | ViewTransition | [ViewTransition.tsx:47](src/components/animation/ViewTransition.tsx#L47) | med | Neither export respects `prefers-reduced-motion` |
| 20 | unaudited | ViewTransition | [ViewTransition.tsx:1](src/components/animation/ViewTransition.tsx#L1) | low | `"use client"` forces the pure component into the client bundle |
| 21 | unaudited · corroborated | Meter | [Meter.tsx:71](src/components/data-display/Meter.tsx#L71) | med | Warning/critical status conveyed by colour alone (WCAG 1.4.1) |
| 22 | unaudited · corroborated | Meter | [Meter.tsx:71](src/components/data-display/Meter.tsx#L71) | low | `aria-valuenow` is unclamped; can exceed `aria-valuemax` |
| 23 | unaudited · corroborated | Field | [Field.tsx:48](src/components/form/Field.tsx#L48) | med | Control emits `aria-describedby` to a FieldError id that isn't rendered → dangling ref |
| 24 | unaudited · corroborated | Field | [Field.tsx:74](src/components/form/Field.tsx#L74) | low | No Label↔control association (no `htmlFor`/`id`) → label isn't the accessible name |
| 25 | unaudited · corroborated | Checkbox | [Checkbox.tsx:17](src/components/form/Checkbox.tsx#L17) | med | `focus:ring-offset-2` uses Tailwind default `#fff` → white halo on dark themes |
| 26 | unaudited · corroborated | Checkbox | [Checkbox.tsx:16](src/components/form/Checkbox.tsx#L16) | low | Themed border/radius are dead styling on a native checkbox (no `appearance-none`) |
| 27 | unaudited · caveat | Input | [Input.tsx:1](src/components/form/Input.tsx#L1) | med | Calls `useFieldError` hook with no `"use client"` → RSC direct-render fails. **`verify-directives` passes — that guard has a blind spot for context-only hooks; audit both.** |
| 28 | unaudited | ActivityFeed | [ActivityFeed.tsx:18](src/components/data-display/ActivityFeed.tsx#L18) | low | `<ol>` `list-style:none` without `role="list"` → Safari+VoiceOver drops list semantics |
| 29 | unaudited | Sparkline | [Sparkline.tsx:69](src/components/data-display/Sparkline.tsx#L69) | low | Default `aria-label` states value *count*, not data; `role="img"` always on |
| 30 | unaudited | Sparkline | [Sparkline.tsx:97](src/components/data-display/Sparkline.tsx#L97) | low | Single-value line/area can render an invisible point (silent no-op) |
| 31 | unaudited | Parallax | [Parallax.tsx:53](src/components/animation/Parallax.tsx#L53) | low | Residual `translateY` not cleared on reduced-motion toggle / effect teardown |
| 32 | unaudited | Parallax | [Parallax.tsx:60](src/components/animation/Parallax.tsx#L60) | low | No resize/orientationchange recompute → viewport-center offset goes stale |
| 33 | unaudited | Parallax | [Parallax.tsx:75](src/components/animation/Parallax.tsx#L75) | low | `will-change: transform` for the element's whole life parks a permanent compositor layer |
| 34 | unaudited · spot-checked | ErrorBoundary | [ErrorBoundary.tsx:27](src/components/ui/ErrorBoundary.tsx#L27) | med | Fallback uses raw Tailwind defaults (`text-2xl`, `mb-2`, `mb-6`, `px-4 py-2`) instead of design tokens |
| 35 | unaudited · spot-checked | **library-wide** | 5 files, see detail | med | `ring-offset-2` with `ring-offset-color` set **nowhere** → white focus halo on dark themes. Affects Button, IconButton, Checkbox, AvatarUpload, ErrorBoundary (supersedes #25) |
| 36 | unaudited · spot-checked | ErrorBoundary | [ErrorBoundary.tsx:29](src/components/ui/ErrorBoundary.tsx#L29) | low | Hand-rolled `<button>` re-implements Button's styling instead of composing `Button` |
| 37 | unaudited · spot-checked | ErrorBoundary | [ErrorBoundary.tsx:25](src/components/ui/ErrorBoundary.tsx#L25) | low | No `fallback` prop; the fixed `min-h-screen` fallback makes it unusable for scoped/inline boundaries |
| 38 | unaudited · corroborated | Spinner | [Spinner.tsx:7](src/components/ui/Spinner.tsx#L7) | med | `animate-spin` has no `prefers-reduced-motion` guard — the library's only unguarded continuous animation |
| 39 | unaudited · corroborated | Spinner | [Spinner.tsx:30](src/components/ui/Spinner.tsx#L30) | med | Visually hidden "Loading" is hard-coded English and unreachable — `children` is omitted from the prop type |
| 40 | unaudited | Spinner | [Spinner.tsx:26](src/components/ui/Spinner.tsx#L26) | low | Every instance is its own already-full `role="status"` live region; N spinners = N live regions |
| 41 | unaudited · corroborated | IconButton | [IconButton.tsx:16](src/components/ui/IconButton.tsx#L16) | med | No default `type="button"` → renders as `submit`; Toast/Pagination/Carousel call sites submit their enclosing form |
| 42 | unaudited · spot-checked | IconButton | [IconButton.tsx:6](src/components/ui/IconButton.tsx#L6) | low | Required `aria-label: string` accepts `""`, and `aria-labelledby` cannot substitute for it |
| 43 | unaudited | IconButton | [IconButton.tsx:10](src/components/ui/IconButton.tsx#L10) | low | `active:scale-95` has no reduced-motion guard (WCAG 2.3.3) |
| 44 | unaudited · corroborated | Badge | [Badge.tsx:9](src/components/ui/Badge.tsx#L9) | med | Variant meaning carried by tint alone — no icon, label, role or `aria-*` (WCAG 1.4.1) |
| 45 | unaudited | Badge | [Badge.tsx:7](src/components/ui/Badge.tsx#L7) | low | `text-body-3` line-height with no leading reset inflates every chip (~2.25rem on the default scale) |
| 46 | unaudited · spot-checked | ToastContext | [ToastContext.tsx:136](src/components/ui/ToastContext.tsx#L136) | **high** | `createPortal(…, document.body)` with no `typeof document` guard → `ToastProvider` throws on any server render |
| 47 | unaudited · corroborated | Portal | [Portal.tsx:10](src/components/ui/Portal.tsx#L10) | med | SSR guard stops the server throw but guarantees a hydration mismatch for any unconditional Portal |
| 48 | unaudited | Kbd | [Kbd.tsx:6](src/components/ui/Kbd.tsx#L6) | low | Keycap never reads `--DEFAULT-MONO-FONT`; falls through to Tailwind Preflight's default mono stack |
| 49 | unaudited | Kbd | [Kbd.tsx:6](src/components/ui/Kbd.tsx#L6) | low | Package's only `font-medium` (off-contract weight); no leading reset, so cap height is purely `--BodyText-3-line-height` |
| 50 | unaudited · spot-checked | TagInput | [TagInput.tsx:175](src/components/form/TagInput.tsx#L175) | low | Duplicates Badge's full class string verbatim — a second source of truth for chip styling |
| 51 | unaudited · corroborated | **response-ui-css** | `tokens/colors.css:23` + all 3 themes | med | `--C-TEXT-MUTED` fails WCAG AA **and** AA-large on every surface of every shipped theme (max 2.59:1) |
| 52 | unaudited · spot-checked | **response-ui-css** | grimdark theme | low | `--C-TEXT-SECONDARY` on `--C-SURFACE-3` is 4.45:1 — just under the 4.5:1 AA threshold |
| 53 | unaudited · spot-checked | Text | [Text.tsx:9](src/components/ui/Text.tsx#L9) | med | `variant` sets size only; heading face/tracking/weight come from `h1`–`h6` element selectors, so `variant`+`as` desyncs look from size |
| 54 | unaudited · spot-checked | Text | [Text.tsx:60](src/components/ui/Text.tsx#L60) | low | `weight` builds a dynamic class (`` `font-${weight}` ``) invisible to Tailwind's scanner; `font-bold` survives only via two unrelated literals |
| 55 | unaudited · corroborated | Avatar | [Avatar.tsx:65](src/components/ui/Avatar.tsx#L65) | med | `imgError` latch never reset when `src` changes — a recovered URL never renders again |
| 56 | unaudited · corroborated | Avatar | [Avatar.tsx:53](src/components/ui/Avatar.tsx#L53) | med | `children` typechecks (no `Omit`) but is silently dropped at runtime; Skeleton/Spinner get this right |
| 57 | unaudited · corroborated | Avatar | [Avatar.tsx:100](src/components/ui/Avatar.tsx#L100) | med | Presence dot conveys status by colour alone — unlabelled `<span>`, no role/text/ARIA |
| 58 | unaudited · spot-checked | Avatar | [Avatar.tsx:73](src/components/ui/Avatar.tsx#L73) | med | `role="img"` applied unconditionally, even when `alt` and `name` are both absent/blank |
| 59 | unaudited · corroborated | AvatarGroup | [Avatar.tsx:129](src/components/ui/Avatar.tsx#L129) | med | `size` sizes only the overlap and the `+N` chip; it never reaches the children |
| 60 | unaudited | Avatar | [Avatar.tsx:24](src/components/ui/Avatar.tsx#L24) | low | `xs` initials use raw `text-[0.625rem]` — off-contract and non-responsive |
| 61 | unaudited | Avatar | [Avatar.tsx:103](src/components/ui/Avatar.tsx#L103) | low | `ring-surface-0` hard-codes the backdrop; wrong colour on any non-`surface-0` background |
| 62 | unaudited · spot-checked | Avatar | [Avatar.tsx:49](src/components/ui/Avatar.tsx#L49) | low | `getInitials` indexes by UTF-16 code unit, so an astral first char yields a lone surrogate |
| 63 | unaudited · corroborated | Skeleton | [Skeleton.tsx:27](src/components/ui/Skeleton.tsx#L27) | med | Every instance is its own `role="status"` region named "Loading" — a 4-skeleton card mounts 4 live regions |
| 64 | unaudited · corroborated | Skeleton | [Skeleton.tsx:33](src/components/ui/Skeleton.tsx#L33) | med | Hidden "Loading" text is hard-coded English and unreachable (`children` omitted) — same defect as #39 |
| 65 | unaudited · spot-checked | Skeleton | [Skeleton.css:8](src/components/ui/Skeleton.css#L8) | low | Only `.skeleton--text` has a height; the other three variants measure 0px without an explicit `height` |
| 66 | unaudited · spot-checked | Skeleton | [Skeleton.tsx:21](src/components/ui/Skeleton.tsx#L21) | low | `width` defaults to an inline `100%`, so `w-*` utilities silently never apply |
| 67 | unaudited | Skeleton | [Skeleton.css:5](src/components/ui/Skeleton.css#L5) | low | Pulse timing and the reduced-motion `opacity` are literals; no `--MOTION-*` token is read |
| 68 | unaudited · corroborated | CopyButton | [CopyButton.tsx:43](src/components/ui/CopyButton.tsx#L43) | med | A failed or unavailable clipboard write is completely unobservable — no error state, no callback, nothing logged |
| 69 | unaudited · corroborated | CopyButton | [CopyButton.tsx:60](src/components/ui/CopyButton.tsx#L60) | med | The polite live region sits **inside** the `<button>`, a role with Children Presentational: True |
| 70 | unaudited · spot-checked | CopyButton | [CopyButton.tsx:20](src/components/ui/CopyButton.tsx#L20) | low | Unmount during the in-flight write sets state post-unmount and leaks one timer for `timeout` ms |
| 71 | unaudited · spot-checked | CopyButton | [CopyButton.tsx:57](src/components/ui/CopyButton.tsx#L57) | low | `{...props}` spreads after `aria-label`/`type`, so a caller can freeze the name or submit an enclosing form |
| 72 | unaudited · spot-checked | CopyButton | [CopyButton.tsx:14](src/components/ui/CopyButton.tsx#L14) | low | `copiedLabel=""` compiles and blanks the accessible name for the whole confirmation window |
| 73 | unaudited · corroborated | Radio | [Radio.tsx:16](src/components/form/Radio.tsx#L16) | **high** | `focus:outline-none` with no replacement — keyboard focus is a **0-pixel** change in Chromium and Firefox (WCAG 2.4.7) |
| 74 | unaudited · corroborated | **Button** | [Button.tsx:33](src/components/ui/Button.tsx#L33) | med | No default `type="button"` — same defect as #41 with the widest blast radius; a Cancel button becomes the form's default submitter |
| 75 | unaudited · corroborated | Radio | [Radio.tsx:12](src/components/form/Radio.tsx#L12) | med | Never consumes `useFieldError`, so a Radio in an invalid `Field` gets no `aria-invalid`/`aria-describedby` |
| 76 | unaudited · corroborated | Checkbox | [Checkbox.tsx:12](src/components/form/Checkbox.tsx#L12) | med | Same as #75 — Radio and Checkbox are the form module's only two unwired controls |
| 77 | unaudited · corroborated | Select | [Select.tsx:28](src/components/form/Select.tsx#L28) | med | Chevron data-URI uses `fill="currentColor"`, which cannot resolve in an SVG-as-image — arrow paints black on every theme (≈1.10:1 on grimdark) |
| 78 | unaudited · corroborated | Switch | [Switch.css:58](src/components/form/Switch.css#L58) | med | Thumb-vs-track contrast is 1.08–1.16:1 unchecked in **all four** themes (WCAG 1.4.11 needs 3:1) |
| 79 | unaudited · corroborated | Switch | [Switch.tsx:64](src/components/form/Switch.tsx#L64) | med | Hidden input never receives `disabled`, so a disabled Switch still submits its value |
| 80 | unaudited · corroborated | Slider | [Slider.css:56](src/components/form/Slider.css#L56) | med | `::-moz-range-thumb` lacks `box-sizing: border-box`, so the handle is 24px in Firefox vs 20px in Chromium (same in RangeSlider) |
| 81 | unaudited · spot-checked | Input · Select · Textarea | [Input.tsx:25](src/components/form/Input.tsx#L25) | low | `focus:border-border-focus` survives the invalid swap — focused invalid control shows a focus-blue border inside an error-red ring |
| 82 | unaudited · spot-checked | Switch | [Switch.tsx:64](src/components/form/Switch.tsx#L64) | low | Unchecked submits `name=""` instead of omitting the field, so `FormData.has(name)` is always true |
| 83 | unaudited | Switch | [Switch.tsx:64](src/components/form/Switch.tsx#L64) | low | `form` is not forwarded to the hidden input; a Switch outside its `<form>` submits nothing |
| 84 | unaudited · corroborated | Switch · Slider | [Switch.css:40](src/components/form/Switch.css#L40) | low | `:focus-visible` and `[aria-invalid="true"]` are the same specificity and focus is written second — keyboard focus erases the error outline |
| 85 | unaudited | Switch | [Switch.tsx:60](src/components/form/Switch.tsx#L60) | low | `{...props}` spreads after `role`/`aria-checked`/`data-state`, so a caller can desync the announced state from the thumb |
| 86 | unaudited · spot-checked | Slider | [Slider.tsx:43](src/components/form/Slider.tsx#L43) | low | `--slider-fill` uses the raw prop while the browser step-rounds the rendered value — fill edge and thumb visibly disagree |
| 87 | unaudited | Slider | [Slider.css:43](src/components/form/Slider.css#L43) | low | Thumb border and focus-ring gap are hard-wired to `--C-SURFACE-0`, reading as a wrong-coloured halo on any other layer |
| 88 | unaudited · spot-checked | RangeSlider | [RangeSlider.css:111](src/components/form/RangeSlider.css#L111) | low | Dead `::-moz-range-track` rule and a false comment ("Firefox paints a default track") — A/B render shows identical pixels |
| 89 | unaudited | Select | [Select.tsx:23](src/components/form/Select.tsx#L23) | low | `placeholder:text-fg-muted` is dead — `::placeholder` does not match a `<select>` |
| 90 | unaudited · corroborated | **useTheme** | [use-theme.ts:79](src/hooks/use-theme.ts#L79) | **high** | `setTheme` writes `localStorage["theme"]` but **nothing ever reads it back** — the theme choice is discarded on reload, while README/AGENTS advertise "persistence" |
| 91 | unaudited · corroborated | ThemeSwitcher | [ThemeSwitcher.tsx:26](src/components/ui/ThemeSwitcher.tsx#L26) | med | `role="radiogroup"`/`role="radio"` with no roving focus — no `tabIndex`, no `onKeyDown`, though `useRovingFocus` exists and `Rating` uses it |
| 92 | unaudited · corroborated | ThemeSwitcher | [ThemeSwitcher.tsx:20](src/components/ui/ThemeSwitcher.tsx#L20) | med | Calls `useTheme()` with no options, so themes registered via `useTheme({themes})` are invisible and mis-reported |
| 93 | unaudited · spot-checked | ThemeSwitcher | [ThemeSwitcher.tsx:9](src/components/ui/ThemeSwitcher.tsx#L9) | med | `LABELS` is module-private English and `children` is omitted — option text is unreachable in any locale |
| 94 | unaudited | ThemeSwitcher | [ThemeSwitcher.css:14](src/components/ui/ThemeSwitcher.css#L14) | low | Option type is literal `0.8125rem`/`500`, not `--BodyText-2`/`--Semibold-Weight` — labels ignore theme typography |
| 95 | unaudited · corroborated | ThemeSwitcher · Collapsible | [ThemeSwitcher.css:23](src/components/ui/ThemeSwitcher.css#L23) | low | No `:focus-visible` rule; focus falls back to the UA ring and never reads `--C-BORDER-FOCUS`. `Collapsible.tsx:86`'s trigger is the only other such case |
| 96 | unaudited · corroborated | Dialog · Drawer | [Dialog.tsx:30](src/components/ui/Dialog.tsx#L30) | med | Neither listens for `close`, so `<form method="dialog">` / `ref.close()` closes the element while `open` stays `true` and it cannot reopen |
| 97 | unaudited · corroborated | Dialog | [Dialog.tsx:48](src/components/ui/Dialog.tsx#L48) | med | Scrim is a literal `backdrop:bg-black/50`, ignoring `--OVERLAY-SCRIM-COLOR` — Drawer tokenises it correctly |
| 98 | unaudited · corroborated | Drawer · FileUpload | [Drawer.css:9](src/components/ui/Drawer.css#L9) | med | `color: var(--C-TEXT-DEFAULT)` reads a token **nothing defines** → invalid at computed-value time → `color` falls back to `inherit`. Same line at `FileUpload.css:344` |
| 99 | unaudited | Dialog | [Dialog.tsx:47](src/components/ui/Dialog.tsx#L47) | low | `animate-fade-in` has no `motion-reduce:` sibling; the CSS package guards the `.fade-in` *class*, not the utility |
| 100 | unaudited | Drawer | [Drawer.tsx:16](src/components/ui/Drawer.tsx#L16) | low | `onClose` shadows the native `<dialog>` `onClose` and is destructured out, making the DOM handler reachable only via `ref` |
| 101 | unaudited · spot-checked | ToastContext | [ToastContext.tsx:80](src/components/ui/ToastContext.tsx#L80) | med | `dismissAll()`'s 300 ms sweep calls `setToasts([])` unconditionally, deleting toasts queued after it |
| 102 | unaudited · spot-checked | ToastContext | [ToastContext.tsx:85](src/components/ui/ToastContext.tsx#L85) | med | `crypto.randomUUID()` is unguarded and secure-context-only — every `toast()` throws on plain http |
| 103 | unaudited · corroborated | Toast | [Toast.tsx:41](src/components/ui/Toast.tsx#L41) | med | Live region is inserted with its message already inside it, and the always-mounted container has no `aria-live` — same class as #39/#64 |
| 104 | unaudited · corroborated | Toast | [Toast.tsx:12](src/components/ui/Toast.tsx#L12) | med | Variant severity is colour-only — no icon, label or `sr-only` word (fifth instance of the pattern) |
| 105 | unaudited · spot-checked | ToastContext | [ToastContext.tsx:57](src/components/ui/ToastContext.tsx#L57) | low | Removal timer stored under `` `${id}-remove` `` but deleted under `id` — the Map grows one dead entry per dismissed toast |
| 106 | unaudited | ToastContext | [ToastContext.tsx:80](src/components/ui/ToastContext.tsx#L80) | low | The dismissAll sweep and the overflow eviction are untracked `setTimeout`s, missed by the unmount cleanup |
| 107 | unaudited · spot-checked | ToastContext | [ToastContext.tsx:35](src/components/ui/ToastContext.tsx#L35) | low | 300 ms removal is hard-coded against themeable `--MOTION-DURATION-EXIT`; shipped `grimdark` sets 350 ms, so its toast exits are already truncated |
| 108 | unaudited | Toast | [Toast.tsx:46](src/components/ui/Toast.tsx#L46) | low | `animate-slide-in-right`/`-out-right` ignore `prefers-reduced-motion` (the package block covers only `.fade-*`) |
| 109 | unaudited · spot-checked | Toast | [Toast.tsx:56](src/components/ui/Toast.tsx#L56) | low | Dismissing drops focus to `<body>`; no focus restoration |
| 110 | unaudited | ToastContext | [ToastContext.tsx:97](src/components/ui/ToastContext.tsx#L97) | low | `setTimeout` side effect inside the `setToasts` updater — impure, double-fires under StrictMode |
| 111 | unaudited · spot-checked | ErrorBoundary | [ErrorBoundary.tsx:29](src/components/ui/ErrorBoundary.tsx#L29) | low | The fallback's hand-rolled `<button>` sets no `type`, so "Try again" also submits an enclosing form |
| 112 | unaudited · corroborated | Tooltip | [Tooltip.tsx:82](src/components/ui/Tooltip.tsx#L82) | **high** | `getReferenceProps()` is called with no args, so a child's own `aria-describedby` is **destroyed** — its hint is never announced |
| 113 | unaudited · corroborated | ContextMenu | [ContextMenu.tsx:74](src/components/ui/ContextMenu.tsx#L74) | **high** | Trigger `<div>` sets no `tabIndex`; Menu key / Shift+F10 fire `contextmenu` at `<body>` and never reach it — zero keyboard access |
| 114 | unaudited · corroborated | ContextMenu | [menu-internals.tsx:179](src/components/ui/menu-internals.tsx#L179) | **high** | `initialFocus={-1}` leaves `activeElement` on `<body>` after a right-click open, so arrows and typeahead do nothing |
| 115 | unaudited · corroborated | **Popover · HoverCard · DropdownMenu** | [Popover.tsx:154](src/components/ui/Popover.tsx#L154) | med | `asChild` clones trigger props **over** the child, dropping the child's handlers *and its `ref`*. Tooltip is the only one that merges the ref |
| 116 | unaudited · corroborated | DropdownMenu | [DropdownMenu.css:34](src/components/ui/DropdownMenu.css#L34) | med | `outline:none` leaves the hover wash as the only focus cue — measured 1.02–1.07:1 in all four themes (SC 1.4.11 wants 3:1) |
| 117 | unaudited · corroborated | Popover | [Popover.tsx:191](src/components/ui/Popover.tsx#L191) | med | `<FloatingFocusManager>` rendered with no props, so `modal` defaults **true** — a *non-modal* popover `aria-hidden`s the whole page and traps Tab |
| 118 | unaudited · corroborated | menu-internals | [menu-internals.tsx:234](src/components/ui/menu-internals.tsx#L234) | med | A `disabled` Item still runs the caller's `onClick` — only `onSelect` is guarded, and no native `disabled` is set |
| 119 | unaudited · corroborated | Popover · DropdownMenu | [Popover.tsx:164](src/components/ui/Popover.tsx#L164) | med | Trigger `<button>` has no `type`, so opening a menu inside a `<form>` also submits it (#74 again) |
| 120 | unaudited · corroborated | Tooltip | [Tooltip.css:12](src/components/ui/Tooltip.css#L12) | med | `pointer-events:none` and no `safePolygon()` — the bubble cannot be hovered, failing WCAG 1.4.13 "Hoverable" |
| 121 | unaudited · spot-checked | Tooltip | [Tooltip.tsx:86](src/components/ui/Tooltip.tsx#L86) | med | Portals to `<body>`, so a tooltip inside `Dialog`/`Drawer` paints under the modal's top layer; no portal-target prop |
| 122 | unaudited · corroborated | HoverCard | [HoverCard.tsx:96](src/components/ui/HoverCard.tsx#L96) | med | `role="dialog"` card gets no accessible name and the trigger no `aria-describedby` — announced as an unnamed dialog, contents never read |
| 123 | unaudited · spot-checked | ContextMenu | [ContextMenu.tsx:86](src/components/ui/ContextMenu.tsx#L86) | med | `setPositionReference` is never cleared, so every later open reuses the last cursor point |
| 124 | unaudited · spot-checked | ContextMenu | [ContextMenu.tsx:80](src/components/ui/ContextMenu.tsx#L80) | med | `contextmenu` is not `stopPropagation`'d — nested triggers open **both** menus, each `aria-hidden`ing the other |
| 125 | unaudited · spot-checked | menu-internals | [menu-internals.tsx:123](src/components/ui/menu-internals.tsx#L123) | med | `useListNavigation` on the reference `preventDefault`s ArrowUp/Down inside the trigger — a `<textarea>` there has its caret frozen |
| 126 | unaudited · spot-checked | menu-internals | [menu-internals.tsx:199](src/components/ui/menu-internals.tsx#L199) | med | `Item.index` is caller-assigned and unvalidated; duplicate indices make the earlier item permanently keyboard-unreachable, silently |
| 127 | unaudited · corroborated | Tooltip · HoverCard · Popover · menu-internals | [Tooltip.tsx:41](src/components/ui/Tooltip.tsx#L41) | low | `useId()` is dead in all four — `getFloatingProps()` spreads `id` last and overwrites it. Harmless today, but it implies wiring the component does not own |
| 128 | unaudited · corroborated | Popover · HoverCard · menu-internals | [Popover.tsx:183](src/components/ui/Popover.tsx#L183) | low | The 150 ms fade is an inline literal in the `.tsx` — no `--MOTION-*` token and no reduced-motion guard |
| 129 | unaudited · corroborated | Popover · HoverCard · DropdownMenu | [Popover.css:18](src/components/ui/Popover.css#L18) | low | `outline:none` on a programmatically focused panel/item removes the ring with no replacement |
| 130 | unaudited | DropdownMenu | [DropdownMenu.css:45](src/components/ui/DropdownMenu.css#L45) | low | Disabled items and labels paint `--C-TEXT-MUTED` on `--C-SURFACE-0` = 2.10–2.59:1, under AA (instance of #51) |
| 131 | unaudited · spot-checked | DropdownMenu | [menu-internals.tsx:179](src/components/ui/menu-internals.tsx#L179) | low | Tab never closes the menu; a mouse-opened menu has no tabbable item, so Tab jumps past it leaving it open with focus outside |
| 132 | unaudited | HoverCard | [HoverCard.tsx:154](src/components/ui/HoverCard.tsx#L154) | low | The default (non-`asChild`) trigger is a non-focusable `<span>` carrying `aria-expanded` — invalid on a role-less span, and `useFocus` is dead on that path |
| 133 | unaudited · corroborated | Pagination | [Pagination.css:43](src/components/ui/Pagination.css#L43) | **high** | Current page inks `--C-TEXT-ON-PRIMARY` on a `--C-ACCENT` fill; in `tech` those tokens are byte-identical → **1.00:1, invisible** |
| 134 | unaudited · corroborated | Stepper | [Stepper.tsx:114](src/components/ui/Stepper.tsx#L114) | **high** | A clickable **completed** step's button has an empty accessible name, and rest props land on the `<li>` so no `aria-label` can reach it |
| 135 | unaudited · corroborated | Accordion | [Accordion.tsx:209](src/components/ui/Accordion.tsx#L209) | med | `Trigger` spreads `...props` **after** its own handlers, so a consumer `onClick` replaces the toggle and the section never opens |
| 136 | unaudited · corroborated | Accordion · Collapsible | [Accordion.tsx:253](src/components/ui/Accordion.tsx#L253) | med | Collapsed panels are CSS-clipped only — no `hidden`/`inert` — so links inside a closed section stay Tab-reachable and in the a11y tree |
| 137 | unaudited · corroborated | Accordion | [Accordion.tsx:135](src/components/ui/Accordion.tsx#L135) | med | Trigger is not inside a heading and there is no `headingLevel` prop, so heading navigation skips every section |
| 138 | unaudited · corroborated | Breadcrumbs | [Breadcrumbs.tsx:57](src/components/ui/Breadcrumbs.tsx#L57) | med | Collapse slices head and tail independently with no overlap check — a crumb renders twice, with a duplicate React key |
| 139 | unaudited · spot-checked | Breadcrumbs | [Breadcrumbs.tsx:66](src/components/ui/Breadcrumbs.tsx#L66) | med | Ellipsis expansion is one-way and never resets, so one instance across route changes stays expanded forever |
| 140 | unaudited · spot-checked | Stepper | [Stepper.tsx:113](src/components/ui/Stepper.tsx#L113) | med | `onStepClick` is all-or-nothing: every step becomes a focusable button, including ones the consumer's handler ignores |
| 141 | unaudited · spot-checked | Pagination | [Pagination.css:45](src/components/ui/Pagination.css#L45) | low | Current page uses `pointer-events:none` rather than `disabled`, so it stays tab-focusable and Enter re-fires `onPageChange` |
| 142 | unaudited | Accordion | [Accordion.tsx:84](src/components/ui/Accordion.tsx#L84) | low | `mode` is enforced only in `toggle`, so `mode="single"` with a two-item `defaultValue` renders both open |
| 143 | unaudited | Accordion | [Accordion.tsx:130](src/components/ui/Accordion.tsx#L130) | low | `value` is interpolated raw into ids; a value containing a space silently breaks `aria-controls`/`aria-labelledby` |
| 144 | unaudited | Collapsible | [Collapsible.tsx:120](src/components/ui/Collapsible.tsx#L120) | low | `Content` sets `role="region"` with no `aria-labelledby` and the trigger has no id — an unnamed landmark. `Accordion.Content` wires both |
| 145 | unaudited · corroborated | Breadcrumbs | [Breadcrumbs.tsx:98](src/components/ui/Breadcrumbs.tsx#L98) | low | `<ol>` + `list-style:none` with no `role="list"` (as #28) — and rest props land on the `<nav>`, so the caller cannot restore it |
| 146 | unaudited | Breadcrumbs | [Breadcrumbs.tsx:82](src/components/ui/Breadcrumbs.tsx#L82) | low | The root interleaves its own separator around a caller-rendered `Breadcrumbs.Separator`, so the exported sub-part has no correct direct use |
| 147 | unaudited | Stepper | [Stepper.css:128](src/components/ui/Stepper.css#L128) | low | Active and upcoming steps differ by tint alone — same ring, numeral and weight; `aria-current="step"` covers AT only |
| 148 | unaudited · spot-checked | CodeBlock | [CodeBlock.tsx:40](src/components/ui/CodeBlock.tsx#L40) | med | The horizontally scrolling `<pre>` gets no `tabIndex`, and a `tabIndex` from the call site lands on the `overflow:hidden` root instead — no call-site fix (WCAG 2.1.1) |
| 149 | unaudited · corroborated | CodeBlock | [CodeBlock.tsx:19](src/components/ui/CodeBlock.tsx#L19) | low | `filename ?? "Code block"` uses `??`, so `filename=""` renders `aria-label=""` on a `role="region"` — a landmark with no accessible name |
| 150 | unaudited · corroborated | CodeBlock | [CodeBlock.tsx:23](src/components/ui/CodeBlock.tsx#L23) | low | Trailing-newline strip and line split are LF-only, so CRLF input renders every line with a stray `\r` in its text node |
| 151 | unaudited · corroborated | CodeBlock | [CodeBlock.tsx:23](src/components/ui/CodeBlock.tsx#L23) | low | The trailing-newline strip runs only in `showLineNumbers` mode, so the default path still renders the phantom empty final line the code comment exists to prevent |
| 152 | unaudited · corroborated | CodeBlock | [CodeBlock.tsx:37](src/components/ui/CodeBlock.tsx#L37) | low | CopyButton is handed only `value` and a class, so `copiedLabel`, `timeout` and a per-block `aria-label` are unreachable — every block's button is named "Copy" |
| 153 | unaudited · corroborated | CodeBlock | [CodeBlock.tsx:28](src/components/ui/CodeBlock.tsx#L28) | low | `role="region"` is unconditional, so every sample however short becomes a landmark, and unnamed ones all announce as "Code block" |
| 154 | unaudited · spot-checked | CodeBlock | [CodeBlock.css:89](src/components/ui/CodeBlock.css#L89) | low | The line-number gutter is a fixed `2.5ch` box with a right-aligned counter, so from line 100 the number overflows leftwards into the code's padding |
| 155 | unaudited · corroborated | CodeBlock | [CodeBlock.css:92](src/components/ui/CodeBlock.css#L92) | low | Line numbers ink `--C-TEXT-MUTED` on `--C-SURFACE-0` = 2.10–2.59:1, under the 3:1 large-text floor in all four themes (instance of #51) |
| 156 | unaudited · corroborated | EmptyState | [EmptyState.css:32](src/components/ui/EmptyState.css#L32) | med | The icon slot scales via `font-size` only and sets no `width`/`height`, so every default `lucide-react` icon renders identically at `sm`, `md` and `lg` |
| 157 | unaudited · corroborated | EmptyState | [EmptyState.css:83](src/components/ui/EmptyState.css#L83) | med | The description — the panel's only explanatory copy — inks `--C-TEXT-MUTED`, 2.10–2.59:1 on `--C-SURFACE-0`, failing AA in all four themes (instance of #51) |
| 158 | unaudited · corroborated | EmptyState | [EmptyState.css:47](src/components/ui/EmptyState.css#L47) | low | `[data-size="md"]` and `[data-size="lg"]` both set the icon `font-size: var(--H4)`, so `lg` never enlarges the icon while padding, gap and title all step up |
| 159 | unaudited · corroborated | EmptyState | [EmptyState.tsx:68](src/components/ui/EmptyState.tsx#L68) | low | `EmptyStateTitle` always renders a `<p>` with no `as` prop and no heading role, so an empty state replacing a page's main content contributes nothing to the outline |
| 160 | unaudited · spot-checked | Hero | [Hero.tsx:49](src/components/ui/Hero.tsx#L49) | med | The scrim is appended after `children` with no `pointer-events: none`, so only `Hero.Content` (z-10) escapes it — anything else placed directly in `<Hero>` renders dimmed and swallows all pointer input |
| 161 | unaudited · corroborated | Hero | [Hero.tsx:115](src/components/ui/Hero.tsx#L115) | med | `Hero.Content animate` composes `ScrollReveal > Stagger`, but the entrance class lands on the ScrollReveal ancestor and `.stagger-item` has no `animation-name` — the stagger can never fire, and the wrappers only add DOM depth |
| 162 | unaudited · corroborated | Hero | [Hero.tsx:39](src/components/ui/Hero.tsx#L39) | med | `overlay` defaults to `true` regardless of whether a `Hero.Background` exists, so a bare Hero paints a 50%-black rectangle onto the page and drops body ink from 17.74:1 to 4.46:1 |
| 163 | unaudited · corroborated | Hero | [Hero.tsx:15](src/components/ui/Hero.tsx#L15) | med | Nothing bounds the scrim against a bright image: over a white frame `--C-TEXT-ON-PRIMARY` measures 2.89:1 in `events` and 3.98:1 in the default theme |
| 164 | unaudited · spot-checked | Hero | [Hero.css:49](src/components/ui/Hero.css#L49) | low | `.hero__overlay` reads `var(--OVERLAY-SCRIM-COLOR)` with no fallback, unlike `Drawer.css`/`CommandPalette.css` — without the token layer the scrim is transparent, not 50% black |
| 165 | unaudited · spot-checked | Hero | [Hero.tsx:69](src/components/ui/Hero.tsx#L69) | low | `alt` is silently dropped when `src` is absent (no `<img>` renders at all), and `parallax` without `src` still mounts the client Parallax wrapper over an empty layer |
| 166 | unaudited · spot-checked | Hero | [Hero.css:17](src/components/ui/Hero.css#L17) | low | `hero--full` is `min-height: 100vh`, not `100dvh`, so on mobile browsers with a retracting URL bar the hero exceeds the visible viewport on first paint |
| 167 | unaudited · spot-checked | MediaCard | [MediaCard.tsx:126](src/components/ui/MediaCard.tsx#L126) | med | `MediaCard.Action` renders `absolute inset-0 z-10` with pointer events left on, so the transparent layer covers the whole card and swallows clicks on everything beneath it |
| 168 | unaudited · spot-checked | MediaCard | [MediaCard.css:47](src/components/ui/MediaCard.css#L47) | med | `.media-card__content` re-declares six `--C-TEXT-*` variables to white but sets no `color`, so unstyled children keep the ambient page ink over a dark scrim |
| 169 | unaudited · spot-checked | MediaCard | [MediaCard.tsx:93](src/components/ui/MediaCard.tsx#L93) | low | `MediaCard.Content` has no `z-index` while `Badge` and `Action` both set `z-10`, so a card that renders `Overlay` after `Content` gets its caption painted over by the scrim |
| 170 | unaudited · spot-checked | MediaCard | [MediaCard.css:11](src/components/ui/MediaCard.css#L11) | low | The hover scale/lift/elevation has no `:focus-within` counterpart, so tabbing into a control inside the card produces no card-level affordance |
| 171 | unaudited · corroborated | Swimlane | [Swimlane.tsx:36](src/components/ui/Swimlane.tsx#L36) | **high** | `{...rest}` is spread onto `ScrollReveal`, which never forwards it — every prop the type advertises past the named eight is dropped at runtime (downstream instance of #9) |
| 172 | unaudited · corroborated | Swimlane | [Swimlane.css:47](src/components/ui/Swimlane.css#L47) | med | Nothing in the component scrolls: no `overflow`, `scroll-snap-type`, `scroll-behavior` or `tabindex` anywhere in `Swimlane.css`, despite the name and a test called "renders a scrollable container" |
| 173 | unaudited · corroborated | Swimlane | [Swimlane.css:33](src/components/ui/Swimlane.css#L33) | med | The "View all" link inks `--C-ACCENT` at `--BodyText-2` with `text-decoration: none`, failing AA on every surface in `events` (2.72–2.52:1) and `grimdark` (2.96–2.55:1), where `:hover` lowers it further |
| 174 | unaudited · corroborated | Swimlane | [Swimlane.tsx:45](src/components/ui/Swimlane.tsx#L45) | med | "View all" is a hard-coded English literal with no prop to relabel it, and the anchor receives only `href` and a class — no `aria-label`, `target`, `rel` or router hook |
| 175 | unaudited · corroborated | Swimlane | [Swimlane.tsx:30](src/components/ui/Swimlane.tsx#L30) | med | Server-rendered markup carries `scroll-reveal-hidden` (`opacity: 0`) with **no opt-out prop**, so a Swimlane whose JS never runs is entirely invisible, heading included (unavoidable instance of #16) |
| 176 | unaudited · spot-checked | Swimlane | [Swimlane.tsx:40](src/components/ui/Swimlane.tsx#L40) | low | Heading level is hard-coded to `<h2>` with no `as`/`level` prop, so a lane nested under an existing h2 skips an outline level |
| 177 | unaudited · corroborated | Swimlane | [Swimlane.css:26](src/components/ui/Swimlane.css#L26) | low | Subtitle ink `--C-TEXT-MUTED` measures at most 2.59:1 against any surface token in any shipped theme (1.94:1 in `tech`) at `--BodyText-2` (instance of #51) |

> **Bookkeeping, 2026-07:** this list previously named **Button**, **Textarea** and
> **FieldError**. All three were wrong. Button carries #74 and #81; Textarea carries #81 and
> #27's exact shape; FieldError carries #27's shape. "Nothing surfaced" ages badly — a name
> here means *not yet examined closely*, not *examined and found sound*.
| 178 | unaudited · corroborated | MasonryGrid | [MasonryGrid.tsx:128](src/components/ui/MasonryGrid.tsx#L128) | **high** | `MasonryGrid.Item` spreads `{...props}` onto `ScrollReveal`, which never forwards them — with `animate` at its default every `div` prop but `className`/`ref`/`children` is dropped (downstream instance of #9, second after #171) |
| 179 | unaudited · corroborated | MasonryGrid | [MasonryGrid.tsx:91](src/components/ui/MasonryGrid.tsx#L91) | med | The root wraps each child in `<MasonryContext.Provider key={index}>`, so React reconciles by position and the caller's `key` is defeated — inserting or reordering remounts every item from that point on |
| 180 | unaudited · corroborated | MasonryGrid | [MasonryGrid.tsx:62](src/components/ui/MasonryGrid.tsx#L62) | med | `columns` is typed `number` but `MasonryGrid.css` defines rules only for 2, 3 and 4 per breakpoint, so any count above 4 silently renders one column |
| 181 | unaudited · corroborated | MasonryGrid | [MasonryGrid.tsx:51](src/components/ui/MasonryGrid.tsx#L51) | med | `buildResponsiveClasses` skips any count equal to `1`, so a breakpoint key can widen the grid but can never narrow it back to a single column |
| 182 | unaudited · spot-checked | MasonryGrid | [MasonryGrid.tsx:69](src/components/ui/MasonryGrid.tsx#L69) | low | `animate` defaults to `true`, so SSR ships every item at `opacity: 0` (instance of #16) — logged low, not med like #175, because `animate={false}` is a real opt-out |
| 183 | unaudited · spot-checked | MasonryGrid | [MasonryGrid.tsx:87](src/components/ui/MasonryGrid.tsx#L87) | low | `style={{ ...vars, ...style }}` places the caller's `style` after the `gap`-derived variable, so a `style` carrying `--masonry-gap` silently overrides the `gap` prop (measured: `gap="2rem"` renders at `0.25rem`) |
| 184 | unaudited · spot-checked | MasonryGrid | [MasonryGrid.css:8](src/components/ui/MasonryGrid.css#L8) | low | `.masonry-grid__item` sets `margin-bottom` with no `:last-child` reset, and the rule is unlayered, so a Tailwind `mb-0` on the item cannot clear the trailing gap (only `mb-0!` can) |
| 185 | unaudited · spot-checked | MasonryGrid | [MasonryGrid.test.tsx:9](src/components/ui/MasonryGrid.test.tsx#L9) | low | All nine tests pass `animate={false}`, so the default path — where #178 and #182 live — has zero coverage; it also throws under the current setup, because `test-setup.ts` stubs no `window.matchMedia` (measured: `window.matchMedia is not a function`) |
| 186 | unaudited · corroborated | Carousel | [Carousel.tsx:112](src/components/ui/Carousel.tsx#L112) | **high** | The root's ArrowLeft/ArrowRight handler has no `e.target` guard, so arrow keys pressed in a text field inside a slide are `preventDefault()`ed and scroll the rail instead of moving the caret |
| 187 | unaudited · corroborated | Carousel | [Carousel.tsx:212](src/components/ui/Carousel.tsx#L212) | med | `e.preventDefault()` on every left mousedown over the track suppresses native focus and caret placement, so a form control inside a slide cannot be focused by mouse |
| 188 | unaudited · corroborated | Carousel | [Carousel.tsx:152](src/components/ui/Carousel.tsx#L152) | med | End-of-rail arrows are hidden with `opacity: 0; pointer-events: none` only — they stay `disabled=false`, `tabIndex=0`, un-`aria-hidden` and focusable, so a keyboard user tabs onto an invisible no-op button |
| 189 | unaudited · corroborated | Carousel | [Carousel.tsx:133](src/components/ui/Carousel.tsx#L133) | med | `aria-roledescription="carousel"` and the accessible name sit on a role-less `<div>` (implicit role `generic`), where ARIA prohibits both — a conforming screen reader announces neither |
| 190 | unaudited · spot-checked | Carousel | [Carousel.tsx:99](src/components/ui/Carousel.tsx#L99) | med | `scrollPrev`/`scrollNext`/the drag fling all pass `behavior: "smooth"` explicitly, which per CSSOM View overrides the `scroll-behavior: auto` the reduced-motion block sets — so the media query cannot stop the motion a user actually triggers |
| 191 | unaudited · candidate | Carousel | [Carousel.tsx:61](src/components/ui/Carousel.tsx#L61) | low | RTL unsupported: `canScrollPrev` is `scrollLeft > 0` and the arrows are placed with physical `left: 0`/`right: 0`, so under `dir="rtl"` Previous never enables, Next never hides, and both sit on the wrong side |
| 192 | unaudited · spot-checked | Carousel | [Carousel.tsx:150](src/components/ui/Carousel.tsx#L150) | low | Arrow labels `"Previous"`/`"Next"` are hard-coded English on internal `IconButton`s with no prop to override them (instance of the hard-coded-`sr-only`-English pattern; the root and track labels are at least reachable via rest props) |
| 193 | unaudited · corroborated | Spotlight | [Spotlight.tsx:87](src/components/ui/Spotlight.tsx#L87) | med | `Spotlight.Image` passes only `src`/`alt`/`role` to the `<img>` and spreads everything else onto the wrapper `<div>`, so `loading`, `width`/`height`, `srcSet`, `sizes` and `decoding` are unreachable |
| 194 | unaudited · spot-checked | Spotlight | [Spotlight.tsx:32](src/components/ui/Spotlight.tsx#L32) | low | `animate` defaults to `true`, so every `Spotlight.Content` is server-rendered inside `scroll-reveal-hidden` while the images are not — a page whose JS never runs shows the pictures and none of the copy (instance of #16; `animate={false}` is a real opt-out, so low rather than med) |
| 195 | unaudited · corroborated | Spotlight | [Spotlight.css:58](src/components/ui/Spotlight.css#L58) | med | Every `order` rule pushes the image last and the copy first, so a row authored content-then-image is already in that order — both the automatic alternation and `reversed` silently do nothing |
| 196 | unaudited · spot-checked | Spotlight | [Spotlight.tsx:91](src/components/ui/Spotlight.tsx#L91) | med | The parallax layer is `size-full` inside an `overflow: hidden` wrapper with no overscan, and `Parallax`'s `clamp` is not forwarded, so the drift exposes a blank band the width of the translation |
| 197 | unaudited · candidate | Spotlight | [Spotlight.tsx:118](src/components/ui/Spotlight.tsx#L118) | low | The reveal direction is derived from the child index alone, so `reversed` flips the columns without flipping the animation and the copy slides in from the wrong side |
| 198 | unaudited · spot-checked | Spotlight | [Spotlight.tsx:135](src/components/ui/Spotlight.tsx#L135) | low | `Spotlight.Content`'s `ref` lands on the `ScrollReveal` wrapper when the root's `animate` is true and on the `.spotlight-content` div when it is false — the ref target is decided by a prop two components up |
| 199 | unaudited · spot-checked | Spotlight | [Spotlight.tsx:40](src/components/ui/Spotlight.tsx#L40) | low | `SpotlightItemContext.Provider` is keyed by array index, so reordering rows remounts the content subtree and replays the reveal (same shape as #179) |
| 200 | unaudited · corroborated | Spotlight | [Spotlight.css:62](src/components/ui/Spotlight.css#L62) | low | `.spotlight-item:nth-child(even) .spotlight-content { order: 1 }` is dead CSS whenever `animate` is on, because the `ScrollReveal` wrapper — not `.spotlight-content` — is the grid item (measured by SSR render) |
| 201 | unaudited · spot-checked | ProgressBar | [ProgressBar.css:56](src/components/ui/ProgressBar.css#L56) | med | `variant="gradient"` silently discards `color`: the gradient rule uses the `background` shorthand and is declared after the four colour rules at equal specificity, so it always wins |
| 202 | unaudited · corroborated | ProgressBar | [ProgressBar.tsx:64](src/components/ui/ProgressBar.tsx#L64) | med | `aria-valuenow` is the raw, unclamped `value` while the fill width is clamped, so the announcement can fall outside the announced range (same defect as #22; `ProgressRing.tsx:35` clamps, so the two siblings disagree) |
| 203 | unaudited · spot-checked | ProgressBar | [ProgressBar.tsx:91](src/components/ui/ProgressBar.tsx#L91) | med | `ProgressBar.Label` emits no `id` and the root sets no `aria-labelledby`, so a bar sitting next to a `Label` still has no accessible name — the sub-part implies a wiring it never performs |
| 204 | unaudited · corroborated | ProgressBar | [ProgressBar.tsx:57](src/components/ui/ProgressBar.tsx#L57) | med | `value={NaN}` renders a **full** bar: the clamp propagates `NaN`, the CSSOM rejects `width: NaN%`, and the fill falls back to `width: auto` — the whole track |
| 205 | unaudited · spot-checked | ProgressBar | [ProgressBar.tsx:73](src/components/ui/ProgressBar.tsx#L73) | med | Status conveyed by colour alone (WCAG 1.4.1) — `color="success\|warning\|error"` changes only the fill hue, with no data attribute, `aria-valuetext` or text alternative (instance of the recurring pattern; worse than `Meter` #21, which at least exposes `data-status`) |
| 206 | unaudited · corroborated | ProgressBar | [ProgressBar.css:10](src/components/ui/ProgressBar.css#L10) | med | The track is `--C-SURFACE-1`, measured at **1.05 / 1.03 / 1.02 / 1.07:1** against `--C-SURFACE-0` in default / `events` / `tech` / `grimdark` — the unfilled remainder is effectively invisible in every shipped theme (instance of the unmeasured-contrast pattern) |
| 207 | unaudited · spot-checked | ProgressBar | [ProgressBar.css:40](src/components/ui/ProgressBar.css#L40) | med | The default `accent` fill measures **2.63:1** on its own track in `events` and **2.77:1** in `grimdark`, under the 3:1 floor WCAG 1.4.11 sets for a meaningful graphical object — so in two of four themes neither half of the bar is distinguishable |
| 208 | unaudited · spot-checked | ProgressBar | [ProgressBar.css:60](src/components/ui/ProgressBar.css#L60) | low | The `striped` variant is static and unthemeable: no `@keyframes` for it exists anywhere in `src/` or `@batthewz/response-ui-css`, `background-size: 200% 100%` animates nothing, and the stripe colour is a hard-coded `oklch(1 0 0 / 0.15)` |
| 209 | unaudited · candidate | ProgressBar | [ProgressBar.tsx:66](src/components/ui/ProgressBar.tsx#L66) | low | `max <= 0` exposes an invalid ARIA range: the fill fraction is guarded to `0` but `aria-valuemax` is the raw `max`, so `aria-valuemin={0}` is greater than or equal to it |
| 210 | unaudited · spot-checked | ProgressRing | [ProgressRing.css:15](src/components/data-display/ProgressRing.css#L15) | med | The track strokes `--C-SURFACE-2`, measured at **1.10 / 1.08 / 1.08 / 1.16:1** against `--C-SURFACE-0` across the four shipped themes — the same invisible-track defect as #206, marginally better and still an order of magnitude under the 3:1 floor |
| 211 | unaudited · corroborated | Rating | [Rating.tsx:152](src/components/ui/Rating.tsx#L152) | **high** | With `allowHalf` every radio's `sr-only` name is `position − 0.5`, so no star is ever named `max` and the radio reporting `aria-checked="true"` is misnamed by half a star |
| 212 | unaudited · corroborated | Rating | [Rating.tsx:111](src/components/ui/Rating.tsx#L111) | med | `valueFromClick` reads `e.clientX`, which is `0` for a keyboard-activated click, so under `allowHalf` `Enter`/`Space` can only ever commit `position − 0.5` — no star can be *activated* to its whole value |
| 213 | unaudited · corroborated | Rating | [Rating.tsx:141](src/components/ui/Rating.tsx#L141) | med | Arrow keys drive roving focus and the value as two unsynchronised state machines: focus loops while the value clamps, and under `allowHalf` focus moves a whole star per `0.5` of value |
| 214 | unaudited · corroborated | Rating | [Rating.tsx:145](src/components/ui/Rating.tsx#L145) | med | Clicking a star never updates the roving index, so the next arrow key teleports focus to star 2 whichever star was clicked, and Tab always enters the group on star 1 regardless of the value |
| 215 | unaudited · corroborated | Rating | [Rating.css:9](src/components/ui/Rating.css#L9) | med | Star colour `--C-STATUS-WARNING` misses the WCAG 1.4.11 3:1 floor on the library's own light-theme surfaces (3.19–2.57:1 default, 3.09–2.61:1 `events`), and the 0.45-opacity empty star composites to 1.52–1.65:1 on every light surface and 2.67–2.86:1 in `grimdark` |
| 216 | unaudited · corroborated | Rating | [Rating.tsx:80](src/components/ui/Rating.tsx#L80) | med | The `readOnly` branch overwrites the caller's **required** `aria-label` with a generated `"{value} out of {max} stars"`, so the mandatory prop is silently discarded and the subject of the rating is lost |
| 217 | unaudited · spot-checked | Rating | [Rating.tsx:100](src/components/ui/Rating.tsx#L100) | low | `Home`/`End` move roving focus but fire no `onValueChange`, unlike every other key the group handles |
| 218 | unaudited · spot-checked | Rating | [Rating.tsx:152](src/components/ui/Rating.tsx#L152) | low | Hard-coded English `"stars"` in both the `sr-only` name and the `readOnly` label, unreachable from props; star 1 also announces `"1 stars"` (instance of the pattern named for #39/#64) |
| 219 | unaudited · spot-checked | Rating | [Rating.tsx:79](src/components/ui/Rating.tsx#L79) | low | Nothing range-checks or rounds an incoming `value`: `value={9} max={5}` announces `"9 out of 5 stars"`, and `value={4.3}` draws 4 stars while announcing 4.3 |
| 220 | unaudited · spot-checked | Rating | [Rating.tsx:76](src/components/ui/Rating.tsx#L76) | low | `readOnly` returns before `disabled` is read, so `disabled` silently no-ops in that mode — no `aria-disabled`, no dimming |
| 221 | unaudited · corroborated | SearchInput | [SearchInput.tsx:66](src/components/form/SearchInput.tsx#L66) | med | `disabled`/`readOnly` reach the `<input>` only — the clear button stays enabled and still wipes the value |
| 222 | unaudited · corroborated | SearchInput | [SearchInput.tsx:55](src/components/form/SearchInput.tsx#L55) | med | Hard-coded `aria-label="Search"` outranks an associated `<label for>`, so a visible Label is silently ignored (pattern of #39/#64) |
| 223 | unaudited · corroborated | SearchInput | [SearchInput.tsx:66](src/components/form/SearchInput.tsx#L66) | med | The clear button unmounts on activation, dropping focus to `<body>` (WCAG 2.4.3) |
| 224 | unaudited · corroborated | SearchInput | [SearchInput.tsx:37](src/components/form/SearchInput.tsx#L37) | med | The Escape handler calls neither `preventDefault()` nor `stopPropagation()`, so one press clears the field *and* closes the surrounding overlay |
| 225 | unaudited · corroborated | SearchInput | [SearchInput.css:56](src/components/form/SearchInput.css#L56) | med | Clear-button glyph at rest is `--C-TEXT-MUTED` on `--C-SURFACE-0` — 2.10–2.59:1 in all four themes, under the WCAG 1.4.11 3:1 floor (pattern of #51) |
| 226 | unaudited · spot-checked | SearchInput | [SearchInput.tsx:38](src/components/form/SearchInput.tsx#L38) | low | Escape clears unconditionally — an already-empty field still fires `onChange("")` and `onClear()` |
| 227 | unaudited · spot-checked | SearchInput | [SearchInput.css:21](src/components/form/SearchInput.css#L21) | low | `size="sm"` overrides only `font-size`; `py-r5` and the `text-body-2` line-height are untouched, so `sm` and `md` are the same height |
| 228 | unaudited · spot-checked | SearchInput | [SearchInput.tsx:45](src/components/form/SearchInput.tsx#L45) | low | `className` is retargeted to the wrapper `<div>` while `style`/`id`/`data-*` land on the `<input>`, though the prop type advertises `<input>` props for both |
| 229 | unaudited · spot-checked | SearchInput | [SearchInput.tsx:14](src/components/form/SearchInput.tsx#L14) | low | `defaultValue` survives the `Omit`, so it typechecks alongside the required `value` and then trips React's controlled/uncontrolled warning |
| 230 | unaudited · spot-checked | SearchInput | [SearchInput.tsx:54](src/components/form/SearchInput.tsx#L54) | low | Explicit `role="searchbox"` duplicates the implicit role of `<input type="search">` |
| 231 | unaudited · corroborated | NumberInput | [NumberInput.tsx:108](src/components/form/NumberInput.tsx#L108) | med | Stepper buttons and Arrow keys discard uncommitted typed text, stepping from the last committed value instead |
| 232 | unaudited · corroborated | NumberInput | [NumberInput.tsx:83](src/components/form/NumberInput.tsx#L83) | med | A controlled `value` is not enforced: the box displays a value the parent refused, permanently, while `aria-valuenow` reports the prop |
| 233 | unaudited · corroborated | NumberInput | [NumberInput.tsx:115](src/components/form/NumberInput.tsx#L115) | med | `readOnly` blocks typing but not the steppers or Arrow keys, and no `aria-readonly` is set |
| 234 | unaudited · spot-checked | NumberInput | [NumberInput.tsx:149](src/components/form/NumberInput.tsx#L149) | low | Reserved right padding (`pr-r2` = 20px / 32px) is narrower than the stepper column (14px chevron + 2× `px-r5` = 30px / 38px), so long values render under the chevrons |
| 235 | unaudited · corroborated | NumberInput | [NumberInput.tsx:43](src/components/form/NumberInput.tsx#L43) | low | `parseDraft` uses `Number()`, so `0x1f` commits as `31` and `Infinity` commits as `Infinity` into the value and `aria-valuenow` |
| 236 | unaudited · corroborated | NumberInput | [NumberInput.tsx:109](src/components/form/NumberInput.tsx#L109) | low | Stepping up from an empty field bases on `min` and *then* adds `step`, so the first press lands on `min + step`, never on `min` |
| 237 | unaudited · corroborated | NumberInput | [NumberInput.tsx:113](src/components/form/NumberInput.tsx#L113) | low | `stepBy` emits unconditionally, so at a clamped bound every further press re-fires `onValueChange` with an unchanged value |
| 238 | unaudited · corroborated | OTPInput | [OTPInput.tsx:91](src/components/form/OTPInput.tsx#L91) | **high** | `onComplete` latches on a boolean ref and never re-fires when an already-complete code is edited, so it reports a stale value forever |
| 239 | unaudited · corroborated | OTPInput | [OTPInput.tsx:111](src/components/form/OTPInput.tsx#L111) | med | A multi-character value arriving in one box keeps only the LAST character, defeating the `one-time-code` autofill the component advertises |
| 240 | unaudited · corroborated | OTPInput | [OTPInput.tsx:110](src/components/form/OTPInput.tsx#L110) | med | Delete and cut are silently ignored — only Backspace can clear a box |
| 241 | unaudited · spot-checked | **library-wide** | [Input.tsx:22](src/components/form/Input.tsx#L22) | med | Form-control boundary `--C-BORDER-STRONG` on the `--C-SURFACE-0` fill measures **1.41–1.79:1** in all four themes, under the WCAG 1.4.11 3:1 floor. Affects Input, Textarea, Select, NumberInput, SearchInput, TagInput, OTPInput (pattern of #51) |
| 242 | unaudited · spot-checked | **library-wide** | [Input.tsx:25](src/components/form/Input.tsx#L25) | med | The replacement focus ring `--C-BORDER-FOCUS` on `--C-SURFACE-0` is **2.72:1** (`events`) and **2.96:1** (`grimdark`) while `focus:outline-none` removes the UA fallback. Same recipe in Input, Textarea, Select, NumberInput, SearchInput, OTPInput |
| 243 | unaudited · corroborated | OTPInput | [OTPInput.tsx:179](src/components/form/OTPInput.tsx#L179) | low | Each box is hard-coded ``aria-label={`Digit ${i+1}`}`` — unreachable, unlocalizable, and factually wrong in `mode="alphanumeric"` (pattern of #39/#64) |
| 244 | unaudited · corroborated | OTPInput | [OTPInput.tsx:78](src/components/form/OTPInput.tsx#L78) | low | Empty slots serialise into the public string as spaces, so `value.length === length` can be true with boxes still empty — a false completeness test for callers |
| 245 | unaudited · corroborated | TagInput | [TagInput.tsx:204](src/components/form/TagInput.tsx#L204) | **high** | The rest-spread is applied after the input's own `onChange`, so spreading `form.field()` — the binding AGENTS.md and README.md both advertise — replaces the internal handler and crashes the component |
| 246 | unaudited · corroborated | TagInput | [TagInput.tsx:192](src/components/form/TagInput.tsx#L192) | med | `name` passes through to the inner input whose value is the in-progress draft, so a native form submits the draft rather than the tags |
| 247 | unaudited · corroborated | TagInput | [TagInput.tsx:93](src/components/form/TagInput.tsx#L93) | med | `commitDraft` clears the draft on every rejection path that produces no message, so the `maxTags` cap, a duplicate and `validateTag → false` all destroy the user's typing silently |
| 248 | unaudited · corroborated | TagInput | [TagInput.tsx:104](src/components/form/TagInput.tsx#L104) | med | `handleChange` commits only the segment before the first delimiter and then blanks the draft, discarding everything after it |
| 249 | unaudited · corroborated | TagInput | [TagInput.tsx:137](src/components/form/TagInput.tsx#L137) | med | The paste path discards any pending draft and reads only the accept/reject answer from `evaluate`, so `validateTag` string messages are swallowed |
| 250 | unaudited · spot-checked | TagInput | [TagInput.tsx:102](src/components/form/TagInput.tsx#L102) | med | A `delimiter` carrying `g` or `y` misfires: `delimiter.test()` mutates the caller's own `RegExp`, so `/;/g` commits every *other* entry and `/;/y` commits none |
| 251 | unaudited · corroborated | TagInput | [TagInput.tsx:183](src/components/form/TagInput.tsx#L183) | med | The chip remove button's X glyph inks `--C-TEXT-MUTED` on `--C-SURFACE-2` — 1.94–2.31:1, under the WCAG 1.4.11 3:1 floor in all four themes (pattern of #51) |
| 252 | unaudited · corroborated | TagInput | [TagInput.tsx:172](src/components/form/TagInput.tsx#L172) | med | Adding or removing a tag is never announced and the chips carry no list semantics, so screen-reader users get no confirmation for Enter, Backspace, paste or the remove button |
| 253 | unaudited · corroborated | TagInput | [TagInput.tsx:207](src/components/form/TagInput.tsx#L207) | low | The validation message `<p>` has no `id` and is never referenced by `aria-describedby`, which only ever points at a surrounding Field's error element |
| 254 | unaudited · corroborated | TagInput | [TagInput.tsx:174](src/components/form/TagInput.tsx#L174) | low | Chips are keyed by the tag string and a controlled `value` is not de-duplicated, so `value={["react","react"]}` logs React's duplicate-key error |
| 255 | unaudited · corroborated | TagInput | [TagInput.tsx:160](src/components/form/TagInput.tsx#L160) | low | The bordered wrapper carries the `focus-within` ring but no click handler, so clicking its padding does not focus the text input |
| 256 | unaudited · corroborated | form-store | [form-store.ts:362](src/components/form/form-store.ts#L362) | **high** | Array mutations rewrite values but never re-key the error/touched maps, so a validation message — and `aria-invalid` — stays attached to the old index after a remove or a reorder |
| 257 | unaudited · corroborated | Repeater | [Repeater.tsx:134](src/components/form/Repeater.tsx#L134) | med | Clicking a row's Remove button unmounts the button, dropping keyboard focus to `document.body` with no announcement |
| 258 | unaudited · corroborated | Repeater | [Repeater.tsx:75](src/components/form/Repeater.tsx#L75) | med | The `disabled` prop reaches only Repeater's own Add/Remove/Move buttons; row fields stay editable and `RepeaterItem` exposes no `disabled` for custom row controls |
| 259 | unaudited · corroborated | Repeater | [Repeater.tsx:114](src/components/form/Repeater.tsx#L114) | med | Per-row control `aria-label`s are hard-coded English literals with no prop to change them, so every row's buttons share one accessible name (pattern of #39/#64) |
| 260 | unaudited · corroborated | Repeater | [Repeater.tsx:33](src/components/form/Repeater.tsx#L33) | low | `name: string` and `defaultItem: () => unknown` are untyped against the form's values, so a mistyped path compiles and silently writes a second array into the submitted values |
| 261 | unaudited · spot-checked | Repeater | [Repeater.tsx:56](src/components/form/Repeater.tsx#L56) | low | The source JSDoc `@example` wires `Field`/`FieldError` with no surrounding `FormProvider`, so the `FieldError` it advertises can never render |
| 262 | unaudited · corroborated | Repeater | [Repeater.tsx:84](src/components/form/Repeater.tsx#L84) | low | Rows are plain `<div>`s with no list/group semantics and no live region, so adding or removing a row is never announced |
| 263 | unaudited · corroborated | MultiSelect | [MultiSelect.tsx:194](src/components/form/MultiSelect.tsx#L194) | med | The rest-spread lands on the outer wrapper `<div>`, so `id` and `aria-labelledby` never reach the combobox input and `aria-label` is the only naming path |
| 264 | unaudited · corroborated | MultiSelect | [MultiSelect.css:163](src/components/form/MultiSelect.css#L163) | med | The keyboard-highlighted option is marked only by a `--C-SURFACE-1` background — **1.05 / 1.03 / 1.02 / 1.07:1** against the listbox fill (instance of #206/#51) |
| 265 | unaudited · corroborated | MultiSelect | [MultiSelect.tsx:209](src/components/form/MultiSelect.tsx#L209) | med | The listbox can never be closed from the control or its chevron, and nothing dismisses it on focus-out |
| 266 | unaudited · corroborated | MultiSelect | [MultiSelect.tsx:171](src/components/form/MultiSelect.tsx#L171) | med | `Enter` with the list open but no option highlighted falls through and submits the surrounding form |
| 267 | unaudited · corroborated | MultiSelect | [MultiSelect.tsx:225](src/components/form/MultiSelect.tsx#L225) | med | Clicking a chip's remove button drops focus to `<body>` — the button unmounts itself and nothing restores focus (pattern of #257) |
| 268 | unaudited · corroborated | MultiSelect | [MultiSelect.css:74](src/components/form/MultiSelect.css#L74) | low | The chip's remove glyph inks `--C-TEXT-MUTED` on `--C-SURFACE-2` — 2.31 / 2.27 / 1.94 / 2.23:1, under the 3:1 graphical floor (same defect as #251, different component) |
| 269 | unaudited · corroborated | MultiSelect | [MultiSelect.css:112](src/components/form/MultiSelect.css#L112) | low | Placeholder, the "No options" row and disabled option labels all ink `--C-TEXT-MUTED` on `--C-SURFACE-0` — 2.54 / 2.45 / 2.10 / 2.59:1, below AA (instance of #51) |
| 270 | unaudited · corroborated | MultiSelect | [MultiSelect.tsx:240](src/components/form/MultiSelect.tsx#L240) | low | `aria-controls` always names the listbox id, but the listbox only exists while open, so a closed combobox points at nothing (measured `getElementById` → null) |
| 271 | unaudited · corroborated | MultiSelect | [MultiSelect.tsx:241](src/components/form/MultiSelect.tsx#L241) | low | With `searchable={false}` the input is `readOnly` and filters nothing, yet still advertises `aria-autocomplete="list"` |
| 272 | unaudited · corroborated | MultiSelect | [MultiSelect.tsx:217](src/components/form/MultiSelect.tsx#L217) | low | Chips are keyed by value and a controlled `value` is never de-duplicated, so `value={["react","react"]}` renders two chips and logs React's duplicate-key error (same as #254) |
| 273 | unaudited · corroborated | MultiSelect | [MultiSelect.css:59](src/components/form/MultiSelect.css#L59) | low | Chip label and selected-option weights are a literal `font-weight: 600` rather than `--Semibold-Weight` (500 below 40rem, 600 above), so they are a step heavier than the rest of the system on mobile |
| 274 | unaudited · spot-checked | MultiSelect | [MultiSelect.tsx:197](src/components/form/MultiSelect.tsx#L197) | low | Stale source comment: it claims the whole control is the anchor "so the menu spans its width", but `useFloating` adds only `offset`/`flip`/`shift` and `.multiselect-content` sets `min-width` alone — the panel is content-sized |
| 275 | unaudited · corroborated | Combobox | [Combobox.css:82](src/components/form/Combobox.css#L82) | **high** | The active-option cue is `--C-SURFACE-1` on `--C-SURFACE-0` (**1.02–1.07:1**, all four themes) and virtual focus means no option ever takes a focus ring — keyboard navigation has no perceptible indicator at all |
| 276 | unaudited · corroborated | Combobox | [Combobox.tsx:296](src/components/form/Combobox.tsx#L296) | med | The chevron toggle can never close the popup; every click while open emits a spurious `onOpenChange(false)` then `onOpenChange(true)` |
| 277 | unaudited · corroborated | Combobox | [Combobox.tsx:328](src/components/form/Combobox.tsx#L328) | med | `loading` swaps children for a Spinner but the item count is taken before the swap, so `aria-activedescendant` points at an option id that is not in the document |
| 278 | unaudited · corroborated | Combobox | [Combobox.tsx:408](src/components/form/Combobox.tsx#L408) | med | Selecting an option with the mouse leaves DOM focus on `<body>` instead of returning it to the input (pattern of #257) |
| 279 | unaudited · corroborated | Combobox | [Combobox.tsx:146](src/components/form/Combobox.tsx#L146) | med | No focus-out dismissal: tabbing away leaves the portalled listbox mounted with `aria-expanded="true"` on an unfocused combobox |
| 280 | unaudited · corroborated | Combobox | [Combobox.tsx:265](src/components/form/Combobox.tsx#L265) | low | `aria-controls` is set unconditionally but `Content` returns `null` while closed, so the IDREF dangles whenever the popup is shut |
| 281 | unaudited · corroborated | Combobox | [Combobox.tsx:201](src/components/form/Combobox.tsx#L201) | low | The input label is `node.textContent` with no `label` escape hatch, so a multi-node option writes concatenated text into the field (measured `"Ada LovelaceAnalytical Engine"`) |
| 282 | unaudited · corroborated | Combobox | [Combobox.tsx:406](src/components/form/Combobox.tsx#L406) | low | `Combobox.Item` spreads `getItemProps` (caller props last) after its generated `id`, so a consumer `id` silently replaces the option id `aria-activedescendant` points at |
| 283 | unaudited · corroborated | Combobox | [Combobox.tsx:294](src/components/form/Combobox.tsx#L294) | low | The chevron carries a hard-coded English `"Open"`/`"Close"` `aria-label` callers cannot reach, and no `aria-expanded`/`aria-controls` of its own (pattern of #39/#64) |
| 284 | unaudited · corroborated | Combobox | [Combobox.css:15](src/components/form/Combobox.css#L15) | low | `Combobox.css` re-implements the shared form-control border/focus recipe by hand (`--C-BORDER-STRONG` 1.41–1.79:1, `--C-BORDER-FOCUS` 2.72/2.96:1, `outline: none`), so the single fix for #241/#242 will not reach it |
| 285 | unaudited · corroborated | ColorPicker | [ColorPicker.tsx:32](src/components/form/ColorPicker.tsx#L32) | **high** | `<ColorPicker {...form.field<string>("name")} />` — the binding the library advertises — typechecks clean and renders a permanently inert control, because the closed prop type honours `value`/`disabled` and drops everything else |
| 286 | unaudited · corroborated | ColorPicker | [ColorPicker.tsx:65](src/components/form/ColorPicker.tsx#L65) | med | The trigger's hard-coded `aria-label` replaces the visible hex, so the current colour is never in the accessible name and is unreadable to AT |
| 287 | unaudited · corroborated | ColorPicker | [ColorPicker.tsx:220](src/components/form/ColorPicker.tsx#L220) | med | The saturation/brightness square is `role="slider"` with no `aria-valuenow`, `aria-valuemin` or `aria-valuemax`, and models two axes as one slider |
| 288 | unaudited · corroborated | ColorPicker | [ColorPicker.tsx:284](src/components/form/ColorPicker.tsx#L284) | med | A preset the hex parser rejects still renders as a clickable swatch and commits nothing (measured: zero `onValueChange` calls for `"rebeccapurple"`) |
| 289 | unaudited · corroborated | ColorPicker | [ColorPicker.tsx:103](src/components/form/ColorPicker.tsx#L103) | med | A controlled picker whose parent ignores a change leaves the panel permanently out of sync with the trigger — the re-seed effect is keyed on a `hex` that never changed |
| 290 | unaudited · corroborated | ColorPicker | [ColorPicker.tsx:158](src/components/form/ColorPicker.tsx#L158) | low | `disabled` set while the panel is open leaves the square's arrow keys and the preset buttons live (measured: both still commit) |
| 291 | unaudited · spot-checked | ColorPicker | [ColorPicker.css:23](src/components/form/ColorPicker.css#L23) | low | `.colorpicker-trigger:focus-visible` (0,2,0) outranks `.colorpicker-trigger--error` (0,1,0), so keyboard focus erases the invalid border (pattern of #84) |
| 292 | unaudited · corroborated | ColorPicker | [ColorPicker.tsx:210](src/components/form/ColorPicker.tsx#L210) | low | The floating panel is a `role="dialog"` with no accessible name (measured `aria-label`/`aria-labelledby` both null) and no prop to supply one |
| 293 | unaudited · corroborated | ColorPicker | [ColorPicker.css:9](src/components/form/ColorPicker.css#L9) | low | The trigger and hex field re-implement the shared text-control border/focus recipe in hand-written CSS, so the single fix for #241/#242 will not reach ColorPicker either |
| 294 | unaudited · corroborated | ColorPicker | [ColorPicker.css:45](src/components/form/ColorPicker.css#L45) | low | Stale comment: `.colorpicker-swatch` claims a checkerboard backdrop "for transparency", but no checkerboard is drawn and 8-digit hex is rejected by the parser |
| 295 | unaudited · corroborated | RangeSlider | [RangeSlider.tsx:129](src/components/form/RangeSlider.tsx#L129) | med | `aria-invalid` is written on the wrapper `div`; neither `<input type="range">` carries it, so the focused control never reports itself invalid — status by colour alone (WCAG 1.4.1) |
| 296 | unaudited · corroborated | RangeSlider | [RangeSlider.tsx:76](src/components/form/RangeSlider.tsx#L76) | med | The component reads only `aria-invalid` off `useFieldErrorProps` and discards the `aria-describedby`, so a `Field`'s error text is referenced by nothing anywhere in the tree |
| 297 | unaudited · corroborated | RangeSlider | [RangeSlider.tsx:120](src/components/form/RangeSlider.tsx#L120) | med | When both thumbs hold the same value one is unreachable by pointer, and the static midpoint z-index heuristic only changes which one is buried |
| 298 | unaudited · corroborated | RangeSlider | [RangeSlider.tsx:34](src/components/form/RangeSlider.tsx#L34) | med | The props type is `ComponentPropsWithRef<"div">` and rest lands on the wrapper, so no per-thumb ARIA is reachable — `aria-valuetext` cannot fix a non-percentage announcement |
| 299 | unaudited · corroborated | RangeSlider | [RangeSlider.tsx:15](src/components/form/RangeSlider.tsx#L15) | low | `RangeSliderValue`'s exported docblock claims the pair is "always kept ordered (low <= high) by the component", but an incoming `value`/`defaultValue` is never ordered: `value={[80,20]}` renders as given and the fill disappears |
| 300 | unaudited · corroborated | RangeSlider | [RangeSlider.tsx:59](src/components/form/RangeSlider.tsx#L59) | low | `minDistance` is enforced only on changes the component computes: `defaultValue={[50,50]}` with `minDistance={10}` renders both thumbs on 50 |
| 301 | unaudited · candidate | RangeSlider | [RangeSlider.css:63](src/components/form/RangeSlider.css#L63) | low | The only `outline` reset is scoped to `[aria-invalid="true"]`, so the invalid state loses the UA focus outline the valid state keeps — inverted from `Slider.css`. Read off the cascade, not rendered; whether a visible UA outline exists at all is engine-dependent |
| 302 | unaudited · corroborated | Wizard | [Wizard.tsx:167](src/components/ui/Wizard.tsx#L167) | **high** | Step content is rendered without a key, so React reconciles one step's content against the next and DOM/component state bleeds across steps |
| 303 | unaudited · corroborated | Wizard | [Wizard.tsx:77](src/components/ui/Wizard.tsx#L77) | med | `next()` fires `onComplete` unconditionally after calling the setter, so a controlled parent cannot refuse completion and Finish can re-fire it indefinitely |
| 304 | unaudited · corroborated | Wizard | [Wizard.tsx:156](src/components/ui/Wizard.tsx#L156) | med | No rest spread on the root: `aria-*`/`data-*` typecheck (TS exempts hyphenated JSX attributes) and are silently dropped, so the flow cannot be named or targeted |
| 305 | unaudited · corroborated | Wizard | [Wizard.tsx:167](src/components/ui/Wizard.tsx#L167) | med | The step panel has no role, no `aria-live`, no `id` and no focus management, so advancing a step is silent for assistive tech |
| 306 | unaudited · corroborated | Wizard | [Wizard.tsx:148](src/components/ui/Wizard.tsx#L148) | low | `allowBackNavigation` makes every step marker a focusable button via `Stepper`, but Wizard's handler ignores all forward ones, leaving dead tab stops (completed ones are also unnamed — #134) |
| 307 | unaudited · corroborated | Wizard | [Wizard.tsx:151](src/components/ui/Wizard.tsx#L151) | low | In the completed state every marker satisfies `index < activeStep`, including the last, so clicking it un-completes the flow and re-enables Finish (measured) |
| 308 | unaudited · spot-checked | Wizard | [Wizard.tsx:66](src/components/ui/Wizard.tsx#L66) | low | `goTo` calls the setter even when the clamped index equals the current one, and `useControllableState` notifies unconditionally, so `goTo(0)` at index 0 emits `onStepChange(0)` (same shape as #237) |
| 309 | unaudited · spot-checked | Wizard | [Wizard.tsx:153](src/components/ui/Wizard.tsx#L153) | low | The `onStepClick` `useMemo` depends on `wizard`, a fresh object literal every render, so it never memoizes |


**Clean (no findings):** Stack, FormActions, Tabs, Divider, Grid, Center, Container, Row, Spacer,
Label. (Not proof of correctness — just nothing surfaced.)

> **Batch G (2026-07-25)** added no names to that list and removed none: CodeBlock, EmptyState,
> Hero, MediaCard and Swimlane each carry findings below (#148–#177).
>
> **Batch H (2026-07-25)** added none and **removed `ProgressRing`**. Documenting `ProgressBar`
> meant measuring its track, and the same measurement applied to `ProgressRing`'s track — which
> is the same defect one step less bad (#210). ProgressRing had sat on this list since batch A
> purely because nobody had measured it. MasonryGrid, Carousel, Spotlight, ProgressBar and
> Rating all carry findings below (#178–#220).
>
> **Batch I (2026-07-25)** added none and removed none. SearchInput, NumberInput, OTPInput,
> TagInput and Repeater all carry findings below (#221–#262), and documenting them also put the
> first measured numbers on two *shared* form-control token pairs (#241, #242) and on
> `form-store`'s array mutations (#256). `Label` stays on the list: batch I refuted a claim in
> `label.md` (association is necessary but not sufficient for an accessible name), but that is a
> defect in two *other* components' markup, not in `Label`, which is a faithful passthrough.
>
> **Batch J (2026-07-25)** added none and removed none. MultiSelect, Combobox, ColorPicker,
> RangeSlider and Wizard all carry findings below (#263–#309), three of them high. The batch also
> **narrowed one previously-logged claim**: `multi-select.md`'s first draft said `name` was typed
> and then dropped on the wrapper. It is not — `name` is absent from `HTMLAttributes<HTMLDivElement>`,
> so `<MultiSelect name="…">` is a compile error (verified with `tsc`: *Property 'name' does not
> exist*). Only `id` and `aria-labelledby` compile and land on the wrapper. #263 is scoped to those
> two; the page was corrected. This is the mirror of #245/#246 and worth keeping straight: a `div`
> rest-spread hides *fewer* props than an `input` one, because the `div` prop set is smaller.

## Details — high & medium

Low-severity rows are self-contained above (summary + `file:line`). Fuller notes for the
high/medium findings follow.

### 9 · ScrollReveal — `as` props typed but not forwarded (high)

`ScrollRevealProps<T>` extends `ComponentPropsWithRef<T>`, so the public type accepts every
prop of the rendered element. The implementation destructures only its own named props and
renders `<Tag>` **without** `{...rest}`, so `id`, `data-*`, `aria-*`, and event handlers a
caller passes are silently dropped. The types promise a contract the runtime doesn't honour.
**Fix:** capture and spread `...rest` onto `<Tag>` (same fix as Stagger #10).

### 10 · Stagger — rest props dropped at runtime (high)

`Stagger` destructures `{ staggerDelay, className, children, as: Tag }` with no `...rest` and
renders `<Tag className=…>` — anything else the type advertises is dropped. Confirmed by
inspection. **Fix:** `...rest` → `<Tag {...rest}>`.

### 11 · RequireAuth — redirect re-fires every render (med)

`DefaultUnauthenticatedRedirect` navigates via `ref={(el) => el?.click()}` on a hidden
`<Link>`. The inline arrow is a new identity each render, so React detaches (null) then
re-attaches (node) it every commit, re-running `.click()` while `status` stays
`unauthenticated`. Masked by the default plain `<a>` (the hard nav tears the tree down), but
with a client-router adapter Link it fires navigation repeatedly → router churn/loops.
**Fix:** fire once from an effect with a ref guard, or use a real router `<Navigate>` via
`unauthenticatedFallback`.

### 13 · AnimatePresence — caller `onAnimationEnd` disables unmount (med)

The prop type omits only `children`, so callers may pass `onAnimationEnd`. In the JSX
`{...rest}` is spread **after** `onAnimationEnd={handleAnimationEnd}`, so a caller handler
wins and the internal one is dropped — `setMounted(false)` never runs and the element stays
in the DOM permanently after `show` flips false. **Fix:** merge handlers (call
`rest.onAnimationEnd?.(e)` then internal), or omit it from accepted props.

### 14 · AnimatePresence — descendant `animationend` unmounts mid-exit (med)

`handleAnimationEnd` checks only `phase === "exit" && !show`, never `e.target ===
e.currentTarget`. Because `animationend` bubbles, any child animating during the exit window
bubbles up, satisfies the condition, and unmounts the whole subtree before the wrapper's own
fade-out finishes. **Fix:** guard on `e.currentTarget === e.target` and/or match the
animation name.

### 16 · ScrollReveal — content hidden without IntersectionObserver / JS (med)

The initial state is `opacity:0` (`scroll-reveal-hidden`), cleared only when the observer
fires. If `IntersectionObserver` is unavailable, JS never runs, or SSR output isn't hydrated,
the element stays invisible forever — content loss, not just a missing animation. **Fix:** a
no-JS/no-IO fallback that reveals (e.g. `@media (scripting: none)` or a hydration-safe
default-visible + animate-in).

### 17 · Stagger — `staggerDelay` may no-op (med)

`staggerDelay` sets an inline `--stagger-delay` custom property. Whether it affects timing
depends on the stagger CSS actually reading `var(--stagger-delay)` — the token layer defines
both `--stagger-delay` and `--motion-stagger-delay`, so a name mismatch would make the prop
inert. **Audit:** confirm the `.stagger-*` rules consume `--stagger-delay`.

### 18 · ViewTransition — async navigation gets no transition (med)

`useViewTransition` calls `navigate` inside `startViewTransition` but discards its return
value and never awaits it. For an async router (navigation returns a promise) the transition
snapshot is taken and released before navigation completes, so there's no transition. **Fix:**
`await` the navigate result inside the transition callback.

### 19 · ViewTransition — ignores `prefers-reduced-motion` (med)

Neither `ViewTransition` nor `useViewTransition` checks `prefers-reduced-motion`; a
view-transition animation plays regardless. **Fix:** gate `startViewTransition` on the media
query, falling back to a plain synchronous navigate/update.

### 21 · Meter — threshold status by colour alone (med)

Warning/critical thresholds change only the fill tint; nothing textual or programmatic marks
the status, so greyscale/colour-blind and screen-reader users can't perceive it (WCAG 1.4.1).
**Fix:** a visually-hidden status label or an `aria` annotation tied to the threshold.

### 23 · Field — dangling `aria-describedby` (med)

A control marked invalid (via context) emits `aria-describedby` pointing at the FieldError's
id, but when no error is actually rendered the referenced element doesn't exist — a dangling
reference some screen readers announce as "described by (nothing)". **Fix:** only emit the
`aria-describedby` id when the error node is present.

### 25 · Checkbox — focus ring offset hard-codes white (med)

`focus:ring-offset-2` with no `ring-offset-color` uses Tailwind's default `#fff`, so on a
dark theme the focus ring sits on a white halo instead of the surface. Not theme-paired.
**Fix:** set `ring-offset-color` to a surface token (e.g. `ring-offset-surface-1`).

### 34 · ErrorBoundary — raw Tailwind defaults in the fallback (med)

The error fallback is styled with `text-2xl font-bold mb-2`, `mb-6`, and `px-4 py-2` —
Tailwind's built-in type and spacing scales, not the design system's. ETHOS is explicit that
a raw default like `text-sm`/`p-4` is exactly what tokens exist to replace. Consequence: the
one screen a user sees when the app has already failed is the one screen that ignores the
theme — it won't re-scale with `--BodyText-*`/`--H*` or re-space with `--R-SIZE-*`.
**Fix:** `text-h4` (or similar) and the `r*` spacing steps.
*Found incidentally while building the dev examples gallery, not by a docs pass —
ErrorBoundary has no spoke yet, so treat this as a head start on its page.*

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

### 27 · Input — hook without `"use client"` (med · caveat)

`Input` imports and calls `useFieldError` from `./Field` but ships no `"use client"`
directive, so a React Server Component importing it directly would fail. **Caveat:**
`verify-directives` passes on it — which means either the hook is context-only (tolerated) or
the directives guard doesn't model context-only hooks. Audit both the component *and* the
guard's coverage.

### 46 · ToastContext — `ToastProvider` crashes any server render (high)

`ToastProvider` calls `createPortal(…, document.body)` unconditionally in its render body with
no `typeof document === "undefined"` guard — unlike `Portal.tsx:10`, which has one.
`"use client"` does **not** prevent SSR; it marks a module as client-*capable*, and the server
still renders it to produce initial HTML. **Failure scenario:** a Next.js App Router app wraps
its tree in `<ToastProvider>` (the documented way to use toasts) → every page throws at render.
Confirmed by SSR-rendering it directly: `ToastProvider SSR THREW: ReferenceError: document is
not defined`. Note React's own server renderer *also* throws on any portal it reaches
("Portals are not currently supported by the server renderer"), so both guards are needed.
**Fix:** mirror `Portal.tsx` — return `null` when `document` is undefined; better, render the
portal behind a mounted-in-effect flag so hydration is clean too (see #47).

### 47 · Portal — the SSR guard trades a throw for a hydration mismatch (med)

`typeof document === "undefined"` correctly stops the server-renderer throw, but `document`
**is** defined during hydration, so the first client pass contains the portal while the server
emitted nothing. React descends into the portal fiber during the hydration walk, fails to match,
and **regenerates the whole hydration root**, discarding the server HTML.
**Failure scenario:** SSR a page containing an unconditional `<Portal>` → dev logs "Hydration
failed because the server rendered HTML didn't match the client"; production throws minified
React error **#418**. Reproduced independently twice against react-dom 19.2.5, in both dev and
production builds, from byte-identical SSR HTML, and in all five tree positions (between
siblings, first/last/only child, root). Controls confirm the same tree without the portal, and
one rendering `{null}` in its place, both hydrate clean with the server node reused.
Portals gated behind state that starts closed (`AppShell`) hydrate cleanly.
**Fix:** render behind a mounted flag set in an effect rather than a `typeof document` check —
verified to hydrate clean. `portal.md` documents the current behaviour honestly in the meantime.

### 38 · Spinner — continuous rotation ignores `prefers-reduced-motion` (med)

`animate-spin` on `Spinner.tsx:7` is unconditional; there is no `Spinner.css`, and the
`prefers-reduced-motion` blocks in `@batthewz/response-ui-css` are all class-scoped
(`.fade-*`, `.scale-*`, `.morph-*`, `.stagger-item`, `.scroll-reveal-hidden`,
`::view-transition-*`) — none touch `animate-spin`. **Failure scenario:** a user with OS
"Reduce motion" enabled opens any loading state → a ring rotates at `spin 1s linear infinite`
for as long as the wait lasts, including `RequireAuth`'s full-page gate. **Fix:**
`motion-reduce:animate-none` compiles and wins the cascade (verified), but leaves a static
broken ring — a `motion-reduce:animate-pulse` or an opacity pulse is the better fallback.

### 39 · Spinner — the accessible text is hard-coded English and unreachable (med)

The `sr-only` span renders the literal `"Loading"`, and `SpinnerProps` omits `children`.
**Failure scenario:** a French app has no supported way to change it —
`<Spinner>Chargement…</Spinner>` fails to compile (`Omit<…, "children">`), and
`<Spinner aria-label="Chargement" />` sets only the accessible *name* while the live region's
text content stays "Loading", so the user gets two competing strings. **Fix:** add
`label?: string` defaulting to `"Loading"` and render it in the `sr-only` span.

### 41 · IconButton — no default `type`, so it submits forms (med)

`<button>` defaults to `type="submit"`; `IconButton` sets no default and passes `type` through
only if the caller supplies it. **Failure scenario:** `Pagination` inside a filter `<form>` —
entirely ordinary — and clicking "next page" submits the form and navigates instead of paging.
Confirmed call sites with no `type`: `Toast.tsx:56`, `Carousel.tsx:149`, `Carousel.tsx:165`,
`Pagination.tsx:116`, `:129`, `:178`, `:191`. The inconsistency is visible *inside* Pagination,
whose plain `<button>` page-number control at `:153` **does** set `type="button"`.
**Fix:** default `type = "button"` in the destructure, still overridable via props.

### 44 · Badge — status carried by colour alone (med)

`Badge`'s five variants differ only in `bg-status-*-bg` / `text-status-*`; no icon, no label,
no `role`, no `aria-*`. **Failure scenario:** a CI summary renders
`<Badge variant="success">12</Badge>` beside `<Badge variant="error">3</Badge>` — a screen
reader announces only "12" and "3", and in greyscale (or to a red/green-deficient viewer) both
paint as near-identical light chips, so the pass/fail distinction is lost entirely. **Fix:**
emit an `sr-only` variant word (or an `aria-hidden` icon plus `sr-only` text) inside the span
for every non-`default` variant. `badge.md` documents the workaround — put the meaning in the
label — but the component should not require it.

### 51 · response-ui-css — `--C-TEXT-MUTED` fails WCAG AA everywhere (med · cross-package)

**This one is not in this package.** It lives in
`node_modules/@batthewz/response-ui-css/src/tokens/colors.css:23` and each theme file, so it is
logged here only because a docs pass measured it — the fix belongs in the CSS package.

Contrast of `--C-TEXT-MUTED` against `--C-SURFACE-0` → `--C-SURFACE-3`, computed from the OKLCH
values by two independent agents that agreed:

| Theme | surface-0 | surface-3 |
| --- | --- | --- |
| default | 2.54:1 | 2.05:1 |
| tech | 2.10:1 | 1.75:1 |
| grimdark | 2.59:1 | 1.94:1 |
| events | 2.45:1 | 2.07:1 |

AA body text needs 4.5:1; AA large text needs 3:1. **Every cell fails both.** For scale,
`--C-TEXT-PRIMARY` never drops below 8.45:1 and `--C-TEXT-SECONDARY` never below 4.45:1.

**Failure scenario:** anything inked `--C-TEXT-MUTED` is below the legibility floor for
low-vision users on every theme the library ships — `Text color="muted"`, `Input`/`Textarea`
placeholders, `Badge` and `ActivityFeed` timestamps, `StatCard`'s flat sparkline tint.
**Fix direction:** raise `--C-TEXT-MUTED`'s lightness per theme until it clears 3:1 at minimum
(it is a hint/placeholder ink, so AA-large is the defensible floor), or state in
`theme-contract.md` that it is decorative-only and must never carry meaning. Right now the
contract names it "Most-muted (placeholders, hints)" and makes no legibility claim either way —
which is why no page could have caught this by reading the contract alone.

### 53 · Text — `variant` and the element disagree about what a heading looks like (med)

`variantClassMap` maps `variant` to `text-h*`, which emit **only** `font-size` and
`line-height`. The heading *treatment* — `--HEADING-FONT`, `--HEADING-LETTER-SPACING`,
`--HEADING-TEXT-TRANSFORM`, `font-weight: 700` — lives in `@layer base` on the `h1`–`h6`
**element** selectors. So the look follows `as`, and the size follows `variant`.
**Failure scenario:** `<Text variant="h2" as="p">Quarterly revenue</Text>` under
`data-theme="events"` renders at `--H2` size but in Nunito at body weight — it does not match the
real `h2` beside it. Reverse: `<Text variant="body-1" as="h3">` gets Playfair + 700 at body size.
**Fix direction:** add the foundation's `.h1`–`.h6` classes to `variantClassMap` alongside
`text-h*`, so the heading treatment travels with `variant` rather than with the element.

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

### 63-64 · Skeleton — the loading affordance is louder than the content (med)

- **#63** `CommentPlaceholder` (1 circular + 3 text skeletons in a `Card`) mounts **four**
  `role="status"` live regions, verified by render: `textContent` is
  `"LoadingLoadingLoadingLoading"`. A screen-reader user hears "Loading" four times for one card,
  learns nothing about *what* is loading, and gets no announcement when it resolves — the regions
  just vanish. **Fix:** default the element to `aria-hidden` (it is decorative placeholder art)
  and leave the live region to the caller, or expose a `label` so exactly one skeleton in a group
  owns the announcement.
- **#64** identical in shape to Spinner #39: `…rest` spreads last so `aria-label="Chargement"`
  renames the region, but the `sr-only` child text node stays the English "Loading" — the region
  is named in one language and reads its contents in another. **Fix:** a `label?: string` prop
  used for both.

### 68-69 · CopyButton — the copy can fail, and the confirmation may never be heard (med)

- **#68** Same build served over plain `http:` (LAN IP, intranet, staging without TLS) →
  `navigator.clipboard` is `undefined` → the guard returns → every click is a silent no-op with
  the button still reading "Copy". Identical outcome when `writeText` *rejects* (no transient
  user activation, cross-origin iframe without `clipboard-write`, some webviews) → a bare
  `catch` swallows it. `onClick` cannot substitute: it fires *before* the attempt and on both
  failing paths. **Fix:** an `onCopy(succeeded: boolean)` / `onError(err)` callback, or a
  failure state. (Note: React's own `onCopy` DOM prop *does* compile here and never fires for a
  programmatic `writeText` — a live trap for anyone reaching for it.)
- **#69** The `sr-only` `aria-live` span is a descendant of `<button>`, and WAI-ARIA 1.2 lists
  `button` among the roles with *Children Presentational: True*, so descendant semantics are not
  reliably exposed. **Fix:** render the region as a **sibling** of the button — which cannot be
  done from the call site, so only a code change can fix it.

### 73 · Radio — keyboard focus is invisible (high)

`Radio.tsx:16`'s full class list is `size-4 accent-accent focus:outline-none`. Tailwind 4.3.0
compiles `focus:outline-none` to `outline-style: none`, and nothing replaces it: Radio has no
`.css`, `@batthewz/response-ui-css` ships no `:focus-visible` base rule (its only "focus" hit is
`--color-border-focus`), and Preflight's `:-moz-focusring { outline: auto }` sits in `@layer base`,
which loses to `@layer utilities`.

**Measured, not reasoned.** With `:focus-visible` forced true, the rendered pixel diff is
**0 of 3600 px in Chromium *and* Firefox**. The same radio with the class removed changes 182 px
(Chromium) / 306 px (Firefox).

**Failure scenario:** a keyboard user tabs into any radio group on any theme. Nothing on screen
changes. They cannot see which option has focus, and therefore cannot predict what the arrow keys
will do — while arrow keys in a radio group also *change the selection*. WCAG 2.4.7 (AA) failure,
and it also fails in forced-colours mode: `outline-none` emits no forced-colors fallback, unlike
`outline-hidden`, which carries `@media (forced-colors: active){outline:2px solid transparent}`.
**Fix:** drop `focus:outline-none` and add `focus-visible:ring-2 focus-visible:ring-border-focus`
— verified to render (144/188 px change) and matching the `:focus-visible` pattern already used by
Slider, Switch, ColorPicker, Rating and eight more.

### 74 · Button — no default `type`, and it is the default submitter (med)

Identical in kind to #41 (IconButton), but this is the component every form footer is built from.
`Button.tsx:33` destructures `{ variant, size, as: Tag, className, ...props }` — no `type`.
Verified: `<Button>Cancel</Button>` renders with `getAttribute("type") === null` and
`el.type === "submit"`; clicking it inside a `<form>` fires `onSubmit`.

**Failure scenario:** the canonical footer —
`<form onSubmit={save}><FormActions><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit">Save changes</Button></FormActions></form>`.
Clicking Cancel runs `close` **and** submits. Worse, Cancel is the first submit button in tree
order, so it is the form's default button: pressing Enter in any text field fires **Cancel**
instead of Save. Confirmed via `event.submitter.textContent === "Cancel"`; adding
`type="button"` to Cancel moves the submitter to "Save changes" and clicking Cancel yields zero
submits. **Fix:** `type={Tag === "button" ? "button" : undefined}` before `{...props}`, so callers
can still pass `type="submit"` and `as="a"` is unaffected. `button.md` now carries the gotcha.

### 77 · Select — the dropdown arrow is black on every theme (med)

`Select.tsx:28` sets the chevron as a `background-image` data-URI whose SVG uses
`fill="currentColor"`. An SVG referenced as an image is its own document, so `currentColor`
resolves against *that* document's initial `color` — black — not the select's.
**Observed in Chromium and Firefox:** with the referencing element set to `rgb(255,0,0)`, the
chevron renders `rgb(0,0,0)` (1835 pure-black px, zero red). Under `data-theme="grimdark"`
(`color-scheme: dark`) it is black on a `rgb(15,15,15)` surface — **≈1.10:1**, against a theme
whose `--C-TEXT-PRIMARY` is `oklch(0.8285 0.0414 83.1)`. Chrome does not propagate `color-scheme`
into an SVG-as-image document.
**Failure scenario:** on the two dark themes the only affordance marking the control as a dropdown
is invisible. **Fix:** inject the token colour into the data-URI per theme, or use
`mask-image` + `background-color: var(--C-TEXT-PRIMARY)` so it inherits.

### 78-79 · Switch — the position cue is invisible, and a disabled switch still submits (med)

- **#78** Thumb (`--C-SURFACE-0`) against the off-track (`--C-SURFACE-2`): default **1.100**,
  tech 1.083, grimdark 1.163, events 1.077. Checked, thumb-on-`--C-ACCENT` clears 3:1 only in
  default (5.170) and tech (14.835) — events (2.719) and grimdark (2.963) fail in **both** states.
  `all: unset` leaves no border, so the whole off-track is 1.04–1.16:1 against the page.
  Computed independently by two agents whose pipelines both reproduce #51's numbers exactly.
  **Why this is 1.4.11 and not 1.4.1:** unlike Alert/Meter/Badge/Avatar, Switch *does* ship a
  non-colour channel — the thumb moves. The defect is that the channel is imperceptible, which is
  1.4.11's subject. Filing both would double-count one root cause.
  **Fix:** give `.switch-thumb` a `--C-BORDER-STRONG` border and the track a
  `1px solid var(--C-BORDER-DEFAULT)`.
- **#79** `<form><Switch name="notify" defaultChecked disabled /></form>` →
  `new FormData(form).get("notify") === "on"`. The hidden input never receives `disabled`, and
  native disabled controls are excluded from submission. **Fix:** `disabled={disabled}` on the
  hidden input.

### 80 · Slider · RangeSlider — the handle is a fifth larger in Firefox (med)

`::-webkit-slider-thumb` defaults to `box-sizing: border-box`; `::-moz-range-thumb` defaults to
`content-box`. Both files declare a `1.25rem` box plus `border: 2px`, so the border lands *outside*
the box in Firefox only. Measured from the same stylesheet: **Chrome 144 → 20 × 20 px;
Firefox 146 → 24 × 24 px.** Preflight's `*, ::before, ::after { box-sizing: border-box }` does not
reach the pseudo-element (verified with Preflight present). The focus `box-shadow` is anchored to
the larger box, so focus geometry differs too. **Fix:** add `box-sizing: border-box` to both thumb
rules in `Slider.css` and `RangeSlider.css`.

*Bonus from the same investigation:* `slider.md` originally claimed Firefox covers the accent fill
with its default `::-moz-range-track`. **That is false** — pixel-sampled identical to Chromium in
Firefox 146 and 123. Both engines expose the input's own `background` as the track once
`appearance: none` is set. The claim came from `RangeSlider.css:111`'s stale comment (#88), and the
"fix" it implied would have painted a bar *over* the fill.

### 90 · useTheme — persistence is write-only (high)

`setTheme` writes `localStorage["theme"]`. **Nothing in either package ever reads it back.** A
verifier swept `src/`, `dev/`, `dist/`, `scripts/` and the installed `@batthewz/response-ui-css`:
the only `getItem("theme")` occurrences are a test assertion and a string inside a doc example.
`dev/index.html` ships no bootstrap script; there is no cookie and no build-time restore.

**Failure scenario:** a user picks Grimdark and reloads. `data-theme` is absent, the
`useSyncExternalStore` snapshot falls back to `default`, and the choice is gone. This is not a
flash-of-wrong-theme — it is silent data loss, and the write makes it look supported.

**This one also made the package's own docs false**, which is why it is filed high rather than
medium. `README.md:84` claimed `useTheme` "adds reactive state, `localStorage` persistence, and
SSR-safe hydration"; `AGENTS.md:281` repeated it. Neither is true: the hook holds no React state
(it is `useSyncExternalStore` over the DOM attribute) and nothing restores the key. Both files are
corrected in this pass to describe the one-way write.

**Fix:** the only correct fix is a blocking inline `<script>` in the document head that sets
`data-theme` from storage before first paint — reading it in an effect would restore the choice but
guarantee a flash. Ship that snippet as documented, copy-pasteable code, or the write should be
removed as misleading.

### 96 · Dialog · Drawer — every native close path desyncs the controlled `open` (med)

Both components listen for `cancel` (Escape) and route it through `onClose`, so **Escape is
handled correctly** — the classic bug in this shape is genuinely absent. But neither listens for
`close`, and `<form method="dialog">`, `formmethod="dialog"` and `ref.current.close()` all fire
`close` **without** `cancel`.

**Failure scenario:** a dialog with a `<form method="dialog">` footer — the platform-native way to
close one. The user submits it. The element closes, `onClose` never runs, the parent's `open` stays
`true`, and because the sync effect only reacts to a *change* in `open`, setting it `true` again is
a no-op: the dialog can never be reopened until the caller toggles it false and back.
**Fix:** add a `close` listener that calls `onClose()` when `open` is still true.

### 103-104 · Toast — the notification system is the least announceable surface in the library (med)

Two independent failures stack:

- **#103** The always-mounted portal container carries no `aria-live`; the live region arrives
  *with* its text already inside it (`role="alert" aria-live="assertive"`, `textContent` already
  set in the same update). Region-and-content-in-one-update is the case screen readers announce
  least reliably — the same defect already logged for Spinner (#39) and Skeleton (#64), but here it
  defeats the entire purpose of the component.
- **#104** Variant severity is colour-only, so a success and an error toast are identical to a
  screen reader and in greyscale.

**Fix:** put `aria-live` on the persistent container (`ToastContext.tsx:137`) so the region exists
before any message lands in it, and add an `sr-only` severity word per variant.

**Note on #41:** that row said Toast's `type`-less dismiss button submits an enclosing form. Through
`ToastProvider` it does **not** — the button is portalled to `document.body`, so its form owner is
`null` (verified: `btn.form === null`, no submit event). Only a hand-rendered `<Toast>` placed
inside a `<form>` submits. #41 stands for IconButton, Pagination and Carousel; the Toast half is
narrower than logged.

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

### 133 · Pagination — the current page number is invisible in the `tech` theme (high)

`Pagination.css:41-43` is `.pagination__page--current { background-color: var(--C-ACCENT);
color: var(--C-TEXT-ON-PRIMARY); }`. The contract is explicit that these do not pair:
`theme-contract.md:53-54` defines `--C-TEXT-ON-PRIMARY` as "Text drawn on `--C-PRIMARY` fill" and
`--C-TEXT-ON-ACCENT` as "Text drawn on `--C-ACCENT` fill".

In `themes/tech.css` lines 23 and 37 are **byte-identical** — both `oklch(0.8763 0.2278 152.55)`
(`#00ff88`). So the current page's digit is painted in exactly its own background colour.

| Theme | as shipped | with `--C-TEXT-ON-ACCENT` |
| --- | --- | --- |
| default | 5.17:1 | — |
| tech | **1.00:1** | 14.84:1 |
| events | 2.80:1 | — |
| grimdark | 3.81:1 | — |

**Failure scenario:** on `tech`, a user cannot see which page they are on — the one piece of state
the component exists to convey. `events` at 2.80:1 also fails AA-large. **Fix is one variable in
one rule**: `Tabs.css:160` and `Calendar.css:211` already do it correctly as
`var(--C-TEXT-ON-ACCENT, var(--C-TEXT-INVERSE))`.

This is the first confirmed instance of the contract's fill/ink pairs being crossed, as opposed to
a token simply being too low-contrast (#51). Worth grepping every `--C-TEXT-ON-*` use against the
fill it sits on.

### 134 · Stepper — completed steps announce as an unnamed button (high)

With `onStepClick` supplied, every marker becomes a `<button>`. A **completed** step's only child
is the `<Check/>` glyph, which `lucide-react` correctly marks `aria-hidden`, so the button has no
text at all. Measured with `computeAccessibleName` on a three-step stepper at `activeStep={2}`:
`["", "", "3"]` — the two completed markers have empty names, and even the reachable one announces
only its number, never its title.

`Stepper.Step` spreads `{...props}` onto the `<li>`, so `<Stepper.Step aria-label="Shipping">`
lands the label on the list item and never on the button. **There is no call-site fix.**

Rated high rather than medium because `Wizard.tsx:128` defaults `allowBackNavigation = true`, so a
bare `<Wizard steps={…}/>` — the library's own flagship consumer — ships unnamed back-navigation
buttons. **Fix:** build the button's name from the step `title` plus a status word.

### 171 · Swimlane — every advertised prop past the named eight is dropped (high)

`SwimlaneProps` is `{title, subtitle, viewAllHref, animation, once} & Omit<ComponentPropsWithRef<"section">, "title">`,
so the type promises the full `<section>` surface. `{...rest}` is then spread onto `ScrollReveal`,
which destructures only its own props and forwards none (#9).

**Failure scenario.** `renderToStaticMarkup` of
`<Swimlane title="Continue watching" id="cw" role="region" aria-label="Continue watching" data-analytics="lane" style={{background:"red"}} tabIndex={0}>`
emits exactly `<section class="scroll-reveal-hidden swimlane">` — no `id`, `role`, `aria-label`,
`data-*`, `style` or `tabIndex`. `className` and `ref` are the only two that survive, because
Swimlane passes them explicitly. Analytics attributes vanish silently, and the accessible name a
consumer sets is discarded, which is what makes #172's unnamed scroll region unfixable from the
call site too.

Rated high rather than medium because it is a *public API that compiles and does nothing*: there is
no runtime warning, no type error, and the failure is invisible until someone inspects the DOM.
**Fix:** spread `...rest` onto the element inside ScrollReveal, or have Swimlane render its own
`<section>` and nest ScrollReveal inside it.

### 148 · CodeBlock — the code scroller cannot be reached by keyboard (med)

`.code-block-pre` is the `overflow-x: auto` element and carries no `tabIndex`; `.code-block` (the
root, which does take rest props) is `overflow: hidden`.

**Failure scenario.** A 200-char line inside a 400px column: a mouse or trackpad pans the `<pre>`,
a keyboard cannot focus it, and the end of the line is unreachable (WCAG 2.1.1). Passing
`tabIndex={0}` to CodeBlock lands it on the `overflow: hidden` root, so arrow keys there scroll the
page instead — **there is no call-site fix.** Two of the three engines now focus a childless scroll
container automatically, which mitigates but does not remove it; that mitigation is browser
knowledge, not measured here. **Fix:** put `tabIndex={0}` on the `<pre>` — it already sits inside a
labelled region.

### 156-157 · EmptyState — the icon never resizes, and the description is illegible (med)

**#156.** `.empty-state__icon` sets `font-size` per size and no `width`/`height`, and nothing in
this package or in `@batthewz/response-ui-css` sizes a descendant `svg` of it.
`renderToStaticMarkup(<EmptyState size="lg"><EmptyStateIcon><Inbox /></EmptyStateIcon></EmptyState>)`
emits `<svg width="24" height="24">`, and the markup is **byte-identical** at `size="sm"` apart
from the `data-size` attribute — so `size` visibly moves the padding, gap and title while the icon
sits still. Every default `lucide-react` icon carries those attributes. **Fix:** add
`.empty-state__icon > svg { width: 1em; height: 1em; }`, exactly as `ActivityFeed.css:90` and
`Stepper.css:103` already do.

**#157.** `.empty-state__description` — the only place a blank state explains itself — inks
`--C-TEXT-MUTED`: 2.54:1 default, 2.45:1 `events`, 2.10:1 `tech`, 2.59:1 `grimdark` against
`--C-SURFACE-0`, where AA body text needs 4.5:1. The same token inks the icon (line 36). This is a
component-level instance of #51, but logged medium rather than low because unlike a disabled menu
item (#130) the text is load-bearing instruction. **Fix:** ink the description
`--C-TEXT-SECONDARY` (which never drops below 4.45:1), or darken `--C-TEXT-MUTED` upstream.

### 160-163 · Hero — the scrim is unconditional, unbounded and untraversable (med ×4)

**#160 — the scrim eats clicks.** `.hero__overlay` is `position: absolute; inset: 0` with no
`pointer-events: none`, appended *after* `children`. `.hero__content` escapes it with
`position: relative; z-index: 10`; nothing else does. `<Hero><Button onClick={buy}>Buy tickets</Button></Hero>`
renders the button dimmed and every click hits the overlay; Tab+Enter still fires it, so it reads
as a mouse-only bug and passes any keyboard-driven test. **Fix:** add `pointer-events: none` to
`.hero__overlay`.

**#161 — `animate` advertises a stagger it cannot deliver.** `Hero.Content` composes
`ScrollReveal > Stagger`, but the entrance class (`fade-up`/`fade-in`/`scale-in`) lands on the
ScrollReveal element while `.stagger-item` carries `animation-delay` + `animation-fill-mode: both`
and **no `animation-name`** — a delay applied to nothing. `<Hero.Content animate className="flex gap-r4">`
with three children enters as one block with no cascade, *and* the flex row now lays out a single
ScrollReveal `<div>` instead of the three children, so the gap class silently stops working.
(Related: this run confirmed `stagger.css` does read `--stagger-delay`, so #17's feared *name
mismatch* does not exist — the prop is inert for a different reason, the `.stagger-item` rule
re-declaring the property on the item and shadowing the inherited value.) **Fix:** put the entrance
class on `.stagger-item`, or drop the Stagger wrapper from `Hero.Content`.

**#162 — the scrim is on when there is nothing to darken.** `overlay` defaults to `true`
irrespective of whether a `Hero.Background` exists. `<Hero><Hero.Content><Text>…</Text></Hero.Content></Hero>`
on the default theme over `--C-CANVAS` takes `--C-TEXT-PRIMARY` from a computed **17.74:1 to
4.46:1** — under the 4.5:1 AA floor — for a 50%-black rectangle that darkens nothing but the page.
**Fix:** default `overlay` to `false`, or gate the scrim on a background layer being present.

**#163 — nothing bounds the scrim against a bright image.** `--C-TEXT-ON-PRIMARY` is the only one
of the six contract text tokens that is light in all four themes, so it is what `Text color="on-primary"`
and `Button variant="ghost-inverse"` use over a hero. Composited over the shipped scrim on a pure
white image region it measures **2.89:1 in `events`** (0.45 alpha) and **3.98:1 default** — the
former below even the 3:1 large-text floor. The contract promises that token against `--C-PRIMARY`
*fill* only, and a scrimmed photograph is not that fill. **Fix:** darken `--OVERLAY-SCRIM-COLOR` in
`events` (0.45 → ~0.6), or add a contrast guard over the theme files.

All four contrast figures were computed with an OKLCH→sRGB converter validated to exact hex against
`#ff0000`/`#00ff00`/`#0000ff`, sRGB-space alpha compositing and WCAG relative luminance. #160 and
#161 are read from the source, the stylesheets and DOM paint order, not from a browser render.

### 167-168 · MediaCard — the action layer covers the card, and the white ink never applies (med)

**#167.** `MediaCard.Action` renders `absolute inset-0 z-10 flex items-center justify-center` with
pointer events left on — unlike `.media-card__overlay`, which is correctly `pointer-events: none`.
A card with `<MediaCard.Content><a href="/x">Read more</a></MediaCard.Content>` plus any
`<MediaCard.Action>` renders the link focusable by keyboard and unclickable by mouse, because the
Action div is the hit target across the full card box. That is a keyboard/pointer mismatch, not
just a dead link. **Fix:** add `pointer-events-none` to the Action wrapper and `pointer-events-auto`
to its children, matching `.media-card__overlay`.

**#168.** `.media-card__content` re-declares `--C-TEXT-PRIMARY`, `-SECONDARY`, `-MUTED`,
`-INVERSE`, `-ON-PRIMARY` and `-ON-ACCENT` to white, but sets no `color` property — so the
redefinition only reaches children that *read* one of those variables (`Text`, `text-fg-*`).
`<MediaCard.Content><h3>Card Title</h3></MediaCard.Content>` — exactly what `MediaCard.test.tsx:32`
renders — inherits the ambient page ink and lands dark-on-dark over a 70%-black gradient. The CSS
comment above the rule says "force light text in all themes", which is what it fails to do.
**Fix:** add `color: var(--C-TEXT-PRIMARY)` to `.media-card__content`. Both are reasoned from the
source plus the compiled stylesheet; jsdom does not hit-test, so neither is browser-measured.

### 172-175 · Swimlane — a lane that does not lane (med ×4)

**#172 — nothing scrolls.** `.swimlane__body` is `width: 100%` and nothing else; `Swimlane.css`
contains no `overflow`, `scroll-snap-type`, `scroll-behavior` or `tabindex` at all.
`<Swimlane title="Continue watching"><div/><div/><div/></Swimlane>` stacks its children vertically.
A consumer who adds `overflow-x` themselves then gets a scroll region that is neither
keyboard-focusable nor named — and cannot be named, because of #171. `Swimlane.test.tsx:23` is
called "renders a scrollable container with the swimlane class" but only asserts the class exists,
so the suite reads as covering this. **Fix:** give `.swimlane__body` `overflow-x: auto` +
`scroll-snap-type: x proximity` + a `tabIndex`/label, or drop the swimlane framing and document it
as a header-only section.

**#173 — "View all" fails AA in two themes.** The link inks `--C-ACCENT` at `--BodyText-2`
(13–14px, so the 4.5:1 normal-text threshold applies) with `text-decoration: none`. Against
surface-0/1/2: `grimdark` 2.96/2.77/2.55:1, `events` 2.72/2.63/2.52:1. `:hover` swaps in
`--C-ACCENT-HOVER`, which in `grimdark` *lowers* it to 2.31/2.16/1.98:1 — the interaction state is
worse than the rest state. Default (5.17–4.70:1) and `tech` (14.84–13.70:1) pass. Because the
underline appears on `:hover` but not `:focus-visible`, at rest the link is also distinguished from
body text by colour alone. **Fix:** raise accent lightness in those two themes, or ink the link
`--C-TEXT-PRIMARY` with a persistent underline.

**#174 — "View all" cannot be relabelled.** The string is a hard-coded English literal with no
prop, and the anchor receives only `href` and a class. Three lanes on a page produce three links
whose entire accessible name is "View all"; the section's own `aria-label` is dropped by #171, so
nothing disambiguates them, and each forces a full page reload in an SPA. **Fix:** add
`viewAllLabel?: ReactNode`, let the anchor accept anchor props, or compose the title into the
link's accessible name.

**#175 — the lane is invisible without JS.** `renderToStaticMarkup` returns
`class="scroll-reveal-hidden swimlane"` (`opacity: 0`), and a jsdom render with no
`IntersectionObserver` keeps that class forever. Under `prefers-reduced-motion: reduce` the class
resolves to `opacity: 1`, so only non-reduced-motion users are affected. This is #16's mechanism,
logged separately because Swimlane exposes **no way to opt out** — a ScrollReveal consumer can
simply not use ScrollReveal, a Swimlane consumer cannot, and the hidden content includes the
heading. **Fix:** expose an un-revealed render mode, or reveal on mount when `IntersectionObserver`
is unavailable.

### 178 · MasonryGrid — an item's props are dropped whenever the grid animates (high)

`MasonryGrid.Item` types itself as `ComponentPropsWithRef<"div">` and, on the default
`animate` path, spreads `{...props}` onto `ScrollReveal` — which destructures only its own eight
named props and renders `<Tag>` with none of the rest (#9). Measured with
`renderToStaticMarkup`:

```
<MasonryGrid><MasonryGrid.Item id="x" role="listitem" aria-label="Note"
  data-k="1" style={{color:"red"}} tabIndex={0}>body</MasonryGrid.Item></MasonryGrid>
→ <div class="masonry-grid"><div class="scroll-reveal-hidden masonry-grid__item">body</div></div>
```

The identical JSX under `animate={false}` emits `id`, `role`, `aria-label`, `data-k`, `style`
**and** `tabindex`. So an animating grid cannot be given item-level semantics from the call site
at all, and there is no type error and no runtime warning. This is the **second** confirmed
downstream victim of #9 after `Swimlane` #171 — the pattern is now established, not anecdotal.
**Fix:** have `Item` render its own `<div {...props}>` and nest `ScrollReveal` inside it, or fix
#9 at the source and spread `...rest` inside `ScrollReveal`.

### 179 · MasonryGrid — the caller's `key` is defeated by the provider (med)

The root maps children through `<MasonryContext.Provider key={index}>`, so React reconciles by
array position no matter what `key` the caller wrote. Prepend one item to a keyed six-item grid
and every item from that position onward unmounts and remounts: uncontrolled input values, video
playback position, scroll offset and component state are all lost, and every remounted item
replays its entrance animation. An identically-keyed plain list preserves its DOM nodes.
**Fix:** key the provider by the child's own key (`isValidElement(child) ? child.key ?? index :
index`), or drop the per-child provider and pass the index another way.

### 180 · MasonryGrid — `columns` above 4 silently collapses to one column (med)

`columns` is typed `number`, but `MasonryGrid.css` ships `--masonry-columns` rules only for 2, 3
and 4 at each of the five breakpoints. `<MasonryGrid columns={5}>` emits
`class="masonry-grid masonry-grid--base-5"` (measured), which matches no rule, so
`columns: var(--masonry-columns, 1)` falls back to **1**. A caller gets a single stacked column
with no error at compile time or runtime. Sibling `Grid.css` already ships 1–6 for the
same-shaped prop, so the two components accept the same object and disagree about what it means.
**Fix:** narrow the type to `1 | 2 | 3 | 4`, or generate the missing rules.

### 181 · MasonryGrid — a breakpoint can widen the grid but never narrow it to one column (med)

`buildResponsiveClasses` does `if (count == null || count === 1) continue`, so a count of `1` at
any breakpoint emits no class at all. `<MasonryGrid columns={{ base: 3, md: 1 }}>` emits only
`masonry-grid--base-3` (measured), and because that base rule sits outside any media query the
grid stays at three columns at every width instead of collapsing to one at 48rem. The skip is
correct for `base` (one column is the CSS fallback) and wrong for every other key. **Fix:** emit
`masonry-grid--<bp>-1` and add matching `--masonry-columns: 1` rules for sm/md/lg/xl.

### 186 · Carousel — arrow keys are stolen from every control inside a slide (high)

`handleKeyDown` sits on the root and checks only `e.key`, never `e.target`. Because keydown
bubbles, an arrow press anywhere inside the carousel reaches it. Measured: focus an `<input>`
inside a `Carousel.Item`, press ArrowLeft — one `scrollBy` call on the track and
`defaultPrevented: true`, so the caret never moves. The same applies to `Slider`, `Textarea`,
`Select` and any `role="listbox"` inside a slide. Combined with #187 (the field cannot be
focused by mouse either), a text input inside a Carousel slide is effectively unusable.
**Fix:** bail out of `handleKeyDown` when `e.target !== e.currentTarget`, or when the target is
a text-entry/interactive element.

### 187 · Carousel — mousedown `preventDefault` kills focus and caret placement (med)

`CarouselTrack.handleMouseDown` calls `e.preventDefault()` on every left-button press over the
track to stop native image dragging. That default is also what focuses a control and places the
caret. Measured: dispatching a left mousedown on an `<input>` inside a slide leaves
`defaultPrevented: true`, so the browser's focus/caret default never runs. Buttons and links are
unaffected — they act on `click`. **Fix:** skip the `preventDefault` when `e.target` is a form
control or `contenteditable`, keeping it for images.

### 188 · Carousel — end-of-rail arrows stay focusable and enabled (med)

`data-hidden` applies `opacity: 0; pointer-events: none` and nothing else. Measured on a
carousel at `scrollLeft` 0: the Previous button reports `data-hidden="true"`, `disabled=false`,
`aria-hidden=null`, `tabIndex=0`, and `.focus()` lands on it. So a keyboard user tabs onto an
invisible "Previous" button whose activation is a no-op, and a screen reader announces it as an
available control. **Fix:** add `disabled={!canScrollPrev}` / `disabled={!canScrollNext}`
alongside `data-hidden`.

### 189 · Carousel — the root's ARIA is voided by its own missing role (med)

Measured markup: `<div class="carousel" aria-roledescription="carousel" aria-labelledby="…"
tabindex="0">` — no `role`. The implicit role of a `<div>` is `generic`, on which ARIA prohibits
both name-from-author and `aria-roledescription`. A conforming screen reader is entitled to
announce neither the title nor "carousel", so the entire labelling story of the component is
inert. `role` does pass through the rest spread, so `<Carousel role="group">` fixes it at the
call site. **Fix:** set `role="group"` (or `"region"`) on the root before the rest spread.

### 190 · Carousel — `prefers-reduced-motion` cannot stop the motion the user triggers (med)

`Carousel.css:90-93` sets `scroll-behavior: auto` on the track under
`@media (prefers-reduced-motion: reduce)`. But `scrollPrev` (line 99), `scrollNext` (107) and the
drag fling (271) all pass `behavior: "smooth"` explicitly in the scroll options, and CSSOM View
only consults the element's computed `scroll-behavior` when the passed behavior is `"auto"`. So
with reduced motion on, clicking Next still animates. What the media query does reach is the
arrows' opacity transition and scrolls the component never requested, such as the browser easing
a newly focused slide into view — i.e. everything except the motion the user actually asked for.
**Fix:** read `usePrefersReducedMotion()` and pass `behavior: "auto"` when it is true at all
three call sites. The bypass is derived from the spec plus the three literal call sites, not from
a browser render.

### 193 · Spotlight — nothing reaches the `<img>` (med)

`SpotlightImage` builds `<img src alt role>` from three props and spreads everything else onto
the wrapper `<div>`. Measured:

```
<Spotlight.Image src="/a.jpg" alt="A" loading="lazy" id="wrap" width={640} height={360} />
→ <div class="spotlight-image" loading="lazy" id="wrap" width="640" height="360">
     <img src="/a.jpg" alt="A"/></div>
```

`loading`, `width` and `height` on a `<div>` are inert, so every Spotlight image loads eagerly and
reserves no space — layout shift on any page with more than a couple of rows, and no route to
`srcSet`/`sizes` for responsive art. `MediaCard.Image` spreads img props and defaults to
`loading="lazy"`, so the library disagrees with itself. **Fix:** split the props into wrapper +
`imgProps`, or type it like `MediaCard.Image`.

### 195 · Spotlight — alternation and `reversed` both no-op on a content-first row (med)

Every `order` rule in `Spotlight.css` pushes `.spotlight-image` last and pulls the copy first.
For a row authored `<Spotlight.Content>` then `<Spotlight.Image>`, source order already satisfies
that: odd rows have no order rules at all, and even rows apply `order: 2` to an image that is
already last. So every row renders copy-left / image-right and `reversed` changes nothing — the
component looks broken rather than mis-configured, with no warning that child order is
load-bearing. **Fix:** order both children explicitly per parity (`order: 1`/`order: 2` on both,
unconditionally) instead of relying on source order.

### 196 · Spotlight — the parallax layer has no overscan (med)

`Spotlight.Image` renders `<Parallax className="size-full">` inside a wrapper that is
`overflow: hidden`, so the drifting layer is exactly the size of its clipping box: a translate of
*n* pixels leaves an *n*-pixel empty band at one edge. `Parallax`'s offset is
`(elementCentre − viewportCentre) × rate` and is clamped only when `clamp` is passed — which
`Spotlight.Image` does not forward. On a 1080px viewport a row sitting ~540px off centre at the
default rate `0.3` shifts 162px, half a 320px box. `Hero.css` solves the identical problem with
`.hero__background--parallax { inset: -50% 0 }`; `Spotlight.css` has no equivalent. **Fix:** add
an over-sized parallax modifier and forward `clamp`.

### 201 · ProgressBar — `variant="gradient"` silently discards `color` (med)

`.progress-bar__fill--gradient` (line 56) sets the `background` **shorthand**, which resets
`background-color`, and is declared after `.progress-bar__fill--accent|success|warning|error`
(lines 39–53) at equal specificity. Class order in the DOM is irrelevant; source order decides.
So `<ProgressBar value={90} variant="gradient" color="error" />` paints the
`--C-ACCENT → --C-ACCENT-HOVER` ramp, not red — a bar that is meant to read as a failure reads as
normal progress. Both classes are present on the element (measured). **Fix:** make the gradient
rule set `background-image` only, or derive the ramp from the selected colour. If gradient is
meant to be accent-only, the fix is a type change so `color` cannot be passed with it.

### 202 · ProgressBar — `aria-valuenow` is not clamped (med)

The fill percentage is clamped into `[0, 100]` but `aria-valuenow` is the raw `value`. Measured:
`<ProgressBar value={150} max={100} />` renders `aria-valuenow="150"` next to
`aria-valuemax="100"` with a 100%-wide fill; `value={-10}` announces `-10` below
`aria-valuemin={0}`. The bar looks right and announces something impossible. `ProgressRing.tsx:35`
clamps the same input, so the two siblings behave differently. Same defect as `Meter` #22.
**Fix:** `Math.min(max, Math.max(0, value))` before it reaches ARIA.

### 203 · ProgressBar — `ProgressBar.Label` does not label anything (med)

`ProgressBar.Label` is a bare styled `<span>`: it emits no `id`, holds no context, and the root
sets no `aria-labelledby`. `<ProgressBar.Label>Uploading</ProgressBar.Label><ProgressBar
value={64} />` renders a `role="progressbar"` with **no accessible name** — a screen reader
announces "64" and nothing else. The sub-part's existence implies a wiring it never performs,
which is worse than having no sub-part at all. **Fix:** generate a shared id through a compound
context and `useId`, or require `aria-label` in the root's type the way `Meter` does.

### 204 · ProgressBar — `value={NaN}` renders a full bar (med)

`Math.min(100, Math.max(0, (NaN / 100) * 100))` is `NaN`, so the inline style is `width: NaN%`;
the CSSOM rejects it outright. Measured in jsdom: the fill renders as
`<div class="progress-bar__fill progress-bar__fill--accent"></div>` with `style.width === ""` and
no `style` attribute at all, leaving `width: auto` — which on a block child of a `width: 100%`
track is the entire track. So a `loaded / total` computation with `total === 0` shows a bar that
reads as **100% complete** at the exact moment nothing has happened, and `aria-valuenow="NaN"`
alongside it. **Fix:** `Number.isFinite(value) ? … : 0` in the percentage guard.

### 205 · ProgressBar — status by colour alone (med)

`color="success|warning|error"` swaps one `background-color` and emits nothing else: no
`data-status`, no `aria-valuetext`, no text alternative. Two bars at `value={96}` with
`color="success"` and `color="error"` produce byte-identical accessibility-tree output, so a
screen-reader or colourblind user cannot tell "backup complete" from "over quota". This is the
fourth-and-fifth-time instance of the recurring pattern at the top of this file, and it is worse
than `Meter` #21, which at least exposes `data-status`. **Fix:** emit a `data-color`/`data-status`
attribute and a default `aria-valuetext`, or document the colour as decorative only.

### 206-207 · ProgressBar — neither half of the bar is reliably visible (med ×2)

**#206.** The track is `--C-SURFACE-1`. Against `--C-SURFACE-0` (the `Card` surface, and equal to
`--C-CANVAS` in the two light themes) it measures **1.05:1** default, **1.03:1** `events`,
**1.02:1** `tech`, **1.07:1** `grimdark`; against `--C-CANVAS` directly, 1.05 / 1.03 / 1.08 /
1.17:1. So the unfilled remainder is invisible in every shipped theme and a bar at `value={10}`
is a short stub floating on nothing — the total the bar is measured *against* cannot be seen,
which is most of what a progress bar communicates.

**#207.** The other half fails in the other two themes. The default `accent` fill against that
same `--C-SURFACE-1` track measures **4.95:1** default and **14.56:1** `tech`, but **2.63:1** in
`events` and **2.77:1** in `grimdark` — under the 3:1 floor WCAG 1.4.11 sets for a graphical
object that carries meaning. Taken together, there is no shipped theme in which both the fill
edge and the track are comfortably legible.

**Fix:** move the track to a dedicated token (or `--C-SURFACE-2`, per #210, though that is only
marginally better), raise accent lightness in `events`/`grimdark`, and add a ratio guard over the
theme files — the same guard #51, #163 and #173 all want.

Ratios computed with an OKLCH→sRGB converter validated to exact hex against `#ff0000`/`#00ff00`/
`#0000ff`, using WCAG relative luminance; not sampled from a rendered page.

### 210 · ProgressRing — the same invisible track, one step less bad (med)

`.progress-ring__track` strokes `--C-SURFACE-2`, measured against `--C-SURFACE-0` at **1.10:1**
default, **1.08:1** `events`, **1.08:1** `tech`, **1.16:1** `grimdark`. It is the better of the
two choices — `ProgressBar` uses `--C-SURFACE-1` at 1.02–1.07:1 (#206) — and it is still nowhere
near the 3:1 floor, so the ring reads as a floating arc with no visible circumference. This is
why `ProgressRing` came off the "Clean (no findings)" list: it had never been measured, not that
it had passed. **Fix:** as #206 — a dedicated track token with a contrast guard, and one answer
shared by both siblings.

### 211 · Rating — under `allowHalf` every star is misnamed by half a star (high)

The `sr-only` name is `{allowHalf ? position - 0.5 : position} stars`. Measured with
`<Rating allowHalf value={3} />`: the five radios are named "0.5 stars", "1.5 stars", "2.5 stars",
"3.5 stars", "4.5 stars", and the one reporting `aria-checked="true"` is **"2.5 stars"**. So a
screen-reader user cannot distinguish a 2.5 rating from a 3, can never hear "5 stars" at all, and
the checked control's name contradicts the value the component holds. **Fix:** name the button
`position` and expose the half through `aria-valuetext`, or model the control as a slider.

### 212 · Rating — keyboard activation always commits the half value (med)

`valueFromClick` compares `e.clientX` against the star's bounding box. A keyboard-activated click
reports `clientX: 0`, so `0 − rect.left` is negative for every star and the left-half branch
always wins. Measured with a realistic rect (`left: 100, width: 24`): `Enter` on star 5 fires
`onValueChange(4.5)`. `Rating.test.tsx` passes only because jsdom's `getBoundingClientRect`
returns an all-zero rect, which makes `0 − 0 < 12` false and hides the bug. The arrow keys are
*not* affected — measured, ten `ArrowRight`s from `0` commit `0.5, 1, 1.5 … 5`, so the value
`max` is reachable from the keyboard; it is *activation* that cannot commit a whole star.
**Fix:** treat `e.detail === 0` as a whole-star commit.

### 213 · Rating — focus and value are two unsynchronised state machines (med)

`useRovingFocus` owns the tab stop and `handleStarKeyDown` owns the value; both run from the same
`onKeyDown` and neither observes the other. Focus **loops** (last → first) while the value
**clamps** at `max`, and under `allowHalf` focus moves a whole star per `0.5` of value. Measured:
`allowHalf`, focus star 1, five `ArrowRight`s → value `2.5` with the focus ring wrapped back to
star 1. Without `allowHalf`, five presses → value `5` with focus also back on star 1. The visible
ring and the committed value point at different stars for most of the interaction. **Fix:** seed
and update the roving index from the value rather than letting `useRovingFocus` own it, and
disable its loop.

### 214 · Rating — clicking a star does not move the roving index (med)

`onClick` calls `commit` and nothing else; `setFocusedIndex` is only ever called from the roving
hook's own key handler. Measured: click star 4 (focus lands there natively), press `ArrowRight` →
focus jumps to **star 2** while the value goes to 5. The same cause makes the tab stop wrong on
entry — with `value={4}` the measured `tabIndex`es are `0,-1,-1,-1,-1`, so Tab always enters the
group on star 1 rather than on the selected star, which is the opposite of what a radio group is
supposed to do. **Fix:** call `setFocusedIndex` on click and focus, and seed it from the current
value.

### 215 · Rating — the stars miss the 3:1 graphical-object floor (med)

The filled star is `--C-STATUS-WARNING`; the empty star is the same colour at `opacity: 0.45`.
Measured against the library's own surface tokens (canvas / surface-0 / -1 / -2 / -3):

- filled — default **3.19 / 3.19 / 3.05 / 2.90 / 2.57:1**, `events` **3.09 / 3.09 / 3.00 / 2.87 / 2.61:1**
- empty — default **1.65 → 1.53:1**, `events` **1.63 → 1.52:1**, `grimdark` **2.86 → 2.67:1**
- `tech` is the only theme that clears 3:1 on both layers (filled 13.9–11.0:1, empty 3.25–3.34:1)

So in the two light themes the filled star is at or under the floor on every surface below
`surface-0`, and the empty star — which is what encodes "not selected", i.e. the score itself —
is far under it everywhere but `tech`. **Fix:** darken the light-theme warning token, and raise
the empty-star opacity or stroke it with `--C-BORDER-STRONG`. Ratios computed with the same
validated OKLCH→sRGB converter as #206-207, with sRGB-space alpha compositing for the 0.45 layer.

### 216 · Rating — `readOnly` throws away the required `aria-label` (med)

`aria-label` is the one **required** prop on `RatingProps`, and the `readOnly` branch overwrites
it with a generated `` `${value} out of ${max} stars` ``. Measured:
`<Rating readOnly value={4} aria-label="Average customer rating" />` announces "4 out of 5 stars"
— the subject of the rating is gone, so a page of product cards yields a row of identically named
graphics. A caller has no way to know their required prop was discarded. **Fix:** compose the two
(`` `${ariaLabel}: ${value} out of ${max} stars` ``).

### 221 · SearchInput — `disabled` protects the typing, not the value (med)

`disabled` and `readOnly` stay in `...props` and are spread onto the `<Input>` only. The clear
`<button>` is rendered on `{value && …}` alone and is never disabled. Measured:
`<SearchInput value="oklch" onChange={fn} disabled />` renders `input.disabled === true` and
`button.disabled === false`; clicking the X fires `onChange("")` **and** `onClear()`. `readOnly`
behaves identically, and Escape clears a `readOnly` field too. The one destructive action on the
control is the one `disabled` does not cover, with no type-level hint that it won't.
**Fix:** destructure `disabled`/`readOnly` out of `...props` and gate both the button render and
`handleClear` on `!disabled && !readOnly`.

### 222 · SearchInput — a hard-coded `aria-label` silently defeats your `Label` (med)

`aria-label="Search"` is set unconditionally at line 55. `aria-label` outranks an associated
`<label for>` in the accessible-name computation, so the documented wiring does nothing. Measured
with `dom-accessibility-api`: `<Label htmlFor="q">Search orders</Label>` beside
`<SearchInput id="q" …/>` computes a name of `"Search"`. Every instance on a page therefore
shares one untranslated English name, and a page with two search fields has two identically named
searchboxes. `aria-labelledby` does win (measured `"Search orders"`), so there is a workaround —
but only for callers who know to reach for it. **Fix:** default `aria-label` only when neither
`aria-label` nor `aria-labelledby` was supplied, and prefer no default at all when an `id` is
given. An instance of the hard-coded-English pattern with a second, worse consequence.

### 223 · SearchInput — the clear button vanishes under the focus it holds (med)

The button only renders while `value` is truthy, so activating it unmounts it. Measured: Tab to
the clear button and press Enter — `value` becomes `""`, the `{value && …}` branch removes the
button, and `document.activeElement` is `document.body`. The next Tab restarts at the top of the
document rather than continuing after the field (WCAG 2.4.3). **Fix:** refocus the input inside
`handleClear` through the forwarded ref, or render the button always and hide it with
`visibility`.

### 224 · SearchInput — one Escape clears the field *and* closes the dialog (med)

`handleKeyDown` calls `handleClear()` on Escape and then neither `preventDefault()` nor
`stopPropagation()`. Measured: an ancestor `onKeyDown` receives the event with
`defaultPrevented === false`. Inside `Dialog` — a native `<dialog>` opened with `showModal()` and
closed by the browser's Escape close request — typing a query and pressing Escape both empties the
box and dismisses the dialog, so the user loses the search *and* the surface it was on. **Fix:**
call `e.preventDefault()` when the field actually had content, so the first Escape only clears.

### 225 · SearchInput — the clear affordance is below the graphical-contrast floor (med)

`.search-input__clear` inks `--C-TEXT-MUTED` on the field's `--C-SURFACE-0` fill. Computed from
the shipped OKLCH values: **2.54:1** default, **2.45:1** `events`, **2.59:1** `grimdark`,
**2.10:1** `tech` — all under the WCAG 1.4.11 3:1 minimum, and the glyph is the control's only
visual affordance. The ink reaches `--C-TEXT-PRIMARY` on `:hover` only, not on `:focus-visible`,
and the hover wash (`--C-SURFACE-2` on `--C-SURFACE-0`) is **1.10:1**, so the wash contributes
nothing. **Fix:** ink it `--C-TEXT-SECONDARY` at rest (measured 7.56 / 7.40 / 5.76 / 5.95:1 on the
same fill), or give the button a border.

### 231 · NumberInput — the steppers throw away what you just typed (med)

`stepBy` seeds from `currentValue ?? min ?? 0` — the last *committed* value — and never consults
the draft, while both buttons `preventDefault` on `pointerdown` so the input never blurs and never
commits first. Measured: a field committed at `1`, type `99` (draft only), click the up chevron →
emits `2` and displays `"2"`; the typed `99` is gone. ArrowUp/ArrowDown do the same.
**Fix:** seed `stepBy` from `parseDraft(draft) ?? currentValue ?? min ?? 0`.

### 232 · NumberInput — a controlled `value` is not actually controlled (med)

`commit`/`stepBy` write the draft locally and reconciliation runs only when the `value` prop
*changes* (`prevValueRef.current !== currentValue`). A parent that declines to adopt the emitted
value never triggers it. Measured: `<NumberInput value={5} onValueChange={noop} />`, one press of
the up chevron → the field displays `"6"` **permanently** while the prop and `aria-valuenow` stay
`5`. Visible text and accessible value disagree forever, which is worse than either being wrong.
**Fix:** when controlled, derive the draft from the incoming value rather than `setDraft`-ing
unconditionally, or compare `parseDraft(draft)` to `value` on every render.

### 233 · NumberInput — `readOnly` stops the keyboard but not the buttons (med)

`readOnly` reaches the `<input>` through `...props` and blocks typing, but neither `stepBy` nor
the ArrowUp/ArrowDown branches consult it. Measured:
`<NumberInput readOnly defaultValue={3} onValueChange={fn} />` — clicking the up chevron emits
`4`, and ArrowUp then emits `5`. No `aria-readonly` is set either, so assistive tech is not told
the field is meant to be immutable. **Fix:** return early from `stepBy` and the arrow branches
when `readOnly`, and pass `aria-readonly`.

### 238 · OTPInput — `onComplete` latches and then reports a stale code (high)

`completedRef` is a boolean. Once a complete code fires `onComplete`, the ref stays `true` and
every later commit that is *still complete* takes the `if (!completedRef.current)` false branch.
Measured on a 3-box control: type `123` → `onComplete("123")`. Correct the first digit to `9` →
`onValueChange("923")` fires, but `onComplete` has still only ever been called with `"123"`.
Re-pasting `5678` over a complete `1234` behaves identically. A verification screen whose submit
path is `onComplete` — the pattern the prop's name and signature invite — therefore deadlocks on a
code the user can see is correct; the only escape is to clear a box (unlatching the ref) and
retype. **Fix:** store the last-fired serialised value in the ref instead of a boolean, and fire
whenever a complete value differs from it.

### 239 · OTPInput — a multi-character value in one box loses all but the last character (med)

`handleChange` takes `filtered[filtered.length - 1]` unconditionally. Measured:
`fireEvent.change(box0, { value: "123456" })` on a six-box control yields
`["6","","","","",""]` and emits `"6"` — five of six digits dropped. `onPaste` spreads correctly,
but platform SMS autofill for the `autoComplete="one-time-code"` hint the component sets on box 0
delivers an *input* event, not a paste. **Caveat:** the autofill consequence is inferred, not
observed — `maxLength={1}` may truncate first on a real device (yielding `"1"` instead of `"6"`),
which is broken either way but by a different mechanism. Needs a device test.
**Fix:** when `filtered.length > 1`, spread across slots from `index` exactly as `handlePaste`
does.

### 240 · OTPInput — Delete and cut are silently ignored (med)

`handleChange` returns early when the filtered string is empty, and `handleKeyDown` implements
only Backspace / ArrowLeft / ArrowRight. Measured: with box 1 holding `"2"`, pressing
<kbd>Delete</kbd> or <kbd>Ctrl</kbd>+<kbd>X</kbd> leaves the box showing `"2"` and calls
`onValueChange` **zero** times — the controlled input simply re-renders the old character with no
feedback at all. Backspace is the only way to clear a box, which is not what any user assumes.
**Fix:** treat an empty filtered string as a clear of that slot rather than an early return.

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

### 245 · TagInput — the binding the docs advertise crashes the component (high)

`{...props}` at line 204 is spread **after** the element's own `onChange={handleChange}`, so a
caller-supplied `onChange` replaces the internal handler entirely. `onChange` is `Omit`ted from
`TagInputProps`, which removes the compile-time warning without removing the runtime behaviour, and
JSX spread of a typed object skips excess-property checking. Measured end to end:
`<TagInput {...form.field<string[]>("tags")} />` — the exact binding **`AGENTS.md:249` and
`README.md:203` both advertise for TagInput** — typechecks with zero errors under the project's own
`tsconfig`, renders fine, and then the first keystroke sends a raw DOM `ChangeEvent` to the form
store, which writes the string `"t"` into the array-typed field; the next render throws
`TypeError: tags.map is not a function`. Nothing about the failure points at the spread.
**Fix:** destructure `onChange` out of the props — it is already `Omit`ted from the type — so
`{...props}` cannot override `onChange={handleChange}`. Then either make the advertised binding
work or stop advertising it.

### 246 · TagInput — `name` submits the draft, not the tags (med)

`name` passes through `...props` to the inner `<input>`, whose value is the in-progress draft
text. Measured: `<form><TagInput name="tags" defaultValue={["react","typescript"]} /></form>` then
`new FormData(form)` yields `[["tags", ""]]` — the two tags are not in the submission at all, and
a half-typed draft would be submitted in their place. There is no hidden input per tag.
**Fix:** render a hidden `<input type="hidden" name={name}>` per tag and keep `name` off the
visible draft field.

### 247 · TagInput — every silent rejection destroys the user's typing (med)

`commitDraft` clears the draft whenever `evaluate` produced no *message*, which covers three
rejection paths that produce none: the `maxTags` cap, a duplicate, and `validateTag` returning
`false`. Measured: `<TagInput maxTags={1} defaultValue={["react"]} />`, type `typescript` and press
Enter → the input is emptied, no chip is added, no message appears, nothing on screen changes.
`validateTag={() => false}` behaves identically. The user cannot tell rejection from a dropped
keystroke. **Fix:** clear the draft only when a tag was actually appended.

### 248 · TagInput — a delimiter typed mid-string discards the tail (med)

`handleChange` commits `raw.split(delimiter)[0]` and then `setDraft("")`, so everything after the
first delimiter is thrown away rather than returned to the draft. Measured: draft `"abc"`, caret
placed after `"a"`, user types `","` → `raw` is `"a,bc"`; tags become `["a"]` and the input is
emptied — `"bc"` is gone. **Fix:** commit every segment and put the trailing remainder back into
the draft instead of blanking it.

### 249 · TagInput — paste wipes the draft and swallows validation messages (med)

`handlePaste` reads only `{ tag }` from `evaluate`, never `{ message }`, and ends with
`setDraft("")` regardless of outcome. Measured with
`validateTag={(t) => t.length > 3 || "Tags must be at least 4 characters"}`: type `"reac"`, then
paste `"js, ts"` → zero tags added, draft wiped to `""`, and the live region still empty. The user
loses their typing and is told nothing about why the paste added nothing.
**Fix:** merge the draft into the first pasted segment, and surface the first message the loop
produces.

### 250 · TagInput — a `g`- or `y`-flagged `delimiter` mutates the caller's RegExp (med)

Both `handleChange` and `handlePaste` call `delimiter.test(...)` on the `RegExp` object the caller
passed. `RegExp.prototype.test` advances `lastIndex` on a global regex and only matches at
`lastIndex` on a sticky one, so the component silently carries state between keystrokes on an
object it does not own. Measured, typing `ab;` `cd;` `ef;` into a fresh field:

| `delimiter` | tags committed | draft after each keystroke | `lastIndex` left behind |
| --- | --- | --- | --- |
| `/;/` | `["ab","cd","ef"]` | `""`, `""`, `""` | `0` |
| `/;/g` | `["ab","ef"]` | `""`, `"cd;"`, `""` | `3` |
| `/;/y` | `[]` | `"ab;"`, `"cd;"`, `"ef;"` | `0` |

Under `/;/g` the second `;` is tested from index 3, matches nothing, resets `lastIndex` to 0, and
leaves the raw text `"cd;"` — delimiter included — in the field, where the next successful commit
destroys it. `/[,\n]/g` reproduces identically. The paste path alternates the same way, falling
through to an ordinary un-split paste on every other attempt. The prop type is a bare `RegExp`
with nothing to warn a caller off `/[,;]/g`, which is a natural thing to write.
**Fix:** normalise internally — `new RegExp(delimiter.source, delimiter.flags.replace(/[gy]/g, ""))`
— or test with `delimiter.source` rather than the caller's object. Documented as a gotcha in
`tag-input.md`. (Recorded here because an earlier pass reported this hazard as *not reproducing*;
it does, but only from the second delimiter onward, which is why a single-keystroke probe misses
it.)

### 251 · TagInput — the chip's remove glyph misses the 3:1 graphical floor (med)

The X inks `--C-TEXT-MUTED` on the chip's `--C-SURFACE-2` fill. Computed from the shipped OKLCH
values: **2.31:1** default, **2.27:1** `events`, **1.94:1** `tech`, **2.23:1** `grimdark` — under
the WCAG 1.4.11 3:1 floor in every shipped theme. Only `hover:text-fg-primary` clears it, which
does nothing for keyboard or touch users. The chip *label* on the same fill is fine
(`--C-TEXT-SECONDARY`, measured 6.87 / 6.87 / 5.32 / 5.11:1), so the fix is local and cheap.
**Fix:** ink the glyph `text-fg-secondary`.

### 252 · TagInput — the tag set changes in silence (med)

The only `aria-live` region on the component is bound to the validation `message`, and the chips
render as `<span>`s inside a `<div>`. Measured with three tags: `queryAllByRole("listitem")` and
`queryAllByRole("list")` are both **0**, and the single live region's text content is `""`.
So committing with Enter, deleting with Backspace, pasting, and clicking a remove button all
mutate the list with no announcement and no structure to navigate. Backspace is the sharpest edge
— with an empty draft every press deletes a chip outright, with no confirmation step and no
feedback. **Fix:** mirror tag-count changes into the polite region, and render the chips as a
labelled `<ul>`/`<li>`.

### 256 · form-store — array mutations strand validation errors at the old index (high)

`commitArray` rewrites `values` and re-keys `arrayIds`, but `schemaErrors`, `manualErrors` and
`touched` are keyed by dotted path (`links.0.url`) and are never re-indexed. Measured on a two-row
form whose row 0 is invalid: submit → one `"URL is required"` message rendered. Remove row 0 → the
surviving row is the *valid* one (`"https://example.com"`), yet the message is still rendered
under it **and** that row's `<input>` now carries `aria-invalid="true"`. Reorder is symmetric:
after Move down on row 0 the values are `["https://example.com", ""]` while `aria-invalid` reads
`["true", null]` — the error stayed at index 0 and is now attached to the valid row while the
genuinely invalid one looks clean. It self-corrects only when validation next runs (a keystroke
under the default `reValidateMode: "onChange"`, or the next submit), so the wrong state is
visible for exactly as long as the user does nothing. Surfaced through `Repeater`, but the defect
is in the store and affects every consumer of `useFieldArray`.
**Fix:** re-index `schemaErrors` / `manualErrors` / `touched` inside `commitArray` alongside
`arrayIds`.

### 257 · Repeater — removing a row drops focus to the body (med)

The Remove button lives inside the row it unmounts. Measured: render two rows, Tab to row 1's
`"Remove item"` and press Enter → `document.activeElement === document.body`, so the next Tab
restarts from the top of the page. Nothing is announced either (see #262).
**Fix:** after a remove, focus the next row's remove button — or the Add button when the list
empties.

### 258 · Repeater — `disabled` disables the chrome, not the form (med)

`disabled` is threaded onto Repeater's own Add / Remove / Move buttons and nowhere else, and
`RepeaterItem` exposes no `disabled` for a render prop to forward. Measured: `<Repeater disabled>`
with an `Input` bound through `form.field()` — Add and Remove report `disabled === true`, the
row's `<input>` reports `disabled === false` and still accepts typing. A caller reading the prop
name reasonably expects the whole group to go inert; freezing the fields actually requires
`useForm`'s own `disabled` option, which is documented nowhere near this prop.
**Fix:** thread `disabled` onto `RepeaterItem` so the render prop can forward it, and say in the
prop's docblock that field disabling lives on `useForm`.

### 259 · Repeater — every row's buttons share one accessible name (med)

`"Move up"`, `"Move down"` and `"Remove item"` are hard-coded English literals with no prop to
change them; `addLabel` is the only configurable string on the component. Measured: five rows
produce five buttons all named `"Remove item"`, giving a screen-reader user nothing to tell them
apart, and no route to localisation. The page's own guidance — put `index + 1` in the row's
visible `Label` — is a workaround, not a fix.
**Fix:** accept per-row label props (or a `labels` object) and interpolate the row index. An
instance of the hard-coded-English pattern named for #39/#64.

### 263 · MultiSelect — the rest-spread names the wrapper, not the combobox (med)

`{...props}` is applied to the outer `<div class="multiselect">`; the input receives only what
the component itself passes through `getReferenceProps`, and `aria-label` is the sole naming prop
in that list. Measured with `<MultiSelect id="skills" aria-labelledby="lbl" aria-label="Skills"/>`:
the wrapper reads `id="skills" aria-labelledby="lbl"`, the input reads `id=null`
`aria-labelledby=null`. So the `<Label htmlFor>` + `id` pattern that `select.md`, `input.md` and
`tag-input.md` all document does not work here, and dropping `aria-label` leaves the combobox with
no accessible name at all. (`name` is *not* part of this: it is absent from a `div`'s prop type, so
it does not compile — see the batch-J note above.)
**Fix:** destructure `id` / `aria-labelledby` out and forward them through `getReferenceProps`.

### 264 · MultiSelect — the keyboard highlight is invisible (med)

`.multiselect-item[data-active]` sets a `--C-SURFACE-1` background and nothing else — no border,
no ink change, no outline — over the listbox's `--C-SURFACE-0`. Computed from the shipped OKLCH
values: **1.05** default, **1.03** `events`, **1.02** `tech`, **1.07** `grimdark`. Measured
interaction: open the list and press ArrowDown → `aria-activedescendant` correctly becomes
`…-option-0` and `data-active` lands on the right row, and nothing visibly changes. Navigation is
`virtual: true`, so no option ever takes DOM focus either; there is no second cue. WCAG 1.4.11
asks 3:1 of a focus indicator. Same defect as #275 in the sibling `Combobox`.
**Fix:** give `[data-active]` an accent fill or a ≥3:1 inset border, not an adjacent surface step.

### 265 · MultiSelect — the list cannot be closed from the control, and blur does not dismiss it (med)

The control's `onClick` is `if (!open) setOpen(true); inputRef.current?.focus();` — it never
toggles — and the chevron is a `<span>` *inside* that control, which is also the floating
reference, so `useDismiss`'s outside-press check never fires for it. Measured: click the control
(open), click the chevron (still open), click the control again (still open). `useDismiss` alone
handles no focus-out either — measured with a following `<button>`, Tab moves focus to it and the
portalled listbox stays mounted over the page. Only Escape or an outside pointer press closes it,
so the chevron looks like a toggle and is not one, and a form full of these can strand panels.
**Fix:** toggle on control click, and add focus-out dismissal alongside `useDismiss`.

### 266 · MultiSelect — `Enter` with nothing highlighted submits the form (med)

`handleKeyDown` calls `event.preventDefault()` only inside the `Enter && open && activeIndex != null`
branch. Opening by *click* leaves `activeIndex` null (measured: `aria-activedescendant` is null
after a control click; only ArrowDown seeds it). Measured in a `<form onSubmit>`: click the
control, press Enter → **one submit fired**, with the menu still open. A user pressing Enter to
"confirm" their chips submits the form instead.
**Fix:** `preventDefault()` whenever the list is open, not only when a toggle happens.

### 267 · MultiSelect — removing a chip drops focus to the body (med)

The chip's × unmounts itself on click and the handler does not restore focus. Measured: select two
skills, focus the input, click the × on the first chip → `document.activeElement === document.body`,
so the next Tab restarts from the top of the document. The *option* click path gets this right —
it calls `inputRef.current?.focus()` — the remove handler simply omits the same call, which makes
the fix a one-liner. Instance of the pattern named for #257.
**Fix:** focus the input after `removeAt`.

### 275 · Combobox — keyboard navigation has no perceptible indicator (high)

`.combobox-item[data-active]` is a `--C-SURFACE-1` background on the popup's `--C-SURFACE-0`:
**1.02–1.07:1** across all four shipped themes (computed from the shipped OKLCH values). Because
`useListNavigation` runs with `virtual: true`, no option ever takes DOM focus, so there is no
focus ring behind it — the background *is* the whole indicator. Measured: open the list, press
ArrowDown three times, and nothing on screen changes while `aria-activedescendant` walks correctly
down the rows; Enter then selects a row the user could not see was highlighted. Screen-reader users
are fine and sighted keyboard users are not, which is why this rates above its `MultiSelect` twin
(#264): `Combobox` is the library's primary long-list control.
**Fix:** give `[data-active]` an accent fill or a ≥3:1 inset border rather than the adjacent
surface step.

### 276 · Combobox — the chevron toggle can never close the popup (med)

The toggle `<button>` sits in `.combobox-input-wrap` beside the input, and the input alone is the
floating reference — so a `pointerdown` on the button is "outside" and `useDismiss` closes the
popup, which flushes synchronously (discrete event), and the button's `onClick` then reads
`open === false` and re-opens it. Measured with an `onOpenChange` spy: type to open, click the
chevron (`aria-label="Close"`) → the listbox is still present and the spy recorded
`[[false], [true]]`. A controlled consumer therefore sees a spurious close/open pair on every click.
**Fix:** register the toggle as part of the floating reference, or read `open` from a ref inside
`onClick`, so dismiss and toggle stop fighting.

### 277 · Combobox — `loading` counts options it does not render (med)

`ComboboxContent` computes `countItems(children)` *before* the `loading ? <Spinner/> : children`
swap and reports that number to `registerRenderedCount`, which resets `activeIndex` to `0`.
Measured with `loading` set: the input carries `aria-activedescendant="<id>-option-0"` while
`document.getElementById(...)` returns `null` and `screen.queryAllByRole("option").length === 0`.
Every async combobox in the library is in this state for the whole duration of the request.
**Fix:** `registerRenderedCount(loading ? 0 : itemCount)`.

### 278 · Combobox — mouse selection leaves focus on `<body>` (med)

`selectValue` sets state and closes the popup but never returns focus to the input, and the option
is a non-focusable `<div>`, so the pointerdown blurs the input and nothing catches it. Measured:
focus the input, click an option → `document.activeElement` is `BODY`, so the next Tab restarts
from the top of the document. Keyboard selection is unaffected — measured `INPUT.combobox-input`
after Enter. Instance of the pattern named for #257. (Measured in jsdom; the mechanism holds in
browsers, but the exact resting element could differ.)
**Fix:** refocus `refs.domReference` in `selectValue`, or `preventDefault` on the item's
`onMouseDown`.

### 279 · Combobox — nothing dismisses the popup when focus leaves (med)

Only `useDismiss` is registered (outside press + Escape); there is no `useFocus`, no focus-out
handling, and no `FloatingFocusManager`. Measured: type to open, press Tab → focus is on the next
control, the portalled listbox is **still mounted**, and the now-unfocused combobox still reports
`aria-expanded="true"`. Same defect as #265 in `MultiSelect`, so it is the floating-form pattern
rather than one component.
**Fix:** add focus-out handling alongside `useDismiss`.

### 285 · ColorPicker — the library's own `form.field()` binding compiles into a dead control (high)

`ColorPickerProps` is a closed object type with no rest spread. A JSX spread of a *call result* is
not excess-property-checked, so `<ColorPicker {...form.field<string>("brandColor")} />` compiles
silently — verified with `tsc --noEmit`, zero diagnostics — while writing the same props as literal
attributes (`onChange`, `name`) is a hard error. At runtime `value` and `disabled` are honoured and
`onChange`, `onBlur`, `name`, `ref` and `aria-invalid` are dropped, so the store never hears about
an edit and the controlled `value` never moves: the picker renders, opens, and can never change.
The failure is invisible in every direction — the compiler is quiet, the component renders, and
nothing warns. `AGENTS.md` and `README.md` both advertise this binding idiom. Same class as #245
(`TagInput`), opposite mechanism: there the spread *replaces* a handler, here it is *swallowed*.
**Fix:** accept the `FieldBindings` surface (`name`/`onChange`/`onBlur`) the way the other
controlled components do, or name `ColorPicker` in `AGENTS.md`'s watch/`setValue` exception list
beside `Checkbox` and `Switch`.

### 286 · ColorPicker — the selected colour is never announced (med)

The trigger's `aria-label` (default `"Choose color"`) overrides its text content in the
accessible-name computation, the `#rrggbb` readout is a plain `<span>` inside the button, and the
swatch is `aria-hidden`. Measured with `<ColorPicker defaultValue="#3366cc" aria-label="Brand color"/>`:
the computed name is exactly `"Brand color"`, and a query for a button named `/3366cc/` finds
nothing. The one thing a sighted user reads off the control is the one thing a screen-reader user
never hears, and the only workaround is for the caller to interpolate the hex into `aria-label`
themselves.
**Fix:** append the committed hex to the computed name, or expose the value node through
`aria-describedby`, instead of letting the label override it.

### 287 · ColorPicker — the saturation/brightness square is a slider with no value (med)

Measured rendered attributes on `.colorpicker-sv`: `role="slider" tabindex="0" aria-label`
`aria-valuetext` — and `aria-valuenow`, `aria-valuemin`, `aria-valuemax` are all **null**. ARIA
requires `aria-valuenow` for `role="slider"`; without it screen readers commonly announce a
valueless slider (often "0"). It also models two independent axes as a single slider, so left/right
and up/down move different quantities under one name. `aria-valuetext` carries the real
information, but only for AT that reads it.
**Fix:** emit `valuenow`/`valuemin`/`valuemax` (saturation as the value), or split into two
labelled sliders inside a named group.

### 288 · ColorPicker — an unparseable preset is clickable and commits nothing (med)

`presets.map` falls back to the raw string when `normalizeHex` returns null, so the swatch renders
and the browser paints whatever CSS understands. Measured with `presets={["rebeccapurple", "#ff0000"]}`:
the first renders `background-color: rebeccapurple`, is labelled `"rebeccapurple"`, and clicking it
produces **zero** `onValueChange` calls, while the hex preset fires normally. There is no warning
and no visual difference — a dead button that looks exactly like a live one.
**Fix:** filter presets through `normalizeHex` at render and drop (or warn on) the failures instead
of falling back to the raw string.

### 289 · ColorPicker — a controlled picker desynchronises permanently (med)

HSV is internal state and moves regardless of whether the parent accepts the commit; the effect
that re-seeds it is keyed on `[hex]`, which by definition never changes when the parent ignores
`onValueChange`. Measured with `<ColorPicker value="#3366cc"/>` and no write-back, two ArrowRights
on the square: the trigger still reads `#3366cc` while the hex field reads `#2b61cc` and the thumb
has moved. Nothing ever reconciles the two, for the life of the component.
**Fix:** reconcile during render against the committed hex rather than only in an effect that
fires on prop change.

### 295 · RangeSlider — the invalid state never reaches the focused control (med)

`aria-invalid` is written on the wrapper `<div>` as a CSS hook and nowhere else. Measured with
`<RangeSlider error defaultValue={[20,80]} minLabel="Low" maxLabel="High"/>`: the root reads
`aria-invalid="true"`, and both `<input type="range">` elements read `aria-invalid = null`. The
control a user actually focuses therefore never reports itself invalid, and what remains of the
error state is the fill and thumbs turning `--C-STATUS-ERROR` — status by colour alone (WCAG 1.4.1).
**Fix:** put the invalid flag on both inputs, keeping the wrapper attribute as the CSS hook.

### 296 · RangeSlider — the Field's error text is referenced by nothing (med)

`useFieldErrorProps` returns `{ "aria-invalid", "aria-describedby" }` and the component destructures
only the first. Measured inside `<Field error="Pick a narrower window."><RangeSlider/><FieldError/></Field>`:
the error `<p id="_r_0_-error" role="alert">` renders, and a query for `[aria-describedby]` anywhere
in the subtree returns **zero elements** — not on the wrapper, not on either input. So an invalid
range slider is, to a screen reader, an ordinary one. This is what makes RangeSlider the
"wired-but-partial" case in the field-error pattern above; `field.md` claimed all eleven hook
consumers forward both attributes and has been corrected.
**Fix:** forward the whole `fieldErrorProps` object onto both inputs.

### 297 · RangeSlider — collided thumbs bury one of the two (med)

`pointer-events` is confined to the thumbs, so where two thumbs overlap exactly the pointer always
grabs whichever input is stacked higher, and the stacking is decided by a static heuristic:
`lowOnTop = activeThumb === "lo" || (activeThumb === null && lo > (min + max) / 2)`. Measured on a
0–100 scale: `value={[30,30]}` → both inputs `style.zIndex === ""`, so DOM order puts the *upper*
input on top and the lower thumb cannot be dragged; `value={[70,70]}` → the low input gets
`zIndex: "4"` and the *upper* thumb cannot be dragged. Both branches bury one thumb; the midpoint
only chooses which. It frees itself once the reachable thumb is dragged away, and the keyboard
reaches both throughout, but to a pointer user the control reads as stuck.
**Fix:** choose the top thumb from the pointer's position (nearest value at `pointerdown`) rather
than from `lo > (min + max) / 2`.

### 298 · RangeSlider — no per-thumb ARIA is reachable from outside (med)

The props type is `Omit<ComponentPropsWithRef<"div">, …>` and `{...props}` lands on the wrapper,
while the two inputs get only `min`, `max`, `step`, `value`, `disabled` and their `aria-label`
(measured attribute list: `class, min, max, step, aria-label, type, value`). So
`<RangeSlider min={-30} max={10} aria-valuetext="minus 20 degrees" id="temp"/>` puts both attributes
on the wrapper and `null` on both inputs. `aria-valuetext` is the one attribute that fixes a
non-percentage announcement, and there is no route to it; `minLabel`/`maxLabel` are the entire
per-thumb ARIA surface.
**Fix:** expose per-thumb prop bags, or at minimum forward `aria-valuetext` and `aria-describedby`
to each input.

### 302 · Wizard — step content is unkeyed, so state bleeds between steps (high)

The panel renders `<div className="wizard__content">{active?.content}</div>` at a fixed position
with no `key`, so React reconciles the outgoing step's content against the incoming one. Any two
steps whose `content` share a root element or component type keep the *same fiber*. Measured with
two steps each holding an `<input>`: type `"ada@example.com"` into step one's field, press Next →
step two's differently-labelled input renders carrying `"ada@example.com"`. The same happens
through a `Field` + `Input` pair, and a `useState` counter sitting at 2 on step one reads 2 on step
two. This is silent, data-dependent (two `<Text>` steps look fine; two forms do not), and it leaks
one step's user input into another — the worst case being a wizard whose steps are structurally
similar, which is most of them.
**Fix:** key the panel on the active index — `<div className="wizard__content" key={wizard.activeStep}>`.

### 303 · Wizard — `onComplete` cannot be refused and re-fires indefinitely (med)

`next()` calls `setActiveStep(activeStep + 1)` and then `if (activeStep >= count - 1) onComplete?.()`
in the same call, with no check that the change was accepted. Measured with
`<Wizard step={s} onStepChange={n => setS(Math.min(n, steps.length - 1))} onComplete={submit}/>` on
the last step: the clamp keeps `activeStep` at `count - 1`, so `isComplete` never becomes true,
Finish is never disabled, and **three clicks produced three `submit` calls**. Refusing the change
outright behaves the same way. The component's own docblock (`Wizard.tsx:117`) tells callers to
"gate `onStepChange`/`onComplete` on your own checks", which is not possible today — and the
defensive-looking `Math.min` clamp is exactly what triggers it.
**Fix:** fire `onComplete` only when the resolved index actually advanced past `count - 1`.

### 304 · Wizard — `aria-*` and `data-*` compile and then vanish (med)

`Wizard` destructures its eleven props and spreads no rest onto the root. TypeScript exempts
hyphenated JSX attribute names from excess-property checking, so `aria-*` and `data-*` typecheck
while `id` and `ref` are correctly rejected (verified both ways with `tsc`). Measured:
`<Wizard steps={steps} aria-label="Checkout" data-testid="checkout"/>` renders a root whose entire
attribute list is `class="wizard"`. The flow therefore cannot be named for assistive tech, and
cannot be targeted by a test hook or an analytics selector, with nothing anywhere reporting the
loss. Same family as #9/#10 (types advertising props the runtime drops), reached by the opposite
route: here the type never promised them, the compiler just declined to object.
**Fix:** accept and spread `...rest` onto the root, or `Omit`-type the props so the compiler
rejects them.

### 305 · Wizard — a step change is silent and focus does not move (med)

The panel is a bare `<div class="wizard__content">` — measured attribute list: `class`, and nothing
else. No `role`, no `aria-live`, no `id`, not focusable, and no association with the header the way
`Tabs` associates a panel with its tab. Measured after clicking Next: the content swaps and focus
stays on the Next button, which sits *after* the panel in DOM order — so a screen-reader user gets
no announcement and has to navigate backwards to discover what changed. In the completed state no
element carries `aria-current` either (every marker reads done), so "where am I" has no answer.
**Fix:** give the panel an `id` plus `role="group"`/`aria-labelledby` pointing at the active step's
title, or move focus to it on change.
