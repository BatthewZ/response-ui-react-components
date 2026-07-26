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
| `onChange`      | `(tags: string[]) => void`            | —                           |
| `name`          | `string`                              | — (no hidden inputs)        |
| `maxTags`       | `number`                              | — (no cap)                  |
| `validateTag`   | `(tag: string) => boolean \| string`  | — (everything accepted)     |
| `delimiter`     | `RegExp`                              | `/[,\n]/`                   |
| `addAnnouncement`    | `(added: string[], count: number) => string`                    | `` `Added react, redux. 4 tags.` ``    |
| `removeAnnouncement` | `(tag: string, count: number) => string`                        | `` `Removed react. 3 tags.` ``         |
| `rejectAnnouncement` | `(reason: "duplicate" \| "max" \| "invalid", tag: string, count: number) => string` | `` `react is already in the list.` `` |
| `placeholder`   | `string`                              | —                           |
| `error`         | `boolean`                             | `Field` state, else `false` |
| `disabled`      | `boolean`                             | —                           |
| `className`     | `string`                              | — (lands on the wrapper)    |
| `ref`           | `Ref<HTMLInputElement>`               | —                           |
| …rest           | `<input>` props minus `value` / `defaultValue`; `onChange` is re-typed above | — |

`onChange` is **not** a DOM handler here: it is declared with the component's own value type
and fires with the committed `string[]`, beside `onValueChange` and with the same payload. It
exists so `{...form.field<string[]>("tags")}` binds directly — see [Gotchas](#gotchas).

Two of the rest have sharp edges. `className` styles the **bordered wrapper**, while every
other passthrough prop — `id`, `style`, `aria-*`, `onFocus` — lands on the inner text
`<input>`. And `name` is intercepted rather than passed through: it names one hidden input per
committed tag, not the draft field. See [Gotchas](#gotchas).

There is no `Tag` sub-component and no render prop: TagInput draws each chip itself, as a
default-variant [Badge](badge.md) wrapping the label and a remove button, and a tag is
always a plain `string`.

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

**Only the string branch puts anything on screen.** Hitting the `maxTags` cap, retyping a tag
that already exists, and a `validateTag` that returns `false` all leave the field looking
untouched: no message, no disabled state. Typing `typescript` into a full field and pressing
Enter leaves you with no chip and no visible explanation — though your text is still there to
correct, and the refusal *is* announced (see [Announcements](#announcements)). Reserve `false` for candidates the user
cannot see (a background de-dupe), and return a string whenever a human needs to read why.

**A rejected draft is never thrown away.** Whatever the reason — cap, duplicate, `false`, or a
string message — the text stays in the field so it can be fixed. Only a successful commit (or
blank text) clears it, and the message clears on the next successful commit.

## Announcements

Committing a tag, deleting one and refusing one are all invisible events for anyone not
watching the chips, so each writes a sentence into **one** polite, visually-hidden live region
(`role="status" aria-live="polite"`) that the component keeps mounted for its whole life. N
chips are never N live regions, and one commit is one region write: pasting `a, b, c`
announces `"Added a, b, c. 3 tags."` rather than three separate sentences.

The English is a default, not a fixture. Every sentence comes from a prop that receives the
values to interpolate and returns the string, the same shape [Repeater](repeater.md) uses for
its own announcements and its `removeLabel` family:

```tsx
<TagInput
  aria-label="Sujets"
  addAnnouncement={(added, count) => `${added.join(", ")} ajouté. ${count} sujets.`}
  removeAnnouncement={(tag, count) => `${tag} supprimé. ${count} sujets.`}
  rejectAnnouncement={(reason, tag) =>
    reason === "duplicate" ? `${tag} est déjà dans la liste.` : `${tag} refusé.`
  }
/>
```

Return `""` from any of them to say nothing at all — for a field that already narrates its own
state elsewhere, say.

Three rules the defaults follow, worth keeping if you replace them:

- **`addAnnouncement` takes the whole batch**, because one paste commits several tags and a
  per-tag write would leave only the last one in the region. `removeAnnouncement` takes a
  single tag because no path removes more than one at a time.
- **A refusal never announces an add.** `rejectAnnouncement` is called for the `maxTags` cap, a
  duplicate, and a `validateTag` that returns `false` — the three paths that change nothing on
  screen. Where a commit both adds and refuses (`a, b, c` pasted into a field that already
  holds `b`), the two sentences are joined into the one write.
- **A `validateTag` string is not announced twice.** That message renders in its own
  `aria-live` paragraph beneath the field, so `rejectAnnouncement` is skipped for it entirely.

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
errored [Field](field.md). Omit the prop to inherit. Either way, a live `validateTag` message paints
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
| Draft text · remove-hover ink   | `text-fg-primary` `hover:text-fg-primary`                                     | `--C-TEXT-PRIMARY`                        |
| Placeholder · remove glyph      | `placeholder:text-fg-muted` `text-fg-muted`                                   | `--C-TEXT-MUTED`                          |
| Field padding, gaps             | `px-r4` `py-r5` `gap-r6` `mt-r6`                                              | `--R-SIZE-4` `--R-SIZE-5` `--R-SIZE-6`    |
| Corner radius                   | `rounded-md` `rounded-sm`                                                     | `--RADIUS-MD` `--RADIUS-SM`               |
| Type scale                      | `text-body-2` `text-body-3`                                                   | `--BodyText-2` `--BodyText-3`             |
| Transition                      | `duration-fast`                                                               | `--DURATION-FAST`                         |

The chip's own fill, ink, weight and padding are **not** in that table, because TagInput
does not draw them: the chip is a default-variant [Badge](badge.md), so `--C-SURFACE-2`,
`--C-TEXT-SECONDARY`, `--Semibold-Weight`, `--RADIUS-SM` and `--BodyText-3` reach it
through Badge's own utilities. Override those variables and every Badge in the app moves
with the chips; see [Badge's theme tokens](badge.md#theme-tokens). The one class TagInput
adds to the chip is `gap-r6`, to space the label from its remove button.

Two of the spacing tokens step up at the 40rem breakpoint along the responsive `r`-scale —
the field's horizontal padding (`--R-SIZE-4`, `0.75rem` → `1.25rem`) and its vertical
padding (`--R-SIZE-5`, `0.5rem` → `0.75rem`, which is also the value Badge uses for the
chips' horizontal padding). `--R-SIZE-6` — the gap between chips, the gap inside a chip,
and the message's offset from the field — holds at `0.25rem` on both sides. The type steps
are responsive too: `--BodyText-2` runs `0.8125rem` → `0.875rem` and `--BodyText-3`
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

- **`name` submits one entry per tag, so read it with `getAll`.** It is kept off the draft
  input — a half-typed word is not a value worth submitting — and instead names a
  `<input type="hidden">` for each committed tag. `<TagInput name="topics" defaultValue={["react",
  "typescript"]} />` inside a `<form>` gives a `FormData` of
  `[["topics", "react"], ["topics", "typescript"]]`, which means `formData.get("topics")`
  returns only `"react"` and `formData.getAll("topics")` returns both. With no tags there are
  no hidden inputs and therefore **no `topics` key at all**, not an empty string — a server
  reading the field has to treat absent as `[]`.
- **`onChange` hands you an array, not an event.** The prop is declared with the component's
  own value type, which is what makes the advertised binding work — spread `form.field()` and
  the store receives `string[]`:

  ```tsx
  const form = useForm<{ topics: string[] }>({ defaultValues: { topics: [] } });

  <TagInput aria-label="Topics" {...form.field<string[]>("topics")} />
  ```

  The cost is that anything expecting `onChange(e)` gets `onChange(tags)` and will read
  `e.target` as `undefined`. Use `onValueChange` for your own side effects and leave `onChange`
  to the form layer. (Before this was fixed the same spread typechecked clean and threw
  `TypeError: tags.map is not a function` on the first keystroke.)

- **A `delimiter` carrying `g` or `y` is safe to pass.** The component works from a flagless
  copy of your regex, so `.test()` never advances your object's `lastIndex` and a `/;/g` or
  `/;/y` delimiter commits exactly what `/;/` does. Your `RegExp` is never mutated.
- **A delimiter typed mid-string keeps the tail.** Every delimited segment is committed in
  turn and the trailing one becomes the new draft, so a change event carrying `a,b,c` leaves
  chips `a` and `b` with `c` in the field. A paste is merged onto whatever was already
  half-typed rather than replacing it, and it commits its trailing segment too.
- **A rejected segment stops the run.** If one segment of a delimited string is refused, it and
  everything after it are handed back to the draft with any message shown, rather than being
  eaten silently. `validateTag`'s string messages surface on the paste path as well.
- **Enter inside the field never submits the form.** `preventDefault()` runs before the
  commit and before your own `onKeyDown`, unconditionally — so pressing Enter here does not
  submit the surrounding `<form>` even when the draft is empty. Enter from the form's other
  fields still works; give the form an explicit submit button for this one.
- **Your `onKeyDown` / `onPaste` / `onBlur` run second.** They are chained after the
  internal handlers, not before them, so you cannot cancel a commit from your own handler —
  the tag is already added by the time you see the event.
- **Duplicate entries in a controlled `value` render twice.** Every internal path
  de-duplicates, but a `value` prop is taken as given, so `value={["react", "react"]}` shows
  two chips — a faithful picture of your array, and no longer a React key collision.
  De-duplicate before you hand the array over if that is not what you meant.
- **Clicking the wrapper's padding focuses the field.** The bordered box is the control's hit
  area, not just its frame: a press that lands on the box itself is redirected to the text
  input, while a press on a chip or its remove button is left alone.
- **Client component, with the directive.** TagInput ships its own `"use client"`, so
  importing it straight into an RSC tree works — unlike [Select](select.md), which reads the
  same [Field](field.md) context but ships no directive of its own.
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

- **Every change to the set is announced**, through the one polite live region described under
  [Announcements](#announcements): Enter, a typed delimiter, a paste, Backspace and a chip's
  remove button all write a sentence there, as do the three refusals that change nothing on
  screen. Backspace is still the sharpest edge — once the draft is empty every press deletes a
  chip with no confirmation step — but it is no longer a silent one.
- **The chips are a `role="list"` of `role="listitem"`s**, so a screen reader can say how many
  there are and which one it is on rather than reaching them only by walking the remove
  buttons. The wrapper carrying `role="list"` is `display: contents`: a `list` may own only
  `listitem`s and the text input is a sibling of the chips, so the wrapper needs the role
  without a box of its own. Both engines this was measured in (Firefox 146, Chrome) expose the
  role across `display: contents` and lay the chips out identically to no wrapper at all; the
  list is not rendered at all while there are no chips, so nothing announces an empty list.
- **The validation message doubles as an `aria-describedby` target.** It is a
  `<p aria-live="polite">` with its own `id`, appended to any surrounding [Field](field.md)'s
  error id, so it is both spoken when it appears and reachable from the field afterwards. Keep
  it short enough to survive a single announcement all the same.

One gap remains: **a chip's remove button drops focus when it unmounts.** Removing any chip
leaves focus on `<body>` (measured), unlike [Repeater](repeater.md), which moves focus to the
successor control. The removal is announced either way.

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
[Label](label.md) · [Badge](badge.md) · [Select](select.md) · [MultiSelect](multi-select.md) · [Combobox](combobox.md) ·
[SearchInput](search-input.md) · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
