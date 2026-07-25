# Combobox

A text input over a filtered list: the user types, **you** filter, and the popup shows what
survives. Combobox owns the parts that are easy to get wrong — open/close state, the floating
popup, arrow-key navigation with virtual focus, and the `combobox`/`listbox`/`option` ARIA
wiring — and deliberately owns no data. There is no `options` prop and no built-in matcher, so
substring search, fuzzy search, async results, and grouping all stay in your code.

The `query` / `setQuery` pair below is a plain `useState("")` — `onInputValueChange` writes
it, your filter reads it. Combobox never sees either.

<!-- example:Minimal -->
```tsx
<Combobox onInputValueChange={setQuery}>
  <Combobox.Input aria-label="Deployment region" placeholder="Search regions…" />
  <Combobox.Content>
    {[
      { value: "us-east-1", label: "US East (N. Virginia)" },
      { value: "us-west-2", label: "US West (Oregon)" },
      { value: "eu-west-1", label: "Europe (Ireland)" },
      { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
    ]
      .filter((region) =>
        region.label.toLowerCase().includes(query.toLowerCase()),
      )
      .map((region, index) => (
        <Combobox.Item key={region.value} index={index} value={region.value}>
          {region.label}
        </Combobox.Item>
      ))}
  </Combobox.Content>
</Combobox>
```
<!-- /example -->

**Anatomy.** `Combobox` is a context provider and renders **no DOM node of its own** — the
markup starts at its children. `Combobox.Input` renders the text
field (`role="combobox"`) plus a chevron `<button>`; `Combobox.Content` renders the popup
(`role="listbox"`) through a `FloatingPortal`, so it escapes any `overflow: hidden` ancestor,
and it returns `null` while closed. Each `Combobox.Item` is one `role="option"`, and
`Combobox.Empty` is a plain no-results slot that is *not* an option.

| Part               | Renders                                                  | Adds                              |
| ------------------ | -------------------------------------------------------- | --------------------------------- |
| `Combobox`         | nothing — a context provider                             | the props table below             |
| `Combobox.Input`   | `<div>` wrapper + `<input role="combobox">` + chevron button | `error?` (+ all `input` props) |
| `Combobox.Content` | portalled `<div role="listbox">`, or `null` when closed  | (all `div` props)                 |
| `Combobox.Item`    | `<div role="option">`                                    | `index` · `value` · `disabled?` (+ all `div` props) |
| `Combobox.Empty`   | `<div role="presentation">`                              | (all `div` props)                 |

All four forward `ref`, merge `className`, and spread the rest of your props onto the element
they render. [Input](input.md), `Content` and `Item` read context and throw — `"Combobox.Item must be
used within a Combobox"`, and so on — if rendered outside the root. `Combobox.Empty` reads no
context at all: it is a pre-styled `<div>` that works anywhere and warns nowhere.

One prop is not safe to pass: **`Combobox.Item` generates its own `id`** and the rest-spread
lands after it, so an `id` of yours replaces the one `aria-activedescendant` points at. Leave
it alone.

## Props

Everything the root takes. Each of the three state pairs is independently controllable, and
`useControllableState` locks the mode on first render — a prop that starts `undefined` stays
uncontrolled for the component's whole life.

| Prop                 | Type                              | Default          |
| -------------------- | --------------------------------- | ---------------- |
| `value`              | `string \| null`                  | uncontrolled     |
| `defaultValue`       | `string`                          | `null`           |
| `onValueChange`      | `(value: string \| null) => void` | —                |
| `inputValue`         | `string`                          | uncontrolled     |
| `defaultInputValue`  | `string`                          | `""`             |
| `onInputValueChange` | `(value: string) => void`         | —                |
| `open`               | `boolean`                         | uncontrolled     |
| `defaultOpen`        | `boolean`                         | `false`          |
| `onOpenChange`       | `(open: boolean) => void`         | —                |
| `loading`            | `boolean`                         | `false`          |
| `placement`          | `Placement`                       | `"bottom-start"` |
| `children`           | `React.ReactNode`                 | required         |

The root accepts **no** DOM props — no `className`, no `id`, no `ref`. It renders a provider
and nothing else, so style `Combobox.Input` and `Combobox.Content` instead.

## Filtering, and the `index` prop

Root never sees your filter. It only needs to know how many options are on screen, which
`Combobox.Content` derives on every render by walking its children for `Combobox.Item`
elements, descending through fragments and wrapper elements. That is why **`index` is your
job**: it must be the option's position in the *rendered* list, after filtering, starting at
`0` and with no gaps. Mapping over the already-filtered array and using the callback's own
`index` — as in the first example above — gets this right for free; reusing an index from the
unfiltered source array does not, and yields duplicate option `id`s and arrow keys that land on
the wrong row.

