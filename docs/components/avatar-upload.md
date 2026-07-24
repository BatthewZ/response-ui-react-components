# AvatarUpload

A profile-photo picker in a circle. It shows the current avatar, opens the OS file dialog
on click or on Enter/Space, validates the chosen file against a MIME list and a byte
ceiling, shows a busy spinner while your `onUpload` runs, and swaps in the URL that handler
returns — so the only thing you write is the request.

<!-- example:Minimal -->
```tsx
<AvatarUpload
  src="https://cdn.example.com/avatars/ada-lovelace.jpg"
  name="Ada Lovelace"
  onUpload={async (file) => {
    const body = new FormData();
    body.append("avatar", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body });
    if (!res.ok) throw new Error("Could not save your photo. Try again.");
    return (await res.json()) as { url: string };
  }}
/>
```
<!-- /example -->

| Prop               | Type                                       | Default |
| ------------------ | ------------------------------------------ | ------- |
| `src`              | `string \| null`                           | —       |
| `name`             | `string`                                   | —       |
| `size`             | `"xs" \| "sm" \| "md" \| "lg" \| "xl"`     | `"xl"`  |
| `onUpload`         | `(file: File) => Promise<{ url: string }>` | —       |
| `onUploadComplete` | `(data: { url: string }) => void`          | —       |
| `onUploadError`    | `(error: Error) => void`                   | —       |
| `accept`           | `readonly string[]`                        | —       |
| `maxSize`          | `number` — bytes                           | —       |
| `className`        | `string`                                   | —       |
| `ref`              | `Ref<HTMLDivElement>`                      | —       |
| …rest              | props of `div`, minus `children`           | —       |

