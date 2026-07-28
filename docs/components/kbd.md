# Kbd

A keycap — the real `<kbd>` element, pre-styled from theme tokens — for naming a key in
prose or pinning a shortcut to the right edge of a menu row.

<!-- example:Minimal -->
```tsx
<p>
  Press <Kbd>Esc</Kbd> to close the dialog.
</p>
```
<!-- /example -->

| Prop        | Type               | Default |
| ----------- | ------------------ | ------- |
| `children`  | `ReactNode`        | —       |
| `className` | `string`           | —       |
| `ref`       | `Ref<HTMLElement>` | —       |
| …rest       | props of `kbd`     | —       |

That is the whole surface: `KbdProps` is exactly `ComponentPropsWithRef<"kbd">`, so Kbd
adds no prop of its own. There is no `variant`, no `size`, and no `as` — the element is
always `<kbd>`, and everything you would otherwise tune is either a theme variable (see
[Theme tokens](#theme-tokens)) or a `className` away (see [Restyling](#restyling)).

## Chords and sequences

Kbd caps **one** key. It does no parsing — it renders the `children` you hand it, so it
will not split `"Cmd+K"` into two caps or swap `Ctrl` for `⌘` on a Mac. A chord is two
elements with a separator between them, and a sequence is the same shape with a word
instead of a plus:

<!-- example:Combinations -->
```tsx
<div className="flex flex-col gap-r5">
  <p>
    Open the command palette with <Kbd>⌘</Kbd> + <Kbd>K</Kbd>.
  </p>
  <p>
    Press <Kbd>G</Kbd> then <Kbd>I</Kbd> to jump to your issues.
  </p>
</div>
```
<!-- /example -->

The separator sits **outside** the caps on purpose — it is prose, not a key, so it reads
correctly whether it is spoken or seen.

## Key widths

A cap is `inline-flex` with centred content, a `1.5em` min-width floor, and one padding
rung on all four sides. The floor is what stops a narrow glyph from producing a visibly
thinner cap than its neighbours, while word-length keys simply grow:

<!-- example:KeyWidths -->
```tsx
<div className="flex items-center gap-r5">
  <Kbd>I</Kbd>
  <Kbd>W</Kbd>
  <Kbd>1</Kbd>
  <Kbd>Shift</Kbd>
  <Kbd>Enter</Kbd>
</div>
```
<!-- /example -->

## In a menu row

The other common shape is a list row with the shortcut pushed to the trailing edge —
what [CommandPalette](command-palette.md) does with each item's `shortcut`, wrapping the whole combination
in a single cap rather than one cap per key:

<!-- example:ShortcutRow -->
```tsx
<div className="flex flex-col gap-r5">
  <div className="flex items-center justify-between gap-r4">
    <span>Save changes</span>
    <Kbd>⌘ S</Kbd>
  </div>
  <div className="flex items-center justify-between gap-r4">
    <span>Toggle sidebar</span>
    <Kbd>⌘ B</Kbd>
  </div>
</div>
```
<!-- /example -->

Both readings are valid. One cap per key looks like a keyboard; one cap per shortcut
reads as a single label and stays compact in a dense list.

## Restyling

`className` is merged with `cn` (tailwind-merge), so a utility that conflicts with one of
Kbd's defaults **replaces** it rather than racing it in the cascade — no `!important`, no
specificity games. The one exception is the typeface: see [Gotchas](#gotchas).

<!-- example:Restyled -->
```tsx
<p>
  Hold <Kbd className="bg-surface-3 text-fg-primary">Alt</Kbd> to drag a copy.
</p>
```
<!-- /example -->

Prefer this for a one-off. There is no keycap-scoped knob: every variable in the table below
is a global contract token that other components read too, so changing one at `:root`
restyles the whole app, not just the keys. If you want a second keycap look, wrap Kbd — see
[Extending components](../extending.md).

## Theme tokens

Kbd has no stylesheet — there is no `Kbd.css`. Every rule is a class on the single `<kbd>`
element: Tailwind utilities, plus one plain class from the css package for the typeface.
Each one below resolves to a contract variable, so overriding the variable re-tints every
keycap in the app at runtime with no rebuild.

| Where            | Utility                 | Override             |
| ---------------- | ----------------------- | -------------------- |
| Cap fill         | `bg-surface-2`          | `--C-SURFACE-2`      |
| Cap edge         | `border-border-default` | `--C-BORDER-DEFAULT` |
| Label ink        | `text-fg-secondary`     | `--C-TEXT-SECONDARY` |
| Label type scale | `text-body-3`           | `--BodyText-3`       |
| Label weight     | `font-semibold`         | `--Semibold-Weight`  |
| Corners          | `rounded-sm`            | `--RADIUS-SM`        |
| Padding          | `p-r6`                  | `--R-SIZE-6`         |

The keycap's typeface is on the contract too, by a route the table cannot show: `mono-font`
is a plain class `@batthewz/response-ui-css` ships, not a Tailwind utility, and it sets
`font-family: var(--DEFAULT-MONO-FONT)` — the same variable [CodeBlock](code-block.md)
reads, and the one each worked example redefines. It is there because Tailwind's Preflight
styles bare `kbd` with its *own* default mono stack, which a themed keycap has to beat; see
[Gotchas](#gotchas) for the one thing that costs you.

Three of Kbd's other utilities sit **off** the contract:

- **`leading-none`** names no variable because its job is to stop one applying.
  `text-body-3` emits `--BodyText-3` *and* `--BodyText-3-line-height`, and the second half
  is a paragraph leading rather than a cap height — themes set it anywhere from `1.125rem`
  (`tech`) to `1.75rem` (the default scale), which made the same keycap 30px tall in one
  theme and 18px in another. With it reset, the cap is the glyph plus `p-r6` plus the 1px
  border, in any theme.
- **`min-w-[1.5em]`** names no variable because it does not need one: `em` resolves against
  the cap's own font size, so the floor already tracks `--BodyText-3` through the theme.
- **`border`** is a plain 1px Tailwind width utility; only the border's *colour* is on the
  contract. Widen it with `border-2` via `className` — it will not move with the responsive
  `r`-scale, which is correct for a hairline edge.

`--R-SIZE-6` is the one rung of the responsive `r`-scale that holds at `0.25rem` on both
sides of the 40rem breakpoint, so the cap's padding is the same on mobile and desktop even
though the rest of the scale steps up. `--BodyText-3` does step up
(`0.75rem` → `0.8125rem`), so the cap grows with its label and nothing else.

`font-semibold` does not mean 600 here: it reads `--Semibold-Weight`, which the default
scale sets to **500** below 40rem and **600** at and above it, and which a theme can pin
outright — each worked example does (`tech` 500, `events` 600, `grimdark` 700).

## Gotchas

- **The cap's height is its padding, not the theme's leading.** `leading-none` holds the
  line box to the glyph, so the cap is the label plus `p-r6` plus the 1px border on each
  edge — the same proportion in any theme. If you need a fixed cap, pin it with an `h-*`
  utility in `className`; for a looser one, your own `leading-*` replaces this one.
- **`mono-font` is the one default a `className` cannot beat.** `.mono-font` is *unlayered*
  CSS from `@batthewz/response-ui-css`, and unlayered author rules outrank every Tailwind
  utility whatever the merge does — so `<Kbd className="font-sans">` keeps the mono face
  (measured), while every other utility in `className` replaces its default as documented in
  [Restyling](#restyling). To change the keycap's family, retheme `--DEFAULT-MONO-FONT`, or
  set `font-family` in a style attribute or your own rule.
- **No props of its own, by design.** No `variant`, `size`, or `as`. If you want a second
  look, wrap it — see [Extending components](../extending.md) — rather than waiting for a
  prop.
- **`KbdProps` is not exported.** The barrel exports only the `Kbd` value. The type is
  nothing more than `ComponentPropsWithRef<"kbd">`, so a wrapper can spell it out directly
  instead of importing it.
- **No per-component CSS, yet both package CSS imports are still required.** Kbd is pure
  utilities, and `@batthewz/response-ui-react-components/styles` is what registers
  `@source "../src/**/*.{ts,tsx}"` with Tailwind — that registration is what makes your
  build emit Kbd's classes at all. The css package declares no `@source` for this package.
- **Server-renderable.** No `"use client"`, so it drops straight into an RSC tree.

## Accessibility

Kbd renders the semantic `<kbd>` element rather than a styled `<span>`, so the "this is
user input" meaning and the keycap look come from the same tag. It is presentational
otherwise: nothing focusable, no `role`, no `aria-*` and no keyboard handling of its own.
Anything you do pass — `aria-hidden`, `id`, `title` — lands on the `<kbd>` through rest
props.

- **Symbol-only caps carry no text alternative.** `⌘`, `⌥`, and `⇧` are the whole
  announcement, and screen-reader support for naming those characters varies. `aria-label`
  is not a dependable patch here — `<kbd>` has no implicit ARIA role, and labels on roleless
  elements are inconsistently exposed. Spell the modifier (`Cmd`), or pair the glyph with
  text the reader can hear.
- **The label ink is deliberately de-emphasised.** `--C-TEXT-SECONDARY` on `--C-SURFACE-2`
  is the contract's secondary-on-surface pairing, not its highest-contrast one, and it is
  set at the smallest type step. Keep a keycap supplementary to a sentence that already
  says what the key does, rather than the only place the shortcut appears.
- **Keep a chord's separator as real text.** Because Kbd caps one key at a time, the `+` or
  `then` between caps is your markup, not the component's. As a text node (the shape used in
  [Chords and sequences](#chords-and-sequences)) it is document content: it is in the
  accessibility tree, it comes along when someone selects and copies the shortcut, and it is
  still there if the stylesheet is disabled or has not loaded. A CSS `::before` buys none of
  that reliably — Chrome, Firefox and Safari do expose generated `content` to assistive tech,
  but coverage varies by browser and reader, generated content is not dependably part of the
  copyable text, and it vanishes with the CSS. The separator is content rather than
  decoration, so write it as content.

## Related

[CommandPalette](command-palette.md) · [CodeBlock](code-block.md) · [Tooltip](tooltip.md) · [DropdownMenu](dropdown-menu.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
