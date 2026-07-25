# OTPInput

A fixed-length code entry — one box per character, with paste-to-fill, auto-advance, and
backspace-walking-back already wired. Reach for it on a two-factor or email-verification
screen instead of a bare [Input](input.md), so the box count itself tells the user how many
characters the code has.

<!-- example:Minimal -->
```tsx
<OTPInput
  aria-label="Verification code"
  onComplete={(code) => {
    void fetch("/api/verify-code", { method: "POST", body: code });
  }}
/>
```
<!-- /example -->

`onComplete` is the headline API and the one edge not to copy blind: it fires on the
*first* completion and then latches, so a user who corrects a digit never re-triggers it.
Used as the only submit path — which is what the prop invites — the screen deadlocks on a
visibly correct code. Gate submission on `onValueChange` and treat `onComplete` as a
first-completion hint. See [Gotchas](#gotchas).

| Prop            | Type                              | Default                     |
| --------------- | --------------------------------- | --------------------------- |
| `length`        | `number`                          | `6`                         |
| `value`         | `string`                          | — (uncontrolled)            |
| `defaultValue`  | `string`                          | `""`                        |
| `onValueChange` | `(v: string) => void`             | —                           |
| `onComplete`    | `(v: string) => void`             | —                           |
| `mode`          | `"numeric" \| "alphanumeric"`     | `"numeric"`                 |
| `error`         | `boolean`                         | `Field` state, else `false` |
| `disabled`      | `boolean`                         | —                           |
| `aria-label`    | `string`                          | `"One-time code"`           |
| `className`     | `string`                          | —                           |
| `ref`           | `Ref<HTMLDivElement>`             | —                           |
| …rest           | props of `<div>`, minus `onChange` and `defaultValue` | —       |

`className` and the rest props land on the **group `<div>`**, never on the boxes — there is
no prop that reaches an individual `<input>`. Three edges are worth reading before you ship:
`onComplete` fires at most once per completion, the emitted string can contain spaces, and a
`<label htmlFor>` cannot name this control. See [Gotchas](#gotchas).

## Length and character set

`length` sets the box count, and it is also the definition of "complete" — `onComplete`
waits for every box to hold a character.

<!-- example:CodeLength -->
```tsx
<OTPInput length={4} aria-label="Verification code" />
```
<!-- /example -->

`mode` picks the filter applied to every keystroke and every paste. `numeric` (the default)
keeps only `/\d/` and sets `inputMode="numeric"` so phones open the digit pad;
`alphanumeric` keeps `/[a-zA-Z0-9]/` and sets `inputMode="text"`. Rejected characters are
dropped silently — typing `a` into a numeric box leaves it empty rather than showing an
error.

<!-- example:Alphanumeric -->
```tsx
<OTPInput length={8} mode="alphanumeric" aria-label="Backup code" />
```
<!-- /example -->

Case is preserved: `alphanumeric` does **not** upper-case for you, so `A` and `a` reach your
callback as typed. Normalise at the comparison site if your codes are case-insensitive.

## Naming the group

The component renders a `<div role="group">` carrying `aria-label="One-time code"`. That
default is a placeholder, not a description of your screen — override it with a real
`aria-label`, or point `aria-labelledby` at a visible [Label](label.md):

<!-- example:WithVisibleLabel -->
```tsx
<Label id="signin-code-label">Verification code</Label>
<OTPInput aria-labelledby="signin-code-label" />
```
<!-- /example -->

`aria-labelledby` is used here rather than `htmlFor` on purpose: a `<div>` is not a labelable
element, so `<Label htmlFor="…">` paired with `<OTPInput id="…">` associates nothing. This is
the one place OTPInput departs from [Input](input.md), [Select](select.md) and
[Slider](slider.md), where the `htmlFor` + `id` pairing is the documented wiring.

## Controlled

Pass `value` and `onValueChange` to drive the boxes from your own state. The mode is locked
on first render, so a component that starts with `value={undefined}` stays uncontrolled for
its whole life.

<!-- example:Controlled -->
```tsx
<OTPInput aria-label="Verification code" value={code} onValueChange={setCode} />
<Button disabled={code.replace(/ /g, "").length < 6}>Verify</Button>
```
<!-- /example -->

That `replace(/ /g, "")` is load-bearing. The component models the boxes as a fixed-length
slot array and serialises it back to one string, writing an **empty slot as a space** so the
positions of the characters after it survive the round trip. Fill only boxes 1, 3, 5 and 7
of a seven-box code and `onValueChange` receives `"1 3 5 7"` — seven characters long, with
four characters entered. Trailing empties are trimmed; internal ones are not. So
`code.length === length` is not a completeness test, and `onComplete` (which checks the
slots, not the string) is the only reliable one.

The encoding round-trips, so it is also how you seed a partially filled control:
`value="1 3"` renders `1`, empty, `3`, empty.

## Error state

Inside a [Field](field.md), every box picks up `aria-invalid` and the id of the
[FieldError](field-error.md) from context, with no `error` prop from you:

<!-- example:InField -->
```tsx
<Field error="That code has expired. Request a new one.">
  <Label id="expired-code-label">Verification code</Label>
  <OTPInput aria-labelledby="expired-code-label" />
  <FieldError />
</Field>
```
<!-- /example -->

Standalone, the `error` boolean does the same styling and sets `aria-invalid` on each box —
but there is no [Field](field.md) to supply a description, so the message is yours to render and to
associate. Note that `aria-describedby` passed to `OTPInput` lands on the **group**, not on
the boxes:

<!-- example:ErrorState -->
```tsx
<OTPInput
  aria-label="Verification code"
  error
  defaultValue="482913"
  aria-describedby="wrong-code-message"
/>
<p id="wrong-code-message" className="text-body-3 text-status-error">
  That code is not correct. You have 2 attempts left.
</p>
```
<!-- /example -->

## Disabled

<!-- example:Disabled -->
```tsx
<OTPInput aria-label="Verification code" disabled defaultValue="482913" />
```
<!-- /example -->

`disabled` is forwarded to all `length` boxes. The group `<div>` itself is not marked, so a
disabled OTPInput is still reachable as a group in the accessibility tree; only its inputs
are skipped by the tab sequence.

## Theme tokens

OTPInput has no stylesheet of its own — every colour, radius and timing below comes from a
Tailwind utility that resolves to a contract variable. The box geometry does not: `size-12`
(3rem), the 1px border and the 2px `focus:ring-2` are hard-coded literals with no token
behind them, so a themed OTPInput changes colour but never changes size.

| Where                  | Utility                                                 | Override            |
| ---------------------- | ------------------------------------------------------- | ------------------- |
| Box fill               | `bg-surface-0`                                          | `--C-SURFACE-0`     |
| Box border             | `border-border-strong`                                  | `--C-BORDER-STRONG` |
| Character ink          | `text-fg-primary`                                       | `--C-TEXT-PRIMARY`  |
| Character type scale   | `text-h5`                                               | `--H5`              |
| Corner radius          | `rounded-md`                                            | `--RADIUS-MD`       |
| Gap between boxes      | `gap-r6`                                                | `--R-SIZE-6`        |
| Focus ring and border  | `focus:ring-border-focus` `focus:border-border-focus`   | `--C-BORDER-FOCUS`  |
| Invalid border and ring | `border-status-error` `focus:ring-status-error`        | `--C-STATUS-ERROR`  |
| Disabled fill          | `disabled:bg-surface-3`                                 | `--C-SURFACE-3`     |
| Colour transition      | `duration-fast`                                         | `--DURATION-FAST`   |

The character type step is responsive — `--H5` is `1.125rem` below the 40rem breakpoint and
`1.25rem` above it — while the box is a fixed 3rem, so the glyphs grow inside a box that
does not. The inter-box gap sits on the responsive `r`-scale but `--R-SIZE-6` holds at
`0.25rem` on both sides of that breakpoint, so the row does not reflow.

This is the same token recipe [Input](input.md), [Textarea](textarea.md) and
[Select](select.md) use, so overriding any of these re-tints the whole form surface at once
rather than this component alone.

**Two of these pairs are low-contrast as shipped.** The box fill is `--C-SURFACE-0`, which is
also the base page surface, so on a default page the border is the *only* thing that draws
the box — and `--C-BORDER-STRONG` against `--C-SURFACE-0` measures 1.47:1 in the default
theme, 1.44:1 in `events`, 1.41:1 in `tech` and 1.79:1 in `grimdark`, all under the 3:1 that
WCAG 1.4.11 asks of a control's visual boundary. The focus indicator has the same problem in
half the themes: `--C-BORDER-FOCUS` on `--C-SURFACE-0` measures 3.68:1 (default) and 14.84:1
(`tech`) but only 2.72:1 in `events` and 2.96:1 in `grimdark`. Both are properties of the
[theme contract](../theme-contract.md)'s values rather than of this component's markup, so
the fix is to darken those two variables in your theme — see [Gotchas](#gotchas).

## Gotchas

- **`onComplete` goes stale if the user corrects a digit.** It fires once when the last box
  fills and then latches; a further edit that leaves the code *still complete* does not fire
  it again. Type `123`, then fix the first digit to `9`: `onValueChange` reports `"923"`,
  `onComplete` has still only ever been called with `"123"`. Re-pasting a whole replacement
  code over a complete one behaves the same way. If `onComplete` is your only submit path —
  the pattern the prop invites — the screen deadlocks on a visibly correct code. The user's
  only escape is to clear a box (which unlatches it) and retype. Gate your submit on
  `onValueChange` instead, or treat `onComplete` as a *first*-completion hint.
- **A multi-character value arriving in one box keeps only the last character.** Paste is
  handled separately and spreads correctly across the boxes, but a plain `change` event
  carrying several characters is reduced to `filtered[filtered.length - 1]`. Feeding `123456`
  to the first box of a six-box control leaves `6` in box 1 and the rest empty. This is the
  shape platform SMS autofill uses for the `autoComplete="one-time-code"` hint the component
  sets, so treat mobile autofill as unverified until you have tested it on a real device.
- **Delete and cut do nothing.** `handleChange` returns early on an empty filtered string and
  `handleKeyDown` only implements Backspace, ArrowLeft and ArrowRight. Pressing <kbd>Delete</kbd>
  on a filled box, or cutting its contents, leaves the value untouched and fires no callback —
  the controlled input simply re-renders the old character. Backspace is the only way to clear.
- **The emitted string can contain spaces.** Empty slots before a filled one serialise as
  `" "`, so `value`/`onValueChange` may hand you `"1 3 5 7"`. Do not `trim()` it — that shifts
  every remaining character into the wrong box on the way back in. Strip spaces only when you
  are counting or submitting, never when you are storing it as the control's `value`.
- **A `value` longer than `length` is displayed truncated but not corrected.** With
  `length={4}` and `value="123456"` the control renders `1 2 3 4` and leaves `"56"` sitting in
  your state until the next edit rewrites it. Truncate before you store.
- **No `name`, so plain form submission sends nothing.** The boxes carry no `name` attribute
  and the props are `<div>` props, so there is nowhere to put one. Inside a `<form>` you must
  mirror the value into a hidden input yourself.
- **`error` accepts only a boolean.** The message itself comes from a
  [Field](field.md)/[FieldError](field-error.md) pair or from your own markup; the component
  renders no text.
- **Client component.** `OTPInput` is marked `"use client"` — it owns focus refs and keyboard
  state, so it cannot render as a server component.

## Accessibility

The control is a `<div role="group">` wrapping `length` single-character `<input type="text">`
boxes, each `maxLength={1}`. The group carries the accessible name; `aria-labelledby` on it
wins over the built-in `aria-label` default.

- **Keyboard.** Typing a valid character fills the box and advances; <kbd>Backspace</kbd>
  clears a filled box in place, and on an already-empty box steps back and clears the previous
  one. <kbd>←</kbd> and <kbd>→</kbd> move between boxes and are `preventDefault`-ed. Focus is
  clamped at both ends, so the last box keeps focus after it fills. There is no
  <kbd>Home</kbd>/<kbd>End</kbd> handling and, as above, no <kbd>Delete</kbd>.
- **Focusing a box selects its contents,** so typing over a filled box replaces rather than
  appends.
- **Every box is named `"Digit N"`** — a hard-coded English string with no prop to override
  it. In `mode="alphanumeric"` that name is simply wrong: a screen-reader user entering a
  backup code hears "Digit 3" while the field accepts letters.
- **`autoComplete="one-time-code"` is set on the first box only;** the rest are
  `autoComplete="off"`. See the autofill gotcha above before relying on it.
- **The invalid state is announced, not just tinted.** `error` (or an enclosing [Field](field.md)) puts
  `aria-invalid="true"` on every box, and inside a [Field](field.md) every box also gets the same
  `aria-describedby`, so the error text is repeated once per box as the user arrows across.
  The group itself receives neither.
- **Focus is `focus:`, not `focus-visible:`,** so the ring appears on mouse clicks as well as
  keyboard focus. `focus:outline-none` removes the UA outline, leaving the token-coloured ring
  as the only indicator — which is why the `events` and `grimdark` ratios in
  [Theme tokens](#theme-tokens) matter.

## Related

[Input](input.md) · [Field](field.md) · [FieldError](field-error.md) · [Label](label.md) ·
[NumberInput](number-input.md) · [SearchInput](search-input.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
