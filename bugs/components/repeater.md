# repeater — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 257 · Repeater — removing a row drops focus to the body (med)

The Remove button lives inside the row it unmounts. Measured: render two rows, Tab to row 1's
`"Remove item"` and press Enter → `document.activeElement === document.body`, so the next Tab
restarts from the top of the page. Nothing is announced either (see #262).
**Fix:** after a remove, focus the next row's remove button — or the Add button when the list
empties.

### 258 · Repeater — `disabled` disables the chrome, not the form (med)

`disabled` is threaded onto Repeater's own Add / Remove / Move buttons and nowhere else, and
`RepeaterItem` exposes no `disabled` for a render prop to forward. Measured: `<Repeater disabled>`
with an `Input` bound through `form.field()` — Add and Remove report `disabled === true`, the
row's `<input>` reports `disabled === false` and still accepts typing. A caller reading the prop
name reasonably expects the whole group to go inert; freezing the fields actually requires
`useForm`'s own `disabled` option, which is documented nowhere near this prop.
**Fix:** thread `disabled` onto `RepeaterItem` so the render prop can forward it, and say in the
prop's docblock that field disabling lives on `useForm`.

### 259 · Repeater — every row's buttons share one accessible name (med)

`"Move up"`, `"Move down"` and `"Remove item"` are hard-coded English literals with no prop to
change them; `addLabel` is the only configurable string on the component. Measured: five rows
produce five buttons all named `"Remove item"`, giving a screen-reader user nothing to tell them
apart, and no route to localisation. The page's own guidance — put `index + 1` in the row's
visible `Label` — is a workaround, not a fix.
**Fix:** accept per-row label props (or a `labels` object) and interpolate the row index. An
instance of the hard-coded-English pattern named for #39/#64.
