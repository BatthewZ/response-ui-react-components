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
| `labels`          | `FileUploadLabels`            | English — see [Translating](#translating-the-built-in-copy) |
| `removeFileLabel` | `(file: File) => string`      | ``(file) => `Remove ${file.name}` `` |
| `renderPreview`   | `(item: FileUploadMediaPreviewItem) => ReactNode` — see [Slots](#slots) | — |
| `renderFile`      | `(item: FileUploadPreviewItem) => ReactNode` — see [Slots](#slots) | — |
| `className`       | `string`                      | —        |
| `classNames`      | 11 keys — see [Slots](#slots) | —        |
| `ref`             | `Ref<HTMLDivElement>`         | —        |
| `onFilesRejected` | `(rejections: FileUploadRejection[]) => void` | — |
| …rest             | props of `div` minus `children` | —      |

Rejected files reach you through `onFilesRejected` as `FileUploadRejection` objects —
`{ file: File; reason: "type" | "size" }`, importable from the package root — and show an
internal message that `error` overrides. `accept` understands exact MIME types, wildcards (`image/*`), and filename
extensions (`.pdf`). See [Gotchas](#gotchas).

## What happens when files arrive

Drop and browse run the same path:

1. A null or empty `FileList` stops here; otherwise it becomes an array.
2. Each file is kept only if `accept` is unset/empty **or** the file matches an entry — by
   exact MIME type, by a wildcard such as `image/*`, or by filename extension — **and**
   `maxSize` is unset **or** `file.size <= maxSize`.
3. Every file that failed is collected with the reason it failed. If there are any,
   `onFilesRejected` fires with the list and the dropzone shows an internal message naming the
   file — which the `error` prop overrides, and which the next clean selection clears.
4. `onFilesSelected` fires with the survivors when `multiple`, or with a one-element array
   holding the first survivor when not — on the same selection as any rejections, so a
   mixed drop reports both.
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
whenever `multiple` is on: without it no per-row remove control renders at all, and the only
way out is Clear all.

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
dialog and does nothing at all on the drop path — the array check is what actually holds,
and it speaks the attribute's own grammar: exact MIME types, `image/*`-style wildcards and
the `*/*` catch-all matched case-insensitively against `file.type`, plus `.pdf`-style
entries matched against the end of the file name. So `["image/*"]` and `[".pdf"]` accept on
the drop path exactly what they offer in the dialog.

`maxSize` is a byte count, and with no `hint` of your own it also writes the hint line
(`Max file size: 5.0 MB` — `B` under 1 KB, then `KB` or `MB` to one decimal).

A file either check turns away never reaches `onFilesSelected`, but it is not silent: the
dropzone shows an internal message naming it, and `onFilesRejected` hands you the list with
each file's reason. To word the report yourself, do the validation in your own handler
instead and feed the string back through `error` — it overrides the internal message for as
long as it is set. The message below is a second piece of your own state,
`const [error, setError] = useState<string | null>(null)`:

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

Object URLs for the media previews are minted in an effect and keyed on each `File`'s own
identity, not on the `files` array's — so an inline `files={[selected]}`, rebuilt on every
parent render, reuses the URL it already has instead of churning through a fresh mint/revoke
pair each time. A URL is revoked the moment its `File` leaves the array, and every live one is
revoked on unmount, including under StrictMode's double render. Because minting happens after
commit rather than during render, a media preview paints its frame one tick before its image
lands.

## States

<!-- example:States -->
```tsx
<FileUpload uploading />
<FileUpload success="contract-signed.pdf uploaded." />
<FileUpload error="That file is larger than 5 MB." />
<FileUpload disabled hint="Uploads are locked while this project is archived." />
```
<!-- /example -->

`uploading` swaps the prompt for `Uploading...`, sets `aria-busy` on the root and `disabled`
on Replace, Clear all and every per-row remove — so the window explains itself to a keyboard
as well as a mouse. In the preview state it renders its own `Uploading...` status line, since
the prompt is not on screen there. `disabled` dims the zone to 50%, sets `aria-disabled`, moves
`tabIndex` to `-1` and disables the hidden input. Both also short-circuit the click, key and
drop handlers in JS.

`error` and `success` are strings you supply, and both render in either state. `error` also
overrides the internal message a rejected file produces.

## Naming the dropzone

The root's default `aria-label` is `"Upload file"`, which says nothing about *which* file.
`labels.dropzone` renames it, and rest props are spread last, so a plain `aria-label` replaces
it cleanly and wins over `labels.dropzone` if you pass both:

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

## Translating the built-in copy

Every word the component supplies is a default, not a fixture. The six fixed words live on one
`labels` object, and the one string that interpolates — a remove button's name, which carries
the file's own name — is a function, the same split [TagInput](tag-input.md) and
[Repeater](repeater.md) use:

```tsx
<FileUpload
  files={files}
  onFilesSelected={setFiles}
  onClear={() => setFiles([])}
  onRemoveFile={removeAt}
  labels={{
    prompt: "Glisser-déposer ou",
    browse: "parcourir",
    uploading: "Envoi…",
    replace: "Remplacer",
    clearAll: "Tout effacer",
    dropzone: "Téléverser un fichier",
  }}
  removeFileLabel={(file) => `Supprimer ${file.name}`}
/>
```

Any key you leave out keeps its English default; `""` renders an empty string rather than
falling back. The internal rejection message ("…is not an accepted file type") is **not** on
this object — it is generated per file, and the way to replace it is `onFilesRejected` plus
your own `error` string, which overrides it.

## Slots

FileUpload is the largest element tree in the package, and it is deliberately **not** exposed
as one flat class map. It splits in two, along the line the component's own dispatch already
draws:

- the **dropzone chrome** — everything the root renders itself — takes `classNames`;
- the **previews** — three private components the root picks between from the file list — take
  `renderPreview` and `renderFile`.

A single class map over both would name elements a given caller may never see: with one image
you get the large preview and none of the grid's classes exist; with `previewMode="compact"`
neither media tree renders at all. What a caller wants inside a preview is different
*content* anyway, not a different class on library markup.

### `classNames` — the dropzone chrome

| Slot           | Element                              | State it renders in |
| -------------- | ------------------------------------ | -------------------- |
| `icon`         | `span.file-upload__icon`             | empty                |
| `text`         | `p.file-upload__text`                | empty                |
| `textEmphasis` | `span.file-upload__text-emphasis` — the "browse" word | empty |
| `preview`      | `div.file-upload__preview`           | preview              |
| `list`         | `div.file-upload__media-grid` **and** `div.file-upload__preview-list` | preview |
| `actions`      | `div.file-upload__preview-actions`   | preview              |
| `replace`      | the **Replace** button               | preview              |
| `clear`        | the **Clear all** button             | preview, with `onClear` |
| `hint`         | `p.file-upload__hint`                | both                 |
| `error`        | `p.file-upload__error`               | both                 |
| `success`      | `p.file-upload__success`             | both                 |

```tsx
<FileUpload
  files={files}
  onFilesSelected={setFiles}
  classNames={{ text: "text-h4", textEmphasis: "underline", list: "grid-cols-2" }}
/>
```

`list` addresses both preview containers because they are one concept the component picks
between — a media grid when there are several images, a row list for everything else. With
both on screen the class lands on both. `hint`, `error` and `success` likewise reach the
empty state's element and the preview state's, since they are the same message in two places.

### State attributes, and why they beat a slot

The root carries six `--modifier` classes, and each is mirrored as a `data-*` attribute:
`data-has-files`, `data-drag-over`, `data-uploading`, `data-success`, `data-error` and
`data-disabled`. An absent state writes no attribute at all.

That means state-conditional styling needs no slot — it is a variant on the one prop that
already reaches the root:

```tsx
<FileUpload className="data-drag-over:ring-2 data-drag-over:ring-border-focus" />
```

The modifier classes are unchanged and remain the hook for a plain consumer stylesheet.

### `renderPreview` and `renderFile`

`renderPreview` replaces the built-in preview for an image or video; `renderFile` replaces the
compact row. Each receives one file and everything the default markup is built from:

| Field         | Type                    | Notes                                                    |
| ------------- | ----------------------- | -------------------------------------------------------- |
| `file`        | `File`                  | —                                                         |
| `previewUrl`  | `string \| undefined`   | an object URL for media; absent for other types, and for the first paint after selection |
| `index`       | `number`                | position in `files` — what `onRemoveFile` expects        |
| `remove`      | `(() => void) \| undefined` | absent unless `onRemoveFile` is set                   |
| `removeLabel` | `string`                | from `removeFileLabel`                                    |
| `disabled`    | `boolean`               | true while `uploading`                                    |

`renderPreview`'s item carries one field more: `layout`, either `"large"` (a lone media file)
or `"grid"` (several). That is the branch the component chose from the file list, and it is
handed over rather than left to be guessed.

```tsx
<FileUpload
  multiple
  files={files}
  onFilesSelected={setFiles}
  onRemoveFile={(i) => setFiles((f) => f.filter((_, n) => n !== i))}
  renderFile={({ file, remove, removeLabel }) => (
    <Row className="items-center gap-r5">
      <span className="grow">{file.name}</span>
      {remove && (
        <IconButton aria-label={removeLabel} onClick={remove}>
          <X size={16} />
        </IconButton>
      )}
    </Row>
  )}
/>
```

**The containers stay the component's.** Your nodes are placed inside the same media grid and
row list the defaults use, so `classNames.list` still reaches them, and the preview region
keeps its `role="presentation"` and the click/key guards that stop a press inside a preview
re-opening the file picker. `index` is worth the field it takes: a renderer is handed one file
at a time out of a *partitioned* list, so the second compact row may well be the fourth entry
of `files`, and only `index` or the bound `remove` gets that right.

The hidden `<input type="file">` takes neither a slot nor a render prop. Its `sr-only` is what
keeps it off screen while leaving it clickable programmatically, and `accept`, `multiple` and
`disabled` are the props that configure it.

## Theme tokens

`FileUpload.css` is gone: everything this component paints is a Tailwind utility in
`FileUpload.tsx`, each resolving to a contract variable, so overriding any of these re-tints
it at runtime with no rebuild — and because the utilities sit in `@layer utilities`, a
`className` of your own beats every one of them.

| Where                                        | Utility                                                | Override                                        |
| -------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| Dropzone fill · thumbnail & glyph wells       | `bg-surface-2`                                        | `--C-SURFACE-2`                                 |
| Drag-over fill                                | `bg-surface-3`                                        | `--C-SURFACE-3`                                 |
| Overlay remove buttons                        | `bg-surface-0`                                        | `--C-SURFACE-0`                                 |
| Dashed border · row separators · action bar   | `border-border-default`                               | `--C-BORDER-DEFAULT`                            |
| Hover + drag-over border · glyph · focus ring | `hover:border-border-focus` `border-border-focus` `text-border-focus` `focus-visible:outline-border-focus` | `--C-BORDER-FOCUS` |
| Prompt · hint · size · glyphs · Clear all     | `text-fg-muted`                                       | `--C-TEXT-MUTED`                                |
| File name in a preview row                    | `text-fg-primary`                                     | `--C-TEXT-PRIMARY`                              |
| "browse" emphasis · Replace                   | `text-accent`                                         | `--C-ACCENT`                                    |
| Success border, glyph and message             | `border-status-success` `text-status-success`         | `--C-STATUS-SUCCESS`                            |
| Success fill                                  | `bg-status-success-bg`                                | `--C-STATUS-SUCCESS-BG`                         |
| Error border, glyph, message, remove hover    | `border-status-error` `text-status-error` `hover:text-status-error` | `--C-STATUS-ERROR`                |
| Error fill · remove-button hover wash         | `bg-status-error-bg` `hover:bg-status-error-bg`        | `--C-STATUS-ERROR-BG`                           |
| Zone & large-preview corners                  | `rounded-md`                                          | `--RADIUS-MD`                                   |
| Thumbnail · action-button corners             | `rounded-sm`                                          | `--RADIUS-SM`                                   |
| Remove-button circles                         | `rounded-full`                                        | `--RADIUS-FULL`                                 |
| Prompt & file-name type                       | `text-body-2`                                         | `--BodyText-2` · `--BodyText-2-line-height`     |
| Hint, size, message & action type             | `text-body-3`                                         | `--BodyText-3` · `--BodyText-3-line-height`     |
| Emphasis weight                               | `font-semibold`                                       | `--Semibold-Weight`                             |
| Zone padding                                  | `p-r3`                                                | `--R-SIZE-3`                                    |
| Row padding · caption & action-bar gutters    | `p-r4` `px-r4` `gap-r4`                               | `--R-SIZE-4`                                    |
| Zone stack gap · action-bar padding           | `gap-r5` `py-r5`                                      | `--R-SIZE-5`                                    |
| Grid chrome insets                            | `top-r6` `right-r6` `py-r6`                           | `--R-SIZE-6`                                    |
| Colour & border transitions                   | `duration-[var(--MOTION-DURATION-SHIFT)]` `ease-[var(--MOTION-EASE-SHIFT)]` | `--MOTION-DURATION-SHIFT` · `--MOTION-EASE-SHIFT` |

Three of those spacing tokens step up at the 40rem breakpoint along the responsive `r`-scale
(`--R-SIZE-3` 1rem → 1.5rem, `--R-SIZE-4` 0.75rem → 1.25rem, `--R-SIZE-5` 0.5rem → 0.75rem);
`--R-SIZE-6` sits on the same scale but holds at 0.25rem. The `--BodyText-*` steps are
responsive too. Every element that declares a transition is covered by the reduced-motion
block — the zone, the icon and all five button classes — so `prefers-reduced-motion: reduce`
leaves nothing animating.

**The file name is the one piece of ink that is pinned, not muted.** `FileUpload.css` inks it
from `--C-TEXT-PRIMARY`, so it holds the theme's body colour regardless of what an ancestor
sets — everything else in a preview row reads from `--C-TEXT-MUTED`.

**Contrast numbers worth knowing before you ship this.** The column that decides whether this
component is accessible out of the box is **`default`** — it is the only theme the design system
defines, and it is what you get if you never write a theme. The three example columns are there to
show how far a retune moves each pair, not to be lived up to: `events`, `grimdark` and `tech` are
worked examples that nothing imports, and a theme of your own replaces those numbers entirely.

Each pair is measured against the background this component actually paints behind it, taken from
the class strings in `FileUpload.tsx` rather than from the token names:

| Pair                                            | Painted on             | default   | events | tech  | grimdark |
| ----------------------------------------------- | ---------------------- | --------- | ------ | ----- | -------- |
| Prompt · hint · size · glyph                     | zone fill `SURFACE-2`  | **4.50**  | 4.50   | 5.00  | 5.45     |
| Dashed dropzone border                           | zone fill `SURFACE-2`  | **1.13**  | 1.13   | 1.23  | 1.40     |
| Success message                                  | success fill           | **4.57**  | 4.57   | 13.39 | 6.70     |
| Error message                                    | error fill             | **4.41**  | 4.41   | 5.35  | 4.59     |
| Drag-over border                                 | drag-over fill `SURFACE-3` | **2.97** | 2.87 | 15.49 | 3.94     |

Computed from OKLCH against `@batthewz/response-ui-css` **v0.13.0**, the version this package
depends on. The three message rows are set in `--BodyText-2`/`--BodyText-3` — 12–14px, so AA asks
4.5:1; the two non-text rows answer to WCAG 1.4.11's 3:1.

**In the default theme, three of the five clear their floor and two do not.**

- **The prompt row clears AA by 0.0009** — 4.5009:1, which rounds to the 4.50 in the table and is
  effectively sitting on the line. It is the component's only instruction, so treat any retune of
  `--C-TEXT-MUTED` or `--C-SURFACE-2` as something that needs re-measuring rather than eyeballing.
  (It read 2.06–2.43 before `--C-TEXT-MUTED` was retuned, missing even the 3:1 large-text floor.)
- **The dashed border is the furthest under**, at 1.13:1 against a 3:1 floor, and it is the entire
  affordance that says "you can drop here". No palette retune reaches it: it pairs
  `--C-BORDER-DEFAULT` against a surface rung, and the whole ramp — `SURFACE-0` to `SURFACE-3` —
  spans only **1.13–1.25:1** by design, so no rung can bound another. The fix is a token from a
  different family. `className="border-fg-muted"` puts the dashed edge at **4.50:1** on the zone
  fill; `--C-BORDER-DEFAULT` itself can be retinted if you want it everywhere.
- **The drag-over border is just under**, at 2.97:1. The fill itself carries almost none of the
  signal — `SURFACE-2` → `SURFACE-3` is a **1.02–1.13:1** step nobody can see — so the border
  going `--C-BORDER-FOCUS` is the whole of it, and in the default theme it lands 0.03 short of the
  floor a non-text cue owes. Same remedy: override `--C-BORDER-FOCUS`, or reach the zone's drag
  state directly — `className="data-drag-over:border-fg-primary"` measures **14.33:1** on the
  drag-over fill.
- **The error message is 4.41 against AA's 4.5**, and that pairing — `--C-STATUS-ERROR` on
  `--C-STATUS-ERROR-BG` — is the contract's own designated ink/fill pair, used the way it is meant
  to be used. The component is not doing anything unusual here; closing it is a change to the
  token, upstream, not to this component.

The contract promises a ratio for none of these pairings, which is exactly why they are worth
measuring — and why several moved without a line of this component changing. Re-measure against
your own values: none of these numbers transfer to a theme you write.

A few values are deliberately hard literals rather than tokens: the 10rem minimum zone height
and large-preview height, the 8rem grid column floor, the 2.5rem thumbnail, the 1.75rem and
1.5rem remove buttons, the 2px dashed stroke and the 2px grid gutter. So is the remove
button's drop shadow, `0 1px 3px rgb(0 0 0 / 0.15)` — a literal black, not `--SHADOW-SM`, so
it does not lighten on the dark themes.

## Gotchas

- **A file with no MIME type only matches an extension rule.** Browsers cannot always infer
  `file.type`, and an empty one matches no MIME entry — not even `image/*`. If you need those
  files, include an extension (`".pdf"`) alongside the MIME type, or use `*/*`.
- **The internal rejection message is English, and `error` is how you replace it.** A user who
  drops a 6 MB file into a `maxSize={5 * 1024 * 1024}` zone gets `"…" is too large (6.0 MB).
  The maximum is 5.0 MB.` in a `role="alert"`. To word it yourself, take `onFilesRejected` and
  feed your own string back through `error` — it wins for as long as it is set.
- **`preventDefault()` in your `onClick`, `onKeyDown`, `onDragOver`, `onDragLeave` or
  `onDrop` cancels the component's.** All five compose: your handler runs first, then the
  built-in one, but only `if (!e.defaultPrevented)`. So `<FileUpload onClick={track} />` fires
  `track` *and* opens the dialog, while `e.preventDefault()` opts that one interaction out.
  (`aria-label`, `role` and `tabIndex` are ordinary rest props, spread last, where
  last-writer-wins is useful.)
- **On `onDragOver` that opt-out collides with the platform.** Calling `preventDefault()` in a
  `dragover` handler is also the standard way to signal "a drop is allowed here" — and here it
  reads as the opt-out, so the drag-over class is never applied. The drop still lands (your
  `preventDefault()` already allowed it), but the border and fill never change to say the zone
  is armed. Leave `onDragOver` un-prevented if you only want to observe the drag.
- **Per-row remove needs `onRemoveFile`.** Without it, no per-row remove control renders —
  falling back to `onClear` would delete the whole list when the user asked for one file. Pass
  `onRemoveFile` whenever `multiple` is on.
- **Both messages render in both states**, though `.file-upload--has-files` sits later in the
  stylesheet than `.file-upload--error` / `--success` at equal specificity, so its
  `--C-BORDER-DEFAULT` border wins in the preview and only the fill and the message are tinted.
- **`uploading` plus `files` disables the preview's controls rather than deadening them.**
  Replace, Clear all and every remove button carry `disabled`, the root carries `aria-busy`,
  and an `Uploading...` status line renders in the preview. Add your own
  [ProgressBar](progress-bar.md) if you have real progress to show.
- **The hint disappears in the preview state.** `hint` (and the `maxSize` line it generates)
  renders only alongside the prompt, so your size and format limits are off-screen exactly
  when the user is looking at what they picked.
- **`children` is a compile error.** The props omit it from `ComponentPropsWithRef<"div">`, so
  `<FileUpload>Drop invoices here</FileUpload>` no longer typechecks and then silently renders
  the stock prompt. There is no slot for custom content.
- **An inline `files` array is now safe.** Object URLs used to be minted in a `useMemo` keyed
  on the array's identity, so an inline `files={[file]}` created and revoked one on every
  parent render (measured 3 creations across two unrelated re-renders, with the `<img src>`
  changing each time), and `<StrictMode>`'s double render leaked one URL per media file per
  mount, permanently. Both are fixed: minting is an effect keyed on each `File`'s identity, so
  the same measurement now reads 1 creation and 0 revocations, and a StrictMode mount leaves
  exactly one live URL and none after unmount.
- **Client component.** `"use client"` is at the top of `FileUpload.tsx`, so importing it into
  a server component establishes a client boundary rather than failing.

## Accessibility

In the empty state the root is a `<div role="button" tabIndex={0} aria-label="Upload file">`.
With files present it is a plain `<div>` — no role, no `tabIndex`, no name — because the
preview holds real buttons and ARIA makes a `button`'s descendants presentational. Enter and
Space both
activate on `keydown` and are `preventDefault`ed, so Space does not scroll the page — a `<div>`
gets no synthetic click from either key, which is why that handler exists. The real
`<input type="file">` is `sr-only`, `tabIndex={-1}` and `aria-hidden`, so it is in neither the
tab order nor the accessibility tree. `disabled` sets `aria-disabled="true"` **and**
`tabIndex={-1}`, so a disabled dropzone is not reachable by keyboard at all and cannot be
discovered by tabbing.

Three gaps are worth planning around:

- **The default name is generic.** "Upload file" says nothing about what file. Rest props are
  spread last, so pass your own `aria-label` — measured to win over both the built-in default
  and `labels.dropzone` — whenever more than one dropzone shares a page.
- **The error and success messages are announced and referenced.** `error` renders in a
  `role="alert"`, `success` in a `role="status"`, and the dropzone's `aria-describedby` points
  at whichever of the hint, the error or the success message is on screen.

Neither status is signalled by colour alone — the error and success states always carry the
string you supplied as text, and the drag-over state is a live pointer interaction rather than
a state anyone needs announced. Every remove button is named for its own file — `Remove
<filename>` by default — so rows are distinguishable. That name, and every other word the
component supplies, is overridable: see [Translating the built-in
copy](#translating-the-built-in-copy). The internal rejection message is the one exception,
and `error` replaces it.

## Related

[AvatarUpload](avatar-upload.md) · [ProgressBar](progress-bar.md) · [Alert](alert.md) ·
[Toast](toast.md) · [Field](field.md) ·
[Extending components](../extending.md) · [Theme contract](../theme-contract.md)
