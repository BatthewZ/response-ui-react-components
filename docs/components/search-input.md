# SearchInput

A search field with the two affordances people expect and nobody wants to rebuild: a
magnifier glyph inset on the left, and a clear button that appears the moment there is
something to clear — wired to both the mouse and the Escape key. It is a
controlled wrapper around [Input](input.md), so it inherits that field's fill, border and
focus ring, and re-tints from the same theme variables.

<!-- example:Minimal -->
```tsx
<SearchInput value={query} onChange={setQuery} />
```
<!-- /example -->

There is no uncontrolled mode: `value` and `onChange` are both required, and `onChange`
hands you the **string**, not the event.

| Prop          | Type                                                                 | Default       |
| ------------- | -------------------------------------------------------------------- | ------------- |
| `value`       | `string`                                                             | — (required)  |
| `onChange`    | `(value: string) => void`                                            | — (required)  |
| `onClear`     | `() => void`                                                         | —             |
| `size`        | `"sm" \| "md"`                                                       | `"md"`        |
| `placeholder` | `string`                                                             | `"Search..."` |
| `className`   | `string` — lands on the wrapper `<div>`, **not** the `<input>`       | —             |
| `ref`         | `Ref<HTMLInputElement>`                                              | —             |
| …rest         | props of `<input>` minus `value`, `onChange`, `type`, `size`          | —             |

Rest props are spread onto the `<input>` **last**, so `id`, `style`, `data-*`, `aria-*`,
`disabled`, `name` and friends all reach it — and `aria-label` and `role` override the ones
the component sets. `onKeyDown` is the exception: it is pulled out of the rest and called
*after* SearchInput's own Escape handling, never instead of it. `type` is omitted from the
props, so the input is always `type="search"`.

