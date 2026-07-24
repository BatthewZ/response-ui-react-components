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
- **Status by colour alone (WCAG 1.4.1).** `Alert`, `Meter`, **`Badge` (#44)** and
  **`Avatar`'s presence dot (#57)** encode state purely in tint — no icon/label/ARIA. **Four for
  four** on the status surfaces audited so far; treat this as the library's default failure, not
  an exception. Check StatCard.Trend and any remaining status surface.
- **Types that advertise props the runtime drops.** Beyond the `...rest` cases above,
  `Avatar` (#56) intersects `ComponentPropsWithRef<"span">` without `Omit<…, "children">`, so
  `<Avatar name="…">child</Avatar>` compiles clean and renders only the initials. `Skeleton` and
  `Spinner` get the same case right, so the fix is a known one-liner. Sweep every component whose
  props are an intersection rather than an `Omit`.
- **Hard-coded English in `sr-only` text.** `Spinner` (#39) and `Skeleton` (#64) both render a
  literal `"Loading"` in a visually hidden node while omitting `children` from the prop type, so
  the string is unreachable — and `aria-label` renames the region without changing its contents,
  leaving name and content in different languages. Any component with an `sr-only` literal.
- **Contrast is measured nowhere.** #51 is the first *measured* contrast audit in this file and
  `--C-TEXT-MUTED` fails AA on every surface of every theme. The token tables across the spokes
  say which variable paints what; nothing checks the pair is legible. A ratio guard over the
  theme files would catch this class of defect permanently.
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

> **Bookkeeping, 2026-07:** this list previously named **Button**, **Textarea** and
> **FieldError**. All three were wrong. Button carries #74 and #81; Textarea carries #81 and
> #27's exact shape; FieldError carries #27's shape. "Nothing surfaced" ages badly — a name
> here means *not yet examined closely*, not *examined and found sound*.

**Clean (no findings):** Stack, FormActions, Tabs, Divider, Grid, Center, Container, Row, Spacer,
Label, ProgressRing. (Not proof of correctness — just nothing surfaced.)

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
