# MediaCard

A poster or thumbnail card: a ratio-locked, corner-clipped image with opt-in slots for a
gradient scrim, a caption laid over the picture, a corner chip, and a centred control — plus
a hover lift whose scale and travel are theme-owned tokens, so the card's feel changes with
the theme and not with your CSS.

<!-- example:Minimal -->
```tsx
<MediaCard>
  <MediaCard.Image src="/media/the-quiet-shore.jpg" alt="Poster for The Quiet Shore" />
  <MediaCard.Overlay />
  <MediaCard.Content>
    <Text as="h3" variant="h5">
      The Quiet Shore
    </Text>
    <Text variant="body-3" color="secondary">
      2024 · Drama · 1h 52m
    </Text>
  </MediaCard.Content>
</MediaCard>
```
<!-- /example -->

**Anatomy.** `MediaCard` is an `<article>` with `position: relative` and `overflow: hidden`.
Of the six parts, only `MediaCard.Image` takes up flow space — it wraps your `<img>` in an
aspect-ratio box, so **the card's height is the image's height**. Every other part is
absolutely positioned on top of it: `Overlay` fills the card with a bottom-anchored gradient,
`Content` pins to the bottom edge, `MediaCard.Badge` to the top-right corner, and `Action`
centres its children over the whole card. The root publishes `orientation` on a context that
`Image` reads; no other part reads context.

| Part                | Renders                | Own props                             |
| ------------------- | ---------------------- | ------------------------------------- |
| `MediaCard`         | `<article>`            | `orientation?` (+ all `article` props) |
| `MediaCard.Image`   | `<img>` in a ratio box | `alt` **(required)** (+ all `img` props) |
| `MediaCard.Overlay` | `<div>`                | — (+ all `div` props)                 |
| `MediaCard.Content` | `<div>`                | — (+ all `div` props)                 |
| `MediaCard.Badge`   | `<div>`                | — (+ all `div` props)                 |
| `MediaCard.Action`  | `<div>`                | — (+ all `div` props)                 |

| Prop          | Type                                        | Default      |
| ------------- | ------------------------------------------- | ------------ |
| `orientation` | `"portrait" \| "landscape" \| "square"`     | `"portrait"` |
| `className`   | `string`                                    | —            |
| `ref`         | `Ref<HTMLElement>`                          | —            |
| …rest         | `article` props, minus `orientation`        | —            |

Every part spreads its remaining props onto the element it renders, so `className`, `id`,
`style`, `ref`, handlers, and `aria-*` all pass through. `Image`'s `ref` and `className` land
on the `<img>`, not on the ratio box around it.

## Orientation

`orientation` changes only the image box's `aspect-ratio`: `portrait` is 2 / 3 (poster),
`landscape` 16 / 9, `square` 1 / 1. It travels by context, so it is set once on the root and
applies to every `Image` beneath it — one card, one ratio.

<!-- example:Orientations -->
```tsx
<MediaCard orientation="portrait">
  <MediaCard.Image src="/media/the-quiet-shore.jpg" alt="Poster for The Quiet Shore" />
</MediaCard>
<MediaCard orientation="landscape">
  <MediaCard.Image src="/media/tromso-aurora.jpg" alt="Aurora over Tromsø" />
</MediaCard>
<MediaCard orientation="square">
  <MediaCard.Image src="/media/ada-lovelace.jpg" alt="Portrait of Ada Lovelace" />
</MediaCard>
```
<!-- /example -->

The `<img>` inside is `size-full object-cover`, so the picture fills the box and crops rather
than letterboxing. Pass `className="object-contain"` to `Image` if you would rather fit than
crop — `cn()` runs tailwind-merge, so your `object-*` replaces the default instead of
colliding with it.

`Overlay` and `Content` are opt-in. Skip them and the card is a plain framed picture:

<!-- example:ImageOnly -->
```tsx
<MediaCard orientation="square">
  <MediaCard.Image src="/media/ada-lovelace.jpg" alt="Portrait of Ada Lovelace" />
</MediaCard>
```
<!-- /example -->

## Text over the picture

`MediaCard.Overlay` is a `<div>` at `inset: 0` painting
`linear-gradient(to top, --OVERLAY-GRADIENT-END, --OVERLAY-GRADIENT-START)`: opaque at the
bottom, transparent at the top. It is `aria-hidden="true"` and `pointer-events: none`, so it
darkens the picture without appearing in the accessibility tree or eating clicks.

**It darkens; it does not guarantee anything.** The end stop is a theme value — black at 70%
alpha by default, 90% in `grimdark`, a near-black at 85% in `tech`, a warm dark at 65% in
`events` — laid over an arbitrary photograph. No contrast ratio is computed, and none is
promised. If your captions must be legible over user-supplied imagery, check it against your
real images or darken the gradient in your theme.

