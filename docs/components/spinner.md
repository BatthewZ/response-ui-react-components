# Spinner

The indeterminate busy indicator: a rotating ring for a wait you can't put a number on.
It is decoration by default — `aria-hidden`, no role — takes its colour from the text
around it, comes in three fixed sizes, and stands still under `prefers-reduced-motion`.
Pass `children` to make one spinner announce the wait, in your own words.

<!-- example:Minimal -->
```tsx
<Spinner />
```
<!-- /example -->

| Prop        | Type                   | Default |
| ----------- | ---------------------- | ------- |
| `size`      | `"sm" \| "md" \| "lg"` | `"md"`  |
| `children`  | `ReactNode` — visually hidden label; makes this one a `role="status"` | — |
| `className` | `string`               | —       |
| `ref`       | `Ref<HTMLDivElement>`  | —       |
| …rest       | props of `div`, less `size` | — |

No `label` and no `variant` — `children` is the whole announcement story. Without it the
element is `aria-hidden` with no role and no text; with it the spinner becomes a
`role="status"` live region whose visually hidden text is exactly what you passed, in your
own language. Everything in `…rest` lands on the `<div>` **after** the component's own
`role` and `aria-hidden`, so both are replaceable. See [Gotchas](#gotchas).

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

A button names itself from its contents, and a bare spinner contributes nothing to that —
it is `aria-hidden` — so this one reads as just **"Saving…"**. That is the right shape:
the label already says the state, so the spinner has no second copy to add.

## Full-page waits

<!-- example:FullPageLoad -->
```tsx
<Center className="min-h-screen">
  <Spinner size="lg" />
</Center>
```
<!-- /example -->

This is the shape [RequireAuth](require-auth.md) renders by default for its `"loading"`
branch — with its `loadingLabel` passed as the spinner's `children`, and a
`loadingFallback` replacing the lot — and the reason [Center](center.md) is worth reaching
for: the spinner has no opinion about where it sits.

## Labelling the wait

A bare spinner says nothing. There are two ways to name the wait, and both end with exactly
one region. Pass `children` and the spinner itself becomes the `role="status"`, its text
visually hidden and in your own language:

```tsx
<Spinner size="sm">Envoi en cours…</Spinner>
```

Or own the region yourself and leave the spinner decorative:

<!-- example:LabelledRegion -->
```tsx
<div role="status" className="flex items-center gap-r5 text-fg-secondary">
  <Spinner size="sm" aria-hidden />
  <span>Uploading 3 of 12 files…</span>
</div>
```
<!-- /example -->

The explicit `aria-hidden` is redundant with the default and harmless — it is what the
example shipped before spinners went silent by default. Either way, mounting a live region
and its text in one update is not reliably announced — see
[Accessibility](#accessibility). For a wait the user must be told about, render the region
up front and change what is inside it.

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
- **Motion** is Tailwind's built-in `animate-spin` — `spin 1s linear infinite` — paired
  with `motion-reduce:animate-none`. It does not read `--MOTION-DURATION-*` or
  `--MOTION-EASE-*`, so re-timing the theme's motion tokens leaves the spinner turning at
  exactly the same speed.

## Gotchas

- **Reduced motion stops the spin.** `motion-reduce:animate-none` is written into the base
  classes — carried here, rather than in a stylesheet, because the css package guards
  animation *classes* and not the `animate-*` utilities, which left this the library's only
  unguarded continuous animation. Under `prefers-reduced-motion: reduce` the ring stands
  still: a static, still-visible arc, consistent with [ProgressRing](progress-ring.md),
  [Tabs](tabs.md) and the animation components.
- **A `border-*` colour utility destroys the gap.** `className="border-status-error"` sets
  every edge, and `tailwind-merge` drops both `border-current` *and* `border-t-transparent`
  as superseded. The result is a uniform ring — still animating, but a solid circle looks
  identical at every angle, so the spinner reads as frozen. Recolour with `text-*`.
- **`children` is the announcement, not visible content.** Whatever you pass renders inside
  a visually hidden `sr-only` span — you cannot put a visible label *inside* the spinner.
  Render visible text as a sibling, the way [Inside a button](#inside-a-button) does.
- **Your props beat `role` and `aria-hidden`.** The rest props spread *after* both, so a
  labelled spinner can still be re-roled or re-hidden from the call site. On one with
  `children`, `role="presentation"` drops the live region but leaves the hidden text in the
  accessibility tree, where a browse cursor still reaches it — only `aria-hidden` removes
  the element outright. `className` is the exception: it is merged, not replaced.
- **No per-component CSS.** There is no `Spinner.css`; it is styled entirely from utility
  classes. The package CSS import is still required so react-components' `@source` glob emits
  those classes into the consumer's Tailwind build.
- **Server-renderable.** No `"use client"`, so it drops straight into an RSC tree.

## Accessibility

Spinner is decoration by default: `aria-hidden`, no role, no text. A page with three
spinners on it adds *nothing* to the accessibility tree, which is the right default — each
one would otherwise be its own `role="status"` region, already holding a hard-coded
"Loading" at the moment it was inserted: the one shape screen readers do not reliably
announce, and untranslatable besides. Three things are worth knowing:

- **`children` promotes a spinner to the announcement.** It renders as visually hidden text
  inside a `role="status"`, in whatever language you pass — there is no built-in English
  string to translate — and the element drops its `aria-hidden` at the same time. One wait,
  one region: label one spinner, or a container, never every spinner.
- **A live region that mounts already full is not reliably announced.** The usual
  `{isLoading && <Spinner>…</Spinner>}` inserts the region and its text in the same update,
  and screen readers differ on whether that gets spoken; live regions are dependable for
  content that *changes* while the region is already in the accessibility tree. For a wait
  the user must be told about, render your own region up front and change what's inside it.
- **`status` is named by the author, not by its content.** A labelled spinner's `children`
  are the region's *content*, not its name; adding `aria-label` on top gives it a name
  without replacing the text, so it then carries two descriptions of the same wait. Say it
  once.

The ring is `currentColor`, so its contrast is inherited too. It is a graphic that carries
state, which WCAG 1.4.11 asks to clear 3:1 against its background — worth checking if you
tint one with a muted text token, which is tuned for supplementary text rather than for
something that has to be seen.

Finally, motion: the rotation stops under `prefers-reduced-motion`, via
`motion-reduce:animate-none` — see [Gotchas](#gotchas).

## Related

[Button](button.md) · [ProgressRing](progress-ring.md) · [Meter](meter.md) ·
[RequireAuth](require-auth.md) · [Center](center.md) · [Skeleton](skeleton.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
