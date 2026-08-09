# MultiSelect

Pick several values from a closed list: a tag-filled control over a floating listbox that
stays open as you toggle options, with an inline filter, a `maxItems` cap, and Backspace to
peel off the last tag. Reach for it when `<select multiple>` is the wrong shape and
[Select](select.md) can only hold one value.

<!-- example:Minimal -->
```tsx
<MultiSelect
  aria-label="Skills"
  placeholder="Add skills…"
  options={[
    { value: "react", label: "React" },
    { value: "typescript", label: "TypeScript" },
    { value: "css", label: "CSS" },
    { value: "postgres", label: "PostgreSQL" },
  ]}
/>
```
<!-- /example -->

| Prop            | Type                                                        | Default                     |
| --------------- | ----------------------------------------------------------- | --------------------------- |
| `options`       | `MultiSelectItem[]`                                         | — (required)                |
| `value`         | `string[]`                                                  | — (uncontrolled)            |
| `defaultValue`  | `string[]`                                                  | `[]`                        |
| `onValueChange` | `(value: string[]) => void`                                 | —                           |
| `onChange`      | `(value: string[]) => void`                                 | —                           |
| `placeholder`   | `string`                                                    | `"Select…"`                 |
| `open`          | `boolean`                                                   | — (uncontrolled)            |
| `defaultOpen`   | `boolean`                                                   | `false`                     |
| `onOpenChange`  | `(open: boolean) => void`                                   | —                           |
| `searchable`    | `boolean`                                                   | `true`                      |
| `maxItems`      | `number`                                                    | — (no cap)                  |
| `error`         | `boolean`                                                   | `Field` state, else `false` |
| `disabled`      | `boolean`                                                   | —                           |
| `placement`     | `Placement` (floating-ui)                                   | `"bottom-start"`            |
| `children`      | `(args: MultiSelectRenderArgs) => ReactNode`                | — (the standard tree)       |
| `aria-label`    | `string`                                                    | —                           |
| `className`     | `string`                                                    | — (lands on the wrapper)    |
| `classNames`    | `{ control?, list?, input?, chevron? }`                     | — (see [Slots](#slots))     |
| `ref`           | `Ref<HTMLDivElement>`                                       | —                           |
| …rest           | `<div>` props minus `defaultValue` / `children`; `onChange` and `children` are re-typed above | —          |

An option is `{ value: string; label: string; disabled?: boolean }` — exported as
`MultiSelectItem`. (It was `MultiSelectOption` before v0.12: one concept, one word, and the
word is *item* — the same one `MultiSelect.Item` and every other list in this library uses.)

**The list is data, and it stays data.** An earlier version of this page said there was "no
sub-component and no render prop" — half of that is now wrong and the half that matters is
not. `children` is a **function**, and the `options` it receives is the list MultiSelect has
*already filtered*. You map it; you never author it. So `options` remains the single writer
of the data and the parts you compose are the single writer of the presentation, which is
why adding them did not need `options` to become optional or to acquire a second code path.
See [Composition](#composition).

One of those rows has a sharp edge. The rest props are `<div>` props and the spread lands on
the **outer wrapper `<div>`**, not on the text input — but `id`, `aria-label` and
`aria-labelledby` are destructured out and placed on the combobox input, so all three name
or address the control. `name` is not a `<div>` prop, so it does not compile at all. See
[Gotchas](#gotchas).

`onChange` also escapes the wrapper spread: it carries the selected
`string[]`, the same payload as `onValueChange` rather than a `ChangeEvent`, and is
destructured out before the spread, so `{...form.field<string[]>("skills")}` writes the
array into the store instead of the inner search input's query text. The `aria-invalid` and
`name` that binding also emits land on the wrapper like any other rest prop, so a
store-level error never reaches the `role="combobox"` input — wrap the control in a
[Field](field.md), or pass `error`, to mark the control itself invalid.

## How a selection is made

The control is one wrapping row of tags followed by a text input, with a chevron pinned to
the right. Clicking the control opens the listbox and focuses the input.

- **Clicking an option toggles it** and the listbox **stays open** — that is the whole
  point of the component. Clicking a selected option removes it.
- **Typing filters** by a case-insensitive substring of `label`. When nothing matches, the
  listbox shows a plain "No options" row.
- **A committed pick consumes the query.** Selecting clears the filter text and resets the
  highlight, so the list returns to the full set and the next search starts fresh. A pick
  that is *blocked* by `maxItems` leaves the query alone.
- **Backspace on an empty query deletes the last tag.** There is no confirm step, so
  holding the key clears the selection from the end.
- **`ArrowDown` opens the list and highlights the first option** in one press. Arrows move
  the highlight, skipping anything `aria-disabled`, and wrap around at both ends. `Enter`
  toggles the highlighted option; `Escape` closes the list, clears the query, and leaves
  focus in the input.

Tags render in the order values were **added**, not in `options` order, and the array you
get back from `onValueChange` is in that same order.

## Controlled

Leave `value` off and the component owns the array; `defaultValue` seeds it and
`onValueChange` reports every change. Pass `value` and you own it — here it is held in a
`useState<string[]>` called `skills`:

<!-- example:Controlled -->
```tsx
<MultiSelect
  aria-label="Skills"
  value={skills}
  onValueChange={setSkills}
  placeholder="Add skills…"
  options={[
    { value: "react", label: "React" },
    { value: "typescript", label: "TypeScript" },
    { value: "css", label: "CSS" },
    { value: "postgres", label: "PostgreSQL" },
  ]}
/>
```
<!-- /example -->

The mode is locked on the first render, so a `value` that starts `undefined` and later
becomes an array will not switch the component into controlled mode. A `value` with no
`onValueChange` renders a frozen control, and nothing warns you.

## Capping the selection

<!-- example:MaxItems -->
```tsx
<MultiSelect
  aria-label="Request reviewers"
  maxItems={2}
  placeholder="Up to 2 reviewers"
  options={[
    { value: "ada", label: "Ada Lovelace" },
    { value: "grace", label: "Grace Hopper" },
    { value: "alan", label: "Alan Turing" },
    { value: "katherine", label: "Katherine Johnson" },
  ]}
/>
```
<!-- /example -->

Once `selected.length >= maxItems`, every **unselected** option gets `aria-disabled="true"`
— it stops responding to clicks and the arrow keys step over it — while selected options
stay togglable so the user can trade one for another. Nothing announces that the cap was
reached and nothing is shown next to the control, so put the limit in your own label or
placeholder text, as above.

The cap is only enforced on the way in. A `value` of three items with `maxItems={2}` renders
three tags; it just blocks a fourth.

## Disabled options

<!-- example:DisabledOption -->
```tsx
<MultiSelect
  aria-label="Deployment regions"
  defaultValue={["us-east-1"]}
  options={[
    { value: "us-east-1", label: "US East (N. Virginia)" },
    { value: "us-west-2", label: "US West (Oregon)" },
    { value: "eu-west-1", label: "Europe (Ireland)" },
    { value: "eu-west-2", label: "Europe (London) — at capacity", disabled: true },
  ]}
/>
```
<!-- /example -->

`disabled` on an option keeps it in the list, muted, ignoring clicks, and skipped by
keyboard navigation. It is still matched by the filter, so it does not vanish when the user
searches for it.

## Without the filter

<!-- example:WithoutSearch -->
```tsx
<MultiSelect
  aria-label="Notification channels"
  searchable={false}
  placeholder="Choose channels"
  options={[
    { value: "email", label: "Email" },
    { value: "slack", label: "Slack" },
    { value: "sms", label: "SMS" },
    { value: "webhook", label: "Webhook" },
  ]}
/>
```
<!-- /example -->

`searchable={false}` marks the inner input `readOnly` rather than removing it: the caret
still lands there, the full list shows every time, and **Backspace still deletes the last
tag**. Keep the list short enough to scan when you turn the filter off.

## In a Field, and naming the control

<!-- example:InField -->
```tsx
<Field error="Pick at least one skill.">
  <Label>Skills</Label>
  <MultiSelect
    aria-label="Skills"
    placeholder="Add skills…"
    options={[
      { value: "react", label: "React" },
      { value: "typescript", label: "TypeScript" },
      { value: "css", label: "CSS" },
    ]}
  />
  <FieldError />
</Field>
```
<!-- /example -->

Inside an invalid [Field](field.md), MultiSelect picks up `aria-invalid="true"` and an
`aria-describedby` pointing at the [FieldError](field-error.md) — the same context wiring
[Input](input.md) and [Select](select.md) use, applied to the inner input.

The visible [Label](label.md) can be wired the usual way: the `id` you pass is placed on the
combobox input, so `<Label htmlFor>` reaches it — and `aria-labelledby` and `aria-label` land
on the input too. Use one of the three, and keep its text in sync with the visible label;
omit all three and the combobox has no accessible name at all.

## Error state

<!-- example:ErrorState -->
```tsx
<MultiSelect
  error
  aria-label="Skills"
  placeholder="Add skills…"
  options={[
    { value: "react", label: "React" },
    { value: "typescript", label: "TypeScript" },
    { value: "css", label: "CSS" },
  ]}
/>
```
<!-- /example -->

`error` **overrides** the surrounding field, because the resolution is
`error ?? field.invalid` — passing `error={false}` forces a valid-looking control inside an
errored [Field](field.md). Omit the prop to inherit.

## Disabled

<!-- example:Disabled -->
```tsx
<MultiSelect
  disabled
  aria-label="Skills"
  defaultValue={["react", "typescript"]}
  options={[
    { value: "react", label: "React" },
    { value: "typescript", label: "TypeScript" },
    { value: "css", label: "CSS" },
  ]}
/>
```
<!-- /example -->

`disabled` reaches the input and every tag's remove button, and the control's own click
handler returns early — so the selection is displayed but frozen, and the list cannot be
opened at all. The wrapper also carries `data-disabled`, which is what greys the fill.

## Where the list opens

<!-- example:Placement -->
```tsx
<MultiSelect
  aria-label="Skills"
  placement="top-start"
  placeholder="Opens upward"
  options={[
    { value: "react", label: "React" },
    { value: "typescript", label: "TypeScript" },
    { value: "css", label: "CSS" },
  ]}
/>
```
<!-- /example -->

`placement` is a preference, not a guarantee: the listbox is positioned by floating-ui with
`flip` and `shift`, so it moves to the opposite side or slides along the axis rather than
leaving the viewport. It renders through a portal appended to `<body>`, so an `overflow: hidden`
or `transform` ancestor cannot clip it — or to the nearest `<dialog>` ancestor of the control, so
it stays visible and clickable inside a [Dialog](dialog.md) or [Drawer](drawer.md). That dialog does not bound it: a modal dialog is a scrollport (`overflow: auto`, from the user agent stylesheet) and would clip a panel bigger than itself, so the panel promotes itself into the top layer while it is open there — see [Popover](popover.md#gotchas). The list caps its own height at `max-h-64` and scrolls, so it is short by construction anyway.

## Composition

Six parts cover everything MultiSelect renders that has *content* in it. Pass a function as
`children` and compose them; omit it and you get exactly the tree below, which is the same
composition written out in the component.

| Part                       | Element                       | What it is                                    |
| -------------------------- | ----------------------------- | --------------------------------------------- |
| `MultiSelect.Tag`          | `span.multiselect-tag`        | one selected value, in the control's tag row   |
| `MultiSelect.TagRemove`    | `button.multiselect-tag__remove` | that tag's ×, named `Remove <label>`        |
| `MultiSelect.Content`      | `div.multiselect-content`     | the floating `role="listbox"`, in a portal      |
| `MultiSelect.Item`         | `div.multiselect-item`        | one `role="option"` row                        |
| `MultiSelect.ItemIndicator`| `span.multiselect-item__check`| that row's selection gutter                    |
| `MultiSelect.Empty`        | `div.multiselect-empty`       | the "nothing matched" row                      |

<!-- example:Composed -->
```tsx
<MultiSelect
  aria-label="Reviewers"
  placeholder="Add reviewers…"
  options={[
    { value: "ada", label: "Ada Lovelace" },
    { value: "grace", label: "Grace Hopper" },
    { value: "alan", label: "Alan Turing" },
  ]}
>
  {({ options, selected }) => (
    <>
      {selected.map(({ value, label }, index) => (
        <MultiSelect.Tag key={`${index}:${value}`} index={index} className="uppercase">
          {label}
          <MultiSelect.TagRemove />
        </MultiSelect.Tag>
      ))}
      <MultiSelect.Content className="min-w-[16rem]">
        {options.length === 0 ? (
          <MultiSelect.Empty>Nobody by that name</MultiSelect.Empty>
        ) : (
          options.map((option) => (
            <MultiSelect.Item key={option.value} option={option}>
              <MultiSelect.ItemIndicator />
              {option.label}
              <span className="ml-auto text-fg-muted">@{option.value}</span>
            </MultiSelect.Item>
          ))
        )}
      </MultiSelect.Content>
    </>
  )}
</MultiSelect>
```
<!-- /example -->

Four things hold whatever you write:

- **`options` inside the callback is MultiSelect's own filtered list.** Typing in the search
  box narrows it before you see it, so your `.map` renders exactly the rows that should
  exist. An option that did not come out of that list is not an option: passing one to
  `MultiSelect.Item` throws, rather than quietly inserting a row the keyboard cannot reach.
- **The parts carry the wiring.** `role`, `id`, `aria-selected`, `aria-disabled`, the
  `data-active` the focus ring hangs off, the `maxItems` disabling, the list-navigation
  registration and the toggle handler all come from context. You cannot omit or mis-wire
  one, because you never write one.
- **`MultiSelect.Tag` takes its `index`** in the `selected` array — `TagRemove` reads the
  rest from there, which is what keeps the accessible name and the focus-to-successor
  behaviour correct.
- **Omitting `MultiSelect.Content` fails loudly**, on the first click: the listbox never
  opens and `aria-controls` points at nothing. It is not a composition that looks finished
  and quietly cannot express something.

`MultiSelect.Content` renders through a portal, so where you declare it in the callback does
not affect where it lands.

## Slots

`className` is the root — the positioned outer `<div>`. The six elements above are reached
through their part's own `className`. That leaves four internals a consumer can only want to
*restyle*, and those are the slots:

| Slot      | Element                     | What it addresses                          |
| --------- | --------------------------- | ------------------------------------------ |
| `control` | `div.multiselect-control`   | the bordered box — border, radius, padding |
| `list`    | `div.multiselect-tags`      | the wrapping tag row inside it             |
| `input`   | `input.multiselect-input`   | the inline search field                    |
| `chevron` | `span.multiselect-toggle`   | the disclosure glyph                       |

```tsx
<MultiSelect
  aria-label="Skills"
  options={options}
  classNames={{ control: "rounded-none", chevron: "text-fg-muted" }}
/>
```

The keys are typed, so a misspelled one is a compile error rather than a prop that does
nothing — and there is no `panel`, `item`, `tag` or `empty` key, because the parts above
already reach those elements and two writers for one element is one too many.

**Not slots, deliberately.** The input carries four invariants a caller cannot see —
`getReferenceProps`, the `aria-activedescendant` wiring, `readOnly` when `searchable` is
false, and the Backspace peel — so it is a class route and not a part: there is no content
in it for you to supply.

## Theme tokens

`MultiSelect.css` is gone: every colour, radius, shadow, type step and gap-with-a-name is a
Tailwind utility in `MultiSelect.tsx`, each resolving to a contract variable. Override a
variable and the control re-tints at runtime with the rest of the app — and because the
utilities sit in `@layer utilities`, a `className` of your own beats every one of them.

| Where                            | Utility                                                     | Override                                     |
| -------------------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| Control fill                     | `bg-surface-0`                                              | `--C-SURFACE-0`                              |
| Control border                   | `border` `border-border-strong`                             | `--C-BORDER-STRONG`                          |
| Focus border + ring              | `focus-within:ring-border-focus` `focus-within:border-border-focus` | `--C-BORDER-FOCUS`                   |
| Error border + ring              | `border-status-error` `focus-within:ring-status-error`      | `--C-STATUS-ERROR`                           |
| Disabled control fill            | `bg-surface-3`                                              | `--C-SURFACE-3`                              |
| Control padding                  | `py-r5` `px-r4`                                             | `--R-SIZE-5` · `--R-SIZE-4`                  |
| Control & listbox corners        | `rounded-md`                                                | `--RADIUS-MD`                                |
| Tag fill · highlighted-option wash | `bg-surface-2`                                            | `--C-SURFACE-2`                              |
| Tag label ink · chevron ink      | `text-fg-secondary`                                         | `--C-TEXT-SECONDARY`                         |
| Tag corners                      | `rounded-sm`                                                | `--RADIUS-SM`                                |
| Tag type                         | `text-body-3`                                               | `--BodyText-3`                               |
| Tag weight · selected-option weight | `font-semibold` `data-selected:font-semibold`            | `--Semibold-Weight`                          |
| Remove-glyph hover ink · query ink · option ink | `hover:text-fg-primary` `text-fg-primary`    | `--C-TEXT-PRIMARY`                           |
| Remove glyph · placeholder · disabled option · empty text | `text-fg-muted` `placeholder:text-fg-muted` `aria-disabled:text-fg-muted` | `--C-TEXT-MUTED` |
| Listbox border                   | `border-border-default`                                     | `--C-BORDER-DEFAULT`                         |
| Listbox shadow                   | `shadow-lg`                                                 | `--SHADOW-LG`                                |
| Highlighted-option ring          | `data-active:outline-border-focus`                          | `--C-BORDER-FOCUS`                           |
| Selected-option check            | `text-accent`                                               | `--C-ACCENT`                                 |
| Query, option & empty-row type   | `text-body-2`                                               | `--BodyText-2`                               |

The two spacing tokens step up at the 40rem breakpoint along the responsive `r`-scale: the
control's vertical padding (`--R-SIZE-5`, `0.5rem` → `0.75rem`) and its horizontal padding
(`--R-SIZE-4`, `0.75rem` → `1.25rem`) — the same pair [Select](select.md) and
[Input](input.md) use, so the three controls line up. The type steps are responsive too:
`--BodyText-2` runs `0.8125rem` → `0.875rem`, `--BodyText-3` `0.75rem` → `0.8125rem`.

**Off the contract.** The control's own padding is the only dimension on the `r`-scale;
every other gap, size and inner padding is a hard literal: the tag row's
`0.375rem` gap, the `0.5rem` tag-to-chevron gap, the `2.5rem` minimum control height, the
`1px` border, the `2px` focus ring, the listbox's `11.25rem` minimum width, `16rem` maximum
height and `z-index: 40` (the same layer [Popover](popover.md) and
[DropdownMenu](dropdown-menu.md) sit on), the `0.875rem` check gutter, and the three lucide
icon sizes, which are `size` props in the `.tsx` rather than CSS. The two emphasised weights —
the tag label and the selected option — read `--Semibold-Weight`, the same token a sibling
like [TagInput](tag-input.md) reaches through a utility, so they track the theme and step
`500` → `600` at 40rem with the rest of the design system.

**Measured contrast**, from the OKLCH values in `@batthewz/response-ui-css`, in
default / `events` / `tech` / `grimdark`:

- The **highlighted option**'s wash is `--C-SURFACE-2` — one rung recessed — on the listbox's
  rung-0 `--C-SURFACE-0`: **1.08–1.21:1**, invisible in all four measured themes, which is why
  it is no longer the marker. The 2px `--C-BORDER-FOCUS` ring drawn over it measures **3.52 /
  3.29 / 14.56 / 3.43:1** against that wash, clearing the 3:1 WCAG 1.4.11 asks of a focus
  indicator in all four measured themes. It read 2.63 and 2.77 in `events` and `grimdark` until
  `@batthewz/response-ui-css` **v0.10.1** retuned `--C-BORDER-FOCUS`. Those ring figures were
  taken while the wash was a rung-1 surface and have not been re-measured since it moved to
  rung 2. See [Accessibility](#accessibility).
- The **remove glyph** on a tag is `--C-TEXT-MUTED` on `--C-SURFACE-2`: **4.50:1 in all four measured
  themes** — each theme was tuned to land exactly on the floor there, so it clears 3:1 for a
  graphical affordance with room to spare but has no headroom as body text. It was 1.94–2.31
  before **v0.10.0**. It still reaches `--C-TEXT-PRIMARY` on hover.
- The **placeholder**, the **"No options"** row and a **disabled option's label** all ink
  `--C-TEXT-MUTED` on `--C-SURFACE-0`: **4.95 / 4.85 / 4.87 / 5.23:1**, clearing AA's 4.5:1
  for body text. These read 2.10–2.59 before **v0.10.0**.
- The **check glyph** is `--C-ACCENT` on `--C-SURFACE-0` — **5.17 / 4.89 / 14.84 / 5.69:1**,
  clearing 3:1 in every theme measured; it was 2.72 and 2.96 in `events` and `grimdark` before
  **v0.10.0**. Selection is also carried by the tag and by the option's heavier weight, so
  the check is corroboration rather than the only signal.
- Tag fill (`--C-SURFACE-2`) against the control fill (`--C-SURFACE-0`) is **1.08–1.21:1**,
  so a tag is delimited by its radius and its ink weight far more than by its background.

Tag label ink is the one pairing with margin to spare: `--C-TEXT-SECONDARY` on
`--C-SURFACE-2` measures **6.87 / 6.87 / 5.32 / 5.11:1**.

Measured against the default theme and the worked examples; these numbers do not transfer to
your own theme — re-check them against your values. See the
[theme contract](../theme-contract.md) for what the tokens do and do not promise.

## Gotchas

- **The chevron is the toggle.** Clicking it opens and closes the list; clicking anywhere else
  in the control only opens it, the way a text field does. `Escape`, an outside press and
  moving focus out of the control all close it too.
- **There is no native form participation, and `name` does not compile.** The rest props are
  `<div>` props, and `name` is not one of them: `<MultiSelect name="skills">` is a TypeScript
  error (`Property 'name' does not exist`), not a prop that is typed and then dropped. There
  is no hidden input per value either, so a plain `<form>` post carries nothing. A form store
  binds fine — `onChange` hands it the array — but a spread `name` only reaches the wrapper
  `<div>` as an inert attribute.
- **`Enter` belongs to the open list.** While the list is open the key is consumed whether or
  not an option is highlighted, so it never submits the surrounding form by accident.
- **A value that is not in `options` renders as a raw tag.** The label lookup falls back to
  the value string, so `defaultValue={["rust"]}` against a list with no `rust` shows a tag
  reading `rust` — and because it has no row in the listbox, it can only be removed with its
  own × or by Backspace.
- **Duplicate values in a controlled array render twice.** The component never de-duplicates
  what you hand it, so `value={["react", "react"]}` shows two tags — a faithful picture of
  your array, and no longer a React key collision. De-duplicate before you pass it if that is
  not what you meant.
- **`maxItems` never trims.** It blocks additions and disables unselected options; an
  over-long `value` is rendered in full. Enforce the cap on your own data if it matters.
- **`className` styles the wrapper.** The bordered control is an inner `<div>`; a class you
  pass lands on the positioned outer element, which is `position: relative; width: 100%` and
  paints nothing.
- **Client component, with the directive.** MultiSelect ships its own `"use client"`, so it
  drops straight into an RSC tree. The portal only mounts while the list is open, and the
  list starts closed, so a server render emits just the control.
- **The listbox is not the width of the control.** The whole control is the floating anchor,
  which sets where the panel is aligned but not how wide it is: the middleware is
  `offset` + `flip` + `shift` with no `size`, and `.multiselect-content` declares only a
  `min-width` of `11.25rem`. So the panel is sized by its longest option — wider than the
  field for long labels, narrower for short ones.

## Accessibility

The input is the ARIA combobox: `role="combobox"` with `aria-expanded`, `aria-controls`,
`aria-autocomplete="list"` and, while navigating, `aria-activedescendant` pointing at the
highlighted option. The panel is a `role="listbox"` with `aria-multiselectable="true"` whose
rows are `role="option"` with `aria-selected`, and `aria-disabled` on anything blocked by
`option.disabled` or by `maxItems`. DOM focus never leaves the input — the listbox is
`tabIndex={-1}` and navigation is virtual — so `Escape` returns you to a control that never
lost focus. Each tag's × is a real `<button type="button">` named `Remove <label>`.

Four things to plan around:

- **Name it with `aria-label`, `aria-labelledby` or `id` + `<Label htmlFor>`.** All three reach
  the combobox input; the rest of the spread stays on the wrapper. Omit all three and the
  combobox has no accessible name at all.
- **Every tag's × is a tab stop.** `Tab` walks the tags before reaching the input, so any
  tag can be removed from the keyboard, not just the last one via Backspace. Removing a tag
  moves focus to the next tag's ×, or to the input when the last one goes.
- **The highlighted option is marked by a ring, not by its wash.** The `--C-SURFACE-2`
  background is 1.08–1.21:1 on the rung-0 popup and carries nothing on its own, so `.multiselect-item[data-active]`
  also draws a 2px `--C-BORDER-FOCUS` outline at `-2px` offset. It has to come from the
  attribute rather than `:focus-visible`, because DOM focus never leaves the input and that
  pseudo-class can never match an option. The ring measures 3.52 / 3.29 / 14.56 / 3.43:1
  against the wash (see [Theme tokens](#theme-tokens)) — over the 3:1 floor in every theme measured
  since `@batthewz/response-ui-css` v0.10.1, where it was marginally short in `events` and
  `grimdark` before. A custom theme owns `--C-BORDER-FOCUS`, so re-check it there.
  Screen-reader users are unaffected either way:
  `aria-activedescendant` is correct.
- **Nothing announces a change.** There is no live region. Toggling an option, hitting the
  `maxItems` cap, and Backspacing a tag away all happen silently; so does the "No options"
  row, which is `role="presentation"` inside a listbox the user is not focused in.
- **`aria-controls` is set only while the list is open**, because that is the only time the
  element it names is in the document. `searchable={false}` reports
  `aria-autocomplete="none"`, since a read-only input filters nothing.

The error state is conveyed by border and ring colour plus `aria-invalid`, so always pair it
with a visible [FieldError](field-error.md) message. Focus is a `:focus-within` ring on the
control, not `:focus-visible`, so it appears on mouse click as well as on keyboard focus. It
is a 2px `box-shadow`, so focusing never shifts the layout.

## Related

[Select](select.md) · [TagInput](tag-input.md) · [Combobox](combobox.md) · [Field](field.md) ·
[FieldError](field-error.md) · [Label](label.md) · [Input](input.md) ·
[Popover](popover.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
