# context-menu — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 123 · ContextMenu — REFUTED: the cursor anchor is rebuilt on every open (med → refuted)

**Refuted, measured.** The row claimed `setPositionReference` is never cleared so every later
open reuses the last cursor point. ContextMenu.tsx:80-89 in fact rebuilds the virtual reference
on *every* `contextmenu` event — it destructures `clientX`/`clientY` and calls a fresh
`refs.setPositionReference({ getBoundingClientRect: () => new DOMRect(clientX, clientY, 0, 0) })`.
Measured rather than read from a comment: three right-clicks at `clientY` 20 / 400 / 66 produced
content transforms `translate(8px, 16px)`, `translate(8px, 396px)`, `translate(8px, 62px)`. The
menu tracks the cursor exactly.
**Residue, if the owner wants it as a separate low:** the reference is never *cleared*, so an
open driven purely by the controlled `open` prop after an earlier right-click anchors at that
stale point instead of the trigger box — a narrower and different claim than this row made.

### 124 · ContextMenu — one right-click opens every ancestor menu, and they hide each other (med)

ContextMenu.tsx:81 calls `event.preventDefault()` but never `stopPropagation()`, so
`contextmenu` bubbles to every ancestor trigger. Measured with nested triggers, a single
right-click on the inner one: `menus open: 2`, items `["Inner A","Outer A"]` — and both
portal wrappers reported `aria-hidden="true"`, because each `MenuContent` mounts a
`modal` `FloatingFocusManager` (menu-internals.tsx:179) that hides the other. A screen
reader gets **neither** menu. (The single-menu case is not `aria-hidden`, so this is
specific to nesting.) A file row with its own menu inside a board pane with one is enough.
**Fix:** call `event.stopPropagation()` alongside `preventDefault()`. The mutual-hiding
half exists only because of the same `modal`-by-default as #117 — triage the two together.
