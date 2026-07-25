# rating — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 211 · Rating — under `allowHalf` every star is misnamed by half a star (high)

The `sr-only` name is `{allowHalf ? position - 0.5 : position} stars`. Measured with
`<Rating allowHalf value={3} />`: the five radios are named "0.5 stars", "1.5 stars", "2.5 stars",
"3.5 stars", "4.5 stars", and the one reporting `aria-checked="true"` is **"2.5 stars"**. So a
screen-reader user cannot distinguish a 2.5 rating from a 3, can never hear "5 stars" at all, and
the checked control's name contradicts the value the component holds. **Fix:** name the button
`position` and expose the half through `aria-valuetext`, or model the control as a slider.

### 212 · Rating — keyboard activation always commits the half value (med)

`valueFromClick` compares `e.clientX` against the star's bounding box. A keyboard-activated click
reports `clientX: 0`, so `0 − rect.left` is negative for every star and the left-half branch
always wins. Measured with a realistic rect (`left: 100, width: 24`): `Enter` on star 5 fires
`onValueChange(4.5)`. `Rating.test.tsx` passes only because jsdom's `getBoundingClientRect`
returns an all-zero rect, which makes `0 − 0 < 12` false and hides the bug. The arrow keys are
*not* affected — measured, ten `ArrowRight`s from `0` commit `0.5, 1, 1.5 … 5`, so the value
`max` is reachable from the keyboard; it is *activation* that cannot commit a whole star.
**Fix:** treat `e.detail === 0` as a whole-star commit.

### 213 · Rating — focus and value are two unsynchronised state machines (med)

`useRovingFocus` owns the tab stop and `handleStarKeyDown` owns the value; both run from the same
`onKeyDown` and neither observes the other. Focus **loops** (last → first) while the value
**clamps** at `max`, and under `allowHalf` focus moves a whole star per `0.5` of value. Measured:
`allowHalf`, focus star 1, five `ArrowRight`s → value `2.5` with the focus ring wrapped back to
star 1. Without `allowHalf`, five presses → value `5` with focus also back on star 1. The visible
ring and the committed value point at different stars for most of the interaction. **Fix:** seed
and update the roving index from the value rather than letting `useRovingFocus` own it, and
disable its loop.

### 214 · Rating — clicking a star does not move the roving index (med)

`onClick` calls `commit` and nothing else; `setFocusedIndex` is only ever called from the roving
hook's own key handler. Measured: click star 4 (focus lands there natively), press `ArrowRight` →
focus jumps to **star 2** while the value goes to 5. The same cause makes the tab stop wrong on
entry — with `value={4}` the measured `tabIndex`es are `0,-1,-1,-1,-1`, so Tab always enters the
group on star 1 rather than on the selected star, which is the opposite of what a radio group is
supposed to do. **Fix:** call `setFocusedIndex` on click and focus, and seed it from the current
value.

### 215 · Rating — the stars miss the 3:1 graphical-object floor (med)

The filled star is `--C-STATUS-WARNING`; the empty star is the same colour at `opacity: 0.45`.
Measured against the library's own surface tokens (canvas / surface-0 / -1 / -2 / -3):

- filled — default **3.19 / 3.19 / 3.05 / 2.90 / 2.57:1**, `events` **3.09 / 3.09 / 3.00 / 2.87 / 2.61:1**
- empty — default **1.65 → 1.53:1**, `events` **1.63 → 1.52:1**, `grimdark` **2.86 → 2.67:1**
- `tech` is the only theme that clears 3:1 on both layers (filled 13.9–11.0:1, empty 3.25–3.34:1)

So in the two light themes the filled star is at or under the floor on every surface below
`surface-0`, and the empty star — which is what encodes "not selected", i.e. the score itself —
is far under it everywhere but `tech`. **Fix:** darken the light-theme warning token, and raise
the empty-star opacity or stroke it with `--C-BORDER-STRONG`. Ratios computed with the same
validated OKLCH→sRGB converter as #206-207, with sRGB-space alpha compositing for the 0.45 layer.

### 216 · Rating — `readOnly` throws away the required `aria-label` (med)

`aria-label` is the one **required** prop on `RatingProps`, and the `readOnly` branch overwrites
it with a generated `` `${value} out of ${max} stars` ``. Measured:
`<Rating readOnly value={4} aria-label="Average customer rating" />` announces "4 out of 5 stars"
— the subject of the rating is gone, so a page of product cards yields a row of identically named
graphics. A caller has no way to know their required prop was discarded. **Fix:** compose the two
(`` `${ariaLabel}: ${value} out of ${max} stars` ``).
