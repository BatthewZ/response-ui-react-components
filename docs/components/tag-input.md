# TagInput

A free-text field that turns what you type into removable chips — for topics, recipients,
skills, or any short list a user composes rather than picks from. Enter or a comma commits
the draft, Backspace on an empty field deletes the last chip, and pasting
`react, typescript, vite` lands three chips at once. It trims, de-duplicates, caps and
validates entries for you, and dropped inside a [Field](field.md) it inherits that field's
error state with no extra props.

<!-- example:Minimal -->
```tsx
<TagInput aria-label="Topics" placeholder="Add a topic…" />
```
<!-- /example -->

| Prop            | Type                                  | Default                     |
| --------------- | ------------------------------------- | --------------------------- |
| `value`         | `string[]`                            | — (uncontrolled)            |
| `defaultValue`  | `string[]`                            | `[]`                        |
| `onValueChange` | `(tags: string[]) => void`            | —                           |
| `maxTags`       | `number`                              | — (no cap)                  |
| `validateTag`   | `(tag: string) => boolean \| string`  | — (everything accepted)     |
| `delimiter`     | `RegExp`                              | `/[,\n]/`                   |
| `placeholder`   | `string`                              | —                           |
| `error`         | `boolean`                             | `Field` state, else `false` |
| `disabled`      | `boolean`                             | —                           |
| `className`     | `string`                              | — (lands on the wrapper)    |
| `ref`           | `Ref<HTMLInputElement>`               | —                           |
| …rest           | `<input>` props minus `value` / `defaultValue` / `onChange` | —     |

