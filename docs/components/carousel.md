# Carousel

A horizontally scrolling rail of slides: CSS scroll-snap does the movement, the track
drags with the mouse and a flick advances it a frame, and a pair of overlay arrow buttons
fade themselves out at each end of the rail. There is no autoplay — no timer, no
`interval` prop, nothing moves until the user moves it.

<!-- example:Minimal -->
```tsx
<Carousel title="Continue watching">
  <Carousel.Track>
    <Carousel.Item>
      <Card>Shōgun · Episode 4</Card>
    </Carousel.Item>
    <Carousel.Item>
      <Card>Ripley · Episode 2</Card>
    </Carousel.Item>
    <Carousel.Item>
      <Card>Fallout · Episode 7</Card>
    </Carousel.Item>
  </Carousel.Track>
</Carousel>
```
<!-- /example -->

**Anatomy.** `Carousel` is the root: it owns the scroll state, renders your `title`, and
paints the two arrow buttons over the rail. `Carousel.Track` is the element that actually
scrolls — it registers itself with the root through context, so the arrows and the arrow
keys have something to drive. `Carousel.Item` is one snap-aligned slide. The root also
takes the keyboard: it renders with `tabIndex={0}` and, while that tab stop holds focus, maps
<kbd>←</kbd>/<kbd>→</kbd> onto the same scroll the arrow buttons perform.

| Part              | Renders                              | Props                                          |
| ----------------- | ------------------------------------ | ---------------------------------------------- |
| `Carousel`        | `<div class="carousel" role="group">` | `title?: ReactNode` · `prevLabel?: string` — default `"Previous"` · `nextLabel?: string` — default `"Next"` (+ all `div` props except the native `title`) |
| `Carousel.Track`  | `<div role="region">`                | — (+ all `div` props)                          |
| `Carousel.Item`   | `<div role="group">`                 | — (+ all `div` props)                          |

