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
| `classNames`    | ten keys — see [Slots](#slots) | —           |
| `aria-label`    | `string`                  | `"Choose color"` |
| `panelLabel`    | `string`                  | `"Color picker"` |
| `areaLabel`     | `string`                  | `"Saturation and brightness"` |
| `saturationLabel` | `string`                | `"Saturation"`   |
| `brightnessLabel` | `string`                | `"Brightness"`   |
| `hueLabel`      | `string`                  | `"Hue"`          |
| `hexLabel`      | `string`                  | `"Hex value"`    |
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
`<button>`. Every other element — the trigger included — is reached through `classNames`, see
[Slots](#slots). `Placement` is Floating UI's type — `"top"`, `"right"`, `"bottom"`, `"left"`,
each optionally suffixed `-start` / `-end`.

The six `*Label` props are the panel's whole vocabulary, and they are **accessible names, not
visible text** — the panel shows no words at all. Pass them to translate the control; `""` does
not remove a name, it leaves that control unnamed, so pass a real string or leave the default.

<!-- example:Translated -->
```tsx
<ColorPicker
  aria-label="Couleur de la marque"
  defaultValue="#3366cc"
  panelLabel="Sélecteur de couleur"
  areaLabel="Saturation et luminosité"
  saturationLabel="Saturation"
  brightnessLabel="Luminosité"
  hueLabel="Teinte"
  hexLabel="Valeur hexadécimale"
/>
```
<!-- /example -->

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
  pointer move that lands on a different hex; each arrow key moves its axis by one percentage
  point and fires if that changes the hex. There is no commit-on-release, so debounce anything
  expensive.
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
  aria-label="Accent color"
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

## Slots

`className` addresses the wrapper. `classNames` addresses the trigger and the nine parts of
the floating panel — class strings only, and the keys are typed, so a misspelled one is a
compile error rather than a prop that does nothing.

| Slot      | Element                            | What it addresses                            |
| --------- | ---------------------------------- | -------------------------------------------- |
| `trigger` | `button.colorpicker-trigger`       | the closed control, error modifier included   |
| `swatch`  | both `.colorpicker-swatch`         | the trigger's chip **and** the panel's large one |
| `value`   | `span.colorpicker-trigger__value`  | the hex text on the trigger                   |
| `panel`   | `div.colorpicker-panel`            | the floating surface                          |
| `plane`   | `div.colorpicker-sv`               | the saturation/brightness square              |
| `thumb`   | `span.colorpicker-sv__thumb`       | the handle on that square                     |
| `hue`     | `input.colorpicker-hue`            | the hue rail                                  |
| `hex`     | `input.colorpicker-hex`            | the hex text field                            |
| `presets` | `div.colorpicker-presets`          | the preset row, rendered only with `presets`  |
| `preset`  | every `button.colorpicker-preset`  | all preset buttons — they are generated from `presets`, so no key names one |

```tsx
<ColorPicker
  defaultValue="#3366cc"
  presets={["#e11d48", "#2563eb"]}
  classNames={{ panel: "w-72", preset: "rounded-none" }}
/>
```

**The panel's position is written as an inline `style`,** so a positioning utility in
`classNames.panel` is silently dead — pass `placement` instead.

**Three internals take no class from the call site, deliberately.** The two axis `<input
type="range">` elements carry the visually-hidden clip that lets each axis be named and
arrow-key operable without painting a second control over the square; un-hiding them is the
arrangement the class exists to prevent. And the hex row is the fixed two-child layout the
panel is built from — reflowing it does not produce a different picker, and `classNames.panel`
is the surface a caller actually restyles.

## Theme tokens

Almost everything the picker paints is a Tailwind utility in `ColorPicker.tsx`, each
resolving to a contract variable — including the trigger's and the hex field's focus
affordances, which are the shared `src/util/focus.ts` recipes (`focusRingButton` on the
trigger, `focusRingControl` on the hex field), so a single edit there reaches this control
the way it reaches [Button](button.md) and [Input](input.md). Overriding a variable re-tints
every picker in the app at runtime with no rebuild, and because the utilities sit in
`@layer utilities`, a `className` of your own beats every one of them.

| Where                                 | Utility                                                                | Override             |
| ------------------------------------- | ---------------------------------------------------------------------- | -------------------- |
| Trigger, panel, hex-field and swatch-ring fill | `bg-surface-0`                                                | `--C-SURFACE-0`      |
| Trigger and hex-field border          | `border` `border-border-strong`                                        | `--C-BORDER-STRONG`  |
| Panel border                          | `border-border-default`                                                | `--C-BORDER-DEFAULT` |
| Panel drop shadow                     | `shadow-lg`                                                            | `--SHADOW-LG`        |
| Hex readout and hex-field text        | `text-fg-primary`                                                      | `--C-TEXT-PRIMARY`   |
| Focus ring on the square and presets  | `focus-within:outline-border-focus` `focus-visible:outline-border-focus` | `--C-BORDER-FOCUS` |
| Focus ring on the trigger             | `focus-visible:ring-border-focus`                                      | `--C-BORDER-FOCUS`   |
| Focus ring and border on the hex field | `focus:ring-border-focus` `focus:border-border-focus`                 | `--C-BORDER-FOCUS`   |
| Trigger border when invalid           | `border-status-error`                                                  | `--C-STATUS-ERROR`   |
| Disabled trigger fill                 | `bg-surface-3`                                                         | `--C-SURFACE-3`      |
| Hex readout and hex-field type        | `text-body-2`                                                          | `--BodyText-2`       |
| Trigger, panel, hex field and large swatch corners | `rounded-md`                                              | `--RADIUS-MD`        |
| Small swatch, square and preset corners | `rounded-sm`                                                         | `--RADIUS-SM`        |
| Square thumb corners                  | `rounded-full`                                                         | `--RADIUS-FULL`      |

The hue rail is the one part still written in `ColorPicker.css`, and the file says why: its
thumb is a UA pseudo-element, so neither its `-webkit-appearance: none` nor its focus
`box-shadow` — the rail's only focus affordance — can move to a utility safely. It reads
`--C-BORDER-FOCUS` and `--RADIUS-FULL` directly.

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
thing drawing the control.

**In forced-colours mode the hex field's outline reset stands down and the browser's own
outline stays.** The reset is `not-forced-colors:focus:outline-none`. It has to be: the ring is a
`box-shadow`, which forced colours forces to `none`, so an unqualified reset would leave the
field with no focus indicator at all in exactly the mode where indicators matter most
(WCAG 2.4.7). This is new — the field previously had no forced-colours affordance.

Two details of that split are worth knowing if you restyle the component. The hex field's
**border** is written as a utility (`border border-border-strong`) rather than a rule in
`ColorPicker.css`, so that one property has one writer and `focusRingControl`'s
`focus:border-border-focus` can swap it. It moved there when this package's stylesheets were
unlayered and out-ranked every utility; that reason expired when they moved into
`@layer components`, and the arrangement is still the right one. And the trigger, being a
`<button>`, takes the **button** recipe: it rings on `:focus-visible` only (so a mouse press
does not ring it) and the recipe never repaints a border, which is what leaves the invalid
border standing while the control is focused.

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
- **A positioning utility in `classNames.panel` is silently dead.** The panel's coordinates
  are an inline `style` written by Floating UI, and an inline style beats a class, so
  `top-0` or `left-r5` lands in the DOM, changes nothing and reports no error. Move the panel
  with [`placement`](#placement); [Slots](#slots) has what `panel` does reach.
- **The floating panel is a named `role="dialog"`.** Its name is `panelLabel`, default
  `"Color picker"` — pass your own to translate it, along with the five `*Label` props that
  name what is inside it.
- **Opening the panel no longer moves focus into it.** Focus stays on the trigger and one Tab
  reaches the saturation slider. It used to land on that slider directly, which made the first
  arrow press commit a colour. See [Accessibility](#accessibility).
- **The invalid border survives focus, and no longer by a tie-break.** The trigger's ring is
  `focusRingButton`, which paints a ring and never touches `border-color`, so
  `.colorpicker-trigger--error`'s red border is simply never contested: measured focused and
  invalid, the border is `--C-STATUS-ERROR` and the ring is `--C-BORDER-FOCUS`. (Previously two
  hand-written `:focus-visible` rules settled it on source order, and the ring went red along
  with the border.) Re-declare a focus border in your own CSS and you are back to owning that
  ordering yourself.
- **`disabled` reaches an already-open panel.** Setting it programmatically while the panel is
  open (from a save that starts in flight, say) leaves the panel up, but everything in it is
  inert: the hex field, the hue rail and both saturation/brightness sliders are `disabled`
  (so they leave the tab order and the browser's key model stops moving them), the square
  ignores pointer presses, and the preset buttons are disabled.
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

Focus management is deliberately **non-modal**: nothing is trapped, nothing is inert, and
there is no scrim — unlike [Dialog](dialog.md), and unlike [Popover](popover.md), whose focus
management *is* modal.

**Opening the panel leaves focus on the trigger.** Tab then walks into the panel in DOM order —
saturation → brightness → hue rail → hex field → presets — Shift+Tab from the saturation slider
returns to the trigger with the panel still open, Escape closes it and returns focus to the
trigger, and tabbing past the last preset closes it and carries on into the page. (Measured in
Firefox 146: after opening, `document.activeElement` is the trigger; one Tab reaches the
Saturation slider; Escape closes the panel and focus is back on the trigger.)

This **changed**. The panel used to focus its first tabbable control on open, which since the
square became two range inputs meant the **Saturation** slider — so the first arrow key a user
pressed committed a colour change they had not asked for. [DatePicker](date-picker.md) and
[DateRangePicker](date-range-picker.md) had always suppressed that initial move; ColorPicker was
the outlier, and now matches them. If you were relying on the old behaviour, move focus yourself
from a handler on the trigger.

### The saturation/brightness area is two sliders

The square is a `role="group"` named by `areaLabel` (default "Saturation and brightness"),
holding one visually hidden `<input type="range">` per axis, named by `saturationLabel` and
`brightnessLabel`, each 0–100 with `aria-valuetext` in percent. That is the only shape in which each axis gets its own accessible
name, `aria-valuenow` and bounds — a single `role="slider"` can carry exactly one value, and
this one used to carry none at all, which is what ARIA requires for the role.

The consequence worth knowing is the **keyboard model, which is the platform's, not ours**.
Whichever axis holds focus:

| Key                  | Effect on the focused axis |
| -------------------- | -------------------------- |
| ← → ↑ ↓              | ±1 percentage point        |
| Page Up / Page Down  | ±10 percentage points      |
| Home / End           | 0 / 100                    |

All four arrows move the **focused** axis, the way they do on any `<input type="range">`; the
other axis does not move. Switching axis is a Tab press, not an arrow. (Verified in Firefox:
jsdom implements no key model for a range input at all, so no test in this package can assert
it.)

The visible thumb is `aria-hidden` decoration, and dragging the square commits both axes at
once — a press also moves focus onto the saturation slider, so the keyboard picks up where the
pointer left off. A drag can land between two whole percentages: the sliders report the
rounded value, and the next arrow press steps from there.

The focus ring belongs to the square, not to the input that actually holds focus: the inputs
are clipped to a pixel, so `.colorpicker-sv:focus-within` paints a 2px `--C-BORDER-FOCUS`
outline with a 2px offset around the whole area. The offset is load-bearing rather than
decorative here — the square paints an arbitrary colour of the user's choosing, and the gap is
what keeps the ring legible when that colour is close to the focus colour.

### Remaining gaps

One, which the component will not do for you. (Two others are closed: hard-coded English
inside the panel — every name in there is now a prop, listed in the table at the top — and
a current colour missing from the trigger's name, which now appends the committed hex to
whatever `aria-label` you pass. See [Naming the trigger](#naming-the-trigger).)

- **Presets announce as hex strings.** Each is a toggle button named by its normalised
  value, so a screen reader reads "#e53935, toggle button", never "red". If the palette has
  names, they are not reachable through this API.
The hue rail is a native `<input type="range">` labelled by `hueLabel`, so the platform supplies
`role="slider"`, `aria-valuenow`, its bounds, and the same key set — it is announced as a bare
number from 0 to 360 with no unit.

The panel is a named `role="dialog"`: its name is `panelLabel`, default `"Color picker"`.

## Related

[Field](field.md) · [FieldError](field-error.md) · [Label](label.md) ·
[Input](input.md) · [Slider](slider.md) · [Popover](popover.md) · [Portal](portal.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
