# Spotlight

The alternating feature section that marketing pages are built from — a stack of
image-and-copy rows that flip sides on their own as they go down the page, collapse to one
column on mobile, and reveal their copy as the reader scrolls to them.

<!-- example:Minimal -->
```tsx
<Spotlight>
  <Spotlight.Item>
    <Spotlight.Image
      src="/images/deploy-timeline.png"
      alt="A deploy timeline showing three green releases"
    />
    <Spotlight.Content>
      <Text variant="h2">Ship on a Friday</Text>
      <Text variant="body-1">
        Every release is reviewable, reversible, and one click from a rollback.
      </Text>
      <Button as="a" href="/product/deploys">
        See how deploys work
      </Button>
    </Spotlight.Content>
  </Spotlight.Item>
</Spotlight>
```
<!-- /example -->

**Anatomy.** `Spotlight` is the outer stack: a `<div>` that spaces its rows and hands each
one its position via context. Each `Spotlight.Item` is one row — a two-column grid above
`40rem`, a single column below it. Inside a row, `Spotlight.Image` is a rounded, clipped
wrapper around an `<img>`, and `Spotlight.Content` is the copy column. Only
`Spotlight.Content` reads the context: it uses the row's index to pick which direction the
copy slides in from, and the root's `animate` flag to decide whether to slide at all.

| Part                | Renders                              | Props                                                   |
| ------------------- | ------------------------------------ | ------------------------------------------------------- |
| `Spotlight`         | `<div class="spotlight">`            | `animate?: boolean` — default `true`                    |
| `Spotlight.Item`    | `<div class="spotlight-item">`       | `reversed?: boolean`                                    |
| `Spotlight.Image`   | `<div>` wrapping one `<img>`         | `src: string` · `alt?: string` · `parallax?: boolean` — default `false` · `parallaxRate?: number` — Parallax's `rate`, default `0.3` |
| `Spotlight.Content` | `<div class="spotlight-content">`    | —                                                       |

