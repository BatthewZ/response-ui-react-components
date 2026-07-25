# masonry-grid — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 178 · MasonryGrid — an item's props are dropped whenever the grid animates (high)

`MasonryGrid.Item` types itself as `ComponentPropsWithRef<"div">` and, on the default
`animate` path, spreads `{...props}` onto `ScrollReveal` — which destructures only its own eight
named props and renders `<Tag>` with none of the rest (#9). Measured with
`renderToStaticMarkup`:

```
<MasonryGrid><MasonryGrid.Item id="x" role="listitem" aria-label="Note"
  data-k="1" style={{color:"red"}} tabIndex={0}>body</MasonryGrid.Item></MasonryGrid>
→ <div class="masonry-grid"><div class="scroll-reveal-hidden masonry-grid__item">body</div></div>
```

The identical JSX under `animate={false}` emits `id`, `role`, `aria-label`, `data-k`, `style`
**and** `tabindex`. So an animating grid cannot be given item-level semantics from the call site
at all, and there is no type error and no runtime warning. This is the **second** confirmed
downstream victim of #9 after `Swimlane` #171 — the pattern is now established, not anecdotal.
**Fix:** have `Item` render its own `<div {...props}>` and nest `ScrollReveal` inside it, or fix
#9 at the source and spread `...rest` inside `ScrollReveal`.

### 179 · MasonryGrid — the caller's `key` is defeated by the provider (med)

The root maps children through `<MasonryContext.Provider key={index}>`, so React reconciles by
array position no matter what `key` the caller wrote. Prepend one item to a keyed six-item grid
and every item from that position onward unmounts and remounts: uncontrolled input values, video
playback position, scroll offset and component state are all lost, and every remounted item
replays its entrance animation. An identically-keyed plain list preserves its DOM nodes.
**Fix:** key the provider by the child's own key (`isValidElement(child) ? child.key ?? index :
index`), or drop the per-child provider and pass the index another way.

### 180 · MasonryGrid — `columns` above 4 silently collapses to one column (med)

`columns` is typed `number`, but `MasonryGrid.css` ships `--masonry-columns` rules only for 2, 3
and 4 at each of the five breakpoints. `<MasonryGrid columns={5}>` emits
`class="masonry-grid masonry-grid--base-5"` (measured), which matches no rule, so
`columns: var(--masonry-columns, 1)` falls back to **1**. A caller gets a single stacked column
with no error at compile time or runtime. Sibling `Grid.css` already ships 1–6 for the
same-shaped prop, so the two components accept the same object and disagree about what it means.
**Fix:** narrow the type to `1 | 2 | 3 | 4`, or generate the missing rules.

### 181 · MasonryGrid — a breakpoint can widen the grid but never narrow it to one column (med)

`buildResponsiveClasses` does `if (count == null || count === 1) continue`, so a count of `1` at
any breakpoint emits no class at all. `<MasonryGrid columns={{ base: 3, md: 1 }}>` emits only
`masonry-grid--base-3` (measured), and because that base rule sits outside any media query the
grid stays at three columns at every width instead of collapsing to one at 48rem. The skip is
correct for `base` (one column is the CSS fallback) and wrong for every other key. **Fix:** emit
`masonry-grid--<bp>-1` and add matching `--masonry-columns: 1` rules for sm/md/lg/xl.
