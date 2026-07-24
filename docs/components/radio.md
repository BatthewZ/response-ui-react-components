# Radio

A single native `<input type="radio">`, pre-sized and tinted with your accent colour. It is
the *option*, not the set: radios become one mutually-exclusive group through a shared `name`
attribute, and this package ships no group component — so the grouping, and the accessible
name that goes with it, are yours to write.

<!-- example:Minimal -->
```tsx
<div className="flex flex-col gap-r5">
  <label className="flex items-center gap-r5">
    <Radio name="billing-period" value="monthly" defaultChecked />
    Billed monthly
  </label>
  <label className="flex items-center gap-r5">
    <Radio name="billing-period" value="yearly" />
    Billed yearly — save 20%
  </label>
</div>
```
<!-- /example -->

| Prop        | Type                    | Default |
| ----------- | ----------------------- | ------- |
| `className` | `string`                | —       |
| `ref`       | `Ref<HTMLInputElement>` | —       |
| …rest       | props of `<input>`      | —       |

`type` is fixed to `"radio"` and is the only input prop removed from the type; everything
else — `name`, `value`, `checked`, `defaultChecked`, `disabled`, `required`, `onChange`,
`aria-*` — spreads onto the underlying `<input>`. Radio adds **no** props of its own: no
label, no `error`, no awareness of the group it belongs to. It also removes its own focus
outline. See [Gotchas](#gotchas).

## Grouping is the whole job

Two radios are one group when they share a `name` and the same form owner — not because they
sit in the same wrapper. That single attribute buys the entire native behaviour: selecting
one clears the others, the pair takes **one** tab stop between them, and arrow keys move the
selection. Drop the `name` and you have two independent groups that can both be selected,
which is the mistake this component makes easiest to commit.

A group also needs a name of its own. The native way is a `<fieldset>` with a `<legend>`:

<!-- example:Grouped -->
```tsx
<fieldset>
  <legend className="text-body-2 font-semibold text-fg-primary">Email digest</legend>
  <div className="mt-r5 flex flex-col gap-r5">
    <label className="flex items-center gap-r5">
      <Radio name="email-digest" value="realtime" defaultChecked />
      Real time
    </label>
    <label className="flex items-center gap-r5">
      <Radio name="email-digest" value="daily" />
      Daily summary
    </label>
    <label className="flex items-center gap-r5">
      <Radio name="email-digest" value="weekly" />
      Weekly summary
    </label>
  </div>
</fieldset>
```
<!-- /example -->

The legend is styled by hand here because [Label](label.md) renders a `<label>`, which names
a *single* control and cannot serve as a group's legend. Reach for it on the individual
options if you want the label treatment there; the group's name belongs on the `<legend>`.

## Controlled

Pass one `checked` per group plus an `onChange`, and derive the flag from your state — omit
both and lean on `defaultChecked` for an uncontrolled group (as above). Where there is no
`<fieldset>` to hang a `<legend>` on, `role="radiogroup"` with an `aria-label` names the set
instead:

<!-- example:Controlled -->
```tsx
<div role="radiogroup" aria-label="Sync frequency" className="flex flex-col gap-r5">
  <label className="flex items-center gap-r5">
    <Radio
      name="sync-frequency"
      value="15m"
      checked={frequency === "15m"}
      onChange={(e) => setFrequency(e.target.value)}
    />
    Every 15 minutes
  </label>
  <label className="flex items-center gap-r5">
    <Radio
      name="sync-frequency"
      value="hourly"
      checked={frequency === "hourly"}
      onChange={(e) => setFrequency(e.target.value)}
    />
    Hourly
  </label>
  <label className="flex items-center gap-r5">
    <Radio
      name="sync-frequency"
      value="daily"
      checked={frequency === "daily"}
      onChange={(e) => setFrequency(e.target.value)}
    />
    Daily
  </label>
</div>
```
<!-- /example -->

`role="radiogroup"` is doing one job here: carrying the name. The keyboard behaviour still
comes from the shared `name` attribute on real radios — the role adds none of it.

## Disabled

<!-- example:Disabled -->
```tsx
<div className="flex flex-col gap-r5">
  <label className="flex items-center gap-r5">
    <Radio name="support-plan" value="standard" defaultChecked />
    Standard support
  </label>
  <label className="flex items-center gap-r5">
    <Radio name="support-plan" value="priority" disabled />
    Priority support — not on your plan
  </label>
</div>
```
<!-- /example -->

A disabled option leaves the tab order and the arrow-key cycle, and its greyed look is
whatever the browser draws for the current `color-scheme` — Radio adds no `disabled:`
styling. To take the whole group out at once, `disabled` on the `<fieldset>` cascades to
every control inside it:

<!-- example:DisabledGroup -->
```tsx
<fieldset disabled>
  <legend className="text-body-2 font-semibold text-fg-primary">
    Visibility — locked by your workspace admin
  </legend>
  <div className="mt-r5 flex flex-col gap-r5">
    <label className="flex items-center gap-r5">
      <Radio name="visibility" value="private" defaultChecked />
      Private to your team
    </label>
    <label className="flex items-center gap-r5">
      <Radio name="visibility" value="public" />
      Anyone with the link
    </label>
  </div>
</fieldset>
```
<!-- /example -->

## Inside a field

[Field](field.md) gives the group its column layout and resolves the error, and
[FieldError](field-error.md) renders the message — but Radio never reads that context, so
the ARIA link from the group to the message is manual. Give the error element an explicit
`id` and point the group's `aria-describedby` at it:

<!-- example:InField -->
```tsx
<Field error="Choose a delivery speed.">
  <fieldset aria-describedby="delivery-speed-error">
    <legend className="text-body-2 font-semibold text-fg-primary">Delivery speed</legend>
    <div className="mt-r5 flex flex-col gap-r5">
      <label className="flex items-center gap-r5">
        <Radio name="delivery-speed" value="standard" required />
        Standard — 3–5 working days
      </label>
      <label className="flex items-center gap-r5">
        <Radio name="delivery-speed" value="express" required />
        Express — next working day
      </label>
    </div>
  </fieldset>
  <FieldError id="delivery-speed-error" />
</Field>
```
<!-- /example -->

`required` on one member makes the whole group required, so the browser blocks submission
until something is chosen.

Note what this example does *not* do: it never marks the group invalid. `aria-invalid` has no
effect on a `<fieldset>` — see [Accessibility](#accessibility) — so a group that has to carry
the invalid state needs the `role="radiogroup"` container from [Controlled](#controlled)
rather than a fieldset, with `aria-invalid="true"` and `aria-describedby` both on that `div`.

## Theme tokens

Radio has no `.css` file and reads exactly one contract variable, through a Tailwind utility
in the `.tsx`:

| Where             | Utility         | Override     |
| ----------------- | --------------- | ------------ |
| Selected dot fill | `accent-accent` | `--C-ACCENT` |

That utility sets the CSS `accent-color` property, which every current engine honours on a
native radio, so the selected dot follows `--C-ACCENT` in every theme. It is the whole of
Radio's theming.

The box is a fixed `size-4` (1rem) — a Tailwind spacing value, not a contract token, so
resize it with `className="size-…"` rather than a theme variable. The only other class on the
element is `focus:outline-none`, which resolves to no token because it is a removal, not a
colour: it deletes the browser's focus ring and Radio puts nothing back. See
[Gotchas](#gotchas).

Note what is *absent*: unlike [Checkbox](checkbox.md), Radio ships no `border-*` or
`rounded-*` utility. That is the honest call rather than an omission — there is no
`appearance-none` here either, so the circle is the browser's own control, and current
engines widely ignore an author border or corner radius drawn on one.

## Gotchas

- **A shared `name` is the only thing that makes a group.** Wrapping radios in a `<div>`, a
  `<fieldset>`, or a `role="radiogroup"` groups nothing on its own — omit the matching `name`
  and both options can be selected at once, and arrow keys won't move between them. The same
  `name` in two different `<form>` elements is likewise two groups, not one.
- **There is no `RadioGroup`.** The package exports `Radio` alone — no group component, no
  `options` prop, no set-level `value`/`onChange`, no roving-tabindex helper. Every group on
  this page is hand-built, and that is the supported path.
- **Focusing a Radio makes the focus indicator disappear.** The component sets
  `focus:outline-none` and adds no ring, so the browser's outline is removed with nothing in
  its place — on every theme, and in forced-colours mode too, because Tailwind v4's
  `outline-none` compiles to `outline-style: none` rather than the transparent outline that
  `outline-hidden` keeps. [Checkbox](checkbox.md) at least draws a focus ring. Until this is
  fixed in the component, put one back at the call site:
  `<Radio className="focus-visible:ring-2 focus-visible:ring-border-focus" />`.
- **Radio ignores [Field](field.md) context.** Every other control in the form module
  inherits `aria-invalid` / `aria-describedby` automatically: eleven of them
  ([Input](input.md), [Textarea](textarea.md), `Select`, `Combobox`, `Switch` and six more)
  read the field-error hook directly, and four more — `DatePicker`, `DateRangePicker`,
  `NumberInput`, `SearchInput` — get it through the `Input` they render. Radio does not, and
  neither does [Checkbox](checkbox.md): those two are the module's only unwired controls.
  Radio also takes no `error` prop, so a radio inside an invalid Field is neither marked
  invalid nor linked to the message. Wire `aria-describedby` onto the group yourself.
- **One `checked` or `defaultChecked` per group.** Mark two members of the same group and the
  browser keeps only the last one checked — so the form submits that single value while your
  props still claim two, and React and the DOM disagree about the rest. Passing `checked`
  without an `onChange` also makes the input read-only, and React warns about it.
- **A checked radio with no `value` submits `on`.** The `value` attribute is what a form
  submission carries, so give every option one — the visible label text is not submitted.
- **The circle is the browser's, and so is the disabled look.** With no `appearance-none` the
  control keeps its native appearance; only `accent-color` and the 1rem box size come from
  this component.
- **No built-in label.** Radio renders a bare `<input>` — give it an accessible name yourself
  (see [Accessibility](#accessibility)).
- **No per-component CSS.** There is no `Radio.css`. The CSS imports from
  `@batthewz/response-ui-css` are still required — `accent-accent` resolves to its tokens.
- **Server-renderable.** No `"use client"`, no hooks, and it reads no context, so Radio drops
  straight into an RSC tree. The last example's tree does not, but that is
  [Field](field.md)'s client boundary — and [FieldError](field-error.md)'s, which reads the
  same context with no directive of its own and, as `Field`'s *child*, is rendered by
  whoever writes it rather than from behind `Field`'s boundary. Neither is Radio's doing.

## Accessibility

Radio is a native `<input type="radio">`, so it exposes the `radio` role and its checked state
to assistive tech with no ARIA from you. Give each option an accessible name by wrapping it
and its text in one `<label>` (implicit association, as in every example here), by pairing a
sibling label via `htmlFor`/`id`, or with `aria-label` when the control stands alone.

**The keyboard model comes from the `name` attribute, not from this component.** Radios that
share a `name` get the standard group behaviour free: `Tab` enters the group once, landing on
the checked option (or the first one when nothing is checked) and skipping the rest; the arrow
keys move focus *and* the selection between members, wrapping at the ends; `Space` selects the
focused option. Nothing in `Radio.tsx` implements any of that — a custom-drawn radio group
would have to build roving tabindex by hand, which is the strongest argument for keeping these
native.

Name the group as well as the options. A `<fieldset>`/`<legend>`, or `role="radiogroup"` with
`aria-label` / `aria-labelledby`, is what tells a screen-reader user *what* is being chosen;
without one they hear "Daily summary, radio button, 2 of 3" with no idea it concerns the email
digest.

**Focus is not visible.** `focus:outline-none` removes the browser's focus indicator and the
component supplies no ring, which fails WCAG 2.4.7 (Focus Visible) for every keyboard user on
every theme. This is a defect in the component rather than a styling choice; the call-site
workaround is in [Gotchas](#gotchas).

Marking a group invalid is manual, and so is describing it — Radio reads no field context —
and the two do not go in the same place. `aria-describedby` is global, so it can sit on the
`<fieldset>`, which is what [Inside a field](#inside-a-field) does. `aria-invalid` is not:
ARIA 1.2 supports it on `radiogroup` but on neither `radio` nor `group`, and HTML maps a
`<fieldset>` to `group` — so on the fieldset it is simply ignored, and on the individual
radios it says the wrong thing. A group that must announce itself invalid therefore needs the
`role="radiogroup"` container from [Controlled](#controlled), carrying `aria-invalid="true"`
and `aria-describedby` on that same `div` — the fieldset and its legend are then out of the
picture, and the group's name has to come from `aria-label` or `aria-labelledby` instead.

`required` on a single member is enough to require the whole group.

## Related

[Checkbox](checkbox.md) · `Switch` · `Select` · `Rating` · [Field](field.md) ·
[Label](label.md) · [FieldError](field-error.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
