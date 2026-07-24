# Select

A themed native `<select>`. The browser owns the control and the operating system draws the
option list, so the mobile picker, first-letter type-ahead, and correct screen-reader
behaviour all come for free — and there is no portal, no `z-index`, and no clipping to
manage. The trade is that the open list is essentially unstylable and has no filter box.
Dropped inside a [Field](field.md) it inherits that field's error state — the red border,
`aria-invalid`, and the description link — from context, with no extra props.

<!-- example:Minimal -->
```tsx
<Select aria-label="Billing country">
  <option value="us">United States</option>
  <option value="ca">Canada</option>
  <option value="gb">United Kingdom</option>
  <option value="au">Australia</option>
</Select>
```
<!-- /example -->

| Prop        | Type                     | Default                     |
| ----------- | ------------------------ | --------------------------- |
| `error`     | `boolean`                | `Field` state, else `false` |
| `className` | `string`                 | —                           |
| `ref`       | `Ref<HTMLSelectElement>` | —                           |
| …rest       | props of `<select>`      | —                           |

`error` is the only prop Select adds. Everything else — `value`, `defaultValue`, `onChange`,
`name`, `required`, `disabled`, `multiple` — is a passthrough `<select>` attribute, and the
choices are `<option>` / `<optgroup>` children you supply; there is no `options` prop. Its
sharp edges are the ones the native control brings with it: you cannot style the open list,
the chevron ignores your theme, and Select is not server-renderable. See
[Gotchas](#gotchas).

## Native control, or `Combobox` / `MultiSelect`?

This is the platform's own `<select>` in your tokens — not a custom listbox. The library
ships two of those separately, and the line between them is sharp enough to draw up front.

**Reach for Select when:**

- The list is short and known: a country, a plan, a sort order, a role.
- It matters on a phone. The list opens as the OS picker — thumb-sized targets, no
  scroll-trapping, no viewport arithmetic.
- The form must work before hydration, or with JS off entirely. A `<select name="…">` in a
  plain `<form>` posts the right value with no React state involved.
- You want the interaction contract for free: arrow keys, `Home`/`End`, first-letter
  type-ahead, `Alt`+`ArrowDown` to open, `Escape` to cancel. None of it is re-implemented
  here, so none of it can be re-implemented wrongly.
- The control sits somewhere awkward — inside an `overflow: hidden` ancestor, a
  `transform`, a sticky header, a dialog. The popup is drawn outside the page's stacking
  context, so it can't be clipped or land behind anything.
- You want native constraint validation, where `required` participates in the browser's own
  submit check.

**Reach for `Combobox` or `MultiSelect` when:**

- The list is long enough to need filtering. Native type-ahead only jumps to entries by
  leading characters; there is no search field and no substring match. `Combobox` is a text
  input over a filtered list, with `loading` and a `Combobox.Empty` "no results" slot.
- You need more than one value. `<select multiple>` is a ctrl-click list on desktop and
  inconsistent on mobile; `MultiSelect` gives removable chips, an inline filter, and a
  `maxItems` cap.
- An option needs to be richer than a string — an icon, a second line, an avatar. An
  `<option>` renders its text and nothing else.
- You need to style the open list at all: highlight colour, spacing, a custom group header,
  an async state.

The cost of the two custom controls is the usual one: both portal, both carry hand-written
ARIA, and both are client components. Select is the sturdy default — stay on it until one of
the bullets above actually bites.

## Placeholder and required

A `<select>` has no placeholder attribute. The pattern is an empty-valued first option plus
`defaultValue=""` on the Select:

<!-- example:PlaceholderOption -->
```tsx
<Select required defaultValue="" aria-label="Team role">
  <option value="" disabled>
    Select a role…
  </option>
  <option value="owner">Owner</option>
  <option value="admin">Admin</option>
  <option value="member">Member</option>
  <option value="billing">Billing contact</option>
</Select>
```
<!-- /example -->

`required` then blocks submission while that option is selected — but only because it
qualifies as HTML's **placeholder label option**: the *first* option, a *direct child* of the
`<select>` (not nested in an `<optgroup>`), with an *empty* `value`, on a single-line select
(no `multiple`, no `size` above 1). Break any one of those conditions and the placeholder
satisfies `required`, and the form submits an empty string. Marking it `disabled` — as above
— stops the user re-selecting it once they've moved on; it has no effect on the validation
rule either way.

`required` changes nothing visually: this component has no `:invalid` styling. Drive the red
border from `error` or from a `Field`.

## Option groups and disabled options

<!-- example:OptionGroups -->
```tsx
<Select aria-label="Deployment region" defaultValue="us-east-1">
  <optgroup label="North America">
    <option value="us-east-1">US East (N. Virginia)</option>
    <option value="us-west-2">US West (Oregon)</option>
  </optgroup>
  <optgroup label="Europe">
    <option value="eu-west-1">Europe (Ireland)</option>
    <option value="eu-west-2" disabled>
      Europe (London) — at capacity
    </option>
  </optgroup>
</Select>
```
<!-- /example -->

`<optgroup label="…">` renders as a non-selectable heading and is announced as a group; a
`disabled` `<option>` stays visible but can't be chosen. Both are plain HTML passed straight
through.

## In a Field

`Field` owns the error. When it is invalid, Select reads `aria-invalid` and the id of the
[FieldError](field-error.md) from context automatically. The visible [Label](label.md),
however, is your job: pair its `htmlFor` with the select's `id`.

<!-- example:InField -->
```tsx
<Field error="Pick the region your data will live in.">
  <Label htmlFor="region">Deployment region</Label>
  <Select id="region" defaultValue="">
    <option value="" disabled>
      Select a region…
    </option>
    <option value="us-east-1">US East (N. Virginia)</option>
    <option value="eu-west-1">Europe (Ireland)</option>
    <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
  </Select>
  <FieldError />
</Field>
```
<!-- /example -->

## Error state

Set `error` directly to style a standalone select as invalid.

<!-- example:ErrorState -->
```tsx
<Select error defaultValue="" aria-label="Billing country">
  <option value="">Select a country…</option>
  <option value="us">United States</option>
  <option value="ca">Canada</option>
</Select>
```
<!-- /example -->

`error` **overrides** any `Field` it sits in — because the resolution is `error ??
field.invalid`, passing `error={false}` forces the select valid even inside an errored
field. Omit the prop entirely to inherit the field.

## Disabled

<!-- example:Disabled -->
```tsx
<Select disabled defaultValue="pro" aria-label="Plan">
  <option value="free">Free</option>
  <option value="pro">Pro — $20/month</option>
  <option value="enterprise">Enterprise</option>
</Select>
```
<!-- /example -->

## Controlled

Uncontrolled is the default: `defaultValue` picks the starting choice (with no
`defaultValue`, the first option wins) and you read the value off the form at submit time.
Add `value` and `onChange` to drive it from state instead.

<!-- example:Controlled -->
```tsx
<Select
  aria-label="Deployment region"
  value={region}
  onChange={(event) => setRegion(event.target.value)}
>
  <option value="us-east-1">US East (N. Virginia)</option>
  <option value="eu-west-1">Europe (Ireland)</option>
  <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
</Select>
```
<!-- /example -->

These are the native `<select>` props, so React's usual rule applies — a `value` with no
`onChange` renders a frozen select and warns in development.

## Theme tokens

Every utility in the table below resolves to a contract variable, so overriding the variable
re-tints the control at runtime with the rest of the app. Three pieces of the control sit off
the contract entirely; they are listed after the table. Select has no `.css` file of its own,
so all of these are Tailwind utilities in the `.tsx`.

| Where               | Utility                                               | Override                          |
| ------------------- | ----------------------------------------------------- | --------------------------------- |
| Text                | `text-body-2` `text-fg-primary`                       | `--BodyText-2` `--C-TEXT-PRIMARY` |
| Fill                | `bg-surface-0`                                        | `--C-SURFACE-0`                   |
| Disabled fill       | `disabled:bg-surface-3`                               | `--C-SURFACE-3`                   |
| Border              | `border-border-strong`                                | `--C-BORDER-STRONG`               |
| Focus ring & border | `focus:ring-border-focus` `focus:border-border-focus` | `--C-BORDER-FOCUS`                |
| Error border & ring | `border-status-error` `focus:ring-status-error`       | `--C-STATUS-ERROR`                |
| Padding             | `px-r4` `py-r5`                                       | `--R-SIZE-4` `--R-SIZE-5`         |
| Corner radius       | `rounded-md`                                          | `--RADIUS-MD`                     |
| Transition          | `duration-fast`                                       | `--DURATION-FAST`                 |

**Every row above styles the closed control only.** The moment the list opens, the browser
and the OS paint it, and none of these variables reach it. The one lever that does is
`color-scheme`, which the CSS foundation sets per theme (`light` on `:root`, `dark` on the
dark themes) — so the popup follows your theme's light/dark polarity and nothing else: not
the surface, not the accent, not the radius, not the font.

The default border is `--C-BORDER-STRONG`, not `--C-BORDER-DEFAULT` — form controls sit a
step higher-contrast than card edges. The error state swaps the resting border and the focus
ring to `--C-STATUS-ERROR`; it does not tint the fill, and `focus:border-border-focus`
survives the swap, so a *focused* invalid select shows a focus-coloured border inside an
error-coloured ring. The focus ring is `ring-offset-0`, flush against the border, so nothing
paints in a gap.

Three pieces of the control are **not** on the contract. The chevron is a data-URI SVG
background image, so it is a literal, not a token: an SVG referenced as a background image is
its own document, and the `fill="currentColor"` inside it resolves against that document's
initial colour rather than the select's `text-fg-primary`. It paints `rgb(0, 0, 0)` in both
Chromium and Firefox — with the select's own `color` forced to red, and under
`data-theme="grimdark"` with a dark `color-scheme`, where it sits at about 1.10:1 against
`--C-SURFACE-0`. The gutter that keeps text clear of it is `pr-10`, a fixed `2.5rem` on
Tailwind's default spacing scale rather than the responsive `r`-scale the padding uses. And
the arrow's inset is a hard `0.5rem` from the right edge. Only its `1.5em` box scales with the theme, being relative to
the `--BodyText-2` font size.

One class is inert: `placeholder:text-fg-muted` is carried over from
[Input](input.md), but `::placeholder` does not match a `<select>`, so it paints nothing —
including on the empty-valued placeholder option above.

## Gotchas

- **You cannot style the option list.** `appearance-none` and everything in the token table
  dress the *closed* control. The popup is an OS-drawn layer: `<option>` takes no radius, no
  padding, no hover colour, and on macOS and iOS not even a font. Nothing in your theme
  reaches it beyond `color-scheme`. If the list itself has to be designed, that is what
  `Combobox` and `MultiSelect` are for.
- **The chevron is always black.** Its `currentColor` is resolved inside the background
  image's own document, not against `text-fg-primary`, so it does not follow the theme: it
  measures `rgb(0, 0, 0)` in Chromium and in Firefox whatever the select's own colour or
  `color-scheme`. On the dark themes that is about 1.10:1 against the control's own fill —
  the only affordance that marks this as a dropdown, all but invisible.
- **It is `w-full` by default,** not sized to its longest option the way a bare `<select>`
  is. Pass `className="w-auto"` (or a fixed width) to opt out — the class list runs through
  tailwind-merge, so yours replaces the default rather than fighting it.
- **A placeholder only holds `required`** when it is the first option, a direct child, and
  empty-valued, on a single-line select. See
  [Placeholder and required](#placeholder-and-required); the failure is silent — the form
  just submits `""`.
- **`multiple` and `size` compile and look wrong.** They are native `<select>` attributes and
  pass through, but the styling assumes a one-line control. In Chromium and Firefox alike the
  chevron still paints, stranded in the vertical middle of the expanded list, and `pr-10`
  still reserves its gutter down the whole height. The ARIA role also changes from `combobox`
  to `listbox`. Reach for `MultiSelect` instead.
- **The `Label` is not auto-associated.** `Field` wires the *error* (`aria-invalid`,
  `aria-describedby`) through context, but nothing links a `Label` to the select. Set
  `Label htmlFor="x"` and `Select id="x"` yourself, or clicking the label won't focus the
  control and screen readers won't announce it as the field's name.
- **Not server-renderable.** Unlike [Button](button.md), Select calls the `useFieldError`
  hook (it reads context), so it must run inside a Client Component. It ships **no**
  `"use client"` of its own, so rendering it directly from a Server Component with no client
  ancestor throws. In a normal client-side form tree this never comes up.
- **`aria-describedby` needs a rendered `FieldError`.** Inside an errored `Field`, Select
  points `aria-describedby` at the field's error id; if you don't render `FieldError` (or
  give the error no content), that id resolves to nothing.
- **No per-component CSS.** There is no `Select.css`. Both CSS imports are still required —
  the utilities above resolve to tokens from `@batthewz/response-ui-css`.

## Accessibility

Select renders a real `<select>`, which is the strongest reason to use it. Keyboard support,
focus management, the popup's own semantics, and every platform screen reader's handling of
it are the browser's, not this library's — there is no roving `tabindex`, no
`aria-activedescendant`, and no focus trap here to get wrong. A single-line select exposes
the `combobox` role; adding `multiple` or `size` greater than 1 makes it a `listbox`.

It has no built-in label, so always give it an accessible name — via a `Field` +
[Label](label.md) with matching `htmlFor`/`id`, an `aria-label`, or `aria-labelledby`.

When invalid it sets `aria-invalid="true"`, and inside a `Field` it also sets
`aria-describedby` to the `FieldError`. The error is signalled **visually** only by the
border and ring colour, so pair it with a visible `FieldError` message for users who can't
perceive the difference.

Focus shows a 2px ring in `--C-BORDER-FOCUS` plus a matching border; it is a `focus:` ring,
not `focus-visible:`, so it appears on click as well as on keyboard focus.

Two things to watch. The chevron is a CSS background image, so it is correctly never
announced — but it is also the only visual cue that the control is a dropdown, and it does
not re-tint with the theme (see [Gotchas](#gotchas)). And a placeholder option carries no
special semantics: it is read out as an ordinary choice, so word it as an instruction
("Select a role…") rather than leaving it blank.

## Related

[Input](input.md) · [Textarea](textarea.md) · [Field](field.md) · [Label](label.md) ·
[FieldError](field-error.md) · `Combobox` · `MultiSelect` · `Radio` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
