# Repeater

The UI over a form array field: one row per entry, a Remove button beside each, an optional
Move up / Move down pair, and an Add button underneath. The list itself never leaves the form
store, so a repeating group validates, submits and resets exactly like any other bound field.

<!-- example:Minimal -->
```tsx
<FormProvider form={form}>
  <Repeater
    form={form}
    name="links"
    defaultItem={() => ({ url: "" })}
    addLabel="Add link"
  >
    {({ name, index }) => (
      <Field name={`${name}.url`}>
        <Label htmlFor={`${name}.url`}>Link {index + 1}</Label>
        <Input
          id={`${name}.url`}
          placeholder="https://example.com"
          {...form.field(`${name}.url`)}
        />
        <FieldError />
      </Field>
    )}
  </Repeater>
</FormProvider>
```
<!-- /example -->

`form` is a `useForm` handle — `const form = useForm({ defaultValues: { links: [{ url: "" }] } })`
— and it appears twice on purpose: `Repeater` reads the array through the `form` prop, while
[Field](field.md) and [FieldError](field-error.md) resolve a row's error from the surrounding
`FormProvider`. Drop the provider and the rows still work, but no row error will ever render.

| Prop          | Type                                    | Default |
| ------------- | --------------------------------------- | ------- |
| `form`        | `FormApi<T>`                            | —       |
| `name`        | the array paths of `T` — see below      | —       |
| `children`    | `(item: RepeaterItem) => ReactNode`     | —       |
| `defaultItem` | `() => ` the row type `name` addresses  | —       |
| `addLabel`    | `string`                                | `"Add"` |
| `min`         | `number`                                | `0`     |
| `max`         | `number`                                | —       |
| `reorderable` | `boolean`                               | `false` |
| `disabled`    | `boolean`                               | `false` |
| `className`   | `string`                                | —       |
| `classNames`  | `{ list?, item?, fields?, itemActions? }` — see [Slots](#slots) | — |
| `itemActionProps` | `IconButton` props, minus the ones Repeater owns — see [Slots](#slots) | — |
| `addButtonProps`  | `Button` props, minus the ones Repeater owns — see [Slots](#slots) | — |

Six further props are functions that produce the component's own English — `removeLabel`,
`moveUpLabel` and `moveDownLabel` name the row controls, and `addAnnouncement` /
`removeAnnouncement` / `moveAnnouncement` write its live region. All six are documented
together under [Accessibility](#accessibility), because what they are *for* is the point of
them.

The first four are required. There is no rest spread and no `ref`: the prop type is a closed
object rather than an intersection with `div` props, so `<Repeater id="links">` is a compile
error rather than a prop that silently vanishes. `className` merges onto the outer column
through tailwind-merge, so `className="gap-r3"` replaces the built-in gap instead of fighting
it — that is the gap between the row list and the Add button. The gap *between rows* belongs
to the list inside it, and is `classNames.list`; see [Slots](#slots).

## The row API

`children` is a render prop, called once per array entry. It receives the row's slice of the
array's state plus the three mutations that act on it:

| Field      | Type         | What it is                                                        |
| ---------- | ------------ | ----------------------------------------------------------------- |
| `id`       | `number`     | Stable id that survives reorders — already applied as the row's React `key` |
| `name`     | `string`     | This row's field-path prefix, e.g. `links.0`. Compose control names off it |
| `index`    | `number`     | Zero-based position in the array                                  |
| `count`    | `number`     | Current number of rows                                            |
| `isFirst`  | `boolean`    | `index === 0`                                                     |
| `isLast`   | `boolean`    | `index === count - 1`                                             |
| `remove`   | `() => void` | Drops this row. Does nothing once `count` is down to `min`        |
| `moveUp`   | `() => void` | Moves this row one place earlier. Does nothing on the first row   |
| `moveDown` | `() => void` | Moves this row one place later. Does nothing on the last row      |

The object is exported as `RepeaterItem`, so a row that outgrows an inline arrow can be lifted
into its own component with a real prop type.

`name` is positional, not identity-based: it is rebuilt as `` `${name}.${index}` `` on every
render, so remove row 0 and what was `links.1` becomes `links.0`. `id` is the thing that
follows a row through a reorder: the component spends it on the React key, and the form store
uses it to move each row's error and touched state to its new index — see
[Gotchas](#gotchas).

## Reordering

`reorderable` adds a Move up / Move down pair to every row's control column. The first row's
Move up and the last row's Move down are rendered `disabled`, and the reorder is a real DOM
move of the keyed row — so the focused control travels with the row it belongs to.

<!-- example:Reorderable -->
```tsx
<FormProvider form={form}>
  <Repeater
    form={form}
    name="steps"
    defaultItem={() => ({ text: "" })}
    addLabel="Add step"
    reorderable
  >
    {({ name, index }) => (
      <Field name={`${name}.text`}>
        <Label htmlFor={`${name}.text`}>Step {index + 1}</Label>
        <Input id={`${name}.text`} {...form.field(`${name}.text`)} />
        <FieldError />
      </Field>
    )}
  </Repeater>
</FormProvider>
```
<!-- /example -->

Because it is a pair of ordinary buttons rather than drag-and-drop, reordering is fully
keyboard-operable with no extra work from you — and every move is announced. See
[Accessibility](#accessibility) for what those buttons say, and why the sentence names the
row's old position as well as its new one.

## Bounds

`min` disables every Remove button — and neutralises the render prop's `remove` — once the row
count reaches it. `max` disables Add.

<!-- example:Bounded -->
```tsx
<FormProvider form={form}>
  <Repeater
    form={form}
    name="recipients"
    defaultItem={() => ({ email: "" })}
    addLabel="Add recipient"
    min={1}
    max={5}
  >
    {({ name, index }) => (
      <Field name={`${name}.email`}>
        <Label htmlFor={`${name}.email`}>Recipient {index + 1}</Label>
        <Input id={`${name}.email`} type="email" {...form.field(`${name}.email`)} />
        <FieldError />
      </Field>
    )}
  </Repeater>
</FormProvider>
```
<!-- /example -->

`min` is a floor on removal, not a guarantee of rows: it never adds anything. A `min={1}`
Repeater over an empty array renders zero rows and an enabled Add button, so seed
`defaultValues` with the rows you want to start from.

## More than one field per row

A row is whatever the render prop returns. Compose every control's name off the row's `name`
prefix and lay them out however you like — the control column is a sibling of your content, so
it stays put.

<!-- example:MultipleFieldsPerRow -->
```tsx
<FormProvider form={form}>
  <Repeater
    form={form}
    name="contacts"
    defaultItem={() => ({ fullName: "", email: "" })}
    addLabel="Add contact"
  >
    {({ name, index }) => (
      <div className="flex gap-r5">
        <Field name={`${name}.fullName`} className="flex-1">
          <Label htmlFor={`${name}.fullName`}>Contact {index + 1} name</Label>
          <Input
            id={`${name}.fullName`}
            placeholder="Ada Lovelace"
            {...form.field(`${name}.fullName`)}
          />
          <FieldError />
        </Field>
        <Field name={`${name}.email`} className="flex-1">
          <Label htmlFor={`${name}.email`}>Contact {index + 1} email</Label>
          <Input
            id={`${name}.email`}
            type="email"
            {...form.field(`${name}.email`)}
          />
          <FieldError />
        </Field>
      </div>
    )}
  </Repeater>
</FormProvider>
```
<!-- /example -->

## Your own row controls

Nothing stops you rendering the row's mutations as your own buttons, which is the way to give
each one a name that says which row it acts on:

<!-- example:CustomRowControls -->
```tsx
<FormProvider form={form}>
  <Repeater
    form={form}
    name="questions"
    defaultItem={() => ({ prompt: "" })}
    addLabel="Add question"
  >
    {({ name, index, count, isFirst, isLast, moveUp, moveDown, remove }) => (
      <Field name={`${name}.prompt`}>
        <Label htmlFor={`${name}.prompt`}>
          Question {index + 1} of {count}
        </Label>
        <Input id={`${name}.prompt`} {...form.field(`${name}.prompt`)} />
        <FieldError />
        <div className="flex gap-r5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isFirst}
            onClick={moveUp}
          >
            Move question {index + 1} earlier
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLast}
            onClick={moveDown}
          >
            Move question {index + 1} later
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={remove}>
            Delete question {index + 1}
          </Button>
        </div>
      </Field>
    )}
  </Repeater>
</FormProvider>
```
<!-- /example -->

The built-in control column still renders alongside them — there is no prop to suppress it, so
this adds controls rather than replacing them. If you want *only* your own, reach for
`useFieldArray` directly; `Repeater` is the pre-built UI over exactly that hook.

## In a form

<!-- example:InAForm -->
```tsx
<FormProvider form={form}>
  <form {...form.props}>
    <Field name="title">
      <Label htmlFor="agenda-title">Meeting title</Label>
      <Input id="agenda-title" {...form.field("title")} />
      <FieldError />
    </Field>
    <Repeater
      form={form}
      name="agenda"
      defaultItem={() => ({ item: "" })}
      addLabel="Add agenda item"
      min={1}
    >
      {({ name, index }) => (
        <Field name={`${name}.item`}>
          <Label htmlFor={`${name}.item`}>Agenda item {index + 1}</Label>
          <Input id={`${name}.item`} {...form.field(`${name}.item`)} />
          <FieldError />
        </Field>
      )}
    </Repeater>
    <FormActions>
      <Button type="button" variant="secondary" onClick={() => form.reset()}>
        Discard
      </Button>
      <Button type="submit">Publish agenda</Button>
    </FormActions>
  </form>
</FormProvider>
```
<!-- /example -->

Every button Repeater renders — Add, Remove, and both Move controls — carries an explicit
`type="button"`, so none of them submits the enclosing form.

## Disabling

<!-- example:Disabled -->
```tsx
<FormProvider form={form}>
  <Repeater
    form={form}
    name="links"
    defaultItem={() => ({ url: "" })}
    addLabel="Add link"
    disabled
  >
    {({ name, index }) => (
      <Field name={`${name}.url`}>
        <Label htmlFor={`${name}.url`}>Link {index + 1}</Label>
        <Input id={`${name}.url`} {...form.field(`${name}.url`)} />
        <FieldError />
      </Field>
    )}
  </Repeater>
</FormProvider>
```
<!-- /example -->

Repeater's `disabled` disables its own Add/Remove/Move buttons **and** the row fields: each
row's children render inside a `<fieldset disabled>`, which disables every native control
within it. Custom row controls that are not native form elements read
`RepeaterItem.disabled` instead — see [Gotchas](#gotchas).

## Slots

`className` addresses the outer column. `classNames` addresses the four elements inside it —
class strings only, and the keys are typed, so a misspelled one is a compile error rather than
a prop that does nothing.

| Slot          | Element                       | What it addresses                          |
| ------------- | ----------------------------- | ------------------------------------------ |
| `list`        | the `role="list"` `div`       | the row container, and so the gap between rows |
| `item`        | every `role="listitem"` `div` | each row's own layout                       |
| `fields`      | every row's `fieldset`        | the region your render prop fills           |
| `itemActions` | every row's control cluster   | the Move/Remove buttons' box                |

The last three land on **every** row: the rows are generated from the array field, so no key
can name the third one.

```tsx
<Repeater form={form} name="links" defaultItem={() => ({ url: "" })}
  classNames={{ list: "gap-r6", itemActions: "pt-0" }}
>
  {({ name }) => <Input {...form.field(`${name}.url`)} />}
</Repeater>
```

Row *content* is the render prop's, not a slot's — see [The row API](#the-row-api).

The four buttons are other components, not elements Repeater classes, so they take **prop
bags** rather than class strings: there is no base class here for a slot to merge with, and
what a caller usually wants on the Add button is its `variant`.

| Prop              | Target                                        | What it addresses                          |
| ----------------- | --------------------------------------------- | ------------------------------------------ |
| `itemActionProps` | all three [IconButton](icon-button.md)s, on every row | their whole prop surface, minus what Repeater owns |
| `addButtonProps`  | the Add [Button](button.md)                   | its whole prop surface, minus what Repeater owns |

```tsx
<Repeater form={form} name="links" defaultItem={() => ({ url: "" })}
  itemActionProps={{ className: "text-fg-muted" }}
  addButtonProps={{ variant: "ghost", size: "md" }}
>
  {({ name }) => <Input {...form.field(`${name}.url`)} />}
</Repeater>
```

`itemActionProps` reaches Move up, Move down **and** Remove, on every row — the rows are
generated from the array field, so no key can name the third one, and a bag cannot tell the
three controls apart. Where you need them to differ, or to be *named* per row, render your own
inside the row and drive them from the `remove` / `moveUp` / `moveDown` callbacks — see
[Your own row controls](#your-own-row-controls).

What Repeater owns is not yours to set, in either bag, and each is a compile error: the
controls' accessible names (`removeLabel`, `moveUpLabel`, `moveDownLabel`, `addLabel`), their
`disabled` state (it carries the `min` / `max` bounds and the first/last row), `onClick` (it is
the mutation itself), `type`, `ref` and `children`. `variant` and `size` on the Add button are
*defaults*, so those two the bag does replace. `className` in either bag is merged by the
button itself, after its own base classes.

**The live region takes no class, deliberately.** Its `sr-only` is what keeps the
announcements off the screen; a class route there lets a caller print every add, removal and
reorder into the layout. See [Accessibility](#accessibility).

## Theme tokens

Repeater has no stylesheet of its own and sets no colour, radius, border or type. It reads
exactly three variables, all of them spacing, through Tailwind utilities in its layout:

| Where                                  | Utility            | Override     |
| -------------------------------------- | ------------------ | ------------ |
| Gap between rows, and above Add         | `gap-r4`           | `--R-SIZE-4` |
| Gutter between a row and its controls   | `gap-r5`           | `--R-SIZE-5` |
| Gap within the control column, and its top offset | `gap-r6` `pt-r6` | `--R-SIZE-6` |

All three sit on the responsive `r`-scale, so two of them step up at the 40rem breakpoint with
no breakpoint utilities from you: the row gap goes `0.75rem` → `1.25rem` and the control gutter
`0.5rem` → `0.75rem`, while the control-column gap holds at `0.25rem` on both sides.

Everything with a colour in a rendered Repeater belongs to something else: the Add button is a
[Button](button.md) at `variant="secondary" size="sm"`, the row controls are
[IconButton](icon-button.md)s, and the fields are whatever you put in the rows. Their variables
are documented on their own pages, and there is no Repeater variable to override — but there is
a per-instance route: `addButtonProps` and `itemActionProps` reach those buttons from the call
site, so a single Repeater can differ from the rest without a theme change. See
[Slots](#slots), and the [theme contract](../theme-contract.md) for the `r`-scale itself.

## Gotchas

- **Validation errors follow their row through a mutation — via the ids, not the indices.**
  The store's error and touched maps are keyed by dotted path (`links.0.url`), so on every
  array mutation it remaps those keys through an old-index → new-index map derived from the
  stable `id`s: a row that moves takes its message and its `aria-invalid` along, and a row that
  is removed takes them with it. Submit a form where the middle row is invalid, remove a valid
  row above it, and the message travels down with its row (measured). Nothing needs to be
  re-run afterwards. (Before this was fixed the mutations rewrote only the values, and a
  message stayed pinned to whichever row inherited the index.)
- **Removing a row keeps the keyboard where it was.** The Remove button you just pressed
  unmounts with its row, so focus moves to the Remove button now sitting at that index — or
  to the previous row's when the last row goes, or to Add when the only row goes — instead
  of falling to the document body. That focus move names the *control*
  the keyboard landed on; what happened to the row is a separate sentence, written to the live
  region described under [Accessibility](#accessibility).
- **`disabled` reaches the row fields.** Each row's children are wrapped in a `<fieldset
  disabled>`, which disables every native control inside it, and `RepeaterItem` carries
  `disabled` so custom row controls that are not form elements can honour it too.
- **`name` and `defaultItem` are typed against your form's values.** `name` accepts only the
  dotted paths of `T` that land on an array — `"links"`, and `"sections.0.rows"` for an array
  nested inside one — so `name="lnks"` is a compile error, with TypeScript offering `"links"`
  as the correction. It used to compile, render zero rows, and write a brand-new `lnks` array
  into the submitted values alongside the real, still-empty `links`, with nothing warning.
  `defaultItem`'s return type is then derived from that path, so a row built with the wrong
  shape is caught too. Two limits worth knowing: the paths are enumerated three segments deep,
  and a form typed as a bare `Record<string, unknown>` falls back to plain `string` — which is
  also what a generic wrapper component around `Repeater` gets, and it is not enough to satisfy
  the constraint, so wrap `useFieldArray` instead of `Repeater` when the value type is a type
  parameter.
- **`min` blocks removal on both paths, `max` only guards the button.** `remove()` from the
  render prop respects `min` (it no-ops), but there is no `append` on `RepeaterItem`, so `max`
  only ever has the Add button to disable.
- **Client component.** `Repeater` is marked `"use client"` and `useForm` is a client hook, so a
  repeating group cannot live directly in an RSC tree.

## Accessibility

The built-in controls are [IconButton](icon-button.md)s with a required `aria-label`, and each
one's lucide glyph is `aria-hidden="true"`, so every button announces exactly once and never as
"button, button". The Add button pairs its icon with the visible `addLabel` text.

- **Each row's buttons are named for their row.** `removeLabel`, `moveUpLabel` and
  `moveDownLabel` are called with the row index and the count; the defaults are
  `"Remove item 3"`, `"Move item 3 up"` and `"Move item 3 down"`. Pass your own to translate
  them, or to name the row by its content rather than its position. Give the row's own fields a
  distinguishing name too — every example above folds `index + 1` into the row's
  [Label](label.md) and builds its `htmlFor`/`id` pair off the row's `name`.
- **The rows are a `role="list"` of `role="listitem"`s**, so a screen reader can say how many
  there are and which one it is in.
- **Adding, removing and reordering a row are announced.** All three write one sentence into a
  single polite, visually-hidden live region (`role="status" aria-live="polite"`) that the
  component keeps mounted for its whole life — N rows are never N live regions. The defaults are
  `"Added item 3. 3 items."`, `"Removed item 2. 2 items."` and
  `"Moved item 2 to position 1 of 3."`, with the count as it stands *after* the change, and all
  three come from a prop so they can be translated or silenced:

  ```tsx
  <Repeater
    form={form}
    name="links"
    defaultItem={() => ({ url: "" })}
    addAnnouncement={(index, count) => `Ligne ${index + 1} ajoutée. ${count} lignes.`}
    removeAnnouncement={(index, count) => `Ligne ${index + 1} supprimée. ${count} lignes.`}
    moveAnnouncement={(from, to, count) =>
      `Ligne ${from + 1} déplacée en position ${to + 1} sur ${count}.`
    }
  >
    {({ name }) => <Input {...form.field(`${name}.url`)} />}
  </Repeater>
  ```

  Return `""` from any of them to say nothing. The same shape — a function that takes what needs
  interpolating and returns the sentence — is what `removeLabel` and its siblings use above,
  and what [TagInput](tag-input.md) uses for its own add/remove announcements. All three fire
  from the render prop's own `remove` / `moveUp` / `moveDown` too, so custom row controls
  announce exactly as the built-in ones do, and a move that would run off either end of the list
  announces nothing because it does nothing.
- **The reorder sentence names both ends of the move on purpose.** The control names are
  positional, so the instant a row moves every remaining Move and Remove button is renamed:
  "Move item 2 up" now points at a different row. `"Moved item 2 to position 1 of 3."` is the
  bridge between the numbering the user was reading and the numbering they are about to hear —
  a sentence carrying only one end would read as contradicting the names. If you name your rows
  by their content instead (via `removeLabel` and friends), replace `moveAnnouncement` to match,
  or the two channels will describe the same row differently.
- **A blocked bound is a disabled button with no reason attached.** At `max` the Add button is
  `disabled`, which removes it from the tab order entirely — a keyboard user tabs straight past
  it and is told nothing. Render a visible "5 recipients maximum" line next to it.
- **Reordering is fully keyboard-operable**, which drag-and-drop lists usually are not. Note
  that the button dead-ends at the ends of the list: press Move up until the row reaches the
  top and that same button renders `disabled`, so the interaction the user was repeating
  stops responding and they have to tab away to carry on.

## Related

[Field](field.md) · [FieldError](field-error.md) · [Input](input.md) · [Label](label.md) ·
[FormActions](form-actions.md) · [Button](button.md) · [IconButton](icon-button.md) ·
`useForm` · `useFieldArray` · [Extending components](../extending.md) ·
[Theme contract](../theme-contract.md)
