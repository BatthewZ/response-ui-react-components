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
| `formatValue`   | `(value, max) => string` | — (bare number) |
| `className`     | `string`                | —       |
| `ref`           | `Ref<HTMLDivElement>`   | —       |
| …rest           | props of `<div>`; `onChange` is a compile error | — |

`onChange` is declared `onChange?: never`, so passing one is a **compile error**, not a prop
that silently does nothing. A JSX spread performs no excess-property check, so `Omit` alone
let `{...form.field("x")}` land a handler on the root `<div>` — where it never fires, because
React dispatches `onChange` only for a descendant form control and Rating renders none. Use
`onValueChange`.

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

`readOnly` returns a different tree: one `<div role="meter">` carrying your own `aria-label`
plus `aria-valuenow`/`aria-valuemin`/`aria-valuemax`, with no buttons and nothing focusable. It
is the right shape for an average score, because a screen reader gets the number in one
utterance instead of walking five radios — and because the label you passed is the subject
being rated, the component never overwrites it with a sentence of its own. Pass `formatValue`
to add a unit, in your language; it becomes `aria-valuetext`.

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
and `value={4.3}` is snapped to what the scale can draw and announce — 4 without `allowHalf`,
4.5 with it — so the picture and the number never disagree. A value outside `[0, max]` is
clamped the same way.

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
(measured: ten `ArrowRight`s from `0` commit `0.5, 1, 1.5 … 5`). Activating a star with
`Enter`/`Space` commits its **whole** value — the half is a pointer gesture. That, and the
way the announced star names shift while a half value is held, are covered in
[Gotchas](#gotchas).

## Scale

<!-- example:TenPointScale -->
```tsx
<Rating aria-label="Rate this film" max={10} defaultValue={7} />
```
<!-- /example -->

`max` renders that many stars and caps the value: every interactive change is clamped into
`0 … max` before `onValueChange` sees it, and a `value` you pass **in** is snapped to the
scale — clamped into range and rounded to the step — before it is drawn or announced, so
the picture and the number never disagree.

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

Measured against the default theme and the worked examples; these numbers do not transfer to
your own theme — re-check them against your values.

## Gotchas

- **Focus and the value are one state machine.** The tab stop is always the star holding the
  value: `ArrowRight`/`ArrowLeft` (and `ArrowUp`/`ArrowDown`, which do the same thing) step the
  value by one increment — `0.5` with `allowHalf`, otherwise `1` — and focus follows it. It
  clamps at both ends rather than looping, so `ArrowRight` at `max` moves neither. Clicking a
  star moves the tab stop to it, and `Tab` enters the group on the star holding the value, not
  on star 1.
- **`Home` and `End` commit.** `Home` sets the first selectable rating (`0.5` with `allowHalf`,
  otherwise `1`) and `End` sets `max`; both fire `onValueChange` like every other key.
- **Under `allowHalf`, activating a star commits its whole value.** A keyboard-fired click
  carries `detail === 0` and no pointer position, so `Enter`/`Space` on star 5 commits `5`. The
  half is a pointer gesture: click the left half of a star to get `n − 0.5`.
- **Under `allowHalf` the star names move with the value.** Each radio is named for the value
  it stands for — its own position, except the *checked* one, which is named for the value
  actually held. On a whole value that is the plain ladder: at `value={3}` the five radios
  announce "1" … "5" and the checked one is "3". On a **half** value the checked star is
  renamed and the whole value it would otherwise offer drops out of the set: at `value={2.5}`
  the radios read 1 · 2 · **2.5** · 4 · 5, with no "3" to pick. The arrow keys still reach
  `max`; only the named options are short one rung. The names are bare numbers by default —
  the only rendering that is right in every language — and `formatValue` adds a unit.
- **An out-of-range or off-step `value` is snapped, not trusted.** `value={9} max={5}` renders
  and announces 5; `value={4.3}` renders and announces 4 (or `4.5` with `allowHalf`). The
  picture and the announced number can never disagree.
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

- **Each star has a hidden name.** An `sr-only` span renders the value inside every button,
  and `aria-checked` tracks the current value — the checked radio is always named for the value
  it actually holds. The default is the bare number, which needs no translation; `formatValue`
  supplies a unit in your own language. Under `allowHalf` the *set* of names shifts as the
  value moves, which can leave `max` unnamed — see [Gotchas](#gotchas).
- **The glyphs are hidden.** Each star span is `aria-hidden="true"`, so the icon never
  double-announces over the hidden name.
- **The focus indicator is real and does not shift layout.** `.rating-button` resets itself
  with `all: unset`, which removes the UA ring, but `:focus-visible` restores a 2px
  `--C-BORDER-FOCUS` outline at 2px offset — higher specificity, so it wins — and `outline`
  is drawn outside the box model, so focusing moves nothing.
- **Keyboard navigation follows the value.** All four arrows step the value by one increment
  and carry the tab stop with it; `Home` and `End` jump to the first and last ratings and
  commit them. The tab stop is always the checked star, so `Tab` re-enters the group where the
  user left it.
- **Disabled is out of the tab order entirely.** Every button is `disabled` *and*
  `tabIndex={-1}`, so tabbing skips the whole group; the `aria-disabled="true"` on the root
  is only reachable by browsing, not by keyboard focus.
- **Read-only announces as one meter.** `role="meter"` with `aria-valuenow`/`min`/`max` gives
  the whole score in a single utterance under *your* `aria-label`, which is the right call for
  a static average. `disabled` still applies there: `aria-disabled` plus the dimmed class.
- **Colour is not sufficient on its own.** The measured ratios above put the filled star
  below 3:1 on most light-theme surfaces and the empty star far below it everywhere but
  `tech`; pair the stars with the number.
- **Reduced motion is honoured.** The fill-width transition is dropped under
  `prefers-reduced-motion: reduce`.

## Related

[Slider](slider.md) · [Radio](radio.md) · [Meter](meter.md) ·
[ProgressRing](progress-ring.md) · [StatCard](stat-card.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