`className`, `style`, `id`, `ref` and `aria-*` pass through on all three, and `ref` is
`HTMLDivElement` everywhere. `className` is merged with the component's own classes;
everything else is a plain rest spread placed **after** the attributes each part sets for
itself, so a prop you pass replaces the internal one — `tabIndex`, `aria-label` and
`aria-roledescription`. The root's `onKeyDown` is the exception: it now composes with the
arrow-key handler rather than replacing it. `Carousel.Track` likewise composes your
`onMouseDown`, `onDragStart` and `onClickCapture` with its own drag handling instead of
replacing them. See [Gotchas](#gotchas).

## How many slides you see at once

A slide is `width: var(--carousel-item-width, 100%)`, so out of the box you get exactly
one slide per view. Set that variable on the root and it inherits down to every item:

<!-- example:SlidesPerView -->
```tsx
<Carousel title="Trending now" style={{ "--carousel-item-width": "14rem" } as CSSProperties}>
  <Carousel.Track>
    <Carousel.Item>
      <Card>Shōgun</Card>
    </Carousel.Item>
    <Carousel.Item>
      <Card>Ripley</Card>
    </Carousel.Item>
    <Carousel.Item>
      <Card>Fallout</Card>
    </Carousel.Item>
    <Carousel.Item>
      <Card>Severance</Card>
    </Carousel.Item>
    <Carousel.Item>
      <Card>The Bear</Card>
    </Carousel.Item>
  </Carousel.Track>
</Carousel>
```
<!-- /example -->

TypeScript's `style` prop doesn't accept custom properties, so the object needs an
`as CSSProperties` cast — `CSSProperties` is a type import from `react`.

The arrows scroll by `track.clientWidth` minus the track's start padding (the peek), not by
one slide, and snapping is `proximity` rather than `mandatory` — so a rail of narrow items
advances by roughly a screenful and is allowed to come to rest between two slides.

## A poster rail

Slides take arbitrary children. Pair them with [MediaCard](media-card.md) for artwork:

<!-- example:PosterRow -->
```tsx
<Carousel title="New releases" style={{ "--carousel-item-width": "11rem" } as CSSProperties}>
  <Carousel.Track>
    <Carousel.Item>
      <MediaCard>
        <MediaCard.Image src="/media/the-quiet-shore.jpg" alt="Poster for The Quiet Shore" />
        <MediaCard.Overlay />
        <MediaCard.Content>
          <Text as="h3" variant="h5">
            The Quiet Shore
          </Text>
        </MediaCard.Content>
      </MediaCard>
    </Carousel.Item>
    <Carousel.Item>
      <MediaCard>
        <MediaCard.Image src="/media/tromso-aurora.jpg" alt="Poster for Northern Lights" />
        <MediaCard.Overlay />
        <MediaCard.Content>
          <Text as="h3" variant="h5">
            Northern Lights
          </Text>
        </MediaCard.Content>
      </MediaCard>
    </Carousel.Item>
    <Carousel.Item>
      <MediaCard>
        <MediaCard.Image src="/media/ada-lovelace.jpg" alt="Poster for The Analyst" />
        <MediaCard.Overlay />
        <MediaCard.Content>
          <Text as="h3" variant="h5">
            The Analyst
          </Text>
        </MediaCard.Content>
      </MediaCard>
    </Carousel.Item>
  </Carousel.Track>
</Carousel>
```
<!-- /example -->

## Interactive content inside a slide

The track swallows the click that ends a drag — a pointer that moved more than 3px sets a
flag, and the next `click` is stopped in the capture phase — so dragging past a link never
navigates. A genuine click still goes through:

<!-- example:ActionableSlides -->
```tsx
<Carousel title="Browse by genre" style={{ "--carousel-item-width": "12rem" } as CSSProperties}>
  <Carousel.Track>
    <Carousel.Item>
      <Card>
        <Button as="a" href="/browse/drama" variant="link">
          Drama
        </Button>
      </Card>
    </Carousel.Item>
    <Carousel.Item>
      <Card>
        <Button as="a" href="/browse/documentary" variant="link">
          Documentary
        </Button>
      </Card>
    </Carousel.Item>
    <Carousel.Item>
      <Card>
        <Button as="a" href="/browse/comedy" variant="link">
          Comedy
        </Button>
      </Card>
    </Carousel.Item>
  </Carousel.Track>
</Carousel>
```
<!-- /example -->

Text inputs work too: the drag gesture cancels the native image drag in `dragstart` rather
than on `mousedown`, so the browser's own focus and caret placement survive.

## Labelling

With a `title`, the root gets `aria-labelledby` pointing at it. With no `title`, it falls
back to a hard-coded `aria-label="Carousel"`, which tells a screen-reader user nothing —
pass your own:

<!-- example:LabelledWithoutTitle -->
```tsx
<Carousel aria-label="Recommended for you">
  <Carousel.Track>
    <Carousel.Item>
      <Card>Slow Horses</Card>
    </Carousel.Item>
    <Carousel.Item>
      <Card>Andor</Card>
    </Carousel.Item>
  </Carousel.Track>
</Carousel>
```
<!-- /example -->

## Theme tokens

`Carousel.css` reads the contract directly for the rail's geometry and the arrow fade. The
arrows themselves are [IconButton](icon-button.md)s, so their ink, ring, radius and press
feedback come from that component's utilities — listed here because they are what you
actually override to re-tint the arrows.

| Where                                  | Utility                           | Override                                       |
| -------------------------------------- | --------------------------------- | ---------------------------------------------- |
| Gap between slides                     |                                   | `--MEDIA-CAROUSEL-GAP`                         |
| Peek inset at both ends of the track   |                                   | `--MEDIA-CAROUSEL-PEEK`                        |
| Space under the title                  |                                   | `--R-SIZE-4`                                   |
| Track vertical padding · arrow padding | `p-r5`                            | `--R-SIZE-5`                                   |
| Arrow fade in / out                    |                                   | `--MOTION-DURATION-ENTER` `--MOTION-EASE-ENTER` |
| Arrow hover wash                       | `hover:bg-surface-2`              | `--C-SURFACE-2`                                |
| Arrow pressed wash                     | `active:bg-surface-3`             | `--C-SURFACE-3`                                |
| Arrow glyph ink                        | `text-fg-secondary`               | `--C-TEXT-SECONDARY`                           |
| Arrow focus ring                       | `focus-visible:ring-border-focus` | `--C-BORDER-FOCUS`                             |
| Arrow corners                          | `rounded-md`                      | `--RADIUS-MD`                                  |
| Arrow hover / press timing             | `duration-fast`                   | `--DURATION-FAST`                              |
| Slide width (component local)          |                                   | `--carousel-item-width`                        |

`--MEDIA-CAROUSEL-PEEK` (`3rem`) and `--MEDIA-CAROUSEL-GAP` (`var(--R-SIZE-5)`) are
declared in this package's own `src/tokens.css`, and unlike the media-card feel tokens
sitting beside them they are **not** re-tuned per theme — the peek exists to keep the
arrow buttons off the slide content, and that is a geometry decision, not a look. The gap
does move: `--R-SIZE-5` is on the responsive `r`-scale and steps `0.5rem` → `0.75rem` at
the 40rem breakpoint, taking the track's vertical padding with it.

Two of the arrow rows overlap on purpose. `Carousel.css` restates the hover background as
`--C-SURFACE-2` at 75% opacity through `color-mix`, so a slide stays faintly visible behind
a hovered arrow; because the component stylesheet is unlayered and Tailwind's utilities sit
in `@layer utilities`, that rule wins over IconButton's opaque `hover:bg-surface-2` — the
compiled bundle puts the utilities layer at bytes 7974–30370 and `.carousel-arrow:hover` at
62975, outside it, and an unlayered author rule outranks a layered one before specificity is
consulted. Both read the same variable, so re-tinting is a one-line change either way.

`--carousel-item-width` is lowercase because it is a component-internal local, not part of
the theme contract: it is per-instance layout, the thing you set at the call site, not
something a theme should decide for you.

## Gotchas

- **`Carousel.Track` is not optional.** The root reaches the scroller through context, so
  without a `Track` the ref stays `null`: both arrows stay in their hidden state forever and
  <kbd>←</kbd>/<kbd>→</kbd> do nothing. `Carousel.Item`s dropped straight into the root render,
  but nothing scrolls them.
- **One slide per view until you say otherwise.** `.carousel-item` sets `width` from
  `--carousel-item-width` with a `100%` fallback, and because the component stylesheet is
  unlayered it also beats a Tailwind `w-*` utility on the same item. Set the variable, or use
  an inline `style={{ width: … }}`, which does win.
- **Your `onKeyDown` composes with the arrow-key handler.** `<Carousel onKeyDown={…}>` runs
  your handler first and still scrolls the rail; call `preventDefault()` to suppress the
  scroll. (Before this was fixed the spread sat after the internal handler and silently turned
  keyboard scrolling off — measured at zero scroll calls.) `tabIndex`, `aria-label` and
  `aria-roledescription` are still replaceable on all three parts, which is how you fix the
  labelling problems in
  [Accessibility](#accessibility) — and how you break the keyboard by accident.
- **Arrow keys page only from the root's own tab stop.** The handler returns unless
  `e.target === e.currentTarget`, so <kbd>←</kbd>/<kbd>→</kbd> pressed inside a slide — in a
  text field, a slider, a listbox — is left alone and does what that control expects. (Before
  this was fixed, any arrow anywhere in the carousel was `preventDefault()`ed and paged the
  rail instead of moving the caret.) The flip side: focus has to be on the root for paging to
  work, so from one of the arrow buttons, or from anything else inside, the arrow keys do
  nothing.
- **A drag still eats the click that ends it.** `onClickCapture` cancels the click after a
  drag of more than 3px, so a control you dragged across is not activated. A plain press is
  untouched — the gesture no longer calls `preventDefault()` on `mousedown`, so focus and
  caret placement inside a slide behave normally.
- **The end-of-rail arrows are `disabled`, and also faded.** `data-hidden` applies
  `opacity: 0; pointer-events: none` for the look; `disabled` is what takes them out of the
  tab order and off the accessibility tree, so a keyboard user no longer lands on an invisible
  no-op. A `disabled` button also stops firing `mouseenter`, so no tooltip you attach to one
  will open at the ends of the rail.
- **`prefers-reduced-motion` is read in JS as well as CSS.** The media query sets
  `scroll-behavior: auto` on the track, and because an explicit `behavior` argument outranks
  that, the component reads the same preference through `usePrefersReducedMotion` and passes
  `behavior: "auto"` for the arrows, the arrow keys and the drag fling. Server-rendered and
  pre-hydration output reports "no preference", so the very first scroll after hydration is
  the one that can still animate.
- **`title` shadows the HTML attribute.** `CarouselProps` omits the native `title`, so there is
  no tooltip escape hatch, and the heading renders as a plain `<div>` — it carries the
  accessible name but is not in the document outline. Pass an element if you want it there:
  `title={<h2>Continue watching</h2>}`.
- **One `Track` per `Carousel`.** Two of them write to the same context ref, so whichever
  attaches last wins and the arrows drive only that one. Use two `Carousel`s for two rails.
- **Client-only.** `Carousel.tsx` opens with `"use client"`, which *is* the client boundary —
  a server component can render all three parts directly — but the whole module ships to the
  browser, and every prop you pass across that edge has to be serializable, so a `title` built
  from a server-only value is fine while a function is not. `Carousel.Track` throws
  `"Carousel compound components must be used within <Carousel>"` outside the root;
  `Carousel.Item` reads no context and never complains.

## Accessibility

The arrows are the good news: they are real `<button>`s from
[IconButton](icon-button.md), labelled from `prevLabel` / `nextLabel`, with their
chevron SVGs marked `aria-hidden`, and they keep IconButton's `focus-visible` ring. They
render after the slides in the DOM, so the tab order is root → slide content → Previous →
Next. They are [IconButton](icon-button.md)s, which default to `type="button"`, so a rail
inside a `<form>` does not submit it.

Everything else needs a decision from you:

- **The root is a `group` with a role description.** It renders `role="group"` alongside
  `aria-roledescription="carousel"` and either `aria-labelledby` (from `title`) or
  `aria-label="Carousel"`, so the name and the role description both count — ARIA prohibits
  them only on the implicit `generic` role. `role` still passes through if you want
  `region` instead.
- **The root is a tab stop with no focus style of its own.** `Carousel.css` defines nothing
  for `.carousel:focus-visible`, so you get the browser's default outline drawn around the
  whole component, title included.
- **Every carousel adds a landmark.** `Carousel.Track` is `role="region"` with
  `aria-label="Carousel items"`, so three rails on a page put three identically-named regions
  in the landmark list. Give each `Track` its own `aria-label`, or drop the `role`.
- **Slides are unnumbered.** Each `Carousel.Item` is `role="group"` with
  `aria-roledescription="slide"` and no name — no "3 of 12". Add `aria-label` per item if the
  count matters.
- **The scrolling element is not the one the component makes focusable.** The root takes
  `tabIndex={0}`; `Carousel.Track` — the element that actually scrolls — is given none, so the
  only keyboard affordance the component itself provides is the root's
  <kbd>←</kbd>/<kbd>→</kbd> handler. No <kbd>Home</kbd>/<kbd>End</kbd>, no <kbd>Page
  Up</kbd>/<kbd>Page Down</kbd>, and nothing that reaches the scroller directly. Whether the
  browser makes an overflowing container focusable on its own is engine-dependent and not
  something this component decides — pass `tabIndex={0}` to `Carousel.Track` (with an
  `aria-label`) if you want that guaranteed.
- **Nothing is announced when the rail moves.** There is no live region and no
  `aria-live`; scrolling is silent to a screen reader.
- **The announced strings default to English, and all of them are reachable.** None is drawn
  on screen. `"Carousel"`, `"Carousel items"`, `"carousel"` and `"slide"` are overridden
  through rest props on the part that carries them; the arrow labels come from the root's
  `prevLabel` and `nextLabel`.
- Also see the hidden-but-focusable arrows, and the fact that the arrow keys page only while
  the root itself holds focus, in [Gotchas](#gotchas).

## Related

[Swimlane](swimlane.md) · [MediaCard](media-card.md) · [Card](card.md) ·
[IconButton](icon-button.md) · [MasonryGrid](masonry-grid.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
