# Hero

A full-bleed page opener: a `<section>` that layers a background, a themeable scrim and a
padded content block, and sizes itself in viewport heights. It owns the layering, the
clipping and a padding ramp that grows from `1rem` to `6rem` across two breakpoints — the
ink you put over your image stays your decision.

<!-- example:Minimal -->
```tsx
<Hero>
  <Hero.Background src="/images/harbour-at-dusk.jpg" />
  <Hero.Content>
    <Text variant="h1" color="on-primary">
      Harbour tours, every evening
    </Text>
    <Text variant="body-1" color="on-primary">
      Ninety minutes on the water, departing at sunset.
    </Text>
  </Hero.Content>
</Hero>
```
<!-- /example -->

**Anatomy.** `Hero` is the `<section>`: `position: relative`, `display: flex`,
`overflow: hidden`, and a `min-height` from `size`. It renders your children and then —
when a `Hero.Background` is among them, or `overlay` says so outright — appends an
`aria-hidden` scrim `<div>` that fills the box. `Hero.Background` is an absolutely positioned layer at `inset: 0`; give it a `src` and
it builds a covering `<img>`, or leave `src` off and paint the layer yourself with
`className`. `Hero.Content` is the one part that sits **above** the scrim (`z-index: 10`),
and it carries the responsive padding. The scrim is always appended last, so it paints over
the background — and over anything else you put directly inside `Hero`. See
[Gotchas](#gotchas).

| Part              | Renders     | Also accepts                                                        |
| ----------------- | ----------- | ------------------------------------------------------------------- |
| `Hero`            | `<section>` | every `<section>` prop; `ref` is `Ref<HTMLElement>`                  |
| `Hero.Background` | `<div>`     | every `<div>` prop **except `children`**; `ref` is `Ref<HTMLDivElement>` |
| `Hero.Content`    | `<div>`     | every `<div>` prop; `ref` is `Ref<HTMLDivElement>`                   |

| Prop           | On                | Type                                   | Default                              |
| -------------- | ----------------- | -------------------------------------- | ------------------------------------ |
| `size`         | `Hero`            | `"sm" \| "md" \| "lg" \| "full"`       | `"md"`                               |
| `overlay`      | `Hero`            | `boolean`                              | a `Hero.Background` is present       |
| `align`        | `Hero`            | `"start" \| "center" \| "end"`         | `"end"`                              |
| `src`          | `Hero.Background` | `string`                               | —                                    |
| `alt`          | `Hero.Background` | `string`                               | — (the `<img>` gets `alt=""`)        |
| `parallax`     | `Hero.Background` | `boolean`                              | `false`                              |
| `parallaxRate` | `Hero.Background` | `number`                               | — ([Parallax](parallax.md) uses `0.3`) |
| `animate`      | `Hero.Content`    | `boolean`                              | `false`                              |
| `animation`    | `Hero.Content`    | `"fade-up" \| "fade-in" \| "scale"`    | `"fade-up"`                          |

None of the three prop types, and none of the unions, are exported — a wrapper of your own
re-declares them.

## Height and vertical placement

`size` writes a `min-height` in viewport heights: `sm` 40vh, `md` 60vh, `lg` 80vh, `full`
100dvh (with a `100vh` fallback for browsers without the dynamic unit — see
[Gotchas](#gotchas)). It is a *minimum*, so content taller than that pushes the section
past it.

<!-- example:Sizes -->
```tsx
<Hero size="sm">
  <Hero.Content>40vh — a section banner</Hero.Content>
</Hero>
<Hero size="md">
  <Hero.Content>60vh — the default</Hero.Content>
</Hero>
<Hero size="lg">
  <Hero.Content>80vh — a landing-page header</Hero.Content>
</Hero>
<Hero size="full">
  <Hero.Content>100vh — a full-viewport splash</Hero.Content>
</Hero>
```
<!-- /example -->

`align` is `align-items` on the flex row, so it moves the content block along the **cross
axis — vertically.** None of the three settings moves anything left or right; `Hero.Content`
is `width: 100%` in all of them. For horizontal placement, use text alignment or a
[Container](container.md) inside the content block.

<!-- example:Alignment -->
```tsx
<Hero size="sm" align="start">
  <Hero.Content>Pinned to the top edge</Hero.Content>
</Hero>
<Hero size="sm" align="center">
  <Hero.Content>Centred between the edges</Hero.Content>
</Hero>
<Hero size="sm" align="end">
  <Hero.Content>Sitting on the bottom edge — the default</Hero.Content>
</Hero>
```
<!-- /example -->

## Backgrounds

`Hero.Background` omits `children` from its prop type, so the layer holds either the `<img>`
it builds from `src` or nothing at all. `className` (or `style`) is therefore how you paint
it — a gradient, a video poster, or a flat brand fill:

<!-- example:BrandFill -->
```tsx
<Hero size="sm" align="center" overlay={false}>
  <Hero.Background className="bg-primary" />
  <Hero.Content>
    <Stack gap="r4">
      <Text variant="h2" color="on-primary">
        Every component reads the same token contract
      </Text>
      <Button variant="ghost-inverse" className="self-start">
        Read the docs
      </Button>
    </Stack>
  </Hero.Content>
</Hero>
```
<!-- /example -->

This is the one hero composition the [theme contract](../theme-contract.md) is built around.
`--C-TEXT-ON-PRIMARY` is defined there as the ink drawn on `--C-PRIMARY` fill, so a
`bg-primary` layer under `on-primary` text and a `ghost-inverse` [Button](button.md) is a
[paired](../theme-contract.md#the-contrast-pairing) combination, designed to read against
itself. The scrim is switched off because darkening a brand fill only muddies it.
Over a photograph the pairing does not carry — see
[Contrast over an image](#contrast-over-an-image).

With a `src`, the layer renders a covering `<img>`. Leave `alt` off and it is marked
decorative; supply one only when the picture carries something the copy doesn't:

<!-- example:DescribedBackground -->
```tsx
<Hero size="sm" align="center">
  <Hero.Background
    src="/images/keynote-stage-2026.jpg"
    alt="The 2026 keynote stage, seen from the back of a full hall"
  />
  <Hero.Content>
    <Text variant="h2" color="on-primary">
      Tickets for 2026 are live
    </Text>
  </Hero.Content>
</Hero>
```
<!-- /example -->

`Hero.Background` sets no `z-index`, so you can render more than one and DOM order stacks
them — a second layer carrying a gradient class, placed after the image, darkens only the
part of the frame your copy sits on.

`parallax` hands the image to [Parallax](parallax.md) and swaps the layer's `inset: 0` for
`inset: -50% 0`, making it twice the section's height so it has room to travel without
exposing an edge; `overflow: hidden` on the section crops the overhang. `parallaxRate` is
forwarded as Parallax's `rate` — omit it and Parallax uses `0.3`. Parallax is a client
component, and it attaches no scroll listener at all under `prefers-reduced-motion`.

<!-- example:ParallaxBackground -->
```tsx
<Hero size="lg" align="center">
  <Hero.Background src="/images/alpine-ridge.jpg" parallax parallaxRate={0.2} />
  <Hero.Content>
    <Text variant="h1" color="on-primary">
      Two weeks above the tree line
    </Text>
  </Hero.Content>
</Hero>
```
<!-- /example -->

## Content and actions

`Hero.Content` contributes exactly three things: the responsive padding, `position: relative`
with `z-index: 10` so it clears the scrim, and `width: 100%`. No gap, no max-width, no
colour. Compose the rest — [Stack](stack.md) and [Row](row.md) for rhythm,
[Container](container.md) to cap the measure (it brings its own `px-r3` on top of the hero's
padding), [Text](text.md) for the type scale:

<!-- example:CallToAction -->
```tsx
<Hero size="lg">
  <Hero.Background src="/images/harbour-at-dusk.jpg" />
  <Hero.Content>
    <Container size="xl">
      <Stack gap="r4">
        <Text variant="h1" color="on-primary">
          Harbour tours, every evening
        </Text>
        <Text variant="body-1" color="on-primary">
          Ninety minutes on the water, departing at sunset.
        </Text>
        <Row gap="r5">
          <Button type="button">Book a tour</Button>
          <Button type="button" variant="ghost-inverse">
            Watch the trailer
          </Button>
        </Row>
      </Stack>
    </Container>
  </Hero.Content>
</Hero>
```
<!-- /example -->

`animate` wraps the children in [ScrollReveal](scroll-reveal.md) and [Stagger](stagger.md),
which reveals the whole block the first time it intersects the viewport. `animation` picks
the entrance — `"fade-up"` (the default, a slide plus a fade), `"fade-in"` or `"scale"`,
three of ScrollReveal's five. Those two props are the entire surface: ScrollReveal's
`threshold`, `rootMargin`, `delay` and `once` are not reachable through Hero, so the reveal
is always once-only at a 10% intersection ratio. The block carries the entrance you picked;
the Stagger layer then fades your children in one after another, one
`--MOTION-STAGGER-DELAY` apart. It also changes your DOM shape — see [Gotchas](#gotchas).

<!-- example:AnimatedContent -->
```tsx
<Hero size="lg" align="center">
  <Hero.Background src="/images/studio-desk.jpg" />
  <Hero.Content animate animation="fade-in">
    <Text variant="h1" color="on-primary">
      Built for teams that ship
    </Text>
    <Text variant="body-1" color="on-primary">
      The block fades in, then each line follows one stagger step behind the last.
    </Text>
    <Button type="button" variant="ghost-inverse">
      Start a trial
    </Button>
  </Hero.Content>
</Hero>
```
<!-- /example -->

## Contrast over an image

The scrim is the only contrast lever Hero owns, and what it buys depends on the theme and on
the image. `--OVERLAY-SCRIM-COLOR` ships as:

| Theme      | Scrim                                    |
| ---------- | ---------------------------------------- |
| default    | `oklch(0 0 0 / 0.5)`                     |
| `events`   | `oklch(0.2161 0.0061 56.04 / 0.45)`      |
| `tech`     | `oklch(0.0608 0.0421 264.05 / 0.7)`      |
| `grimdark` | `oklch(0 0 0 / 0.8)`                     |

Composite each scrim over the brightest thing a photograph can present — a pure-white region
— and measure `--C-TEXT-ON-PRIMARY` against it. That is the ink behind both
`Text color="on-primary"` and `Button variant="ghost-inverse"`, and it is the only text
token that is light in all four shipped themes:

| Theme      | Worst case (white region) | Best case (black region) |
| ---------- | ------------------------- | ------------------------ |
| default    | **3.98:1**                | 21.0:1                   |
| `events`   | **2.89:1**                | 19.6:1                   |
| `tech`     | 6.31:1                    | 15.6:1                   |
| `grimdark` | 7.44:1                    | 12.4:1                   |

So in the default theme a bright frame clears the 3:1 large-text floor but not the 4.5:1
body-text one, and in `events` it clears neither. The contract only promises
`--C-TEXT-ON-PRIMARY` against `--C-PRIMARY` fill; a scrimmed photograph is not that fill,
and nothing in the system checks the pair. Do not assume a hero image is safe because the
scrim is on.

Three ways out, in order of how much they actually guarantee:

1. **Put the copy on a fill,** not the photo — the `BrandFill` composition above.
2. **Darken the scrim for that hero.** `.hero__overlay` reads the variable at paint time and
   custom properties inherit, so setting `--OVERLAY-SCRIM-COLOR` on the `<section>` itself,
   inline or through a class of your own, affects only that hero.
3. **Add a gradient layer** as a second `Hero.Background` after the image, so the darkening
   sits under the copy rather than over the whole frame.

The other two light-ink candidates are worse: `--C-TEXT-PRIMARY` is dark in the default and
`events` themes, and `--C-TEXT-INVERSE` is dark in `tech` and `grimdark` — either one goes
dark-on-dark in half the themes you ship.

## Theme tokens

Hero touches the contract in exactly two places — the scrim colour and the content padding.
It sets **no background of its own and no text colour**, so everything inside inherits
whatever ink the surrounding page established, which is why the section above matters.

| Where           | Override                                                                 |
| --------------- | ------------------------------------------------------------------------ |
| Overlay scrim   | `--OVERLAY-SCRIM-COLOR`                                                   |
| Content padding | `--R-SIZE-3` below `40rem` · `--R-SIZE-2` from `40rem` · `--R-SIZE-1` from `64rem` |
| Stagger entrance | `--MOTION-DURATION-ENTER` · `--MOTION-EASE-ENTER`                        |

`Hero.css` reads all of those variables directly. The component's only Tailwind
utilities are the `size-full` / `object-cover` pair on the background `<img>`, and neither
resolves to a token. The two motion variables are shared enter tokens, so retiming them
retimes every entrance in the system — there is no Hero-only duration. The *gap* between
the staggered items is not Hero's at all: it comes from `.stagger-item`, so retime it with
[Stagger](stagger.md)'s three sources.

The padding ramp is responsive twice over. `Hero.css` swaps *which* `r`-token it reads at
`40rem` and again at `64rem`, and the `r`-scale itself steps up at `40rem`. Net effect:
`1rem` below `40rem`, `2rem` from `40rem`, `6rem` from `64rem` — a wide hero gets six times
the gutter of a phone-width one, with no breakpoint utilities from you.

`Hero.css` reads `var(--OVERLAY-SCRIM-COLOR, rgb(0 0 0 / 0.5))`, the same fallback
`Drawer.css` and `CommandPalette.css` write — so without the token layer the scrim degrades
to 50% black rather than vanishing.

## Gotchas

- **Only `Hero.Content` paints above the scrim.** The overlay is appended after your children
  and fills the section, so anything but `Hero.Content` (which escapes with `z-index: 10`)
  renders dimmed. It carries `pointer-events: none`, so it no longer swallows clicks — a
  [Button](button.md) placed straight inside `<Hero>` is still clickable, just darkened. Put
  content you want at full strength inside `Hero.Content`.
- **The scrim follows the background.** `overlay` defaults to whether a `Hero.Background` is
  among the children, so `<Hero><Hero.Content>…</Hero.Content></Hero>` paints no rectangle
  over its own copy. Pass `overlay` explicitly to force it either way — `overlay` on a
  background-less hero still darkens the page beneath the content.
- **`align` is vertical.** It reads like text alignment and is not; see
  [Height and vertical placement](#height-and-vertical-placement).
- **`alt` without `src` does nothing.** No `<img>` is rendered at all unless `src` is set, so
  `alt` is silently dropped. `parallax` without `src` is now an honest no-op: with no image to
  drift, neither the client Parallax wrapper nor the 200%-height layer is mounted.
- **`animate` adds three wrappers, and lays out the first one.** Your children end up inside
  `ScrollReveal > Stagger > div.stagger-item`, so any `flex`, `grid` or `gap` class you put
  on `Hero.Content` now lays out a single `<div>`, not your elements. See
  [Stagger](stagger.md).
- **The cascade is Hero's, not Stagger's.** [Stagger](stagger.md) ships delays and no
  `animation-name` by design — the caller supplies the entrance. Hero supplies one in
  `Hero.css`, scoped to `.hero__content .stagger-item`: a plain `fade` over
  `--MOTION-DURATION-ENTER`, held off until the reveal drops its hidden class. Two
  consequences. Any Stagger *you* nest inside `Hero.Content` picks up the same fade. And
  `animation-name` on `.hero__content .stagger-item` is not overridable from a
  `className` — the rule is unlayered component CSS, which outranks every Tailwind
  utility; write your own unlayered rule after this package's stylesheet instead.
- **`animate` hides the content until an observer fires.** ScrollReveal starts at
  `opacity: 0` and clears it on intersection — and a hero is usually the page's `<h1>`.
  Three environments never get an intersection, and only two are covered: no
  `IntersectionObserver` reveals on mount, scripting switched off reveals in CSS, but a
  page whose bundle simply never executes still shows nothing. Under
  `prefers-reduced-motion` the hidden state is skipped entirely and no item animates, so
  that path is safe. See [ScrollReveal](scroll-reveal.md#opting-out-of-the-reveal).
- **`overflow: hidden` crops anything that overhangs** — a decorative shape bleeding past the
  edge, a `position: sticky` child, a menu that expands downward. Overlays that render through
  a [Portal](portal.md) escape it.
- **`size="full"` is `dvh`, the rest are `vh`.** `.hero--full` declares `100vh` and then
  `100dvh`, so a browser that understands the dynamic unit tracks a retracting URL bar and one
  that does not falls back to the large viewport. `sm`/`md`/`lg` are still `vh` fractions.
  Overriding any of them needs the important modifier or your own unlayered rule: `cn` will
  not dedupe `hero--full` against a `min-h-*` class, and `.hero--full` is unlayered component
  CSS while Tailwind v4 puts utilities in `@layer utilities` — unlayered outranks layered
  outright, whatever the specificity or the source order.
- **Both stylesheets are required.** Hero is almost entirely CSS: `.../styles` from this
  package supplies the layering, the scrim and the padding rules, and
  `@batthewz/response-ui-css` supplies the variables they read. Miss the first and you get an
  unstyled `<section>` of `<div>`s; miss the second and the scrim falls back to 50% black.
- **Server-renderable, with client leaves.** `Hero.tsx` carries no `"use client"`, so all
  three parts drop into an RSC tree. `parallax` and `animate` are what pull client components
  ([Parallax](parallax.md), [ScrollReveal](scroll-reveal.md), [Stagger](stagger.md)) into it.

## Accessibility

- **An unnamed `<section>` is not a landmark.** Hero renders a plain `<section>` and adds no
  `aria-label`. A `<section>` maps to the `region` role only when it has an accessible name,
  so out of the box this is a generic container a screen-reader user cannot jump to. Give it
  `aria-labelledby` pointing at your headline's `id` if it should be one.
- **Hero renders no heading.** Nothing here creates an `<h1>`; the level is entirely yours.
  [Text](text.md) with `variant="h1"` renders a real `<h1>`.
- **The scrim is correctly hidden and inert.** The overlay carries `aria-hidden="true"`, holds
  no content and sets `pointer-events: none`, so it is invisible to assistive technology and
  transparent to the pointer alike.
- **Background images are decorative by default.** With no `alt`, the `<img>` gets `alt=""`
  *and* `role="presentation"`, so it drops out of the accessibility tree. Pass `alt` and it
  becomes a named image announced in DOM order — before your headline, if `Hero.Background`
  comes first.
- **Motion is reduced-motion safe.** Under `prefers-reduced-motion: reduce`, Parallax attaches
  no listener and applies no transform, ScrollReveal skips both the observer and the hidden
  state so the content is simply present, Stagger zeroes every index, and the item fade
  Hero adds is inside a `prefers-reduced-motion: no-preference` block — so it is not
  merely instant, it never starts. A browser too old to understand the query gets no
  cascade rather than an unguarded one.
- **Contrast over an image is on you.** Hero applies no text colour and cannot know what your image
  looks like — see [Contrast over an image](#contrast-over-an-image).

## Related

[Parallax](parallax.md) · [ScrollReveal](scroll-reveal.md) · [Stagger](stagger.md) ·
[Button](button.md) · [Container](container.md) · [MediaCard](media-card.md) · [Carousel](carousel.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
