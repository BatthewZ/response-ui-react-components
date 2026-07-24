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
- **Status by colour alone (WCAG 1.4.1).** `Alert`, `Meter` and now **`Badge` (confirmed,
  #44)** encode severity purely in tint — no icon/label/ARIA. Three for three on the status
  surfaces audited so far. Check StatCard.Trend and any remaining status surface.
- **Continuous motion with no `prefers-reduced-motion` guard.** ~25 component CSS files ship
  a reduced-motion block and `src/hooks/use-reduced-motion.ts` exists, but utility-driven
  motion bypasses all of it: `Spinner`'s `animate-spin` (#38) is unguarded, as is
  `IconButton`'s `active:scale-95` (#43). The gap is specifically **Tailwind animation/
  transform utilities**, not the hand-written CSS. Sweep for `animate-`, `scale-`,
  `transition` utilities with no `motion-reduce:` sibling.
- **`<button>` with no explicit `type`.** A bare `<button>` is `type="submit"`. `IconButton`
  sets no default (#41) and `Toast`, `Pagination` and `Carousel` all call it without one, so
  each submits an enclosing form. `CopyButton`, `Repeater`, `DatePicker` and Pagination's own
  page-number button get it right — the library is split against itself. Sweep every `<button>`.
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

**Clean (no findings):** Button, Tabs, Divider, Grid, Center, Container, Row, Spacer,
Textarea, Label, FieldError, ProgressRing. (Not proof of correctness — just nothing surfaced.)

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
