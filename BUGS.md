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
- **Status by colour alone (WCAG 1.4.1).** `Alert` and `Meter` encode severity purely in
  tint — no icon/label/ARIA. Check Badge, StatCard.Trend, any status surface.
- **Theme/contrast token gaps.** `Card` (no paired text colour; wrong surface layer),
  `Checkbox` (focus-ring offset hard-codes white). Check anything painting a surface or a
  ring.

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

### 27 · Input — hook without `"use client"` (med · caveat)

`Input` imports and calls `useFieldError` from `./Field` but ships no `"use client"`
directive, so a React Server Component importing it directly would fail. **Caveat:**
`verify-directives` passes on it — which means either the hook is context-only (tolerated) or
the directives guard doesn't model context-only hooks. Audit both the component *and* the
guard's coverage.
