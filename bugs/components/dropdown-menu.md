# dropdown-menu — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

**Class names below are as they were when each finding was measured.** The menu surface has since
been renamed: the `classPrefix` mechanism is gone, and `.dropdown-menu-content` / `-item` /
`-item-icon` / `-divider` / `-label` are now the static, shared `.menu-content` / `.menu-item` /
`.menu-item-icon` / `.menu-divider` / `.menu-group-header`. Grep the new names when re-checking a
row; the findings themselves are unchanged.

### 116 · DropdownMenu · ContextMenu — the keyboard cursor is a 1.02:1 wash (med)

`.dropdown-menu-item` sets `outline: none` (DropdownMenu.css:34) and gives `:hover`
**and** `:focus-visible` one identical `background: var(--C-SURFACE-1)` (:38-41). Measured
surface-1 on surface-0: **1.045 default · 1.032 events · 1.019 tech · 1.069 grimdark** —
far under SC 1.4.11's 3:1. `useListNavigation` here is non-virtual
(menu-internals.tsx:123), so items take real DOM focus (probed: `activeElement` is the
item) and the UA ring that would have covered this is suppressed. Because one declaration
serves both states, the keyboard position is also indistinguishable from hover.
**Fix:** give `:focus-visible` a real `--C-BORDER-FOCUS` outline rather than a surface
step. `ContextMenu` reuses `classPrefix="dropdown-menu"`, so one rule fixes both. This is
the cheapest member of the surface-ramp cluster (#206/#275/#264/#398) because DOM focus is
actually taken here; it supersedes the generic low #129 for menu items.
