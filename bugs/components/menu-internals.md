# menu-internals — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 118 · menu-internals — a `disabled` Item still runs the caller's `onClick` (med · recommend high)

menu-internals.tsx:234-237 calls `props.onClick?.(e)` **before** `handleSelect()`, and
only `handleSelect` (:211-215) returns early on `disabled`. Measured on a `disabled` Item
with both handlers: `onClick` fired **1×**, `onSelect` **0×**. The rendered element is
`<button role="menuitem" aria-disabled="true" tabindex="-1">` — no native `disabled`
attribute. So `<DropdownMenu.Item index={0} disabled onClick={deleteAccount}>` executes
`deleteAccount()` when the greyed-out row is clicked.
**Fix:** move the `disabled` bail to the top of the composed `onClick` and set
`disabled={disabled}` on the `<button>` — which also requires passing `disabledIndices`
to `useListNavigation`, currently absent. Closes with #126 in one pass over `MenuItem` +
`useMenuRoot`.
**Recommend upgrading to high** — a visibly-disabled control executing a destructive
caller handler is a data-loss shape, not an inconvenience.

### 125 · menu-internals — arrow keys are stolen from editable content inside a trigger (med)

menu-internals.tsx:123 wires `useListNavigation` into the shared `useInteractions`,
whose `reference` props land on the trigger. floating-ui's reference `onKeyDown`
`stopEvent()`s ArrowUp/ArrowDown and calls `onOpenChange(true)` under the default
`orientation: "vertical"`, and its `typeableComboboxReference` bail-out is applied only to
the *floating* props, never to this handler. Measured: ArrowDown on a `<textarea>` inside
`ContextMenu.Trigger` gave `notPrevented: false` **and** `menuOpened: true`; same for
ArrowUp on an `<input>` inside `DropdownMenu.Trigger asChild`. Since `ContextMenu.Trigger`
is a plain `<div>` around arbitrary content, wrapping an editable note is the documented
use — and there the caret freezes and the menu pops open over the text.
**Scope narrowed:** for a plain `<button>` trigger this is *correct* WAI-ARIA menu-button
behaviour, so the fix belongs in `useMenuRoot`, not in floating-ui's contract.
**Fix:** add a switch beside the existing `enableClick` that withholds the list-navigation
reference props (or bails when `event.target !== event.currentTarget`) for `ContextMenu`
and `asChild` triggers.

### 126 · menu-internals — a duplicate `Item.index` makes an item permanently unreachable (med)

`index` is a required caller-supplied number and `listRef.current[index] = node`
(menu-internals.tsx:199-223) is an unchecked write, so a later-mounted item silently
overwrites an earlier one. Measured with items at index 0/1/1: five ArrowDowns produced
`["Zero","OneDup","Zero","OneDup","Zero"]` — **"One" is never reachable** — with zero
console warnings. Two `.map()` groups in one menu (recent files, then actions), each with
its own `i`, is enough. The mouse path still works, so **a test written with
`fireEvent.click` passes.**
**Scope narrowed:** *gapped* indices are fine — measured `(0, 2)` from a conditional item
navigating correctly, because floating-ui already skips holes. Only collisions break.
**Fix:** warn in dev on a duplicate `listRef` slot, or drop the prop from the public API
and derive the index from mount order in `MenuContent`. Closes with #118 in one pass.
