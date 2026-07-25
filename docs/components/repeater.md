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

| Prop          | Type                                | Default |
| ------------- | ----------------------------------- | ------- |
| `form`        | `FormApi<T>`                        | —       |
| `name`        | `string`                            | —       |
| `children`    | `(item: RepeaterItem) => ReactNode` | —       |
| `defaultItem` | `() => unknown`                     | —       |
| `addLabel`    | `string`                            | `"Add"` |
| `min`         | `number`                            | `0`     |
| `max`         | `number`                            | —       |
| `reorderable` | `boolean`                           | `false` |
| `disabled`    | `boolean`                           | `false` |
| `className`   | `string`                            | —       |

The first four are required. There is no rest spread and no `ref`: the prop type is a closed
object rather than an intersection with `div` props, so `<Repeater id="links">` is a compile
error rather than a prop that silently vanishes. `className` merges onto the outer column
through tailwind-merge, so `className="gap-r3"` replaces the built-in row gap instead of
fighting it.

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
keyboard-operable with no extra work from you — see [Accessibility](#accessibility) for what
those buttons do and don't announce.

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

Repeater's `disabled` reaches its own buttons only. The row fields come from `form.field()`,
which reads `useForm`'s `disabled` option, so a fully inert repeating group needs both — see
[Gotchas](#gotchas).

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
[IconButton](icon-button.md)s, and the fields are whatever you put in the rows. Re-tint those on
their own pages; there is nothing here to override. See the
[theme contract](../theme-contract.md) for the `r`-scale itself.

## Gotchas

- **Validation errors follow their row through a mutation — via the ids, not the indices.**
  The store's error and touched maps are keyed by dotted path (`links.0.url`), so on every
  array mutation it remaps those keys through an old-index → new-index map derived from the
  stable `id`s: a row that moves takes its message and its `aria-invalid` along, and a row that
  is removed takes them with it. Submit a form where the middle row is invalid, remove a valid
  row above it, and the message travels down with its row (measured). Nothing needs to be
  re-run afterwards. (Before this was fixed the mutations rewrote only the values, and a
  message stayed pinned to whichever row inherited the index.)
- **Removing a row throws focus to the document body.** The Remove button you just pressed is
  inside the row that unmounts, so a keyboard or screen-reader user is dumped back to the top
  of the page with no announcement. There is no focus-restoration hook to opt into.
- **`disabled` does not disable the row fields.** It is applied to Repeater's own Add, Remove
  and Move buttons and nowhere else; a row's `<input>` stays fully editable. `RepeaterItem`
  carries no `disabled` either, so custom row controls can't even read it. Pass `disabled: true`
  to `useForm` to freeze the fields, and both if you want the whole group inert.
- **Every row's buttons share one accessible name.** `"Remove item"`, `"Move up"` and
  `"Move down"` are hard-coded English literals with no prop to change them — `addLabel` is the
  only configurable string. Five rows announce five identical `"Remove item, button"`s.
- **`name` and `defaultItem` are not typed against your form's values.** `name` is a bare
  `string` and `defaultItem` returns `unknown`, so a typo compiles: `name="lnks"` renders zero
  rows, and pressing Add then writes a brand-new `lnks` array into the submitted values
  alongside the real, still-empty `links`. Nothing warns.
- **`min` blocks removal on both paths, `max` only guards the button.** `remove()` from the
  render prop respects `min` (it no-ops), but there is no `append` on `RepeaterItem`, so `max`
  only ever has the Add button to disable.
- **Client component.** `Repeater` is marked `"use client"` and `useForm` is a client hook, so a
  repeating group cannot live directly in an RSC tree.

## Accessibility

The built-in controls are [IconButton](icon-button.md)s with a required `aria-label`, and each
one's lucide glyph is `aria-hidden="true"`, so every button announces exactly once and never as
"button, button". The Add button pairs its icon with the visible `addLabel` text.

- **Give the row's own fields the distinguishing name.** The button labels are fixed and
  identical across rows, so a screen-reader user's only handle on "which row" is what you render
  inside it. Every example above folds `index + 1` into the row's [Label](label.md) and builds
  its `htmlFor`/`id` pair off the row's `name`, which keeps both the wording and the generated
  ids unique per row.
- **Nothing announces a row appearing or disappearing.** Rows are plain `<div>`s: no
  `role="list"`/`listitem`, no `<fieldset>`/`<legend>`, no live region. Adding a row is silent,
  and removing one is silent *and* drops focus. If the count is load-bearing, render your own
  `aria-live` message.
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
