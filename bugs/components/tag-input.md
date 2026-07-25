# tag-input — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 245 · TagInput — the binding the docs advertise crashes the component (high)

`{...props}` at line 204 is spread **after** the element's own `onChange={handleChange}`, so a
caller-supplied `onChange` replaces the internal handler entirely. `onChange` is `Omit`ted from
`TagInputProps`, which removes the compile-time warning without removing the runtime behaviour, and
JSX spread of a typed object skips excess-property checking. Measured end to end:
`<TagInput {...form.field<string[]>("tags")} />` — the exact binding **`AGENTS.md:249` and
`README.md:203` both advertise for TagInput** — typechecks with zero errors under the project's own
`tsconfig`, renders fine, and then the first keystroke sends a raw DOM `ChangeEvent` to the form
store, which writes the string `"t"` into the array-typed field; the next render throws
`TypeError: tags.map is not a function`. Nothing about the failure points at the spread.
**Fix:** destructure `onChange` out of the props — it is already `Omit`ted from the type — so
`{...props}` cannot override `onChange={handleChange}`. Then either make the advertised binding
work or stop advertising it.

### 246 · TagInput — `name` submits the draft, not the tags (med)

`name` passes through `...props` to the inner `<input>`, whose value is the in-progress draft
text. Measured: `<form><TagInput name="tags" defaultValue={["react","typescript"]} /></form>` then
`new FormData(form)` yields `[["tags", ""]]` — the two tags are not in the submission at all, and
a half-typed draft would be submitted in their place. There is no hidden input per tag.
**Fix:** render a hidden `<input type="hidden" name={name}>` per tag and keep `name` off the
visible draft field.

### 247 · TagInput — every silent rejection destroys the user's typing (med)

`commitDraft` clears the draft whenever `evaluate` produced no *message*, which covers three
rejection paths that produce none: the `maxTags` cap, a duplicate, and `validateTag` returning
`false`. Measured: `<TagInput maxTags={1} defaultValue={["react"]} />`, type `typescript` and press
Enter → the input is emptied, no chip is added, no message appears, nothing on screen changes.
`validateTag={() => false}` behaves identically. The user cannot tell rejection from a dropped
keystroke. **Fix:** clear the draft only when a tag was actually appended.

### 248 · TagInput — a delimiter typed mid-string discards the tail (med)

`handleChange` commits `raw.split(delimiter)[0]` and then `setDraft("")`, so everything after the
first delimiter is thrown away rather than returned to the draft. Measured: draft `"abc"`, caret
placed after `"a"`, user types `","` → `raw` is `"a,bc"`; tags become `["a"]` and the input is
emptied — `"bc"` is gone. **Fix:** commit every segment and put the trailing remainder back into
the draft instead of blanking it.

### 249 · TagInput — paste wipes the draft and swallows validation messages (med)

`handlePaste` reads only `{ tag }` from `evaluate`, never `{ message }`, and ends with
`setDraft("")` regardless of outcome. Measured with
`validateTag={(t) => t.length > 3 || "Tags must be at least 4 characters"}`: type `"reac"`, then
paste `"js, ts"` → zero tags added, draft wiped to `""`, and the live region still empty. The user
loses their typing and is told nothing about why the paste added nothing.
**Fix:** merge the draft into the first pasted segment, and surface the first message the loop
produces.

### 250 · TagInput — a `g`- or `y`-flagged `delimiter` mutates the caller's RegExp (med)

Both `handleChange` and `handlePaste` call `delimiter.test(...)` on the `RegExp` object the caller
passed. `RegExp.prototype.test` advances `lastIndex` on a global regex and only matches at
`lastIndex` on a sticky one, so the component silently carries state between keystrokes on an
object it does not own. Measured, typing `ab;` `cd;` `ef;` into a fresh field:

| `delimiter` | tags committed | draft after each keystroke | `lastIndex` left behind |
| --- | --- | --- | --- |
| `/;/` | `["ab","cd","ef"]` | `""`, `""`, `""` | `0` |
| `/;/g` | `["ab","ef"]` | `""`, `"cd;"`, `""` | `3` |
| `/;/y` | `[]` | `"ab;"`, `"cd;"`, `"ef;"` | `0` |

Under `/;/g` the second `;` is tested from index 3, matches nothing, resets `lastIndex` to 0, and
leaves the raw text `"cd;"` — delimiter included — in the field, where the next successful commit
destroys it. `/[,\n]/g` reproduces identically. The paste path alternates the same way, falling
through to an ordinary un-split paste on every other attempt. The prop type is a bare `RegExp`
with nothing to warn a caller off `/[,;]/g`, which is a natural thing to write.
**Fix:** normalise internally — `new RegExp(delimiter.source, delimiter.flags.replace(/[gy]/g, ""))`
— or test with `delimiter.source` rather than the caller's object. Documented as a gotcha in
`tag-input.md`. (Recorded here because an earlier pass reported this hazard as *not reproducing*;
it does, but only from the second delimiter onward, which is why a single-keystroke probe misses
it.)

### 251 · TagInput — the chip's remove glyph misses the 3:1 graphical floor (med)

The X inks `--C-TEXT-MUTED` on the chip's `--C-SURFACE-2` fill. Computed from the shipped OKLCH
values: **2.31:1** default, **2.27:1** `events`, **1.94:1** `tech`, **2.23:1** `grimdark` — under
the WCAG 1.4.11 3:1 floor in every shipped theme. Only `hover:text-fg-primary` clears it, which
does nothing for keyboard or touch users. The chip *label* on the same fill is fine
(`--C-TEXT-SECONDARY`, measured 6.87 / 6.87 / 5.32 / 5.11:1), so the fix is local and cheap.
**Fix:** ink the glyph `text-fg-secondary`.

### 252 · TagInput — the tag set changes in silence (med)

The only `aria-live` region on the component is bound to the validation `message`, and the chips
render as `<span>`s inside a `<div>`. Measured with three tags: `queryAllByRole("listitem")` and
`queryAllByRole("list")` are both **0**, and the single live region's text content is `""`.
So committing with Enter, deleting with Backspace, pasting, and clicking a remove button all
mutate the list with no announcement and no structure to navigate. Backspace is the sharpest edge
— with an empty draft every press deletes a chip outright, with no confirmation step and no
feedback. **Fix:** mirror tag-count changes into the polite region, and render the chips as a
labelled `<ul>`/`<li>`.
