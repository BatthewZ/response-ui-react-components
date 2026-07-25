# app-shell — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 387 · AppShell — the mobile toggle opens the drawer but cannot close it (high)

Phone width (`matchMedia("(max-width: 639px)")` matching), drawer open, tap the toggle:
`useClickOutside(sidebarRef, () => setOpen(false), isMobile && open)` fires on `mousedown` because
the toggle is outside the `<aside>`, React flushes the discrete update, then the later `click` runs
`handleClick` with `open` now `false` and sets it back to `true`. Measured with real event dispatch
across a task boundary (mousedown → macrotask → click, as a real browser interleaves them): the drawer
is still mounted after the tap and `onOpenChange` was called `false` then `true`. `Escape` and a scrim
tap both close correctly; only the toggle is broken. (A fully synchronous `mousedown`+`click` in the
same microtask masks it — the realistic gap is what exposes it.)
**Fix:** have the dismiss handler ignore events whose target is inside the toggle (shared ref /
`composedPath` check), the way Popover-style dismissal does.

### 388 · AppShell — a collapsed sidebar link has an empty accessible name (high)

Render `<AppShell collapsed>` with `<AppShell.SidebarLink to="/dashboard" icon={Home}>Dashboard</…>`.
The collapsed rule `.app-shell-sidebar[data-collapsed] .app-shell-sidebar-link-label { display: none }`
removes the only text and the Lucide icon renders `aria-hidden="true"`. Measured with
`computeAccessibleName` (dom-accessibility-api, the engine Testing Library uses): the name is
`"Dashboard"` expanded and `""` collapsed. The `Tooltip` wrapper contributes only `aria-describedby`
(a *description*), and only while open — so a collapsed rail is a list of unnamed links.
**Fix:** swap `display:none` for an `sr-only` style on the label in the collapsed rule, or set
`aria-label` from `children` when collapsed.

### 389 · AppShell — a shell built from the parts has no main landmark (med)

Render `AppShell.Navbar` + `AppShell.Sidebar` + `AppShell.Main` and query the document: 1 `banner`,
1 `navigation`, but **0 `<main>`** and **0 `[role=main]`** (measured; `.app-shell-main` is a `<div>`).
Landmark navigation cannot reach the content and a skip link has no target. Rest props reach the
element, so a caller can patch it with `role="main"` — but nothing ships one by default.
**Fix:** render `<main>` in `AppShellMain`.

### 390 · AppShell — `AppShell.Toggle`'s `onClick` is silently replaceable (med)

`<AppShell.Toggle onClick={track} />` typechecks — only `type` is `Omit`ted from the prop type — and
measured: the caller's callback runs, `input`/drawer never opens, because `{...props}` overwrites
`onClick={handleClick}`. Instance of the library's rest-spread-after-own-handler pattern (see #245,
#380, #407).
**Fix:** destructure `onClick` out of rest and invoke both the caller's and the internal handler.

### 391 · AppShell — the route-change auto-close notifies `onOpenChange` during render (med)

Controlled `<AppShell open onOpenChange={setOpen}>` at mobile width with the drawer open; change the
adapter pathname. The render-phase `if (isMobile && open) setOpen(false)` calls `setOpen`, which calls
`onOpenChange`, and React logs *"Cannot update a component (`…`) while rendering a different component
(`AppShellRoot`)"* (captured from `console.error`). Uncontrolled shells do not surface it because there
is no external setter in the path.
**Fix:** keep the render-time adjustment to internal state only, and notify `onOpenChange` from an
effect.

### 392 · AppShell — `aria-modal` on a `role="navigation"` drawer does nothing (med)

The mobile drawer's `<aside>` carries `aria-modal="true"` on `role="navigation"`, where the attribute
is undefined (ARIA defines it only for `dialog`/`alertdialog`), and nothing marks the rest of the page
`inert` or `aria-hidden`. So a screen-reader user can still browse the content behind the scrim while
`useFocusTrap` yanks DOM Tab focus back into the aside — the two models disagree. The DOM facts are
measured (`aria-modal="true"`, `role="navigation"`, no `inert`/`aria-hidden` on siblings); the AT
outcome is reasoned from the spec.
**Fix:** drop `aria-modal`, or give the drawer `role="dialog"` with an accessible name and mark the
page `inert` while it is open.

### 393 · AppShell — the active link is the least legible item in the nav (med)

In `events` or `grimdark`, the link for the current page: active ink `--C-ACCENT` over its own 10%
`color-mix` wash measures **2.46:1** / **2.83:1** against the composited background (AA asks 4.5:1),
while a resting link (`--C-TEXT-SECONDARY` on `--C-SURFACE-0`) measures **7.40:1** / **5.95:1** — so
marking a link current makes it *harder* to read. The wash itself is 1.05–1.18:1 against the sidebar
fill, so it adds no perceptible block. `aria-current="page"` is emitted, so AT is unaffected; the
defect is sighted-only. (Contrast pipeline validated against breadcrumbs' `--C-TEXT-MUTED` range and
#242's focus ratios.)
**Fix:** add a non-colour cue (weight, rail marker) or tint the active state from a pair measured
against `--C-SURFACE-0`.