Every prop is optional and `<AvatarUpload />` renders, but two of them carry sharp edges
that will cost you an afternoon: `onUpload` is what makes the preview stick, and `accept`
is compared by exact string — `["image/*"]` rejects every file. See [Gotchas](#gotchas).

`src` is only the *initial* image. The moment the component holds a preview or an upload
result of its own, that wins for the rest of the instance's life and later `src` prop
changes are ignored, so don't treat this as a controlled component.

## What happens when a file is chosen

A single handler runs the whole sequence, in this order:

1. The `<input type="file">` value is reset to `""`, so re-picking the **same** file starts
   a fresh attempt instead of doing nothing. Any previous error message is cleared.
2. `accept` and `maxSize` are checked in that order. On failure the generated message
   renders in a tooltip below the circle, `onUploadError` fires with an `Error` carrying
   that same message, and the sequence stops — the avatar does not change.
3. An object URL for the file becomes the displayed image: the optimistic preview.
4. If there is no `onUpload`, the handler stops here. Step 3 does not survive it — see
   [Gotchas](#gotchas).
5. Otherwise the camera glyph is replaced by a busy spinner, the overlay is pinned visible,
   and clicks and keystrokes are ignored until `onUpload` settles.
6. On resolve, the displayed image becomes `result.url` and `onUploadComplete(result)`
   fires. On reject, the display falls back to `src`, the rejection's `message` renders in
   the tooltip, and `onUploadError` fires with the original `Error`.

Anything your handler throws or rejects with that is not an `Error` is replaced by
`new Error("Upload failed.")`, so `onUploadError` always receives a real `Error`.

## Size

<!-- example:Sizes -->
```tsx
<AvatarUpload size="xs" name="Ada Lovelace" />
<AvatarUpload size="sm" name="Ada Lovelace" />
<AvatarUpload size="md" name="Ada Lovelace" />
<AvatarUpload size="lg" name="Ada Lovelace" />
<AvatarUpload size="xl" name="Ada Lovelace" />
```
<!-- /example -->

`size` sets the circle's box — `xs` 1.5rem, `sm` 2rem, `md` 2.5rem, `lg` 3rem, `xl` 4rem —
and is forwarded to the nested [Avatar](avatar.md) so the initials type scales with it.
The overlay's contents do **not** scale: the camera SVG is a fixed 16×16 and the busy
spinner is a fixed 1rem circle, so on `xs` they cover most of the avatar. Note the default
is `xl` here, where plain [Avatar](avatar.md) defaults to `md`.

Those five are display-only: with no `onUpload`, actually picking a file would clear the
circle rather than preview it. See [Gotchas](#gotchas).

## Validating before you upload

<!-- example:Validation -->
```tsx
<AvatarUpload
  name="Grace Hopper"
  accept={["image/jpeg", "image/png", "image/webp"]}
  maxSize={2 * 1024 * 1024}
  onUpload={async (file) => {
    const res = await fetch("/api/profile/avatar", { method: "POST", body: file });
    return (await res.json()) as { url: string };
  }}
/>
```
<!-- /example -->

`accept` does double duty: it is joined with commas onto the file input's `accept`
attribute *and* used as the allow-list for the post-selection check. The attribute is only
a hint — a user can still choose "All files" in most OS dialogs — so the second check is
the one that holds, and it is a plain `Array.includes` on `file.type`. List concrete types.
Passing `[]` skips the check entirely and puts an empty `accept` attribute on the input.

`maxSize` is a byte count. The failure message formats the actual and permitted sizes for
you (`B` below 1 KB, then `KB` or `MB` to one decimal), so you don't have to write it.

## Reporting the result

The component renders its own error text, but only inside the button; nothing announces
success, and nothing announces failure reliably (see [Accessibility](#accessibility)). Route
both callbacks into a live region you own — here a `role="status"` [Text](text.md) fed by
`const [status, setStatus] = useState("")`:

<!-- example:Callbacks -->
```tsx
<AvatarUpload
  src="https://cdn.example.com/avatars/grace-hopper.jpg"
  name="Grace Hopper"
  accept={["image/jpeg", "image/png"]}
  onUpload={async (file) => {
    const res = await fetch("/api/profile/avatar", { method: "POST", body: file });
    if (!res.ok) throw new Error(`Upload failed (${String(res.status)}).`);
    return (await res.json()) as { url: string };
  }}
  onUploadComplete={() => setStatus("Profile photo updated.")}
  onUploadError={(error) => setStatus(error.message)}
/>
<Text variant="body-3" color="secondary" role="status">
  {status}
</Text>
```
<!-- /example -->

## In a settings row

<!-- example:InSettingsRow -->
```tsx
<Row gap="r4" align="center">
  <AvatarUpload
    src="https://cdn.example.com/avatars/ada-lovelace.jpg"
    name="Ada Lovelace"
    accept={["image/jpeg", "image/png"]}
    maxSize={2 * 1024 * 1024}
    onUpload={async (file) => {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: file });
      return (await res.json()) as { url: string };
    }}
  />
  <div>
    <Text variant="body-2" weight="semibold">
      Profile photo
    </Text>
    <Text variant="body-3" color="secondary">
      JPEG or PNG, up to 2 MB.
    </Text>
  </div>
</Row>
```
<!-- /example -->

The root is an `inline-flex` box sized exactly to the circle, so it drops into a
[Row](row.md) or a form grid without a wrapper. It renders no label of its own — the
adjacent text is yours to write, and it is the only place your size and format limits get
stated before the user picks a file.

## Theme tokens

AvatarUpload has no CSS file; every rule is a Tailwind utility. The circle itself — photo,
initials, fallback fill and type — is rendered by [Avatar](avatar.md), and its tokens are
documented there. What this component adds on top is the overlay, the focus ring and the
error tooltip:

| Where                            | Utility                                 | Override            |
| -------------------------------- | --------------------------------------- | ------------------- |
| Overlay & focus-ring corners     | `rounded-full`                          | `--RADIUS-FULL`     |
| Overlay fade                     | `duration-fast`                         | `--DURATION-FAST`   |
| Keyboard focus ring              | `group-focus-visible:ring-border-focus` | `--C-BORDER-FOCUS`  |
| Error tooltip fill               | `bg-status-error`                       | `--C-STATUS-ERROR`  |
| Error tooltip ink                | `text-fg-inverse`                       | `--C-TEXT-INVERSE`  |
| Error tooltip type               | `text-body-3`                           | `--BodyText-3`      |

**The hover scrim is off the contract.** The overlay is `bg-black/50` with a `text-white`
glyph, and the busy spinner is `border-white` — all three are Tailwind's literal colours,
not theme variables, so they are byte-identical in every theme. The
[theme contract](../theme-contract.md) does define `--OVERLAY-SCRIM-COLOR` for exactly this
job ([Drawer](drawer.md), `AppShell` and `CommandPalette` all read it, and the shipped
themes set it between 45% and 80% opacity), but AvatarUpload does not. Overriding it will
not move this scrim; you have to pass your own `className`.

The five box sizes are fixed Tailwind spacing rather than the responsive `r`-scale, so the
circle is the same diameter on mobile and desktop. `--BodyText-3` on the error tooltip *is*
responsive and steps up at the 40rem breakpoint.

## Gotchas

- **`accept={["image/*"]}` rejects everything.** The wildcard reaches the OS dialog
  correctly, so the user can pick a PNG — and then validation runs `accept.includes("image/png")`,
  which is `false`, and the tooltip reads *File type "image/png" is not allowed. Accepted:
  image/\*.* Enumerate the concrete types instead.
- **Without `onUpload` there is no usable preview.** The docs elsewhere describe this as
  "presentational" mode, but the object URL created for the preview is revoked in the same
  tick it is handed to state — before React commits it to the `<img>`. The image then fails
  to load, [Avatar](avatar.md) latches its internal load-error flag, and the circle falls
  back to initials. That flag never resets, so from then on the instance ignores `src` too:
  one file pick permanently blanks the photo. Always pass `onUpload`.
- **Your `onClick` or `onKeyDown` replaces the picker.** Rest props are spread *after* the
  component's own handlers, so `<AvatarUpload onClick={track} />` fires `track` and never
  opens the file dialog. Do your logging in `onUpload` instead. (`aria-label`, `role` and
  `tabIndex` are overridable the same way — there the last-writer-wins order is useful.)
- **`src` is ignored once the component holds a preview.** The internal URL takes precedence
  for the instance's lifetime — it is cleared only by a *failed* upload — so a re-render with
  a server-authoritative `src` will not be shown. Remount with a `key` to force it.
- **The `TResult` generic is not reachable.** `AvatarUploadProps` is declared generic over
  the upload result, but the component is `forwardRef<HTMLDivElement, AvatarUploadProps>`,
  which pins it to the default. `onUpload` may *return* extra fields, but
  `onUploadComplete` types its argument as `{ url: string }`, so reading `data.assetId` is
  a compile error. Neither `AvatarUploadProps` nor `AvatarUploadResult` is re-exported from
  the package barrel, so you cannot restate the type yourself either.
- **The error tooltip is `whitespace-nowrap` and absolutely positioned** 2rem below the
  circle, centred. A long `accept` list produces a single wide strip that overflows its
  container in both directions and can sit over whatever follows. It clears only when the
  next file is chosen — there is no dismiss, and no timeout.
- **No `disabled` prop.** The component ignores its own click and key handlers while an
  upload is in flight, but you cannot disable it from outside, and `cursor-pointer` stays on
  throughout.
- **Client component.** `"use client"` is at the top of both this file and the nested
  [Avatar](avatar.md), so importing it into a server component establishes a client boundary
  rather than failing.

## Accessibility

The root is a `<div role="button" tabIndex={0} aria-label="Change avatar">`. Enter and Space
both activate it on `keydown`, and both are `preventDefault`ed, so Space does not scroll the
page. A `<div>` gets no synthetic click from either key, which is why that handler exists at
all. The real
`<input type="file">` is `sr-only`, `tabIndex={-1}` and `aria-hidden`, so it never appears
in the tab order or the accessibility tree. The default label is generic — pass your own
`aria-label` when several avatars appear on one page; rest props are spread last, so it
overrides cleanly.

Two gaps are worth planning around:

- **Nothing announces the upload.** The busy spinner lives inside an `aria-hidden` span, and
  the root gains no `aria-busy` and no `aria-disabled` while `onUpload` is pending. Clicks
  and keypresses in that window are silently dropped. Assistive-technology users get no
  signal that anything is happening, which is why the [Callbacks](#reporting-the-result)
  example routes state changes into a `role="status"` region of its own.
- **The built-in error tooltip is a `role="alert"` nested inside a `role="button"`.** ARIA
  makes a button's descendants presentational, so that alert is not a reliable live region —
  and because `aria-label` wins over content for the name computation, the message doesn't
  reach the accessible name either. The text renders and is visible; treat it as visual
  feedback only, and surface failures through `onUploadError` into your own live region or
  a [Toast](toast.md).

The tooltip always carries the reason as text on its error fill, so a failure is never
signalled by colour alone.

## Related

[Avatar](avatar.md) · `FileUpload` · [Field](field.md) · [Toast](toast.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