The active option is only ever recomputed when that **count** changes. It drops to the first
row when nothing was active or when the previous index no longer exists, becomes nothing at all
when the count hits zero, and is otherwise left exactly where it was. So it tracks an index,
not an option: re-filtering to a list of the same length leaves the highlight sitting on
whichever row now occupies that position.

## Controlled

The value, the input text, and the open state are three separate things. Selecting an option
sets the value *and* overwrites the input text with the option's label; typing afterwards
changes only the text. Below, `region` is a `useState<string | null>(null)` and `query` the
same `useState("")` as before.

<!-- example:Controlled -->
```tsx
<Combobox
  value={region}
  onValueChange={setRegion}
  inputValue={query}
  onInputValueChange={setQuery}
>
  <Combobox.Input aria-label="Deployment region" placeholder="Search regions…" />
  <Combobox.Content>
    {[
      { value: "us-east-1", label: "US East (N. Virginia)" },
      { value: "eu-west-1", label: "Europe (Ireland)" },
    ]
      .filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase()),
      )
      .map((option, index) => (
        <Combobox.Item key={option.value} index={index} value={option.value}>
          {option.label}
        </Combobox.Item>
      ))}
  </Combobox.Content>
</Combobox>
```
<!-- /example -->

There is no clear button and no reset path. `onValueChange` is only ever called with the
`string` of a selected option — never with `null`. Controlled, you clear a selection by setting
`value` back to `null` and `inputValue` back to `""`; uncontrolled, there is no way to unset
it once an option has been picked.

## No results

Render `Combobox.Empty` in place of the options when your filter comes back empty. It is a
`role="presentation"` div, so it is never counted as an option and never becomes the active
descendant — the listbox holds no options at all while it shows.

<!-- example:EmptyResults -->
```tsx
<Combobox defaultOpen defaultInputValue="Ada">
  <Combobox.Input aria-label="Assignee" placeholder="Search teammates…" />
  <Combobox.Content>
    <Combobox.Empty>No teammates match “Ada”.</Combobox.Empty>
  </Combobox.Content>
</Combobox>
```
<!-- /example -->

## Loading

