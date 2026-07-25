# spotlight — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 193 · Spotlight — nothing reaches the `<img>` (med)

`SpotlightImage` builds `<img src alt role>` from three props and spreads everything else onto
the wrapper `<div>`. Measured:

```
<Spotlight.Image src="/a.jpg" alt="A" loading="lazy" id="wrap" width={640} height={360} />
→ <div class="spotlight-image" loading="lazy" id="wrap" width="640" height="360">
     <img src="/a.jpg" alt="A"/></div>
```

`loading`, `width` and `height` on a `<div>` are inert, so every Spotlight image loads eagerly and
reserves no space — layout shift on any page with more than a couple of rows, and no route to
`srcSet`/`sizes` for responsive art. `MediaCard.Image` spreads img props and defaults to
`loading="lazy"`, so the library disagrees with itself. **Fix:** split the props into wrapper +
`imgProps`, or type it like `MediaCard.Image`.

### 195 · Spotlight — alternation and `reversed` both no-op on a content-first row (med)

Every `order` rule in `Spotlight.css` pushes `.spotlight-image` last and pulls the copy first.
For a row authored `<Spotlight.Content>` then `<Spotlight.Image>`, source order already satisfies
that: odd rows have no order rules at all, and even rows apply `order: 2` to an image that is
already last. So every row renders copy-left / image-right and `reversed` changes nothing — the
component looks broken rather than mis-configured, with no warning that child order is
load-bearing. **Fix:** order both children explicitly per parity (`order: 1`/`order: 2` on both,
unconditionally) instead of relying on source order.

### 196 · Spotlight — the parallax layer has no overscan (med)

`Spotlight.Image` renders `<Parallax className="size-full">` inside a wrapper that is
`overflow: hidden`, so the drifting layer is exactly the size of its clipping box: a translate of
*n* pixels leaves an *n*-pixel empty band at one edge. `Parallax`'s offset is
`(elementCentre − viewportCentre) × rate` and is clamped only when `clamp` is passed — which
`Spotlight.Image` does not forward. On a 1080px viewport a row sitting ~540px off centre at the
default rate `0.3` shifts 162px, half a 320px box. `Hero.css` solves the identical problem with
`.hero__background--parallax { inset: -50% 0 }`; `Spotlight.css` has no equivalent. **Fix:** add
an over-sized parallax modifier and forward `clamp`.