`MediaCard.Content` re-declares six ink variables on itself — `--C-TEXT-PRIMARY`,
`--C-TEXT-SECONDARY`, `--C-TEXT-MUTED`, `--C-TEXT-INVERSE`, `--C-TEXT-ON-PRIMARY`,
`--C-TEXT-ON-ACCENT` — to white (or white at reduced alpha) in every theme, because the
scrim is dark in every theme. Anything inside that *reads* one of those variables therefore
inks white: a [Text](text.md), or a raw `text-fg-primary` utility. Content sets no `color` of
its own, so a bare `<h3>` with no class keeps the ambient page ink — see [Gotchas](#gotchas).

## Corner chip and centred control

`MediaCard.Badge` and `MediaCard.Action` are **positions, not widgets**. `MediaCard.Badge` is
a top-right corner anchor; `Action` is a full-card flex layer that centres its children. Both
sit at `z-10`, above the overlay. Put the real component inside:

<!-- example:CornerChip -->
```tsx
<MediaCard orientation="landscape">
  <MediaCard.Image src="/media/tromso-aurora.jpg" alt="Aurora over Tromsø" />
  <MediaCard.Badge>
    <Badge variant="info">New</Badge>
  </MediaCard.Badge>
  <MediaCard.Overlay />
  <MediaCard.Content>
    <Text as="h3" variant="h5">
      Northern Lights, Tromsø
    </Text>
  </MediaCard.Content>
</MediaCard>
```
<!-- /example -->

<!-- example:CentredAction -->
```tsx
<MediaCard orientation="landscape">
  <MediaCard.Image src="/media/the-quiet-shore-still.jpg" alt="Still from The Quiet Shore" />
  <MediaCard.Overlay />
  <MediaCard.Action>
    <Button type="button" size="sm">
      Play trailer
    </Button>
  </MediaCard.Action>
</MediaCard>
```
<!-- /example -->

Neither slot sits inside `Content`, so the white-ink override does not reach them — a
[Badge](badge.md) or a [Button](button.md) here keeps its normal theme colours. That is why
both examples put a filled control in the slot: it brings its own background, whereas bare
text here is asked to read directly against the photograph.

## Image loading

`Image` sets `loading="lazy"` **before** spreading your props, so the default is
deferred loading and any card can opt back out:

<!-- example:EagerImage -->
```tsx
<MediaCard orientation="landscape">
  <MediaCard.Image src="/media/tromso-aurora.jpg" alt="Aurora over Tromsø" loading="eager" />
  <MediaCard.Overlay />
  <MediaCard.Content>
    <Text as="h3" variant="h5">
      Northern Lights, Tromsø
    </Text>
  </MediaCard.Content>
</MediaCard>
```
<!-- /example -->

## Theme tokens

MediaCard styles almost everything from `MediaCard.css`, which reads the contract variables
directly. Three of the Tailwind utilities in the `.tsx` also resolve to a token, and all
three land on the responsive `r`-scale: `p-r3` for the caption padding, and `top-r5
right-r5` for the corner-chip inset. Everything else in the `.tsx` — `absolute`, `inset-0`,
`z-10`, `size-full`, `object-cover`, the flex classes — resolves to no token at all.

| Where                     | Utility | Override                                                 |
| ------------------------- | ------- | -------------------------------------------------------- |
| Card corners              | —       | `--RADIUS-LG`                                            |
| Elevation, rest → hover   | —       | `--SHADOW-SM` → `--SHADOW-LG`                            |
| Hover scale and lift      | —       | `--MEDIA-CARD-HOVER-SCALE` · `--MEDIA-CARD-HOVER-LIFT`   |
| Transform / shadow timing | —       | `--MOTION-DURATION-ENTER` · `--MOTION-EASE-ENTER`        |
| Focus outline             | —       | `--C-BORDER-FOCUS`                                       |
| Image box ratio           | —       | `--MEDIA-ASPECT-POSTER` · `--ASPECT-WIDE` · `--ASPECT-SQUARE` |
| Overlay gradient          | —       | `--OVERLAY-GRADIENT-START` (top) · `--OVERLAY-GRADIENT-END` (bottom) |
| `Content` padding         | `p-r3`  | `--R-SIZE-3`                                             |

**`--MEDIA-CARD-HOVER-SCALE`, `--MEDIA-CARD-HOVER-LIFT` and `--MEDIA-ASPECT-POSTER` are
domain tokens owned by this package**, defined in `src/tokens.css` — not in the
`@batthewz/response-ui-css` foundation, which owns everything else in the table above. The
two hover tokens are also re-declared per theme in that same file: the default and `grimdark`
scale to `1.02`, `tech` and `events` to `1.03`, and the lift ranges from `-0.125rem`
(`grimdark`) to `-0.25rem` (default, `events`). They cascade by name, so a consumer theme
overrides them like any other variable.

The caption padding rides the responsive `r`-scale: `--R-SIZE-3` is `1rem` and steps up to
`1.5rem` above the 40rem breakpoint. The corner-chip inset sits on the same scale —
`top-r5 right-r5` compile to `top: var(--R-SIZE-5)` / `right: var(--R-SIZE-5)`, `0.5rem` →
`0.75rem` — so `--R-SIZE-5` re-insets every badge even though it appears in no row above.
`Action`'s centring uses no spacing at all.

The white ink `Content` applies is **not** a token you can re-point: it is a literal
`oklch(1 0 0)` written onto `--C-TEXT-*` inside `.media-card__content`. To tint captions
differently, override the rule or pass your own colour class.

Under `prefers-reduced-motion: reduce` the card keeps its `box-shadow` transition but drops
the transform from the transition list and sets `transform: none` on hover — so the elevation
change survives and the scale and lift do not.

## Gotchas

- **`Action` swallows every click beneath it.** It renders `absolute inset-0 z-10` with
  pointer events left on, so the transparent layer covers the whole card. A link or button
  inside `Content` is still focusable by keyboard but cannot be clicked while an `Action` is
  present. Use `Action` as the card's single click target, or don't render it. (A
  `MediaCard.Badge` rendered *after* it still takes its own corner — same `z-10`, later in
  the DOM.)
- **`Content` has no `z-index`; `MediaCard.Badge` and `Action` do.** `Overlay` and `Content`
  are both `z-index: auto`, so DOM order decides which paints on top. Render `Overlay`
  **before** `Content` — reverse them and the scrim paints over your caption.
- **`Content` re-points the ink variables but sets no `color`.** A child that reads
  `--C-TEXT-*` (a [Text](text.md), a `text-fg-*` utility) turns white; a bare `<h3>` or `<p>`
  inherits whatever the surrounding page inks and can end up dark text on a dark scrim.
- **The card is only as tall as the image.** `Content` is absolutely positioned and adds no
  height, and the root is `overflow: hidden` — a caption longer than the picture is clipped,
  not scrolled. Keep captions short, or set your own `min-height` on the card.
- **The ratio box is not addressable.** `Image` renders its own wrapper `<div>` and passes it
  nothing: your `className`, `style` and `ref` all go to the `<img>`. To change one card's
  ratio, either pick a different `orientation` or set that orientation's aspect variable in
  the root's `style` — custom properties inherit, so the box picks it up.
- **`Image` outside a `MediaCard` silently uses `portrait`.** The orientation context has a
  default rather than a guard, so no part of MediaCard throws when rendered outside the root —
  you just get the poster ratio and no card frame.
- **The hover lift is mouse-only.** `.media-card:hover` has no `:focus-within` counterpart, so
  tabbing into a control inside the card produces no card-level feedback.
- **Client component.** `MediaCard.tsx` opens with `"use client"` — `orientation` is passed
  through a React context — so importing any part opts that module into the client bundle.

## Accessibility

- **`alt` is required at the type level.** `MediaCard.Image` types `alt: string`, so an image
  with no alt text will not compile. Pass `alt=""` deliberately when the picture is decorative
  and the caption already carries the meaning.
- **The overlay is correctly hidden.** It is `aria-hidden="true"` with `pointer-events: none`,
  so the scrim is never announced and never intercepts a pointer.
- **Name the article.** The root is an `<article>`, which screen readers announce as such. It
  has no accessible name of its own; `aria-labelledby` pointing at your caption heading (or an
  `aria-label`) passes straight through and makes the card identifiable in an element list.
- **Choose your own heading level.** Nothing in MediaCard emits a heading. The examples use
  `as="h3"` on a `variant="h5"` [Text](text.md) so the visual size and the document outline can
  be set independently.
- **The focus outline needs a focusable root.** `.media-card:focus-visible` draws a 2px
  `--C-BORDER-FOCUS` outline, but an `<article>` is not focusable, so the rule only fires if
  you add `tabIndex` yourself. MediaCard renders no interactive element — a card that navigates
  needs a real link or button that you supply.
- **`Action` creates a keyboard/pointer mismatch.** Because it covers the card, controls layered
  beneath it stay in the tab order while becoming unclickable. Keep one interactive layer.
- **Contrast over imagery is unverified.** The scrim is a fixed gradient over an arbitrary
  photograph; the [theme contract](../theme-contract.md) covers token pairs, not text over
  pictures.

## Related

[Card](card.md) · [Badge](badge.md) · [Skeleton](skeleton.md) · [Hero](hero.md) · [Swimlane](swimlane.md) ·
[Carousel](carousel.md) · [MasonryGrid](masonry-grid.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