All four take the props of a `<div>` on top of that, so `className`, `id`, `style`, `ref`
and `data-*` pass through. `Spotlight.Image` omits `children` — its only child is the
`<img>` it builds from `src`, and everything else you pass lands on the **wrapper**, not
the image. See [Gotchas](#gotchas).

## The alternation is automatic

The flip is pure CSS: above `40rem`, `.spotlight-item:nth-child(even) .spotlight-image`
takes `order: 2`. Nothing counts items in JavaScript for layout purposes, so you write the
same markup for every row and the second, fourth and sixth flip themselves — as long as you
write `Spotlight.Image` **before** `Spotlight.Content`. See [Gotchas](#gotchas).

<!-- example:Alternating -->
```tsx
<Spotlight>
  <Spotlight.Item>
    <Spotlight.Image src="/images/deploy-timeline.png" alt="A deploy timeline" />
    <Spotlight.Content>
      <Text variant="h3">Deploys</Text>
      <Text variant="body-2">First item — image left, copy right.</Text>
    </Spotlight.Content>
  </Spotlight.Item>
  <Spotlight.Item>
    <Spotlight.Image src="/images/incident-review.png" alt="An incident review thread" />
    <Spotlight.Content>
      <Text variant="h3">Incidents</Text>
      <Text variant="body-2">Second item — the columns swap themselves.</Text>
    </Spotlight.Content>
  </Spotlight.Item>
  <Spotlight.Item>
    <Spotlight.Image src="/images/cost-report.png" alt="A monthly cost report" />
    <Spotlight.Content>
      <Text variant="h3">Spend</Text>
      <Text variant="body-2">Third item — back to image left.</Text>
    </Spotlight.Content>
  </Spotlight.Item>
</Spotlight>
```
<!-- /example -->

Below `40rem` the grid is a single column and none of this applies — every row stacks
image-then-copy in DOM order, whatever `reversed` says.

## `reversed` is a toggle, not a side

<!-- example:Reversed -->
```tsx
<Spotlight>
  <Spotlight.Item reversed>
    <Spotlight.Image src="/images/audit-log.png" alt="An audit log filtered by actor" />
    <Spotlight.Content>
      <Text variant="h3">Audit log</Text>
      <Text variant="body-2">
        First item, so it would sit image-left by default. Reversed moves the image right.
      </Text>
    </Spotlight.Content>
  </Spotlight.Item>
</Spotlight>
```
<!-- /example -->

`reversed` **inverts a row against whatever its position already does**. On row 1 or 3 it
puts the image on the right. On row 2 or 4 — already flipped by `:nth-child(even)` — it
sets `order: unset` and puts the image back on the *left*. There is no prop that pins a row
to a fixed side — but because the alternation is positional, putting `reversed` on rows 1,
3 and 5 lands every row image-right. An `order-*` utility will not do it: the component's
own rules outrank Tailwind's (see [Gotchas](#gotchas)).

## Images

`Spotlight.Image` renders `<img>` with `width: 100%`, `height: 100%` and
`object-fit: cover` inside a wrapper that is `overflow: hidden` and `--RADIUS-MD`-rounded.
The wrapper has **no height of its own**, and the row grid is `align-items: center` rather
than `stretch`, so by default the wrapper simply takes the picture's natural height at
full column width — `height: 100%` resolves against an auto-height parent, which means
`object-fit: cover` never crops anything.

Give the wrapper a height and the crop switches on:

<!-- example:CroppedImage -->
```tsx
<Spotlight>
  <Spotlight.Item>
    <Spotlight.Image
      className="h-64"
      src="/images/bristol-atrium.jpg"
      alt="The glass atrium of the Bristol office"
    />
    <Spotlight.Content>
      <Text variant="h3">Where we work</Text>
      <Text variant="body-2">
        The wrapper owns the height; the photograph fills it and crops to the centre.
      </Text>
    </Spotlight.Content>
  </Spotlight.Item>
</Spotlight>
```
<!-- /example -->

That is also what makes rows line up: without a height, a short photograph and a long
paragraph produce a lopsided row that is centred rather than matched.

### Parallax

Set `parallax` and the `<img>` is wrapped in [Parallax](parallax.md), which translates it
vertically as the page scrolls; `parallaxRate` is forwarded as that component's `rate`.

<!-- example:ParallaxImage -->
```tsx
<Spotlight>
  <Spotlight.Item>
    <Spotlight.Image
      className="h-80"
      src="/images/harbour-at-dusk.jpg"
      alt="Fishing boats moored at dusk"
      parallax
      parallaxRate={0.08}
    />
    <Spotlight.Content>
      <Text variant="h3">Harbour tours</Text>
      <Text variant="body-2">Ninety minutes on the water, departing at sunset.</Text>
    </Spotlight.Content>
  </Spotlight.Item>
</Spotlight>
```
<!-- /example -->

Keep the rate small. The drifting layer is exactly the size of its clipping box, so every
pixel of translation exposes a blank band at one edge — see [Gotchas](#gotchas).

## Turning the reveal off

`animate` defaults to `true`, which wraps every `Spotlight.Content` in
[ScrollReveal](scroll-reveal.md). That is the right default for a landing page and the
wrong one anywhere the copy has to be readable before JavaScript runs:

<!-- example:WithoutAnimation -->
```tsx
<Spotlight animate={false}>
  <Spotlight.Item>
    <Spotlight.Image src="/images/pricing-tiers.png" alt="The three pricing tiers" />
    <Spotlight.Content>
      <Text variant="h3">Simple, transparent pricing</Text>
      <Text variant="body-2">Three tiers, billed monthly, no per-seat surprises.</Text>
    </Spotlight.Content>
  </Spotlight.Item>
</Spotlight>
```
<!-- /example -->

`animate` lives on the root and is read only by `Spotlight.Content`, so it is all-or-nothing
for a stack — and it does not touch `parallax`, which is a per-image prop.

## Theme tokens

Spotlight paints **no colour at all** — no background, no ink, no border. It inherits the
text colour of whatever surface you drop it on, so there is no `--C-*` variable to override
here; retint the [Text](text.md), [Button](button.md) or [Card](card.md) you put inside it
instead. Its own CSS reads exactly three variables:

| Where                                | Override      |
| ------------------------------------ | ------------- |
| Vertical gap between rows            | `--R-SIZE-2`  |
| Column gutter **and** copy padding   | `--R-SIZE-4`  |
| Image corner radius                  | `--RADIUS-MD` |

Both spacing values are on the responsive `r`-scale and step up at the `40rem` breakpoint:
`--R-SIZE-2` goes `1.25rem` → `2rem`, `--R-SIZE-4` goes `0.75rem` → `1.25rem`. They are
**shared scale steps**, not component-scoped variables — overriding either moves every
other component sitting on that step too. One token doing two jobs is worth knowing about:
the row's `gap` and the copy column's `padding` are both `--R-SIZE-4`, so you cannot widen
the gutter without also inflating the padding around the text.

The reveal's timing is not Spotlight's either. The `fade-left` / `fade-right` classes it
borrows read `--MOTION-DURATION-ENTER` and `--MOTION-EASE-ENTER` from
`@batthewz/response-ui-css`; both are documented on [ScrollReveal](scroll-reveal.md#theme-tokens).

## Gotchas

- **`className` cannot re-space it.** `.spotlight` and `.spotlight-item` are unlayered
  component CSS, while Tailwind utilities compile into `@layer utilities`, and unlayered
  author rules outrank layered ones outright — no matter the specificity. So
  `<Spotlight className="gap-r1">` leaves the gap at `--R-SIZE-2`. Use the important
  modifier (`gap-r1!`), an inline `style`, or your own unlayered rule on `.spotlight`.
- **The copy starts invisible, and by default stays that way without JS.** With `animate`
  at its default, the server-rendered HTML is
  `<div class="scroll-reveal-hidden"><div class="spotlight-content">…` — `opacity: 0`. It
  becomes visible only when the `IntersectionObserver` fires after hydration. Images are
  *not* wrapped, so a page whose JavaScript never runs, or a browser with no
  `IntersectionObserver`, renders the pictures and none of the words. Pass `animate={false}`
  wherever the text is the point. (Readers with `prefers-reduced-motion: reduce` are safe —
  the hidden state is skipped for them entirely.)
- **Image-before-content is load-bearing.** The flip works by pushing `.spotlight-image` to
  `order: 2` and pulling `.spotlight-content` to `order: 1` — both of which are already true
  of a row authored content-then-image, so nothing moves. Write a row that way and the
  automatic alternation *and* `reversed` silently stop working: every row renders copy-left,
  image-right. (The pull on the content is doubly inert while `animate` is on, because the
  reveal wrapper, not `.spotlight-content`, is the grid item then.)
- **`reversed` flips the layout but not the reveal.** The slide direction is computed in
  `Spotlight.Content` from the row's index in the root's children, and knows nothing about
  `reversed`. Normally the copy slides in *from the image's side*; on a reversed row it
  still slides from the side the image used to be on, which now reads backwards.
- **Nothing forwards to the `<img>`.** `Spotlight.Image` builds `<img src alt role>` and
  spreads every other prop onto the wrapper `<div>`. There is no route to `loading`,
  `width`/`height`, `srcSet`, `sizes` or `decoding`, so every Spotlight image loads eagerly
  and reserves no space before it arrives — budget for layout shift on a long page, or
  give the wrapper a height as shown above. [MediaCard](media-card.md)'s image part does
  forward `<img>` props and defaults to `loading="lazy"`; this one does not.
- **Parallax has no overscan.** `.spotlight-image` is `overflow: hidden` and the drifting
  layer fills it exactly, so a translate of *n* pixels exposes an *n*-pixel blank band at
  one edge. The offset is the row's distance from the viewport centre times the rate and is
  **not** clamped — `Spotlight.Image` forwards `parallaxRate` but has no way to pass
  Parallax's `clamp`. On a 1080px viewport a row entering from the bottom sits ~540px off
  centre, which at the default rate of `0.3` is a 162px band. [Hero](hero.md) avoids this by
  over-sizing its background layer; `Spotlight.Image` does not.
- **A row is always two columns wide.** `grid-template-columns: 1fr 1fr` is unconditional
  above `40rem`, so an `Item` holding only a `Spotlight.Content` occupies the left half and
  leaves the right half empty, and a third child wraps onto a second row.
- **`Spotlight.Content`'s `ref` moves.** With `animate` on it is attached to the
  [ScrollReveal](scroll-reveal.md) wrapper; with `animate={false}` it lands on the `.spotlight-content` div
  itself. The element your ref points at is decided by a prop on the **root**, two
  components up.
- **`Spotlight.Content` never throws.** Outside a `Spotlight` it finds no context and falls
  back to index `0` and `animate: true` — so it still renders, still hides itself until the
  observer fires, and always reveals in the same direction.
- **Fragments desynchronise the two counters.** `Children.toArray` treats `<>…</>` as one
  child, so two `Item`s inside a fragment both receive index `0` and reveal identically,
  while the CSS still alternates their columns by DOM position. Render rows as a flat list
  or an array, not wrapped in a fragment.
- **Client-only.** `Spotlight.tsx` carries `"use client"`, so all four parts are client
  components. They can be rendered from a server component — the directive is the boundary —
  but see the invisible-copy note above for what that first paint looks like.

## Accessibility

Spotlight emits four plain `<div>`s and adds no roles, landmarks, or headings. The
semantics are entirely yours: put a real heading inside `Spotlight.Content`, and wrap the
root in your own `<section>` if the block should be a navigable region — there is no `as`
prop to change the root's tag.

- **`alt` is optional and defaults to decorative.** With no `alt`, `Spotlight.Image` renders
  `alt="" role="presentation"` and assistive tech skips the picture entirely. That is the
  right default for atmosphere shots; if a screenshot carries information the copy does not,
  pass a real `alt`.
- **`order` moves the columns, not the DOM.** On a flipped row the image still precedes the
  copy in the accessibility tree even though it appears to the right of it. This is
  invisible when images are decorative (the default), but a described image will be
  announced *before* the copy it illustrates. Keep any meaning the reader needs in the text.
- **Reduced motion is honoured on both paths.** [ScrollReveal](scroll-reveal.md) skips its
  hidden state under `prefers-reduced-motion: reduce`, so the copy renders visible and static
  from the first paint, and [Parallax](parallax.md) attaches no scroll listener at all. A
  reduced-motion reader gets a more reliable page than the default one.
- **Don't put essential content behind the default reveal.** As above, `animate` defaults to
  `true` and there is no non-JS fallback for the hidden state.

## Related

[Hero](hero.md) · [MediaCard](media-card.md) · [Swimlane](swimlane.md) ·
[ScrollReveal](scroll-reveal.md) · [Parallax](parallax.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
