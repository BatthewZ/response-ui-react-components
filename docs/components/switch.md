# Switch

An on/off control for a setting that takes effect the moment you flip it — a
`<button role="switch">` whose thumb slides across a token-tinted track, with the theme's
own motion timing and a `prefers-reduced-motion` escape built in. Reach for it when the
toggle *is* the action; reach for [Checkbox](checkbox.md) when it is a value the user
submits later with a form.

<!-- example:Minimal -->
```tsx
<div className="flex items-center justify-between gap-r5">
  <Label htmlFor="email-notifications">Email notifications</Label>
  <Switch id="email-notifications" defaultChecked />
</div>
```
<!-- /example -->

| Prop              | Type                            | Default |
| ----------------- | ------------------------------- | ------- |
| `checked`         | `boolean`                       | —       |
| `defaultChecked`  | `boolean`                       | `false` |
| `onCheckedChange` | `(checked: boolean) => void`    | —       |
| `size`            | `"sm" \| "md"`                  | `"md"`  |
| `error`           | `boolean`                       | —       |
| `name`            | `string`                        | —       |
| `value`           | `string`                        | `"on"`  |
| `className`       | `string`                        | —       |
| `ref`             | `Ref<HTMLButtonElement>`        | —       |
| …rest             | props of `<button>`, minus the native `value`; `onChange` is a compile error | — |

