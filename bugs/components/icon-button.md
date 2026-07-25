# icon-button — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 41 · IconButton — no default `type`, so it submits forms (med)

`<button>` defaults to `type="submit"`; `IconButton` sets no default and passes `type` through
only if the caller supplies it. **Failure scenario:** `Pagination` inside a filter `<form>` —
entirely ordinary — and clicking "next page" submits the form and navigates instead of paging.
Confirmed call sites with no `type`: `Toast.tsx:56`, `Carousel.tsx:149`, `Carousel.tsx:165`,
`Pagination.tsx:116`, `:129`, `:178`, `:191`. The inconsistency is visible *inside* Pagination,
whose plain `<button>` page-number control at `:153` **does** set `type="button"`.
**Fix:** default `type = "button"` in the destructure, still overridable via props.
