# ScrollReveal

Reveals its children with an entrance animation the first time they scroll into
view — wrap a heading, a section, a row of cards, and it fades or slides in on
approach. It watches the element with an `IntersectionObserver`, honours
`prefers-reduced-motion`, and re-times itself from the theme's motion tokens.

<!-- example:Minimal -->
```tsx
<ScrollReveal>
  <h2>Built for teams that ship on Fridays</h2>
</ScrollReveal>
```
<!-- /example -->

| Prop         | Type                                                                  | Default   |
| ------------ | --------------------------------------------------------------------- | --------- |
| `animation`  | `"fade-up" \| "fade-in" \| "fade-left" \| "fade-right" \| "scale" \| "none"` | `"fade-up"` |
| `threshold`  | `number` — fraction of the element visible before it fires            | `0.1`     |
| `delay`      | `number` — milliseconds to offset the start                           | `0`       |
| `once`       | `boolean` — reveal once, or replay on every re-entry                   | `true`    |
| `rootMargin` | `string` — `IntersectionObserver` root margin                         | `"0px"`   |
| `animate`    | `boolean` — run the reveal at all; `false` renders visible content      | `true`    |
| `as`         | `ElementType`                                                         | `"div"`   |
| `className`  | `string`                                                              | —         |
| `children`   | `ReactNode`                                                           | —         |
| `ref`        | `Ref<HTMLElement>`                                                    | —         |

The `as` generic types the rendered element's whole prop set onto the component, and those
props reach the DOM: `id`, `style`, `onClick`, `aria-*` and `data-*` all land. Four are
merged with the component's own rather than replacing them — see [Gotchas](#gotchas).

## Animations

Every animation fades. The directional ones (`fade-up`, `fade-left`, `fade-right`)
also slide a short distance as they fade — `fade-left` travels leftward, entering
**from the right**, and `fade-right` mirrors it. `scale` grows from 90% to full size.

<!-- example:Animations -->
```tsx
<ScrollReveal animation="fade-up">Slides up as it enters</ScrollReveal>
<ScrollReveal animation="fade-in">Fades in without moving</ScrollReveal>
<ScrollReveal animation="fade-left">Slides in from the right</ScrollReveal>
<ScrollReveal animation="fade-right">Slides in from the left</ScrollReveal>
<ScrollReveal animation="scale">Scales up as it fades in</ScrollReveal>
```
<!-- /example -->

## Stagger a group

There is no [Stagger](stagger.md)-style orchestration built in — `delay` is a plain per-element
offset. Give a set of siblings increasing delays and they cascade in. For an
index-driven cascade over a list, reach for [Stagger](stagger.md) instead.

<!-- example:Staggered -->
```tsx
<ScrollReveal delay={0}>Ship faster</ScrollReveal>
<ScrollReveal delay={100}>Review in context</ScrollReveal>
<ScrollReveal delay={200}>Deploy with confidence</ScrollReveal>
```
<!-- /example -->

## Replay on re-entry

By default the reveal runs once and then stops observing. Set `once={false}` and the
element re-hides when it leaves the viewport and animates again on the way back in.

<!-- example:Replay -->
```tsx
<ScrollReveal once={false}>
  <p>Animates again on each scroll back into view.</p>
</ScrollReveal>
```
<!-- /example -->

## Tune the trigger

`threshold` is the fraction of the element that must be visible before it fires, and
`rootMargin` grows or shrinks the viewport rectangle it is measured against — a
negative bottom margin, as here, delays the reveal until the element is well past
the fold.

<!-- example:TriggerTuning -->
```tsx
<ScrollReveal threshold={0.5} rootMargin="0px 0px -80px 0px">
  <p>Reveals later, once half of it has scrolled into view.</p>
</ScrollReveal>
```
<!-- /example -->

## Opting out of the reveal

The reveal's first paint is `opacity: 0`, cleared once an `IntersectionObserver` fires.
That is what stops a flash of un-animated content. Two environments never get that far,
and both are handled without you asking:

- **No `IntersectionObserver`** (an older browser, a non-DOM runtime). Nothing would ever
  clear the hidden state, so the component reveals on mount instead — statically, with no
  entrance animation, exactly as it does under `prefers-reduced-motion`.
- **Scripting switched off.** `@media (scripting: none)` in this package's stylesheet
  restores `opacity: 1` on the hidden class, so the content is legible with no JS at all.

What remains is the case the browser cannot report: scripting is *enabled* but your bundle
never executes — a failed deploy, a chunk 404, a crawler that stops at HTML. The
server-rendered markup still carries the hidden class there, and nothing clears it.
`animate={false}` is the cover for that: it removes the reveal wrapper's whole mechanism —
no hidden class, no observer, no animation class, content visible from the first paint. It
is the same opt-out [Swimlane](swimlane.md) exposes, for the same reason.

<!-- example:WithoutReveal -->
```tsx
<ScrollReveal animate={false}>
  <h2>Refund policy</h2>
</ScrollReveal>
```
<!-- /example -->

Reach for it whenever the content must always be readable, and keep the default for
decoration. The flag is the only *authored* guarantee: the two fallbacks above are runtime
detections, and neither can see a page that hydrates in principle and fails to in practice.

## Render as another element

<!-- example:AsSection -->
```tsx
<ScrollReveal as="section">
  <h2>Simple, transparent pricing</h2>
</ScrollReveal>
```
<!-- /example -->

`as` changes the tag that wraps your content, and the tag's whole prop set comes with
it — an `as="section"` can be given `aria-label`, `id`, or anything else the element
accepts. Four props merge with the component's own instead of replacing them — see the
passthrough gotcha below.

## Theme tokens

