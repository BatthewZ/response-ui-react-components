# Spinner

The indeterminate busy indicator: a rotating ring for a wait you can't put a number on.
It ships with `role="status"` and a visually hidden "Loading" text node, takes its colour
from the text around it, and comes in three fixed sizes.

<!-- example:Minimal -->
```tsx
<Spinner />
```
<!-- /example -->

| Prop        | Type                   | Default |
| ----------- | ---------------------- | ------- |
| `size`      | `"sm" \| "md" \| "lg"` | `"md"`  |
| `className` | `string`               | —       |
| `ref`       | `Ref<HTMLDivElement>`  | —       |
| …rest       | props of `div`, less `children` | — |

That is the entire API — no `label`, no `variant`, and nothing you can nest inside, so the
hidden "Loading" text is the only content the element ever has. Everything in `…rest` lands
on the `<div>` **after** the component's own `role`, so a `role` you pass replaces the default
one and `aria-*` attributes go straight through — that is how you opt out of the default
announcement. See [Gotchas](#gotchas).

## Size

<!-- example:Sizes -->
```tsx
<Spinner size="sm" />
<Spinner size="md" />
<Spinner size="lg" />
```
<!-- /example -->

`sm` is 1rem, `md` 1.5rem, `lg` 2rem — square, since the element is a circle. These sit on
Tailwind's static spacing scale, not this library's responsive `r`-scale, so a spinner is
the same size on a phone and on a desktop.

## Colour

The ring is `border-current` with a transparent top edge, so it paints in `currentColor`
and nothing else. Set `color` on the spinner or on any ancestor and it follows:

<!-- example:Tinted -->
```tsx
<Spinner className="text-accent" />
<div className="text-status-error">
  <Spinner size="sm" />
</div>
```
<!-- /example -->

That makes it theme-following by **inheritance** rather than by token — there is no
spinner-colour variable to override. Tint it with a `text-*` utility, never a `border-*`
one; see [Gotchas](#gotchas) for what a border colour does to the gap.

## Beyond the three sizes

`className` is merged into the base classes with `tailwind-merge`, so a diameter or a ring
width passed there replaces the built-in one instead of fighting it:

<!-- example:CustomGeometry -->
```tsx
<Spinner className="size-12 border-4" />
```
<!-- /example -->

## Inside a button

[Button](button.md#loading-state) has no `loading` prop, because where the spinner goes and
what the label says are call-site decisions. Compose it — the button's own per-size gap
spaces the two, so no wrapper is needed:

<!-- example:InsideButton -->
```tsx
<Button disabled>
  <Spinner size="sm" />
  Saving…
</Button>
```
<!-- /example -->

A button names itself from its contents, so this one announces as **"Loading Saving…"** —
the spinner's hidden text, then the label. Add `aria-hidden` to the spinner if you want the
button to read as just "Saving…".

## Full-page waits

<!-- example:FullPageLoad -->
```tsx
<Center className="min-h-screen">
  <Spinner size="lg" />
</Center>
```
<!-- /example -->

This is what [RequireAuth](require-auth.md) renders by default for its `"loading"` branch —
a `loadingFallback` replaces it — and the reason [Center](center.md) is worth reaching for:
the spinner has no opinion about where it sits.

## Labelling the wait

"Loading" is the only thing Spinner can say, and it can't be changed. When the wait needs a
real message — or any message not in English — put the semantics on a container of your own
and take the spinner out of the accessibility tree:

<!-- example:LabelledRegion -->
```tsx
<div role="status" className="flex items-center gap-r5 text-fg-secondary">
  <Spinner size="sm" aria-hidden />
  <span>Uploading 3 of 12 files…</span>
</div>
```
<!-- /example -->

Mounting that region and its text in one update has the same announcement problem a bare
`<Spinner />` does — see [Accessibility](#accessibility). It fixes the *name*, not the
delivery; for a wait the user must be told about, render the region up front and change
what is inside it.

## Theme tokens

Spinner has no `Spinner.css` and reads exactly **one** contract variable. Its colour, its
diameter, its ring thickness, and its rotation all come from Tailwind core utilities that
map to no `--C-*` or `--R-*` token.

| Where        | Utility        | Override       |
| ------------ | -------------- | -------------- |
| Ring corners | `rounded-full` | `--RADIUS-FULL` |

And that one is not a useful hook: `--RADIUS-FULL` is `9999px`, i.e. "a circle" — lower it
and the ring becomes a rounded square that visibly tumbles rather than spins.

The other three axes are worth knowing about precisely *because* they are outside the
contract:

- **Colour** is `currentColor` (`border-current`, with `border-t-transparent` cutting the
  gap that makes the rotation visible). A theme swap re-tints the spinner only through
  whatever sets `color` around it — usually a `--C-TEXT-*` variable behind a `text-fg-*`
  utility on an ancestor.
- **Size** is `size-4` / `size-6` / `size-8` off Tailwind's `--spacing` (`0.25rem`), so the
  three sizes are fixed pixel geometry, not responsive steps.
- **Motion** is Tailwind's built-in `animate-spin` — `spin 1s linear infinite`. It does not
  read `--MOTION-DURATION-*` or `--MOTION-EASE-*`, so re-timing the theme's motion tokens
  leaves the spinner turning at exactly the same speed.

## Gotchas

- **It ignores `prefers-reduced-motion`.** Nothing gates the rotation: `animate-spin` is
  unconditional, there is no component CSS to add a `@media (prefers-reduced-motion: reduce)`
  block, and neither Tailwind nor `@batthewz/response-ui-css` wraps that utility in one. A
  reader who has asked their OS for reduced motion still gets a continuous 1s rotation, which
  is a real problem for vestibular sensitivity when the spinner is large or long-lived — and
  it is inconsistent with [ProgressRing](progress-ring.md), [Tabs](tabs.md) and the animation
  components, all of which drop their motion. Until the component handles it, pass
  `className="motion-reduce:animate-none"` (it survives the merge) or render a static
  fallback behind `matchMedia("(prefers-reduced-motion: reduce)")` yourself.
- **A `border-*` colour utility destroys the gap.** `className="border-status-error"` sets
  every edge, and `tailwind-merge` drops both `border-current` *and* `border-t-transparent`
  as superseded. The result is a uniform ring — still animating, but a solid circle looks
  identical at every angle, so the spinner reads as frozen. Recolour with `text-*`.
- **No `children`.** `<Spinner>Saving…</Spinner>` doesn't compile; `children` is omitted from
  the prop type. Render your label as a sibling.
- **Your props beat the built-in `role`.** The rest props spread *after* `role="status"`, so
  `role`, `aria-label`, and `aria-hidden` all take effect — deliberate, and how you opt out of
  the default announcement. They are not equivalent, though: only `aria-hidden` removes the
  spinner outright. `role="presentation"` drops the live region but leaves the `sr-only`
  "Loading" text in the accessibility tree, where a browse cursor still reaches it.
  `className` is the exception: it is merged, not replaced.
- **No per-component CSS.** There is no `Spinner.css`; it is styled entirely from utility
  classes. The package CSS import is still required so react-components' `@source` glob emits
  those classes into the consumer's Tailwind build.
- **Server-renderable.** No `"use client"`, so it drops straight into an RSC tree.

## Accessibility

Spinner renders `role="status"` by default — a polite live region — around a `sr-only` span
reading "Loading". The role is the part you can replace from `…rest`; the hidden text is
always there. A screen-reader user moving through the page therefore meets the word
"Loading" where the spinner is. Three things about that are worth knowing:

- **`status` is named by the author, not by its content.** A bare `<Spinner />` has *no*
  accessible name; "Loading" is the region's content. `aria-label` gives it a name but does
  not replace that text, so a labelled spinner ends up carrying two descriptions of the same
  wait. If you want one message, hide the spinner and label a container — see
  [Labelling the wait](#labelling-the-wait).
- **A live region that mounts already full is not reliably announced.** The usual
  `{isLoading && <Spinner />}` inserts the region and its text in the same update, and screen
  readers differ on whether that gets spoken; live regions are dependable for content that
  *changes* while the region is already in the accessibility tree. For a wait the user must
  be told about, render your own region up front and change what's inside it.
- **The label is hard-coded English.** No prop reaches it, so in a localized app the spinner
  contributes an untranslated string. `aria-hidden` plus your own text is the way out.

The ring is `currentColor`, so its contrast is inherited too. It is a graphic that carries
state, which WCAG 1.4.11 asks to clear 3:1 against its background — worth checking if you
tint one with a muted text token, which is tuned for supplementary text rather than for
something that has to be seen.

Finally, motion: this component does not honour `prefers-reduced-motion` — see
[Gotchas](#gotchas).

## Related

[Button](button.md) · [ProgressRing](progress-ring.md) · [Meter](meter.md) ·
[RequireAuth](require-auth.md) · [Center](center.md) · [Skeleton](skeleton.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
