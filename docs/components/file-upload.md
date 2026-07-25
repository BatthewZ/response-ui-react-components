# FileUpload

A drag-and-drop zone that also opens the OS file dialog on click or on Enter/Space, and then
renders your chosen files back as previews — a large one for a single image or video, a
thumbnail grid for several, and compact rows carrying the name and a formatted size for
everything else. It stores no files of its own: you keep the array, it draws it.

<!-- example:Minimal -->
```tsx
<FileUpload
  files={files}
  onFilesSelected={setFiles}
  onClear={() => setFiles([])}
  hint="PDF or PNG, up to 5 MB"
/>
```
<!-- /example -->

`files` is state you own — `const [files, setFiles] = useState<File[]>([])` in every example
on this page. Nothing appears in the preview until you pass the array back in.

| Prop              | Type                          | Default  |
| ----------------- | ----------------------------- | -------- |
| `files`           | `File[]`                      | —        |
| `onFilesSelected` | `(files: File[]) => void`     | —        |
| `onRemoveFile`    | `(index: number) => void`     | —        |
| `onClear`         | `() => void`                  | —        |
| `accept`          | `string[]` — MIME, `image/*`, or `.ext` | —        |
| `maxSize`         | `number` — bytes              | —        |
| `multiple`        | `boolean`                     | `false`  |
| `previewMode`     | `"auto" \| "compact"`         | `"auto"` |
| `hint`            | `string`                      | —        |
| `error`           | `string \| null`              | —        |
| `success`         | `string \| null`              | —        |
| `uploading`       | `boolean`                     | `false`  |
| `disabled`        | `boolean`                     | `false`  |
| `className`       | `string`                      | —        |
| `ref`             | `Ref<HTMLDivElement>`         | —        |
| …rest             | props of `div`, minus `onDrop`| —        |

