# button — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 74 · Button — no default `type`, and it is the default submitter (med)

Identical in kind to #41 (IconButton), but this is the component every form footer is built from.
`Button.tsx:33` destructures `{ variant, size, as: Tag, className, ...props }` — no `type`.
Verified: `<Button>Cancel</Button>` renders with `getAttribute("type") === null` and
`el.type === "submit"`; clicking it inside a `<form>` fires `onSubmit`.

**Failure scenario:** the canonical footer —
`<form onSubmit={save}><FormActions><Button variant="secondary" onClick={close}>Cancel</Button><Button type="submit">Save changes</Button></FormActions></form>`.
Clicking Cancel runs `close` **and** submits. Worse, Cancel is the first submit button in tree
order, so it is the form's default button: pressing Enter in any text field fires **Cancel**
instead of Save. Confirmed via `event.submitter.textContent === "Cancel"`; adding
`type="button"` to Cancel moves the submitter to "Save changes" and clicking Cancel yields zero
submits. **Fix:** `type={Tag === "button" ? "button" : undefined}` before `{...props}`, so callers
can still pass `type="submit"` and `as="a"` is unaffected. `button.md` now carries the gotcha.
