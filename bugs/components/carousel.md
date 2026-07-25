# carousel — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

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
