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
and `multiple`/`size` pass through and look wrong. See [Gotchas](#gotchas).

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

**Reach for [Combobox](combobox.md) or [MultiSelect](multi-select.md) when:**

- The list is long enough to need filtering. Native type-ahead only jumps to entries by
  leading characters; there is no search field and no substring match. [Combobox](combobox.md) is a text
  input over a filtered list, with `loading` and a `Combobox.Empty` "no results" slot.
- You need more than one value. `<select multiple>` is a ctrl-click list on desktop and
  inconsistent on mobile; [MultiSelect](multi-select.md) gives removable chips, an inline filter, and a
  `maxItems` cap.
- An option needs to be richer than a string — an icon, a second line, an avatar. An
  `<option>` renders its text and nothing else. This one is [Combobox](combobox.md) only: its `Item` takes
  arbitrary children, whereas a [MultiSelect](multi-select.md) option is `{ value, label }` with a `string`
  label and no children, so its rows are as plain as a native `<option>`.
- You need to style the open list at all: highlight colour, spacing, a custom group header,
  an async state. Again [Combobox](combobox.md) — it owns no data, so the popup's contents are whatever
  you render; [MultiSelect](multi-select.md) renders its own rows from the `options` array and has no
  loading state.

The cost of the two custom controls is the usual one: both portal, both carry hand-written
ARIA, and both are inert without JavaScript, where a server-rendered `<select>` still works.
Select is the sturdy default — stay on it until one of the bullets above actually bites.

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
border from `error` or from a [Field](field.md).

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

[Field](field.md) owns the error. When it is invalid, Select reads `aria-invalid` and the id of the
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

`error` **overrides** any [Field](field.md) it sits in — because the resolution is `error ??
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
re-tints the control at runtime with the rest of the app — there is nothing left in the closed
control that does not. Select has no `.css` file of its own, so all of these are Tailwind
utilities in the `.tsx`.

| Where               | Utility                                               | Override                          |
| ------------------- | ----------------------------------------------------- | --------------------------------- |
| Text                | `text-body-2` `text-fg-primary`                       | `--BodyText-2` `--C-TEXT-PRIMARY` |
| Fill                | `bg-surface-0`                                        | `--C-SURFACE-0`                   |
| Disabled fill       | `disabled:bg-surface-3`                               | `--C-SURFACE-3`                   |
| Border              | `border-border-strong`                                | `--C-BORDER-STRONG`               |
| Focus ring & border | `focus:ring-border-focus` `focus:border-border-focus` | `--C-BORDER-FOCUS` |
| Error border & ring | `border-status-error` `focus:ring-status-error` | `--C-STATUS-ERROR`              |
| Padding             | `px-r4` `py-r5`                                       | `--R-SIZE-4` `--R-SIZE-5`         |
| Chevron gutter      | `pr-r1`                                               | `--R-SIZE-1`                      |
| Chevron ink         | `text-fg-secondary`                                   | `--C-TEXT-SECONDARY`              |
| Corner radius       | `rounded-md`                                          | `--RADIUS-MD`                     |
| Transition          | `duration-fast`                                       | `--DURATION-FAST`                 |

**Every row above styles the closed control only.** The moment the list opens, the browser
and the OS paint it, and none of these variables reach it. The one lever that does is
`color-scheme`, which the CSS foundation sets per theme (`light` on `:root`, `dark` on the
dark themes) — so the popup follows your theme's light/dark polarity and nothing else: not
the surface, not the accent, not the radius, not the font.

The default border is `--C-BORDER-STRONG`, not `--C-BORDER-DEFAULT` — form controls sit a
step higher-contrast than card edges. The error state swaps the resting border and the focus
ring to `--C-STATUS-ERROR`; it does not tint the fill. The swap covers `focus:border-*` too,
so a *focused* invalid select stays error-coloured throughout. The focus ring is
`ring-offset-0`, flush against the border, so nothing paints in a gap.

The chevron is a real `lucide` element positioned over the control, not a background image, so
its ink is `text-fg-secondary` and follows the theme like everything else. (As a data-URI
background it could not: an SVG referenced as a background image is its own document, and the
`fill="currentColor"` inside it resolved against *that* document's initial colour — black on
every theme, 1.06:1 on `tech`.)

The gutter that keeps text clear of the chevron is `pr-r1`, the same rung
[DatePicker](date-picker.md) reserves for its icon cluster. It used to be `pr-10` — a frozen
`2.5rem` on Tailwind's *default* spacing scale rather than the responsive `r`-scale every other
padding here sits on. Off the contract, and in practice too tight: measured in Firefox 146 it
left 4px between the text box and the chevron above the 40rem breakpoint, and never moved.

`r1` is the **smallest** rung that clears the chevron at both steps — the gutter has to cover
the glyph's `right-r4` inset plus its 16px box, and `r2` is `1.25rem` on a phone, which runs
under it. That leaves 8px of air below 40rem and 60px above it. The 60px is more than a 16px
glyph needs, and it is the price of staying on the scale: the value that would fit exactly is a
`calc()` over two rungs, which resolves to no single token and so cannot be checked by
`scripts/verify-component-docs.mjs` against the row above. A gutter the guard can verify beat a
gutter tuned by eye. If it costs you visible text on a narrow control, `className="pr-r2"`
merges over it — the class list runs through tailwind-merge — at the cost of the clearance.

## Gotchas

- **You cannot style the option list.** `appearance-none` and everything in the token table
  dress the *closed* control. The popup is an OS-drawn layer: `<option>` takes no radius, no
  padding, no hover colour, and on macOS and iOS not even a font. Nothing in your theme
  reaches it beyond `color-scheme`. If the list itself has to be designed, that is what
  [Combobox](combobox.md) and [MultiSelect](multi-select.md) are for.
- **The control renders as a wrapper `<div>` around the `<select>`.** The chevron is a
  sibling element rather than a background image, so a `Select` is two nodes, not one. Rest
  props, the ref and `className` all still go to the `<select>` itself.
- **It is `w-full` by default,** not sized to its longest option the way a bare `<select>`
  is. Pass `className="w-auto"` (or a fixed width) to opt out — the class list runs through
  tailwind-merge, so yours replaces the default rather than fighting it.
- **A placeholder only holds `required`** when it is the first option, a direct child, and
  empty-valued, on a single-line select. See
  [Placeholder and required](#placeholder-and-required); the failure is silent — the form
  just submits `""`.
- **`multiple` and `size` compile and look wrong.** They are native `<select>` attributes and
  pass through, but the styling assumes a one-line control. In Chromium and Firefox alike the
  chevron still paints, stranded in the vertical middle of the expanded list, and the chevron
  gutter still reserves its space down the whole height. The ARIA role also changes from
  `combobox` to `listbox`. Reach for [MultiSelect](multi-select.md) instead.
- **The [Label](label.md) is not auto-associated.** [Field](field.md) wires the *error* (`aria-invalid`,
  `aria-describedby`) through context, but nothing links a [Label](label.md) to the select. Set
  `Label htmlFor="x"` and `Select id="x"` yourself, or clicking the label won't focus the
  control and screen readers won't announce it as the field's name.
- **Client Component, self-declared.** Select calls the `useFieldError` hook (it reads
  context), so it runs on the client — but it ships its own `"use client"`, so importing it
  straight from a Server Component works; React draws the boundary for you.
- **`aria-describedby` needs a rendered [FieldError](field-error.md).** Inside an errored [Field](field.md), Select
  points `aria-describedby` at the error element a [FieldError](field-error.md) actually mounted; if you
  don't render one (or the error has no content), the attribute is simply omitted — no
  dangling id, but no announced message either.
- **No per-component CSS.** There is no `Select.css`. Both CSS imports are still required —
  the utilities above resolve to tokens from `@batthewz/response-ui-css`.

## Accessibility

Select renders a real `<select>`, which is the strongest reason to use it. Keyboard support,
focus management, the popup's own semantics, and every platform screen reader's handling of
it are the browser's, not this library's — there is no roving `tabindex`, no
`aria-activedescendant`, and no focus trap here to get wrong. A single-line select exposes
the `combobox` role; adding `multiple` or `size` greater than 1 makes it a `listbox`.

It has no built-in label, so always give it an accessible name — via a [Field](field.md) +
[Label](label.md) with matching `htmlFor`/`id`, an `aria-label`, or `aria-labelledby`.

When invalid it sets `aria-invalid="true"`, and inside a [Field](field.md) it also sets
`aria-describedby` to the [FieldError](field-error.md). The error is signalled **visually** only by the
border and ring colour, so pair it with a visible [FieldError](field-error.md) message for users who can't
perceive the difference.

Focus shows a 2px ring in `--C-BORDER-FOCUS` plus a matching border; it is a `focus:` ring,
not `focus-visible:`, so it appears on click as well as on keyboard focus. That matters more
here than on a text field: browsers grant a clicked text input an indicator unconditionally
but judge a clicked `<select>` for themselves, so plain `:focus` is what makes the ring
certain. `focus:outline-none` removes the UA outline, leaving the ring as the indicator.

Two things to watch. The chevron is `aria-hidden`, so it is correctly never announced — but it
is also the only visual cue that the control is a dropdown, because `appearance-none` strips
the UA arrow. (It is a real `lucide` element now, so it does follow the theme; the sentence
that used to say otherwise described the data-URI background it replaced.) And a placeholder
option carries no
special semantics: it is read out as an ordinary choice, so word it as an instruction
("Select a role…") rather than leaving it blank.

## Related

[Input](input.md) · [Textarea](textarea.md) · [Field](field.md) · [Label](label.md) ·
[FieldError](field-error.md) · [Combobox](combobox.md) · [MultiSelect](multi-select.md) · [Radio](radio.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
