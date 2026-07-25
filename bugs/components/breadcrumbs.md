# breadcrumbs — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 138 · Breadcrumbs — overlapping collapse renders a crumb twice with a duplicate key (med)

Breadcrumbs.tsx:57-58 slices `[0, itemsBeforeCollapse)` and
`[len - itemsAfterCollapse, len)` independently with no overlap guard, while
`shouldCollapse` (:52) tests only `length > maxItems`. Measured with
`maxItems={4} itemsBeforeCollapse={3} itemsAfterCollapse={3}` and five crumbs:
`["Home","Catalog","Widgets","…","Widgets","Blue","Blue XL"]`, `WIDGETS COUNT: 2`, plus
React's *"Encountered two children with the same key, `.2`. …the behavior is
unsupported"*. It also fires on defaults with `maxItems={0}`: `["Only","…","Only"]`.
**Fix:** skip collapsing when the two slices would meet (MUI's guard), or clamp the tail
slice to start at `itemsBeforeCollapse`.

### 139 · Breadcrumbs — ellipsis expansion never resets (low · downgraded from med)

**Downgraded from med after investigation.** True: `useState(false)` at :49, only ever
`setExpanded(true)` at :66, no reset effect and no `expanded` prop — so one instance in a
persistent layout stays expanded across every later route change. The consequence is bounded,
which is why this is low: `Breadcrumbs.css:3-7` sets `flex-wrap: wrap`, so a full trail wraps
onto another line rather than overflowing or clipping — no layout break, no a11y effect, no data
loss. "Once the user asked to see the whole trail, keep showing it" is a defensible intent, and
`key={pathname}` is an available consumer workaround.
**Fix:** if wanted, reset on a `children` identity change, or accept a controlled `expanded`.
