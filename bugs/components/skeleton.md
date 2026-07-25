# skeleton — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 63-64 · Skeleton — the loading affordance is louder than the content (med)

- **#63** `CommentPlaceholder` (1 circular + 3 text skeletons in a `Card`) mounts **four**
  `role="status"` live regions, verified by render: `textContent` is
  `"LoadingLoadingLoadingLoading"`. A screen-reader user hears "Loading" four times for one card,
  learns nothing about *what* is loading, and gets no announcement when it resolves — the regions
  just vanish. **Fix:** default the element to `aria-hidden` (it is decorative placeholder art)
  and leave the live region to the caller, or expose a `label` so exactly one skeleton in a group
  owns the announcement.
- **#64** identical in shape to Spinner #39: `…rest` spreads last so `aria-label="Chargement"`
  renames the region, but the `sr-only` child text node stays the English "Loading" — the region
  is named in one language and reads its contents in another. **Fix:** a `label?: string` prop
  used for both.