Three of those have sharp edges. `className` styles the **bordered wrapper**, while every
other passthrough prop — `id`, `name`, `style`, `aria-*`, `onFocus` — lands on the inner
text `<input>`; the rest-spread sits *last*, so a stray `onChange` replaces the component's
own; and `name` does not do what it looks like. See [Gotchas](#gotchas).

There is no `Tag` sub-component and no render prop: the chip is drawn by TagInput itself,
and a tag is always a plain `string`.

## How a tag is committed

Four paths add a tag, and every one of them runs the same trim → de-duplicate →
`maxTags` → `validateTag` gauntlet:

- **Enter.** Consumed here rather than passed on to a surrounding `<form>` — see
  [Gotchas](#gotchas).
- **Typing a delimiter character.** The default `/[,\n]/` means a comma commits.
- **Paste, when the pasted text matches the delimiter.** The whole clipboard string is
  split and every segment is evaluated in turn, so `"react, , typescript ,,"` yields
  exactly `["react", "typescript"]`. A paste with no delimiter in it is left alone and
  simply becomes the draft.
- **Blur.** Leaving the field commits whatever is sitting in it — a half-typed `typescr`
  becomes a tag. That includes clicking a chip's own remove button, which blurs the input
  before the click lands.

Backspace removes, but only while the draft is empty — the first press with text in the
field just edits that text. There is no highlight-then-confirm step: each press with an
empty draft deletes the last chip outright, so holding the key clears the set.

`delimiter` swaps the regex out entirely:

<!-- example:CustomDelimiter -->
```tsx
<TagInput
  aria-label="Topics"
  delimiter={/[\s,]/}
  placeholder="Space- or comma-separated"
/>
```
<!-- /example -->

The delimiter is only ever tested against the *incoming* string; tags already in `value`
are never re-split, so a `defaultValue` may legally contain a comma even when the
delimiter is a comma.

Pass the regex **without** the `g` or `y` flag. Both make a `RegExp` stateful, and the
component tests the object you handed it — see [Gotchas](#gotchas).

## Limits and validation

`maxTags` is a hard cap checked before every insertion:

<!-- example:MaxTags -->
```tsx
<TagInput
  aria-label="Topics"
  maxTags={3}
  defaultValue={["react", "typescript", "design-systems"]}
/>
```
<!-- /example -->

`validateTag` runs last, on the trimmed candidate, and its return type is the whole API:
`true` accepts, a `string` rejects and shows that string beneath the field, `false`
rejects with no message at all.

<!-- example:ValidateTag -->
```tsx
<TagInput
  aria-label="Topics"
  placeholder="lowercase-with-hyphens"
  validateTag={(tag) =>
    /^[a-z0-9-]+$/.test(tag) || "Use lowercase letters, digits and hyphens only"
  }
/>
```
<!-- /example -->

**Only the string branch gives the user anything to go on.** Hitting the `maxTags` cap,
retyping a tag that already exists, and a `validateTag` that returns `false` are all
silent — and all three still wipe the draft. Typing `typescript` into a full field and
pressing Enter leaves you with an empty input, no chip, and no explanation. Reserve
`false` for candidates the user cannot see (a background de-dupe), and return a string
whenever a human needs to know why. See [Gotchas](#gotchas).

The message is sticky in a useful way: when `validateTag` returns a string the draft is
**kept** so it can be corrected, and the message clears on the next successful commit, or
as soon as an emptied field is blurred.

## Controlled

Leave `value` off and the component owns the list; `defaultValue` seeds it and
`onValueChange` reports every change. Pass `value` and you own it:

<!-- example:Controlled -->
```tsx
<TagInput
  aria-label="Topics"
  value={topics}
  onValueChange={setTopics}
  placeholder="Add a topic…"
/>
```
<!-- /example -->

The mode is locked on the first render, so a `value` that starts `undefined` and later
becomes an array will not switch the component into controlled mode. A `value` with no
`onValueChange` renders a frozen set of chips — and unlike a native input, nothing warns
you.

## In a Field

<!-- example:InField -->
```tsx
<Field error="Add at least one topic.">
  <Label htmlFor="topics">Topics</Label>
  <TagInput id="topics" placeholder="Add a topic…" />
  <FieldError />
</Field>
```
<!-- /example -->

Inside an invalid [Field](field.md), TagInput picks up `aria-invalid="true"` and an
`aria-describedby` pointing at the [FieldError](field-error.md), the same wiring
[Input](input.md) and [Select](select.md) use. The visible [Label](label.md) is still your
job: pair its `htmlFor` with the `id` you give TagInput.

## Error state

<!-- example:ErrorState -->
```tsx
<TagInput error aria-label="Topics" defaultValue={["react"]} />
```
<!-- /example -->

`error` **overrides** the surrounding field, because the resolution is
`error ?? field.invalid` — passing `error={false}` forces a valid-looking control inside an
errored `Field`. Omit the prop to inherit. Either way, a live `validateTag` message paints
the same red border on top of whatever `error` says.

## Disabled

<!-- example:Disabled -->
```tsx
<TagInput aria-label="Topics" disabled defaultValue={["react", "typescript"]} />
```
<!-- /example -->

`disabled` reaches both the text input and every chip's remove button, so the set becomes
read-only rather than merely un-typeable.

## Theme tokens

TagInput has no `.css` file — every colour, radius, gap and duration below is a Tailwind
utility in the `.tsx` that resolves to a contract variable, so overriding the variable
re-tints the control at runtime with the rest of the app.

| Where                           | Utility                                                                       | Override                                  |
| ------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------- |
| Field fill                      | `bg-surface-0`                                                                | `--C-SURFACE-0`                           |
| Field border                    | `border-border-strong`                                                        | `--C-BORDER-STRONG`                       |
| Focus ring & border             | `focus-within:ring-border-focus` `focus-within:border-border-focus`           | `--C-BORDER-FOCUS`                        |
| Error border, ring & message    | `border-status-error` `focus-within:ring-status-error` `text-status-error`    | `--C-STATUS-ERROR`                        |
| Disabled fill                   | `bg-surface-3`                                                                | `--C-SURFACE-3`                           |
| Chip fill                       | `bg-surface-2`                                                                | `--C-SURFACE-2`                           |
| Chip label ink                  | `text-fg-secondary`                                                           | `--C-TEXT-SECONDARY`                      |
| Chip label weight               | `font-semibold`                                                               | `--Semibold-Weight`                       |
| Draft text · remove-hover ink   | `text-fg-primary` `hover:text-fg-primary`                                     | `--C-TEXT-PRIMARY`                        |
| Placeholder · remove glyph      | `placeholder:text-fg-muted` `text-fg-muted`                                   | `--C-TEXT-MUTED`                          |
| Field & chip padding, gaps      | `px-r4` `py-r5` `px-r5` `py-r6` `gap-r6` `mt-r6`                              | `--R-SIZE-4` `--R-SIZE-5` `--R-SIZE-6`    |
| Corner radius                   | `rounded-md` `rounded-sm`                                                     | `--RADIUS-MD` `--RADIUS-SM`               |
| Type scale                      | `text-body-2` `text-body-3`                                                   | `--BodyText-2` `--BodyText-3`             |
| Transition                      | `duration-fast`                                                               | `--DURATION-FAST`                         |

Two of the spacing tokens step up at the 40rem breakpoint along the responsive `r`-scale —
the field's horizontal padding (`--R-SIZE-4`, `0.75rem` → `1.25rem`) and its vertical
padding, which doubles as the chips' horizontal padding (`--R-SIZE-5`, `0.5rem` →
`0.75rem`). `--R-SIZE-6` — the gap between chips, the chips' own vertical padding, and the
message's offset from the field — holds at `0.25rem` on both sides. The type steps are
responsive too: `--BodyText-2` runs `0.8125rem` → `0.875rem` and `--BodyText-3`
`0.75rem` → `0.8125rem`.

The chip is a tighter echo of the field: `--RADIUS-SM` inside `--RADIUS-MD`, one type step
down, `--C-SURFACE-2` on `--C-SURFACE-0`. In `grimdark` both radius tokens are `0`, so the
chips there are square — that is the theme doing its job, not a bug.

Three geometry values are **not** on the contract. The input's `min-w-[6rem]` floor, which
stops the caret being squeezed to nothing once chips wrap; the focus ring's `2px` width;
and the `1px` border. The `12px` remove glyph is a literal too — it is a `size` prop on a
lucide icon, not CSS.

Two measured contrast notes. The chip label clears AA comfortably —
`--C-TEXT-SECONDARY` on `--C-SURFACE-2` is 6.87:1 in the default and `events` themes, 5.32:1 in
`tech`, 5.11:1 in `grimdark`. The remove **glyph** does not: `--C-TEXT-MUTED` on
`--C-SURFACE-2` measures 2.31 / 2.27 / 1.94 / 2.23:1 across those same four themes,
against the 3:1 floor WCAG 1.4.11 sets for a control's graphical affordance. It only
reaches `--C-TEXT-PRIMARY` on hover. Ratios computed from the shipped OKLCH token values in
`@batthewz/response-ui-css`; the same `--C-TEXT-MUTED` ceiling caps the placeholder at
2.10–2.59:1. See the [theme contract](../theme-contract.md) for what the tokens do and do
not promise.

## Gotchas

- **`name` submits the draft, not the tags.** `name` passes through to the inner
  `<input>`, whose value is the in-progress text — not the chip list. Rendering
  `<TagInput name="topics" defaultValue={["react", "typescript"]} />` inside a `<form>` and
  reading `new FormData(form)` yields `[["topics", ""]]`. There is no hidden input per tag.
  Read the value from `onValueChange` (or `value`) and submit it yourself.
- **Spreading `form.field()` onto it crashes on the first keystroke.** The `useForm`
  bindings include an `onChange`, and because TagInput's rest-spread is applied *after* its
  own `onChange={handleChange}`, that binding replaces the internal handler. The store then
  receives a raw DOM event, writes the string `"t"` into an array-typed field, and the next
  render throws `TypeError: tags.map is not a function`. It typechecks clean, because
  `onChange` is `Omit`ted from the prop type and a spread of a typed object skips excess
  property checking. Bind it through the value API instead:

  ```tsx
  const form = useForm<{ topics: string[] }>({ defaultValues: { topics: [] } });

  <TagInput
    aria-label="Topics"
    value={form.watch("topics") as string[]}
    onValueChange={(topics) => form.setValue("topics", topics)}
  />
  ```

- **Rejection destroys what you typed.** The draft is cleared on every path that does not
  produce a message — the `maxTags` cap, a duplicate, and `validateTag` returning `false`.
  The user sees their text vanish and no chip appear. Only the `validateTag`-returns-string
  branch preserves the draft.
- **A `delimiter` carrying `g` or `y` misfires — the component mutates your regex.** Both
  paths call `delimiter.test(...)` on the object you passed, and a stateful regex advances
  its own `lastIndex` across calls. Measured over three entries typed into a fresh field:
  `/;/` gives `["ab", "cd", "ef"]`, but `/;/g` gives `["ab", "ef"]` — the second `;` is
  tested from `lastIndex: 3`, matches nothing, and leaves the raw text `"cd;"` (delimiter
  and all) sitting in the input, to be wiped by the next commit that *does* fire. `/;/y` is
  worse: sticky only ever matches at index 0, so **no** tag is committed and every draft
  keeps its delimiter. Paste alternates the same way, falling through to an ordinary
  un-split paste on every other attempt. The default `/[,\n]/` is flagless; keep yours
  flagless too — the component never needs a global match, only a test and a `split`.
- **A delimiter typed mid-string throws away the tail.** Only the segment *before* the
  first delimiter is committed; the remainder is discarded, not returned to the draft. With
  `abc` in the field, putting the caret after `a` and typing `,` leaves you with one chip
  `a` and an empty input — `bc` is gone. Same shape on paste: an existing draft is wiped by
  a delimited paste rather than merged into it.
- **Paste swallows validation messages.** The paste path evaluates each segment but reads
  only the accept/reject answer, never the message, so a `validateTag` that returns a string
  silently drops the segment. Pasting six topics into a field that requires lowercase can
  add nothing at all and say nothing at all.
- **Enter inside the field never submits the form.** `preventDefault()` runs before the
  commit and before your own `onKeyDown`, unconditionally — so pressing Enter here does not
  submit the surrounding `<form>` even when the draft is empty. Enter from the form's other
  fields still works; give the form an explicit submit button for this one.
- **Your `onKeyDown` / `onPaste` / `onBlur` run second.** They are chained after the
  internal handlers, not before them, so you cannot cancel a commit from your own handler —
  the tag is already added by the time you see the event.
- **Duplicate entries in a controlled `value` break React's keys.** Chips are keyed by the
  tag string. Every internal path de-duplicates, but a `value` prop is taken as given:
  `value={["react", "react"]}` renders and logs React's "two children with the same key"
  error. De-duplicate before you hand the array over.
- **Clicking the wrapper's padding does not focus the field.** The border, the focus ring
  and `className` belong to a plain `<div>` with no click handler; only the text input and
  the chips' remove buttons respond to a click.
- **Client component, with the directive.** TagInput ships its own `"use client"`, so
  importing it straight into an RSC tree works — unlike [Select](select.md), which reads the
  same `Field` context but ships no directive of its own.
- **No per-component CSS.** There is no `TagInput.css`. Both CSS imports are still required
  — the utilities above resolve to tokens from `@batthewz/response-ui-css`.

## Accessibility

The control has no built-in label. `aria-label`, `aria-labelledby` and `id` all pass
through to the inner `<input>`, so name it there — or via a [Field](field.md) +
[Label](label.md) with matching `htmlFor`/`id`.

Each chip's remove button is a real `<button type="button">` with
`aria-label="Remove <tag>"`, so it is reachable by keyboard and announced by name. Each is
also a full tab stop, so a field holding N tags puts N stops in front of the text input —
worth knowing before you allow twenty.

Three gaps to plan around:

- **Nothing announces a tag being added or removed.** The only live region on the component
  is the validation message; committing with Enter, deleting with Backspace, pasting, and
  clicking a remove button all mutate the list in silence. Backspace is the sharpest edge —
  once the draft is empty every press deletes a chip, with no confirmation step and no
  feedback for a screen-reader user.
- **The chips are not a list.** They render as `<span>`s inside a `<div>`, so there is no
  `list`/`listitem` structure and no announced count; a screen reader reaches them only by
  walking the remove buttons. If the set matters, mirror it into your own labelled region.
- **The validation message is not linked to the input.** It is a `<p aria-live="polite">`
  with no `id`, so it is spoken once when it appears and is then unreachable from the field
  itself — `aria-describedby` only ever points at a surrounding `Field`'s error. Keep
  messages short enough to survive a single announcement, or render your own described-by
  text as well.

Visually the error state is border-and-ring colour only, so always pair it with the
message text. Focus is a `focus-within` ring on the wrapper, not `focus-visible`, so it
appears on mouse click as well as on keyboard focus, and it lights up whenever a chip's
remove button takes focus too. Those buttons also keep the browser's own focus outline —
only the text input sets `outline-none` — so tabbing through chips is visible even though
the library draws nothing extra for it. The ring is a 2px box-shadow, so focusing never
shifts the layout. The remove glyph's own contrast is covered under
[Theme tokens](#theme-tokens).

## Related

[Input](input.md) · [Field](field.md) · [FieldError](field-error.md) ·
[Label](label.md) · [Badge](badge.md) · [Select](select.md) · `MultiSelect` · `Combobox` ·
`SearchInput` · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