`value` is re-typed as the string the hidden input submits, not the native button `value`.
`onChange` goes further than removal: it is declared `onChange?: never`, so writing one is a
**compile error** rather than a prop that quietly does nothing. That matters because a JSX
spread performs no excess-property check — `{...form.field("subscribe")}` used to typecheck
and land an `onChange` on the `<button>`, where React never fires it. The change channel is
`onCheckedChange`; wire a form with `watch`/`setValue`. `disabled`
and `onClick` are pulled out and applied to the `<button>` explicitly — `onClick` wrapped, see
[Vetoing a toggle](#vetoing-a-toggle) — and everything left over (`id`, `aria-*`, `data-*`,
`form`, `tabIndex`, …) spreads onto the button before the attributes that report the switch's
own state (`role`, `aria-checked`, `data-state`, `data-size`), which therefore win.
Switch renders no text of its own, so its accessible name is entirely yours to supply. See
[Gotchas](#gotchas).

## Switch or checkbox?

The line is about *when the change lands*, not about how the control looks. A switch is a
live control: flipping it turns the thing on. A checkbox is a value you are editing, and it
does nothing until the form is submitted. If flipping the control fires a request, mutates
app state, or changes what the user is looking at, it is a switch. If it sits in a form next
to a **Save** button, it is a [Checkbox](checkbox.md).

That distinction is not cosmetic here — the two components are built out of different
elements and behave differently as a result:

|                        | `Switch`                                                   | [Checkbox](checkbox.md)                       |
| ---------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| Renders                | `<button role="switch">` + a decorative thumb `<span>`      | native `<input type="checkbox">`              |
| Change handler         | `onCheckedChange(checked: boolean)`                         | `onChange(event)`                             |
| Form participation     | none natively — a hidden `<input>`, and only if you pass `name` | native                                    |
| `required`, `:invalid` | not available                                               | native constraint validation                  |
| Third state            | none                                                        | `.indeterminate` via ref → `aria-checked="mixed"` |
| `<form>` reset         | unaffected — the state is React state                       | restores `defaultChecked`                     |
| Announced as           | "switch", on/off                                            | "checkbox", checked/not checked               |

Switch does accept `name` and `value`, which makes it *look* form-ready. Read
[Submitting with a form](#submitting-with-a-form) before you rely on that — the hidden input
is a workaround, not native participation, though its payload follows native checkbox
semantics.

## Controlled and uncontrolled

Pass `defaultChecked` and Switch owns its state (as in the example above). Pass `checked`
and you own it: the click calls `onCheckedChange` with the next boolean and changes nothing
else, so the thumb only moves once you re-render with a new `checked`.

<!-- example:Controlled -->
```tsx
<div className="flex items-center justify-between gap-r5">
  <Label htmlFor="two-factor">Require two-factor authentication</Label>
  <Switch id="two-factor" checked={twoFactor} onCheckedChange={setTwoFactor} />
</div>
```
<!-- /example -->

The mode is decided on the **first render** and never re-evaluated: `checked !== undefined`
at mount means controlled forever. Starting with `checked={undefined}` and filling it in
later leaves the switch uncontrolled and your `checked` ignored. See [Gotchas](#gotchas).

`onCheckedChange` fires in both modes and always receives the resolved next value — a
`boolean`, not an event. If you need the event (`shiftKey`, `currentTarget`), use `onClick`,
which runs first.

## Sizes

<!-- example:Sizes -->
```tsx
<div className="flex items-center gap-r4">
  <Switch aria-label="Autoplay previews" size="sm" defaultChecked />
  <Switch aria-label="Autoplay previews" size="md" defaultChecked />
</div>
```
<!-- /example -->

`md` is a 2.75×1.5rem track with a 1.25rem thumb; `sm` is 2.25×1.25rem with a 1rem thumb.
Both are hard literals in `Switch.css`, not theme tokens, and the size also lands on the
element as `data-size` so your own CSS can hook it.

## Disabled

<!-- example:Disabled -->
```tsx
<div className="flex flex-col gap-r4">
  <div className="flex items-center justify-between gap-r5">
    <Label htmlFor="enforce-sso">Enforce SSO for all members</Label>
    <Switch id="enforce-sso" defaultChecked disabled />
  </div>
  <div className="flex items-center justify-between gap-r5">
    <Label htmlFor="audit-log-export">Audit log export</Label>
    <Switch id="audit-log-export" disabled />
  </div>
</div>
```
<!-- /example -->

`disabled` is the native button attribute, so the click never fires. The CSS adds
`opacity: 0.5`, `cursor: not-allowed`, and `pointer-events: none` — the last of which also
kills hover and `title` tooltips on the control, so a tooltip explaining *why* the switch is
locked has to go on a wrapper, not on the Switch.

## Inside a Field

Switch reads the [Field](field.md) context the same way the text inputs do: when the field
is invalid it takes `aria-invalid="true"` and an `aria-describedby` pointing at the
[FieldError](field-error.md), and the CSS draws a 1px `--C-STATUS-ERROR` outline around the
track.

<!-- example:InvalidInAField -->
```tsx
<Field error="Accept the data processing terms to continue.">
  <div className="flex items-center justify-between gap-r5">
    <Label htmlFor="accept-dpa">I accept the data processing terms</Label>
    <Switch id="accept-dpa" />
  </div>
  <FieldError />
</Field>
```
<!-- /example -->

The `error` prop is the standalone version of the same thing — pass `error` to force the
invalid state outside a Field, or to override an inherited one.

## Submitting with a form

With a `name`, Switch renders a sibling `<input type="hidden">` carrying `value` — but only
while the switch is on:

<!-- example:SubmittedWithAForm -->
```tsx
<form action="/api/preferences" method="post" className="flex flex-col gap-r4">
  <div className="flex items-center justify-between gap-r5">
    <Label htmlFor="weekly-digest">Weekly digest</Label>
    <Switch id="weekly-digest" name="weeklyDigest" value="yes" defaultChecked />
  </div>
  <Button type="submit">Save changes</Button>
</form>
```
<!-- /example -->

That is genuinely useful for a plain HTML form post or a server action, and the payload
follows native checkbox semantics:

- **Off omits the field.** No hidden input is rendered while the Switch is off, so
  `FormData.has("weeklyDigest")` is `false` — a presence check answers the question it looks
  like it answers, and `get(…)` returns the `value` string when on.
- **`disabled` suppresses the value.** The hidden input carries the `disabled` attribute, so
  a disabled Switch posts nothing, exactly like a native control.

## Vetoing a toggle

`onClick` is called before the state changes, and the toggle is skipped if the handler
called `preventDefault()`. `preventDefault` has no native effect on a button click, so it is
free to use purely as a veto channel:

<!-- example:VetoingAToggle -->
```tsx
<div className="flex items-center justify-between gap-r5">
  <Label htmlFor="custom-domain">Serve on a custom domain</Label>
  <Switch
    id="custom-domain"
    onClick={(event) => {
      if (plan === "free") event.preventDefault();
    }}
  />
</div>
```
<!-- /example -->

## Theme tokens

Switch uses **no Tailwind utilities** — `Switch.tsx` emits only the `switch` and
`switch-thumb` class names, and every value comes from `Switch.css` reading a contract
variable directly. Override any of these and every switch in the app re-tints or re-times at
runtime, with no rebuild.

| Where                       | Override                  |
| --------------------------- | ------------------------- |
| Track, off                  | `--C-SURFACE-2`           |
| Track, on                   | `--C-ACCENT`              |
| Thumb                       | `--C-SURFACE-0`           |
| Track & thumb corners       | `--RADIUS-FULL`           |
| Invalid outline             | `--C-STATUS-ERROR`        |
| Focus ring                  | `--C-BORDER-FOCUS`        |
| Toggle duration             | `--MOTION-DURATION-SHIFT` |
| Toggle easing               | `--MOTION-EASE-SHIFT`     |

Both the track's colour fade and the thumb's travel run on the **same** pair of motion
tokens, so they always land together. `--MOTION-DURATION-SHIFT` is the theme's "something
moved" step and it is retimed per theme — `400ms` by default, `250ms` in `tech`, `500ms` in
`events`, `600ms` in `grimdark`. That is a long beat for a control whose effect is immediate,
so on the slower themes expect the thumb to still be travelling well after the setting has
taken effect. Retime it per-component with your own `.switch { transition-duration: … }`
rather than moving `--MOTION-DURATION-SHIFT`, which every other shifting surface shares.

Everything geometric is a hard literal rather than a token: both track sizes, the 2px inset
that positions the thumb, the thumb's `1.25rem`/`1rem` travel distance, the disabled
`opacity: 0.5`, and the 2px/1px outline widths. They are interdependent — the travel distance
is track width minus thumb width minus padding — so they are fixed rather than themeable.

Note what is **not** in the table: there is no border token. `all: unset` strips the button's
border and nothing adds one back, so the track's only edge is where its `--C-SURFACE-2` meets
the page. See [Accessibility](#accessibility) — that has measurable consequences.

## Gotchas

- **Off, the thumb is all but invisible.** The thumb is `--C-SURFACE-0` on a `--C-SURFACE-2`
  track: **1.08:1 to 1.16:1** across the four shipped themes, against the 3:1 that WCAG 1.4.11
  asks of a part you need to see to read the state. The track is only 1.04:1–1.16:1 against a
  `--C-SURFACE-0` or `--C-SURFACE-1` page, and has no border. So an off Switch is in practice a
  faint empty pill — and the on/off difference a user actually perceives is the accent tint,
  not the thumb's position. See [Accessibility](#accessibility).
- **The mode locks at mount.** `useControllableState` records `checked !== undefined` on the
  first render and never revisits it. A switch mounted with `checked={undefined}` stays
  uncontrolled for its whole life, silently ignoring every `checked` you pass afterwards.
- **Controlled means *nothing* moves on click.** In controlled mode the click only calls
  `onCheckedChange`; internal state is not touched. Forget to feed the value back into
  `checked` and the switch is inert while still reporting every click.
- **`className` cannot repaint the track.** `.switch` is unlayered component CSS and outranks
  Tailwind's `@layer utilities`, and `cn` (tailwind-merge) can't help because `switch` is not
  a utility it knows how to dedupe. `className="bg-red-500 w-16"` loses on both properties —
  as does anything else `.switch` sets (`display`, `width`, `height`, `padding`,
  `border-radius`, `background-color`, `cursor`, `transition`). Use Tailwind's important
  modifier (`bg-red-500!`), your own unlayered rule, or restyle `.switch` directly.
- **The switch's own state attributes can no longer be overridden.** `role`, `aria-checked`,
  `data-state` and `data-size` are derived from `checked`/`size` and are now written *after*
  `{...props}`, so passing your own is ignored rather than making assistive tech report a state
  that has nothing to do with the thumb. `type` is still yours to set, since form participation
  is the author's call. Error wiring from a surrounding [Field](field.md) is *merged* rather
  than ordered: the component wins when it has an opinion, and your `aria-describedby` /
  `aria-invalid` survive when it does not.
- **The error outline survives focus.** `.switch[aria-invalid="true"]` and
  `.switch:focus-visible` both set `outline` at identical specificity, so the later-declared
  focus rule used to win and blank the error tint exactly while the user was on the control.
  A dedicated `.switch[aria-invalid="true"]:focus-visible` rule now out-ranks both: a focused
  invalid switch keeps the error colour and reports focus through the 2px outline width.
- **`form` reaches the hidden input.** `<Switch name="x" form="signup" />` associates both the
  button and the hidden input with `#signup`, so a Switch rendered outside its `<form>` still
  submits.
- **`name` renders a second DOM node while on.** Switch returns a fragment, so with a `name`
  and a checked state it is a `<button>` *and* an `<input type="hidden">`. Browsers hide the
  latter, but a parent using `:last-child`, `:nth-child`, or a child count will see two
  elements.
- **Client component.** `"use client"`, for `useControllableState` and the Field context —
  the directive draws the boundary itself, so importing it straight from a Server Component
  works. The same goes for [Checkbox](checkbox.md), which became a client component when it
  started consuming the Field's error state.

## Accessibility

**The state is exposed correctly.** `role="switch"` with `aria-checked` on a real `<button>`
means it is in the tab order, activates with both `Space` and `Enter`, and announces as a
switch that is on or off. The thumb `<span>` is empty and carries no text, so nothing
spurious is read. `disabled` maps to the native disabled state.

**Naming is entirely your job, and [Field](field.md) will not do it for you.** The button has
no text content and Switch adds no `aria-label`, so an unlabelled Switch is an unnamed switch.
`<button>` is a labelable element, so both native `<label>` associations do work here — and
`aria-label` covers the case where there is no visible text to point at:

- `<Label htmlFor="x">` next to `<Switch id="x">` — this names the switch *and* makes the
  label text toggle it, since clicking a `<label>` dispatches a click on its control.
- Wrapping the Switch in a [Label](label.md) — same effect, no ids.
- `aria-label` when the row has no visible text of its own (see the sizes example above).

Putting a [Label](label.md) and a Switch inside a [Field](field.md) is **not** enough on its
own: Field resolves the error and nothing else, so without `htmlFor`/`id` the switch stays
unnamed and clicking the label does nothing.

**Focus is `focus-visible`,** a 2px `--C-BORDER-FOCUS` outline at 2px offset — keyboard focus
shows it, a mouse click doesn't. It is an `outline`, not a ring, so `--tw-ring-offset-color`
never applies to it either way, and because outlines are drawn outside the box it never shifts
layout.

**Motion is guarded.** `Switch.css` ends in a `@media (prefers-reduced-motion: reduce)` block
that sets `transition: none` on both the track and the thumb. The thumb still ends up in the
right place; it just gets there instantly. No `motion-reduce:` utility is involved, so this
holds no matter how the consumer's Tailwind build is configured.

**The one real failure is contrast, and it is now the *off* state only.** Measured against
`@batthewz/response-ui-css` **v0.10.1**: switched **on**, the `--C-SURFACE-0` thumb against the
`--C-ACCENT` track clears the 3:1 that WCAG 1.4.11 requires of a state indicator in every theme
— **5.17** default · **4.89** `events` · **14.84** `tech` · **5.69** `grimdark`. `events` and
`grimdark` read 2.72 and 2.96 before **v0.10.0** retuned the accent, so that half of this
finding is closed. Switched **off**, the same thumb sits on a `--C-SURFACE-2` track at
**1.08:1–1.16:1 in all four themes**, and no palette retune can fix it — the whole surface ramp
spans about 1.2 end to end by design. There is no border to fall back on
either. The consequence is that the moving
thumb — the non-colour cue that is supposed to keep a switch out of the WCAG 1.4.1
"colour alone" trap — is not reliably perceivable, leaving the accent tint doing the work by
itself. That is deliberately filed as 1.4.11 and not also as 1.4.1: the second, non-colour
channel genuinely ships — the thumb does move — and the only thing wrong with it is that it
is too low-contrast to see, which is 1.4.11's subject. One root cause, one finding. Until the
tokens change, the practical mitigations are a visible text label per state, or an override
giving the thumb a border or a higher-contrast fill.

## Related

[Checkbox](checkbox.md) · [Radio](radio.md) · [Field](field.md) · [Label](label.md) ·
[FieldError](field-error.md) · [Input](input.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