`loading` replaces the popup's children with a centred [Spinner](spinner.md) at `size="sm"`, so use it
while an async query is in flight. Your `Combobox.Item` elements are still handed to
`Combobox.Content` as children — it just doesn't render them — which is why the option count
does not drop to zero (see [Gotchas](#gotchas)).

<!-- example:Loading -->
```tsx
<Combobox defaultOpen loading defaultInputValue="react">
  <Combobox.Input aria-label="npm package" placeholder="Search packages…" />
  <Combobox.Content>
    <Combobox.Item index={0} value="react">
      react
    </Combobox.Item>
  </Combobox.Content>
</Combobox>
```
<!-- /example -->

## Disabled options

<!-- example:DisabledOption -->
```tsx
<Combobox defaultOpen>
  <Combobox.Input aria-label="Deployment region" placeholder="Search regions…" />
  <Combobox.Content>
    <Combobox.Item index={0} value="us-east-1">
      US East (N. Virginia)
    </Combobox.Item>
    <Combobox.Item index={1} value="eu-west-2" disabled>
      Europe (London) — at capacity
    </Combobox.Item>
    <Combobox.Item index={2} value="eu-west-1">
      Europe (Ireland)
    </Combobox.Item>
  </Combobox.Content>
</Combobox>
```
<!-- /example -->

A disabled option still occupies an `index` and still renders, but `Combobox.Item` sets
`aria-disabled="true"` on it, and the floating engine reads that attribute off the DOM to skip
the row during arrow-key navigation. Clicking it is ignored: the popup stays open and no value
changes.

## In a `Field`

`Combobox.Input` calls the same `useFieldError` hook as [Input](input.md) and
[Select](select.md), so inside an invalid [Field](field.md) it picks up the error border,
`aria-invalid="true"`, and an `aria-describedby` pointing at the rendered
[FieldError](field-error.md) — with no props. The visible [Label](label.md) is still yours to
wire: pair its `htmlFor` with the input's `id`.

<!-- example:InField -->
```tsx
<Field error="Pick the region your data will live in.">
  <Label htmlFor="region">Deployment region</Label>
  <Combobox>
    <Combobox.Input id="region" placeholder="Search regions…" />
    <Combobox.Content>
      <Combobox.Item index={0} value="us-east-1">
        US East (N. Virginia)
      </Combobox.Item>
      <Combobox.Item index={1} value="eu-west-1">
        Europe (Ireland)
      </Combobox.Item>
    </Combobox.Content>
  </Combobox>
  <FieldError />
</Field>
```
<!-- /example -->

Set `error` on the input to mark a standalone combobox invalid. Resolution is
`error ?? field.invalid`, so `error={false}` forces it valid even inside an errored [Field](field.md).

<!-- example:ErrorState -->
```tsx
<Combobox>
  <Combobox.Input error aria-label="Deployment region" placeholder="Search regions…" />
  <Combobox.Content>
    <Combobox.Item index={0} value="us-east-1">
      US East (N. Virginia)
    </Combobox.Item>
  </Combobox.Content>
</Combobox>
```
<!-- /example -->

## Placement

<!-- example:TopPlacement -->
```tsx
<Combobox placement="top-start" defaultOpen>
  <Combobox.Input aria-label="Deployment region" placeholder="Search regions…" />
  <Combobox.Content>
    <Combobox.Item index={0} value="us-east-1">
      US East (N. Virginia)
    </Combobox.Item>
    <Combobox.Item index={1} value="eu-west-1">
      Europe (Ireland)
    </Combobox.Item>
  </Combobox.Content>
</Combobox>
```
<!-- /example -->

`placement` accepts any floating-ui `Placement`. The popup is offset 8px, and `flip` and
`shift({ padding: 8 })` are always on, so it moves itself when the preferred side has no room.

## Theme tokens

Combobox uses **no Tailwind utilities** — every rule lives in `Combobox.css` and reads the
contract variables directly, the way Tabs and ActivityFeed do. Override any of these and both
the field and the popup re-tint at runtime.

| Where                                       | Override                            |
| ------------------------------------------- | ----------------------------------- |
| Input text · option text                    | `--C-TEXT-PRIMARY` · `--BodyText-2` |
| Input fill · popup fill                     | `--C-SURFACE-0`                     |
| Input border                                | `--C-BORDER-STRONG`                 |
| Focus border and 2px ring                   | `--C-BORDER-FOCUS`                  |
| Invalid border and ring                     | `--C-STATUS-ERROR`                  |
| Disabled input fill                         | `--C-SURFACE-3`                     |
| Placeholder · empty slot · disabled option  | `--C-TEXT-MUTED`                    |
| Chevron and loading spinner ink             | `--C-TEXT-SECONDARY`                |
| Popup border                                | `--C-BORDER-DEFAULT`                |
| Popup shadow                                | `--SHADOW-LG`                       |
| Active-option highlight                     | `--C-SURFACE-1`                     |
| Corners — input and popup                   | `--RADIUS-MD`                       |

The spinner has no colour of its own: it is drawn with `border-current`, so it takes the
`--C-TEXT-SECONDARY` that the loading row sets.

A handful of values are **not** on the contract and cannot be themed: the input's padding
(`0.5rem 2.25rem 0.5rem 0.75rem`, the right side reserving the chevron's gutter), the option
padding (`0.375rem 0.75rem`), the popup's `min-width: 11.25rem`, `max-height: 16rem` and
`z-index: 40`, the 2px focus-ring width, the selected option's `font-weight: 600` (a literal,
not `--Semibold-Weight`), and the chevron's `size={16}`.

Three token pairs here are worth measuring before you ship a theme, because the defaults are
thin. The active-option highlight is `--C-SURFACE-1` painted on the popup's `--C-SURFACE-0`,
which is **1.02–1.07:1** across the four shipped themes — see [Gotchas](#gotchas), because with
virtual focus that background is the *only* cue. The input border is `--C-BORDER-STRONG` on
`--C-SURFACE-0` at **1.41–1.79:1**, and the focus ring `--C-BORDER-FOCUS` on the same fill is
**2.72:1** in `events` and **2.96:1** in `grimdark` — both under the 3:1 floor for a non-text
indicator, with `outline: none` removing the browser's fallback. See the
[theme contract](../theme-contract.md).

## Gotchas

- **The chevron cannot close the popup.** Its `aria-label` flips to `"Close"` while open, but
  clicking it while open leaves the list open: the outside-press dismissal fires on
  `pointerdown` and the button's own `onClick` then toggles it straight back. A controlled
  consumer sees `onOpenChange(false)` immediately followed by `onOpenChange(true)` on every
  click. Only `Escape`, an outside click, selecting an option, or driving `open` yourself
  actually closes it.
- **`Enter` does not submit the surrounding form while the list is open.** Opening the popup
  already marks an option active — the first row, on a combobox nobody has navigated yet — so
  the first `Enter` is consumed: `preventDefault()` runs and that option is selected. A second
  `Enter`, with the list now closed, submits. A user who types and hits `Enter` picks the top
  match instead of submitting — but if the filter matched **nothing**, no option is active, the
  key is not intercepted, and the same `Enter` submits the form with the "no results" popup
  still on screen. Whether `Enter` submits depends on how many rows your filter returned.
- **Selecting with the mouse leaves focus on `<body>`.** Focus is not returned to the input
  after a click-selection, so the next `Tab` restarts from the top of the document. Keyboard
  selection with `Enter` keeps focus on the input.
- **The option's label is its `textContent`.** Selection writes `node.textContent` into the
  input, with no way to supply a separate display string. A two-line option built from two
  `<span>`s puts `"Ada LovelaceAnalytical Engine"` in the field. Keep rich options to one line
  of text, or drive `inputValue` yourself in `onValueChange`.
- **The value and the input text drift apart, permanently.** Select an option, then edit the
  text: the value is unchanged and nothing reverts on close or blur. If a committed selection
  matters, compare the two in `onValueChange`/`onInputValueChange` and reconcile them yourself.
- **`loading` hides your options but still counts them.** The item count is taken from
  `Combobox.Content`'s children before the spinner swap, so the active index stays at `0` and
  the input keeps an `aria-activedescendant` pointing at an `id` that is not in the document
  while the spinner shows.
- **Nothing closes the popup when focus leaves.** There is no blur or focus-out dismissal —
  tabbing from the input to the next control leaves the portalled listbox mounted and
  `aria-expanded="true"` on an unfocused combobox.
- **The active-option highlight is close to invisible.** It is a `--C-SURFACE-1` background on
  a `--C-SURFACE-0` popup — 1.02–1.07:1 in every shipped theme — and because navigation is
  virtual there is no focus ring on the option to back it up. Override
  `.combobox-item[data-active]` with something that clears 3:1 if keyboard users matter.
- **Hovering an option makes it the active one,** overwriting whatever the arrow keys had
  selected. Moving the mouse across the list while typing will move the `Enter` target.
- **Client-only.** `Combobox.tsx` carries `"use client"`, so the whole subtree is a client
  component; the popup also portals out of your form's DOM position, which matters if you were
  relying on CSS descendant selectors reaching it.

## Accessibility

The input carries the pattern's wiring directly: `role="combobox"`,
`aria-autocomplete="list"`, `aria-expanded` tracking the open state, `aria-controls` naming the
listbox, `aria-haspopup="listbox"` (added by the floating engine's `useRole`), and
`aria-activedescendant` naming the active option's `id`. The popup is a `role="listbox"` with
`tabindex="-1"` and `aria-orientation="vertical"`; each item is a `role="option"` that always
publishes `aria-selected`, plus `aria-disabled="true"` when disabled.

Navigation is **virtual** — `useListNavigation({ virtual: true, loop: true })`. Arrow keys move
`aria-activedescendant` without ever moving DOM focus off the input, the list wraps at both
ends, and disabled rows are skipped. `ArrowDown` *or* `ArrowUp` opens a closed popup; typing
opens it too; `Escape` closes it and clears `aria-activedescendant`; an outside pointer-down
closes it.

Four things the code does **not** do, and that you may have to work around:

- **`Combobox.Input` has no accessible name.** Give it an `aria-label`, or a
  [Label](label.md) whose `htmlFor` matches its `id`. Without one it announces as an unnamed
  combobox.
- **`aria-controls` is set unconditionally**, including while the popup is closed and the
  element with that `id` does not exist. It resolves correctly the moment the list opens.
- **`Combobox.Empty` is `role="presentation"` and there is no live region.** The "no results"
  text is inside the listbox, but nothing announces that the option count dropped to zero —
  add your own `aria-live` region if that transition needs to be spoken. The same applies to
  `loading`: the [Spinner](spinner.md)'s `role="status"` sits inside the listbox rather than beside the
  input.
- **The chevron button is `tabIndex={-1}`** — deliberately outside the tab order, since the
  input handles opening — but it is still in the accessibility tree with a hard-coded English
  `"Open"`/`"Close"` name and no `aria-expanded` or `aria-controls` of its own. A screen-reader
  user browsing element-by-element meets a button that does not say what it opens, and cannot
  be renamed.

Contrast is the weak point. The active-option highlight (1.02–1.07:1) and the input border
(1.41–1.79:1) sit under the 3:1 non-text floor in **every** shipped theme, and the focus ring
sits under it in `events` and `grimdark` — see [Theme tokens](#theme-tokens) for the numbers.
The keyboard cue is the one to fix first, because virtual focus leaves nothing else to see.

## Related

[Select](select.md) · [MultiSelect](multi-select.md) · [SearchInput](search-input.md) · [TagInput](tag-input.md) ·
[Field](field.md) · [Label](label.md) · [FieldError](field-error.md) · [Spinner](spinner.md) ·
[Popover](popover.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