Two of these have sharp edges: rejected files vanish without a callback, and `success` is
ignored once `files` is non-empty. `accept` understands exact MIME types, wildcards
(`image/*`), and filename extensions (`.pdf`). See [Gotchas](#gotchas).

## What happens when files arrive

Drop and browse run the same path:

1. A null or empty `FileList` stops here; otherwise it becomes an array.
2. Each file is kept only if `accept` is unset/empty **or** the file matches an entry — by
   exact MIME type, by a wildcard such as `image/*`, or by filename extension — **and**
   `maxSize` is unset **or** `file.size <= maxSize`.
3. If nothing survived, the sequence stops silently — `onFilesSelected` does not fire and no
   message appears.
4. Otherwise `onFilesSelected` fires with the survivors when `multiple`, or with a
   one-element array holding the first survivor when not.
5. On the browse path the input's `value` is reset to `""`, so picking the same file twice in
   a row starts a fresh selection rather than doing nothing.

`onFilesSelected` reports **only what was just picked**, never the accumulated set — merging
is yours.

## Several files at once

<!-- example:MultipleFiles -->
```tsx
<FileUpload
  multiple
  files={files}
  onFilesSelected={(picked) => setFiles((current) => [...current, ...picked])}
  onRemoveFile={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
  onClear={() => setFiles([])}
  hint="Attach receipts — up to 10 files"
/>
```
<!-- /example -->

`onRemoveFile` receives the index of the row's file in the `files` array you passed. Pass it
whenever `multiple` is on: without it, every per-row remove button falls back to `onClear`
and deletes the whole list (see [Gotchas](#gotchas)).

`multiple` also goes onto the hidden `<input type="file">`, so it governs what the OS dialog
lets the user select in the first place.

## Restricting type and size

<!-- example:RestrictTypesAndSize -->
```tsx
<FileUpload
  accept={["image/png", "image/jpeg", "application/pdf"]}
  maxSize={5 * 1024 * 1024}
  files={files}
  onFilesSelected={setFiles}
  onClear={() => setFiles([])}
/>
```
<!-- /example -->

`accept` does double duty: joined with commas it becomes the input's `accept` attribute, and
as an array it is the post-selection allow-list. The attribute is only a hint to the OS
dialog and does nothing at all on the drop path — the array check is what actually holds, and
it is a plain `Array.includes` on `file.type`. So `["image/*"]` and `[".pdf"]` filter the
dialog nicely and then reject every file that comes back. Enumerate concrete types.

`maxSize` is a byte count, and with no `hint` of your own it also writes the hint line
(`Max file size: 5.0 MB` — `B` under 1 KB, then `KB` or `MB` to one decimal).

Neither check tells anyone why a file disappeared. To report a rejection you have to do the
validation yourself, which means **not** handing `accept`/`maxSize` to the component — a file
it filters never reaches `onFilesSelected`. The message below is a second piece of your own
state, `const [error, setError] = useState<string | null>(null)`:

<!-- example:ReportingRejections -->
```tsx
<FileUpload
  files={files}
  error={error}
  hint="Signed contract as a PDF, up to 5 MB"
  onFilesSelected={(picked) => {
    const tooLarge = picked.find((file) => file.size > 5 * 1024 * 1024);
    setError(tooLarge ? `${tooLarge.name} is larger than 5 MB.` : null);
    setFiles(tooLarge ? [] : picked);
  }}
  onClear={() => {
    setFiles([]);
    setError(null);
  }}
/>
```
<!-- /example -->

## Previews

With `previewMode="auto"` (the default) the files are partitioned by MIME prefix. Exactly one
`image/*` or `video/*` file gets the large 10rem preview with a caption; two or more get a
`repeat(auto-fill, minmax(8rem, 1fr))` grid of square thumbnails whose remove buttons appear
on hover; everything else stacks as compact rows below. Videos in the large preview get
native `controls`; the grid ones do not.

`previewMode="compact"` skips the partition entirely and renders every file as a row —
images still get a 2.5rem thumbnail, other types a generic file glyph:

<!-- example:CompactPreview -->
```tsx
<FileUpload
  multiple
  previewMode="compact"
  accept={["image/png", "image/jpeg"]}
  files={files}
  onFilesSelected={(picked) => setFiles((current) => [...current, ...picked])}
  onRemoveFile={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
  onClear={() => setFiles([])}
/>
```
<!-- /example -->

Either way the preview ends in an action bar: **Replace** always, and **Clear all** only when
`onClear` is set. Replace just reopens the file dialog; nothing is removed until your
`onFilesSelected` decides what the new array is.

Object URLs for the media previews are created in a `useMemo` keyed on the `files` array's
identity and revoked when it changes or the component unmounts — so pass a stable array.
`files={[selected]}` written inline mints a new object URL on **every** parent render.

## States

<!-- example:States -->
```tsx
<FileUpload uploading />
<FileUpload success="contract-signed.pdf uploaded." />
<FileUpload error="That file is larger than 5 MB." />
<FileUpload disabled hint="Uploads are locked while this project is archived." />
```
<!-- /example -->

`uploading` swaps the prompt for `Uploading...` and sets `pointer-events: none` on the whole
zone. `disabled` dims it to 50%, sets `aria-disabled`, moves `tabIndex` to `-1` and disables
the hidden input. Both also short-circuit the click, key and drop handlers in JS.

`error` and `success` are strings you supply; the component never sets either one itself.
Only `error` survives into the preview state — see [Gotchas](#gotchas).

## Naming the dropzone

The root carries a hard-coded `aria-label="Upload file"`, which says nothing about *which*
file. Rest props are spread last, so your own `aria-label` replaces it cleanly:

<!-- example:CustomLabel -->
```tsx
<FileUpload
  aria-label="Upload signed contract"
  accept={["application/pdf"]}
  files={files}
  onFilesSelected={setFiles}
  onClear={() => setFiles([])}
  hint="Signed PDF only"
/>
```
<!-- /example -->

FileUpload renders no visible label, and a `<div>` is not a labelable element, so a
`<label for>` will not name it even if you pass it an `id`. A visible caption beside the zone
is separate text you write yourself; the `aria-label` is what assistive technology reads.

## Theme tokens

Apart from `sr-only` on the hidden input, FileUpload uses **no Tailwind utilities** — every
rule lives in `FileUpload.css` and reads contract variables directly, so overriding any of
these re-tints it at runtime with no rebuild.

| Where                                        | Override                                        |
| -------------------------------------------- | ----------------------------------------------- |
| Dropzone fill · overlay remove buttons        | `--C-SURFACE-1`                                 |
| Drag-over fill · thumbnail & glyph wells      | `--C-SURFACE-2`                                 |
| Dashed border · row separators · action bar   | `--C-BORDER-DEFAULT`                            |
| Hover + drag-over border · glyph · focus ring | `--C-BORDER-FOCUS`                              |
| Prompt · hint · size · glyphs · Clear all     | `--C-TEXT-MUTED`                                |
| "browse" emphasis · Replace                   | `--C-ACCENT`                                    |
| Success border, glyph and message             | `--C-STATUS-SUCCESS`                            |
| Success fill                                  | `--C-STATUS-SUCCESS-BG`                         |
| Error border, glyph, message, remove hover    | `--C-STATUS-ERROR`                              |
| Error fill · remove-button hover wash         | `--C-STATUS-ERROR-BG`                           |
| Zone & large-preview corners                  | `--RADIUS-MD`                                   |
| Thumbnail · action-button corners             | `--RADIUS-SM`                                   |
| Remove-button circles                         | `--RADIUS-FULL`                                 |
| Prompt & file-name type                       | `--BodyText-2` · `--BodyText-2-line-height`     |
| Hint, size, message & action type             | `--BodyText-3` · `--BodyText-3-line-height`     |
| Emphasis weight                               | `--Semibold-Weight`                             |
| Zone padding                                  | `--R-SIZE-3`                                    |
| Row padding · caption & action-bar gutters    | `--R-SIZE-4`                                    |
| Zone stack gap · action-bar padding           | `--R-SIZE-5`                                    |
| Grid chrome insets                            | `--R-SIZE-6`                                    |
| Colour & border transitions                   | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT` |

Three of those spacing tokens step up at the 40rem breakpoint along the responsive `r`-scale
(`--R-SIZE-3` 1rem → 1.5rem, `--R-SIZE-4` 0.75rem → 1.25rem, `--R-SIZE-5` 0.5rem → 0.75rem);
`--R-SIZE-6` sits on the same scale but holds at 0.25rem. The `--BodyText-*` steps are
responsive too. Every element that declares a transition is covered by the reduced-motion
block — the zone, the icon and all five button classes — so `prefers-reduced-motion: reduce`
leaves nothing animating.

**The file name in a preview row is not on the contract.** `FileUpload.css` inks it from
`--C-TEXT-DEFAULT`, which no theme and no base layer defines. An undefined custom property
makes the whole declaration invalid at computed-value time, and for an inherited property
like `color` that means `inherit` — so the file name takes its colour from whatever ancestor
last set one. [Drawer](drawer.md#theme-tokens) has the same line and the same consequence.

**Contrast numbers worth knowing before you ship this.** Computed from the shipped OKLCH
values, each pair against the background the component itself paints behind it:

| Pair                                                          | default | events | tech  | grimdark |
| ------------------------------------------------------------- | ------- | ------ | ----- | -------- |
| Prompt · hint · size · glyph, on the zone fill                 | 2.43    | 2.37   | 2.06  | 2.43     |
| Dashed dropzone border, on the zone fill                       | 1.18    | 1.18   | 1.18  | 1.26     |
| Success message, on the success fill                           | 3.15    | 3.15   | 13.39 | 6.70     |
| Error message, on the error fill                               | 4.41    | 4.41   | 5.35  | 4.59     |

The three text rows are set in `--BodyText-2`/`--BodyText-3` — 12–14px, so AA asks 4.5:1.
Row one misses it in every theme, and misses the 3:1 large-text floor too, even though it is
the component's *only* instruction; it is painted in the token the
[theme contract](../theme-contract.md) reserves for "placeholders, hints". Row three misses
4.5:1 in `default` and `events`, row four misses it narrowly in the same two. Rows three and
four are the contract's own paired status foreground/background tokens, which makes them the
most surprising of the four. Row two is not text: it is the entire affordance that says "you
can drop here", and it is under the 3:1 that WCAG 1.4.11 asks of a graphical object in every
theme. The contract promises a ratio for none of them, which is exactly why it is worth
measuring. Retint through `--C-TEXT-MUTED` and `--C-BORDER-DEFAULT`, or through `className`,
if this matters for your audience.

Drag-over feedback rests on the same arithmetic: the fill moves `--C-SURFACE-1` →
`--C-SURFACE-2`, a 1.04–1.09:1 change nobody can see, so the whole signal is the border going
`--C-BORDER-FOCUS` — 3.34:1 in the default theme and `tech` 13.70:1, but 2.52:1 in `events`
and 2.55:1 in `grimdark`.

A few values are deliberately hard literals rather than tokens: the 10rem minimum zone height
and large-preview height, the 8rem grid column floor, the 2.5rem thumbnail, the 1.75rem and
1.5rem remove buttons, the 2px dashed stroke and the 2px grid gutter. So is the remove
button's drop shadow, `0 1px 3px rgb(0 0 0 / 0.15)` — a literal black, not `--SHADOW-SM`, so
it does not lighten on the dark themes.

## Gotchas

- **A file with no MIME type only matches an extension rule.** Browsers cannot always infer
  `file.type`, and an empty one matches no MIME entry — not even `image/*`. If you need those
  files, include an extension (`".pdf"`) alongside the MIME type, or use `*/*`.
- **A rejected file is silent.** Nothing fires, nothing renders, no internal error state
  exists despite the `error` prop being described as overriding one. A user who drops a 6 MB
  file into a `maxSize={5 * 1024 * 1024}` zone sees precisely nothing happen. Validate in your
  own `onFilesSelected` if you need to say why.
- **`preventDefault()` in your `onClick`, `onKeyDown`, `onDragOver` or `onDragLeave` cancels
  the component's.** All four compose: your handler runs first, then the built-in one, but only
  `if (!e.defaultPrevented)`. So `<FileUpload onClick={track} />` fires `track` *and* opens the
  dialog, while `e.preventDefault()` opts that one interaction out. `onDrop` is `Omit`ted from
  the type, so the drop path is not overridable at all. (`aria-label`, `role` and `tabIndex`
  are ordinary rest props, spread last, where last-writer-wins is useful.)
- **On `onDragOver` that opt-out collides with the platform.** Calling `preventDefault()` in a
  `dragover` handler is also the standard way to signal "a drop is allowed here" — and here it
  reads as the opt-out, so the drag-over class is never applied. The drop still lands (your
  `preventDefault()` already allowed it), but the border and fill never change to say the zone
  is armed. Leave `onDragOver` un-prevented if you only want to observe the drag.
- **Per-row remove falls back to `onClear`.** The remove button on a row is
  `onRemoveFile ? () => onRemoveFile(i) : onClear`. With three files and only `onClear` wired,
  clicking the X on the second one clears all three — measured. Pass `onRemoveFile` whenever
  `multiple` is on. With neither prop, no remove button renders at all.
- **`success` is ignored while files are present.** Both the success class and the success
  paragraph are gated on the empty state, so `<FileUpload files={files} success="Done." />`
  shows nothing. `error` does render in both states — though `.file-upload--has-files` sits
  later in the stylesheet than `.file-upload--error` at equal specificity, so its
  `--C-BORDER-DEFAULT` border wins there and only the fill and the message go red.
- **`uploading` plus `files` is an inert preview with no indication.** `Uploading...` only
  renders in the empty state, and no `aria-busy` is set, so all you get is
  `pointer-events: none` on a preview that still looks fully interactive. Render your own
  progress next to it — [ProgressBar](progress-bar.md) — and expect Replace, Clear all and the
  remove buttons to stop responding.
- **The hint disappears in the preview state.** `hint` (and the `maxSize` line it generates)
  renders only alongside the prompt, so your size and format limits are off-screen exactly
  when the user is looking at what they picked.
- **`children` typechecks and is dropped.** The props intersect `ComponentPropsWithRef<"div">`
  without omitting `children`, and the rest spread sits before the component's own JSX
  children, so `<FileUpload>Drop invoices here</FileUpload>` compiles and renders the stock
  prompt. There is no slot for custom content.
- **Pass a stable `files` array.** Object URLs are minted in a `useMemo` keyed on array
  identity, so an inline `files={[file]}` creates and revokes one on every parent render —
  measured 3 creations across two unrelated re-renders — and the `<img src>` changes each time.
  Under `<StrictMode>` the double render leaks one URL per media file per mount, permanently.
- **Client component.** `"use client"` is at the top of `FileUpload.tsx`, so importing it into
  a server component establishes a client boundary rather than failing.

## Accessibility

The root is a `<div role="button" tabIndex={0} aria-label="Upload file">`. Enter and Space both
activate on `keydown` and are `preventDefault`ed, so Space does not scroll the page — a `<div>`
gets no synthetic click from either key, which is why that handler exists. The real
`<input type="file">` is `sr-only`, `tabIndex={-1}` and `aria-hidden`, so it is in neither the
tab order nor the accessibility tree. `disabled` sets `aria-disabled="true"` **and**
`tabIndex={-1}`, so a disabled dropzone is not reachable by keyboard at all and cannot be
discovered by tabbing.

Three gaps are worth planning around:

- **The default name is generic and it is the only name.** "Upload file" says nothing about
  what file. Rest props are spread last, so pass your own `aria-label` — measured to win over
  the built-in — whenever more than one dropzone shares a page.
- **Nothing announces the error or the success message.** Both render as a plain `<p>` with no
  `role="alert"`, no `aria-live`, and no `aria-describedby` from the dropzone — measured
  `aria-describedby: null`. A keyboard user focused on the zone hears "Upload file, button"
  and never hears "That file is larger than 5 MB." Route the same string into a live region
  you own, or an [Alert](alert.md) or [Toast](toast.md).
- **The preview nests real buttons inside `role="button"`.** With one file present the root is
  still a focusable button named "Upload file" containing three `<button>`s — Remove, Replace,
  Clear all. ARIA makes a button's descendants presentational, so those controls are not
  reliably exposed, and Enter or Space anywhere on the root reopens the file dialog rather
  than acting on the preview. Pointer clicks inside the preview are safe: it stops click and
  keydown propagation.

Neither status is signalled by colour alone — the error and success states always carry the
string you supplied as text, and the drag-over state is a live pointer interaction rather than
a state anyone needs announced. Every remove button carries `aria-label="Remove <filename>"`,
so rows are distinguishable; note that string, `Replace`, `Clear all`, `Uploading...`,
`Drag & drop or browse` and `Upload file` are all hard-coded English with no prop to reach
them except `aria-label`.

## Related

[AvatarUpload](avatar-upload.md) · [ProgressBar](progress-bar.md) · [Alert](alert.md) ·
[Toast](toast.md) · [Field](field.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
