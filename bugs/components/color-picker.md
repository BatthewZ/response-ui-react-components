# color-picker — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 285 · ColorPicker — the library's own `form.field()` binding compiles into a dead control (high)

`ColorPickerProps` is a closed object type with no rest spread. A JSX spread of a *call result* is
not excess-property-checked, so `<ColorPicker {...form.field<string>("brandColor")} />` compiles
silently — verified with `tsc --noEmit`, zero diagnostics — while writing the same props as literal
attributes (`onChange`, `name`) is a hard error. At runtime `value` and `disabled` are honoured and
`onChange`, `onBlur`, `name`, `ref` and `aria-invalid` are dropped, so the store never hears about
an edit and the controlled `value` never moves: the picker renders, opens, and can never change.
The failure is invisible in every direction — the compiler is quiet, the component renders, and
nothing warns. `AGENTS.md` and `README.md` both advertise this binding idiom. Same class as #245
(`TagInput`), opposite mechanism: there the spread *replaces* a handler, here it is *swallowed*.
**Fix:** accept the `FieldBindings` surface (`name`/`onChange`/`onBlur`) the way the other
controlled components do, or name `ColorPicker` in `AGENTS.md`'s watch/`setValue` exception list
beside `Checkbox` and `Switch`.

### 286 · ColorPicker — the selected colour is never announced (med)

The trigger's `aria-label` (default `"Choose color"`) overrides its text content in the
accessible-name computation, the `#rrggbb` readout is a plain `<span>` inside the button, and the
swatch is `aria-hidden`. Measured with `<ColorPicker defaultValue="#3366cc" aria-label="Brand color"/>`:
the computed name is exactly `"Brand color"`, and a query for a button named `/3366cc/` finds
nothing. The one thing a sighted user reads off the control is the one thing a screen-reader user
never hears, and the only workaround is for the caller to interpolate the hex into `aria-label`
themselves.
**Fix:** append the committed hex to the computed name, or expose the value node through
`aria-describedby`, instead of letting the label override it.

### 287 · ColorPicker — the saturation/brightness square is a slider with no value (med)

Measured rendered attributes on `.colorpicker-sv`: `role="slider" tabindex="0" aria-label`
`aria-valuetext` — and `aria-valuenow`, `aria-valuemin`, `aria-valuemax` are all **null**. ARIA
requires `aria-valuenow` for `role="slider"`; without it screen readers commonly announce a
valueless slider (often "0"). It also models two independent axes as a single slider, so left/right
and up/down move different quantities under one name. `aria-valuetext` carries the real
information, but only for AT that reads it.
**Fix:** emit `valuenow`/`valuemin`/`valuemax` (saturation as the value), or split into two
labelled sliders inside a named group.

### 288 · ColorPicker — an unparseable preset is clickable and commits nothing (med)

`presets.map` falls back to the raw string when `normalizeHex` returns null, so the swatch renders
and the browser paints whatever CSS understands. Measured with `presets={["rebeccapurple", "#ff0000"]}`:
the first renders `background-color: rebeccapurple`, is labelled `"rebeccapurple"`, and clicking it
produces **zero** `onValueChange` calls, while the hex preset fires normally. There is no warning
and no visual difference — a dead button that looks exactly like a live one.
**Fix:** filter presets through `normalizeHex` at render and drop (or warn on) the failures instead
of falling back to the raw string.

### 289 · ColorPicker — a controlled picker desynchronises permanently (med)

HSV is internal state and moves regardless of whether the parent accepts the commit; the effect
that re-seeds it is keyed on `[hex]`, which by definition never changes when the parent ignores
`onValueChange`. Measured with `<ColorPicker value="#3366cc"/>` and no write-back, two ArrowRights
on the square: the trigger still reads `#3366cc` while the hex field reads `#2b61cc` and the thumb
has moved. Nothing ever reconciles the two, for the life of the component.
**Fix, as applied** (`5295190`, on the gate `d859a02` provided): the effect and `lastHexRef` are
deleted, and three representations became one committed value plus two derivations. The hex field
derives from the committed hex (`hexText = draft ?? hex`, `ColorPicker.tsx:107`); HSV derives from it
too, believing the last edit **only while it still round-trips to that hex** —
`const hsv = hsvToHex(hsvMemory) === hex ? hsvMemory : (hexToHsv(hex) ?? …)` at `:103`. That keeps hue
and saturation alive at the greyscale extremes (where hex cannot carry them) while a hex that moves
for *any* other reason — a controlled prop, a preset, a parent refusing a commit — wins outright, so
the desync this row measured cannot form.
