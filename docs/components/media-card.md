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
| `MediaCard.Image`   | `<img>` in a ratio box | `src`, `alt` **(required)**, `imgProps` (+ all `div` props) |
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
`style`, `ref`, handlers, and `aria-*` all pass through. `Image` renders two elements, and
splits them the way [Hero](hero.md) and [Spotlight](spotlight.md) do: its `className`, `ref`
and rest props address the **ratio box**, which is the outermost element it renders, and the
`<img>` inside takes an [`imgProps`](#the-images-two-elements) bag.

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
than letterboxing. Pass `imgProps={{ className: "object-contain" }}` if you would rather fit
than crop — `cn()` runs tailwind-merge, so your `object-*` replaces the default instead of
colliding with it. `Image`'s own `className` restyles the box, not the picture.

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
alpha in the default theme, and across the worked examples 90% in `grimdark`, a near-black at
85% in `tech`, a warm dark at 65% in `events` — laid over an arbitrary photograph. No contrast ratio is computed, and none is
promised. If your captions must be legible over user-supplied imagery, check it against your
real images or darken the gradient in your theme.

`MediaCard.Content` re-declares six ink variables on itself — `--C-TEXT-PRIMARY`,
`--C-TEXT-SECONDARY`, `--C-TEXT-MUTED`, `--C-TEXT-INVERSE`, `--C-TEXT-ON-PRIMARY`,
`--C-TEXT-ON-ACCENT` — to white (or white at reduced alpha) in every theme, because the
component paints its own dark scrim rather than inheriting one from the theme. Anything inside that *reads* one of those variables therefore
inks white: a [Text](text.md), or a raw `text-fg-primary` utility. Content also sets
`color: var(--C-TEXT-PRIMARY)` on itself, so a bare `<h3>` with no class inherits the white it
re-declares rather than the ambient page ink.

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

## The image's two elements

`MediaCard.Image` renders a ratio box wrapping an `<img>`. Its own `className`, `ref` and rest
props land on the **box** — the outermost element it renders, per the package's house rule —
and the `<img>` inside takes an `imgProps` bag:

```tsx
<MediaCard.Image
  src="/media/tromso-aurora.jpg"
  alt="Aurora over Tromsø"
  className="rounded-none"
  imgProps={{ className: "object-top", loading: "eager", sizes: "(min-width: 40rem) 50vw, 100vw" }}
/>
```

`src` and `alt` stay `Image`'s own props — they are set *after* the bag, so it cannot re-point
the picture or erase the alt text. Everything else about the `<img>` travels in the bag:
`loading`, `srcSet`, `sizes`, `decoding`, `fetchPriority`, `onLoad`, and a `ref`. The bag's
`className` merges **after** `size-full object-cover`, so yours wins; `Image`'s own `className`
merges after `media-card__image-container` and the orientation modifier, so that wins too.

An image `ref` goes in the bag — `imgProps={{ ref: imgRef }}` — which is what you need for
`onLoad` timing, an `IntersectionObserver`, or reading `naturalWidth`/`naturalHeight`.
`Image`'s top-level `ref` observes the box instead, which is the element that actually
occupies flow space.

### Migrating from ≤ 0.x

`<MediaCard.Image className="…">` used to reach the `<img>`; it now reaches the box. Two kinds
of prop moved into `imgProps`, and they behave differently — which is the part worth knowing
before you start grepping.

**Loud — the compiler finds these for you.** Every attribute that is legal only on an `<img>`:
`loading`, `srcSet`, `sizes`, `decoding`, `fetchPriority`, `crossOrigin`, `referrerPolicy`,
`useMap`, `width`, `height`. The box takes `div` props, so each is a
`Property 'loading' does not exist on type …` at the call site. Move them into `imgProps`.

**Silent — these still compile, and they now address the box.** A prop legal on *both* elements
is indistinguishable to any props type, so there is nothing for the compiler to say:

| Prop                     | Where it lands now      | If you meant the picture             |
| ------------------------ | ----------------------- | ------------------------------------ |
| `className`              | restyles the frame      | `imgProps={{ className: … }}`        |
| `style`                  | inline-styles the frame | `imgProps={{ style: … }}`            |
| `ref`                    | gives you the `<div>`   | `imgProps={{ ref: … }}`              |
| `onLoad` / `onError`     | still fires — see below | `imgProps={{ onLoad: … }}`           |
| `id`, `title`, `aria-*`  | describes the frame     | `imgProps={{ … }}`                   |

`ref` is the sharp one, because **a `Ref<HTMLImageElement>` still type-checks against the box.**
`HTMLImageElement` is structurally assignable to `HTMLDivElement` — the only member
`HTMLDivElement` adds over `HTMLElement` is the deprecated `align`, which images also have — so
an image ref left at the top level silently holds a `<div>`, and `imgRef.current.naturalWidth`
reads `undefined` with no error anywhere. Grep your call sites for a `ref` on a
`MediaCard.Image`; nothing else will.

`onLoad` and `onError` are the mild ones, and worth stating precisely because the natural guess
— "it moved to a `<div>`, so it never fires" — is wrong. React attaches a listener for these
non-delegated events **directly to the `<img>`** and then dispatches up its own component tree,
so a handler on the box does receive the image's `load` even though the DOM event never bubbles.
(Verified in this repo's `react-dom`: `listenToNonDelegatedEvent` registers `load`/`error` under
a `__bubble` key on the target element itself — it is *not* a capture-phase listener on the root
container, which is the plausible-sounding explanation to avoid repeating.) What changed is
`event.currentTarget`: it is the `<div>` now, not the `<img>`. A handler that ignores it
(`onLoad={() => setLoaded(true)}`) keeps working unchanged; one that reads
`event.currentTarget.naturalWidth` turns into a compile error, which is the good case.

This matches [`Hero.Background`](hero.md) and [`Spotlight.Image`](spotlight.md), which split the
same way — and carry the same silent set, for the same reason.

## Image loading

`Image` sets `loading="lazy"` **before** spreading `imgProps`, so the default is
deferred loading and any card can opt back out:

<!-- example:EagerImage -->
```tsx
<MediaCard orientation="landscape">
  <MediaCard.Image
    src="/media/tromso-aurora.jpg"
    alt="Aurora over Tromsø"
    imgProps={{ loading: "eager" }}
  />
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

`MediaCard.css` is gone: every rule it held is now a Tailwind utility on the element it
paints, and each still resolves to the same contract variable.

| Where                     | Utility                                        | Override                                                 |
| ------------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| Card corners              | `rounded-lg`                                   | `--RADIUS-LG`                                            |
| Elevation, rest → hover   | `shadow-sm` · `hover:shadow-lg`                | `--SHADOW-SM` → `--SHADOW-LG`                            |
| Hover scale and lift      |                                                | `--MEDIA-CARD-HOVER-SCALE` · `--MEDIA-CARD-HOVER-LIFT`   |
| Transform / shadow timing | `duration-[var(--MOTION-DURATION-ENTER)]`      | `--MOTION-DURATION-ENTER` · `--MOTION-EASE-ENTER`        |
| Focus outline             | `focus-visible:outline-border-focus`           | `--C-BORDER-FOCUS`                                       |
| Image box ratio           |                                                | `--MEDIA-ASPECT-POSTER` · `--ASPECT-WIDE` · `--ASPECT-SQUARE` |
| Overlay gradient          | `bg-[linear-gradient(to_top,var(--OVERLAY-GRADIENT-END),var(--OVERLAY-GRADIENT-START))]` | `--OVERLAY-GRADIENT-START` (top) · `--OVERLAY-GRADIENT-END` (bottom) |
| `Content` padding         | `p-r3`                                         | `--R-SIZE-3`                                             |

The scale, the lift and all three ratios are read as custom properties —
`hover:scale-[var(--MEDIA-CARD-HOVER-SCALE)]`,
`hover:translate-y-[var(--MEDIA-CARD-HOVER-LIFT)]`,
`aspect-[var(--MEDIA-ASPECT-POSTER)]`, `aspect-[var(--ASPECT-WIDE)]`,
`aspect-[var(--ASPECT-SQUARE)]`. The first two tokens sit in no Tailwind namespace at all;
the ratios do (`aspect-wide` / `aspect-square` compile), but the bracket spelling is what
`verify:component-docs` can trace back to a variable, so the table above can state the
contract instead of under-reporting it.

**The lift is now `translate` + `scale`, the individual transform properties**, because that
is what Tailwind's `translate-y-*` and `scale-*` set. The transition list names them rather
than `transform` — transitioning `transform` would animate nothing — and the lift applies
before the scale rather than after it, so the card rises by exactly `--MEDIA-CARD-HOVER-LIFT`
instead of by that times the scale. At the shipped values that is a 0.005rem difference.
**`--MEDIA-CARD-HOVER-SCALE`, `--MEDIA-CARD-HOVER-LIFT` and `--MEDIA-ASPECT-POSTER` are
domain tokens owned by this package**, defined in `src/tokens.css` — not in the
`@batthewz/response-ui-css` foundation, which owns everything else in the table above.
`src/tokens.css` names no theme: it declares the default values and stops there. The
per-theme retunings of the two hover tokens are opt-in, in
`@batthewz/response-ui-react-components/examples/theme-tuning`, and cover only the worked
examples: against the default's `1.02` / `-0.25rem`, `grimdark` lifts only `-0.125rem`,
`tech` scales `1.03` / `-0.1875rem` and `events` `1.03` / `-0.25rem`. They cascade by name,
so your own theme overrides them like any other variable — in your own file.

The caption padding rides the responsive `r`-scale: `--R-SIZE-3` is `1rem` and steps up to
`1.5rem` above the 40rem breakpoint. The corner-chip inset sits on the same scale —
`top-r5 right-r5` compile to `top: var(--R-SIZE-5)` / `right: var(--R-SIZE-5)`, `0.5rem` →
`0.75rem` — so `--R-SIZE-5` re-insets every badge even though it appears in no row above.
`Action`'s centring uses no spacing at all.

The white ink `Content` applies is **not** a token you can re-point: it is a literal
`oklch(1 0 0)` written onto six `--C-TEXT-*` variables by arbitrary-property utilities on
`MediaCard.Content` itself. To tint captions differently, pass your own
`className="[--C-TEXT-PRIMARY:…]"` — it merges last through `cn()`, so it collapses against
the default rather than racing it in the cascade.

Under `prefers-reduced-motion: reduce` the card keeps its `box-shadow` transition but drops
the movement from the transition list and neutralises it on hover — so on hover the
elevation change survives and the scale and lift do not. The `:focus-within` twin is not
zeroed the same way: tabbing in still applies the transform, just untransitioned.

## Gotchas

- **`Action` covers the card but is transparent to the pointer.** It renders
  `absolute inset-0 z-10` with `pointer-events: none` on itself and `auto` on its direct
  children, so the layer centres its contents without intercepting anything. A link or button
  inside `Content` stays clickable with an `Action` present. Anything you want to catch clicks
  has to be a descendant of the `Action` — the layer itself no longer does. (A
  `MediaCard.Badge` rendered *after* it still takes its own corner — same `z-10`, later in
  the DOM.)
- **`Content`, `Badge` and `Action` all sit at `z-10`; `Overlay` does not.** The scrim is
  `z-index: auto`, so it paints under all three whichever order you render them in.
- **`Content` re-points the ink variables *and* sets `color`.** A child that reads `--C-TEXT-*`
  (a [Text](text.md), a `text-fg-*` utility) turns white, and so does a bare `<h3>` or `<p>`
  that inherits.
- **The card is only as tall as the image.** `Content` is absolutely positioned and adds no
  height, and the root is `overflow: hidden` — a caption longer than the picture is clipped,
  not scrolled. Keep captions short, or set your own `min-height` on the card.
- **The ratio box is addressable, and it is what `Image`'s `className` addresses.** This
  reversed: the box used to receive nothing while `className`, `ref` and every rest prop went
  to the `<img>`. `Image`'s `className`, `style`, `ref` and rest props now land on the box —
  the outermost element it renders — and the `<img>` is reached through
  [`imgProps`](#the-images-two-elements). Anything you wrote for the picture that is *also*
  legal on a `<div>` silently addresses the frame instead until you move it — `className`,
  `style`, `ref`, `onLoad`/`onError`, and `id`/`title`/`aria-*`. The `<img>`-only attributes
  (`loading`, `srcSet`, `sizes`, …) are compile errors instead, so only that first list needs a
  grep; see [Migrating from ≤ 0.x](#migrating-from--0x). The box gets **no class slot** on top of that,
  because `className` already reaches it and a slot would be a second writer for one element.
  To change one card's ratio you can still pick a different `orientation` or set that
  orientation's aspect variable in the root's `style` — custom properties inherit, so the box
  picks it up.
- **`Image` outside a `MediaCard` silently uses `portrait`.** The orientation context has a
  default rather than a guard, so no part of MediaCard throws when rendered outside the root —
  you just get the poster ratio and no card frame.
- **The lift answers focus as well as hover.** `.media-card:focus-within` carries the same
  scale, travel and elevation as `:hover`, so tabbing into a control inside the card raises it
  the same way. Under `prefers-reduced-motion: reduce` they part ways: the reduced-motion
  block zeroes the transform on `:hover` only, so a hovered card keeps just the shadow change
  while a focused one still scales and lifts — instantly, since the transform is dropped from
  the transition list.
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