The `error` prop of [Input](input.md) is **not** in this type; the only route to the
invalid styling is a [Field](field.md) — see [Inside a Field](#inside-a-field). Several
sharper edges are worth reading before you ship it — `disabled` does not reach the clear
button, `className` and `style` land on different elements, and the accessible name is a
hard-coded literal. See [Gotchas](#gotchas).

## Name it

The component hard-codes `aria-label="Search"`, and an `aria-label` beats an associated
`<label>` in the accessible-name computation. So a visible [Label](label.md) wired with
`htmlFor` is **silently ignored** — the field still announces as "Search". Point
`aria-labelledby` at the label's `id` (or pass your own `aria-label`) to fix it:

<!-- example:AccessibleName -->
```tsx
<Label id="orders-search-label" htmlFor="orders-search">
  Search orders
</Label>
<SearchInput
  id="orders-search"
  aria-labelledby="orders-search-label"
  value={query}
  onChange={setQuery}
  placeholder="Order number, customer, or SKU"
/>
```
<!-- /example -->

## Size

<!-- example:Sizes -->
```tsx
<SearchInput value={query} onChange={setQuery} />
<SearchInput size="sm" value={query} onChange={setQuery} />
```
<!-- /example -->

`sm` does three things: it steps the type down one scale step, narrows the icon gutters
from `2.25rem` to `2rem` on both sides, and shrinks both glyphs from 16px to 14px. It does
**not** change the control's height — the vertical padding and the line-height are the same
at both sizes, so `sm` and `md` sit at the same height in a row of inputs.

## Width

<!-- example:ConstrainWidth -->
```tsx
<SearchInput
  className="max-w-sm"
  value={query}
  onChange={setQuery}
  aria-label="Search the docs"
/>
```
<!-- /example -->

The wrapper is `display: inline-flex` at `width: 100%`, so by default the field fills its
container. Because `className` lands on that wrapper, that is where you cap it — and it is
the right place anyway: the input beneath is `width: 100%` from `SearchInput.css`, so it
just fills whatever the wrapper allows.

## Filtering

SearchInput holds nothing and filters nothing; it is a text box with two buttons' worth of
chrome. Every keystroke calls `onChange` with the current string, so debouncing, remote
queries, and the results list are all yours:

<!-- example:FilterAList -->
```tsx
<SearchInput
  value={query}
  onChange={setQuery}
  placeholder="Filter contributors…"
  aria-label="Filter contributors"
/>
<ul className="text-body-2 text-fg-secondary">
  {["Ada Lovelace", "Grace Hopper", "Katherine Johnson", "Margaret Hamilton"]
    .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
    .map((name) => (
      <li key={name}>{name}</li>
    ))}
</ul>
```
<!-- /example -->

## Reacting to a clear

Both clear paths — the button and Escape — run the same handler: `onChange("")`
first, then `onClear?.()`. So `onClear` is not "the new value is empty" (`onChange` already
told you that); it is "the user deliberately reset the search", which is where you drop
filters, cancel an in-flight request, or go back to page 1:

<!-- example:ClearCallback -->
```tsx
<SearchInput
  value={query}
  onChange={setQuery}
  onClear={() => setPage(1)}
  aria-label="Search contributors"
/>
<p className="text-body-3 text-fg-muted">Page {page}</p>
```
<!-- /example -->

## Inside a Field

SearchInput renders an [Input](input.md), and it is that inner field which calls the field-error
hook — so the wiring reaches the `<input>` transitively. Inside an errored
[Field](field.md) the input gets `aria-invalid="true"`, an `aria-describedby` pointing at
the [FieldError](field-error.md), and the error-coloured border and focus ring:

<!-- example:InField -->
```tsx
<Field error="Unclosed quote in the query.">
  <Label htmlFor="log-search">Filter log lines</Label>
  <SearchInput
    id="log-search"
    aria-label="Filter log lines"
    value={query}
    onChange={setQuery}
  />
  <FieldError />
</Field>
```
<!-- /example -->

Note the icon and the clear button are **not** part of that: they keep their normal muted
ink in an invalid field, so the only visual error signal is the input's own border.

## Theme tokens

Two layers paint this component. `SearchInput.css` owns the icon and the clear button and
reads its contract variables directly; the field underneath is the [Input](input.md) SearchInput
renders, styled entirely with Tailwind utilities.

**The chrome — `SearchInput.css`, read directly:**

| Where                              | Override                                        |
| ---------------------------------- | ----------------------------------------------- |
| Search icon                        | `--C-TEXT-MUTED`                                 |
| Clear button glyph, at rest        | `--C-TEXT-MUTED`                                 |
| Clear button on hover — ink · wash | `--C-TEXT-PRIMARY` · `--C-SURFACE-2`             |
| Clear button corners               | `--RADIUS-SM`                                    |
| Clear button focus outline         | `--C-BORDER-FOCUS`                               |
| Clear button transition            | `--MOTION-DURATION-ENTER` · `--MOTION-EASE-ENTER` |
| Type at `size="sm"`                | `--BodyText-3`                                   |

**The field — utilities inherited from [Input](input.md):**

| Where                | Utility                                               | Override                          |
| -------------------- | ----------------------------------------------------- | --------------------------------- |
| Text                 | `text-body-2` `text-fg-primary`                       | `--BodyText-2` `--C-TEXT-PRIMARY` |
| Placeholder          | `placeholder:text-fg-muted`                           | `--C-TEXT-MUTED`                  |
| Fill                 | `bg-surface-0`                                        | `--C-SURFACE-0`                   |
| Disabled fill        | `disabled:bg-surface-3`                               | `--C-SURFACE-3`                   |
| Border               | `border-border-strong`                                | `--C-BORDER-STRONG`               |
| Focus ring & border  | `focus:ring-border-focus` `focus:border-border-focus` | `--C-BORDER-FOCUS` |
| Invalid border & ring | `border-status-error` `focus:ring-status-error` | `--C-STATUS-ERROR`             |
| Vertical padding     | `py-r5`                                               | `--R-SIZE-5`                      |
| Corner radius        | `rounded-md`                                          | `--RADIUS-MD`                     |
| Transition           | `duration-fast`                                       | `--DURATION-FAST`                 |

[Input's own table](input.md#theme-tokens) lists one more row that SearchInput cancels:
that component sets its horizontal padding with `px-r4`, but `SearchInput.css` overrides
it with literal `2.25rem` gutters (`2rem` at `size="sm"`) to make room for the icon and
the clear button. Tailwind's utilities compile into `@layer utilities` while the component
CSS is unlayered, so the literals win regardless of import order. The consequence:
overriding `--R-SIZE-4` re-pads a plain [Input](input.md) and steps it up at the 40rem
breakpoint, but leaves a SearchInput's gutters fixed at every viewport. The `sm` type step
is partial in the same way — `--BodyText-3` replaces the font size, but the line box still
comes from `--BodyText-2-line-height` via the untouched `text-body-2`, which is why the
two sizes are the same height.

Every colour, radius and timing above is a variable, so overriding one re-tints the
component at runtime with no rebuild. The geometry is not on the contract, though: the
gutters, the icon's `0.75rem` inset, the clear button's `1.5rem` square and its `0.5rem`
offset, and the 16px/14px glyph sizes are all literals, hard-coded so the two affordances
stay clear of the text at any theme. The clear button's transition is suppressed entirely
under `prefers-reduced-motion: reduce`.

## Gotchas

- **`disabled` doesn't reach the clear button.** `disabled` is spread onto the `<input>`
  only; the clear `<button>` is rendered unconditionally whenever `value` is non-empty and
  is never disabled. A disabled SearchInput showing "oklch" still renders an enabled X, and
  clicking it fires `onChange("")` and `onClear()` — the value a disabled field was meant to
  protect is one click away. `readOnly` is the same, and Escape clears a `readOnly` field too.
- **`className` and `style` land on different elements.** The type is `<input>`'s, but
  `className` is destructured out and applied to the wrapper `<div>` while `style` goes to
  the input with the rest of the props. So `className="px-8"` will not repad the field, and
  a `style` width sizes the input inside a wrapper that is still `width: 100%`.
- **Escape clears *and* keeps going.** The Escape handler calls neither `preventDefault()`
  nor `stopPropagation()`, so the event bubbles with `defaultPrevented === false`. Inside a
  [Dialog](dialog.md) — a native `<dialog>` that closes on the browser's Escape close request
  — one press both empties the search box and closes the dialog. If you want the first
  Escape to only clear, stop it yourself in your own `onKeyDown`.
- **Escape clears an already-empty field.** There is no guard on `value`, so pressing Escape
  in an empty box still calls `onChange("")` and `onClear()`. If `onClear` resets pagination
  or refetches, it will do so on every stray Escape.
- **The clear button vanishes under your focus.** It only renders while `value` is truthy,
  so activating it unmounts it: focus falls back to `<body>`, and the next Tab
  restarts from the top of the document instead of continuing after the field.
- **`defaultValue` compiles but is wrong.** It survives the `Omit`, so `<SearchInput value=…
  defaultValue=… />` typechecks and then trips React's controlled/uncontrolled warning at
  runtime. There is no uncontrolled mode; drop it.
- **Client component.** `SearchInput.tsx` carries `"use client"`, so importing it opts its
  module into the client bundle — which it needs, because the [Input](input.md) it renders
  reads the [Field](field.md) context and ships no directive of its own. The directive
  makes the pair safe to *import* from a Server Component; a required function prop
  (`onChange`) still cannot cross that boundary, so in practice the call site is a client
  component anyway.

## Accessibility

The field is a native `<input type="search">` that also carries an explicit
`role="searchbox"` — redundant, since that is already the implicit role, but harmless. Both
are set *before* the rest spread, so a caller can override `role` and `aria-label`. Both
glyphs end up `aria-hidden` — the magnifier explicitly, the X from lucide's own default for
a childless icon — and the browser's built-in `type="search"` clear affordances
(`::-webkit-search-cancel-button`, `::-ms-clear`) are zeroed out in CSS, so only one X is
ever visible.

- **Its name is the string `"Search"`, in English, for every instance.** Because `aria-label`
  outranks a `<label for>` in the name computation, wiring a visible [Label](label.md) does not change
  it — the field still announces "Search". Pass `aria-labelledby` (which outranks `aria-label`)
  or your own `aria-label`. This also means a page with two SearchInputs has two identically
  named searchboxes until you name them.
- **The clear button is a real button.** `<button type="button" aria-label="Clear search">` —
  it is in the tab order after the input, activates on Enter and Space,
  and cannot submit an enclosing form. Its `:focus-visible` state is a 2px `--C-BORDER-FOCUS`
  outline at 1px offset.
- **…but it drops focus when used.** See [Gotchas](#gotchas): the button unmounts on
  activation and focus resets to the document body, which is a WCAG 2.4.3 focus-order
  problem for keyboard users. Move focus back to the input yourself with a `ref` if that
  matters.
- **The X glyph is below the graphical-contrast floor.** At rest it is `--C-TEXT-MUTED` on
  the field's `--C-SURFACE-0` fill, which measures 2.54:1 in the default theme, 2.45:1 in
  `events`, 2.59:1 in `grimdark` and 2.10:1 in `tech` — all under the 3:1 WCAG 1.4.11
  minimum for a control's essential graphic. It only reaches `--C-TEXT-PRIMARY` on
  **hover** — keyboard focus adds the outline but does not change the ink — and the hover
  wash (`--C-SURFACE-2` on `--C-SURFACE-0`) measures 1.10:1 in the default theme, so the
  wash contributes nothing either. Override `--C-TEXT-MUTED`, or restyle
  `.search-input__clear`, if the button has to be seen.
- **Nothing is announced.** There is no live region: typing, filtering, and clearing produce
  no announcement. If results change underneath, own an `aria-live` region yourself.
- **There is no `search` landmark.** The wrapper is a plain `<div>`. Wrap it in `<search>`
  or a `<form role="search">` if you want it to show up in landmark navigation.
- **Error styling is border-only.** In an invalid [Field](field.md) the input reddens and
  sets `aria-invalid`, but colour is the only visual signal on the control itself — render a
  [FieldError](field-error.md) so the reason is readable.

## Related

[Input](input.md) · [Field](field.md) · [Label](label.md) ·
[FieldError](field-error.md) · [Combobox](combobox.md) · [TagInput](tag-input.md) · [CommandPalette](command-palette.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