ScrollReveal hard-codes no colour and reads no token of its own. It works by toggling
animation classes from `@batthewz/response-ui-css` onto its element: the transient
`fade-up` / `fade-in` / `fade-left` / `fade-right` / `scale-in` class while it plays,
and `scroll-reveal-hidden` (a bare `opacity: 0`, no token) while it waits to be revealed.
It also sets `data-entering` for exactly the interval the entrance class is present — added on
intersection, removed on `animationend` — so a stylesheet can key an animation off the entrance
window without depending on the class. `animation="none"` reveals with the marker and **no**
entrance class, which is how [Timeline](timeline.md) owns its own alternating entrance. With
`animation="none"` the attribute is only self-clearing if your stylesheet actually animates
`[data-entering]`: with no animation there is no `animationend`, so the marker stays set for the
life of the element. Harmless — nothing else reads it — but do not treat it as "currently
animating" unless you supplied the animation.

Because the timing lives in those shared classes, the only variables to override are
the two the enter animations read — `--MOTION-DURATION-ENTER` (how long the reveal
takes) and `--MOTION-EASE-ENTER` (its easing curve). Retint either and ScrollReveal
re-times with the rest of the app. Note the trade-off: they are **shared** enter
tokens, so changing them also re-times every other enter animation in the system;
there is no ScrollReveal-only duration knob. Per-instance offset is the `delay` prop,
applied inline as `animation-delay` (with `animation-fill-mode: backwards` so nothing
flashes before a delayed start), not a token.

`threshold` and `rootMargin` are `IntersectionObserver` options, not CSS — no token
governs when the reveal fires.

`ScrollReveal.css` in this package holds exactly one rule and no token: a
`@media (scripting: none)` block that returns `scroll-reveal-hidden` to `opacity: 1`.

Two things about that one rule are worth knowing, and they pull in opposite directions.
Everywhere else, your own stylesheet now beats this package's without any ordering at all —
this package's CSS is in `@layer components`, and an unlayered rule of yours out-ranks a layered
one whatever the specificity and whatever the import order. **This declaration is the
exception:** it carries `!important`, so while scripting is off you cannot set `opacity` on
`.scroll-reveal-hidden` from a stylesheet at any specificity. It has to, because the foundation's
own unlayered `opacity: 0` would otherwise win on layer and the content would be invisible for
the life of the page — an environment where no override is meaningful. It is the only
`!important` in this component.

## Gotchas

- **Four props are merged rather than overwritten.** Everything the `as` generic types —
  `id`, `data-*`, `aria-*`, event handlers, `tabIndex` — is spread onto the rendered
  element. The exceptions are the four the component needs for itself: `className` is
  merged with the reveal's own classes, `style` is merged with the animation delay, `ref`
  is merged with the internal one, and `onAnimationEnd` is composed — the internal handler
  clears the animating state first, then yours runs. You cannot replace any of those four
  by passing your own.
- **The `style` merge only bites while a non-zero `delay` is animating.** The component
  contributes `animationDelay` and `animationFillMode` to the merged `style` *only* while
  the element is mid-animation with `delay` greater than `0` and reduced motion off — and
  `delay` defaults to `0`. So with the default, before the reveal fires, after the
  animation ends, under `prefers-reduced-motion`, or with `animate={false}`, the component
  contributes nothing and your `style` lands exactly as written, `animationDelay` included. In the one window where
  both exist the component's two properties win, which is why `delay` is the prop to reach
  for rather than hand-writing `animationDelay`.
- **No IntersectionObserver means reveal, not hide.** Where the observer API is undefined
  the component reveals on mount rather than waiting for a trigger that can never arrive —
  visible, static, no entrance animation. The same goes for a visitor with scripting
  switched off, via CSS. One case is still uncovered and cannot be detected: markup that
  reaches a browser with scripting *enabled* whose bundle never executes keeps
  `scroll-reveal-hidden` and never appears. See
  [Opting out](#opting-out-of-the-reveal); don't gate essential content behind the default.
- **The initial state is invisible.** Before the reveal fires, the element is
  `opacity: 0`. That is what prevents a flash of un-animated content, but it also means
  anything you wrap starts hidden until it scrolls into view (or reduced motion is on, or
  `animate` is `false`).
- **`delay` offsets, it doesn't orchestrate.** Staggering a group means hand-assigning an
  increasing `delay` per sibling. For an index-driven cascade, use [Stagger](stagger.md).
- **Client-only.** ScrollReveal is a `"use client"` component (it uses effects and an
  observer). The directive *is* the client boundary, so a server component can render it
  directly — but the module always ships to the browser, and the props you hand it across
  that edge have to be serializable.

## Accessibility

Under `prefers-reduced-motion: reduce` ScrollReveal opts out completely: the reveal
effect never runs, the hidden state is skipped, and the content renders visible and
static from the first paint — no motion, no delayed appearance. The animation classes
carry the same reduced-motion guard in CSS, so the content is legible even if the
observer does run.

ScrollReveal is a purely visual wrapper — it adds no role, label, or focus behaviour of
its own. Keep the real semantics on the content inside it, or put them on the wrapper:
`aria-*` reaches the rendered element, so an `as="section"` or `as="nav"` region can be
labelled by passing `aria-label` to ScrollReveal directly.

Outside reduced-motion, remember the residual case above: a missing observer and a visitor
with scripting off both resolve to visible content, but a page that *should* hydrate and
does not still shows nothing. Wrap content that must always be readable in
`animate={false}`, or don't wrap it at all.

## Related

[Stagger](stagger.md) · [Parallax](parallax.md) · [AnimatePresence](animate-presence.md) · [ViewTransition](view-transition.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
