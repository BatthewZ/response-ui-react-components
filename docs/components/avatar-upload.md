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
| `errorTimeout`     | `number` — ms; `0` never clears            | `5000`  |
| `className`        | `string`                                   | —       |
| `ref`              | `Ref<HTMLDivElement>`                      | —       |
| …rest              | props of `div`, minus `children`           | —       |

`onUpload` and `onUploadComplete` share a type parameter: whatever object your handler
resolves with is the exact type `onUploadComplete` receives, so returning
`{ url, assetId }` makes `data.assetId` typed rather than a compile error. It only has to
carry a `url`; everything else is yours.

Every prop is optional and `<AvatarUpload />` renders. `accept` understands the same grammar
the OS dialog does — exact MIME types, wildcards like `image/*`, and filename extensions like
`.png`. See [Gotchas](#gotchas).

`src` is only the *initial* image. The moment the component holds a preview or an upload
result of its own, that wins for the rest of the instance's life and later `src` prop
changes are ignored, so don't treat this as a controlled component.

## What happens when a file is chosen

A single handler runs the whole sequence, in this order:

1. The `<input type="file">` value is reset to `""`, so re-picking the **same** file starts
   a fresh attempt instead of doing nothing. Any previous error message is cleared — as it
   also is by opening the picker, by `Escape`, and by `errorTimeout` elapsing.
2. `accept` and `maxSize` are checked in that order. On failure the generated message
   renders in a tooltip below the circle, `onUploadError` fires with an `Error` carrying
   that same message, and the sequence stops — the avatar does not change.
3. An object URL for the file becomes the displayed image: the optimistic preview.
4. If there is no `onUpload`, the handler stops here: the preview stands and nothing is sent.
5. Otherwise the camera glyph is replaced by a busy spinner, the overlay is pinned visible,
   and clicks and keystrokes stop opening the picker until `onUpload` settles.
6. On resolve, the displayed image becomes `result.url` and `onUploadComplete(result)`
   fires. On reject, the display falls back to `src`, the rejection's `message` renders in
   the tooltip, and `onUploadError` fires with the original `Error`.

Anything your handler throws or rejects with that is not an `Error` is replaced by
`new Error("Upload failed.")`, so `onUploadError` always receives a real `Error`.

The object URL behind step 3 is released for you the moment the display stops pointing at
it — the next pick, the post-upload swap, the fallback after a failed upload — and on
unmount. You never hold it, so there is nothing to clean up on your side.

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

None of those five passes `onUpload`, so picking a file previews it in the circle and sends
it nowhere.

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
the one that holds, and it speaks the attribute's own grammar: exact MIME types, `image/*`
wildcards and the `*/*` catch-all matched case-insensitively against `file.type`, plus
`.png`-style extensions matched against the end of the file name.
Passing `[]` skips the check entirely and puts an empty `accept` attribute on the input.

`maxSize` is a byte count. The failure message formats the actual and permitted sizes for
you (`B` below 1 KB, then `KB` or `MB` to one decimal), so you don't have to write it.

## Reporting the result

The component announces failures itself — the tooltip is the visible half, and a
visually-hidden `role="alert"` sibling rendered outside the button carries the same message
to assistive tech — but nothing announces success (see
[Accessibility](#accessibility)). Route the callbacks into a live region you own — here a
`role="status"` [Text](text.md) fed by `const [status, setStatus] = useState("")`:

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

The hover scrim is not in that table on purpose: it is written as
`bg-[var(--OVERLAY-SCRIM-COLOR,rgb(0_0_0_/_0.5))]`, and an arbitrary-value utility carrying a
`var()` is not something `verify-component-docs` can resolve to a token — the same reason
[Dialog](dialog.md)'s backdrop is described in prose rather than tabulated.

**The scrim is on the contract; its glyph is not.** The overlay reads
`--OVERLAY-SCRIM-COLOR`, the same token [Drawer](drawer.md), [AppShell](app-shell.md),
[CommandPalette](command-palette.md) and [Dialog](dialog.md) read, with `rgb(0 0 0 / 0.5)` as
the fallback for an app that skipped the token layer. The default theme sets it to 50%, and
the examples to 45% (events), 70% (tech) and 80% (grimdark), so re-theming it moves this
scrim too.

The camera glyph and the busy spinner's ring are still literal `text-white` / `border-white`,
and that is deliberate rather than an oversight: the contract has no "ink on an overlay"
token. `--C-TEXT-INVERSE` is the obvious candidate and is **near-black** in `tech` and
`grimdark` — measured against the composited scrim it gives **2.35:1** and **1.52:1** over a
light photo, and **1.05:1** / **1.10:1** over a dark one, i.e. an invisible glyph. White
measures 3.98 (default), 2.89 (events), 8.46 (tech) and 12.63 (grimdark) against the scrim
over a white photo, and ≥19:1 over a black one. Note the `events` figure: its lighter 45%
scrim puts a white glyph under the 3:1 floor WCAG 1.4.11 sets for a non-text control cue,
over a light photo. If that matters for your avatars, override the token or the glyph colour
through `className`.

Measured against the default theme and the worked examples; these numbers do not transfer to
your own theme — re-check them against your values.

The five box sizes are fixed Tailwind spacing rather than the responsive `r`-scale, so the
circle is the same diameter on mobile and desktop. `--BodyText-3` on the error tooltip *is*
responsive and steps up at the 40rem breakpoint.

## Gotchas

- **A file with no MIME type only matches an extension rule.** Browsers cannot always infer
  `file.type`, and an empty one matches no MIME entry — not even `image/*`. If you need those
  files, include an extension (`".png"`) alongside the MIME type, or use `*/*`.
- **`preventDefault()` in your `onClick` or `onKeyDown` cancels the picker.** Those two
  compose rather than override: yours runs first, then the component's, so
  `<AvatarUpload onClick={track} />` both fires `track` and opens the file dialog. Call
  `preventDefault()` in yours and the component reads it as handled and does not open the
  dialog. (`aria-label`, `role` and `tabIndex` are plain attributes, still spread *after*
  the component's own, so those do override — there the last-writer-wins order is useful.)
- **A URL that fails to load is retried only when the URL changes.** The nested Avatar
  remembers the exact URL that failed and shows initials for as long as that same URL is the
  one displayed; a *different* URL — a fresh upload result, the fallback to `src` after a
  failed upload — gets a clean attempt. Re-showing the very same URL after a transient
  failure needs a remount (`key`). See [Avatar's gotchas](avatar.md#gotchas).
- **`src` is ignored once the component holds a preview.** The internal URL takes precedence
  for the instance's lifetime — it is cleared only by a *failed* upload — so a re-render with
  a server-authoritative `src` will not be shown. Remount with a `key` to force it.
- **AvatarUpload is not a `forwardRef` component.** It cannot be: `forwardRef` takes exactly
  two type arguments and erases `TResult`, which pinned `onUploadComplete` to
  `{ url: string }`. It is a plain generic function component taking React 19's `ref` prop
  instead, which every other generic component here ([DataTable](data-table.md),
  [VirtualizedDataTable](virtualized-data-table.md), [Repeater](repeater.md)) already is.
  `<AvatarUpload ref={r} />` behaves identically and
  `ComponentRef<typeof AvatarUpload>` still resolves to `HTMLDivElement` (both checked against
  `tsc`), so the only thing that changed is the internal shape. `AvatarUploadProps` and
  `AvatarUploadResult` are both exported from the package barrel if you need to name either.
- **The error tooltip is absolutely positioned** 2rem below the circle, centred, capped at
  `17.5rem` wide and wrapping past that — a long `accept` list is a block, not a strip, but
  it still overhangs a circle narrower than itself and can sit over whatever follows. It is
  cleared by `errorTimeout` (5s by default), by `Escape` while the control has focus, and by
  re-opening the picker; before, it survived until the *next successful* selection, so
  cancelling the OS dialog left it up indefinitely. There is still no visible close button:
  the tooltip lives inside a `role="button"`, whose descendants ARIA makes presentational,
  so an interactive control cannot go there.
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
`aria-label` when several avatars appear on one page; attributes in the rest props are
spread last, so it overrides cleanly. (`onClick` and `onKeyDown` are the exception: they
compose with the component's own — see [Gotchas](#gotchas).)

One gap is worth planning around, and one mechanism is worth knowing:

- **Nothing *announces* the upload, though the state is exposed.** The busy spinner lives
  inside an `aria-hidden` span, but the root does carry `aria-busy="true"` and
  `aria-disabled="true"` while `onUpload` is pending, so a screen reader that re-reads the
  control reports it — nothing pushes that into a live region as it happens. Clicks and
  keypresses in that window are still dropped. That is why the
  [Callbacks](#reporting-the-result) example routes state changes into a `role="status"`
  region of its own.
- **The error message is announced from outside the button.** The visible tooltip is
  `aria-hidden` — it lives inside a `role="button"`, whose descendants ARIA makes
  presentational, and `aria-label` would keep its text out of the name computation anyway —
  so the announcement comes from a visually-hidden `role="alert"` sibling rendered after
  the button, carrying the same message. For richer feedback or a dismiss affordance,
  surface failures through `onUploadError` into your own live region or a
  [Toast](toast.md).

The tooltip always carries the reason as text on its error fill, so a failure is never
signalled by colour alone.

## Related

[Avatar](avatar.md) · [FileUpload](file-upload.md) · [Field](field.md) · [Toast](toast.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
