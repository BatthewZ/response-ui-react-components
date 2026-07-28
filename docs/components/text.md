# Text

The typography primitive. Nine steps on the type scale, five theme inks, and the matching
element picked for you — and because every step is a variable that already grows at the
40rem breakpoint, one prop buys you responsive type with no breakpoint utilities.

<!-- example:Minimal -->
```tsx
<Text>Your changes have been saved to the workspace.</Text>
```
<!-- /example -->

| Prop        | Type                                                                                  | Default            |
| ----------- | ------------------------------------------------------------------------------------- | ------------------ |
| `variant`   | `"h1" \| "h2" \| "h3" \| "h4" \| "h5" \| "h6" \| "body-1" \| "body-2" \| "body-3"`      | `"body-1"`         |
| `color`     | `"primary" \| "secondary" \| "muted" \| "inverse" \| "on-primary"`                     | `"primary"`        |
| `weight`    | `"semibold" \| "bold"`                                                                | — (element's own)  |
| `as`        | `ElementType`                                                                         | chosen by `variant` |
| `className` | `string`                                                                              | —                  |
| `ref`       | ref of whatever `as` renders                                                          | —                  |
| …rest       | props of `as`, minus `as` and `color`                                                 | —                  |

`variant` and `as` are separable and both matter — see
[Size and semantics are separate](#size-and-semantics-are-separate).

## The scale

<!-- example:Variants -->
```tsx
<Text variant="h1">Release notes</Text>
<Text variant="h2">Version 2.4.0</Text>
<Text variant="h3">Breaking changes</Text>
<Text variant="h4">Theme tokens</Text>
<Text variant="h5">Migration steps</Text>
<Text variant="h6">Deprecations</Text>
<Text variant="body-1">Every colour now resolves through a theme variable.</Text>
<Text variant="body-2">Run the codemod before you upgrade.</Text>
<Text variant="body-3">Published 12 March 2026 by Ada Lovelace.</Text>
```
<!-- /example -->

`variant` does two things: it applies the type step, and — unless you pass `as` — it
picks the element.

| `variant`                     | Default element |
| ----------------------------- | --------------- |
| `h1` `h2` `h3` `h4` `h5` `h6` | `<h1>`…`<h6>`   |
| `body-1` `body-2` `body-3`    | `<p>`           |

So `variant` is a **semantic** choice by default, not only a visual one. Reaching for
`variant="h4"` because it is the size you wanted puts a real `<h4>` in the document
outline. See [Gotchas](#gotchas).

## Colour

<!-- example:Colors -->
```tsx
<Text color="primary">Invoice #1042 is ready to send.</Text>
<Text color="secondary">Issued to Northwind Traders on 3 March.</Text>
<Text color="muted">Draft — not yet delivered.</Text>
```
<!-- /example -->

`primary` and `secondary` are the two inks meant to be *read* on a `surface-*` token, in
descending emphasis. `muted` is not a third rung of that ladder: the
[theme contract](../theme-contract.md) defines `--C-TEXT-MUTED` as the "most-muted"
ink — placeholders and hints. Since the `@batthewz/response-ui-css` v0.10.1 retune it
measures 4.85–5.23:1 against `--C-SURFACE-0` across the four measured themes, clearing WCAG AA
for body text on the base surface — but the contract names the role, not a ratio. Reach
for it when the words are decoration; reach for `secondary` when they are information.
See [Accessibility](#accessibility).

The other two are background-specific: `on-primary` is defined as text drawn on the
`--C-PRIMARY` fill, `inverse` as text on a background of the opposite luminance to the
theme's own. Text paints no background, so both need one from you — in the default and
`events` themes both resolve to white and vanish on those themes' light surfaces:

<!-- example:OnFilledBackground -->
```tsx
<div className="bg-primary p-r4">
  <Text variant="h4" color="on-primary">
    Upgrade to the team plan
  </Text>
  <Text variant="body-2" color="inverse">
    Unlimited workspaces and priority support.
  </Text>
</div>
```
<!-- /example -->

## Weight

<!-- example:Weights -->
```tsx
<Text weight="semibold">Payment method</Text>
<Text weight="bold">Visa ending 4242</Text>
```
<!-- /example -->

`weight` has no default. Omit it and the element keeps the weight it would have had
anyway — inherited body weight on a `<p>` or `<span>`, the base stylesheet's heading
weight on an `<h1>`–`<h6>`. Set it and it always overrides that, which is why `weight` on
a heading can make it *lighter* rather than heavier. See [Gotchas](#gotchas).

## Size and semantics are separate

Pass `as` to keep the type step and change the element. This is the honest way to get
"heading-sized" text that is not a heading:

<!-- example:VisualSizeOnly -->
```tsx
<Text variant="h3" as="p">
  2,481 active workspaces
</Text>
```
<!-- /example -->

It also works the other way — `as="span"` drops Text into running prose:

<!-- example:InlineSpan -->
```tsx
<Text color="secondary">
  Signed in as{" "}
  <Text as="span" color="primary" weight="semibold">
    ada@lovelace.dev
  </Text>
</Text>
```
<!-- /example -->

## Everything else passes through

Text destructures only `variant`, `weight`, `color`, `as` and `className`, and spreads
the rest onto the rendered element. `id`, `data-*`, `aria-*`, event handlers and `ref`
all arrive — the types and the runtime agree:

<!-- example:LabelledSection -->
```tsx
<section aria-labelledby="billing-heading">
  <Text variant="h2" id="billing-heading">
    Billing
  </Text>
  <Text color="secondary">Your next invoice is due on 1 April 2026.</Text>
</section>
```
<!-- /example -->

## Theme tokens

Text has no CSS file. Every one of its styles is a Tailwind utility that resolves to a
contract variable, so a theme swap re-types and re-tints the whole app without touching a
component.

| Where          | Utility                                                            | Override                                        |
| -------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| Heading steps  | `text-h1` `text-h2` `text-h3` `text-h4` `text-h5` `text-h6`        | `--H1` `--H2` `--H3` `--H4` `--H5` `--H6`       |
| Body steps     | `text-body-1` `text-body-2` `text-body-3`                          | `--BodyText-1` `--BodyText-2` `--BodyText-3`    |
| Default ink    | `text-fg-primary`                                                  | `--C-TEXT-PRIMARY`                              |
| De-emphasised  | `text-fg-secondary`                                                | `--C-TEXT-SECONDARY`                            |
| Hint-level ink | `text-fg-muted`                                                    | `--C-TEXT-MUTED`                                |
| Inverse ink    | `text-fg-inverse`                                                  | `--C-TEXT-INVERSE`                              |
| Ink on a fill  | `text-fg-on-primary`                                               | `--C-TEXT-ON-PRIMARY`                           |
| Weight         | `font-semibold` `font-bold`                                        | `--Semibold-Weight` `--Bold-Weight`             |

**Each type step is a pair.** A `text-*` step emits `font-size` *and* `line-height` —
`text-h1` compiles to
`font-size: var(--H1); line-height: var(--tw-leading, var(--H1-line-height))` — so the
matching `--H*-line-height` / `--BodyText-*-line-height` variables are just as much part
of what you are overriding, and overriding a size alone will throw the rhythm off. The
`--tw-leading` fallback is the escape hatch: a `leading-*` utility sets that variable, so
it retunes the leading without touching the size.

**The scale is responsive.** Every `--H*` and `--BodyText-*` value is redefined inside
`@media (width >= 40rem)`: `--H1` goes `2.25rem` → `4rem`, `--BodyText-1` goes
`0.875rem` → `1rem`. That is why `variant` alone is enough — you never add `sm:` type
utilities on top. The caveat is that a theme can pin a step to one value, and because a
theme selector outranks the media query, a pinned step stops stepping. None of the three
worked examples touch `--H*`, but all three pin some of the body pair: `tech` pins all
three `--BodyText-*` sizes *and* all three `--BodyText-*-line-height`s, so body type in
`tech` does **not** step at 40rem at all; `grimdark` pins all three leadings and `events`
pins the `--BodyText-1`/`-2` leadings, so in those two the size still grows at 40rem while
the leading half of the pair stays put.

**Weight composes from a static map.** `font-semibold` and `font-bold` are written out
literally in `Text.tsx` — never assembled as `` `font-${weight}` ``, which Tailwind's
scanner cannot see — so both utilities are guaranteed to exist in the built CSS whenever
this package is a Tailwind source. They
resolve to `--Semibold-Weight` and `--Bold-Weight`. Neither has a single value: on the
default scale `--Semibold-Weight` is `500` below 40rem and `600` at or above it, and
`--Bold-Weight` is `600` → `700`. A theme can re-pin both to one number that holds at every
width, and each worked example does —
`tech` 500/600, `events` 600/800, `grimdark` 700/900 (semibold/bold). Treat "semibold"
as a role, not a number.

## Gotchas

- **A heading `variant` emits a heading element.** `variant="h3"` renders `<h3>` unless
  you pass `as`. Picking a variant for its size alone silently edits the document
  outline, and nothing checks that the levels you emit are in order.
- **`variant` carries the heading *size*, not the heading *look*.** The heading typeface
  (`--HEADING-FONT`), `--HEADING-LETTER-SPACING`, `--HEADING-TEXT-TRANSFORM` and the
  built-in heading weight (`700` for `h1`–`h5`, `600` for `h6`) come from the CSS
  foundation's `h1`–`h6` **element** selectors, not from the `text-h*` utility. So
  `<Text variant="h2" as="p">` is heading-sized body text — different weight, and, in any
  theme that sets `--HEADING-FONT`, a different typeface too. How visible that is depends
  entirely on the theme: the default sets `--HEADING-FONT: var(--DEFAULT-FONT)`,
  `--HEADING-LETTER-SPACING: normal` and `--HEADING-TEXT-TRANSFORM: none`, so there the
  *only* difference is the weight. In `tech` (Space Grotesk), `events` (Playfair Display)
  and `grimdark` (Cinzel, uppercase, wide tracking) the gap is unmissable. The reverse
  also holds: `<Text variant="body-1" as="h3">` gets the heading face and weight `700` at
  body size. This is the split working as designed — `as` buys you the type step without
  the heading's voice. When you want both on a non-heading element, `@batthewz/response-ui-css`
  ships `.h1`–`.h6` class twins of those element selectors: `<Text variant="h3" as="p"
  className="h3">` takes its size from the utility and its face, tracking and weight from
  the class (measured: 48px/700 on a `<p>`, against 48px/400 without it).
- **`weight` on a heading replaces the heading's own weight, in whichever direction the
  theme points.** Utilities sit in a later cascade layer than the base stylesheet, so
  `weight` overrides the built-in `700` (`600` on `h6`). On the default scale below 40rem
  that means `weight="bold"` → `600` and `weight="semibold"` → `500`, both *lighter* than
  leaving `weight` off; at 40rem and up the default's `bold` is `700`, identical to the
  built-in weight on `h1`–`h5`, so it changes nothing. Themes flip the sign: in `events`
  (`--Bold-Weight: 800`) and `grimdark` (`900`) `weight="bold"` on a heading is *heavier*
  than `700`, and `grimdark`'s `semibold` (`700`) matches it exactly. On a heading,
  `weight` is not a dependable "more emphasis" knob in either direction — keep it for body
  variants, and check the numbers above before using it on a heading.
- **`inverse` and `on-primary` need a fill under them.** Text renders no background, so
  those two colours are only legible on something you supply.
- **`className` beats `variant` and `color`.** Classes are merged with `tailwind-merge`
  and `className` is merged last, so `className="text-h3"` overrides `variant="h1"`'s
  size and `className="text-fg-muted"` overrides `color`. That is the intended escape
  hatch; it also means a stray `text-*` class in a wrapper's `className` will quietly win.
- **The native `color` attribute is unavailable.** React types a non-standard
  `color?: string` on every HTML element; Text `Omit`s it so the prop always means a
  token. `<Text color="#ff0000">` will not compile — use `className` instead.
- **Types follow `as`, not `variant`.** With `variant="h2"` and no `as`, the props and
  `ref` are typed from `<p>` while an `<h2>` is what renders. Nothing breaks in practice
  (the DOM lib declares `HTMLParagraphElement` and `HTMLHeadingElement` identically), but
  pass `as="h2"` if you want the type to say what the DOM will hold.
- **Server-renderable.** No `"use client"`, no hooks — Text drops straight into an RSC
  tree.

## Accessibility

Heading variants produce real `<h1>`–`<h6>` elements, so screen-reader heading navigation
and document outline both work by default. What the component does *not* do is validate
them: it will happily render an `<h4>` directly after an `<h1>`. Choose `variant` by
outline position and reach for `as` when you only wanted the size.

Text adds no `role` and no `aria-*` of its own. Whatever you pass through is exactly what
ships — including the `id` an `aria-labelledby` elsewhere depends on.

`color` changes colour and nothing else — no weight change, no underline. If a colour is
carrying meaning (an error, a diff removal), pair it with text or an icon; colour alone
fails WCAG 1.4.1.

`color="muted"` is the hint-level role, not a third body ink. The
`@batthewz/response-ui-css` v0.10.1 retune lifted `--C-TEXT-MUTED` to 4.85–5.23:1 against
`--C-SURFACE-0` in the four measured themes — an older copy of this page measured it under
2.6:1 and said the opposite — so muted copy now clears WCAG AA for body text on the base
surface. The ranking still holds: measured against all four `surface-*` steps of every
theme measured, `--C-TEXT-PRIMARY` never falls below 8.4:1 and `--C-TEXT-SECONDARY` never
below 4.4:1, so `primary` is the ink for anything that has to be read, `secondary` the
one for de-emphasised copy, and `muted` belongs on placeholders and hints that repeat
something already available elsewhere — the muted figures above are `--C-SURFACE-0` only,
so re-check before letting it carry the only copy of a fact on a deeper surface. If your
own theme redefines these, re-check every ratio — the contract names the roles, it does
not guarantee the contrast.

## Related

[Label](label.md) · [DescriptionList](description-list.md) · [Kbd](kbd.md) · [CodeBlock](code-block.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
