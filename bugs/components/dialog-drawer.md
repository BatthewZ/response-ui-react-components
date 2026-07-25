# dialog-drawer — findings detail

Status lives in [`../LEDGER.md`](../LEDGER.md), never here.

### 96 · Dialog · Drawer — every native close path desyncs the controlled `open` (med)

Both components listen for `cancel` (Escape) and route it through `onClose`, so **Escape is
handled correctly** — the classic bug in this shape is genuinely absent. But neither listens for
`close`, and `<form method="dialog">`, `formmethod="dialog"` and `ref.current.close()` all fire
`close` **without** `cancel`.

**Failure scenario:** a dialog with a `<form method="dialog">` footer — the platform-native way to
close one. The user submits it. The element closes, `onClose` never runs, the parent's `open` stays
`true`, and because the sync effect only reacts to a *change* in `open`, setting it `true` again is
a no-op: the dialog can never be reopened until the caller toggles it false and back.
**Fix:** add a `close` listener that calls `onClose()` when `open` is still true.

### 97 · Dialog — the scrim is a literal, but an identical one (low · downgraded from med)

**Downgraded from med after investigation.** The claim is true — Dialog.tsx:48 hard-codes
`backdrop:bg-black/50` while Drawer.css:22, CommandPalette.css:22, AppShell.css:191 and
Hero.css:49 all read `--OVERLAY-SCRIM-COLOR`. But `tokens/overlay.css:2` defines that
token as `oklch(0 0 0 / 0.5)`, which is **identical** to the literal, so no failure is
constructible today: the consequence is hue/alpha drift only if a theme retunes the scrim,
and the scrim paints *behind* the dialog, so there is no contrast, focus, semantic or
interaction effect. Matches #94/#95, the same literal-instead-of-token drift already low.
**Fix:** still worth doing — swap in `var(--OVERLAY-SCRIM-COLOR)` — but it is tidying.
