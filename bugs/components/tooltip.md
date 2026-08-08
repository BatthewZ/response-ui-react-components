# tooltip — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 120 · Tooltip — the bubble can never be hovered (med)

Tooltip.css:12 sets `pointer-events: none` and Tooltip.tsx:50 calls
`useHover(context, { delay })` with no `handleClose`. Measured: the tooltip is open after
`mouseEnter`, and `open after leave: false` — it vanishes the moment the pointer leaves the
reference. So the pointer can neither enter the bubble nor stay alive on the way to it. For
a three-line tooltip at 200% zoom, the clipped text can never be read or selected, failing
WCAG 1.4.13 (Content on Hover or Focus, "Hoverable").
**Fix:** drop `pointer-events: none` and pass `handleClose: safePolygon()` — exactly what
`HoverCard.tsx:91` already does. Another case of the library being split against itself.

### 121 · Tooltip — invisible and inert inside any Dialog or Drawer (med)

Tooltip.tsx:86 renders `<FloatingPortal>` with no `id`/`root`, so floating-ui falls
back to `document.body`. `Dialog.tsx:24` and `Drawer.tsx:27` call `dialog.showModal()` on
a native `<dialog>`, which paints in the **top layer**. Probed inside an open Dialog:
`dialog.contains(tooltip) === false`, with the chain
`div.tooltip < div[data-floating-ui-portal] < body`. No `z-index: 50` can beat the top
layer, so the bubble renders behind the dialog and inside `showModal()`'s inert subtree.
No prop exists to redirect the portal.
**Fix:** accept an optional portal target (`root`/`portalId`) forwarded to
`FloatingPortal`, or render in place. #127 (low) touches the same
`getFloatingProps`-overwrites-`id` line and can ride along.

**SUPERSEDED — do not copy this row's remedy.** The escape-hatch prop shipped (`container`) and
fixed Tooltip alone; the same defect sat unfixed in **nine** other components — `Popover`,
`HoverCard`, `DropdownMenu`, `ContextMenu`, `Combobox`, `MultiSelect`, `ColorPicker`,
`DatePicker`, `DateRangePicker` — for several releases, because a prop cannot tell anyone a
problem exists. All ten now resolve the portal target automatically from the trigger
(`useDialogPortalRoot`, `src/hooks/use-floating.ts`), and `container` is demoted to an override.
Two things this row got wrong and the next reader should not inherit: **painting is only half of
it** — `showModal()` also makes everything outside the dialog inert, so an element lifted into
the top layer at `<body>` level still takes no click — and the remaining bound after the fix is
clipping, not stacking (#506). Where the right value is derivable, derive it; keep the prop for
the case nobody can derive.
