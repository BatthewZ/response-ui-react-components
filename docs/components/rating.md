# Rating

A star-rating control that is an **input** by default — a `radiogroup` of real `<button>`
elements, one per star — and flips to a single labelled graphic when you pass `readOnly`.
Reach for it to collect a score, or to display an average next to a review count.

<!-- example:Minimal -->
```tsx
<Rating aria-label="Rate this product" defaultValue={4} />
```
<!-- /example -->

| Prop            | Type                    | Default |
| --------------- | ----------------------- | ------- |
| `aria-label`    | `string` — **required** | —       |
| `value`         | `number`                | —       |
| `defaultValue`  | `number`                | `0`     |
| `onValueChange` | `(v: number) => void`   | —       |
| `max`           | `number`                | `5`     |
| `allowHalf`     | `boolean`               | `false` |
| `readOnly`      | `boolean`               | `false` |
| `disabled`      | `boolean`               | `false` |
| `className`     | `string`                | —       |
| `ref`           | `Ref<HTMLDivElement>`   | —       |
| …rest           | props of `<div>` minus `onChange` | — |

`aria-label` is the only required prop: the stars are `aria-hidden` glyphs, so without it
the group would announce as unnamed. The rest spreads onto the root **last**, so `id`,
`data-*`, `style` and `aria-labelledby` all land — and `role` would override the one the
component sets. `value`/`defaultValue`/`onValueChange` are the usual controlled pair;
passing `value` on the first render locks the component into controlled mode for its whole
life, so it will not move until you feed it a new `value`.

While a pointer is over the stars, the fill previews the value under the cursor and snaps
back on `mouseleave`. The preview is display-only — it fires no `onValueChange`, it is
suppressed while `disabled`, and it does not track keyboard focus, so an arrow-key user
sees only the committed value.

