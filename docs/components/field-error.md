# FieldError

The inline validation message for a form field. Inside a `Field` it renders that field's
error with its id already wired to the input's `aria-describedby`; on its own it just
styles whatever message you pass. It renders nothing when there is no error, so you can
leave it mounted unconditionally.

<!-- example:Minimal -->
```tsx
<FieldError>Enter a valid email address.</FieldError>
```
<!-- /example -->

| Prop        | Type                          | Default                |
| ----------- | ----------------------------- | ---------------------- |
| `children`  | `ReactNode`                   | the `Field`'s error    |
| `id`        | `string`                      | the `Field`'s `errorId` |
| `className` | `string`                      | —                      |
| `ref`       | `Ref<HTMLParagraphElement>`   | —                      |
| …rest       | props of `<p>`                | —                      |

Two of these fall back to `Field` context: omit `children` and it shows the field's error,
omit `id` and it adopts the field's `errorId`. Outside a `Field` both fall back to nothing,
and with no content the component renders `null`. See [Gotchas](#gotchas).

## Inside a Field

`Field` owns the error. Render an empty `FieldError` in it and the message appears from
context, carrying the `errorId` that the input's `aria-describedby` already points at — no
props to thread through.

<!-- example:InsideField -->
```tsx
<Field error="Enter a valid email address.">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" defaultValue="ada@" />
  <FieldError />
</Field>
```
<!-- /example -->

## Rich content

`children` is any `ReactNode`, so a message can carry inline emphasis or a recovery link.
Explicit children always win over the field-derived error.

<!-- example:RichContent -->
```tsx
<FieldError>
  That username is taken. <a href="/signin">Sign in instead?</a>
</FieldError>
```
<!-- /example -->

## Announce politely

The default `role="alert"` is assertive — it interrupts a screen reader the moment the
message mounts. Because props spread after the defaults, pass `role="status"` to make it a
polite live region instead, which suits validation that fires on every keystroke.

<!-- example:Polite -->
```tsx
<FieldError role="status">Checking availability…</FieldError>
```
<!-- /example -->

## Theme tokens

FieldError has no `.css` of its own; its two Tailwind utilities both resolve to contract
variables, so overriding a variable re-tints every field error at runtime with the rest of
the app.

| Where             | Utility             | Override           |
| ----------------- | ------------------- | ------------------ |
| Message colour    | `text-status-error` | `--C-STATUS-ERROR` |
| Message type scale | `text-body-3`      | `--BodyText-3`     |

`text-body-3` is the smallest of the three responsive body sizes and steps up at the 640px
breakpoint with no work from you; `text-status-error` is the same red the invalid input
border uses, so the message and its field read as one.

## Gotchas

- **Empty content renders nothing.** Resolution is `children ?? field.error`, then a falsy
  check — so `undefined`, `null`, `false`, and the empty string all render `null` rather
  than an empty red paragraph. A numeric `0` child would also vanish, but error copy is
  never `0`.
- **Explicit children bypass the field's invalid state.** `children` shows the message, but
  the input's `aria-describedby` only tracks the `Field`'s own error. Pass `children` while
  the `Field` has no error and the message is visible yet not programmatically linked to the
  input. Let `Field` own the error, or wire `aria-describedby` yourself.
- **One error id per Field.** Two `FieldError`s deriving from the same `Field` both take its
  `errorId`, producing a duplicate id. Only an explicit `id` prop clears it: `id` resolves to
  `field.errorId` regardless of `children`, so giving one its own content changes what shows
  but leaves the duplicate id in place.
- **Not server-renderable.** Like the form inputs, FieldError reads `Field` context via a
  hook and ships **no** `"use client"` of its own, so rendering it directly from a Server
  Component with no client ancestor throws. Inside a normal `Field` tree — itself a client
  component — this never comes up.
- **No per-component CSS.** There is no `FieldError.css`. Both CSS imports are still required
  — the two utilities resolve to tokens from `@batthewz/response-ui-css`.

## Accessibility

The message renders as a `<p role="alert">`, an assertive live region. Because the node
mounts only when an error exists, each error's appearance is announced — but assertive means
it interrupts whatever the screen reader is saying. For inline validation that updates on
every keystroke, prefer the polite `role="status"` override above so changes queue rather
than interrupt.

The colour is signal too, but never the only signal: the message text carries the meaning,
so users who can't perceive the red still get the full error. Inside a `Field`, the shared
`errorId` is what turns this into the input's description — render it (with content) or the
input's `aria-describedby` resolves to nothing.

## Related

`Field` · [Input](input.md) · `Label` · `FormActions` ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
