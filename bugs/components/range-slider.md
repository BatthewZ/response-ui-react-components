# range-slider — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 295 · RangeSlider — the invalid state never reaches the focused control (med)

`aria-invalid` is written on the wrapper `<div>` as a CSS hook and nowhere else. Measured with
`<RangeSlider error defaultValue={[20,80]} minLabel="Low" maxLabel="High"/>`: the root reads
`aria-invalid="true"`, and both `<input type="range">` elements read `aria-invalid = null`. The
control a user actually focuses therefore never reports itself invalid, and what remains of the
error state is the fill and thumbs turning `--C-STATUS-ERROR` — status by colour alone (WCAG 1.4.1).
**Fix:** put the invalid flag on both inputs, keeping the wrapper attribute as the CSS hook.

### 296 · RangeSlider — the Field's error text is referenced by nothing (med)

`useFieldErrorProps` returns `{ "aria-invalid", "aria-describedby" }` and the component destructures
only the first. Measured inside `<Field error="Pick a narrower window."><RangeSlider/><FieldError/></Field>`:
the error `<p id="_r_0_-error" role="alert">` renders, and a query for `[aria-describedby]` anywhere
in the subtree returns **zero elements** — not on the wrapper, not on either input. So an invalid
range slider is, to a screen reader, an ordinary one. This is what makes RangeSlider the
"wired-but-partial" case in the field-error pattern above; `field.md` claimed all eleven hook
consumers forward both attributes and has been corrected.
**Fix:** forward the whole `fieldErrorProps` object onto both inputs.

### 297 · RangeSlider — collided thumbs bury one of the two (med)

`pointer-events` is confined to the thumbs, so where two thumbs overlap exactly the pointer always
grabs whichever input is stacked higher, and the stacking is decided by a static heuristic:
`lowOnTop = activeThumb === "lo" || (activeThumb === null && lo > (min + max) / 2)`. Measured on a
0–100 scale: `value={[30,30]}` → both inputs `style.zIndex === ""`, so DOM order puts the *upper*
input on top and the lower thumb cannot be dragged; `value={[70,70]}` → the low input gets
`zIndex: "4"` and the *upper* thumb cannot be dragged. Both branches bury one thumb; the midpoint
only chooses which. It frees itself once the reachable thumb is dragged away, and the keyboard
reaches both throughout, but to a pointer user the control reads as stuck.
**Fix:** choose the top thumb from the pointer's position (nearest value at `pointerdown`) rather
than from `lo > (min + max) / 2`.

### 298 · RangeSlider — no per-thumb ARIA is reachable from outside (med)

The props type is `Omit<ComponentPropsWithRef<"div">, …>` and `{...props}` lands on the wrapper,
while the two inputs get only `min`, `max`, `step`, `value`, `disabled` and their `aria-label`
(measured attribute list: `class, min, max, step, aria-label, type, value`). So
`<RangeSlider min={-30} max={10} aria-valuetext="minus 20 degrees" id="temp"/>` puts both attributes
on the wrapper and `null` on both inputs. `aria-valuetext` is the one attribute that fixes a
non-percentage announcement, and there is no route to it; `minLabel`/`maxLabel` are the entire
per-thumb ARIA surface.
**Fix:** expose per-thumb prop bags, or at minimum forward `aria-valuetext` and `aria-describedby`
to each input.
