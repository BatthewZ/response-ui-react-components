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
