# file-upload — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 407 · FileUpload — a caller handler silently replaces the component's interactions (high)

`{...props}` is spread after the component's own `onClick`/`onKeyDown`/`onDragOver`/`onDragLeave`.
Measured `<FileUpload onClick={track} />`: `track` fires once, the hidden input's `click()` fires
**zero** times, so the file dialog never opens and no file can be picked by pointer. Same shape for
`onKeyDown` (keyboard browse) — measured — and for the drag handlers; only `onDrop` is protected by
the `Omit`. Instance of the rest-spread-after-handler pattern (#245, #380, #390).
**Fix:** destructure those four handler names out of rest and compose them with the internal ones.

### 408 · FileUpload — `accept` wildcards and extensions reject every file (med)

`accept` is matched with `Array.includes(file.type)`, while the same array is joined onto the input's
`accept` attribute where wildcards/extensions are valid. Measured: `<FileUpload accept={["image/*"]}
onFilesSelected={fn} />` renders `accept="image/*"`, the picker offers a PNG,
`accept.includes("image/png")` is `false`, `onFilesSelected` calls = 0. `[".pdf"]` behaves
identically; exact MIME (`["image/png"]`) works. Same defect as AvatarUpload #379.
**Fix:** match wildcards and extensions the way the native `accept` grammar does, or document and
validate the same grammar.

### 409 · FileUpload — a rejected file is completely silent (med)

Files rejected by `accept`/`maxSize` produce no callback, no message and no state, despite the `error`
prop's docblock claiming it "overrides internal state" that does not exist. Measured
`<FileUpload maxSize={1024} onFilesSelected={fn} />` + a 5000-byte file: 0 `onFilesSelected` calls, no
`.file-upload__error` node, hint still reads "Max file size: 1.0 KB". The user sees nothing happen.
**Fix:** add an `onFilesRejected(files, reason)` callback, or set an internal error the `error` prop
can override as documented.

### 410 · FileUpload — `uploading` plus `files` is an inert preview with no indication (med)

Measured `<FileUpload uploading files={[file]} />`: textContent "report.pdf2.0 KBReplace", root class
includes `file-upload--uploading` (`pointer-events: none`), `aria-busy` is `null`. The `Uploading...`
text only renders in the empty branch, so the preview looks fully interactive while Replace / Clear all
/ Remove are all dead and nothing says why.
**Fix:** render the uploading affordance in the preview branch too, and set `aria-busy` on the root.

### 411 · FileUpload — a per-file remove deletes every file (med)

A per-item remove button is `onRemoveFile ? () => onRemoveFile(i) : onClear`, so it falls back to
`onClear` when `onRemoveFile` is not supplied. Measured with 3 files, `onClear` wired,
`onRemoveFile` omitted: clicking the button named "Remove b.pdf" fires `onClear` once, dropping all
three. With neither prop, no remove button renders.
**Fix:** render the per-item remove button only when `onRemoveFile` is present, rather than aliasing
it to `onClear`.

### 412 · FileUpload — the preview nests real buttons inside `role="button"` (med)

Measured `<FileUpload files={[file]} onClear={fn} />`: root `role="button"`, `tabindex="0"`,
`aria-label="Upload file"`, with 3 nested `<button>`s (Remove / Replace / Clear all). ARIA's
presentational-children rule means screen readers are not required to expose them, and Enter on the
root reopens the file dialog instead of acting on the preview. (Pointer clicks inside the preview are
safe — it stops click/keydown propagation.)
**Fix:** drop `role="button"`/`tabIndex` on the root once `hasFiles`, and expose a real browse button.

### 413 · FileUpload — the error/success messages are never announced (med)

The `error` and `success` messages render as a plain `<p>` with no live-region role and no
`aria-describedby` from the dropzone. Measured `<FileUpload error="File too large" />`:
`<p class="file-upload__error">File too large</p>` with `role`/`aria-live` `null`, root
`aria-describedby` `null`. A keyboard user focused on the zone hears "Upload file, button" and nothing
else.
**Fix:** give the message an id, wire `aria-describedby`, and add `role="status"`/`role="alert"`.

### 414 · FileUpload — the dropzone prompt and dashed border are below their WCAG floors (med)

Computed from the shipped OKLCH values, each pair against the `--C-SURFACE-1` fill the component itself
paints: `--C-TEXT-MUTED` = 2.43 / 2.37 / 2.06 / 2.43 (default / events / tech / grimdark) for the only
instruction text at `--BodyText-2`/`--BodyText-3` (AA 4.5, large-text floor 3.0);
`--C-BORDER-DEFAULT` = 1.18 / 1.18 / 1.18 / 1.26 for the 2px dashed border that is the entire "you can
drop here" affordance (WCAG 1.4.11 asks 3.0). Drag-over feedback is the same story: fill change
1.04–1.09:1, border `--C-BORDER-FOCUS` 2.52 (`events`) / 2.55 (`grimdark`). Contrast/#51 family.
**Fix:** use `--C-TEXT-SECONDARY` for the prompt and `--C-BORDER-STRONG` for the dashed border, or
retune the tokens.

### 415 · FileUpload — the contract's own status token pairs fail AA at this type size (med)

`--C-STATUS-SUCCESS` on `--C-STATUS-SUCCESS-BG` = 3.15 / 3.15 / 13.39 / 6.70 and `--C-STATUS-ERROR` on
`--C-STATUS-ERROR-BG` = 4.41 / 4.41 / 5.35 / 4.59 (default / events / tech / grimdark), rendered at
`--BodyText-3` (12–13px), where AA asks 4.5:1 — so success misses it in `default`/`events` and error
misses it narrowly in the same two. This is library-wide, not FileUpload-specific: the contract pairs
these tokens explicitly (docs/theme-contract.md "Status") but promises no ratio. This is the fifth
token family measured, and the first pairing named for status.
**Fix:** retune the `-BG` tints, or state a ratio in the contract and add a guard.

### 427 · FileUpload — `onDrop` is still uncomposed, and composing it is a public type change (med)

#407 composed `onClick`/`onKeyDown`/`onDragOver`/`onDragLeave`, leaving `onDrop` as the
only handler a spread still sits after (FileUpload.tsx:492). Today the `Omit` makes it
unreachable through the typed surface, so nothing is broken *yet* — but the `Omit` is not
protection: a JSX spread bypasses the excess-property check (PLAN.md §3), so an object
carrying `onDrop` still replaces the component's drop handling.
**Door:** composing it means removing `Omit<…, "onDrop">` and declaring the prop, which is
a public type change. Deferred with the rest of §3 rather than decided here.
**Related sharp edge, already shipped:** on `onDragOver`, `preventDefault()` idiomatically
means "a drop is allowed", and it now also reads as the composition opt-out.

### 435 · FileUpload — the hidden input's `click()` re-entered the dropzone handler (med)

The hidden `<input type="file">` is a descendant of the clickable root, so
`inputRef.current.click()` bubbled back up and re-invoked the root's own click handler:
**2** `input.click()` calls per single user click on the pre-fix code. The second was a
no-op only because of the HTML click-in-progress flag, and the existing test asserted
`toHaveBeenCalled()`, which passes on a double-fire — the #422 shape (a green test over the
exact failure it claims to cover), found in real tests twice this pass.
Harmless while a caller's `onClick` was being *replaced*; once #407 composed them it would
have double-fired the caller's handler on every click, so #407 was not deliverable without
this. **Fixed** alongside it by stopping propagation on the input, and locked by tightening
the assertion to an exact count.
