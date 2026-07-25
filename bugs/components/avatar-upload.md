# avatar-upload — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 378 · AvatarUpload — with no `onUpload`, one file pick blanks the avatar permanently (high)

In the no-handler branch the component does `setPreviewUrl(objectUrl)` and then, synchronously,
`URL.revokeObjectURL(objectUrl)` — before React has committed the new state. Measured in three
parts, which together close the chain: (a) at the moment `revokeObjectURL` runs, the DOM `<img>`
still shows the **old** `src`, so React has not committed the preview yet, and after the commit the
`<img>`'s `src` is the already-revoked `blob:` URL; (b) in real Chromium, assigning a revoked blob
URL to an `Image` fires **`error`** (control: a live blob URL of the same PNG fires `load`); (c)
`Avatar` latches that error into state and never clears it — measured, re-rendering with a fresh
`src` still renders initials (#55). Net effect: choosing one file in "presentational" mode blanks the
photo for the life of the instance, and later `src` props are ignored too. `AGENTS.md` currently
describes this mode as "just shows a local preview".
**Fix:** revoke on unmount or on the next selection (via a ref or an effect), not synchronously in
the no-handler branch.

### 379 · AvatarUpload — `accept={["image/*"]}` rejects every file the dialog offered (high)

`validateFile` does `!accept.includes(file.type)` — an exact string match — while the same array is
joined onto the input's `accept` attribute, where the wildcard is valid and does work. Measured:
`accept={["image/*"]}` renders `accept="image/*"` on the input, so the OS dialog offers PNGs, and
then choosing one produces the tooltip *File type "image/png" is not allowed. Accepted: image/\*.*
and one `onUploadError` call. Upload is impossible, and `["image/*"]` is the conventional value —
this is the first thing a caller will try.
**Fix:** match wildcard patterns (split on `/` and compare the type half when the subtype is `*`).

### 380 · AvatarUpload — a caller `onClick`/`onKeyDown` replaces the file-picker trigger (med)

`{...props}` is spread after `onClick={handleClick}` and `onKeyDown={handleKeyDown}` on the root, so
the caller's handler wins outright. Measured: `<AvatarUpload onClick={track} />` — one click fires
`track` once and `inputRef.current.click()` **zero** times, so the file dialog never opens; the same
with `onKeyDown` and Enter. The component still looks like a working picker (it keeps `role="button"`,
`tabIndex={0}`, `cursor-pointer` and the hover scrim), and the natural reason to pass `onClick` is
analytics. Same rest-spread-after-handlers shape as `Table.HeaderCell` (#350).
**Fix:** compose — run the caller's handler and then the internal one — or spread props before the
handlers.

### 381 · AvatarUpload — nothing exposes the in-flight upload (med)

Measured while `onUpload` is pending: the root's `aria-busy` is `null` and `aria-disabled` is `null`,
the camera `<svg>` has been replaced by an `aria-hidden` spinner span (0 `<svg>` in the subtree),
`cursor-pointer` is still on the class list, and a click in that window results in **0**
`input.click()` calls — silently dropped. An assistive-technology user gets no signal that an upload
started, that it finished, or that their activation was ignored; a sighted user gets only the
spinner inside the `aria-hidden` overlay.
**Fix:** set `aria-busy={uploading}` and `aria-disabled={uploading}` on the root.

### 382 · AvatarUpload — the error is a `role="alert"` inside a `role="button"` (med)

Measured with `maxSize={10}` and a 16-byte file: the alert renders *File is too large (16B). Maximum
is 10B.*, its `closest('[role="button"]')` **is** the component root, and the root's accessible name
stays `"Change avatar"` because an `aria-label` outranks descendant content. ARIA's
presentational-children rule makes descendants of a `button` non-semantic, so the live region is not
reliably announced, and the message reaches neither the name nor a dependable announcement. The text
is visible, so this is an AT-only gap — but it is the component's only failure reporting.
**Fix:** render the error outside the button subtree, or expose it via `aria-describedby` on the root.

### 383 · AvatarUpload — the `TResult` type parameter is erased (med)

`AvatarUploadProps<TResult extends AvatarUploadResult = AvatarUploadResult>` is generic, but the
component is `forwardRef<HTMLDivElement, AvatarUploadProps>` — no type argument — which pins it to
the default. `onUpload={async () => ({ url, assetId: "a1" })}` compiles via structural widening, but
`onUploadComplete={(data) => data.assetId}` is `TS2339: Property 'assetId' does not exist on type
'AvatarUploadResult'`. The caller cannot restate the type either: neither `AvatarUploadProps` nor
`AvatarUploadResult` is re-exported from the `ui` barrel (#385). The parameter is therefore
unusable in every direction.
**Fix:** type the component as a generic function component instead of `forwardRef`, or drop the
parameter.
