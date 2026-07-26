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
| `onChange`      | `(hex: string) => void`   | —                |
| `presets`       | `string[]`                | —                |
| `placement`     | `Placement`               | `"bottom-start"` |
| `error`         | `boolean`                 | —                |
| `disabled`      | `boolean`                 | —                |
| `className`     | `string`                  | —                |
| `aria-label`    | `string`                  | `"Choose color"` |
| `ref`           | `Ref<HTMLButtonElement>`  | —                |
| …rest           | props of `<button>`; `value` / `defaultValue` / `onChange` are re-typed above | — |

**Rest props land on the trigger `<button>`.** `id`, `name`, `style`, `data-*`,
`aria-labelledby` and `onBlur` all reach the focusable element that owns the control's node
in the accessibility tree — which is what makes `{...form.field("brandColor")}` bind the
picker. `onChange` is the exception to the spread: it carries the committed canonical
`#rrggbb` string, the same payload as `onValueChange` rather than a `ChangeEvent`, and is
destructured out so it never reaches an element. The component still renders no hidden
input, so a plain `<form>` submits nothing for it — see [Gotchas](#gotchas).

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

Controlled works the way it does everywhere else in this library. `value` makes the committed
hex yours to own, the mode is locked on the first render, and **the panel cannot outrun it**:
the square, the hue rail and the hex field are all derived from the committed hex, so a
handler that ignores a change leaves the whole control — trigger included — showing the value
you are still passing. Wire `onValueChange` back into the same state you pass to `value` — the
`brandColor` / `setBrandColor` pair in the first example is plain `useState`, and every
controlled example below has the same shape.

## How HSV and hex stay in step

The panel edits in HSV and commits in hex, and **the committed hex is the only source of
truth.** The HSV the panel shows is derived from it — with one memory: the last HSV you edited
is kept, and believed *only while it still round-trips to the committed hex*. The moment the
hex moves for any other reason — a controlled prop, a preset click, a parent refusing a commit
— the memory stops matching and the panel re-derives from the hex instead.

That one rule buys both things a naive design has to choose between. Hue is unrecoverable from
`#000000` or `#ffffff`, and the memory is what keeps the rail and the square usable at the
greyscale extremes where a plain round-trip through hex would snap the hue back to red. And
because the memory is never trusted past a hex it does not describe, the panel can never
desynchronise from the value you are actually holding.

Two behaviours fall out of it:

- **Everything commits immediately.** A drag across the square fires `onValueChange` once per
  pointer move that lands on a different hex; each arrow key moves 2% of a full axis and fires
  if that changes the hex. There is no commit-on-release, so debounce anything expensive.
- **At brightness 0 the hue rail moves without committing anything.** Every hue at `v = 0` is
  `#000000`, so dragging the rail there updates the remembered hue — the thumb tracks your
  finger — while the hex it resolves to never changes, and `onValueChange` therefore **does not
  fire** (it used to fire repeatedly with a value equal to the previous one). Since `#000000` is
  also the fallback for an unparseable input, that is a state you can land in by accident: the
  rail responds, the swatch does not. Raise brightness and the remembered hue is still there.

The hex field commits on **Enter or blur**, not per keystroke; its text derives from the
committed hex with your typing as a transient override, so an unparseable entry simply reverts
when the override is dropped — quietly, rather than being reported.

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
eighth of the panel each, more wrap. A preset the normaliser rejects is **not** rendered:
`"rebeccapurple"` would paint a perfectly clickable swatch that could never commit, so it is
dropped from the grid instead.

## Naming the trigger

`aria-label` replaces the button's text in the accessible name, so the component appends the
current hex to whatever you pass: a picker labelled `"Accent color"` showing `#3366cc`
announces as "Accent color #3366cc, button". The value a sighted user reads off the trigger is
the value a screen-reader user hears. Pass `aria-label` to say *what* is being coloured; you do
not need to fold the value in yourself:

<!-- example:NamedWithValue -->
```tsx
<ColorPicker
  aria-label={`Accent color, ${accentColor}`}
  value={accentColor}
  onValueChange={setAccentColor}
/>
```
<!-- /example -->

A visible [Label](label.md) can be wired up too, now that `id` reaches the trigger — but pick
the right attribute. The component always sets `aria-label` (`"Choose color"` plus the hex when
you pass none), and `aria-label` outranks a `<label for>` in the accessible-name computation, so
`htmlFor` plus a matching `id` buys you click-to-focus and nothing else. `aria-labelledby`
outranks `aria-label` in turn, so that is the one to point at the label's `id` when the
visible text should be the name.

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
controls where that wiring is automatic. Both are **merged** with anything you pass rather
than replaced by it: the component's derived values win where it has them, and yours survive
where it does not. The naming is still two strings: the example below keeps the visible
[Label](label.md) and the `aria-label` in sync by hand, because `aria-label` outranks a
`<label for>` — see [Naming the trigger](#naming-the-trigger).

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

The headless `useForm` layer binds through the library's usual idiom:
`<ColorPicker {...form.field("brandColor")} />` drives the picker. `value` and `disabled`
are declared props and are honoured, `onChange` commits the canonical hex back to the store,
and `name`, `onBlur`, `ref` and `aria-invalid` land on the trigger. The value is an ordinary
string, so the bind needs no type annotation.

The same wiring by hand — read the hex off the store, write it back with `setValue` — is
still perfectly good, and is what to reach for when the value needs transforming on its way
in or out. `form` below is `useForm({ defaultValues: { brandColor: "#3366cc" } })`:

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
- **A controlled picker whose handler ignores the change now looks frozen, rather than lying.**
  With `value="#3366cc"` and no write-back, pressing Right Arrow fires `onValueChange` and then
  nothing visible happens: the trigger, the hex field and the square's thumb all derive from
  the committed hex, so they stay where your `value` says. That is the honest failure and it is
  easy to spot. (Before this was fixed the panel kept its own HSV, so the trigger read
  `#3366cc` while the hex field read `#2b61cc` and the thumb had moved — permanently, because
  the effect that re-seeded the panel only ran when the committed hex *changed*.) Always drive
  `value` from the state your `onValueChange` writes.
- **`onValueChange` still fires continuously during a drag.** Every pointer move that lands on
  a different hex commits, so an expensive handler wants debouncing. It no longer fires with an
  *unchanged* value, though: a pointer move inside one rounded hex, and the hue rail at
  brightness 0, both resolve to the hex already held and emit nothing.
- **A non-hex preset is dropped, not rendered.** `presets={["rebeccapurple"]}` paints no
  swatch at all, because the commit path could never accept it. Presets must be hex; check the
  grid if one you expected is missing.
- **The preset grid is always eight columns.** Three presets are three eighth-width
  swatches with five empty cells, not three wide ones.
- **The floating panel is a named `role="dialog"`.** Its name is `panelLabel`, default
  `"Color picker"` — pass your own to translate it.
- **The invalid border survives focus.** `.colorpicker-trigger:focus-visible` is `(0,2,0)`
  against `.colorpicker-trigger--error`'s `(0,1,0)`, so it used to out-rank the error rule
  regardless of order and repaint a focused invalid trigger with the focus colour. A dedicated
  `.colorpicker-trigger--error:focus-visible` rule fixes it — **not** by out-ranking, but by
  tying: it is `(0,2,0)` too, and is declared after, so source order settles it. Focus and
  invalid are now both legible at once — the ring reports focus, the colour reports invalid.
  If you re-declare either rule in your own CSS, order is what you have to get right.
- **`disabled` reaches an already-open panel.** Setting it programmatically while the panel is
  open (from a save that starts in flight, say) leaves the panel up, but everything in it is
  inert: the hex field and hue rail are disabled, the square drops out of the tab order and
  ignores arrow keys, and the preset buttons are disabled.
- **It submits nothing.** There is no hidden input, and `name` lands on the trigger — a
  `<button type="button">`, which the browser never submits — so a plain `<form>` post
  carries no value for it however the control is named. Bind it to a form store instead, or
  mirror the hex into a hidden input of your own. See [In a form](#in-a-form).
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
