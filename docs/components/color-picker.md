# ColorPicker

A hex colour field with a real editing surface behind it: a trigger showing the current
swatch and `#rrggbb`, and a floating panel holding a saturation/brightness square, a hue
rail, a text field, and optional preset swatches. Whatever a user types, drags, or clicks,
what leaves the component is always one canonical lowercase `#rrggbb` string.

<!-- example:Minimal -->
```tsx
<ColorPicker
  aria-label="Brand color"
  value={brandColor}
  onValueChange={setBrandColor}
/>
```
<!-- /example -->

| Prop            | Type                      | Default          |
| --------------- | ------------------------- | ---------------- |
| `value`         | `string`                  | —                |
| `defaultValue`  | `string`                  | `"#000000"`      |
| `onValueChange` | `(hex: string) => void`   | —                |
| `presets`       | `string[]`                | —                |
| `placement`     | `Placement`               | `"bottom-start"` |
| `error`         | `boolean`                 | —                |
| `disabled`      | `boolean`                 | —                |
| `className`     | `string`                  | —                |
| `aria-label`    | `string`                  | `"Choose color"` |
| `ref`           | `Ref<HTMLButtonElement>`  | —                |

**That table is the whole API — there is no rest spread.** The type is a closed object
rather than an intersection with `<button>`'s props, so `id`, `name`, `style`, `data-*`,
`aria-labelledby` and `onBlur` are compile errors as written attributes rather than props
that are typed and then quietly dropped. Two consequences worth knowing before you build a
form around it: a [Label](label.md) cannot be wired to the trigger with `htmlFor`, and the
component renders no hidden input, so a plain `<form>` submits nothing for it. A spread is
the hole in that guarantee — see [Gotchas](#gotchas).

`className` lands on the wrapper `<div>`, not the trigger; `ref` lands on the trigger
`<button>`. `Placement` is Floating UI's type — `"top"`, `"right"`, `"bottom"`, `"left"`,
each optionally suffixed `-start` / `-end`.

## Value in, value out

Every string that enters the component goes through the same normaliser, `normalizeHex`
(exported from this package as one of the standalone `color` helpers). It accepts
`#rrggbb` or the `#rgb` shorthand, with or without the leading `#`, in any case, and
returns lowercase `#rrggbb`. **Anything it cannot parse becomes `#000000`** — including
CSS colour names and `rgb()` syntax, which the picker has no notion of. There is no alpha
channel: `#rrggbbaa` is eight characters, so it fails the same parse.

That normalisation is why the value you hand in and the value you get back may differ on
the very first render: `defaultValue="#ABC"` displays as `#aabbcc`.

<!-- example:Uncontrolled -->
```tsx
<ColorPicker aria-label="Highlight color" defaultValue="#ffb300" />
```
<!-- /example -->

Controlled works the way it does everywhere else in this library, with one wrinkle that is
specific to a picker. `value` makes the committed hex yours to own, and the mode is locked
on the first render. But the panel's HSV state is *internal* and moves regardless — so if
your handler ignores a change, the trigger keeps showing the old hex while the square's
thumb and the hex field show the new one, permanently. Wire `onValueChange` back into the
same state you pass to `value` — the `brandColor` / `setBrandColor` pair in the first
example is plain `useState`, and every controlled example below has the same shape.

## Why HSV lives inside

The panel edits in HSV and commits in hex, and it keeps the HSV as its own source of truth
rather than re-deriving it from the committed hex on every change. That is deliberate:
hue is unrecoverable from `#000000` or `#ffffff`, so a round-trip through hex at the
greyscale extremes would reset the hue rail to red and make the square unusable near the
edges. Two behaviours fall out of it:

- **Everything commits immediately.** A drag across the square fires `onValueChange` once
  per pointer move; each arrow key fires once (2% of a full axis per press). There is no
  commit-on-release, so debounce anything expensive.
- **At brightness 0 the hue rail looks broken.** Every hue at `v = 0` is `#000000`, so
  moving it changes the internal hue (it is remembered) while committing the identical
  hex — `onValueChange` fires with a value equal to the previous one. Since `#000000` is
  also the fallback for an unparseable input, that is a state you can land in by accident.
  Raise brightness first.

The hex field commits on **Enter or blur**, not per keystroke; an unparseable entry is
reverted to the current value rather than reported.

## Presets

<!-- example:Presets -->
```tsx
<ColorPicker
  aria-label="Label color"
  value={labelColor}
  onValueChange={setLabelColor}
  presets={[
    "#e53935",
    "#fb8c00",
    "#fdd835",
    "#43a047",
    "#00acc1",
    "#3949ab",
    "#8e24aa",
    "#6d4c41",
  ]}
/>
```
<!-- /example -->

Presets are one-click commits, not a separate value space: each is normalised and compared
to the current hex, and the match gets `aria-pressed="true"` plus a double ring. Because
the grid is a fixed `repeat(8, 1fr)`, eight is exactly one row — fewer still occupy an
eighth of the panel each, more wrap. A preset the normaliser rejects is not skipped: it is
rendered as a swatch (the browser will happily paint `rebeccapurple`) and clicking it
silently does nothing. See [Gotchas](#gotchas).

## Naming the trigger

`aria-label` is the only naming lever, and it **replaces** the visible hex in the
accessibility tree rather than adding to it — the readout is plain text inside the button
and the swatch is `aria-hidden`. A picker showing `#3366cc` announces as "Choose color,
button" unless you say otherwise, so the one thing a sighted user reads off it is the one
thing a screen-reader user never hears. Fold the value into the label:

<!-- example:NamedWithValue -->
```tsx
<ColorPicker
  aria-label={`Accent color, ${accentColor}`}
  value={accentColor}
  onValueChange={setAccentColor}
/>
```
<!-- /example -->

## Placement

<!-- example:Placement -->
```tsx
<ColorPicker
  aria-label="Canvas background"
  defaultValue="#0f172a"
  placement="top-end"
/>
```
<!-- /example -->

Positioning comes from the same `use-floating` wrapper every floating component in the
library shares: an 8px offset, `flip()` onto the opposite side when the preferred one has
no room, `shift({ padding: 8 })` to keep the panel inside the viewport, and `autoUpdate`
to re-anchor on scroll and resize. [Popover](popover.md#placement-and-viewport-edges)
documents the stack in full; the only difference here is that `offset` is not exposed.

## In a form

Inside a [Field](field.md), the trigger picks up `aria-invalid` and `aria-describedby`
from the field's resolved error — ColorPicker calls `useFieldError`, so it is one of the
controls where that wiring is automatic. The label wiring is not: with no `id` prop there
is nothing for [Label](label.md)'s `htmlFor` to point at, so the visible label and the
`aria-label` are two separate strings you keep in sync yourself.

<!-- example:InField -->
```tsx
<Field error="Contrast against white text is below 4.5:1.">
  <Label>Badge color</Label>
  <ColorPicker
    aria-label="Badge color"
    value={badgeColor}
    onValueChange={setBadgeColor}
  />
  <FieldError />
</Field>
```
<!-- /example -->

The headless `useForm` layer is a separate question, and this is the sharp edge of the
page. `form.field()` does **not** bind this control, and nothing tells you so:
`<ColorPicker {...form.field<string>("brandColor")} />` typechecks — a JSX spread is not
excess-property-checked — and then renders a picker that can never change. `value` and
`disabled` are in the prop type and are honoured; `name`, `onChange`, `onBlur`, `ref` and
`aria-invalid` are not, and with no rest spread they are silently dropped, so the store
never hears about an edit and the controlled `value` never moves. Bind it through the
store the way [Checkbox](checkbox.md) and [Switch](switch.md) are bound — `form` below is
`useForm({ defaultValues: { brandColor: "#3366cc" } })`:

<!-- example:InFormStore -->
```tsx
<ColorPicker
  aria-label="Brand color"
  value={form.getValues().brandColor}
  onValueChange={(hex) => form.setValue("brandColor", hex)}
/>
```
<!-- /example -->

Standalone, `error` sets `aria-invalid` and reddens the trigger's border. There is no
[Field](field.md) to describe it, so pair it with your own visible message:

<!-- example:ErrorState -->
```tsx
<ColorPicker aria-label="Chart series color" error defaultValue="#fafafa" />
<p className="text-body-3 text-fg-secondary">
  Series colors need to stay distinguishable on a white background.
</p>
```
<!-- /example -->

<!-- example:Disabled -->
```tsx
<ColorPicker aria-label="Brand color" disabled defaultValue="#3366cc" />
```
<!-- /example -->

## Colour values are not design tokens

This library forbids raw hex in components, and a colour picker looks like the exception
that breaks the rule. It isn't, because two different things are involved.

**The chrome is entirely tokenised.** Trigger, panel, borders, focus rings, radii, shadow
and type all read contract variables — see [Theme tokens](#theme-tokens) — so a picker
re-skins with the rest of the app like any other control.

**The colour content is raw by necessity, and must stay that way.** The swatches are the
user's value, written inline as `style={{ backgroundColor: hex }}`. The square's gradient
is `#000` → transparent over `#fff` → the current hue, and the hue rail is the six sRGB
primaries at fixed stops. The thumbs are outlined in fixed white with a black shadow so
they stay visible over any colour beneath them. None of that is themeable, and none of it
should be: a theme that re-tinted the spectrum would make the control lie about what
colour you are choosing. The one custom property the component writes, `--hue`, is
lowercase on purpose — a component-internal local recomputed from state on every render,
not a contract variable.

The bridge between the two is yours to build: a picked hex — `primary` below, held in
`useState` — becomes part of the design system the moment you write it onto a token.

<!-- example:TintATokenLive -->
```tsx
<div style={{ "--C-PRIMARY": primary } as CSSProperties}>
  <ColorPicker
    aria-label="Primary color"
    value={primary}
    onValueChange={setPrimary}
    presets={["#3366cc", "#0f766e", "#b91c1c", "#7c3aed"]}
  />
  <Button>Save changes</Button>
</div>
```
<!-- /example -->

That works because the CSS package declares its Tailwind theme with `@theme inline`, which
compiles [Button](button.md)'s `bg-primary` to `background-color: var(--C-PRIMARY)` — the
contract variable itself, resolved against whatever is inherited at the element, so a
wrapper override reaches every descendant that reads it. (Without `inline` the utility
would reference `--color-primary`, a copy computed once at `:root`, and the override would
do nothing.) Two caveats: the panel is portalled to `<body>`, so a wrapper-scoped
override does **not** reach the picker's own panel (the general portal caveat that
[Portal](portal.md) documents), and overriding one variable in isolation can break the
[pairings](../theme-contract.md#the-contrast-pairing) the theme defines — `--C-PRIMARY` has
a matching `--C-TEXT-ON-PRIMARY` that does not move with it.

## Theme tokens

`ColorPicker.css` paints everything; the `.tsx` carries no Tailwind utilities at all.
Every value below is a contract variable, so overriding one re-tints every picker in the
app at runtime with no rebuild.

| Where                                            | Override             |
| ------------------------------------------------ | -------------------- |
| Trigger fill, panel fill, hex-field fill          | `--C-SURFACE-0`      |
| Trigger and hex-field border                      | `--C-BORDER-STRONG`  |
| Panel border                                      | `--C-BORDER-DEFAULT` |
| Panel drop shadow                                 | `--SHADOW-LG`        |
| Hex readout and hex-field text                    | `--C-TEXT-PRIMARY`   |
| Focus ring on the trigger, square, rail, hex field, and presets | `--C-BORDER-FOCUS` |
| Trigger border when invalid                       | `--C-STATUS-ERROR`   |
| Disabled trigger fill                             | `--C-SURFACE-3`      |
| Hex readout and hex-field type                    | `--BodyText-2`       |
| Trigger, panel, hex field and large swatch corners | `--RADIUS-MD`       |
| Small swatch, square and preset corners           | `--RADIUS-SM`        |
| Square thumb and hue rail corners                 | `--RADIUS-FULL`      |

The selected preset's ring is drawn from two of those in sequence — a 2px `--C-SURFACE-0`
gap then a 2px `--C-TEXT-PRIMARY` ring — so it stays visible against a preset whose colour
happens to match the panel.

Everything not in that table is fixed geometry or raw colour: the panel's `15rem` width
and `0.75rem` padding, the square's `9rem` height, the swatch sizes, the `z-index: 40`
that puts a picker on the same layer as [Popover](popover.md) and
[DropdownMenu](dropdown-menu.md), and the spectrum itself. None of that spacing sits on
the responsive `r`-scale, so the panel is the same size on a phone as on a desktop while
the type inside it steps up (`--BodyText-2` goes `0.8125rem` → `0.875rem` at 40rem) and
the layout around it reflows.

One pair is worth a contrast check before you ship a theme. The trigger and the hex field
are a `--C-SURFACE-0` fill with a 1px `--C-BORDER-STRONG` border — the same recipe
[Input](input.md) uses — so on a page that is also `--C-SURFACE-0` that border is the only
thing drawing the control. Note that ColorPicker re-implements the recipe in hand-written
CSS rather than sharing the Tailwind class string the text controls use, so retuning it
there does not reach this component.

## Gotchas

- **An unparseable value becomes black, silently.** `defaultValue="rebeccapurple"`,
  `value="rgb(51 102 204)"` and `#ff000080` all render as `#000000` with no warning and no
  callback. Normalise at your own boundary if the source is user data or an API.
- **A controlled picker whose handler ignores the change desynchronises the panel.** With
  `value="#3366cc"` and no write-back, two presses of Right Arrow leave the trigger reading
  `#3366cc` while the hex field reads `#2b61cc` and the thumb has moved. The effect that
  re-seeds the panel only runs when the committed hex *changes*, so nothing ever corrects
  it. Always drive `value` from the state your `onValueChange` writes.
- **`onValueChange` fires continuously, and sometimes with an unchanged value.** Every
  pointer move during a drag commits, and moving the hue rail at brightness 0 commits the
  same `#000000` again — enough to mark a form dirty when nothing changed.
- **A non-hex preset renders but cannot be selected.** `presets={["rebeccapurple"]}` paints
  a purple swatch labelled `rebeccapurple`; clicking it fires no callback and changes
  nothing, because the commit path rejects it. Presets must be hex.
- **The preset grid is always eight columns.** Three presets are three eighth-width
  swatches with five empty cells, not three wide ones.
- **Keyboard focus erases the invalid border.** `.colorpicker-trigger:focus-visible` and
  `.colorpicker-trigger--error` both target one class, but the focus rule adds a
  pseudo-class and therefore wins on specificity regardless of order — tab onto an invalid
  trigger and the red border becomes the focus border. `aria-invalid` and any
  [FieldError](field-error.md) text still carry the state; only the visual cue goes.
- **`disabled` guards the trigger, not an already-open panel.** Setting `disabled`
  programmatically while the panel is open (from a save that starts in flight, say) leaves
  it open: the hex field and hue rail go disabled, but the square still responds to arrow
  keys and the preset buttons still commit. Any click outside would have closed it first,
  which is why this is narrow rather than common.
- **It submits nothing, and `{...form.field()}` compiles into a dead control.** There is no
  hidden input and no `name` prop, so a plain `<form>` carries no value for it; and because
  a JSX spread skips excess-property checking, the library's own binding idiom typechecks
  while dropping `onChange`, `onBlur`, `name`, `ref` and `aria-invalid` on the floor. The
  picker then sits frozen at the store's value with no warning anywhere. Read the value off
  the store and write it back with `setValue`, as [In a form](#in-a-form) shows.
- **Client component.** `"use client"`, and the panel is portalled to `<body>`, so it needs
  a client boundary in an RSC tree and inherits custom properties from the document rather
  than from the JSX ancestor you wrote it inside.
- **Both CSS imports are required.** `.colorpicker-*` lives in this package's `styles`
  entry and reads `--C-*`/`--RADIUS-*`/`--SHADOW-*` from `@batthewz/response-ui-css`.
  Import the foundation first. Without them the panel has no size, and a click on the
  zero-height square commits black.

## Accessibility

The trigger is a real `<button>` with `type="button"`, so it never submits a surrounding
form, and Floating UI's `useRole` gives it `aria-haspopup="dialog"`, `aria-expanded`, and
`aria-controls` while open.

Focus management is deliberately **non-modal**, and measurably so: opening the panel — by
click or by Enter — leaves focus on the trigger. Tab then walks into the panel in DOM
order (square → hue rail → hex field → presets), Shift+Tab from the square returns to the
trigger with the panel still open, Escape closes it and returns focus to the trigger, and
tabbing past the last preset closes it and carries on into the page. Nothing is trapped,
nothing is inert, and there is no scrim — unlike [Dialog](dialog.md), and unlike
[Popover](popover.md), whose focus management *is* modal.

Four gaps to work around, none of which the component will do for you.

- **The current colour is never announced.** `aria-label` overrides the button's text
  content, so the visible `#3366cc` and the swatch (which is `aria-hidden`) are both absent
  from the accessible name. Pass the value in the label yourself — see
  [Naming the trigger](#naming-the-trigger).
- **The panel is an unnamed dialog.** It gets `role="dialog"` and no `aria-label` or
  `aria-labelledby`, and the prop type offers no way to supply one, so it announces as a
  bare "dialog".
- **The square is a slider with no value.** It carries `role="slider"` and a helpful
  `aria-valuetext` ("Saturation 75%, brightness 80%"), but no `aria-valuenow`,
  `aria-valuemin` or `aria-valuemax` — all of which ARIA requires for that role — and it
  models two axes as one slider. Arrow keys move 2% per press; Home, End, Page Up and Page
  Down do nothing.
- **Presets announce as hex strings.** Each is a toggle button named by its normalised
  value, so a screen reader reads "#e53935, toggle button", never "red". If the palette has
  names, they are not reachable through this API.

The hue rail is a native `<input type="range">` labelled "Hue", so the platform supplies
`role="slider"`, `aria-valuenow`, its bounds, and the full arrow/Home/End/Page key set —
it is announced as a bare number from 0 to 360 with no unit.

## Related

[Field](field.md) · [FieldError](field-error.md) · [Label](label.md) ·
[Input](input.md) · [Slider](slider.md) · [Popover](popover.md) · [Portal](portal.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