Two shapes come out of the same component and they are **not** interchangeable — see
[Read-only display](#read-only-display) — and the keyboard model has sharp edges worth
reading before you ship it. See [Gotchas](#gotchas).

## Read-only display

`readOnly` returns a different tree: one `<div role="img">` labelled `"{value} out of
{max} stars"`, with no buttons and nothing focusable. It is the right shape for an average
score, because a screen reader gets the number in one utterance instead of walking five
radios.

<!-- example:ReadOnlyAverage -->
```tsx
<div className="flex items-center gap-r5">
  <Rating aria-label="Average customer rating" value={4.5} readOnly />
  <span className="text-body-2 text-fg-secondary">4.5 out of 5 · 1,284 reviews</span>
</div>
```
<!-- /example -->

Half-star *rendering* needs no `allowHalf` — that prop only governs what input can produce.
Each star is drawn in two layers, a `fill: none` outline plus a filled copy clipped to a
percentage width, and the clip is quantised: `≥ n` fills the star, `≥ n − 0.5` half-fills
it, anything less leaves it empty. So `value={4.5}` draws four and a half stars either way,
but `value={4.3}` draws exactly four while the label still reads "4.3 out of 5 stars".
Round before you pass a real-world average in.

## Controlled

<!-- example:Controlled -->
```tsx
<div className="flex items-center gap-r5">
  <Rating aria-label="Rate your driver" value={score} onValueChange={setScore} />
  <span className="text-body-2 text-fg-secondary">{score} out of 5</span>
</div>
```
<!-- /example -->

`score` and `setScore` are your own `useState` pair. `onValueChange` fires with the clamped
next number on every commit — click, or arrow key — and in controlled mode the component
never stores it, so nothing moves until `value` comes back changed.

## Half stars

<!-- example:HalfStars -->
```tsx
<Rating aria-label="Rate this recipe" allowHalf defaultValue={3.5} />
```
<!-- /example -->

With `allowHalf`, a click is resolved against the star's bounding box: land left of the
midpoint and it commits `n − 0.5`, right of it `n`. The arrow-key step drops from `1` to
`0.5` at the same time — so the arrows still walk the whole ladder and still reach `max`
(measured: ten `ArrowRight`s from `0` commit `0.5, 1, 1.5 … 5`). What breaks is
*activation*: `Enter`/`Space` on a star can only ever commit `n − 0.5`. That, and the
announced star names being wrong by half a star, are covered in [Gotchas](#gotchas).

## Scale

<!-- example:TenPointScale -->
```tsx
<Rating aria-label="Rate this film" max={10} defaultValue={7} />
```
<!-- /example -->

`max` renders that many stars and caps the value: every interactive change is clamped into
`0 … max` before `onValueChange` sees it. Nothing clamps a `value` you pass **in**, so keep
yours inside the range.

## Sizing

There is no `size` prop. The star box is `1.5em` and `Rating.css` sets no `font-size`
anywhere, so a star is always 1.5× whatever type size it inherits — put the component
inside a `text-*` scale, or set `font-size` on it, and the glyphs follow. The gap between
them does **not**: it is `--R-SIZE-6`, a `rem` value, so at large sizes the stars crowd
together and at small ones they drift apart.

<!-- example:Sizing -->
```tsx
<div className="flex flex-col gap-r5">
  <div className="text-body-3">
    <Rating aria-label="Rate the delivery" value={4} readOnly />
  </div>
  <div className="text-h4">
    <Rating aria-label="Rate the packaging" value={4} readOnly />
  </div>
</div>
```
<!-- /example -->

## Naming the group

<!-- example:LabelledByHeading -->
```tsx
<div className="flex flex-col gap-r5">
  <h3 id="delivery-rating-label" className="text-body-2 text-fg-primary">
    How was your delivery?
  </h3>
  <Rating
    aria-label="How was your delivery?"
    aria-labelledby="delivery-rating-label"
  />
</div>
```
<!-- /example -->

The type requires `aria-label` even here, so pass it as well; `aria-labelledby` reaches the
root through the rest spread and takes precedence in the accessible-name calculation, so
the heading is what gets announced.

## Disabled

<!-- example:Disabled -->
```tsx
<Rating aria-label="Rate this product" defaultValue={3} disabled />
```
<!-- /example -->

Every star button gets the native `disabled` attribute **and** `tabIndex={-1}`, and the
root gets `aria-disabled="true"` plus a half-opacity class. The commit path also returns
early while disabled, so a synthetic click cannot slip a value past it, and hover preview
is suppressed.

## Theme tokens

Every visual style lives in `Rating.css`, which reads contract variables directly — the
only Tailwind class anywhere in the component is `sr-only`, on the hidden star names, and
it reads no token. Override any of these and every rating in the app re-tints or re-times
at runtime, with no rebuild.

| Where                                  | Override                                     |
| -------------------------------------- | -------------------------------------------- |
| Star ink — outline and fill alike       | `--C-STATUS-WARNING`                        |
| Gap between stars                       | `--R-SIZE-6`                                |
| Star-button corner radius               | `--RADIUS-SM`                               |
| Keyboard focus outline                  | `--C-BORDER-FOCUS`                          |
| Fill-sweep duration · easing            | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT` |

Both star layers are painted from `currentColor`, and `color` is set once on the root, so
one variable tints the whole control. To re-tint a **single** instance, set `color` on it
inline or scope `--C-STATUS-WARNING` to an ancestor — a Tailwind `text-*` class on the root
will not take, because `Rating.css` is unlayered while Tailwind's utilities sit in
`@layer utilities`, and unlayered rules beat layered ones whatever the specificity. Measured
in the compiled bundle: `.text-fg-secondary` sits at byte 22449 inside a utilities layer
spanning 7974–30370, `.rating` at 86374 outside it.

`--R-SIZE-6` is on the responsive `r`-scale but holds at `0.25rem` on both sides of the
40rem breakpoint, so the star gap does not reflow. The fill transition animates the clip
width only and is suppressed entirely under `prefers-reduced-motion: reduce`.

Four values are deliberately **not** on the contract: the star box (`1.5em`, so it tracks
type instead of a token), the empty-star opacity (`0.45`), the disabled opacity (`0.5`),
and the focus outline's `2px` width and `2px` offset.

**Measured contrast.** The star colour is `--C-STATUS-WARNING`, and against this library's
own surfaces a filled star measures **3.19:1 on `--C-SURFACE-0` and 2.57:1 on
`--C-SURFACE-3`** in the default theme (3.09:1 / 2.61:1 in `events`) — at or below the 3:1
floor WCAG 1.4.11 sets for graphical objects. The empty star is worse: at `opacity: 0.45`
it composites to **1.5–1.7:1** on every light-theme surface, and 2.7–2.9:1 in `grimdark`.
Only `tech` clears 3:1 on both layers. Do not rely on the stars alone to convey the score —
print the number beside them, as [Read-only display](#read-only-display) does.

## Gotchas

- **Arrow keys drive two independent state machines.** `ArrowRight`/`ArrowLeft` move the
  roving tab stop *and* separately add or subtract one step from the value, and nothing
  keeps the two aligned. Focus **loops** (last → first) while the value **clamps** at
  `max`, so from a fresh `0` on a 5-star group the fifth `ArrowRight` leaves the value at 5
  with the focus ring back on star 1. With `allowHalf` they desync from the first press:
  one `ArrowRight` moves focus to star 2 but sets only `0.5`; five presses reach `2.5` with
  focus wrapped around to star 1. `ArrowUp`/`ArrowDown` are the clean path — the roving
  hook is horizontal and ignores them, so they move the value by one increment (`0.5` with
  `allowHalf`, otherwise `1`) and leave focus where it is.
- **Clicking a star does not update the roving index.** The index starts at 0 and only
  `ArrowLeft`/`ArrowRight`/`Home`/`End` advance it. Click star 4 — focus lands on it — then
  press `ArrowRight`: focus jumps back to **star 2** while the value goes to 5. The same
  cause makes Tab always enter the group on star 1, never on the selected star.
- **`Home`/`End` move focus and change nothing.** They are handled by the roving-focus
  hook, which the value logic does not observe, so `End` jumps to the last star and fires
  no `onValueChange`.
- **Under `allowHalf`, activating a star always commits the half.** `Enter`/`Space` fires a
  click whose `clientX` is `0` — the same zero that `event.detail` keyboard-detection relies
  on — so `clientX − rect.left` never reaches the star's midpoint and the left-half branch
  always wins: `Enter` on star 5 commits `4.5`, and no star can be *activated* to its whole
  value. The arrow keys are unaffected — they never look at the pointer, so all four of them
  step the value by `0.5` and do reach `max` (measured). This is only a trap if you expect
  `Enter` on the last star to mean "five stars"; it means 4.5.
- **`allowHalf` mislabels every star.** The hidden name is `position − 0.5`, so the five
  radios announce as "0.5 stars" … "4.5 stars" — no radio is ever named "5 stars", and at
  `value={3}` the one reporting `aria-checked="true"` is the radio named **"2.5 stars"**.
  A screen-reader user cannot tell `2.5` from `3`.
- **`readOnly` throws away your `aria-label`.** The read-only branch overwrites it with the
  generated `"{value} out of {max} stars"`, so
  `<Rating readOnly value={4} aria-label="Average customer rating" />` announces "4 out of
  5 stars" with no hint of *what* was rated. Name it from the surrounding content instead.
- **`readOnly` also ignores `disabled`.** The read-only branch returns before `disabled` is
  read, so you get neither `aria-disabled` nor the dimmed class. `readOnly` is already
  non-interactive, so this is only a styling surprise.
- **Nothing clamps an out-of-range `value`.** Clamping happens on commit only, so
  `<Rating readOnly value={9} max={5} />` renders five full stars and announces
  "9 out of 5 stars". Range-check before you pass it.
- **It is not a form control.** No `<input>`, no `name`, no hidden field — the value never
  reaches `FormData` or an uncontrolled `<form>` submit. Read it from `onValueChange`.
- **Value `0` leaves no radio checked.** That is the correct "not yet rated" state, but a
  `radiogroup` with nothing checked is also what an untouched required field looks like;
  validate it yourself.
- **Client component.** `Rating` carries `"use client"`, which *is* the client boundary — a
  server component can render it directly — but it always ships JavaScript, including in
  `readOnly` mode, which needs no interactivity at all.

## Accessibility

The interactive control is **not** a `<div>` with click handlers: it is a
`<div role="radiogroup">` wrapping one real `<button type="button" role="radio">` per star,
so every star is natively focusable and `Enter`/`Space` activate it through the platform.
The buttons carry an explicit `type="button"`, so a rating inside a `<form>` never submits
it.

- **Each star has a hidden name.** An `sr-only` span renders "N stars" inside every button,
  and `aria-checked` tracks the current value. The string is hard-coded English with no way
  to translate it, and under `allowHalf` the number in it is wrong — see
  [Gotchas](#gotchas).
- **The glyphs are hidden.** Each star span is `aria-hidden="true"`, so the icon never
  double-announces over the hidden name.
- **The focus indicator is real and does not shift layout.** `.rating-button` resets itself
  with `all: unset`, which removes the UA ring, but `:focus-visible` restores a 2px
  `--C-BORDER-FOCUS` outline at 2px offset — higher specificity, so it wins — and `outline`
  is drawn outside the box model, so focusing moves nothing.
- **Keyboard navigation is non-standard.** `ArrowLeft`/`ArrowRight` move focus and change
  the value as two separate effects that drift apart; `ArrowUp`/`ArrowDown` change the
  value without moving focus; `Home`/`End` move focus without changing the value. If you
  need APG-conformant radio-group behaviour, this is the gap to know about.
- **Disabled is out of the tab order entirely.** Every button is `disabled` *and*
  `tabIndex={-1}`, so tabbing skips the whole group; the `aria-disabled="true"` on the root
  is only reachable by browsing, not by keyboard focus.
- **Read-only announces as one image.** `role="img"` plus the generated label gives the
  whole score in a single utterance, which is the right call for a static average.
- **Colour is not sufficient on its own.** The measured ratios above put the filled star
  below 3:1 on most light-theme surfaces and the empty star far below it everywhere but
  `tech`; pair the stars with the number.
- **Reduced motion is honoured.** The fill-width transition is dropped under
  `prefers-reduced-motion: reduce`.

## Related

[Slider](slider.md) · [Radio](radio.md) · [Meter](meter.md) ·
[ProgressRing](progress-ring.md) · [StatCard](stat-card.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
