# Container

Centers your page content and caps its width to a comfortable reading measure. Five
width steps — from a sign-in card to a full-bleed dashboard — with a responsive gutter
that widens on larger screens.

<!-- example:Minimal -->
```tsx
<Container>
  <h1>Release notes</h1>
  <p>Everything that shipped in this version, newest first.</p>
</Container>
```
<!-- /example -->

| Prop        | Type                                          | Default |
| ----------- | --------------------------------------------- | ------- |
| `size`      | `"sm" \| "md" \| "lg" \| "xl" \| "full"`      | `"md"`  |
| `className` | `string`                                      | —       |
| `ref`       | `Ref<HTMLDivElement>`                         | —       |
| …rest       | props of `div` (minus `size`)                 | —       |

Container is not polymorphic — it always renders a `<div>`, so there is no `as` prop.
It caps width and centers; everything else is a wrapper's job. See [Gotchas](#gotchas).

## Size

`size` sets the max-width. `sm` (30rem) through `xl` (64rem) step up the cap; `full`
removes it, leaving only the centering and the gutters so the box fills its parent.

<!-- example:Sizes -->
```tsx
<Container size="sm">Sign-in form</Container>
<Container size="md">Article body</Container>
<Container size="lg">Documentation page</Container>
<Container size="xl">Dashboard grid</Container>
<Container size="full">Full-bleed section</Container>
```
<!-- /example -->

The max-widths are fixed rem values baked into the component, **not** theme variables —
a content measure shouldn't drift when someone re-themes the app. Only the horizontal
gutter is tokenized (see [Theme tokens](#theme-tokens)). To depart from the scale for
one instance, override with `className="max-w-…"` — `cn()` collapses the conflict.

## Full-bleed background

Container constrains width and nothing else — it paints no background and adds no
vertical spacing. For an edge-to-edge coloured band with readable copy inside, put the
fill on a wrapping element and let the Container hold the content to the measure:

<!-- example:FullBleedBackground -->
```tsx
<div className="bg-surface-1">
  <Container size="lg">
    <h2>Trusted by teams everywhere</h2>
    <p>The band stretches edge to edge; the text stays within the measure.</p>
  </Container>
</div>
```
<!-- /example -->

The same wrapping pattern gives you a semantic landmark: `<main><Container>…</Container></main>`.

## Theme tokens

Container hard-codes no colour and one spacing value. Its horizontal gutter resolves to
a contract variable, so it follows the responsive spacing scale the rest of the app uses.

| Where             | Utility  | Override     |
| ----------------- | -------- | ------------ |
| Horizontal gutter | `px-r3`  | `--R-SIZE-3` |

`px-r3` rides the responsive `r`-scale: `--R-SIZE-3` is `1rem` on mobile and steps up to
`1.5rem` at the 40rem breakpoint with no work from you. The **max-width** scale is the
one thing here that is *not* overridable through a variable — the caps are literal rems
(`max-w-[30rem]` … `max-w-[64rem]`, `max-w-full`), so retune width per call with
`className`, not with a theme. `mx-auto` and `w-full` are plain Tailwind core, not tokens.

## Gotchas

- **Not polymorphic — always a `<div>`.** There is no `as` prop, so Container can't
  itself be a `<main>`, `<section>`, or `<nav>`. Wrap it in the semantic element (or pass
  `role` through `…rest`) when you need a landmark.
- **The cap is border-box, so gutters eat into it.** `max-w-[40rem]` bounds the *outer*
  box including its `px-r3` padding (Tailwind's default `box-sizing: border-box`), so the
  usable content width is the cap minus two gutters — a touch narrower than the number
  suggests, and narrower still on desktop where the gutter grows.
- **No background, no vertical rhythm.** Container centers and caps width only. Colour,
  padding-block, and gaps are the caller's — see [Full-bleed background](#full-bleed-background).
- **Nesting double-applies the gutter.** A Container inside a Container re-centers and
  adds a second `px-r3`, indenting content twice. Nest only when you deliberately want a
  narrower measure inside a wider one.
- **No per-component CSS, yet both package CSS imports are still required.** There is no
  `Container.css` — Container is styled entirely from utility classes, and only one of
  them, `px-r3`, maps to a `@batthewz/response-ui-css` token (`--spacing-r3` →
  `--R-SIZE-3`); `mx-auto`, `w-full`, and the `max-w-*` classes are plain Tailwind core.
  Both imports are needed because react-components' own `styles.css` registers
  `@source "../src/**/*.{ts,tsx}"`, which is what makes Tailwind emit Container's utility
  classes in the consumer's build.
- **Server-renderable.** No `"use client"`, so it drops straight into an RSC tree.

## Accessibility

Container is a presentational `<div>` — it carries no role and no interaction, which is
correct for a pure layout box. Because it can't render a semantic element itself, don't
lean on it for document structure: put your `<main>`, `<section>`, and heading landmarks
around or inside it so screen-reader users still get the page outline.

## Related

[Grid](grid.md) · [Divider](divider.md) · `Stack` · `Row` · `Center` · `Spacer` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
